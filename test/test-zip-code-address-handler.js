const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
	registerZipCodeAddressHandler,
	getAddressByZipCode,
} = require('../src/zip-code-address-utils');

const clone = (value) => {
	if (Array.isArray(value)) return value.map(clone);
	if (value && typeof value === 'object')
		return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
	return value;
};
const deferred = () => {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return { promise, resolve };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));
const address = (overrides = {}) => ({
	zip_code: '1234567',
	pref_name: '東京都',
	city_name: '千代田区',
	town_name: '千代田',
	block_name: '1-1',
	...overrides,
});
const response = (row) => ({
	ok: true,
	status: 200,
	json: async () => ({ addresses: [row] }),
});

class Element {
	constructor() {
		this.style = {};
		this.children = [];
		this.listeners = {};
		this.disabled = false;
	}
	appendChild(child) {
		child.parentNode = this;
		this.children.push(child);
	}
	remove() {
		if (this.parentNode)
			this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
		this.parentNode = null;
	}
	addEventListener(name, callback) {
		this.listeners[name] = callback;
	}
	click() {
		if (!this.disabled) this.listeners.click();
	}
}

function setup(extra = {}, mobile = false) {
	let record = {
		Zip: { value: '１２３－４５６７' },
		Address: { value: '既存住所' },
		Other: { value: '既存建物' },
		Biz: { value: '既存事業所' },
		Related: { value: '既存関連' },
		Status: { value: '処理中' },
	};
	const spaces = { Button: new Element(), Guidance: new Element() };
	let handler;
	let names;
	let insideEvent = false;
	let writes = 0;
	const namespace = {
		get: () => {
			assert.strictEqual(insideEvent, false, 'record.get cannot run inside a Kintone event');
			return { record: clone(record) };
		},
		set: (value) => {
			assert.strictEqual(insideEvent, false, 'record.set cannot run inside a Kintone event');
			record = clone(value.record);
			writes++;
		},
		getSpaceElement: (code) => spaces[code],
	};
	global.document = { createElement: () => new Element() };
	global.kintone = {
		events: {
			on: (eventNames, callback) => {
				names = eventNames;
				handler = callback;
			},
			off: (eventNames, callback) => {
				assert.deepStrictEqual(eventNames, names);
				assert.strictEqual(callback, handler);
				handler = null;
			},
		},
		app: {
			record: mobile
				? {
						get: () => {
							throw new Error('Wrong device');
						},
					}
				: namespace,
		},
		mobile: { app: { record: namespace } },
	};
	let requests = 0;
	let row = address();
	global.fetch = async () => {
		requests++;
		return response(row);
	};
	const zipErrors = {};
	const addressErrors = {};
	const controller = registerZipCodeAddressHandler({
		zipCodeField: 'Zip',
		mainAddressField: 'Address',
		addressFields: { address: 'Address', otherName: 'Other', bizName: 'Biz' },
		clearFields: ['Related'],
		devices: mobile ? 'mobile' : 'desktop',
		watchFields: ['Status'],
		zipErrorMessages: zipErrors,
		addressErrorMessages: addressErrors,
		canApply: ({ record }) => record.Status.value === '処理中',
		button: { spaceField: 'Button', id: 'zip-button' },
		guidance: { spaceField: 'Guidance', id: 'zip-guide' },
		...extra,
	});
	const dispatch = (suffix) => {
		const event = { type: `${mobile ? 'mobile.' : ''}app.record.${suffix}`, record: clone(record) };
		assert.ok(names.includes(event.type), event.type);
		insideEvent = true;
		let returned;
		try {
			returned = handler(event);
		} finally {
			insideEvent = false;
		}
		assert.strictEqual(returned, event);
		assert.ok(!(returned instanceof Promise));
		record = clone(event.record);
	};
	return {
		controller,
		spaces,
		zipErrors,
		addressErrors,
		dispatch,
		names,
		get record() {
			return record;
		},
		get requests() {
			return requests;
		},
		get writes() {
			return writes;
		},
		setRow: (value) => {
			row = value;
		},
	};
}

