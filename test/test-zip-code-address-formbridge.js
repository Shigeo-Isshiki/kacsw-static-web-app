'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = (name) => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));
const tick = () => new Promise((resolve) => setImmediate(resolve));
const row = (overrides = {}) => ({
	zip_code: '1234567',
	pref_name: '東京都',
	city_name: '千代田区',
	town_name: '千代田',
	block_name: '1-1',
	other_name: '建物101',
	...overrides,
});
const response = (value = row()) => ({
	ok: true,
	status: 200,
	json: async () => ({ addresses: [value] }),
});
const optionsFor = (prefix = '') => ({
	zipCodeInputField: prefix + 'zip',
	zipCodeSavedField: prefix + 'savedZip',
	mainAddressField: prefix + 'address',
	addressFields: { address: prefix + 'address', otherName: prefix + 'other' },
	fieldMappings: {
		[prefix + 'address']: prefix + 'savedAddress',
		[prefix + 'other']: prefix + 'savedOther',
		[prefix + 'extra']: prefix + 'savedExtra',
	},
	clearFields: [prefix + 'extra'],
});
const initialRecord = (prefix = '') =>
	Object.fromEntries(
		[
			'zip',
			'savedZip',
			'address',
			'savedAddress',
			'other',
			'savedOther',
			'extra',
			'savedExtra',
		].map((code) => [prefix + code, { value: '' }])
	);

function setup({ base = true, lexical = true, options = {}, prefix = '' } = {}) {
	const handlers = new Map();
	const calls = [];
	const errors = [];
	const requests = [];
	const record = initialRecord(prefix);
	const context = vm.createContext({
		console: { error: (...args) => errors.push(args), warn: (...args) => errors.push(args) },
		setTimeout,
		mockFormBridge: {
			events: {
				on(name, handler) {
					if (!handlers.has(name)) handlers.set(name, []);
					handlers.get(name).push(handler);
				},
			},
		},
		fetch(url) {
			return new Promise((resolve, reject) => requests.push({ url, resolve, reject }));
		},
	});
	context.window = context;
	if (lexical) vm.runInContext('const formBridge = mockFormBridge;', context);
	else context.formBridge = context.mockFormBridge;
	if (base) vm.runInContext(source('formbridge-custom-lib.js'), context);
	vm.runInContext(source('zip-code-address-utils.js'), context);
	const register = (overrides = {}, p = prefix) =>
		context.registerFormBridgeZipCodeAddressHandler({ ...optionsFor(p), ...options, ...overrides });
	const dispatch = (name, event = {}) => {
		for (const handler of handlers.get(name) || []) {
			assert.equal(handler(event), undefined, 'FormBridge handler must return synchronously');
		}
	};
	const show = () => {
		context.mockFormBridge.fn = {
			getRecord() {
				calls.push(['get']);
				return clone(record);
			},
			setFieldValue(code, value) {
				assert.ok(Object.hasOwn(record, code), code);
				calls.push(['value', code, value]);
				record[code].value = value;
				// Deliberately do not dispatch a change event.
			},
			setFieldValueError(code, message) {
				calls.push(['error', code, message]);
			},
		};
		dispatch('form.show');
	};
	const change = (value, code = prefix + 'zip') => {
		// getRecord is intentionally left at its old value, even after dispatch.
		const event = Object.freeze({ value });
		dispatch(`form.field.change.${code}`, event);
	};
	return { context, handlers, calls, errors, requests, record, register, dispatch, show, change };
}

test('exports are inert; lexical const API can register before fn and resolves fn after show', async () => {
	const env = setup();
	assert.equal(env.context.formBridge, undefined);
	assert.equal(env.context.mockFormBridge.fn, undefined);
	assert.equal(env.handlers.size, 0);
	const controller = env.register();
	assert.equal(env.context.mockFormBridge.fn, undefined);
	assert.deepEqual(env.calls, []);
	assert.throws(() => env.change('1234567'), /form.show/);
	env.show();
	assert.deepEqual(env.calls, [], 'show does not search or touch record');
	env.change('１２３－４５６７');
	await tick();
	assert.match(env.requests[0].url, /search_code=1234567$/);
	env.requests[0].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.equal(env.record.zip.value, '123-4567');
	assert.equal(env.record.savedZip.value, '123-4567');
	assert.equal(env.record.address.value, '東京都千代田区千代田1-1');
	assert.equal(env.record.savedAddress.value, env.record.address.value);
	assert.equal(env.record.savedOther.value, '建物101');
	assert.equal(env.context.formBridge, undefined);
	assert.deepEqual(env.errors, []);
	assert.equal(
		typeof require('../src/zip-code-address-utils').registerFormBridgeZipCodeAddressHandler,
		'function'
	);
});

