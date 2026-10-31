const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const libraryPath = path.join(__dirname, '..', 'src', 'formbridge-custom-lib.js');
const librarySource = fs.readFileSync(libraryPath, 'utf8');

const loadLibrary = (windowObject = {}) => {
	global.window = windowObject;
	delete require.cache[require.resolve(libraryPath)];
	require(libraryPath);
	return windowObject.formBridgeCustomLib;
};

test.afterEach(() => {
	delete global.window;
	delete require.cache[require.resolve(libraryPath)];
});

test('publishes the namespace without registering events or changing form values', () => {
	let registeredEvents = 0;
	let changedValues = 0;
	const lib = loadLibrary({
		formBridge: {
			events: { on: () => (registeredEvents += 1) },
			fn: {
				getRecord: () => ({}),
				setFieldValue: () => (changedValues += 1),
			},
		},
	});

	assert.equal(typeof lib.getFormBridgeRecord, 'function');
	assert.equal(Object.isFrozen(lib), true);
	assert.equal(registeredEvents, 0);
	assert.equal(changedValues, 0);
});

test('does not overwrite an existing namespace', () => {
	const existing = {};
	assert.throws(
		() => loadLibrary({ formBridgeCustomLib: existing }),
		/formBridgeCustomLib global name is already in use/
	);
});

test('uses a global const formBridge for all public operations and resolves fn lazily', () => {
	const calls = [];
	const record = {
		source: { value: 0 },
		target: { value: '' },
		choices: { value: ['selected'] },
	};
	const events = {
		on() {
			throw new Error('Loading the library must not register events.');
		},
	};
	const warnings = [];
	const context = vm.createContext({
		console: { warn: (message) => warnings.push(message) },
		mockEvents: events,
		customHelper() {},
	});
	context.window = context;
	vm.runInContext('const formBridge = { events: mockEvents };', context);
	vm.runInContext(librarySource, context);
	const lib = context.formBridgeCustomLib;

	assert.equal(vm.runInContext('typeof formBridge', context), 'object');
	assert.equal(vm.runInContext('typeof formBridge.events.on', context), 'function');
	assert.equal(vm.runInContext('typeof window.formBridge', context), 'undefined');
	assert.equal(lib.createDependencyChecker(['formBridge.events.on', 'customHelper'])(), true);
	const check = lib.createDependencyChecker([
		'formBridge.fn.getRecord',
		'formBridge.fn.setFieldValue',
		'formBridge.fn.setFieldValueError',
	]);
	assert.equal(check(), false);
	assert.match(warnings[0], /formBridge\.fn\.getRecord/);
	assert.throws(() => lib.getFormBridgeRecord(), /FormBridge API is unavailable/);
	assert.throws(() => lib.setFieldValue('target', false), /FormBridge API is unavailable/);
	assert.throws(() => lib.setFieldError('target', null), /FormBridge API is unavailable/);
	assert.deepEqual(calls, []);

	const fn = {
		getRecord() {
			assert.equal(this, fn);
			return record;
		},
		setFieldValue(code, value) {
			assert.equal(this, fn);
			calls.push(['value', code, value]);
			record[code].value = value;
		},
		setFieldValueError(code, message) {
			assert.equal(this, fn);
			calls.push(['error', code, message]);
		},
	};
	context.mockFn = fn;
	vm.runInContext('formBridge.fn = mockFn;', context);
	assert.equal(check(), true);
	assert.equal(lib.getFormBridgeRecord(), record);
	assert.equal(lib.getFieldValue(record, 'source', { required: true }), 0);
	lib.setFieldValue('target', false);
	lib.setFieldError('target', 'Invalid value');
	lib.setFieldError('target', null);
	assert.equal(lib.copyFieldValues(record, [{ source: 'source', target: 'target' }]), 1);
	assert.equal(
		lib.initializeFields(record, [
			{ fieldCode: 'target', value: '', clearError: true },
			{ fieldCode: 'choices', value: [], clearError: true },
		]),
		2
	);
	assert.deepEqual(calls, [
		['value', 'target', false],
		['error', 'target', 'Invalid value'],
		['error', 'target', null],
		['value', 'target', 0],
		['value', 'target', ''],
		['error', 'target', null],
		['value', 'choices', []],
		['error', 'choices', null],
	]);
	assert.equal(vm.runInContext('typeof window.formBridge', context), 'undefined');

	context.replacementFn = { getRecord: () => ({ replacement: { value: true } }) };
	vm.runInContext('formBridge.fn = replacementFn;', context);
	assert.equal(lib.getFormBridgeRecord().replacement.value, true);
	assert.equal(check(), false);
	assert.throws(() => lib.setFieldValue('target', 1), /FormBridge API is unavailable/);
});

