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

	const { getFieldValueOr, kintoneEventOn, setRecordValues, showYesNoDialog, showInputDialog } =
		global;

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
		const rec = { a: { value: undefined } };
		const v = getFieldValueOr(rec, 'a', 'DEF');
		assert.strictEqual(v, 'DEF');
		console.log('PASS: getFieldValueOr undefined value fallback');
	} catch (e) {
		console.error('FAIL: getFieldValueOr undefined value fallback', e && e.message ? e.message : e);
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
		assert.strictEqual(typeof showYesNoDialog, 'function');
		assert.strictEqual(typeof showInputDialog, 'function');
		console.log('PASS: functions exported to global/window');
	} catch (e) {
		console.error('FAIL: exports presence', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	console.log('ALL KINTONE-CUSTOM-LIB UNIT TESTS INVOKED');
})();

// ---------------------- DOM tests: subtable operation control ----------------------
(async function domSubtableOperationControlTests() {
	const libPath = path.join(__dirname, '..', 'src', 'kintone-custom-lib.js');
	const resetLib = () => {
		delete require.cache[require.resolve(libPath)];
	};
	const loadLibInDom = (dom) => {
		global.window = dom.window;
		global.document = dom.window.document;
		global.HTMLElement = dom.window.HTMLElement;
		global.MutationObserver = dom.window.MutationObserver;
		resetLib();
		require(libPath);
		return dom.window;
	};
	const createOperationNode = (doc, wrapperId, operationId) => {
		const wrapper = doc.createElement('div');
		wrapper.id = wrapperId;
		const operation = doc.createElement('button');
		operation.id = operationId;
		operation.className = 'subtable-operation-gaia';
		operation.textContent = 'op';
		wrapper.appendChild(operation);
		doc.body.appendChild(wrapper);
		return operation;
	};

	try {
		// 0) 例外系: document/head 未定義でも落ちない
		global.window = global;
		delete global.document;
		delete global.MutationObserver;
		resetLib();
		require(libPath);
		assert.strictEqual(typeof global.setupSubtableOperationControl, 'function');
		const noDomController = global.setupSubtableOperationControl({ mode: 'alwaysHide' });
		assert.strictEqual(typeof noDomController.getState, 'function');
		global.teardownSubtableOperationControl(noDomController);
		console.log('PASS: defensive guards for missing document/head');
	} catch (e) {
		console.error(
			'FAIL: defensive guards for missing document/head',
			e && e.message ? e.message : e
		);
		process.exitCode = 2;
	}

	try {
		// 1) 初期適用
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const op = createOperationNode(w.document, 'table-initial', 'op-initial');
		const controller = w.setupSubtableOperationControl({
			mode: 'alwaysHide',
			observe: true,
			styleId: 'kc-test-style-initial',
		});
		assert.strictEqual(op.style.display, 'none');
		controller.destroy();
		console.log('PASS: initial apply hides target operation');
	} catch (e) {
		console.error('FAIL: initial apply', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// 2) 再描画時の再適用
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const wrapperId = 'table-redraw';
		createOperationNode(w.document, wrapperId, 'op-redraw-1');
		const controller = w.setupSubtableOperationControl({
			mode: 'alwaysHide',
			observe: true,
			styleId: 'kc-test-style-redraw',
		});
		const wrapper = w.document.getElementById(wrapperId);
		wrapper.innerHTML = '';
		const redrawOp = w.document.createElement('button');
		redrawOp.id = 'op-redraw-2';
		redrawOp.className = 'subtable-operation-gaia';
		wrapper.appendChild(redrawOp);
		controller.refresh();
		assert.strictEqual(redrawOp.style.display, 'none');
		controller.destroy();
		console.log('PASS: redraw keeps hidden state with observer');
	} catch (e) {
		console.error('FAIL: redraw re-apply', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// 2.5) hideLabelAndRowOps で add/delete ボタンも対象化される
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const wrapper = w.document.createElement('div');
		wrapper.id = 'table-row-ops';

		const addBtn = w.document.createElement('button');
		addBtn.className = 'subtable-row-add-gaia';
		wrapper.appendChild(addBtn);

		const deleteBtn = w.document.createElement('button');
		deleteBtn.className = 'subtable-row-delete-gaia';
		wrapper.appendChild(deleteBtn);

		w.document.body.appendChild(wrapper);

		const controller = w.setupSubtableOperationControl({
			mode: 'alwaysHide',
			hideLabelAndRowOps: true,
			observe: false,
			styleId: 'kc-test-style-row-ops',
		});

		assert.strictEqual(addBtn.style.display, 'none');
		assert.strictEqual(deleteBtn.style.display, 'none');
		controller.destroy();
		console.log('PASS: hideLabelAndRowOps hides add/delete row buttons');
	} catch (e) {
		console.error('FAIL: hideLabelAndRowOps add/delete', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// 3) 条件切替 (setup -> update)
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const op = createOperationNode(w.document, 'table-conditional', 'op-conditional');
		const controller = w.setupSubtableOperationControl({
			mode: 'conditionalHide',
			hideWhen: (ctx) => !!(ctx && ctx.context && ctx.context.hide),
			context: { hide: false },
			observe: true,
			styleId: 'kc-test-style-conditional',
		});
		assert.notStrictEqual(op.style.display, 'none');
		w.updateSubtableOperationControl(controller, { context: { hide: true } });
		assert.strictEqual(op.style.display, 'none');
		w.updateSubtableOperationControl(controller, { context: { hide: false } });
		assert.notStrictEqual(op.style.display, 'none');
		controller.destroy();
		console.log('PASS: conditionalHide toggles by update');
	} catch (e) {
		console.error('FAIL: conditional toggle', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// 4) スコープ限定
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const opInScope = createOperationNode(w.document, 'TARGET_TABLE', 'op-scope-in');
		const opOutScope = createOperationNode(w.document, 'OTHER_TABLE', 'op-scope-out');
		const controller = w.setupSubtableOperationControl({
			mode: 'scopedHide',
			target: ['TARGET_TABLE'],
			observe: false,
			styleId: 'kc-test-style-scoped',
		});
		assert.strictEqual(opInScope.style.display, 'none');
		assert.notStrictEqual(opOutScope.style.display, 'none');
		controller.destroy();
		console.log('PASS: scopedHide affects only target tables');
	} catch (e) {
		console.error('FAIL: scoped hide', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// 5) teardown 後の復帰
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const op = createOperationNode(w.document, 'table-teardown', 'op-teardown');
		const controller = w.setupSubtableOperationControl({
			mode: 'alwaysHide',
			observe: true,
			styleId: 'kc-test-style-teardown',
		});
		assert.strictEqual(op.style.display, 'none');
		w.teardownSubtableOperationControl(controller);
		assert.notStrictEqual(op.style.display, 'none');
		assert.strictEqual(w.document.getElementById('kc-test-style-teardown'), null);
		console.log('PASS: teardown removes control and style');
	} catch (e) {
		console.error('FAIL: teardown restore', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	try {
		// 6) 重複setup時の安定性とリーク抑止
		const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>');
		const w = loadLibInDom(dom);
		const op1 = createOperationNode(w.document, 'table-leak-1', 'op-leak-1');
		createOperationNode(w.document, 'table-leak-2', 'op-leak-2');
		const c1 = w.setupSubtableOperationControl({
			mode: 'alwaysHide',
			observe: true,
			styleId: 'kc-test-style-shared',
		});
		const c2 = w.setupSubtableOperationControl({
			mode: 'alwaysHide',
			observe: true,
			styleId: 'kc-test-style-shared',
		});
		assert.strictEqual(w.document.querySelectorAll('#kc-test-style-shared').length, 1);
		w.updateSubtableOperationControl(c1, { mode: 'conditionalHide', hideWhen: false });
		assert.strictEqual(op1.style.display, 'none');
		w.updateSubtableOperationControl(c2, { mode: 'conditionalHide', hideWhen: false });
		assert.notStrictEqual(op1.style.display, 'none');
		w.updateSubtableOperationControl(c1, { mode: 'alwaysHide' });
		assert.strictEqual(op1.style.display, 'none');
		c1.destroy();
		assert.strictEqual(w.document.querySelectorAll('#kc-test-style-shared').length, 1);
		c2.destroy();
		assert.strictEqual(w.document.querySelectorAll('#kc-test-style-shared').length, 0);
		console.log('PASS: repeated setup/update/teardown stays stable');
	} catch (e) {
		console.error('FAIL: repeated setup stability', e && e.message ? e.message : e);
		process.exitCode = 2;
	}

	console.log('ALL SUBTABLE CONTROL TESTS INVOKED');
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

		// setSpaceFieldText の競合回避を検証するため、setTimeout をテスト内で制御する
		const originalSetTimeout = global.setTimeout;
		const originalClearTimeout = global.clearTimeout;
		const originalWindowSetTimeout = window.setTimeout;
		const originalWindowClearTimeout = window.clearTimeout;
		const originalGetSpaceElement = global.kintone.app.record.getSpaceElement;

		let nextTimerId = 1;
		const timerQueue = new Map();
		const blockedSpaces = new Set();

		const fakeSetTimeout = (fn) => {
			const timerId = nextTimerId++;
			timerQueue.set(timerId, fn);
			return timerId;
		};
		const fakeClearTimeout = (timerId) => {
			timerQueue.delete(timerId);
		};
		const drainTimers = () => {
			let guard = 0;
			while (timerQueue.size > 0) {
				guard += 1;
				if (guard > 100) {
					throw new Error('timer drain guard exceeded');
				}
				const firstId = timerQueue.keys().next().value;
				const fn = timerQueue.get(firstId);
				timerQueue.delete(firstId);
				if (typeof fn === 'function') fn();
			}
		};

		global.setTimeout = fakeSetTimeout;
		global.clearTimeout = fakeClearTimeout;
		window.setTimeout = fakeSetTimeout;
		window.clearTimeout = fakeClearTimeout;
		global.kintone.app.record.getSpaceElement = (code) => {
			if (blockedSpaces.has(code)) {
				return null;
			}
			return document.getElementById(code);
		};

		try {
			// 1) 連続呼び出し（表示→非表示→表示）で最終状態が最後の呼び出しに一致する
			const raceSpace = 'space-race';
			const raceTarget = document.createElement('div');
			raceTarget.id = raceSpace;
			document.body.appendChild(raceTarget);
			window.setSpaceFieldText(raceSpace, 'race-text', '先行表示');
			window.setSpaceFieldText(raceSpace, 'race-text', null);
			blockedSpaces.add(raceSpace);
			window.setSpaceFieldText(raceSpace, 'race-text', '最終表示');
			blockedSpaces.delete(raceSpace);
			drainTimers();
			const raceInserted = document.getElementById('race-text');
			assert.ok(raceInserted, 'final race element should exist');
			assert.strictEqual(raceInserted.textContent, '最終表示');
			assert.notStrictEqual(raceTarget.parentNode.style.display, 'none');
			console.log('PASS: setSpaceFieldText keeps final state after rapid show/hide/show');

			// 2) 空文字クリア後に古いリトライで再表示されない
			const clearSpace = 'space-clear';
			const clearTarget = document.createElement('div');
			clearTarget.id = clearSpace;
			document.body.appendChild(clearTarget);
			blockedSpaces.add(clearSpace);
			window.setSpaceFieldText(clearSpace, 'clear-text', '古い表示');
			blockedSpaces.delete(clearSpace);
			window.setSpaceFieldText(clearSpace, 'clear-text', '');
			drainTimers();
			assert.strictEqual(document.getElementById('clear-text'), null);
			assert.strictEqual(clearTarget.parentNode.style.display, 'none');
			console.log('PASS: setSpaceFieldText does not resurrect text after empty-string clear');

			// 3) 同一キーと別キー混在でも相互干渉しない
			const mixedSpaceA = 'space-mixed-a';
			const mixedSpaceB = 'space-mixed-b';
			const mixedA = document.createElement('div');
			const mixedB = document.createElement('div');
			mixedA.id = mixedSpaceA;
			mixedB.id = mixedSpaceB;
			document.body.appendChild(mixedA);
			document.body.appendChild(mixedB);
			blockedSpaces.add(mixedSpaceA);
			blockedSpaces.add(mixedSpaceB);
			window.setSpaceFieldText(mixedSpaceA, 'mixed-a-text', 'A-old');
			window.setSpaceFieldText(mixedSpaceB, 'mixed-b-text', 'B-final');
			blockedSpaces.delete(mixedSpaceA);
			window.setSpaceFieldText(mixedSpaceA, 'mixed-a-text', null);
			blockedSpaces.delete(mixedSpaceB);
			drainTimers();
			assert.strictEqual(document.getElementById('mixed-a-text'), null);
			const mixedBInserted = document.getElementById('mixed-b-text');
			assert.ok(mixedBInserted, 'other key should remain active');
			assert.strictEqual(mixedBInserted.textContent, 'B-final');
			console.log('PASS: setSpaceFieldText isolates retry states by spaceField+id key');
		} finally {
			global.setTimeout = originalSetTimeout;
			global.clearTimeout = originalClearTimeout;
			window.setTimeout = originalWindowSetTimeout;
			window.clearTimeout = originalWindowClearTimeout;
			global.kintone.app.record.getSpaceElement = originalGetSpaceElement;
		}

		if (typeof window.setSpaceFieldButton === 'function') {
			const beforeButtons = target.querySelectorAll('button').length;
			window.setSpaceFieldButton(spaceCode, 'btn-1', 'クリック');
			const afterButtons = target.querySelectorAll('button').length;
			assert.strictEqual(afterButtons, beforeButtons + 1);
			const defaultButton = document.getElementById('btn-1');
			assert.ok(defaultButton, 'default button should exist');
			assert.strictEqual(defaultButton.style.width, '');
			assert.strictEqual(defaultButton.style.marginLeft, '');
			assert.strictEqual(defaultButton.style.marginRight, '');

			window.setSpaceFieldButton(spaceCode, 'btn-2', '幅付き', null, {
				width: '140px',
				horizontalMargin: '8px',
			});
			const styledButton = document.getElementById('btn-2');
			assert.ok(styledButton, 'styled button should exist');
			assert.strictEqual(styledButton.style.width, '140px');
			assert.strictEqual(styledButton.style.marginLeft, '8px');
			assert.strictEqual(styledButton.style.marginRight, '8px');

			window.setSpaceFieldButton(spaceCode, 'btn-3', '左右別', null, {
				marginLeft: '4px',
				marginRight: '12px',
			});
			const sideMarginButton = document.getElementById('btn-3');
			assert.ok(sideMarginButton, 'side margin button should exist');
			assert.strictEqual(sideMarginButton.style.marginLeft, '4px');
			assert.strictEqual(sideMarginButton.style.marginRight, '12px');

			window.setSpaceFieldButton(spaceCode, 'btn-4', '片側優先', null, {
				marginLeft: '6px',
				horizontalMargin: '10px',
			});
			const mixedMarginButton = document.getElementById('btn-4');
			assert.ok(mixedMarginButton, 'mixed margin button should exist');
			assert.strictEqual(mixedMarginButton.style.marginLeft, '6px');
			assert.strictEqual(mixedMarginButton.style.marginRight, '10px');

			const originalLocation = global.location;
			const originalKintone = global.kintone;
			const mobileFallbackSpaceCode = 'space-mobile-fallback';
			const mobileFallbackTarget = document.createElement('div');
			mobileFallbackTarget.id = mobileFallbackSpaceCode;
			document.body.appendChild(mobileFallbackTarget);
			global.location = { pathname: '/k/123/' };
			global.kintone = {
				app: {
					record: {
						// PC 側には getSpaceElement が無いケースを再現
					},
				},
				mobile: {
					app: {
						record: {
							getSpaceElement: (code) => document.getElementById(code),
						},
					},
				},
			};
			window.setSpaceFieldButton(mobileFallbackSpaceCode, 'btn-mobile-fallback', 'モバイル');
			const mobileFallbackButton = document.getElementById('btn-mobile-fallback');
			assert.ok(mobileFallbackButton, 'mobile fallback button should exist');
			assert.strictEqual(mobileFallbackTarget.parentNode.style.display, '');
			global.location = originalLocation;
			global.kintone = originalKintone;
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

			window.setRecordHeaderMenuSpaceButton('rec-btn-style', '詳細', null, {
				width: '120px',
				marginLeft: '4px',
				marginRight: '10px',
			});
			const recStyledButton = document.getElementById('rec-btn-style');
			assert.ok(recStyledButton, 'record header styled button should exist');
			assert.strictEqual(recStyledButton.style.width, '120px');
			assert.strictEqual(recStyledButton.style.marginLeft, '4px');
			assert.strictEqual(recStyledButton.style.marginRight, '10px');
			console.log('PASS: setRecordHeaderMenuSpaceButton inserts and removes a button');
		} else {
			console.log('SKIP: setRecordHeaderMenuSpaceButton not exported');
		}

		if (typeof window.setHeaderMenuSpaceButton === 'function') {
			const headerTarget = document.getElementById('rec-header-space');
			const before = headerTarget.querySelectorAll('button').length;
			window.setHeaderMenuSpaceButton('hdr-btn', '一覧', null, {
				horizontalMargin: '6px',
			});
			const afterAdd = headerTarget.querySelectorAll('button').length;
			assert.strictEqual(afterAdd, before + 1);
			const headerStyledButton = document.getElementById('hdr-btn');
			assert.ok(headerStyledButton, 'header styled button should exist');
			assert.strictEqual(headerStyledButton.style.marginLeft, '6px');
			assert.strictEqual(headerStyledButton.style.marginRight, '6px');
			window.setHeaderMenuSpaceButton('hdr-btn', null);
			const afterRemove = headerTarget.querySelectorAll('button').length;
			assert.strictEqual(afterRemove, before);
			console.log('PASS: setHeaderMenuSpaceButton inserts and removes a button');
		} else {
			console.log('SKIP: setHeaderMenuSpaceButton not exported');
		}

		if (typeof window.setRecordHeaderMenuSpaceText === 'function') {
			const recTarget = document.getElementById('rec-header-space');
			// ensure clean state
			recTarget.innerHTML = '';
			window.setRecordHeaderMenuSpaceText('rec-text', '<b>ヘッダ</b>');
			const insertedText = document.getElementById('rec-text');
			assert.ok(insertedText, 'record header text should be inserted');
			// content should include the expected text; sanitizer behavior may vary
			assert.ok(
				insertedText.textContent.indexOf('ヘッダ') !== -1,
				'inserted text should include ヘッダ'
			);
			// remove
			window.setRecordHeaderMenuSpaceText('rec-text', null);
			assert.strictEqual(document.getElementById('rec-text'), null);
			console.log('PASS: setRecordHeaderMenuSpaceText inserts and removes sanitized HTML');
		} else {
			console.log('SKIP: setRecordHeaderMenuSpaceText not exported');
		}

		console.log('ALL KINTONE-CUSTOM-LIB DOM TESTS INVOKED');
	} catch (err) {
		console.error('FAIL:', err && err.message);
		process.exitCode = 1;
	}
})();

// ---------------------- DOM tests: notify helpers ----------------------
(async function domNotifyTests() {
	const dom = new JSDOM(`<!doctype html><html><body></body></html>`);
	global.window = dom.window;
	global.document = dom.window.document;
	global.HTMLElement = dom.window.HTMLElement;
	const originalLocation = global.location;
	global.location = { pathname: '/k/123/' };

	// PC path でも mobile API が存在する場合に createDialog が優先されることを確認する
	let createDialogCalled = 0;
	let createBottomSheetCalled = 0;
	let showConfirmDialogCalled = 0;
	let showConfirmBottomSheetCalled = 0;
	let nextConfirmAction = 'OK';
	let lastConfirmConfig = null;
	global.kintone = global.kintone || {};
	global.kintone.createDialog = (config) => {
		createDialogCalled += 1;
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
	global.kintone.showConfirmDialog = (config) => {
		showConfirmDialogCalled += 1;
		lastConfirmConfig = config;
		return Promise.resolve(nextConfirmAction);
	};
	global.kintone.mobile = {
		showConfirmBottomSheet: () => {
			showConfirmBottomSheetCalled += 1;
			throw new Error('showConfirmBottomSheet should not be called on desktop path');
		},
		createBottomSheet: () => {
			createBottomSheetCalled += 1;
			throw new Error('createBottomSheet should not be called on desktop path');
		},
	};

	// Re-require so library attaches to this DOM window
	delete require.cache[require.resolve(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'))];
	require(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'));

	try {
		if (typeof window.notifyError !== 'function') {
			throw new Error('notifyError not exported');
		}

		// Plain text case
		const errorResult = window.notifyError('単純なエラー', 'エラー', false);
		assert.ok(
			errorResult && typeof errorResult.then === 'function',
			'notifyError should return Promise'
		);
		await errorResult;
		const errMsg = document.querySelector('.kc-notify-error__message');
		assert.ok(errMsg, 'error message element exists');
		assert.strictEqual(errMsg.textContent, '単純なエラー');

		// HTML with potentially dangerous content should be sanitized
		const malicious = '<span onclick="alert(1)">X</span><script>evil()</script>';
		await window.notifyError(malicious, 'エラーHTML', true);
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
			const infoResult = window.notifyInfo('情報です', '情報', false);
			assert.ok(
				infoResult && typeof infoResult.then === 'function',
				'notifyInfo should return Promise'
			);
			await infoResult;
			assert.ok(document.querySelector('.kc-notify-info__message'));
		}
		if (typeof window.notifyWarning === 'function') {
			const warningResult = window.notifyWarning('注意です', '注意', false);
			assert.ok(
				warningResult && typeof warningResult.then === 'function',
				'notifyWarning should return Promise'
			);
			await warningResult;
			assert.ok(document.querySelector('.kc-notify-warning__message'));
		}

		if (typeof window.showYesNoDialog !== 'function') {
			throw new Error('showYesNoDialog not exported');
		}
		nextConfirmAction = 'OK';
		const confirmed = await window.showYesNoDialog('選択したレコードを更新しますか？', '確認');
		assert.strictEqual(confirmed, true, 'showYesNoDialog should return true on OK');
		assert.ok(lastConfirmConfig, 'showConfirmDialog should receive config');
		assert.strictEqual(lastConfirmConfig.title, '確認');
		assert.strictEqual(lastConfirmConfig.body, '選択したレコードを更新しますか？');
		assert.strictEqual(lastConfirmConfig.okButtonText, 'はい');
		assert.strictEqual(lastConfirmConfig.cancelButtonText, 'いいえ');

		nextConfirmAction = 'CANCEL';
		const rejected = await window.showYesNoDialog('実行しますか？', '確認');
		assert.strictEqual(rejected, false, 'showYesNoDialog should return false on CANCEL');

		if (typeof window.showInputDialog !== 'function') {
			throw new Error('showInputDialog not exported');
		}
		const originalCreateDialog = global.kintone.createDialog;
		global.kintone.createDialog = (config) => {
			createDialogCalled += 1;
			const container = document.createElement('div');
			const okBtn = document.createElement('button');
			okBtn.className = 'kintone-dialog-ok-button';
			container.appendChild(okBtn);
			if (config && config.body) container.appendChild(config.body);
			return {
				element: container,
				show: async () => {
					const titleInput = config.body.querySelector('[name="title"]');
					const countInput = config.body.querySelector('[name="count"]');
					const dueDateInput = config.body.querySelector('[name="dueDate"]');
					if (titleInput) titleInput.value = '月次確認';
					if (countInput) countInput.value = '3';
					if (dueDateInput) dueDateInput.value = '2026-06-18';
					document.body.appendChild(container);
					if (config.beforeClose) {
						const canClose = await config.beforeClose('OK');
						assert.strictEqual(canClose, true, 'valid input should allow dialog close');
					}
					return 'OK';
				},
			};
		};

		const inputResult = await window.showInputDialog({
			title: 'タスク登録',
			okButtonText: '登録',
			fields: [
				{ name: 'title', label: 'タイトル', type: 'text' },
				{ name: 'count', label: '件数', type: 'number' },
				{ name: 'dueDate', label: '期限', type: 'date' },
			],
		});
		assert.ok(inputResult, 'showInputDialog should resolve result object');
		assert.strictEqual(inputResult.action, 'OK');
		assert.deepStrictEqual(inputResult.values, {
			title: '月次確認',
			count: 3,
			dueDate: '2026-06-18',
		});

		global.kintone.createDialog = (config) => {
			createDialogCalled += 1;
			const container = document.createElement('div');
			const okBtn = document.createElement('button');
			okBtn.className = 'kintone-dialog-ok-button';
			container.appendChild(okBtn);
			if (config && config.body) container.appendChild(config.body);
			return {
				element: container,
				show: () => {
					document.body.appendChild(container);
					return 'CANCEL';
				},
			};
		};
		const cancelledInputResult = await window.showInputDialog({
			title: 'キャンセル確認',
			fields: [{ name: 'memo', label: 'メモ', type: 'textarea' }],
		});
		assert.ok(cancelledInputResult, 'cancelled input dialog should resolve result object');
		assert.strictEqual(cancelledInputResult.action, 'CANCEL');
		assert.strictEqual(cancelledInputResult.values, null);

		global.kintone.createDialog = (config) => {
			createDialogCalled += 1;
			const container = document.createElement('div');
			const okBtn = document.createElement('button');
			okBtn.className = 'kintone-dialog-ok-button';
			container.appendChild(okBtn);
			if (config && config.body) container.appendChild(config.body);
			return {
				element: container,
				show: async () => {
					if (config && config.body && config.body.classList.contains('kc-notify-error')) {
						document.body.appendChild(container);
						return 'OK';
					}
					const countInput = config.body.querySelector('[name="count"]');
					const dueDateInput = config.body.querySelector('[name="dueDate"]');
					if (countInput) {
						countInput.type = 'text';
						countInput.value = 'abc';
					}
					if (dueDateInput) {
						dueDateInput.type = 'text';
						dueDateInput.value = '2026-02-30';
					}
					document.body.appendChild(container);
					const firstAttempt = config.beforeClose ? await config.beforeClose('OK') : true;
					assert.strictEqual(
						firstAttempt,
						false,
						'invalid input should keep the dialog open on first attempt'
					);
					assert.strictEqual(
						document.activeElement,
						countInput,
						'focus should move to the first invalid input'
					);
					if (countInput) {
						countInput.value = '5';
					}
					if (dueDateInput) {
						dueDateInput.type = 'date';
						dueDateInput.value = '2026-02-28';
					}
					const secondAttempt = config.beforeClose ? await config.beforeClose('OK') : true;
					assert.strictEqual(
						secondAttempt,
						true,
						'valid input should allow the dialog to close on second attempt'
					);
					return 'OK';
				},
			};
		};
		const invalidInputResult = await window.showInputDialog({
			title: '不正値確認',
			fields: [
				{ name: 'count', label: '件数', type: 'number' },
				{ name: 'dueDate', label: '期限', type: 'date' },
			],
		});
		assert.ok(invalidInputResult, 'invalid input dialog should resolve result object');
		assert.strictEqual(invalidInputResult.action, 'OK');
		assert.deepStrictEqual(invalidInputResult.values, {
			count: 5,
			dueDate: '2026-02-28',
		});
		const invalidErrorMessages = document.querySelectorAll('.kc-notify-error__message');
		const invalidErrorMessage = invalidErrorMessages[invalidErrorMessages.length - 1];
		assert.ok(invalidErrorMessage, 'validation error should be shown by notifyError');
		assert.ok(
			invalidErrorMessage.textContent.indexOf('件数') !== -1,
			'validation error should include field label'
		);
		assert.ok(
			invalidErrorMessage.textContent.indexOf('期限') !== -1,
			'validation error should include date field label'
		);
		assert.ok(
			invalidErrorMessage.textContent.indexOf('20260618') !== -1,
			'date validation error should show accepted example formats'
		);

		global.kintone.createDialog = (config) => {
			createDialogCalled += 1;
			const container = document.createElement('div');
			const okBtn = document.createElement('button');
			okBtn.className = 'kintone-dialog-ok-button';
			container.appendChild(okBtn);
			if (config && config.body) container.appendChild(config.body);
			return {
				element: container,
				show: async () => {
					const dueDateInput = config.body.querySelector('[name="dueDate"]');
					if (dueDateInput) {
						dueDateInput.type = 'text';
						dueDateInput.value = '20260608';
					}
					document.body.appendChild(container);
					const firstAttempt = config.beforeClose ? await config.beforeClose('OK') : true;
					assert.strictEqual(
						firstAttempt,
						true,
						'compact date input should allow the dialog to close'
					);
					assert.strictEqual(
						dueDateInput.value,
						'2026-06-08',
						'date input should be normalized to YYYY-MM-DD'
					);
					return 'OK';
				},
			};
		};
		const normalizedDateInputResult = await window.showInputDialog({
			title: '日付正規化確認',
			fields: [{ name: 'dueDate', label: '期限', type: 'date' }],
		});
		assert.ok(
			normalizedDateInputResult,
			'normalized date input dialog should resolve result object'
		);
		assert.strictEqual(normalizedDateInputResult.action, 'OK');
		assert.deepStrictEqual(normalizedDateInputResult.values, {
			dueDate: '2026-06-08',
		});

		global.kintone.createDialog = (config) => {
			createDialogCalled += 1;
			const container = document.createElement('div');
			const okBtn = document.createElement('button');
			okBtn.className = 'kintone-dialog-ok-button';
			container.appendChild(okBtn);
			if (config && config.body) container.appendChild(config.body);
			return {
				element: container,
				show: async () => {
					const dueDateInput = config.body.querySelector('[name="dueDate"]');
					if (dueDateInput) {
						dueDateInput.type = 'text';
						dueDateInput.value = '２０２６年６月８日';
					}
					document.body.appendChild(container);
					const firstAttempt = config.beforeClose ? await config.beforeClose('OK') : true;
					assert.strictEqual(
						firstAttempt,
						true,
						'localized date input should allow the dialog to close'
					);
					assert.strictEqual(
						dueDateInput.value,
						'2026-06-08',
						'localized date input should be normalized to YYYY-MM-DD'
					);
					return 'OK';
				},
			};
		};
		const localizedDateInputResult = await window.showInputDialog({
			title: '日付正規化確認2',
			fields: [{ name: 'dueDate', label: '期限', type: 'date' }],
		});
		assert.ok(localizedDateInputResult, 'localized date input dialog should resolve result object');
		assert.strictEqual(localizedDateInputResult.action, 'OK');
		assert.deepStrictEqual(localizedDateInputResult.values, {
			dueDate: '2026-06-08',
		});

		global.kintone.createDialog = (config) => {
			createDialogCalled += 1;
			const container = document.createElement('div');
			const okBtn = document.createElement('button');
			okBtn.className = 'kintone-dialog-ok-button';
			container.appendChild(okBtn);
			if (config && config.body) container.appendChild(config.body);
			return {
				element: container,
				show: async () => {
					if (config && config.body && config.body.classList.contains('kc-notify-error')) {
						document.body.appendChild(container);
						return 'OK';
					}
					const titleInput = config.body.querySelector('[name="title"]');
					const memoInput = config.body.querySelector('[name="memo"]');
					if (titleInput) {
						titleInput.value = '123456';
					}
					if (memoInput) {
						memoInput.value = 'NG';
					}
					document.body.appendChild(container);
					const firstAttempt = config.beforeClose ? await config.beforeClose('OK') : true;
					assert.strictEqual(
						firstAttempt,
						false,
						'text validation error should keep the dialog open on first attempt'
					);
					assert.strictEqual(
						document.activeElement,
						titleInput,
						'focus should move to the first invalid text input'
					);
					if (titleInput) {
						titleInput.value = '1234';
					}
					if (memoInput) {
						memoInput.value = 'ABC-12';
					}
					const secondAttempt = config.beforeClose ? await config.beforeClose('OK') : true;
					assert.strictEqual(
						secondAttempt,
						true,
						'valid text values should allow the dialog to close on second attempt'
					);
					return 'OK';
				},
			};
		};
		const textValidatedResult = await window.showInputDialog({
			title: '文字列バリデーション確認',
			fields: [
				{ name: 'title', label: 'タイトル', type: 'text', maxLength: 4 },
				{
					name: 'memo',
					label: 'メモ',
					type: 'textarea',
					pattern: '^[A-Z]{3}-\\d{2}$',
					patternMessage: 'メモは ABC-12 の形式で入力してください。',
				},
			],
		});
		assert.ok(textValidatedResult, 'text validated dialog should resolve result object');
		assert.strictEqual(textValidatedResult.action, 'OK');
		assert.deepStrictEqual(textValidatedResult.values, {
			title: '1234',
			memo: 'ABC-12',
		});
		const textErrorMessages = document.querySelectorAll('.kc-notify-error__message');
		const textErrorMessage = textErrorMessages[textErrorMessages.length - 1];
		assert.ok(
			textErrorMessage.textContent.indexOf('メモは ABC-12 の形式で入力してください。') !== -1,
			'custom pattern message should be shown in notifyError'
		);
		global.kintone.createDialog = originalCreateDialog;

		assert.strictEqual(
			createBottomSheetCalled,
			0,
			'desktop path should not call createBottomSheet'
		);
		assert.strictEqual(
			showConfirmBottomSheetCalled,
			0,
			'desktop path should not call showConfirmBottomSheet'
		);
		assert.ok(createDialogCalled > 0, 'desktop path should use createDialog');
		assert.ok(showConfirmDialogCalled > 0, 'desktop path should use showConfirmDialog');

		console.log('PASS: notify dialogs created and sanitized');
		console.log('PASS: desktop path prefers createDialog over createBottomSheet');
		console.log('PASS: yes/no dialog uses showConfirmDialog');
		console.log('PASS: input dialog collects form values');
		console.log('ALL KINTONE-CUSTOM-LIB NOTIFY DOM TESTS INVOKED');
	} catch (err) {
		console.error('FAIL:', err && err.message);
		process.exitCode = 1;
	} finally {
		global.location = originalLocation;
	}
})();