test('window API is supported and fn is resolved again for each invocation', async () => {
	const env = setup({ lexical: false });
	const controller = env.register();
	env.show();
	env.change('1234567');
	await tick();
	const values = [];
	const oldSetter = env.context.mockFormBridge.fn.setFieldValue;
	env.context.mockFormBridge.fn = {
		...env.context.mockFormBridge.fn,
		setFieldValue(code, value) {
			values.push(code);
			oldSetter(code, value);
		},
	};
	env.requests[0].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.ok(values.includes('savedAddress'));
});

test('ordinary ZIP retains existing addresses, and only fills a currently empty main address', async () => {
	const env = setup();
	const controller = env.register();
	env.show();
	env.record.address.value = '既存住所';
	env.record.savedAddress.value = '保存済住所';
	env.record.extra.value = '部屋';
	env.change('1234567');
	await tick();
	env.requests[0].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'formatted');
	assert.equal(env.record.address.value, '既存住所');
	assert.equal(env.record.savedAddress.value, '保存済住所');
	assert.equal(env.record.extra.value, '部屋');

	env.record.address.value = null;
	env.record.other.value = '既存建物';
	env.record.savedOther.value = '保存済建物';
	env.change('1234567');
	await tick();
	env.requests[1].resolve(response(row({ other_name: null })));
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.equal(env.record.other.value, '既存建物');
	assert.equal(env.record.savedOther.value, '保存済建物');
	assert.equal(env.record.extra.value, '部屋');

	env.record.address.value = '';
	env.change('1234567');
	await tick();
	env.record.address.value = '検索中の手入力';
	env.requests[2].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'formatted');
	assert.equal(env.record.address.value, '検索中の手入力');
});

test('digital mismatch replaces addresses and clears related input and saved fields', async () => {
	const env = setup();
	const controller = env.register();
	env.show();
	for (const field of Object.values(env.record)) field.value = '既存';
	env.change('Ａ１Ｂ－２Ｃ３Ｄ');
	await tick();
	env.requests[0].resolve(response(row({ other_name: null })));
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.equal(env.record.savedZip.value, '123-4567');
	assert.equal(env.record.address.value, '東京都千代田区千代田1-1');
	for (const code of ['other', 'savedOther', 'extra', 'savedExtra'])
		assert.equal(env.record[code].value, '');

	// Alphabetic input alone is not the replacement condition.
	env.record.address.value = '保持';
	env.change('A1B2C3D');
	await tick();
	env.requests[1].resolve(response(row({ zip_code: 'A1B2C3D' })));
	assert.equal((await controller.whenIdle()).status, 'formatted');
	assert.equal(env.record.address.value, '保持');
});

test('uses consumer full-width transform for lookup and manual saved-field synchronization', async () => {
	const env = setup();
	vm.runInContext(source('text-suite.js'), env.context);
	const controller = env.register({
		transformAddress: (value) => env.context.toFullWidth(value, false),
	});
	env.show();
	env.change('1234567');
	await tick();
	env.requests[0].resolve(response());
	await controller.whenIdle();
	assert.equal(env.record.address.value, env.context.toFullWidth('東京都千代田区千代田1-1', false));
	assert.equal(env.record.savedAddress.value, env.record.address.value);
	env.change('room 123', 'extra');
	assert.equal(env.record.savedExtra.value, env.context.toFullWidth('room 123', false));
	assert.equal(env.record.extra.value, '', 'manual synchronization does not rewrite the input');
	env.change(null, 'extra');
	assert.equal(env.record.savedExtra.value, '');
	assert.equal(env.requests.length, 1);
});

test('empty ZIP invalidates pending results, clears only saved ZIP and preserves addresses', async () => {
	for (const empty of ['', null, undefined, '　－ ']) {
		const env = setup();
		const controller = env.register();
		env.show();
		env.record.address.value = '保持';
		env.record.savedZip.value = 'old';
		env.change('A1B2C3D');
		await tick();
		const old = controller.whenIdle();
		env.change(empty);
		assert.equal((await controller.whenIdle()).status, 'skipped');
		env.requests[0].resolve(response());
		assert.equal((await old).status, 'stale');
		assert.equal(env.requests.length, 1);
		assert.equal(env.record.savedZip.value, '');
		assert.equal(env.record.address.value, '保持');
	}
});

