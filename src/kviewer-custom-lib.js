/** kViewer 専用の基本操作をまとめた JavaScript ライブラリです。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.1.0
 */
/* exported createDependencyChecker, getFieldValueOr, setFieldShown, setFormBridgeButtonShown, setPrintCreatorButtonShown, installCopyPrintRestrictions, redirectToRecordDetail, setStaticContentShown */

const _KV_displayValues = new WeakMap();
const _KV_staticDisplayValues = new WeakMap();
const _KV_copyPrintStates = new WeakMap();

const _kvSetRestorableDisplay = (element, shown, savedValues) => {
	if (!shown) {
		if (!savedValues.has(element)) {
			savedValues.set(element, {
				value: element.style.getPropertyValue('display'),
				priority: element.style.getPropertyPriority('display'),
			});
		}
		if (
			element.style.getPropertyValue('display') !== 'none' ||
			element.style.getPropertyPriority('display') !== 'important'
		) {
			element.style.setProperty('display', 'none', 'important');
		}
	} else if (savedValues.has(element)) {
		const original = savedValues.get(element);
		if (original.value) {
			element.style.setProperty('display', original.value, original.priority);
		} else {
			element.style.removeProperty('display');
		}
		savedValues.delete(element);
	}
};

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
		_kvReportError(name, 'invalid context');
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
	} catch {
		console.error(name + ': failed to get detail element');
		return null;
	}

	if (!_kvIsElement(detailElement) || typeof detailElement.querySelectorAll !== 'function') {
		_kvReportError(name, 'detail element was not found or is not a DOM element');
		return null;
	}
	return detailElement;
};

const _kvGetIntegrationButtons = (detailElement, className, name) => {
	const container = detailElement.closest('.kv-container');
	const insideButtons = Array.from(detailElement.querySelectorAll(className));
	if (detailElement.matches(className)) insideButtons.unshift(detailElement);
	const buttons = insideButtons.filter((button) => {
		if (button.closest('.kv-container') !== container) return false;
		const nestedDetail = button.closest('.kv-detail');
		return !nestedDetail || nestedDetail === detailElement || !detailElement.contains(nestedDetail);
	});
	if (buttons.length > 0) return buttons;

	if (!container) {
		_kvReportError(name, 'no matching buttons found in the acquired detail element', {
			className,
			searchScope: 'detail-element',
			matchedCount: 0,
		});
		return null;
	}

	const ownedElements = (selector) =>
		Array.from(container.querySelectorAll(selector)).filter(
			(element) => element.closest('.kv-container') === container
		);
	const details = ownedElements('.kv-detail');
	const menus = ownedElements('.kv-record-menu');
	if (details.length !== 1 || details[0] !== detailElement || menus.length !== 1) {
		_kvReportError(
			name,
			'cannot uniquely associate a record menu with the acquired detail element',
			{
				className,
				searchScope: 'nearest-kv-container',
				detailCount: details.length,
				menuCount: menus.length,
			}
		);
		return null;
	}

	const menu = menus[0];
	const menuButtons = Array.from(menu.querySelectorAll(className)).filter(
		(button) =>
			button.closest('.kv-container') === container &&
			button.closest('.kv-record-menu') === menu &&
			!button.closest('.kv-detail')
	);
	if (menuButtons.length === 0) {
		_kvReportError(name, 'no matching buttons found in the associated record menu', {
			className,
			searchScope: 'associated-kv-record-menu',
			matchedCount: 0,
		});
		return null;
	}
	return menuButtons;
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
		buttons = _kvGetIntegrationButtons(detailElement, className, name);
	} catch {
		console.error(name + ': failed to find buttons in the detail or associated record menu', {
			className,
		});
		return false;
	}
	if (!buttons) return false;

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
 * @returns {boolean} 操作成功時 true、検索範囲内に対象がない場合などは false
 */
const setFormBridgeButtonShown = (context, shown) =>
	_kvSetIntegrationButtonsShown(context, shown, '.kv-detail-fb-button', 'setFormBridgeButtonShown');

