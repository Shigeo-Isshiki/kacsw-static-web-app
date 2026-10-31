/**
 * FormBridge 新バージョンのフォーム操作を補助する共通ライブラリです。
 * @version 1.0.1
 */
(function () {
	'use strict';

	const globalObject = typeof window !== 'undefined' ? window : globalThis;
	const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
	const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
	const isFieldCode = (value) => typeof value === 'string' && value.trim().length > 0;
	const isFunctionPath = (value) =>
		typeof value === 'string' &&
		/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(value) &&
		!value
			.split('.')
			.some((part) => part === '__proto__' || part === 'prototype' || part === 'constructor');

	const resolveFunctionPath = (path) => {
		if (!isFunctionPath(path)) return null;
		const parts = path.split('.');
		let owner = globalObject;
		let start = 0;
		if (parts[0] === 'formBridge' && parts.length > 1) {
			// A global lexical binding is not necessarily a window property.
			owner = typeof formBridge !== 'undefined' ? formBridge : globalObject.formBridge;
			start = 1;
		}
		for (let index = start; index < parts.length - 1; index += 1) {
			owner = owner == null ? undefined : owner[parts[index]];
		}
		const name = parts[parts.length - 1];
		const fn = owner == null ? undefined : owner[name];
		return typeof fn === 'function' ? { owner, fn } : null;
	};

	const requireFunction = (path) => {
		const resolved = resolveFunctionPath(path);
		if (!resolved) throw new Error('FormBridge API is unavailable: ' + path);
		return resolved;
	};

	const validateRecord = (record, name) => {
		if (!isObject(record)) throw new TypeError(name + ': record must be an object');
	};

	const validateFieldCode = (fieldCode, name) => {
		if (!isFieldCode(fieldCode))
			throw new TypeError(name + ': fieldCode must be a non-empty string');
	};

	const getFieldEntry = (record, fieldCode, name) => {
		validateRecord(record, name);
		validateFieldCode(fieldCode, name);
		if (!own(record, fieldCode)) return null;
		const field = record[fieldCode];
		if (!isObject(field) || !own(field, 'value')) return null;
		return field;
	};

	const requireRecordField = (record, fieldCode, name) => {
		const field = getFieldEntry(record, fieldCode, name);
		if (!field) throw new ReferenceError(name + ': field is missing or has no value: ' + fieldCode);
		return field;
	};

	const isEmptyValue = (value) =>
		value === null ||
		value === undefined ||
		value === '' ||
		(Array.isArray(value) && value.length === 0);

	const createDependencyChecker = (requiredFunctions) => {
		if (!Array.isArray(requiredFunctions)) {
			throw new TypeError(
				'createDependencyChecker: requiredFunctions must be an array of function paths'
			);
		}
		const paths = Array.from(requiredFunctions);
		if (paths.some((path) => !isFunctionPath(path))) {
			throw new TypeError(
				'createDependencyChecker: requiredFunctions must be an array of function paths'
			);
		}
		const uniquePaths = [...new Set(paths)];

		return (options = {}) => {
			if (!isObject(options)) throw new TypeError('checkDependencies: options must be an object');
			const strict = options.strict === undefined ? false : options.strict;
			if (typeof strict !== 'boolean') {
				throw new TypeError('checkDependencies: options.strict must be a boolean');
			}
			const missing = uniquePaths.filter((path) => !resolveFunctionPath(path));
			if (missing.length === 0) return true;

			const message =
				'FormBridge custom library dependencies are unavailable: ' + missing.join(', ');
			console.warn(message);
			const notify = resolveFunctionPath('notifyError');
			if (notify) {
				try {
					const result = notify.fn.call(
						notify.owner,
						'必要なカスタマイズ関数がありません。詳細はコンソールを確認してください。'
					);
					if (result && typeof result.catch === 'function') {
						result.catch((error) =>
							console.debug('formBridgeCustomLib: notifyError rejected', error)
						);
					}
				} catch (error) {
					console.debug('formBridgeCustomLib: notifyError failed', error);
				}
			}
			if (strict) throw new Error(message);
			return false;
		};
	};

	const getFormBridgeRecord = () => {
		const { owner, fn } = requireFunction('formBridge.fn.getRecord');
		const record = fn.call(owner);
		validateRecord(record, 'getFormBridgeRecord');
		return record;
	};

	const getFieldValue = (record, fieldCode, options = {}) => {
		const name = 'getFieldValue';
		validateRecord(record, name);
		validateFieldCode(fieldCode, name);
		if (!isObject(options)) throw new TypeError(name + ': options must be an object');
		const required = options.required === undefined ? false : options.required;
		if (typeof required !== 'boolean')
			throw new TypeError(name + ': options.required must be a boolean');
		if (required && own(options, 'fallback')) {
			throw new TypeError(name + ': fallback cannot be used with required: true');
		}

		const field = getFieldEntry(record, fieldCode, name);
		if (field && field.value !== undefined) return field.value;
		if (required)
			throw new ReferenceError(name + ': required field is missing or undefined: ' + fieldCode);
		return own(options, 'fallback') ? options.fallback : undefined;
	};

	const setFieldValue = (fieldCode, value) => {
		validateFieldCode(fieldCode, 'setFieldValue');
		const { owner, fn } = requireFunction('formBridge.fn.setFieldValue');
		return fn.call(owner, fieldCode, value);
	};

	const setFieldError = (fieldCode, errorMessage) => {
		validateFieldCode(fieldCode, 'setFieldError');
		if (
			errorMessage !== null &&
			(typeof errorMessage !== 'string' || errorMessage.trim().length === 0)
		) {
			throw new TypeError('setFieldError: errorMessage must be a non-empty string or null');
		}
		const { owner, fn } = requireFunction('formBridge.fn.setFieldValueError');
		return fn.call(owner, fieldCode, errorMessage);
	};

	const copyFieldValues = (record, mappings, options = {}) => {
		const name = 'copyFieldValues';
		validateRecord(record, name);
		if (!Array.isArray(mappings)) throw new TypeError(name + ': mappings must be an array');
		if (!isObject(options)) throw new TypeError(name + ': options must be an object');
		const copyEmpty = options.copyEmpty === undefined ? true : options.copyEmpty;
		if (typeof copyEmpty !== 'boolean') {
			throw new TypeError(name + ': options.copyEmpty must be a boolean');
		}

		const targets = new Set();
		const operations = Array.from(mappings, (mapping, index) => {
			if (!isObject(mapping))
				throw new TypeError(name + ': mapping at index ' + index + ' must be an object');
			if (!own(mapping, 'source') || !own(mapping, 'target')) {
				throw new TypeError(name + ': source and target are required at index ' + index);
			}
			validateFieldCode(mapping.source, name);
			validateFieldCode(mapping.target, name);
			if (targets.has(mapping.target)) {
				throw new TypeError(name + ': duplicate target field: ' + mapping.target);
			}
			targets.add(mapping.target);
			const source = requireRecordField(record, mapping.source, name).value;
			requireRecordField(record, mapping.target, name);
			return { target: mapping.target, value: source };
		});

		if (operations.length === 0) return 0;
		const { owner, fn } = requireFunction('formBridge.fn.setFieldValue');
		let count = 0;
		operations.forEach(({ target, value }) => {
			if (!copyEmpty && isEmptyValue(value)) return;
			fn.call(owner, target, value);
			count += 1;
		});
		return count;
	};

	const initializeFields = (record, fields) => {
		const name = 'initializeFields';
		validateRecord(record, name);
		if (!Array.isArray(fields)) throw new TypeError(name + ': fields must be an array');

		const fieldCodes = new Set();
		let clearsErrors = false;
		const operations = Array.from(fields, (item, index) => {
			if (!isObject(item))
				throw new TypeError(name + ': field at index ' + index + ' must be an object');
			if (!own(item, 'fieldCode')) {
				throw new TypeError(name + ': fieldCode is required at index ' + index);
			}
			validateFieldCode(item.fieldCode, name);
			if (!own(item, 'value')) throw new TypeError(name + ': value is required at index ' + index);
			if (fieldCodes.has(item.fieldCode)) {
				throw new TypeError(name + ': duplicate fieldCode: ' + item.fieldCode);
			}
			fieldCodes.add(item.fieldCode);
			requireRecordField(record, item.fieldCode, name);
			const clearError = item.clearError === undefined ? false : item.clearError;
			if (typeof clearError !== 'boolean') {
				throw new TypeError(name + ': clearError must be a boolean at index ' + index);
			}
			clearsErrors = clearsErrors || clearError;
			return { fieldCode: item.fieldCode, value: item.value, clearError };
		});

		if (operations.length === 0) return 0;
		const setter = requireFunction('formBridge.fn.setFieldValue');
		const errorSetter = clearsErrors ? requireFunction('formBridge.fn.setFieldValueError') : null;
		operations.forEach(({ fieldCode, value, clearError }) => {
			setter.fn.call(setter.owner, fieldCode, value);
			if (clearError) errorSetter.fn.call(errorSetter.owner, fieldCode, null);
		});
		return operations.length;
	};

	if ('formBridgeCustomLib' in globalObject) {
		throw new Error('formBridgeCustomLib global name is already in use');
	}
	globalObject.formBridgeCustomLib = Object.freeze({
		createDependencyChecker,
		getFormBridgeRecord,
		getFieldValue,
		setFieldValue,
		setFieldError,
		copyFieldValues,
		initializeFields,
	});
})();
