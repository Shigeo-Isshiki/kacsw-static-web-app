'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'src', 'text-suite.js');
const formBridgeLibraryPath = path.join(__dirname, '..', 'src', 'formbridge-custom-lib.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const formBridgeLibrarySource = fs.readFileSync(formBridgeLibraryPath, 'utf8');

const createEnvironment = ({ withFormBridgeLibrary = true } = {}) => {
	const registrations = [];
	const context = vm.createContext({
		console: { warn() {}, debug() {} },
		mockEvents: {
			on(eventName, handler) {
				registrations.push({ eventName, handler });
			},
		},
	});
	context.window = context;
	context.mockFormBridge = { events: context.mockEvents };
	vm.runInContext('const formBridge = mockFormBridge;', context);
	if (withFormBridgeLibrary) vm.runInContext(formBridgeLibrarySource, context);
	vm.runInContext(source, context);
	return { context, registrations };
};

const addFormBridgeApi = (context, calls, overrides = {}) => {
	context.mockFormBridge.fn = {
		setFieldValue(fieldCode, value) {
			calls.push(['value', fieldCode, value]);
			if (overrides.setFieldValue) overrides.setFieldValue(fieldCode, value);
		},
		setFieldValueError(fieldCode, errorMessage) {
			calls.push(['error', fieldCode, errorMessage]);
			if (overrides.setFieldValueError) overrides.setFieldValueError(fieldCode, errorMessage);
		},
		setSubtableFieldValue(tableFieldCode, fieldCode, rowIndex, value) {
			calls.push(['subtable-value', tableFieldCode, fieldCode, rowIndex, value]);
			if (overrides.setSubtableFieldValue)
				overrides.setSubtableFieldValue(tableFieldCode, fieldCode, rowIndex, value);
		},
		setSubtableFieldValueError(tableFieldCode, fieldCode, rowIndex, errorMessage) {
			calls.push(['subtable-error', tableFieldCode, fieldCode, rowIndex, errorMessage]);
			if (overrides.setSubtableFieldValueError)
				overrides.setSubtableFieldValueError(tableFieldCode, fieldCode, rowIndex, errorMessage);
		},
	};
};

test('loading text-suite has no FormBridge dependency or side effects and keeps kintone APIs', () => {
	const registrations = [];
	const context = vm.createContext({
		console,
		mockEvents: {
			on(eventName, handler) {
				registrations.push({ eventName, handler });
			},
		},
	});
	context.window = context;
	context.mockFormBridge = { events: context.mockEvents };
	vm.runInContext('const formBridge = mockFormBridge;', context);
	vm.runInContext(source, context);

	assert.equal(registrations.length, 0);
	assert.equal(typeof context.window.registerFormBridgeFullWidthHandler, 'function');
	assert.equal(typeof context.window.registerFormBridgeFullWidthHiraganaHandler, 'function');
	assert.equal(context.window.formBridgeCustomLib, undefined);
	assert.equal(vm.runInContext('typeof window.formBridge', context), 'undefined');

	context.kintone = {
		events: {
			on(eventNames, handler) {
				registrations.push({ eventName: eventNames, handler });
			},
		},
	};
	context.window.registerFullWidthHandler('kintone_name');
	assert.deepEqual(Array.from(registrations[0].eventName), [
		'app.record.create.change.kintone_name',
		'app.record.edit.change.kintone_name',
	]);
	const event = { record: { kintone_name: { value: 'abc' } } };
	registrations[0].handler(event);
	assert.equal(event.record.kintone_name.value, 'ａｂｃ');
});

test('FormBridge registration uses its lexical global, accepts missing fn, and uses event.value', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	const register = context.window.registerFormBridgeFullWidthHandler;

	assert.equal(vm.runInContext('typeof formBridge', context), 'object');
	assert.equal(vm.runInContext('typeof formBridge.events.on', context), 'function');
	assert.equal(vm.runInContext('typeof window.formBridge', context), 'undefined');
	register('Name_input', 'Name');
	assert.equal(registrations.length, 1);
	assert.equal(registrations[0].eventName, 'form.field.change.Name_input');

	addFormBridgeApi(context, calls);
	const event = { value: 'ａｂc', record: { Name_input: { value: 'old value' } } };
	registrations[0].handler(event);
	assert.deepEqual(calls, [
		['error', 'Name_input', null],
		['value', 'Name', 'ａｂｃ'],
	]);
	assert.equal(event.record.Name_input.value, 'old value');
});