/**
 * 詳細ビュー内のPrintCreator連携ボタンを表示・非表示にします。
 * @param {Object} context view.detail.show または record.show のコンテキスト
 * @param {boolean} shown 表示する場合は true
 * @returns {boolean} 操作成功時 true、検索範囲内に対象がない場合などは false
 */
const setPrintCreatorButtonShown = (context, shown) =>
	_kvSetIntegrationButtonsShown(
		context,
		shown,
		'.kv-detail-pc-button',
		'setPrintCreatorButtonShown'
	);

/**
 * @param {Object} context getMainContentElement を持つコンテキスト
 * @param {string} staticCode 単一の静的コンテンツコード
 * @param {boolean} shown 表示状態を復元する場合 true
 * @returns {boolean} 全対象への適用成功時 true
 */
const setStaticContentShown = (context, staticCode, shown) => {
	const name = 'setStaticContentShown';
	if (
		!context ||
		typeof context !== 'object' ||
		Array.isArray(context) ||
		typeof staticCode !== 'string' ||
		!staticCode.trim() ||
		typeof shown !== 'boolean'
	) {
		_kvReportError(name, 'invalid arguments');
		return false;
	}
	let elements;
	try {
		if (typeof context.getMainContentElement !== 'function') {
			_kvReportError(name, 'context does not provide getMainContentElement');
			return false;
		}
		const root = context.getMainContentElement();
		if (!_kvIsElement(root)) {
			_kvReportError(name, 'main content element was not found');
			return false;
		}
		elements = [root, ...root.querySelectorAll('[data-static-code]')].filter(
			(element) => element.getAttribute('data-static-code') === staticCode
		);
	} catch {
		console.error(name + ': failed to acquire static content elements');
		return false;
	}
	if (elements.length === 0) {
		_kvReportError(name, 'no matching static content found in main content');
		return false;
	}
	let success = true;
	for (const element of elements) {
		try {
			_kvSetRestorableDisplay(element, shown, _KV_staticDisplayValues);
		} catch {
			console.error(name + ': failed to update static content display');
			success = false;
		}
	}
	return success;
};

/**
 * @param {string} recordCode kViewer のレコードコード
 * @returns {boolean} 既存リストビューから遷移指示を設定できた場合 true
 */
const redirectToRecordDetail = (recordCode) => {
	if (typeof recordCode !== 'string' || !recordCode.trim()) {
		_kvReportError('redirectToRecordDetail', 'recordCode must be a nonblank string');
		return false;
	}
	try {
		const location = window.location;
		if (
			!location ||
			typeof location.origin !== 'string' ||
			!location.origin ||
			typeof location.pathname !== 'string'
		) {
			_kvReportError('redirectToRecordDetail', 'current location API is unavailable');
			return false;
		}
		const path = location.pathname.replace(/\/+$/, '');
		location.href = location.origin + path + '/detail/' + encodeURIComponent(recordCode);
		return true;
	} catch {
		console.error('redirectToRecordDetail: failed to set detail navigation');
		return false;
	}
};

const _kvRollbackCopyPrint = (state) => {
	for (let index = state.cleanups.length - 1; index >= 0; index -= 1) {
		try {
			state.cleanups[index]();
			state.cleanups.splice(index, 1);
		} catch {
			console.error('installCopyPrintRestrictions: failed to clean up partial registration');
		}
	}
	return state.cleanups.length === 0;
};

/**
 * ページ全体の一部のコピー・印刷操作を抑止します。情報秘匿やOS操作の禁止ではありません。
 * @returns {boolean} 登録成功または既に登録済みの場合 true
 */
