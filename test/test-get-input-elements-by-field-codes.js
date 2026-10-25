const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'kintone-custom-lib.js'), 'utf8');
const control = (label, id, content = '<input type="text">', className = `value-${id}`) =>
	`<div class="control-gaia"><span class="control-label-text-gaia">${label}</span>` +
	`<div class="${className}">${content}</div></div>`;
const mobileControl = (label, id, content = '<input class="forms-text-gaia" type="text">') =>
	`<div class="row-gaia"><div class="control-gaia field-${id}">` +
	`<h3 class="control-label-gaia label-${id}">${label}</h3>` +
	`<div class="control-value-gaia value-${id}">${content}</div></div></div>`;
const field = (label, extra = {}) => ({ type: 'SINGLE_LINE_TEXT', label, ...extra });

function fixture(t, fields = {}, html = '') {
	const dom = new JSDOM(html, {
		url: 'https://example.com/k/401/edit',
		runScripts: 'outside-only',
	});
	t.after(() => dom.window.close());
	const { window } = dom;
	const warnings = [];
	let calls = 0;
	window.console.warn = (...args) => warnings.push(args);
	window.kintone = {
		app: {
			async getFormFields() {
				calls += 1;
				return fields;
			},
		},
	};
	window.eval(source);
	return {
		window,
		document: window.document,
		find: window.getInputElementsByFieldCodes,
		warnings,
		calls: () => calls,
		reasons: () => warnings[0][1].reasons,
	};
}

test('01: registers window.getInputElementsByFieldCodes', (t) => {
	assert.equal(typeof fixture(t).window.getInputElementsByFieldCodes, 'function');
});

test('02: fetches form fields once per call, without caching across calls', async (t) => {
	const f = fixture(t, { A: field('A'), B: field('B') }, control('A', 1) + control('B', 2));
	await f.find(['A', 'B']);
	assert.equal(f.calls(), 1);
	await f.find(['B']);
	assert.equal(f.calls(), 2);
	assert.equal(f.warnings.length, 0);
});

test('03: returns exactly the inputs selected by legacy numeric selectors', async (t) => {
	const f = fixture(
		t,
		{ NAME: field('Name'), KANA: field('Kana') },
		control('Name', 5769163) + control('Kana', 5769164)
	);
	const result = await f.find(['NAME', 'KANA']);
	assert.deepEqual(Object.keys(result), ['NAME', 'KANA']);
	assert.equal(result.NAME, f.document.querySelector('.value-5769163 input'));
	assert.equal(result.KANA, f.document.querySelector('.value-5769164 input'));
	assert.ok(result.NAME instanceof f.window.HTMLInputElement);
});

test('04: trims labels and uses exact rather than partial matching', async (t) => {
	const f = fixture(
		t,
		{ LAST: field(' LAST '), PART: field('LAST_PART') },
		control('LAST_PART', 2) + control(' \n LAST \t ', 1)
	);
	assert.equal((await f.find(['LAST'])).LAST, f.document.querySelector('.value-1 input'));
});

test('05: missing code is null with a distinct reason', async (t) => {
	const f = fixture(t);
	assert.equal((await f.find(['MISSING'])).MISSING, null);
	assert.match(f.reasons().MISSING, /存在しない/);
});

test('06: duplicate labels include subtable fields and normalize whitespace', async (t) => {
	const f = fixture(
		t,
		{
			NAME: field('Name'),
			TABLE: { type: 'SUBTABLE', label: 'Table', fields: { CHILD: field(' Name ') } },
		},
		control('Name', 1)
	);
	assert.equal((await f.find(['NAME'])).NAME, null);
	assert.match(f.reasons().NAME, /同じ項目名のフィールドが2件/);
});

test('07: subtable codes are unsupported even when the DOM matches', async (t) => {
	const f = fixture(
		t,
		{
			TABLE: { type: 'SUBTABLE', label: 'Table', fields: { CHILD: field('Child') } },
		},
		control('Child', 1)
	);
	assert.equal((await f.find(['CHILD'])).CHILD, null);
	assert.match(f.reasons().CHILD, /テーブル内/);
});

test('08: matching control without input returns null', async (t) => {
	const f = fixture(
		t,
		{ A: field('A', { type: 'DROP_DOWN' }) },
		control('A', 1, '<select><option>A</option></select>')
	);
	assert.equal((await f.find(['A'])).A, null);
	assert.match(f.reasons().A, /input がない/);
});