test('FormBridge full-width and hiragana handlers match the existing converters', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);

	context.window.registerFormBridgeFullWidthHandler('input', 'saved');
	registrations[0].handler({ value: '\\~Aｶ' });
	assert.equal(calls[1][2], context.window.toFullWidth('\\~Aｶ'));

	context.window.registerFormBridgeFullWidthHiraganaHandler('kana_input', 'kana');
	registrations[1].handler({ value: 'ｶﾀｶﾅ' });
	assert.equal(calls[3][2], context.window.toFullWidthHiragana('ｶﾀｶﾅ'));

	context.window.registerFormBridgeFullWidthHiraganaHandler('strict_kana_input', 'strict_kana', {
		throwOnError: true,
	});
	registrations[2].handler({ value: 'あA' });
	assert.deepEqual(calls.slice(-2), [
		['value', 'strict_kana', ''],
		['error', 'strict_kana_input', 'ひらがな以外の文字が含まれています: A'],
	]);
});

test('FormBridge subtable handlers use official event names and target only the changed row', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	const record = {
		Items: {
			value: [
				{ value: { Input: { value: 'old row 0' }, Saved: { value: 'keep 0' } } },
				{ value: { Input: { value: 'old row 1' }, Saved: { value: 'keep 1' } } },
			],
		},
	};

	context.window.registerFormBridgeTableFullWidthHandler('Items', 'Input', 'Saved');
	assert.equal(registrations[0].eventName, 'form.field.change.Items.Input');
	addFormBridgeApi(context, calls);
	registrations[0].handler({ value: 'ｶﾞ A', rowIndex: 1, record });
	assert.deepEqual(calls, [
		['subtable-error', 'Items', 'Input', 1, null],
		['subtable-value', 'Items', 'Saved', 1, 'ガ\u3000Ａ'],
	]);
	assert.equal(record.Items.value[0].value.Saved.value, 'keep 0');
	assert.equal(record.Items.value[1].value.Saved.value, 'keep 1');
	assert.equal(record.Items.value[1].value.Input.value, 'old row 1');
	registrations[0].handler({ value: '', rowIndex: 0 });
	assert.deepEqual(calls.slice(-2), [
		['subtable-error', 'Items', 'Input', 0, null],
		['subtable-value', 'Items', 'Saved', 0, ''],
	]);

	context.window.registerFormBridgeTableFullWidthHiraganaHandler(
		'Items',
		'Kana_input',
		'Kana_saved'
	);
	assert.equal(registrations[1].eventName, 'form.field.change.Items.Kana_input');
	registrations[1].handler({ value: 'ｶﾞｯｺｳ', rowIndex: 0 });
	assert.deepEqual(calls.slice(-2), [
		['subtable-error', 'Items', 'Kana_input', 0, null],
		['subtable-value', 'Items', 'Kana_saved', 0, 'がっこう'],
	]);
});

test('FormBridge subtable handlers support empty retention, strict errors, and post-conversion limits', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);

	context.window.registerFormBridgeTableFullWidthHandler('Items', 'Input', 'Saved', {
		clearSavedFieldOnEmpty: false,
		throwOnError: true,
		maxLength: 1,
		maxLengthErrorMessage: '1文字までです。',
	});
	registrations[0].handler({ value: '', rowIndex: 2 });
	assert.deepEqual(calls, [['subtable-error', 'Items', 'Input', 2, null]]);

	registrations[0].handler({ value: 'ｶﾞ', rowIndex: 2 });
	assert.deepEqual(calls.slice(-2), [
		['subtable-error', 'Items', 'Input', 2, null],
		['subtable-value', 'Items', 'Saved', 2, 'ガ'],
	]);

	registrations[0].handler({ value: 'AB', rowIndex: 2 });
	assert.deepEqual(calls.slice(-2), [
		['subtable-value', 'Items', 'Saved', 2, ''],
		['subtable-error', 'Items', 'Input', 2, '1文字までです。'],
	]);

	registrations[0].handler({ value: 'a\t', rowIndex: 2 });
	assert.deepEqual(calls.slice(-2), [
		['subtable-value', 'Items', 'Saved', 2, ''],
		['subtable-error', 'Items', 'Input', 2, '全角文字に変換不能な文字が含まれています: \t'],
	]);
});

