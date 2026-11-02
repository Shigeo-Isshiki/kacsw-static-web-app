'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const readSource = (name) => fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8');
const source = readSource('date-utils.js');
const baseSource = readSource('formbridge-custom-lib.js');

const createEnvironment = ({ withBase = true, windowFormBridge = false } = {}) => {
	const registrations = [];
	const calls = [];
	const unexpected = () => assert.fail('Unexpected logging or external communication');
	const mockFormBridge = {
		events: {
			on(eventName, handler) {
				registrations.push({ eventName, handler });
			},
		},
	};
	const context = vm.createContext({
		console: { log: unexpected, warn: unexpected, error: unexpected, debug: unexpected },
		fetch: unexpected,
		XMLHttpRequest: unexpected,
		mockFormBridge,
	});
	context.window = context;
	if (windowFormBridge) {
		// window.formBridge のみ存在する環境（グローバルプロパティ経由で解決される）
		context.formBridge = mockFormBridge;
	} else {
		// 直接グローバルのレキシカル束縛のみ存在する環境（window.formBridge は未定義）
		vm.runInContext('const formBridge = mockFormBridge;', context);
	}
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
	const register = (options = { type: 'date' }) => {
		context.window.DATE.registerFormBridgeDateInputHandler('raw', 'saved', options);
		return registrations.at(-1).handler;
	};
	return { context, registrations, calls, show, register };
};

test('loading is inert and preserves existing date utilities and window.DATE exposure', () => {
	const { context, calls, registrations } = createEnvironment({ withBase: false });
	assert.equal(registrations.length, 0);
	assert.deepEqual(calls, []);
	assert.equal(context.mockFormBridge.fn, undefined);
	assert.equal(typeof context.window.DATE.registerFormBridgeDateInputHandler, 'function');
	assert.equal(
		vm.runInContext('typeof registerFormBridgeDateInputHandler', context),
		'function',
		'lexical binding is available for direct calls'
	);

	// 既存の汎用日付関数は変更しない（回帰確認）
	assert.equal(context.window.DATE.convertToSeireki('令和元年5月1日'), '2019-05-01');
	assert.equal(context.window.DATE.convertToYear('R1'), 2019);
	const yearMonth = context.window.DATE.convertToYearMonth('2025-05');
	assert.equal(yearMonth.year, 2025);
	assert.equal(yearMonth.month, 5);
	assert.equal(context.window.DATE.convertToAge('1990-05-10', '2026-05-09'), 35);
	const era = context.window.DATE.convertToEra('2025-10-14');
	assert.equal(era.kanji, '令和7年');
	assert.equal(era.initial, 'R07');
	assert.equal(era.initialOnly, 'R');
	assert.equal(era.numberOnly, '07');
});

test('registration is inert, uses event.value over stale record, and keeps input unchanged', () => {
	const { context, registrations, calls, register, show } = createEnvironment();
	assert.equal(context.window.formBridge, undefined);
	const handler = register({ type: 'date' });
	assert.equal(registrations.length, 1);
	assert.equal(registrations[0].eventName, 'form.field.change.raw');
	assert.equal(context.mockFormBridge.fn, undefined);
	assert.deepEqual(calls, [], 'registration changes no values or errors');
	show();
	// レコード取得値（変更前）とイベントのvalue（変更後）が異なるケース
	const event = Object.freeze({
		value: '令和元年5月1日',
		record: Object.freeze({
			raw: Object.freeze({ value: '古い入力' }),
			saved: Object.freeze({ value: '1900-01-01' }),
		}),
	});
	const original = JSON.stringify(event);
	handler(event);
	assert.deepEqual(calls, [
		['error', 'raw', null],
		['value', 'saved', '2019-05-01'],
	]);
	assert.equal(JSON.stringify(event), original, 'event and record are not mutated');
	assert.equal(context.window.formBridge, undefined, 'no copy onto window.formBridge');
});

