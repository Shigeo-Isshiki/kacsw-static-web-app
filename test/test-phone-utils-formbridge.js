'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const readSource = (name) => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
const source = readSource('phone-utils.js');
const baseSource = readSource('formbridge-custom-lib.js');

const createEnvironment = ({ withBase = true } = {}) => {
	const registrations = [];
	const calls = [];
	const unexpected = () => assert.fail('Unexpected logging or external communication');
	const context = vm.createContext({
		console: { log: unexpected, warn: unexpected, error: unexpected, debug: unexpected },
		fetch: unexpected,
		XMLHttpRequest: unexpected,
		mockFormBridge: {
			events: {
				on(eventName, handler) {
					registrations.push({ eventName, handler });
				},
			},
		},
	});
	context.window = context;
	vm.runInContext('const formBridge = mockFormBridge;', context);
	if (withBase) vm.runInContext(baseSource, context);
	vm.runInContext(source, context);
	const show = (overrides = {}) => {
		context.mockFormBridge.fn = {
			setFieldValue(field, value) {
				calls.push(['value', field, value]);
			},
			setFieldValueError(field, value) {
				calls.push(['error', field, value]);
			},
			...overrides,
		};
	};
	const register = (options = { type: 'callCapable' }) => {
		context.registerFormBridgePhoneNumberHandler('raw', 'saved', options);
		return registrations.at(-1).handler;
	};
	return { context, registrations, calls, show, register };
};

test('loading is inert, has no mandatory dependencies, and preserves kintone behavior', () => {
	const { context, calls, registrations } = createEnvironment({ withBase: false });
	assert.equal(registrations.length, 0);
	assert.deepEqual(calls, []);
	assert.equal(context.formBridgeCustomLib, undefined);
	assert.equal(context.mockFormBridge.fn, undefined);
	assert.equal(typeof context.registerFormBridgePhoneNumberHandler, 'function');

	const isolated = vm.createContext({ window: {} });
	vm.runInContext(source, isolated);
	assert.equal(isolated.window.formatPhoneNumber('08012345678').formattedNumber, '080-1234-5678');
	isolated.kintone = {
		events: { on: (events, handler) => registrations.push({ events, handler }) },
	};
	isolated.window.registerPhoneNumberHandler('phone', { type: 'mobile' });
	assert.deepEqual(Array.from(registrations[0].events), [
		'app.record.create.change.phone',
		'app.record.edit.change.phone',
		'mobile.app.record.create.change.phone',
		'mobile.app.record.edit.change.phone',
	]);
	const event = { record: { phone: { value: '08012345678', error: 'old' } } };
	assert.equal(registrations[0].handler(event), event);
	assert.equal(event.record.phone.value, '080-1234-5678');
	assert.equal(event.record.phone.error, null);
});

test('lexical const formBridge registers without fn and uses event.value after show', () => {
	const { context, registrations, calls, register, show } = createEnvironment();
	assert.equal(vm.runInContext('typeof formBridge.events.on', context), 'function');
	assert.equal(context.window.formBridge, undefined);
	const handler = register();
	assert.equal(context.mockFormBridge.fn, undefined);
	assert.deepEqual(calls, []);
	assert.equal(registrations.length, 1);
	assert.equal(registrations[0].eventName, 'form.field.change.raw');
	show();
	const event = Object.freeze({
		value: '０３ ３１２３ ４５６７',
		record: { raw: { value: 'old input' }, saved: { value: 'old saved' } },
	});
	const original = JSON.stringify(event);
	handler(event);
	assert.deepEqual(calls, [
		['error', 'raw', null],
		['value', 'saved', context.formatPhoneNumber(event.value).formattedNumber],
	]);
	assert.equal(JSON.stringify(event), original);
	assert.equal(context.window.formBridge, undefined);
});