test('single-field storage works without mappings; same-turn superseded searches never start', async () => {
	const env = setup();
	const controller = env.register({ zipCodeSavedField: 'zip', fieldMappings: {} });
	env.show();
	env.change('1234567');
	const first = controller.whenIdle();
	env.change('');
	assert.equal((await first).status, 'stale');
	assert.equal((await controller.whenIdle()).status, 'skipped');
	assert.equal(env.requests.length, 0);
	env.change('1234567');
	await tick();
	env.requests[0].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.equal(env.record.zip.value, '123-4567');
	assert.equal(env.record.address.value, '東京都千代田区千代田1-1');
	assert.equal(env.record.savedAddress.value, '', 'no inferred saved field code');
});

test('continuous input, out-of-order results and A-B-A cannot revive older responses', async () => {
	const env = setup();
	const controller = env.register();
	env.show();
	const pending = [];
	for (const value of ['1234567', '7654321', '1234567']) {
		env.change(value);
		await tick();
		pending.push(controller.whenIdle());
	}
	env.requests[2].resolve(response(row({ town_name: '最新' })));
	assert.equal((await pending[2]).status, 'applied');
	env.requests[1].resolve(response(row({ zip_code: '7654321', town_name: '古いB' })));
	env.requests[0].resolve(response(row({ town_name: '古いA' })));
	assert.equal((await pending[0]).status, 'stale');
	assert.equal((await pending[1]).status, 'stale');
	assert.match(env.record.address.value, /最新/);
	assert.equal(env.record.savedZip.value, '123-4567');
	assert.deepEqual(env.errors, []);
});

test('home and shipping registrations have independent generations', async () => {
	const env = setup();
	Object.assign(env.record, initialRecord('shipping'));
	const home = env.register();
	const shipping = env.register({}, 'shipping');
	env.show();
	env.change('1234567');
	env.change('7654321', 'shippingzip');
	await tick();
	env.change('');
	await home.whenIdle();
	env.requests[0].resolve(response());
	env.requests[1].resolve(response(row({ zip_code: '7654321' })));
	assert.equal((await shipping.whenIdle()).status, 'applied');
	assert.equal(env.record.address.value, '');
	assert.equal(env.record.shippingaddress.value, '東京都千代田区千代田1-1');
});

test('search and malformed result failures do not erase or partially replace values', async () => {
	const cases = [
		(request) => request.reject(new Error('offline')),
		(request) => request.resolve({ ok: false, status: 404 }),
		(request) =>
			request.resolve({
				ok: true,
				json: async () => {
					throw new Error('JSON');
				},
			}),
		(request) => request.resolve(response(row({ city_name: null }))),
		(request) => request.resolve(response(row({ other_name: 123 }))),
		(request) => request.resolve({ ok: true, json: async () => ({ addresses: [] }) }),
		(request) => request.resolve({ ok: true, json: async () => ({ addresses: [row(), row()] }) }),
	];
	for (const fail of cases) {
		const env = setup();
		const controller = env.register();
		env.show();
		for (const field of Object.values(env.record)) field.value = '既存';
		const before = clone(env.record);
		env.change('A1B2C3D');
		await tick();
		fail(env.requests[0]);
		const outcome = await controller.whenIdle();
		assert.equal(outcome.status, 'error');
		assert.ok(outcome.error);
		assert.deepEqual(env.record, before);
		assert.equal(env.errors.length, 1);
		assert.equal(env.calls.at(-1)[0], 'error');
	}
});

test('all conversion results are validated before any field writes; Promise is rejected', async () => {
	for (const convert of [
		(value, { property }) => {
			if (property === 'otherName') throw new Error('conversion');
			return value;
		},
		() => 123,
		() => '',
		() => '　',
		() => Promise.resolve('async'),
		() => Promise.reject(new Error('async failure')),
	]) {
		const env = setup();
		const controller = env.register({ transformAddress: convert });
		env.show();
		for (const field of Object.values(env.record)) field.value = '保持';
		const before = clone(env.record);
		env.change('A1B2C3D');
		await tick();
		env.requests[0].resolve(response());
		assert.equal((await controller.whenIdle()).status, 'error');
		assert.deepEqual(env.record, before);
		assert.equal(env.calls.filter(([kind]) => kind === 'value').length, 0);
	}
});

