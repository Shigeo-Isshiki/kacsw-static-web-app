'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { setTimeout: delay } = require('node:timers/promises');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'text-suite.js'), 'utf8');

const fieldHtml = (code) =>
	`<div class="fb-custom--field" data-field-code="${code}"><input type="text"></div>`;

const DEFAULT_FIELDS = ['Name_input', 'Name_kana_input', 'First_input', 'First_kana_input'];

const createFixture = (
	t,
	{
		fieldCodes = DEFAULT_FIELDS,
		withFormBridge = true,
		withCustomLib = true,
		withJQuery = true,
		withAutoKana = true,
	} = {}
) => {
	const dom = new JSDOM(`<body>${fieldCodes.map(fieldHtml).join('')}</body>`, {
		runScripts: 'outside-only',
	});
	t.after(() => dom.window.close());
	const { window } = dom;
	const errors = [];
	window.console.error = (...args) => errors.push(args.map(String).join(' '));

	const registrations = new Map();
	if (withFormBridge) {
		window.formBridge = {
			events: {
				on(eventName, handler) {
					if (!registrations.has(eventName)) registrations.set(eventName, []);
					registrations.get(eventName).push(handler);
				},
			},
		};
	}
	const emit = (eventName, event) =>
		(registrations.get(eventName) || []).forEach((handler) => handler(event));

	const values = [];
	if (withCustomLib) {
		window.formBridgeCustomLib = {
			setFieldValue(fieldCode, value) {
				values.push([fieldCode, value]);
			},
			setFieldError() {},
		};
	}

	const autoKanaCalls = [];
	const changeHandlers = new Map();
	if (withJQuery) {
		const jquery = (element) => ({
			element,
			on(eventName, handler) {
				if (eventName === 'change') {
					if (!changeHandlers.has(element)) changeHandlers.set(element, []);
					changeHandlers.get(element).push(handler);
				}
				return this;
			},
		});
		jquery.fn = {};
		if (withAutoKana)
			jquery.fn.autoKana = (jqName, jqKana, options) =>
				autoKanaCalls.push({ nameElement: jqName.element, kanaElement: jqKana.element, options });
		window.jQuery = jquery;
	}

	window.eval(source);

	return {
		window,
		emit,
		registrations,
		values,
		errors,
		autoKanaCalls,
		input: (code) =>
			window.document.querySelector(`.fb-custom--field[data-field-code="${code}"] input`),
		// autoKanaの補完・利用者の手修正はjQueryのchangeハンドラ経由で通知される
		triggerChange: (element) =>
			(changeHandlers.get(element) || []).forEach((handler) => handler.call(element)),
		compositionEnd: (element) => element.dispatchEvent(new window.Event('compositionend')),
		compositionStart: (element) => element.dispatchEvent(new window.Event('compositionstart')),
		register: window.registerFormBridgeAutoKanaHandler,
	};
};

test('loading exposes the handler without registering events or touching other APIs', (t) => {
	const f = createFixture(t);
	assert.equal(typeof f.register, 'function');
	assert.equal(f.registrations.size, 0);
	assert.equal(typeof f.window.registerFormBridgeFullWidthHiraganaHandler, 'function');
	assert.equal(f.window.toFullWidthHiragana('ｶﾅ'), 'かな');
});

test('registration rejects invalid field codes and options', (t) => {
	const f = createFixture(t);
	[
		() => f.register('', 'kana_input', 'kana'),
		() => f.register('name', '  ', 'kana'),
		() => f.register('name', 'kana_input', null),
		() => f.register('same', 'same', 'kana'),
		() => f.register('name', 'same', 'same'),
		() => f.register('name', 'kana_input', 'kana', null),
		() => f.register('name', 'kana_input', 'kana', []),
		() => f.register('name', 'kana_input', 'kana', { katakana: 'true' }),
		() => f.register('name', 'kana_input', 'kana', { getInputElement: 'input' }),
	].forEach((registerInvalid) => assert.throws(registerInvalid));
	assert.equal(f.registrations.size, 0);
});

test('registration fails fast when dependencies are missing', (t) => {
	assert.throws(
		() => createFixture(t, { withFormBridge: false }).register('name', 'kana_input', 'kana'),
		/formBridge\.events\.onが利用できません/
	);
	assert.throws(
		() => createFixture(t, { withCustomLib: false }).register('name', 'kana_input', 'kana'),
		/formBridgeCustomLib v1\.0\.1以上が利用できません/
	);
	assert.throws(
		() => createFixture(t, { withJQuery: false }).register('name', 'kana_input', 'kana'),
		/jQueryまたはjquery\.autoKana\.jsが利用できません/
	);
	assert.throws(
		() => createFixture(t, { withAutoKana: false }).register('name', 'kana_input', 'kana'),
		/jQueryまたはjquery\.autoKana\.jsが利用できません/
	);
});