test('four types accept formatter flags and reject mismatches with existing default messages', () => {
	const cases = [
		['callCapable', '08012345678', '02012345678', '通話可能な電話番号を入力してください。'],
		['faxCapable', '0331234567', '05012345678', 'FAX可能な電話番号を入力してください。'],
		[
			'homeLine',
			'0331234567',
			'08012345678',
			'携帯電話以外の通話可能な電話番号を入力してください。',
		],
		['mobile', '08012345678', '0331234567', '携帯電話番号を入力してください。'],
	];
	for (const [type, valid, mismatch, message] of cases) {
		const { context, calls, register, show } = createEnvironment();
		const handler = register({ type });
		show();
		handler({ value: valid });
		const result = context.formatPhoneNumber(valid);
		assert.equal(result[type], true);
		assert.equal(Object.hasOwn(result, 'error'), false, 'formatter has no error return contract');
		assert.deepEqual(calls, [
			['error', 'raw', null],
			['value', 'saved', result.formattedNumber],
		]);
		assert.equal(context.formatPhoneNumber(mismatch)[type], false);
		handler({ value: mismatch });
		assert.deepEqual(calls.slice(-3), [
			['error', 'raw', null],
			['value', 'saved', ''],
			['error', 'raw', message],
		]);
		context.kintone = {
			events: {
				on(_events, kintoneHandler) {
					const event = { record: { phone: { value: mismatch } } };
					kintoneHandler(event);
					assert.equal(event.record.phone.error, message);
				},
			},
		};
		context.registerPhoneNumberHandler('phone', { type });
		handler({ value: valid });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', result.formattedNumber],
		]);
	}
});

test('formatter exceptions retain their message, distinct from custom type mismatch messages', () => {
	const { context, calls, register, show } = createEnvironment();
	const custom = '通話可能な電話番号として利用できない番号です。';
	const handler = register({ type: 'callCapable', typeErrorMessage: custom });
	show();
	for (const value of ['invalid', '0801322983', '   ', '+81-3-1234-5678']) {
		let formatterError;
		assert.throws(
			() => context.formatPhoneNumber(value),
			(error) => {
				formatterError = error.message;
				return true;
			}
		);
		handler({ value });
		assert.deepEqual(calls.slice(-3), [
			['error', 'raw', null],
			['value', 'saved', ''],
			['error', 'raw', formatterError],
		]);
		assert.notEqual(formatterError, custom);
	}
	handler({ value: '02012345678' });
	assert.deepEqual(calls.slice(-2), [
		['value', 'saved', ''],
		['error', 'raw', custom],
	]);
	handler({ value: '08012345678' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'raw', null],
		['value', 'saved', '080-1234-5678'],
	]);
});

test('empty values clear saved value and errors; non-string values are explicit field errors', () => {
	const { calls, register, show } = createEnvironment();
	const handler = register();
	show();
	for (const value of [null, undefined, '']) {
		handler({ value });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', ''],
		]);
	}
	for (const value of [0, false, true, 8031234567, NaN, [], ['08012345678'], {}, Symbol(), 1n]) {
		handler({ value });
		assert.deepEqual(calls.slice(-3), [
			['error', 'raw', null],
			['value', 'saved', ''],
			['error', 'raw', '電話番号は文字列で入力してください。'],
		]);
	}
});