test('FormBridge subtable event row and value errors and FormBridge API failures propagate', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);
	context.window.registerFormBridgeTableFullWidthHandler('Items', 'Input', 'Saved');
	const handler = registrations[0].handler;

	assert.throws(() => handler({ value: 'text' }), /valueまたはrowIndexがありません/);
	assert.throws(() => handler({ value: 'text', rowIndex: -1 }), /rowIndexが不正です/);
	assert.throws(() => handler({ value: 'text', rowIndex: 1.5 }), /rowIndexが不正です/);
	assert.throws(() => handler({ value: 'text', rowIndex: Number.MAX_VALUE }), /rowIndexが不正です/);
	handler({ value: 0, rowIndex: 0 });
	assert.deepEqual(calls.slice(-2), [
		['subtable-value', 'Items', 'Saved', 0, ''],
		[
			'subtable-error',
			'Items',
			'Input',
			0,
			'入力値は文字列、null、undefined、または空文字列である必要があります',
		],
	]);

	addFormBridgeApi(context, calls, {
		setSubtableFieldValue() {
			throw new Error('subtable value API failed');
		},
	});
	assert.throws(() => handler({ value: 'ok', rowIndex: 0 }), /subtable value API failed/);

	addFormBridgeApi(context, calls, {
		setSubtableFieldValueError(_table, _field, _row, message) {
			if (message === null) throw new Error('subtable error API failed');
		},
	});
	assert.throws(() => handler({ value: 'ok', rowIndex: 0 }), /subtable error API failed/);
});

test('options preserve whitespace by default and remove all whitespace before length checks', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);

	context.window.registerFormBridgeFullWidthHandler('input', 'saved', { maxLength: 3 });
	registrations[0].handler({ value: 'a b' });
	assert.deepEqual(calls.slice(-1), [['value', 'saved', 'ａ\u3000ｂ']]);

	context.window.registerFormBridgeFullWidthHandler('input', 'saved', {
		removeWhitespace: true,
		maxLength: 3,
	});
	registrations[1].handler({ value: 'a \tb\nc\u3000' });
	assert.deepEqual(calls.slice(-1), [['value', 'saved', 'ａｂｃ']]);

	context.window.registerFormBridgeFullWidthHandler('input', 'saved', {
		removeWhitespace: true,
		maxLength: 2,
		maxLengthErrorMessage: '2文字までです。',
	});
	registrations[2].handler({ value: 'a b c' });
	assert.deepEqual(calls.slice(-2), [
		['value', 'saved', ''],
		['error', 'input', '2文字までです。'],
	]);
});

test('strictness and custom max length handle the 20/21 boundary after conversion', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);
	const addressError = '住所は20文字以内で入力してください。';

	context.window.registerFormBridgeFullWidthHandler('address_input', 'address', {
		throwOnError: false,
		maxLength: 20,
		maxLengthErrorMessage: addressError,
	});
	registrations[0].handler({ value: 'A'.repeat(20) });
	assert.equal(calls.at(-1)[2], 'Ａ'.repeat(20));
	registrations[0].handler({ value: 'A'.repeat(21) });
	assert.deepEqual(calls.slice(-2), [
		['value', 'address', ''],
		['error', 'address_input', addressError],
	]);

	context.window.registerFormBridgeFullWidthHandler('compound_input', 'compound_saved', {
		maxLength: 1,
	});
	registrations[1].handler({ value: 'ｶﾞ' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'compound_input', null],
		['value', 'compound_saved', 'ガ'],
	]);

	context.window.registerFormBridgeFullWidthHandler('strict_input', 'strict', {
		throwOnError: true,
	});
	registrations[2].handler({ value: 'a\tb' });
	assert.deepEqual(calls.slice(-2), [
		['value', 'strict', ''],
		['error', 'strict_input', '全角文字に変換不能な文字が含まれています: \t'],
	]);

	context.window.registerFormBridgeFullWidthHandler('loose_input', 'loose', {
		throwOnError: false,
	});
	registrations[3].handler({ value: 'a\tb' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'loose_input', null],
		['value', 'loose', 'ａ\tｂ'],
	]);
});

test('conversion errors clear the saved field, and a later valid value clears prior errors', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);
	context.window.registerFormBridgeFullWidthHandler('input', 'saved', { throwOnError: true });

	registrations[0].handler({ value: 'a\tb' });
	assert.deepEqual(calls.slice(-2), [
		['value', 'saved', ''],
		['error', 'input', '全角文字に変換不能な文字が含まれています: \t'],
	]);
	registrations[0].handler({ value: 'abc' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'input', null],
		['value', 'saved', 'ａｂｃ'],
	]);
});