test('window.formBridge-only environments register and convert as before', () => {
	const { registrations, calls, register, show } = createEnvironment({ windowFormBridge: true });
	const handler = register({ type: 'yearMonth' });
	assert.equal(registrations.length, 1);
	show();
	handler({ value: 'R7-4' });
	assert.deepEqual(calls, [
		['error', 'raw', null],
		['value', 'saved', '2025年4月'],
	]);
});

test('date type saves YYYY-MM-DD for representative inputs and clears strictly to null', () => {
	const { calls, register, show } = createEnvironment();
	const handler = register({ type: 'date' });
	show();
	const cases = [
		['令和元年5月1日', '2019-05-01'],
		['H1-1-8', '1989-01-08'],
		['２０２５年１０月１４日', '2025-10-14'],
		['2026-11-02', '2026-11-02'],
		['2026/1/5', '2026-01-05'],
	];
	for (const [input, expected] of cases) {
		handler({ value: input });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', expected],
		]);
	}
	// 正常入力後の空欄化では保存値を保持せず、厳密にnullへ消去する
	for (const value of [null, undefined, '']) {
		handler({ value: '2026-11-02' });
		handler({ value });
		const [kind, field, saved] = calls.at(-1);
		assert.deepEqual([kind, field], ['value', 'saved']);
		assert.equal(saved, null);
		assert.notEqual(saved, '', 'date clear value must never be an empty string');
	}
});

test('year type saves "YYYY年" and clears strictly to empty string', () => {
	const { calls, register, show } = createEnvironment();
	const handler = register({ type: 'year' });
	show();
	const cases = [
		['2026', '2026年'],
		['令和元年', '2019年'],
		['R7', '2025年'],
		['昭和六十年', '1985年'],
		['1989-01-08', '1989年'],
	];
	for (const [input, expected] of cases) {
		handler({ value: input });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', expected],
		]);
	}
	for (const value of [null, undefined, '']) {
		handler({ value: '2026' });
		handler({ value });
		const [kind, field, saved] = calls.at(-1);
		assert.deepEqual([kind, field], ['value', 'saved']);
		assert.equal(saved, '');
		assert.notEqual(saved, null, 'year clear value must be an empty string, not null');
	}
});

test('yearMonth type saves "YYYY年M月" without zero padding and clears to empty string', () => {
	const { calls, register, show } = createEnvironment();
	const handler = register({ type: 'yearMonth' });
	show();
	const cases = [
		['2026-04', '2026年4月'],
		['2026/11', '2026年11月'],
		['令和7年5月', '2025年5月'],
		['H02-03', '1990年3月'],
		['2025', '2025年1月'],
	];
	for (const [input, expected] of cases) {
		handler({ value: input });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', expected],
		]);
		assert.doesNotMatch(expected, /年0\d/, 'month is not zero padded');
	}
	for (const value of [null, undefined, '']) {
		handler({ value: '2026-04' });
		handler({ value });
		const [kind, field, saved] = calls.at(-1);
		assert.deepEqual([kind, field], ['value', 'saved']);
		assert.equal(saved, '');
	}
});

test('conversion failures clear the saved field, show default messages, and recover', () => {
	const cases = [
		['date', null, ['2026-02-30', '13月32日', '不正な値'], '日付の形式で入力してください。'],
		['year', '', ['R', '不正な値'], '年の形式で入力してください。'],
		['yearMonth', '', ['R', '不正な値'], '年月の形式で入力してください。'],
	];
	for (const [type, clearValue, failingInputs, defaultMessage] of cases) {
		const { context, calls, register, show } = createEnvironment();
		const handler = register({ type });
		show();
		const valid = { date: '2026-11-02', year: '2026', yearMonth: '2026-04' }[type];
		const saved = { date: '2026-11-02', year: '2026年', yearMonth: '2026年4月' }[type];
		handler({ value: valid });
		assert.deepEqual(calls.at(-1), ['value', 'saved', saved]);
		// 既存変換関数が例外を投げる入力では、前回の正常値を残さず消去する
		for (const value of failingInputs) {
			let conversionError;
			assert.throws(
				() => {
					const convert = {
						date: context.window.DATE.convertToSeireki,
						year: context.window.DATE.convertToYear,
						yearMonth: context.window.DATE.convertToYearMonth,
					}[type];
					convert(value);
				},
				(error) => {
					conversionError = error.message;
					return true;
				}
			);
			handler({ value });
			assert.deepEqual(calls.slice(-3), [
				['error', 'raw', null],
				['value', 'saved', clearValue],
				['error', 'raw', conversionError],
			]);
			assert.notEqual(conversionError, defaultMessage);
		}
		// エラー後の正常入力で古いエラーが解除される
		handler({ value: valid });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', saved],
		]);
		// エラー後の空欄化でも古いエラーが解除される
		handler({ value: '不正な値' });
		handler({ value: '' });
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', clearValue],
		]);
	}
});