test('09: multiple matching screen controls return null', async (t) => {
	const f = fixture(t, { A: field('A') }, control('A', 1) + control(' A ', 2));
	assert.equal((await f.find(['A'])).A, null);
	assert.match(f.reasons().A, /画面上.*2件/);
});

test('10: no matching screen controls returns null', async (t) => {
	const f = fixture(t, { A: field('A') }, control('A_PART', 1));
	assert.equal((await f.find(['A'])).A, null);
	assert.match(f.reasons().A, /画面上.*0件/);
});

test('11: noLabel returns null even with a matching screen label', async (t) => {
	const f = fixture(t, { A: field('A', { noLabel: true }) }, control('A', 1));
	assert.equal((await f.find(['A'])).A, null);
	assert.match(f.reasons().A, /フィールド名を表示しない/);
});

test('12: aggregates all failure reasons into one warning', async (t) => {
	const f = fixture(t, { A: field('A'), B: field('B', { noLabel: true }) });
	await f.find(['A', 'B', 'MISSING']);
	assert.equal(f.warnings.length, 1);
	assert.deepEqual(Object.keys(f.reasons()), ['A', 'B', 'MISSING']);
	assert.match(f.reasons().A, /0件/);
	assert.match(f.reasons().B, /フィールド名を表示しない/);
	assert.match(f.reasons().MISSING, /存在しない/);
});

test('13: warn:false suppresses warnings including invalid input', async (t) => {
	const f = fixture(t);
	await f.find(['MISSING'], { warn: false });
	await f.find('MISSING', { warn: false });
	await f.find(['MISSING', '', null], { warn: false });
	f.window.initKintoneCustomLibRuntime({ mode: 'mobile' });
	await f.find(['MISSING'], { warn: false });
	assert.equal(f.warnings.length, 0);
});

test('14: explicitly initialized mobile runtime resolves the observed mobile DOM', async (t) => {
	const f = fixture(t, { A: field('A') }, mobileControl('A', 1));
	f.window.initKintoneCustomLibRuntime({ mode: 'mobile' });
	const result = await f.find(['A', 'B']);
	assert.equal(result.A, f.document.querySelector('.value-1 input'));
	assert.equal(result.B, null);
	assert.equal(f.calls(), 1);
	assert.equal(f.warnings.length, 1);
	assert.deepEqual(Object.keys(f.reasons()), ['B']);
	assert.match(f.reasons().B, /存在しない/);
});

test('15: absent kintone, app, API, or document returns null without throwing', async (t) => {
	const f = fixture(t);
	for (const kintone of [undefined, null, {}, { app: {} }]) {
		f.window.kintone = kintone;
		const result = await f.find(['A', 'B']);
		assert.equal(result.A, null);
		assert.equal(result.B, null);
	}
	assert.equal(f.warnings.length, 4);
	const warnings = [];
	let calls = 0;
	const context = {
		window: {},
		console: { warn: (...args) => warnings.push(args) },
		kintone: {
			app: {
				getFormFields: () => {
					calls += 1;
				},
			},
		},
	};
	vm.runInNewContext(source, context);
	assert.equal((await context.window.getInputElementsByFieldCodes(['A'])).A, null);
	assert.equal(calls, 0);
	assert.equal(warnings.length, 1);
});

test('16: API rejection propagates the identical error', async (t) => {
	const f = fixture(t);
	const error = new Error('API failed');
	f.window.kintone.app.getFormFields = () => Promise.reject(error);
	await assert.rejects(f.find(['A']), (actual) => actual === error);
	assert.equal(f.warnings.length, 0);
	await assert.rejects(f.find(['A', null]), (actual) => actual === error);
	assert.equal(f.warnings.length, 1);
	assert.ok(f.warnings[0][1].invalidFieldCodes);
});

test('17: non-array input returns an empty object and warns', async (t) => {
	const f = fixture(t);
	for (const value of ['A', null, undefined, 42, {}]) {
		assert.deepEqual(Object.keys(await f.find(value)), []);
	}
	assert.equal(f.warnings.length, 5);
	assert.equal(f.calls(), 0);
});