test('empty values clear errors and optionally clear or retain the saved value', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);
	context.window.registerFormBridgeFullWidthHandler('input', 'saved');
	registrations[0].handler({ value: '' });
	assert.deepEqual(calls, [
		['error', 'input', null],
		['value', 'saved', ''],
	]);

	context.window.registerFormBridgeFullWidthHandler('keep_input', 'keep_saved', {
		clearSavedFieldOnEmpty: false,
	});
	[null, undefined, ''].forEach((value) => registrations[1].handler({ value }));
	assert.deepEqual(calls.slice(-3), [
		['error', 'keep_input', null],
		['error', 'keep_input', null],
		['error', 'keep_input', null],
	]);
});

test('invalid input types and malformed events are surfaced without silent coercion', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];
	addFormBridgeApi(context, calls);
	context.window.registerFormBridgeFullWidthHandler('input', 'saved');

	[0, false, [], {}].forEach((value) => {
		registrations[0].handler({ value });
		assert.equal(calls.at(-2)[2], '');
		assert.match(calls.at(-1)[2], /入力値は文字列/);
	});
	assert.throws(() => registrations[0].handler({}), /イベントにvalueがありません/);
});

test('invalid field codes and options are rejected during registration', () => {
	const { context } = createEnvironment();
	const register = context.window.registerFormBridgeFullWidthHandler;

	[
		() => register('', 'saved'),
		() => register('input', '  '),
		() => register('same', 'same'),
		() => register('input', 'saved', null),
		() => register('input', 'saved', { throwOnError: 'true' }),
		() => register('input', 'saved', { removeWhitespace: 1 }),
		() => register('input', 'saved', { maxLength: 0 }),
		() => register('input', 'saved', { maxLength: '20' }),
		() => register('input', 'saved', { maxLengthErrorMessage: '' }),
		() => register('input', 'saved', { clearSavedFieldOnEmpty: 'false' }),
	].forEach((registerInvalid) => assert.throws(registerInvalid));

	assert.throws(
		() => context.window.registerFormBridgeTableFullWidthHandler('Items', 'Name', 'Name'),
		/inputFieldCodeとsavedFieldCode/
	);
	assert.throws(
		() => context.window.registerFormBridgeTableFullWidthHandler('', 'Input', 'Saved'),
		/tableFieldCode/
	);
});

test('FormBridge dependencies are checked when registering without requiring fn', () => {
	const { context, registrations } = createEnvironment({ withFormBridgeLibrary: false });
	assert.throws(
		() => context.window.registerFormBridgeFullWidthHandler('input', 'saved'),
		/formBridgeCustomLib v1\.0\.1以上/
	);
	assert.equal(registrations.length, 0);

	const noEventsContext = vm.createContext({ window: {} });
	vm.runInContext('const formBridge = {};', noEventsContext);
	vm.runInContext(source, noEventsContext);
	noEventsContext.window.formBridgeCustomLib = {
		setFieldValue() {},
		setFieldError() {},
	};
	assert.throws(
		() => noEventsContext.window.registerFormBridgeFullWidthHandler('input', 'saved'),
		/formBridge\.events\.onが利用できません/
	);
});

test('FormBridge API exceptions propagate and are not converted into validation errors', () => {
	const { context, registrations } = createEnvironment();
	const calls = [];

	addFormBridgeApi(context, calls, {
		setFieldValue() {
			throw new Error('value API failed');
		},
	});
	context.window.registerFormBridgeFullWidthHandler('input', 'saved');
	assert.throws(() => registrations[0].handler({ value: 'valid' }), /value API failed/);

	addFormBridgeApi(context, calls, {
		setFieldValueError(fieldCode, message) {
			if (message === null) throw new Error('error API failed');
		},
	});
	assert.throws(() => registrations[0].handler({ value: 'valid' }), /error API failed/);

	addFormBridgeApi(context, calls, {
		setFieldValue() {
			throw new Error('saved field API failed');
		},
	});
	context.window.registerFormBridgeFullWidthHandler('strict_input', 'strict_saved', {
		throwOnError: true,
	});
	assert.throws(() => registrations[1].handler({ value: 'a\tb' }), /saved field API failed/);
});