test('invalidMessage and exceptionMessage override defaults per registration', () => {
	const { calls, register, show } = createEnvironment();
	const handler = register({
		type: 'year',
		invalidMessage: '国家試験年の形式で入力してください。',
		exceptionMessage: '国家試験年の形式が正しくありません。',
	});
	show();
	handler({ value: 'ぜんぜん日付ではない' });
	assert.deepEqual(calls.slice(-3), [
		['error', 'raw', null],
		['value', 'saved', ''],
		['error', 'raw', '国家試験年の形式が正しくありません。'],
	]);
	handler({ value: '令和8年' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'raw', null],
		['value', 'saved', '2026年'],
	]);
});

test('non-string non-empty values are explicit type errors with type-specific clear values', () => {
	for (const [type, clearValue] of [
		['date', null],
		['year', ''],
		['yearMonth', ''],
	]) {
		const { calls, register, show } = createEnvironment();
		const handler = register({ type });
		show();
		for (const value of [0, false, true, 20261102, NaN, [], ['2026-11-02'], {}, Symbol(), 1n]) {
			handler({ value });
			assert.deepEqual(calls.slice(-3), [
				['error', 'raw', null],
				['value', 'saved', clearValue],
				['error', 'raw', '文字列で入力してください。'],
			]);
		}
	}
});

test('whitespace-only strings are not treated as empty and follow the converter result', () => {
	const { context, calls, register, show } = createEnvironment();
	const handler = register({ type: 'date' });
	show();
	let converterError;
	assert.throws(
		() => context.window.DATE.convertToSeireki('   '),
		(error) => {
			converterError = error.message;
			return true;
		}
	);
	handler({ value: '   ' });
	assert.deepEqual(calls.slice(-3), [
		['error', 'raw', null],
		['value', 'saved', null],
		['error', 'raw', converterError],
	]);
});

test('invalid registration arguments and options fail before event registration', () => {
	const { context, registrations } = createEnvironment();
	const register = (...args) => context.window.DATE.registerFormBridgeDateInputHandler(...args);
	for (const field of [undefined, null, '', '  ', 0, false, [], {}]) {
		assert.throws(() => register(field, 'saved', { type: 'date' }), /inputFieldCode/);
		assert.throws(() => register('raw', field, { type: 'date' }), /savedFieldCode/);
	}
	assert.throws(() => register('same', 'same', { type: 'date' }), /異なるコード/);
	for (const options of [null, [], '', false, 1]) {
		assert.throws(() => register('raw', 'saved', options), /options/);
	}
	for (const type of [undefined, null, '', 'DATE', 'month', 'toString', ['date'], {}, false]) {
		assert.throws(() => register('raw', 'saved', { type }), /type/);
	}
	for (const message of [null, '', '  ', 0, false, [], {}]) {
		assert.throws(
			() => register('raw', 'saved', { type: 'date', invalidMessage: message }),
			/invalidMessage/
		);
		assert.throws(
			() => register('raw', 'saved', { type: 'date', exceptionMessage: message }),
			/exceptionMessage/
		);
	}
	assert.throws(() => register('raw', 'saved'), /type/);
	assert.throws(() => register('raw', 'saved', { type: 'date', clearValue: '' }), /options/);
	assert.throws(
		() => register('raw', 'saved', { type: 'date', clearSavedFieldOnEmpty: false }),
		/options/
	);
	assert.equal(registrations.length, 0);
});