test('18: preserves DOM, values, focus, and input event registration', async (t) => {
	const f = fixture(t, { A: field('A') }, control('A', 1, '<input value="unchanged">'));
	const input = f.document.querySelector('input');
	input.focus();
	const before = f.document.documentElement.outerHTML;
	const active = f.document.activeElement;
	const mutations = [];
	const observer = new f.window.MutationObserver((records) => mutations.push(...records));
	observer.observe(f.document, {
		subtree: true,
		attributes: true,
		childList: true,
		characterData: true,
	});
	t.after(() => observer.disconnect());
	input.focus = () => assert.fail('must not focus');
	input.addEventListener = () => assert.fail('must not register input events');
	await f.find(['A', 'MISSING']);
	assert.equal(f.document.documentElement.outerHTML, before);
	assert.equal(f.document.activeElement, active);
	assert.equal(input.value, 'unchanged');
	assert.equal(mutations.length + observer.takeRecords().length, 0);
});

test('invalid members are excluded, valid codes are preserved, and warnings aggregate', async (t) => {
	const f = fixture(t, { A: field('A') }, control('A', 1));
	const result = await f.find(['A', '', ' \t ', null, 1, undefined, 'MISSING']);
	assert.deepEqual(Object.keys(result), ['A', 'MISSING']);
	assert.equal(result.A, f.document.querySelector('input'));
	assert.equal(result.MISSING, null);
	assert.equal(f.calls(), 1);
	assert.equal(f.warnings.length, 1);
	assert.ok(f.warnings[0][1].invalidFieldCodes);
	assert.match(f.reasons().MISSING, /存在しない/);
	const sparse = new Array(1);
	await f.find(sparse);
	assert.equal(f.warnings.length, 2);
});

test('empty arrays skip the API, invalid-only arrays warn, and duplicate codes share one key', async (t) => {
	const f = fixture(t, { A: field('A') }, control('A', 1));
	assert.deepEqual(Object.keys(await f.find([])), []);
	assert.equal(f.warnings.length, 0);
	await f.find(['', null]);
	assert.equal(f.calls(), 0);
	assert.equal(f.warnings.length, 1);
	assert.deepEqual(Object.keys(await f.find(['A', 'A'])), ['A']);
	assert.equal(f.calls(), 1);
});

test('matches only exact value-number class tokens with the required label/container', async (t) => {
	const f = fixture(
		t,
		{ A: field('A') },
		control('A', 1, '<input>', 'prefix-value-1 value-2-suffix value-x') +
			'<div class="value-3"><input></div>' +
			'<div class="control-gaia"><div class="value-4"><input></div></div>' +
			control('A', 5, '<input>', 'other value-5 another')
	);
	assert.equal((await f.find(['A'])).A, f.document.querySelector('.value-5 input'));
});

test('duplicate top-level or table-container labels are also rejected', async (t) => {
	for (const duplicate of [
		field('A', { noLabel: true }),
		{ type: 'SUBTABLE', label: ' A ', fields: {} },
	]) {
		const f = fixture(t, { A: field('A'), B: duplicate }, control('A', 1));
		assert.equal((await f.find(['A'])).A, null);
		assert.match(f.reasons().A, /同じ項目名.*2件/);
	}
});

test('empty labels have a reason; inherited and special property names are handled safely', async (t) => {
	const fields = Object.fromEntries([
		['EMPTY', field(' \t ')],
		['__proto__', field('Prototype')],
		['constructor', field('Constructor')],
	]);
	const f = fixture(t, fields, control('Prototype', 1) + control('Constructor', 2));
	const result = await f.find(['EMPTY', '__proto__', 'constructor', 'toString']);
	assert.equal(result.EMPTY, null);
	assert.match(f.reasons().EMPTY, /項目名が空/);
	assert.equal(result.__proto__, f.document.querySelector('.value-1 input'));
	assert.equal(result.constructor, f.document.querySelector('.value-2 input'));
	assert.equal(result.toString, null);
	assert.ok(Object.prototype.hasOwnProperty.call(result, '__proto__'));
	assert.match(f.reasons().toString, /存在しない/);
});

test('mobile pathname and global runtime settings select mobile labels', async (t) => {
	const f = fixture(t, { A: field('A') }, mobileControl('A', 1));
	f.window.history.replaceState(null, '', '/k/m/401/edit');
	assert.equal((await f.find(['A'])).A, f.document.querySelector('input'));
	f.window.history.replaceState(null, '', '/k/401/edit');
	f.window.KACSW_RUNTIME = { mode: 'mobile', version: 1 };
	assert.equal((await f.find(['A'])).A, f.document.querySelector('input'));
	assert.equal(f.calls(), 2);
	assert.equal(f.warnings.length, 0);
});