test('invalid input, missing record fields and missing fn are explicit errors', async () => {
	for (const value of [1234567, {}, false, 'bad']) {
		const env = setup();
		const controller = env.register();
		env.show();
		env.change(value);
		assert.equal((await controller.whenIdle()).status, 'error');
		assert.equal(env.requests.length, 0);
		assert.ok(env.errors.length);
	}
	for (const invalid of ['missing', 'undefined', 'number']) {
		const env = setup();
		const controller = env.register();
		env.show();
		if (invalid === 'missing') delete env.record.savedAddress;
		if (invalid === 'undefined') env.record.savedAddress = {};
		if (invalid === 'number') env.record.savedAddress.value = 123;
		env.change('1234567');
		assert.equal((await controller.whenIdle()).status, 'error');
		assert.equal(env.requests.length, 0);
	}
	const env = setup();
	const controller = env.register();
	env.show();
	delete env.context.mockFormBridge.fn;
	env.change('1234567');
	assert.equal((await controller.whenIdle()).status, 'error');
	assert.equal(env.errors.length, 2, 'original and error-display API failures are logged');
});

test('setter failure is not reported as success; API partial writes are not rolled back', async () => {
	const env = setup();
	const controller = env.register();
	env.show();
	const setter = env.context.mockFormBridge.fn.setFieldValue;
	env.context.mockFormBridge.fn.setFieldValue = (code, value) => {
		if (code === 'savedAddress') throw new Error('setter failed');
		setter(code, value);
	};
	env.change('1234567');
	await tick();
	env.requests[0].resolve(response());
	const outcome = await controller.whenIdle();
	assert.equal(outcome.status, 'error');
	assert.equal(outcome.error, 'setter failed');
	assert.ok(env.errors.length);
});

test('manual address conversion failures preserve saved values and API errors propagate', () => {
	const env = setup({
		options: {
			transformAddress: () => {
				throw new Error('conversion');
			},
		},
	});
	env.register();
	env.show();
	env.record.savedAddress.value = '保持';
	env.change('new', 'address');
	assert.equal(env.record.savedAddress.value, '保持');
	assert.deepEqual(env.calls.at(-1), ['error', 'address', 'conversion']);
	assert.throws(() => env.dispatch('form.field.change.address'), /value/);
	env.context.mockFormBridge.fn.setFieldValueError = () => {
		throw new Error('error API');
	};
	assert.throws(() => env.change('new', 'address'), /error API/);

	const setterEnv = setup();
	setterEnv.register();
	setterEnv.show();
	setterEnv.context.mockFormBridge.fn.setFieldValue = () => {
		throw new Error('value API');
	};
	assert.throws(() => setterEnv.change('new', 'address'), /value API/);
});

test('afterApply is synchronous, consumer-owned, and receives full business results', async () => {
	const env = setup();
	const received = [];
	const controller = env.register({
		afterApply: (context) => {
			assert.equal(context.isCurrent(), true);
			received.push(context);
		},
	});
	env.show();
	env.change('A1B2C3D');
	await tick();
	env.requests[0].resolve(response(row({ biz_name: '事業所', business_name: '会社' })));
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.equal(received[0].result.bizName, '事業所');
	assert.equal(received[0].result.businessName, '会社');
	assert.equal(received[0].record.savedAddress.value, env.record.address.value);
	env.change('1234567');
	assert.equal(received[0].isCurrent(), false);
	await tick();
	env.requests[1].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'formatted');
	assert.equal(received.length, 1);

	for (const afterApply of [
		() => {
			throw new Error('hook');
		},
		() => Promise.resolve(),
	]) {
		const other = setup({ options: { afterApply } });
		const control = other.register();
		other.show();
		other.change('1234567');
		await tick();
		other.requests[0].resolve(response());
		assert.equal((await control.whenIdle()).status, 'error');
		assert.notEqual(other.record.savedAddress.value, '', 'afterApply runs after writes');
	}
});

test('screen changes and dispose invalidate pending responses without further fn calls', async () => {
	for (const stop of ['form.show', 'confirm.show', 'finish.show', 'dispose']) {
		const env = setup();
		const controller = env.register();
		env.show();
		env.change('1234567');
		await tick();
		const pending = controller.whenIdle();
		if (stop === 'dispose') controller.dispose();
		else env.dispatch(stop);
		const calls = env.calls.length;
		env.requests[0].resolve(response());
		assert.equal((await pending).status, 'stale');
		assert.equal(env.calls.length, calls);
		if (stop === 'dispose') {
			env.change('7654321');
			assert.equal(env.requests.length, 1);
		}
	}
});