test('resolves a later global const and prefers it over a window property', () => {
	const context = vm.createContext({ console });
	context.window = context;
	vm.runInContext(librarySource, context);
	const lib = context.formBridgeCustomLib;
	context.formBridge = {
		fn: {
			getRecord() {
				throw new Error('The window property must not override the lexical API.');
			},
		},
	};
	vm.runInContext(
		'const formBridge = { fn: { getRecord() { return { lexical: { value: true } }; } } };',
		context
	);
	assert.equal(lib.createDependencyChecker(['formBridge.fn.getRecord'])(), true);
	assert.equal(lib.getFormBridgeRecord().lexical.value, true);
});

test('checks required global and FormBridge API functions together', () => {
	const warnings = [];
	let notices = 0;
	const lib = loadLibrary({
		notifyError: () => {
			notices += 1;
		},
		formBridge: { events: { on() {} } },
	});
	const originalWarn = console.warn;
	console.warn = (message) => warnings.push(message);
	try {
		const check = lib.createDependencyChecker([
			'formBridge.events.on',
			'formBridge.fn.getRecord',
			'customHelper',
			'customHelper',
		]);
		assert.equal(check(), false);
		assert.match(warnings[0], /formBridge\.fn\.getRecord, customHelper/);
		assert.equal(notices, 1);
		assert.throws(() => check({ strict: true }), /formBridge\.fn\.getRecord, customHelper/);
		assert.equal(notices, 2);
		assert.equal(lib.createDependencyChecker(['formBridge.events.on'])(), true);
		assert.throws(() => lib.createDependencyChecker('formBridge.events.on'), TypeError);
		assert.throws(() => lib.createDependencyChecker(new Array(1)), TypeError);
		assert.throws(() => lib.createDependencyChecker(['formBridge.__proto__']), TypeError);
		assert.throws(() => check({ strict: 'yes' }), TypeError);
	} finally {
		console.warn = originalWarn;
	}
});

test('reports unavailable FormBridge API and validates the returned record', () => {
	const lib = loadLibrary();
	assert.throws(
		() => lib.getFormBridgeRecord(),
		/FormBridge API is unavailable: formBridge\.fn\.getRecord/
	);

	const wrongResult = loadLibrary({ formBridge: { fn: { getRecord: () => null } } });
	assert.throws(() => wrongResult.getFormBridgeRecord(), TypeError);
});