test('dependencies are checked only at registration and malformed events fail explicitly', () => {
	const { context, register, registrations } = createEnvironment({ withBase: false });
	assert.throws(() => register(), /formBridgeCustomLib v1.0.1/);
	for (const base of [{}, { setFieldValue() {} }, { setFieldError() {} }]) {
		context.formBridgeCustomLib = base;
		assert.throws(() => register(), /formBridgeCustomLib/);
	}
	assert.equal(registrations.length, 0);
	for (const api of [undefined, null, {}, { events: {} }, { events: { on: true } }]) {
		const isolated = vm.createContext({ window: {}, formBridge: api });
		isolated.window = isolated;
		vm.runInContext(baseSource, isolated);
		vm.runInContext(source, isolated);
		assert.throws(
			() =>
				isolated.window.DATE.registerFormBridgeDateInputHandler('raw', 'saved', { type: 'date' }),
			/formBridge\.events\.on/
		);
	}
	const ready = createEnvironment();
	const handler = ready.register();
	ready.show();
	for (const event of [null, undefined, {}, false, { record: { raw: { value: '2026-11-02' } } }]) {
		assert.throws(() => handler(event), /value/);
	}
	assert.deepEqual(ready.calls, []);
});

test('field API failures propagate unchanged and are never shown as conversion errors', () => {
	for (const value of ['2026-11-02', '', '不正な値', false]) {
		for (const failAt of [1, 2, 3]) {
			const { calls, register, show } = createEnvironment();
			const handler = register({ type: 'date' });
			const failure = new Error('API failure');
			let count = 0;
			const setter = (kind) => (field, nextValue) => {
				calls.push([kind, field, nextValue]);
				if (++count === failAt) throw failure;
			};
			show({ setFieldValue: setter('value'), setFieldValueError: setter('error') });
			const expectedCalls = ['2026-11-02', ''].includes(value) ? 2 : 3;
			if (failAt <= expectedCalls) {
				assert.throws(
					() => handler({ value }),
					(error) => error === failure,
					'the API failure must propagate unchanged'
				);
				assert.equal(calls.length, failAt);
			}
		}
	}
	// フィールド不足などで共通基盤のAPI解決が失敗した場合も黙って無視しない
	const { register } = createEnvironment();
	assert.throws(() => register()({ value: '2026-11-02' }), /formBridge\.fn\.setFieldValueError/);
});

test('migration examples for apps 202/428/692 register independently without interference', () => {
	const { context, registrations, calls, show } = createEnvironment();
	vm.runInContext(readSource('all-window-exports.js'), context);
	const registerHandler = context.window.registerFormBridgeDateInputHandler;
	assert.equal(typeof registerHandler, 'function');
	registerHandler('Birthday_input', 'Birthday', { type: 'date' });
	registerHandler('National_examination_year_input', 'National_examination_year', {
		type: 'year',
		invalidMessage: '国家試験年の形式で入力してください。',
		exceptionMessage: '国家試験年の形式が正しくありません。',
	});
	registerHandler(
		'Training_facility_school_completion_date_input',
		'Training_facility_school_completion_date',
		{ type: 'yearMonth' }
	);
	assert.deepEqual(
		registrations.map((r) => r.eventName),
		[
			'form.field.change.Birthday_input',
			'form.field.change.National_examination_year_input',
			'form.field.change.Training_facility_school_completion_date_input',
		]
	);
	show();
	// 202・428・692の日付欄: 空欄・失敗時の消去値は''ではなくnull
	registrations[0].handler({ value: '平成2年4月15日' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'Birthday_input', null],
		['value', 'Birthday', '1990-04-15'],
	]);
	// 692: 正常入力後の空欄化で保存値をnullにする（保持しない）
	registrations[0].handler({ value: '' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'Birthday_input', null],
		['value', 'Birthday', null],
	]);
	registrations[1].handler({ value: '不正な値' });
	assert.deepEqual(calls.slice(-3), [
		['error', 'National_examination_year_input', null],
		['value', 'National_examination_year', ''],
		['error', 'National_examination_year_input', '国家試験年の形式が正しくありません。'],
	]);
	registrations[2].handler({ value: '2026-04' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'Training_facility_school_completion_date_input', null],
		['value', 'Training_facility_school_completion_date', '2026年4月'],
	]);
	// 他項目のエラーは互いに干渉しない（各ハンドラーは自身の入力欄のみ操作する）
	const touchedFields = calls.map(([, field]) => field);
	assert.ok(!touchedFields.includes('Birthday_input_input'));
});