test('form.show binds autoKana once and rebinds only for recreated inputs', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	assert.deepEqual([...f.registrations.keys()], ['form.show']);

	f.emit('form.show');
	f.emit('form.show');
	assert.equal(f.autoKanaCalls.length, 1);
	assert.equal(f.autoKanaCalls[0].nameElement, f.input('Name_input'));
	assert.equal(f.autoKanaCalls[0].kanaElement, f.input('Name_kana_input'));
	assert.equal(f.autoKanaCalls[0].options.katakana, false);

	// 再表示でDOMが作り直された場合は新しい入力要素へ再初期化する
	const nameField = f.input('Name_input').parentElement;
	nameField.replaceChild(f.window.document.createElement('input'), f.input('Name_input'));
	f.emit('form.show');
	assert.equal(f.autoKanaCalls.length, 2);
});

test('katakana option is passed through to autoKana', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana', { katakana: true });
	f.emit('form.show');
	assert.equal(f.autoKanaCalls[0].options.katakana, true);
});

test('saved kana is normalized to hiragana by default and when katakana is false', (t) => {
	for (const options of [{}, { katakana: false }]) {
		const f = createFixture(t);
		f.register('Name_input', 'Name_kana_input', 'Name_kana', options);
		f.emit('form.show');
		const kanaInput = f.input('Name_kana_input');

		kanaInput.value = 'ｶﾀｶﾅ';
		f.triggerChange(kanaInput);
		assert.deepEqual(f.values, [
			['Name_kana_input', 'ｶﾀｶﾅ'],
			['Name_kana', 'かたかな'],
		]);
	}
});

test('saved kana is normalized to katakana when katakana is true', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana', { katakana: true });
	f.emit('form.show');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'ひらがな';
	f.triggerChange(kanaInput);
	assert.deepEqual(f.values, [
		['Name_kana_input', 'ひらがな'],
		['Name_kana', 'ヒラガナ'],
	]);
});

test('hiragana handlers persist the same normalized value in either event order', (t) => {
	for (const formBridgeFirst of [true, false]) {
		const f = createFixture(t);
		f.window.registerFormBridgeFullWidthHiraganaHandler('Name_kana_input', 'Name_kana');
		f.register('Name_input', 'Name_kana_input', 'Name_kana');
		f.emit('form.show');
		const kanaInput = f.input('Name_kana_input');
		kanaInput.value = 'カタカナ';

		if (formBridgeFirst) {
			f.emit('form.field.change.Name_kana_input', { value: kanaInput.value });
			f.triggerChange(kanaInput);
		} else {
			f.triggerChange(kanaInput);
			f.emit('form.field.change.Name_kana_input', { value: kanaInput.value });
		}

		assert.equal(
			f.values.filter(([fieldCode]) => fieldCode === 'Name_kana').at(-1)[1],
			'かたかな'
		);
	}
});

test('kana completion updates the display field and the saved field', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'やまだ';
	f.triggerChange(kanaInput);
	assert.deepEqual(f.values, [
		['Name_kana_input', 'やまだ'],
		['Name_kana', 'やまだ'],
	]);
});

test('kana cleared by autoKana right after IME commit is restored on screen and in saved values', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const nameInput = f.input('Name_input');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'やまだ';
	f.triggerChange(kanaInput);
	nameInput.value = '山田';
	f.compositionEnd(nameInput);

	// IME確定直後、補完ライブラリが一時的にかな欄を空へ戻すケース
	kanaInput.value = '';
	f.triggerChange(kanaInput);
	assert.equal(kanaInput.value, 'やまだ');
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', 'やまだ'],
		['Name_kana', 'やまだ'],
	]);
});

test('IME commit with an already empty kana field restores immediately', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const nameInput = f.input('Name_input');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'すずき';
	f.triggerChange(kanaInput);
	nameInput.value = '鈴木';
	kanaInput.value = '';
	f.compositionEnd(nameInput);
	assert.equal(kanaInput.value, 'すずき');
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', 'すずき'],
		['Name_kana', 'すずき'],
	]);
});

test('empty kana after the composition window expires clears the saved values', async (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const nameInput = f.input('Name_input');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'やまだ';
	f.triggerChange(kanaInput);
	nameInput.value = '山田';
	kanaInput.value = 'やまだ';
	f.compositionEnd(nameInput);
	await delay(150);

	kanaInput.value = '';
	f.triggerChange(kanaInput);
	assert.equal(kanaInput.value, '');
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', ''],
		['Name_kana', ''],
	]);
});