test('invalid registration arguments and options fail before event registration', () => {
	const { context, registrations } = createEnvironment();
	const register = context.registerFormBridgePhoneNumberHandler;
	for (const field of [undefined, null, '', '  ', 0, false, [], {}]) {
		assert.throws(() => register(field, 'saved', { type: 'mobile' }), /inputFieldCode/);
		assert.throws(() => register('raw', field, { type: 'mobile' }), /savedFieldCode/);
	}
	assert.throws(() => register('same', 'same', { type: 'mobile' }), /異なるコード/);
	for (const options of [null, [], '', false, 1]) {
		assert.throws(() => register('raw', 'saved', options), /options/);
	}
	for (const type of [undefined, null, '', 'landline', 'toString', ['mobile'], {}, false]) {
		assert.throws(() => register('raw', 'saved', { type }), /type/);
	}
	for (const typeErrorMessage of [null, '', '  ', 0, false, [], {}]) {
		assert.throws(
			() => register('raw', 'saved', { type: 'mobile', typeErrorMessage }),
			/typeErrorMessage/
		);
	}
	assert.throws(() => register('raw', 'saved'), /type/);
	assert.throws(
		() => register('raw', 'saved', { type: 'mobile', clearSavedFieldOnEmpty: false }),
		/options/
	);
	assert.equal(registrations.length, 0);
});

test('dependencies are checked only at registration and malformed events fail explicitly', () => {
	const { context, register, calls, registrations } = createEnvironment({ withBase: false });
	assert.throws(() => register(), /formBridgeCustomLib v1.0.1/);
	for (const base of [{}, { setFieldValue() {} }, { setFieldError() {} }]) {
		context.formBridgeCustomLib = base;
		assert.throws(() => register(), /formBridgeCustomLib/);
	}
	assert.equal(registrations.length, 0);
	const ready = createEnvironment();
	for (const api of [undefined, null, {}, { events: {} }, { events: { on: true } }]) {
		const isolated = vm.createContext({ window: {}, formBridge: api });
		vm.runInContext(source, isolated);
		assert.throws(
			() =>
				isolated.window.registerFormBridgePhoneNumberHandler('raw', 'saved', { type: 'mobile' }),
			/formBridge.events.on/
		);
	}
	const handler = ready.register();
	ready.show();
	for (const event of [null, undefined, {}, false, { record: { raw: { value: '08012345678' } } }]) {
		assert.throws(() => handler(event), /value/);
	}
	assert.deepEqual(calls, []);
	assert.deepEqual(ready.calls, []);
});

test('API failures propagate unchanged on all paths without phone error fallbacks', () => {
	for (const value of ['08012345678', '', 'invalid', '02012345678', false]) {
		for (const failAt of [1, 2, 3]) {
			const { calls, register, show } = createEnvironment();
			const handler = register();
			const failure = new Error('API failure');
			let count = 0;
			const setter = (kind) => (field, nextValue) => {
				calls.push([kind, field, nextValue]);
				if (++count === failAt) throw failure;
			};
			show({ setFieldValue: setter('value'), setFieldValueError: setter('error') });
			const expectedCalls = ['08012345678', ''].includes(value) ? 2 : 3;
			if (failAt <= expectedCalls) {
				assert.throws(
					() => handler({ value }),
					(error) => error === failure
				);
				assert.equal(calls.length, failAt);
			}
		}
	}
	const { register } = createEnvironment();
	assert.throws(() => register()({ value: '08012345678' }), /formBridge.fn.setFieldValueError/);
});

test('705 examples register independently and coexist with text-suite and export aggregator', () => {
	const { context, registrations, calls, show } = createEnvironment();
	vm.runInContext(readSource('text-suite.js'), context);
	vm.runInContext(readSource('all-window-exports.js'), context);
	for (const prefix of ['Contact', 'Shipping']) {
		context.registerFormBridgePhoneNumberHandler(
			`${prefix}_phone_number_input`,
			`${prefix}_phone_number`,
			{
				type: 'callCapable',
				typeErrorMessage: '通話可能な電話番号として利用できない番号です。',
			}
		);
	}
	show();
	for (const [index, prefix] of ['Contact', 'Shipping'].entries()) {
		assert.equal(registrations[index].eventName, `form.field.change.${prefix}_phone_number_input`);
		registrations[index].handler({ value: '08012345678' });
		assert.deepEqual(calls.slice(-2), [
			['error', `${prefix}_phone_number_input`, null],
			['value', `${prefix}_phone_number`, '080-1234-5678'],
		]);
	}
});