test('mobile uses exact labels, one API call, and preserves DOM, focus and values', async (t) => {
	const f = fixture(
		t,
		{ A: field(' A '), B: field('B') },
		mobileControl('A_PART', 3) + mobileControl(' A ', 1) + mobileControl('B', 2)
	);
	f.window.initKintoneCustomLibRuntime({ mode: 'mobile' });
	const input = f.document.querySelector('.value-1 input');
	input.value = 'unchanged';
	input.focus();
	const before = f.document.documentElement.outerHTML;
	const mutations = [];
	const observer = new f.window.MutationObserver((records) => mutations.push(...records));
	observer.observe(f.document, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	});
	t.after(() => observer.disconnect());
	input.focus = () => assert.fail('must not focus');
	input.addEventListener = () => assert.fail('must not register input events');
	const result = await f.find(['A', 'B']);
	assert.equal(result.A, input);
	assert.equal(result.B, f.document.querySelector('.value-2 input'));
	assert.equal(f.calls(), 1);
	assert.equal(f.warnings.length, 0);
	assert.equal(f.document.documentElement.outerHTML, before);
	assert.equal(f.document.activeElement, input);
	assert.equal(input.value, 'unchanged');
	assert.equal(mutations.length + observer.takeRecords().length, 0);
});

test('mobile preserves all exclusion reasons and warning aggregation', async (t) => {
	const f = fixture(
		t,
		{
			DUP: field('Duplicate'),
			TABLE: { type: 'SUBTABLE', label: 'Table', fields: { CHILD: field(' Duplicate ') } },
			HIDDEN: field('Hidden', { noLabel: true }),
			NO_INPUT: field('Select'),
			MULTIPLE: field('Multiple'),
			ABSENT: field('Absent'),
		},
		mobileControl('Duplicate', 1) +
			mobileControl('Hidden', 2) +
			mobileControl('Select', 3, '<select></select>') +
			mobileControl('Multiple', 4) +
			mobileControl('Multiple', 5)
	);
	f.window.initKintoneCustomLibRuntime({ mode: 'mobile' });
	const codes = ['DUP', 'CHILD', 'HIDDEN', 'NO_INPUT', 'MULTIPLE', 'ABSENT', 'MISSING'];
	const result = await f.find([...codes, null]);
	codes.forEach((code) => assert.equal(result[code], null));
	assert.equal(f.calls(), 1);
	assert.equal(f.warnings.length, 1);
	assert.match(f.reasons().DUP, /同じ項目名.*2件/);
	assert.match(f.reasons().CHILD, /テーブル内/);
	assert.match(f.reasons().HIDDEN, /フィールド名を表示しない/);
	assert.match(f.reasons().NO_INPUT, /input がない/);
	assert.match(f.reasons().MULTIPLE, /画面上.*2件/);
	assert.match(f.reasons().ABSENT, /画面上.*0件/);
	assert.match(f.reasons().MISSING, /存在しない/);
	await f.find(codes, { warn: false });
	assert.equal(f.warnings.length, 1);
});

test('mobile rejects the identical API error and safely handles unavailable API', async (t) => {
	const f = fixture(t);
	f.window.initKintoneCustomLibRuntime({ mode: 'mobile' });
	const error = new Error('mobile API failure');
	f.window.kintone.app.getFormFields = () => Promise.reject(error);
	await assert.rejects(f.find(['A']), (actual) => actual === error);
	assert.equal(f.warnings.length, 0);
	delete f.window.kintone.app.getFormFields;
	assert.equal((await f.find(['A'])).A, null);
	assert.equal(f.warnings.length, 1);
	assert.match(f.reasons().A, /利用できない/);
});

test('PC and mobile selectors remain isolated, including explicit PC override', async (t) => {
	const f = fixture(t, { A: field('A') }, control('A', 1) + mobileControl('A', 2));
	assert.equal((await f.find(['A'])).A, f.document.querySelector('.value-1 input'));
	f.window.initKintoneCustomLibRuntime({ mode: 'mobile' });
	assert.equal((await f.find(['A'])).A, f.document.querySelector('.value-2 input'));
	f.window.history.replaceState(null, '', '/k/m/401/edit');
	f.window.initKintoneCustomLibRuntime({ mode: 'pc' });
	assert.equal((await f.find(['A'])).A, f.document.querySelector('.value-1 input'));
	f.window.resetKintoneCustomLibRuntime();
	assert.equal((await f.find(['A'])).A, f.document.querySelector('.value-2 input'));
	assert.equal(f.warnings.length, 0);
});