(async () => {
	const original = {
		kintone: global.kintone,
		document: global.document,
		fetch: global.fetch,
		error: console.error,
	};
	const logged = [];
	const watchdog = setTimeout(() => {
		original.error('FAIL: ZIP handler tests timed out before Promise completion');
		process.exitCode = 1;
	}, 5000);
	console.error = (...args) => logged.push(args);
	try {
		let env = setup();
		env.dispatch('create.show');
		assert.strictEqual(env.requests, 0);
		assert.strictEqual(env.writes, 0);
		assert.strictEqual(env.spaces.Button.children.length, 1);
		assert.ok(env.spaces.Guidance.children[0].textContent.includes('\n'));
		assert.ok(!env.names.some((name) => name.includes('submit') || name.includes('detail')));
		env.dispatch('create.change.Zip');
		assert.strictEqual((await env.controller.whenIdle()).status, 'formatted');
		assert.strictEqual(env.record.Zip.value, '123-4567');
		assert.strictEqual(env.record.Address.value, '既存住所');
		assert.strictEqual(env.record.Related.value, '既存関連');
		console.log('PASS: show does not search; ordinary ZIP formats without overwriting');

		env = setup();
		env.record.Address.value = '';
		env.dispatch('edit.show');
		env.dispatch('edit.change.Zip');
		assert.strictEqual((await env.controller.whenIdle()).status, 'applied');
		assert.strictEqual(env.record.Address.value, '東京都千代田区千代田1-1');
		assert.strictEqual(env.record.Other.value, '既存建物');
		assert.strictEqual(env.record.Related.value, '既存関連');
		console.log('PASS: ordinary ZIP fills an empty main address only');

		for (const type of ['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT']) {
			for (const source of ['change', 'digital', 'button']) {
				env = setup();
				env.record.Zip.value = source === 'digital' ? 'A1B2C3D' : '2300052';
				for (const code of ['Address', 'Other', 'Biz', 'Related'])
					env.record[code] = { type, value: undefined };
				env.setRow(address({ zip_code: '2300052', other_name: '建物名', biz_name: '事業所名' }));
				env.dispatch('edit.show');
				assert.strictEqual(env.record.Address.value, undefined);
				assert.strictEqual(env.requests, 0);
				let outcome;
				if (source === 'button') outcome = await env.controller.apply();
				else {
					env.dispatch('edit.change.Zip');
					outcome = await env.controller.whenIdle();
				}
				assert.strictEqual(outcome.status, 'applied');
				assert.strictEqual(env.record.Zip.value, '230-0052');
				assert.strictEqual(env.record.Address.value, '東京都千代田区千代田1-1');
				assert.strictEqual(env.record.Other.value, '建物名');
				assert.strictEqual(env.record.Biz.value, '事業所名');
				assert.strictEqual(env.record.Related.value, source === 'change' ? undefined : '');
				assert.strictEqual(env.zipErrors.Zip, null);
				assert.strictEqual(env.addressErrors.Address, null);
			}
		}
		console.log('PASS: undefined text fields allow normal, digital and button address assignment');

		env = setup();
		env.dispatch('edit.show');
		const emptyFieldsGate = deferred();
		global.fetch = () => emptyFieldsGate.promise;
		env.dispatch('edit.change.Zip');
		const emptyFieldsTask = env.controller.whenIdle();
		await tick();
		for (const code of ['Address', 'Other', 'Biz'])
			env.record[code] = { type: 'SINGLE_LINE_TEXT', value: undefined };
		emptyFieldsGate.resolve(response(address()));
		assert.strictEqual((await emptyFieldsTask).status, 'applied');
		assert.strictEqual(env.record.Address.value, '東京都千代田区千代田1-1');
		assert.strictEqual(env.record.Other.value, undefined);
		assert.strictEqual(env.record.Biz.value, undefined);
		console.log('PASS: undefined fields in the latest record after search are accepted');

		env = setup();
		for (const code of ['Other', 'Biz', 'Related'])
			env.record[code] = { type: 'SINGLE_LINE_TEXT', value: undefined };
		env.dispatch('edit.show');
		env.dispatch('edit.change.Zip');
		assert.strictEqual((await env.controller.whenIdle()).status, 'formatted');
		assert.strictEqual(env.record.Address.value, '既存住所');
		for (const code of ['Other', 'Biz', 'Related'])
			assert.strictEqual(env.record[code].value, undefined);
		console.log('PASS: existing main address and undefined related fields remain unchanged');

		env = setup();
		for (const code of ['Address', 'Other', 'Biz', 'Related'])
			env.record[code] = { type: 'SINGLE_LINE_TEXT', value: undefined };
		env.setRow(address({ city_name: undefined }));
		env.dispatch('edit.show');
		assert.strictEqual((await env.controller.apply()).status, 'error');
		for (const code of ['Address', 'Other', 'Biz', 'Related'])
			assert.strictEqual(env.record[code].value, undefined);
		assert.strictEqual(env.record.Zip.value, '１２３－４５６７');
		assert.ok(env.zipErrors.Zip);
		console.log('PASS: failed search does not normalize undefined record values');

		env = setup();
		env.record.Zip.value = 'Ａ１Ｂ－２Ｃ３Ｄ';
		env.setRow(address({ other_name: '新建物' }));
		env.dispatch('create.show');
		env.dispatch('create.change.Zip');
		assert.strictEqual((await env.controller.whenIdle()).status, 'applied');
		assert.strictEqual(env.record.Address.value, '東京都千代田区千代田1-1');
		assert.strictEqual(env.record.Other.value, '新建物');
		assert.strictEqual(env.record.Biz.value, '');
		assert.strictEqual(env.record.Related.value, '');
		assert.strictEqual(env.zipErrors.Zip, null);
		console.log('PASS: digital address replaces all targets; missing optional values clear');

		env = setup();
		env.record.Zip.value = '7654321';
		env.dispatch('edit.show');
		env.dispatch('edit.change.Zip');
		assert.strictEqual((await env.controller.whenIdle()).status, 'applied');
		assert.strictEqual(env.record.Related.value, '');
		console.log('PASS: digital classification uses result mismatch, not alphabetic input');

		env = setup();
		env.dispatch('edit.show');
		assert.strictEqual((await env.controller.apply()).status, 'applied');
		assert.strictEqual(env.record.Other.value, '');
		assert.strictEqual(env.record.Biz.value, '');
		assert.strictEqual(env.record.Related.value, '');
		console.log('PASS: explicit button replaces an existing address');

		for (const row of [
			address({ zip_code: '123' }),
			address({ zip_code: null }),
			address({ pref_name: undefined }),
			address({ pref_name: '' }),
			address({ city_name: 123 }),
			address({ town_name: undefined }),
			address({ other_name: 123 }),
		]) {
			env = setup();
			env.setRow(row);
			env.dispatch('create.show');
			const values = Object.fromEntries(Object.entries(env.record).map(([k, f]) => [k, f.value]));
			assert.strictEqual((await env.controller.apply()).status, 'error');
			assert.deepStrictEqual(
				Object.fromEntries(Object.entries(env.record).map(([k, f]) => [k, f.value])),
				values
			);
			assert.ok(env.zipErrors.Zip);
			assert.strictEqual(env.record.Zip.error, env.zipErrors.Zip);
			assert.strictEqual(env.spaces.Button.children[0].disabled, false);
		}
		env = setup();
		env.setRow(address({ town_name: '' }));
		env.dispatch('create.show');
		assert.strictEqual((await env.controller.apply()).status, 'applied');
		console.log('PASS: invalid required/optional types leave values intact; empty town is valid');

		env = setup();
		env.dispatch('create.show');
		let call = 0;
		global.fetch = async () =>
			++call === 1 ? response(address()) : { ok: false, status: 404, json: async () => null };
		assert.strictEqual((await env.controller.apply()).status, 'error');
		assert.strictEqual(env.record.Zip.value, '１２３－４５６７');
		assert.strictEqual(env.record.Address.value, '既存住所');
		console.log('PASS: downstream ZIP formatting failure is not a success-shaped result');

		const browser = vm.createContext({ window: {}, console, setTimeout });
		vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/text-suite.js'), 'utf8'), browser);
		const { toFullWidth } = browser.window;
		env = setup({ transformAddress: (value) => toFullWidth(value, true) });
		env.setRow(address({ other_name: 'Building 1' }));
		env.dispatch('create.show');
		assert.strictEqual((await env.controller.apply()).status, 'applied');
		assert.strictEqual(env.record.Other.value, 'Ｂｕｉｌｄｉｎｇ１');
		console.log('PASS: existing full-width helper can transform mapped address values');

		env = setup({
			transformAddress: (value, { fieldCode }) => {
				if (fieldCode === 'Other') throw new Error('全角変換失敗');
				return value;
			},
		});
		env.setRow(address({ other_name: 'building' }));
		env.dispatch('create.show');
		assert.strictEqual((await env.controller.apply()).status, 'error');
		assert.strictEqual(env.record.Address.value, '既存住所');
		assert.strictEqual(env.record.Zip.value, '１２３－４５６７');
		assert.strictEqual(env.addressErrors.Other, '全角変換失敗');
		assert.strictEqual(env.record.Other.error, '全角変換失敗');
		assert.strictEqual(env.zipErrors.Zip, undefined);
		console.log('PASS: conversion errors target the address map without partial writes');

		env = setup();
		env.dispatch('create.show');
		const old = deferred();
		global.fetch = () => old.promise;
		env.dispatch('create.change.Zip');
		const oldTask = env.controller.whenIdle();
		await tick();
		env.record.Zip.value = '7654321';
		global.fetch = async () => response(address({ zip_code: '7654321', town_name: '新町' }));
		env.record.Address.value = '';
		env.dispatch('create.change.Zip');
		await env.controller.whenIdle();
		old.resolve(response(address()));
		assert.strictEqual((await oldTask).status, 'stale');
		assert.strictEqual(env.record.Zip.value, '765-4321');
		assert.ok(env.record.Address.value.includes('新町'));
		console.log('PASS: late search results cannot overwrite newer ZIP input');

		env = setup();
		env.record.Zip.value = '123-4567';
		env.record.Address.value = '';
		env.dispatch('create.show');
		const firstA = deferred();
		global.fetch = () => firstA.promise;
		env.dispatch('create.change.Zip');
		const firstATask = env.controller.whenIdle();
		await tick();
		env.record.Zip.value = '7654321';
		env.dispatch('create.change.Zip');
		env.record.Zip.value = '123-4567';
		global.fetch = async () => response(address({ town_name: '最新住所' }));
		env.dispatch('create.change.Zip');
		await env.controller.whenIdle();
		firstA.resolve(response(address()));
		assert.strictEqual((await firstATask).status, 'stale');
		assert.ok(env.record.Address.value.includes('最新住所'));
		console.log('PASS: A-to-B-to-A input cannot revive the first A result');

		for (const change of ['address', 'condition', 'empty', 'show', 'dispose', 'error']) {
			env = setup();
			env.record.Address.value = '';
			env.dispatch('create.show');
			const gate = deferred();
			global.fetch = () => gate.promise;
			env.dispatch('create.change.Zip');
			const task = env.controller.whenIdle();
			await tick();
			if (change === 'address') env.record.Address.value = '手入力';
			if (change === 'condition') env.record.Status.value = '完了';
			if (change === 'empty') {
				env.record.Zip.value = '';
				env.dispatch('create.change.Zip');
				await env.controller.whenIdle();
			}
			if (change === 'show') env.dispatch('edit.show');
			if (change === 'dispose') env.controller.dispose();
			if (change === 'error') env.record.Zip.value = '7654321';
			gate.resolve(
				change === 'error' ? response(address({ zip_code: null })) : response(address())
			);
			const outcome = await task;
			if (change === 'address') {
				assert.strictEqual(outcome.status, 'formatted');
				assert.strictEqual(env.record.Address.value, '手入力');
			} else {
				assert.ok(['stale', 'skipped'].includes(outcome.status));
				assert.strictEqual(env.record.Address.value, '');
				assert.ok(!env.zipErrors.Zip);
			}
		}
		console.log(
			'PASS: current address, eligibility, cleared ZIP, new screen and disposal are respected'
		);

		env = setup({
			canApply: () => true,
			button: {
				spaceField: 'Button',
				id: 'zip-button',
				visible: ({ record }) => record.Status.value === '処理中',
			},
		});
		env.dispatch('edit.show');
		const conditionGate = deferred();
		global.fetch = () => conditionGate.promise;
		const conditionTask = env.controller.apply();
		await tick();
		env.record.Status.value = '完了';
		conditionGate.resolve(response(address()));
		assert.strictEqual((await conditionTask).status, 'skipped');
		assert.strictEqual(env.record.Address.value, '既存住所');
		console.log('PASS: button eligibility is rechecked when a result arrives');

		const followup = deferred();
		const hookStarted = deferred();
		let hookContext;
		env = setup({
			afterApply: async (context) => {
				hookContext = context;
				hookStarted.resolve();
				await followup.promise;
			},
		});
		env.dispatch('edit.show');
		const btn = env.spaces.Button.children[0];
		btn.click();
		const operation = env.controller.whenIdle();
		assert.strictEqual(env.controller.apply(), operation);
		assert.strictEqual(btn.disabled, true);
		await hookStarted.promise;
		assert.ok(hookContext);
		assert.strictEqual(hookContext.isCurrent(), true);
		assert.strictEqual(env.record.Address.value, '東京都千代田区千代田1-1');
		let completed = false;
		operation.then(() => {
			completed = true;
		});
		await tick();
		assert.strictEqual(completed, false);
		const count = env.requests;
		btn.click();
		assert.strictEqual(env.requests, count);
		followup.resolve();
		assert.strictEqual((await operation).status, 'applied');
		assert.strictEqual(btn.disabled, false);
		console.log('PASS: click waits for search/apply/followup and prevents duplicate clicks');

		const oldHook = deferred();
		const oldHookStarted = deferred();
		let current;
		env = setup({
			afterApply: async ({ source, isCurrent }) => {
				if (source === 'button') {
					oldHookStarted.resolve();
					await oldHook.promise;
					current = isCurrent();
				}
			},
		});
		env.dispatch('edit.show');
		const originalButtonTask = env.controller.apply();
		await oldHookStarted.promise;
		env.record.Zip.value = '7654321';
		env.dispatch('edit.change.Zip');
		const idle = env.controller.whenIdle();
		assert.strictEqual(env.controller.apply(), originalButtonTask);
		let idleDone = false;
		idle.then(() => {
			idleDone = true;
		});
		await tick();
		assert.strictEqual(idleDone, false);
		oldHook.resolve();
		await idle;
		assert.strictEqual(current, false);
		assert.strictEqual(env.spaces.Button.children[0].disabled, false);
		console.log('PASS: whenIdle also waits for an older button hook; isCurrent invalidates it');

		env = setup({
			afterApply: async () => {
				throw new Error('地区判定失敗');
			},
		});
		env.dispatch('edit.show');
		env.spaces.Button.children[0].click();
		assert.strictEqual((await env.controller.whenIdle()).status, 'error');
		assert.strictEqual(env.addressErrors.Address, '地区判定失敗');
		assert.strictEqual(env.spaces.Button.children[0].disabled, false);
		env.record.Status.value = '完了';
		assert.strictEqual((await env.controller.apply()).status, 'skipped');
		assert.strictEqual(env.spaces.Button.children[0].disabled, false);
		console.log('PASS: rejected followup is consumed, recorded and button recovers');

		env = setup();
		env.dispatch('create.show');
		global.fetch = async () => {
			throw new Error('offline');
		};
		env.spaces.Button.children[0].click();
		assert.strictEqual((await env.controller.whenIdle()).status, 'error');
		assert.ok(env.zipErrors.Zip.includes('offline'));
		assert.strictEqual(env.spaces.Button.children[0].disabled, false);
		env.setRow(address());
		global.fetch = async () => response(address());
		assert.strictEqual((await env.controller.apply()).status, 'applied');
		assert.strictEqual(env.zipErrors.Zip, null);
		console.log('PASS: network failure recovers and retry clears ZIP errors');

		let failRender = false;
		env = setup({
			guidance: {
				spaceField: 'Guidance',
				id: 'zip-guide',
				visible: () => {
					if (failRender) throw new Error('案内条件失敗');
					return true;
				},
			},
		});
		env.dispatch('edit.show');
		failRender = true;
		assert.strictEqual((await env.controller.apply()).status, 'error');
		assert.strictEqual(env.spaces.Button.children[0].disabled, false);
		console.log('PASS: even failing display conditions cannot leave a button disabled');

		env = setup(
			{
				button: {
					spaceField: 'Button',
					id: 'zip-button',
					visible: ({ record }) => record.Status.value === '処理中',
				},
				guidance: {
					spaceField: 'Guidance',
					id: 'zip-guide',
					text: '<img src=x onerror=alert(1)>\n案内',
					visible: ({ record }) => record.Status.value === '処理中',
				},
			},
			true
		);
		env.dispatch('edit.show');
		assert.strictEqual(
			env.spaces.Guidance.children[0].textContent,
			'<img src=x onerror=alert(1)>\n案内'
		);
		assert.strictEqual(env.spaces.Guidance.children[0].innerHTML, undefined);
		env.record.Status.value = '完了';
		env.dispatch('edit.change.Status');
		assert.strictEqual(env.spaces.Button.children.length, 0);
		assert.strictEqual(env.spaces.Guidance.children.length, 0);
		assert.strictEqual(env.requests, 0);
		env.record.Status.value = '処理中';
		env.dispatch('edit.change.Status');
		assert.strictEqual((await env.controller.apply()).status, 'applied');
		env.controller.dispose();
		assert.strictEqual(env.spaces.Button.children.length, 0);
		console.log('PASS: mobile, watched visibility, safe text rendering and disposal');

		assert.throws(() => setup({ addressFields: { address: 'Address', typo: 'Other' } }));
		assert.throws(() => setup({ clearFields: ['Zip'] }));
		assert.throws(() => setup({ zipErrorMessages: null }));
		assert.throws(() => setup({ addressFields: { address: 'Other' } }));
		env = setup();
		env.dispatch('edit.show');
		env.record.Other.value = null;
		assert.strictEqual((await env.controller.apply()).status, 'error');
		assert.strictEqual(env.record.Address.value, '既存住所');
		assert.ok(env.addressErrors.Other);
		assert.strictEqual(env.record.Other.error, env.addressErrors.Other);
		assert.strictEqual(env.zipErrors.Zip, undefined);
		console.log('PASS: configuration and record field types are validated explicitly');

		for (const code of ['Address', 'Other', 'Biz', 'Related']) {
			for (const invalid of [
				undefined,
				{ type: 'SINGLE_LINE_TEXT', value: null },
				{ type: 'SINGLE_LINE_TEXT', value: 123 },
				{ type: 'SINGLE_LINE_TEXT', value: false },
				{ type: 'SINGLE_LINE_TEXT', value: [] },
				{ type: 'SINGLE_LINE_TEXT', value: {} },
				{ type: 'NUMBER', value: undefined },
				{ value: undefined },
			]) {
				env = setup();
				if (invalid === undefined) delete env.record[code];
				else env.record[code] = invalid;
				env.dispatch('edit.show');
				assert.strictEqual((await env.controller.apply()).status, 'error');
				assert.ok(env.addressErrors[code]);
				if (env.record[code]) assert.strictEqual(env.record[code].error, env.addressErrors[code]);
				assert.strictEqual(env.record.Zip.value, '１２３－４５６７');
				assert.strictEqual(env.requests, 0);
				assert.strictEqual(env.spaces.Button.children[0].disabled, false);
			}
		}
		console.log('PASS: missing fields and invalid non-empty/non-text values still fail');

		// The legacy search callback remains available without registration.
		delete global.kintone;
		global.fetch = async () => response(address());
		const result = await new Promise((resolve) => getAddressByZipCode('1234567', resolve));
		assert.strictEqual(result.apiZipCode, '1234567');
		vm.runInContext(
			fs.readFileSync(path.join(__dirname, '../src/zip-code-address-utils.js'), 'utf8'),
			browser
		);
		vm.runInContext(
			fs.readFileSync(path.join(__dirname, '../src/all-window-exports.js'), 'utf8'),
			browser
		);
		for (const name of [
			'registerZipCodeAddressHandler',
			'getAddressByZipCode',
			'kintoneZipSetSpaceFieldButton',
			'kintoneZipSpaceFieldText',
		])
			assert.strictEqual(typeof browser.window[name], 'function');
		assert.ok(logged.length > 0);
		console.log('PASS: legacy search API is preserved and failures are logged');
	} finally {
		clearTimeout(watchdog);
		console.error = original.error;
		for (const key of ['kintone', 'document', 'fetch']) {
			if (original[key] === undefined) delete global[key];
			else global[key] = original[key];
		}
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