test('submission does not wait for lookup; no submit cancellation or retry is registered', async () => {
	const env = setup();
	const controller = env.register();
	env.show();
	env.change('1234567');
	await tick();
	const submitted = clone(env.record);
	assert.equal(submitted.savedAddress.value, '');
	assert.ok(![...env.handlers.keys()].some((name) => /submit|confirm$/.test(name)));
	env.requests[0].resolve(response());
	assert.equal((await controller.whenIdle()).status, 'applied');
	assert.notEqual(env.record.savedAddress.value, submitted.savedAddress.value);
});

test('configuration and event arguments fail explicitly before use', () => {
	const env = setup();
	const register = env.context.registerFormBridgeZipCodeAddressHandler;
	for (const options of [
		null,
		[],
		false,
		{},
		{ ...optionsFor(), unknown: true },
		{ ...optionsFor(), zipCodeInputField: '' },
		{ ...optionsFor(), addressFields: { unknown: 'address' } },
		{ ...optionsFor(), addressFields: { address: 'address', otherName: 'address' } },
		{ ...optionsFor(), mainAddressField: 'unmapped' },
		{ ...optionsFor(), fieldMappings: { address: 'address' } },
		{ ...optionsFor(), fieldMappings: { address: 'saved', other: 'saved' } },
		{ ...optionsFor(), fieldMappings: { absent: 'saved' } },
		{ ...optionsFor(), clearFields: ['zip'] },
		{ ...optionsFor(), clearFields: ['savedZip'] },
		{ ...optionsFor(), transformAddress: 'invalid' },
		{ ...optionsFor(), afterApply: false },
	])
		assert.throws(() => register(options));
	assert.equal(env.handlers.size, 0);
	env.register();
	env.show();
	assert.throws(() => env.dispatch('form.field.change.zip'), /value/);
	const missingBase = setup({ base: false });
	assert.throws(() => missingBase.register(), /formBridgeCustomLib/);
	delete env.context.mockFormBridge.events.on;
	assert.throws(() => env.register(), /formBridge.events.on/);
});

test('documented generic example updates both address pairs and clears the extra line only on replacement', async () => {
	const env = setup();
	vm.runInContext(source('text-suite.js'), env.context);
	for (const [prefix, count] of [
		['Primary', 2],
		['Secondary', 3],
	]) {
		for (const suffix of ['entry', 'value']) {
			env.record[`${prefix}_postal_${suffix}`] = { value: '' };
			for (let index = 1; index <= count; index++)
				env.record[`${prefix}_line_${index}_${suffix}`] = { value: '' };
		}
	}
	env.record.Secondary_line_3_entry.value = '既存部屋';
	env.record.Secondary_line_3_value.value = '既存部屋';
	env.record.Unrelated_entry = { value: '既存会社' };
	env.record.Unrelated_value = { value: '既存会社' };
	const doc = fs.readFileSync(
		path.join(__dirname, '..', 'docs', 'zip-code-address-utils.md'),
		'utf8'
	);
	const example = doc.split('<a id="formbridge-example"></a>')[1].match(/```js\n([\s\S]*?)```/)[1];
	vm.runInContext(example, env.context);
	env.show();
	env.change('1234567', 'Primary_postal_entry');
	env.change('7654321', 'Secondary_postal_entry');
	await tick();
	env.requests[0].resolve(response());
	env.requests[1].resolve(response(row({ zip_code: '7654321' })));
	const primary = vm.runInContext('primaryAddressHandler', env.context);
	const secondary = vm.runInContext('secondaryAddressHandler', env.context);
	assert.equal((await primary.whenIdle()).status, 'applied');
	assert.equal((await secondary.whenIdle()).status, 'applied');
	for (const prefix of ['Primary', 'Secondary']) {
		assert.equal(
			env.record[`${prefix}_line_1_value`].value,
			env.context.toFullWidth('東京都千代田区千代田1-1', false)
		);
		assert.equal(
			env.record[`${prefix}_line_1_entry`].value,
			env.record[`${prefix}_line_1_value`].value
		);
		assert.equal(
			env.record[`${prefix}_line_2_value`].value,
			env.context.toFullWidth('建物101', false)
		);
	}
	assert.equal(env.record.Secondary_line_3_value.value, '既存部屋');
	env.change('A1B2C3D', 'Secondary_postal_entry');
	await tick();
	env.requests[2].resolve(response(row({ biz_name: '検索会社', business_name: '検索事業所' })));
	assert.equal((await secondary.whenIdle()).status, 'applied');
	assert.equal(env.record.Secondary_line_3_entry.value, '');
	assert.equal(env.record.Secondary_line_3_value.value, '');
	assert.equal(env.record.Unrelated_entry.value, '既存会社');
	assert.equal(env.record.Unrelated_value.value, '既存会社');
});