const installCopyPrintRestrictions = () => {
	const name = 'installCopyPrintRestrictions';
	let page;
	try {
		page = window.document;
		if (
			!page ||
			!page.head ||
			!_kvIsElement(page.body) ||
			typeof page.createElement !== 'function' ||
			typeof page.addEventListener !== 'function' ||
			typeof page.removeEventListener !== 'function' ||
			typeof window.addEventListener !== 'function' ||
			typeof window.removeEventListener !== 'function'
		) {
			_kvReportError(name, 'required DOM or event APIs are unavailable');
			return false;
		}
	} catch {
		console.error(name + ': failed to access page DOM');
		return false;
	}
	let state = _KV_copyPrintStates.get(page);
	if (state && state.installed) return true;
	if (state && !_kvRollbackCopyPrint(state)) return false;
	state = { installed: false, cleanups: [] };
	_KV_copyPrintStates.set(page, state);

	const savedDisplay = new WeakMap();
	let printingBody = null;
	const startPrint = () => {
		try {
			if (!printingBody) {
				if (!_kvIsElement(page.body)) throw new Error('body unavailable');
				printingBody = page.body;
			}
			_kvSetRestorableDisplay(printingBody, false, savedDisplay);
		} catch {
			console.error(name + ': failed to hide page for printing');
		}
	};
	const endPrint = () => {
		try {
			if (printingBody) {
				_kvSetRestorableDisplay(printingBody, true, savedDisplay);
				printingBody = null;
			}
		} catch {
			console.error(name + ': failed to restore page after printing');
		}
	};
	const preventDefault = (event) => event.preventDefault();
	const preventKeys = (event) => {
		if (
			((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'p') ||
			event.key === 'PrintScreen'
		) {
			event.preventDefault();
			event.stopPropagation();
		}
	};
	const listen = (target, type, handler) => {
		state.cleanups.push(() => target.removeEventListener(type, handler, true));
		target.addEventListener(type, handler, true);
	};
	state.cleanups.push(() => {
		if (printingBody) {
			_kvSetRestorableDisplay(printingBody, true, savedDisplay);
			printingBody = null;
		}
	});
	try {
		listen(page, 'contextmenu', preventDefault);
		listen(page, 'selectstart', preventDefault);
		listen(page, 'keydown', preventKeys);
		listen(window, 'beforeprint', startPrint);
		listen(window, 'afterprint', endPrint);

		if (typeof window.matchMedia === 'function') {
			const media = window.matchMedia('print');
			const change = (event) => {
				try {
					if (event.matches) startPrint();
					else endPrint();
				} catch {
					console.error(name + ': failed to process print media notification');
				}
			};
			if (
				media &&
				typeof media.addEventListener === 'function' &&
				typeof media.removeEventListener === 'function'
			) {
				state.cleanups.push(() => media.removeEventListener('change', change));
				media.addEventListener('change', change);
			} else if (
				media &&
				typeof media.addListener === 'function' &&
				typeof media.removeListener === 'function'
			) {
				state.cleanups.push(() => media.removeListener(change));
				media.addListener(change);
			} else {
				_kvReportError(name, 'optional print media change API is unavailable');
			}
		} else {
			_kvReportError(name, 'optional matchMedia API is unavailable');
		}

		const style = page.createElement('style');
		style.textContent = '@media print { body { display: none !important; } }';
		state.cleanups.push(() => {
			if (style.parentNode) style.parentNode.removeChild(style);
		});
		page.head.appendChild(style);
		state.installed = true;
		return true;
	} catch {
		console.error(name + ': registration failed');
		_kvRollbackCopyPrint(state);
		return false;
	}
};

if (typeof window !== 'undefined') {
	window.createDependencyChecker = createDependencyChecker;
	window.getFieldValueOr = getFieldValueOr;
	window.setFieldShown = setFieldShown;
	window.setFormBridgeButtonShown = setFormBridgeButtonShown;
	window.setPrintCreatorButtonShown = setPrintCreatorButtonShown;
	window.installCopyPrintRestrictions = installCopyPrintRestrictions;
	window.redirectToRecordDetail = redirectToRecordDetail;
	window.setStaticContentShown = setStaticContentShown;
}
