/** kViewer 専用の基本操作をまとめた JavaScript ライブラリです。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
/* exported createDependencyChecker, getFieldValueOr, setFieldShown, setFormBridgeButtonShown, setPrintCreatorButtonShown */

const _KV_displayValues = new WeakMap();

const _kvReportError = (name, message, details) => {
	if (details === undefined) {
		console.warn(name + ': ' + message);
	} else {
		console.warn(name + ': ' + message, details);
	}
};

const _kvIsElement = (element) =>
	Boolean(
		element &&
			typeof element === 'object' &&
			element.nodeType === 1 &&
			typeof element.getAttribute === 'function' &&
			typeof element.setAttribute === 'function' &&
			element.style &&
			typeof element.style.display === 'string'
	);

const _kvSetElementShown = (element, shown) => {
	if (!_kvIsElement(element)) return false;

	if (!shown) {
		if (!_KV_displayValues.has(element)) {
			_KV_displayValues.set(element, element.style.display);
		}
		if (element.style.display !== 'none') element.style.display = 'none';
		return true;
	}

	if (!_KV_displayValues.has(element)) return true;
	const originalDisplay = _KV_displayValues.get(element);
	if (element.style.display !== originalDisplay) element.style.display = originalDisplay;
	_KV_displayValues.delete(element);
	return true;
};

const _kvApplyElementShown = (element, shown, name) => {
	try {
		return _kvSetElementShown(element, shown);
	} catch (error) {
		console.error(name + ': failed to update element display', { error });
		return false;
	}
};

const _kvGetDetailElement = (context, name) => {
	if (!context || typeof context !== 'object' || Array.isArray(context)) {
		_kvReportError(name, 'invalid context', { context });
		return null;
	}

	const getter =
		typeof context.getDetailViewElement === 'function'
			? context.getDetailViewElement
			: context.getDetailElement;
	if (typeof getter !== 'function') {
		_kvReportError(name, 'context does not provide a detail element getter');
		return null;
	}

	let detailElement;
	try {
		detailElement = getter.call(context);
	} catch (error) {
		console.error(name + ': failed to get detail element', { error });
		return null;
	}

	if (!_kvIsElement(detailElement) || typeof detailElement.querySelectorAll !== 'function') {
		_kvReportError(name, 'detail element was not found or is not a DOM element');
		return null;
	}
	return detailElement;
};

const _kvSetIntegrationButtonsShown = (context, shown, className, name) => {
	if (typeof shown !== 'boolean') {
		_kvReportError(name, 'shown must be a boolean', { shown });
		return false;
	}

	const detailElement = _kvGetDetailElement(context, name);
	if (!detailElement) return false;

	let buttons;
	try {
		buttons = Array.from(detailElement.querySelectorAll(className));
		if (detailElement.matches && detailElement.matches(className)) buttons.unshift(detailElement);
	} catch (error) {
		console.error(name + ': failed to find buttons in detail element', { error, className });
		return false;
	}
	if (buttons.length === 0) {
		_kvReportError(name, 'button is not configured in this detail view', { className });
		return false;
	}

	let success = true;
	buttons.forEach((button) => {
		if (!_kvApplyElementShown(button, shown, name)) success = false;
	});
	if (!success) _kvReportError(name, 'one or more buttons could not be updated', { className });
	return success;
};

/**
 * 確認し、必要な外部関数がそろっていなければ警告・通知する関数を生成します。
 * @param {Array<{name: string, source: string}>} requirements 必須関数の定義
 * @returns {function(Object=): boolean} 依存がそろえば true、不足時は false。strict 時は Error
 */
const createDependencyChecker = (requirements) => {
	const normalizedRequirements = Array.isArray(requirements) ? requirements : [];
	return (options = { strict: false }) => {
		const missing = normalizedRequirements
			.filter((requirement) => {
				if (!requirement || typeof requirement.name !== 'string') return false;
				return typeof globalThis[requirement.name] !== 'function';
			})
			.map((requirement) => String(requirement.source) + ' (' + String(requirement.name) + ')');

		if (missing.length === 0) return true;

		const message = '外部依存ファイル/関数が不足している可能性があります: ' + missing.join(', ');
		console.warn(message);
		try {
			if (typeof globalThis.notifyError === 'function') {
				globalThis.notifyError(
					'外部依存が不足しています。詳細はコンソールを確認してください。',
					undefined,
					true
				);
			}
		} catch (error) {
			console.debug('notifyError threw an error:', error);
		}
		if (options && options.strict) throw new Error(message);
		return false;
	};
};