test('afterChange must be a function at registration and never fires on registration', () => {
	const { context, registrations, calls } = createEnvironment();
	const register = (...args) => context.window.DATE.registerFormBridgeDateInputHandler(...args);
	for (const callback of [null, '', 'callback', 0, false, [], {}, Symbol()]) {
		assert.throws(
			() => register('raw', 'saved', { type: 'date', afterChange: callback }),
			/afterChange/
		);
	}
	assert.equal(registrations.length, 0, 'invalid afterChange registers no handler');
	let notified = 0;
	register('raw', 'saved', { type: 'date', afterChange: () => notified++ });
	assert.equal(registrations.length, 1);
	assert.equal(notified, 0, 'registration itself must not notify');
	assert.deepEqual(calls, [], 'registration with afterChange changes no values or errors');
});

test('afterChange notifies success, empty, exception, and non-string exactly once after settings', () => {
	for (const [type, clearValue] of [
		['date', null],
		['year', ''],
		['yearMonth', ''],
	]) {
		const { context, calls, registrations, show } = createEnvironment();
		const notifications = [];
		context.window.DATE.registerFormBridgeDateInputHandler('raw', 'saved', {
			type,
			afterChange: (result) => {
				notifications.push({ result, callCountAtNotify: calls.length });
			},
		});
		const handler = registrations.at(-1).handler;
		show();
		const valid = { date: '2026-11-02', year: '2026', yearMonth: '2026-04' }[type];
		const saved = { date: '2026-11-02', year: '2026年', yearMonth: '2026年4月' }[type];
		const assertNotified = (event, status, savedValue, errorMessage) => {
			assert.equal(notifications.length, 1, 'exactly one notification per change event');
			const { result, callCountAtNotify } = notifications.pop();
			assert.equal(result.event, event, 'the original event object is notified');
			assert.equal(result.inputFieldCode, 'raw');
			assert.equal(result.savedFieldCode, 'saved');
			assert.equal(result.status, status);
			assert.ok(Object.is(result.savedValue, savedValue), 'savedValue is strictly identical');
			assert.equal(result.errorMessage, errorMessage);
			assert.equal(
				callCountAtNotify,
				calls.length,
				'notification happens synchronously after all value/error settings'
			);
		};
		// 正常変換
		const successEvent = { value: valid };
		handler(successEvent);
		assert.deepEqual(calls.slice(-2), [
			['error', 'raw', null],
			['value', 'saved', saved],
		]);
		assertNotified(successEvent, 'success', saved, null);
		// 空欄化（日付は厳密にnull、年・年月は厳密に''）
		for (const value of [null, undefined, '']) {
			const emptyEvent = { value };
			handler(emptyEvent);
			assert.deepEqual(calls.slice(-2), [
				['error', 'raw', null],
				['value', 'saved', clearValue],
			]);
			assertNotified(emptyEvent, 'empty', clearValue, null);
		}
		// 変換例外（通知される文言は実際に表示した文言）
		let conversionError;
		assert.throws(
			() => {
				const convert = {
					date: context.window.DATE.convertToSeireki,
					year: context.window.DATE.convertToYear,
					yearMonth: context.window.DATE.convertToYearMonth,
				}[type];
				convert('不正な値');
			},
			(error) => {
				conversionError = error.message;
				return true;
			}
		);
		const exceptionEvent = { value: '不正な値' };
		handler(exceptionEvent);
		assert.deepEqual(calls.slice(-3), [
			['error', 'raw', null],
			['value', 'saved', clearValue],
			['error', 'raw', conversionError],
		]);
		assertNotified(exceptionEvent, 'invalid', clearValue, conversionError);
		// 非文字列入力
		const typeErrorEvent = { value: 20261102 };
		handler(typeErrorEvent);
		assert.deepEqual(calls.slice(-3), [
			['error', 'raw', null],
			['value', 'saved', clearValue],
			['error', 'raw', '文字列で入力してください。'],
		]);
		assertNotified(typeErrorEvent, 'invalid', clearValue, '文字列で入力してください。');
	}
});

