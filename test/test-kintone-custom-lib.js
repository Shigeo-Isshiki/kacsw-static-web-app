const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');

/*
 Combined tests for kintone-custom-lib:
 - non-DOM unit tests (getFieldValueOr, kintoneEventOn, setRecordValues)
 - DOM tests for space field helpers (setSpaceFieldText, setSpaceFieldButton)
 - DOM tests for notify helpers (notifyError/notifyInfo/notifyWarning)

 Strategy: require the library in a non-DOM context first (global.window = global),
 then for DOM tests create a JSDOM, set `global.window = dom.window`, clear require cache
 and re-require the library so it attaches to the jsdom window.
*/

// ---------------------- Non-DOM unit tests ----------------------
(function nonDomTests() {
	global.window = global;
	delete require.cache[require.resolve(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'))];
	require(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'));

	const { getFieldValueOr, kintoneEventOn, setRecordValues } = global;

	if (!getFieldValueOr) {
		console.error('kintone-custom-lib: getFieldValueOr が公開されていません');
		process.exitCode = 2;
		return;
	}

	try {
		const rec = { name: { value: 'テスト' }, empty: { value: '' }, nil: { value: null } };
		const v1 = getFieldValueOr(rec, 'name', 'N/A');
		assert.strictEqual(v1, 'テスト');
		console.log('PASS: getFieldValueOr returns existing value');
	} catch (e) {
		console.error('FAIL: getFieldValueOr existing value', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		const rec = { a: { value: 1 } };
		const v = getFieldValueOr(rec, 'missing', 'DEF');
		assert.strictEqual(v, 'DEF');
		console.log('PASS: getFieldValueOr default fallback');
	} catch (e) {
		console.error('FAIL: getFieldValueOr default fallback', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		const v = getFieldValueOr(null, 'x', 'X');
		assert.strictEqual(v, 'X');
		console.log('PASS: getFieldValueOr invalid record');
	} catch (e) {
		console.error('FAIL: getFieldValueOr invalid record', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		const bad = kintoneEventOn(123, 'notafunc');
		assert.strictEqual(bad, false);
		console.log('PASS: kintoneEventOn invalid args');
	} catch (e) {
		console.error('FAIL: kintoneEventOn invalid args', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// stub kintone.events.on to emulate registration
		global.kintone = {
			events: {
				on: (events, handler) => {
					try {
						handler({ _test: true });
						return true;
					} catch (e) {
						throw e;
					}
				},
			},
			app: { getHeaderMenuSpaceElement: () => null, record: { getSpaceElement: () => null } },
		};

		let called = false;
		const ok = kintoneEventOn('app.record.create', (ev) => {
			called = true;
			return 'ok';
		});
		assert.strictEqual(ok, true);
		assert.strictEqual(called, true);
		console.log('PASS: kintoneEventOn registers and invokes handler');
	} catch (e) {
		console.error('FAIL: kintoneEventOn valid registration', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		const record = { a: { value: 1 }, b: 2 };
		const res = setRecordValues(record, { a: 10, c: 3 });
		assert.strictEqual(res, true);
		assert.strictEqual(record.a.value, 10);
		assert.ok(record.c && record.c.value === 3);
		console.log('PASS: setRecordValues basic update/create');
	} catch (e) {
		console.error('FAIL: setRecordValues basic', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		assert.strictEqual(typeof global.getFieldValueOr, 'function');
		assert.strictEqual(typeof global.setRecordValues, 'function');
		assert.strictEqual(typeof global.kintoneEventOn, 'function');
		console.log('PASS: functions exported to global/window');
	} catch (e) {
		console.error('FAIL: exports presence', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	console.log('ALL KINTONE-CUSTOM-LIB UNIT TESTS INVOKED');
})();

// ---------------------- DOM tests: space field helpers ----------------------
(function domSpaceTests() {
	const dom = new JSDOM(
		`<!doctype html><html><body><div id="space-A"></div><div id="rec-header-space"></div></body></html>`
	);
	global.window = dom.window;
	global.document = dom.window.document;
	global.HTMLElement = dom.window.HTMLElement;

	// Minimal kintone mock used by some functions
	global.kintone = global.kintone || {};
	global.kintone.app = global.kintone.app || {};
	global.kintone.app.record = global.kintone.app.record || {
		get: () => ({ record: {} }),
		set: () => {},
	};
	global.kintone.app.record.getSpaceElement = (code) => document.getElementById(code);
	// header/menu space element mocks for both app and record APIs
	// use a dedicated container for record header/menu space to avoid id collision
	global.kintone.app.getHeaderMenuSpaceElement = (id) =>
		document.getElementById('rec-header-space');
	global.kintone.app.record.getHeaderMenuSpaceElement = (id) =>
		document.getElementById('rec-header-space');

	// Re-require library so it attaches to jsdom's window
	delete require.cache[require.resolve(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'))];
	require(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'));

	// (no-op) keep previously assigned header/menu space getters

	try {
		if (typeof window.setSpaceFieldText !== 'function') {
			throw new Error('window.setSpaceFieldText is not exported');
		}

		const spaceCode = 'space-A';
		const target = document.getElementById(spaceCode);
		target.textContent = '';

		// setSpaceFieldText(spaceField, id, innerHTML)
		window.setSpaceFieldText(spaceCode, 'text-A', 'テスト文字列');
		const inserted = document.getElementById('text-A');
		assert.ok(inserted, 'inserted element should exist');
		assert.strictEqual(inserted.textContent, 'テスト文字列');
		console.log('PASS: setSpaceFieldText updates space element text');

		if (typeof window.setSpaceFieldButton === 'function') {
			const beforeButtons = target.querySelectorAll('button').length;
			window.setSpaceFieldButton(spaceCode, 'btn-1', 'クリック');
			const afterButtons = target.querySelectorAll('button').length;
			assert.strictEqual(afterButtons, beforeButtons + 1);
			console.log('PASS: setSpaceFieldButton inserts a button');
		} else {
			console.log('SKIP: setSpaceFieldButton not exported');
		}

		if (typeof window.setRecordHeaderMenuSpaceButton === 'function') {
			const recTarget = document.getElementById('rec-header-space');
			const before = recTarget.querySelectorAll('button').length;
			// add button (id is 'rec-btn' per API expectation)
			window.setRecordHeaderMenuSpaceButton('rec-btn', '詳細');
			const afterAdd = recTarget.querySelectorAll('button').length;
			assert.strictEqual(afterAdd, before + 1);
			// remove button by passing null textContent
			window.setRecordHeaderMenuSpaceButton('rec-btn', null);
			const afterRemove = recTarget.querySelectorAll('button').length;
			assert.strictEqual(afterRemove, before);
			console.log('PASS: setRecordHeaderMenuSpaceButton inserts and removes a button');
		} else {
			console.log('SKIP: setRecordHeaderMenuSpaceButton not exported');
		}

		console.log('ALL KINTONE-CUSTOM-LIB DOM TESTS INVOKED');
	} catch (err) {
		console.error('FAIL:', err && err.message);
		process.exitCode = 1;
	}
})();

// ---------------------- DOM tests: notify helpers ----------------------
(function domNotifyTests() {
	const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
	global.window = dom.window;
	global.document = dom.window.document;
	global.HTMLElement = dom.window.HTMLElement;

	// Provide kintone.createDialog mock returning an object with element and show()
	global.kintone = global.kintone || {};
	global.kintone.createDialog = (config) => {
		const container = document.createElement('div');
		const okBtn = document.createElement('button');
		okBtn.className = 'kintone-dialog-ok-button';
		container.appendChild(okBtn);
		if (config && config.body) container.appendChild(config.body);
		return {
			element: container,
			show: () => document.body.appendChild(container),
		};
	};

	// Re-require so library attaches to this DOM window
	delete require.cache[require.resolve(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'))];
	require(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'));

	try {
		if (typeof window.notifyError !== 'function') {
			throw new Error('notifyError not exported');
		}

		// Plain text case
		window.notifyError('単純なエラー', 'エラー', false);
		const errMsg = document.querySelector('.kc-notify-error__message');
		assert.ok(errMsg, 'error message element exists');
		assert.strictEqual(errMsg.textContent, '単純なエラー');

		// HTML with potentially dangerous content should be sanitized
		const malicious = '<span onclick="alert(1)">X</span><script>evil()</script>';
		window.notifyError(malicious, 'エラーHTML', true);
		const allErr = document.querySelectorAll('.kc-notify-error__message');
		const last = allErr[allErr.length - 1];
		assert.ok(last, 'sanitized element exists');
		assert.strictEqual(last.querySelectorAll('script').length, 0, 'script tags removed');
		let hasOnAttr = false;
		last.querySelectorAll('*').forEach((el) => {
			[...el.attributes].forEach((a) => {
				if (/^on/i.test(a.name)) hasOnAttr = true;
			});
		});
		assert.ok(!hasOnAttr, 'on* attributes removed');

		if (typeof window.notifyInfo === 'function') {
			window.notifyInfo('情報です', '情報', false);
			assert.ok(document.querySelector('.kc-notify-info__message'));
		}
		if (typeof window.notifyWarning === 'function') {
			window.notifyWarning('注意です', '注意', false);
			assert.ok(document.querySelector('.kc-notify-warning__message'));
		}

		console.log('PASS: notify dialogs created and sanitized');
		console.log('ALL KINTONE-CUSTOM-LIB NOTIFY DOM TESTS INVOKED');
	} catch (err) {
		console.error('FAIL:', err && err.message);
		process.exitCode = 1;
	}
})();