test('gets values while preserving falsy and explicit null values', () => {
	const lib = loadLibrary();
	const record = {
		zero: { value: 0 },
		no: { value: false },
		blank: { value: '' },
		nil: { value: null },
		list: { value: [] },
		undefinedValue: { value: undefined },
	};
	const fallback = { fallback: true };

	assert.equal(lib.getFieldValue(record, 'zero', { fallback }), 0);
	assert.equal(lib.getFieldValue(record, 'no', { fallback }), false);
	assert.equal(lib.getFieldValue(record, 'blank', { fallback }), '');
	assert.equal(lib.getFieldValue(record, 'nil', { fallback }), null);
	assert.deepEqual(lib.getFieldValue(record, 'list', { fallback }), []);
	assert.equal(lib.getFieldValue(record, 'undefinedValue', { fallback }), fallback);
	assert.equal(lib.getFieldValue(record, 'missing', { fallback }), fallback);
	assert.equal(lib.getFieldValue(record, 'missing', { fallback: undefined }), undefined);
	assert.equal(lib.getFieldValue(record, 'missing'), undefined);
	assert.throws(() => lib.getFieldValue(record, 'missing', { required: true }), ReferenceError);
	assert.throws(
		() => lib.getFieldValue(record, 'undefinedValue', { required: true }),
		ReferenceError
	);
	assert.throws(
		() => lib.getFieldValue(record, 'missing', { required: true, fallback: 'value' }),
		TypeError
	);
	assert.throws(() => lib.getFieldValue(null, 'name'), TypeError);
	assert.throws(() => lib.getFieldValue(record, '  '), TypeError);
	assert.throws(() => lib.getFieldValue(record, 'zero', null), TypeError);
});

test('sets values and field errors through formBridge.fn, including clearing with null', () => {
	const calls = [];
	const fn = {
		setFieldValue(fieldCode, value) {
			assert.equal(this, fn);
			calls.push(['value', fieldCode, value]);
		},
		setFieldValueError(fieldCode, errorMessage) {
			assert.equal(this, fn);
			calls.push(['error', fieldCode, errorMessage]);
		},
	};
	const lib = loadLibrary({ formBridge: { fn } });

	assert.equal(lib.setFieldValue('COUNT', 0), undefined);
	assert.equal(lib.setFieldValue('FLAG', false), undefined);
	assert.equal(lib.setFieldError('NAME', '入力してください'), undefined);
	assert.equal(lib.setFieldError('NAME', null), undefined);
	assert.deepEqual(calls, [
		['value', 'COUNT', 0],
		['value', 'FLAG', false],
		['error', 'NAME', '入力してください'],
		['error', 'NAME', null],
	]);
	assert.throws(() => lib.setFieldValue('', 'x'), TypeError);
	assert.throws(() => lib.setFieldError('NAME', ''), TypeError);
	assert.throws(() => lib.setFieldError('NAME', undefined), TypeError);

	const unavailableLib = loadLibrary({ formBridge: { fn: {} } });
	assert.throws(
		() => unavailableLib.setFieldValue('NAME', 'x'),
		/FormBridge API is unavailable: formBridge\.fn\.setFieldValue/
	);

	const throwingLib = loadLibrary({
		formBridge: {
			fn: {
				setFieldValue: () => {
					throw new Error('API failed');
				},
			},
		},
	});
	assert.throws(() => throwingLib.setFieldValue('NAME', 'x'), /API failed/);
});

test('copies mapped values and can skip empty values without dropping zero or false', () => {
	const calls = [];
	const lib = loadLibrary({
		formBridge: { fn: { setFieldValue: (fieldCode, value) => calls.push([fieldCode, value]) } },
	});
	const record = {
		saved: { value: '保存値' },
		input: { value: '' },
		zero: { value: 0 },
		zeroInput: { value: 1 },
		flag: { value: false },
		flagInput: { value: true },
		blank: { value: '' },
		blankInput: { value: '既存値' },
		nil: { value: null },
		nilInput: { value: '既存値' },
		choices: { value: [] },
		choicesInput: { value: ['既存値'] },
		undefinedValue: { value: undefined },
		undefinedInput: { value: '既存値' },
	};
	const mappings = [
		{ source: 'saved', target: 'input' },
		{ source: 'zero', target: 'zeroInput' },
		{ source: 'flag', target: 'flagInput' },
		{ source: 'blank', target: 'blankInput' },
		{ source: 'nil', target: 'nilInput' },
		{ source: 'choices', target: 'choicesInput' },
		{ source: 'undefinedValue', target: 'undefinedInput' },
	];

	assert.equal(lib.copyFieldValues(record, mappings), 7);
	assert.deepEqual(calls, [
		['input', '保存値'],
		['zeroInput', 0],
		['flagInput', false],
		['blankInput', ''],
		['nilInput', null],
		['choicesInput', []],
		['undefinedInput', undefined],
	]);

	calls.length = 0;
	assert.equal(lib.copyFieldValues(record, mappings, { copyEmpty: false }), 3);
	assert.deepEqual(calls, [
		['input', '保存値'],
		['zeroInput', 0],
		['flagInput', false],
	]);
});