test('afterChange reports invalid with the shown invalidMessage when conversion yields no acceptable value', () => {
	const { context, calls, registrations, show } = createEnvironment();
	// Date型の範囲を超える元号年は例外なしで不成立（保存形式に合わない文字列）になる
	assert.equal(context.window.DATE.convertToSeireki('R300000-1-1'), 'NaN-NaN-NaN');
	const notifications = [];
	context.window.DATE.registerFormBridgeDateInputHandler('raw', 'saved', {
		type: 'date',
		afterChange: (result) => notifications.push(result),
	});
	const handler = registrations.at(-1).handler;
	show();
	const invalidEvent = { value: 'R300000-1-1' };
	handler(invalidEvent);
	assert.deepEqual(calls, [
		['error', 'raw', null],
		['value', 'saved', null],
		['error', 'raw', '日付の形式で入力してください。'],
	]);
	assert.equal(notifications.length, 1);
	assert.equal(notifications[0].event, invalidEvent);
	assert.equal(notifications[0].status, 'invalid');
	assert.equal(notifications[0].savedValue, null);
	assert.equal(notifications[0].errorMessage, '日付の形式で入力してください。');
});

test('afterChange is not called when field APIs fail and the failure propagates unchanged', () => {
	for (const [value, expectedCalls] of [
		['2026-11-02', 2],
		['', 2],
		['不正な値', 3],
	]) {
		for (let failAt = 1; failAt <= expectedCalls; failAt++) {
			const { context, calls, registrations, show } = createEnvironment();
			let notified = 0;
			context.window.DATE.registerFormBridgeDateInputHandler('raw', 'saved', {
				type: 'date',
				afterChange: () => notified++,
			});
			const handler = registrations.at(-1).handler;
			const failure = new Error('API failure');
			let count = 0;
			const setter = (kind) => (field, nextValue) => {
				calls.push([kind, field, nextValue]);
				if (++count === failAt) throw failure;
			};
			show({ setFieldValue: setter('value'), setFieldValueError: setter('error') });
			assert.throws(
				() => handler({ value }),
				(error) => error === failure,
				'the API failure must propagate unchanged'
			);
			assert.equal(notified, 0, 'afterChange must not be called when a setting API fails');
			assert.equal(calls.length, failAt);
		}
	}
});

test('afterChange exceptions propagate unchanged and are never treated as conversion errors', () => {
	const { calls, register, show } = createEnvironment();
	const failure = new Error('業務チェック失敗');
	const handler = register({
		type: 'date',
		afterChange: () => {
			throw failure;
		},
	});
	show();
	assert.throws(
		() => handler({ value: '2026-11-02' }),
		(error) => error === failure,
		'the callback exception must propagate unchanged'
	);
	// 保存値は消去されず、変換エラーへの置き換え・追加の設定も行われない
	assert.deepEqual(calls, [
		['error', 'raw', null],
		['value', 'saved', '2026-11-02'],
	]);
	assert.throws(
		() => handler({ value: '' }),
		(error) => error === failure
	);
	assert.deepEqual(calls.slice(-2), [
		['error', 'raw', null],
		['value', 'saved', null],
	]);
});