test('empty kana during composition is ignored until the composition settles', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const nameInput = f.input('Name_input');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'やまだ';
	f.triggerChange(kanaInput);
	const valueCount = f.values.length;
	f.compositionStart(nameInput);
	kanaInput.value = '';
	f.triggerChange(kanaInput);
	// 変換中は復元も消去も行わない
	assert.equal(f.values.length, valueCount);
	assert.equal(kanaInput.value, '');
});

test('clearing the name clears the kana display and saved values without restoring', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const nameInput = f.input('Name_input');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'やまだ';
	f.triggerChange(kanaInput);
	nameInput.value = '';
	kanaInput.value = '';
	f.compositionEnd(nameInput);
	assert.equal(kanaInput.value, '');
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', ''],
		['Name_kana', ''],
	]);

	// 以前のふりがなは復元されない
	nameInput.value = '山田';
	f.compositionEnd(nameInput);
	assert.equal(kanaInput.value, '');
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', ''],
		['Name_kana', ''],
	]);
});

test('manual kana edits are propagated, kept, and used for later restores', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.emit('form.show');
	const nameInput = f.input('Name_input');
	const kanaInput = f.input('Name_kana_input');

	kanaInput.value = 'やまだ';
	f.triggerChange(kanaInput);
	// 利用者がふりがな欄を手修正したケース
	kanaInput.value = 'やまた';
	f.triggerChange(kanaInput);
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', 'やまた'],
		['Name_kana', 'やまた'],
	]);

	// 氏名側の変換確定で手修正値が上書き・消去されない
	nameInput.value = '山多';
	f.compositionEnd(nameInput);
	assert.equal(kanaInput.value, 'やまた');

	// 確定直後の一時的な空値は手修正後の値で復元される
	kanaInput.value = '';
	f.triggerChange(kanaInput);
	assert.equal(kanaInput.value, 'やまた');
	assert.deepEqual(f.values.slice(-2), [
		['Name_kana_input', 'やまた'],
		['Name_kana', 'やまた'],
	]);
});

test('multiple field pairs work independently', (t) => {
	const f = createFixture(t);
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	f.register('First_input', 'First_kana_input', 'First_kana');
	f.emit('form.show');
	assert.equal(f.autoKanaCalls.length, 2);

	const lastKanaInput = f.input('Name_kana_input');
	const firstKanaInput = f.input('First_kana_input');
	lastKanaInput.value = 'やまだ';
	f.triggerChange(lastKanaInput);
	firstKanaInput.value = 'たろう';
	f.triggerChange(firstKanaInput);
	assert.deepEqual(f.values, [
		['Name_kana_input', 'やまだ'],
		['Name_kana', 'やまだ'],
		['First_kana_input', 'たろう'],
		['First_kana', 'たろう'],
	]);

	// 名側の氏名消去は姓側へ影響しない
	f.input('First_input').value = '';
	firstKanaInput.value = '';
	f.compositionEnd(f.input('First_input'));
	assert.equal(lastKanaInput.value, 'やまだ');
	assert.deepEqual(f.values.slice(-2), [
		['First_kana_input', ''],
		['First_kana', ''],
	]);
});

test('missing target fields log an error without stopping other handlers', (t) => {
	const f = createFixture(t);
	f.register('Missing_input', 'Missing_kana_input', 'Missing_kana');
	f.register('Name_input', 'Name_kana_input', 'Name_kana');
	assert.doesNotThrow(() => f.emit('form.show'));
	assert.equal(f.errors.length, 1);
	assert.match(f.errors[0], /ふりがな自動補完の対象フィールドが見つかりません/);
	assert.match(f.errors[0], /Missing_input/);
	assert.equal(f.autoKanaCalls.length, 1);
	assert.equal(f.autoKanaCalls[0].nameElement, f.input('Name_input'));
});

test('getInputElement option overrides the default DOM lookup', (t) => {
	const f = createFixture(t, { fieldCodes: [] });
	const elements = {
		Custom_name: f.window.document.createElement('input'),
		Custom_kana_input: f.window.document.createElement('input'),
	};
	f.window.document.body.append(elements.Custom_name, elements.Custom_kana_input);
	f.register('Custom_name', 'Custom_kana_input', 'Custom_kana', {
		getInputElement: (fieldCode) => elements[fieldCode] || null,
	});
	f.emit('form.show');
	assert.equal(f.autoKanaCalls.length, 1);
	assert.equal(f.autoKanaCalls[0].nameElement, elements.Custom_name);

	elements.Custom_kana_input.value = 'かすたむ';
	f.triggerChange(elements.Custom_kana_input);
	assert.deepEqual(f.values, [
		['Custom_kana_input', 'かすたむ'],
		['Custom_kana', 'かすたむ'],
	]);
});