test('validates every mapping before making any field changes', () => {
	const calls = [];
	const lib = loadLibrary({ formBridge: { fn: { setFieldValue: (...args) => calls.push(args) } } });
	const record = { source: { value: '値' }, target: { value: '' } };

	assert.throws(
		() =>
			lib.copyFieldValues(record, [
				{ source: 'source', target: 'target' },
				{ source: 'missing', target: 'other' },
			]),
		ReferenceError
	);
	assert.throws(
		() =>
			lib.copyFieldValues(record, [
				{ source: 'source', target: 'target' },
				{ source: 'source', target: 'target' },
			]),
		TypeError
	);
	assert.throws(() => lib.copyFieldValues(record, null), TypeError);
	assert.throws(() => lib.copyFieldValues(record, new Array(1)), TypeError);
	assert.throws(() => lib.copyFieldValues(record, [], { copyEmpty: 1 }), TypeError);
	assert.deepEqual(calls, []);
});

test('initializes field-specific values and explicitly clears selected errors', () => {
	const calls = [];
	const fn = {
		setFieldValue: (fieldCode, value) => calls.push(['value', fieldCode, value]),
		setFieldValueError: (fieldCode, errorMessage) => calls.push(['error', fieldCode, errorMessage]),
	};
	const lib = loadLibrary({ formBridge: { fn } });
	const record = {
		text: { value: '既存値' },
		choices: { value: ['既存値'] },
		zero: { value: 1 },
		flag: { value: true },
		nil: { value: '既存値' },
		undefinedValue: { value: '既存値' },
	};

	assert.equal(
		lib.initializeFields(record, [
			{ fieldCode: 'text', value: '', clearError: true },
			{ fieldCode: 'choices', value: [], clearError: true },
			{ fieldCode: 'zero', value: 0 },
			{ fieldCode: 'flag', value: false },
			{ fieldCode: 'nil', value: null },
			{ fieldCode: 'undefinedValue', value: undefined },
		]),
		6
	);
	assert.deepEqual(calls, [
		['value', 'text', ''],
		['error', 'text', null],
		['value', 'choices', []],
		['error', 'choices', null],
		['value', 'zero', 0],
		['value', 'flag', false],
		['value', 'nil', null],
		['value', 'undefinedValue', undefined],
	]);
});

test('validates all initialization targets and required APIs before changing fields', () => {
	const calls = [];
	const lib = loadLibrary({
		formBridge: { fn: { setFieldValue: (...args) => calls.push(args) } },
	});
	const record = { first: { value: '' }, second: { value: '' } };

	assert.throws(
		() =>
			lib.initializeFields(record, [
				{ fieldCode: 'first', value: '変更' },
				{ fieldCode: 'missing', value: '' },
			]),
		ReferenceError
	);
	assert.throws(
		() =>
			lib.initializeFields(record, [
				{ fieldCode: 'first', value: '変更', clearError: true },
				{ fieldCode: 'second', value: '' },
			]),
		/FormBridge API is unavailable: formBridge\.fn\.setFieldValueError/
	);
	assert.throws(() => lib.initializeFields(record, new Array(1)), TypeError);
	assert.throws(
		() =>
			lib.initializeFields(record, [
				{ fieldCode: 'first', value: '変更' },
				{ fieldCode: 'second' },
			]),
		TypeError
	);
	assert.deepEqual(calls, []);
});