test('consumer business errors set inside afterChange persist after the handler returns', () => {
	const { context, calls, registrations, show } = createEnvironment();
	context.window.DATE.registerFormBridgeDateInputHandler('raw', 'saved', {
		type: 'date',
		afterChange: ({ status, savedValue, errorMessage, inputFieldCode }) => {
			const fb = context.window.formBridgeCustomLib;
			if (status === 'success' && savedValue > '2026-01-01') {
				// 個別フォーム側の業務チェック（例: 基準日との整合性）によるエラー設定
				fb.setFieldError(inputFieldCode, '生年月日が報告基準日より後です。');
			}
			if (status === 'invalid') {
				// 業務チェック後に、通知された変換エラー文言を再表示できる
				fb.setFieldError(inputFieldCode, errorMessage);
			}
		},
	});
	const handler = registrations.at(-1).handler;
	show();
	// 正常変換後に利用側が設定した業務エラーは、ライブラリに解除・上書きされず残る
	handler({ value: '2026-11-02' });
	assert.deepEqual(calls.slice(-3), [
		['error', 'raw', null],
		['value', 'saved', '2026-11-02'],
		['error', 'raw', '生年月日が報告基準日より後です。'],
	]);
	// 失敗時は、利用側が業務チェック後に変換エラーを再表示できる
	let conversionError;
	assert.throws(
		() => context.window.DATE.convertToSeireki('不正な値'),
		(error) => {
			conversionError = error.message;
			return true;
		}
	);
	handler({ value: '不正な値' });
	assert.deepEqual(calls.slice(-4), [
		['error', 'raw', null],
		['value', 'saved', null],
		['error', 'raw', conversionError],
		['error', 'raw', conversionError],
	]);
	// 次の変更イベントの冒頭で業務エラーも解除され、空欄通知で再判定できる
	handler({ value: '' });
	assert.deepEqual(calls.slice(-2), [
		['error', 'raw', null],
		['value', 'saved', null],
	]);
});

test('afterChange works in window.formBridge-only environments and registrations stay independent', () => {
	const { context, registrations, calls, show } = createEnvironment({ windowFormBridge: true });
	const notifications = [];
	context.window.DATE.registerFormBridgeDateInputHandler(
		'Person_birth_date_input',
		'Person_birth_date',
		{
			type: 'date',
			afterChange: (result) => notifications.push(['birth', result.status, result.savedValue]),
		}
	);
	context.window.DATE.registerFormBridgeDateInputHandler('Contract_date_input', 'Contract_date', {
		type: 'date',
		afterChange: (result) => notifications.push(['contract', result.status, result.savedValue]),
	});
	// コールバック未指定の登録は従来どおり通知なしで動作する
	context.window.DATE.registerFormBridgeDateInputHandler('Report_year_input', 'Report_year', {
		type: 'year',
	});
	assert.deepEqual(
		registrations.map((r) => r.eventName),
		[
			'form.field.change.Person_birth_date_input',
			'form.field.change.Contract_date_input',
			'form.field.change.Report_year_input',
		]
	);
	assert.deepEqual(notifications, [], 'no notification at registration');
	show();
	registrations[0].handler({ value: '平成2年4月15日' });
	registrations[1].handler({ value: '' });
	registrations[2].handler({ value: '2026' });
	assert.deepEqual(notifications, [
		['birth', 'success', '1990-04-15'],
		['contract', 'empty', null],
	]);
	assert.deepEqual(calls, [
		['error', 'Person_birth_date_input', null],
		['value', 'Person_birth_date', '1990-04-15'],
		['error', 'Contract_date_input', null],
		['value', 'Contract_date', null],
		['error', 'Report_year_input', null],
		['value', 'Report_year', '2026年'],
	]);
});