/**
 * kintone 形式のレコードからフィールド値を取得します。値のない場合は fallback を返します。
 * @param {Object} record フィールド情報を持つレコード
 * @param {string} fieldCode 取得するフィールドコード
 * @param {*} fallback フィールド値がない場合に返す値
 * @returns {*} レコード値、または fallback
 */
const getFieldValueOr = (record, fieldCode, fallback) => {
	if (typeof fieldCode !== 'string' || !fieldCode.trim()) {
		_kvReportError('getFieldValueOr', 'invalid fieldCode', { fieldCode });
		return fallback;
	}
	if (typeof record !== 'object' || record === null || Array.isArray(record)) {
		_kvReportError('getFieldValueOr', 'invalid record', { record });
		return fallback;
	}

	try {
		const field = Object.prototype.hasOwnProperty.call(record, fieldCode)
			? record[fieldCode]
			: undefined;
		if (!field || typeof field !== 'object') return fallback;
		return Object.prototype.hasOwnProperty.call(field, 'value') && field.value !== undefined
			? field.value
			: fallback;
	} catch (error) {
		console.error('getFieldValueOr: unexpected error', { error, record, fieldCode });
		return fallback;
	}
};

/**
 * 詳細ビュー内の単一フィールドを表示・非表示にします。
 * @param {Object} context record.show イベントのコンテキスト
 * @param {string} fieldCode 対象フィールドコード
 * @param {boolean} shown 表示する場合は true
 * @returns {boolean} 操作成功時 true、不正入力や対象なしの場合 false
 */
const setFieldShown = (context, fieldCode, shown) => {
	if (!context || typeof context !== 'object' || Array.isArray(context)) {
		_kvReportError('setFieldShown', 'invalid context', { context });
		return false;
	}
	if (typeof fieldCode !== 'string' || !fieldCode.trim()) {
		_kvReportError('setFieldShown', 'invalid fieldCode', { fieldCode });
		return false;
	}
	if (typeof shown !== 'boolean') {
		_kvReportError('setFieldShown', 'shown must be a boolean', { shown });
		return false;
	}
	if (typeof context.getFieldElement !== 'function') {
		_kvReportError('setFieldShown', 'context does not provide getFieldElement(fieldCode)');
		return false;
	}

	let fieldElement;
	try {
		fieldElement = context.getFieldElement(fieldCode);
	} catch (error) {
		console.error('setFieldShown: failed to get field element', { error, fieldCode });
		return false;
	}
	if (!_kvIsElement(fieldElement)) {
		_kvReportError('setFieldShown', 'field element was not found', { fieldCode });
		return false;
	}
	return _kvApplyElementShown(fieldElement, shown, 'setFieldShown');
};

/**
 * 詳細ビュー内のFormBridge連携ボタンを表示・非表示にします。
 * @param {Object} context view.detail.show または record.show のコンテキスト
 * @param {boolean} shown 表示する場合は true
 * @returns {boolean} 操作成功時 true、ボタン未設定などの場合 false
 */
const setFormBridgeButtonShown = (context, shown) =>
	_kvSetIntegrationButtonsShown(context, shown, '.kv-detail-fb-button', 'setFormBridgeButtonShown');

/**
 * 詳細ビュー内のPrintCreator連携ボタンを表示・非表示にします。
 * @param {Object} context view.detail.show または record.show のコンテキスト
 * @param {boolean} shown 表示する場合は true
 * @returns {boolean} 操作成功時 true、ボタン未設定などの場合 false
 */
const setPrintCreatorButtonShown = (context, shown) =>
	_kvSetIntegrationButtonsShown(
		context,
		shown,
		'.kv-detail-pc-button',
		'setPrintCreatorButtonShown'
	);

if (typeof window !== 'undefined') {
	window.createDependencyChecker = createDependencyChecker;
	window.getFieldValueOr = getFieldValueOr;
	window.setFieldShown = setFieldShown;
	window.setFormBridgeButtonShown = setFormBridgeButtonShown;
	window.setPrintCreatorButtonShown = setPrintCreatorButtonShown;
}
