/** kintone内でよく使われる処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_kc_)で始める
/* exported notifyError, getFieldValueOr, kintoneEventOn, notifyInfo, notifyWarning, showYesNoDialog, showInputDialog, setRecordValues, setSpaceFieldButton, setSpaceFieldText, setHeaderMenuSpaceButton, setRecordHeaderMenuSpaceButton, setRecordHeaderMenuSpaceText */

// 共通定数
/**
 * ダイアログ表示の際に使用するアイコンが格納されている URLのベースパス
 * @constant {string} _KC_ASSET_BASE - アイコン画像のベースURL
 */
const _KC_ASSET_BASE = 'https://js.kacsw.or.jp/image';

const _kc_isMobilePath = () => {
	return (
		typeof location !== 'undefined' &&
		typeof location.pathname === 'string' &&
		/\/k\/m\//.test(location.pathname)
	);
};

/**
 * 内部: 実行環境（PC/モバイル）に応じた app 名前空間を返す
 * @returns {Object|null} app 名前空間、取得できない場合は null
 */
const _kc_getAppNamespace = () => {
	try {
		const pcApp = kintone.app || null;
		const mobileApp = kintone.mobile && kintone.mobile.app ? kintone.mobile.app : null;
		const isMobilePath =
			typeof location !== 'undefined' && typeof location.pathname === 'string'
				? /\/k\/m\//.test(location.pathname)
				: false;

		if (isMobilePath && mobileApp) return mobileApp;
		if (pcApp) return pcApp;
		if (mobileApp) return mobileApp;
		return null;
	} catch {
		return null;
	}
};

/**
 * 内部: 実行環境（PC/モバイル）に応じた app.record 名前空間を返す
 * @returns {Object|null} app.record 名前空間、取得できない場合は null
 */
const _kc_getRecordNamespace = () => {
	try {
		if (typeof kintone === 'undefined' || !kintone) return null;
		const pcRecord = kintone.app && kintone.app.record ? kintone.app.record : null;
		const mobileRecord =
			kintone.mobile && kintone.mobile.app && kintone.mobile.app.record
				? kintone.mobile.app.record
				: null;
		const preferredApp = _kc_getAppNamespace();
		const preferredRecord = preferredApp && preferredApp.record ? preferredApp.record : null;
		const fallbackRecord = preferredRecord === pcRecord ? mobileRecord : pcRecord;
		if (preferredRecord && typeof preferredRecord.getSpaceElement === 'function') {
			return preferredRecord;
		}
		if (fallbackRecord && typeof fallbackRecord.getSpaceElement === 'function') {
			return fallbackRecord;
		}
		if (preferredRecord) return preferredRecord;
		if (fallbackRecord) return fallbackRecord;
		return null;
	} catch {
		return null;
	}
};

// 内部関数
/**
 * HTML文字列をサニタイズして安全な HTML を返します。
 * - フォールバックとして script 要素や on* 属性、javascript: URL を除去します。
 * - 最終的に失敗した場合はエスケープしたプレーンテキストを返します。
 *
 * @param {string} html サニタイズ対象の HTML 文字列（null/非文字列でも許容し String() で扱います）
 * @returns {string} サニタイズ済の HTML 文字列
 */
const _kc_sanitizeHtml = (html) => {
	// フォールバック: 単純なサニタイズ（スクリプトタグ除去・on* 属性除去）
	// 完全な保護を約束するものではありません
	try {
		const template = document.createElement('template');
		template.innerHTML = html;
		// remove script elements
		const scripts = template.content.querySelectorAll('script');
		scripts.forEach((s) => s.remove());
		// remove on* attributes
		const walker = document.createTreeWalker(
			template.content,
			NodeFilter.SHOW_ELEMENT,
			null,
			false
		);
		let node = walker.nextNode();
		while (node) {
			[...node.attributes].forEach((attr) => {
				if (/^on/i.test(attr.name)) {
					node.removeAttribute(attr.name);
				}
				// javascript: URL を除去
				if (/^href$|^src$/i.test(attr.name) && /javascript:\s*/i.test(attr.value)) {
					node.removeAttribute(attr.name);
				}
			});
			node = walker.nextNode();
		}
		return template.innerHTML;
	} catch {
		// 最後の手段: プレーンテキストにして挿入
		const tmp = document.createElement('div');
		tmp.textContent = html;
		return tmp.innerHTML;
	}
};

const _kc_createTextBody = (message, allowHtml, className) => {
	const body = document.createElement('div');
	if (className) body.className = className;
	if (allowHtml) {
		body.innerHTML = _kc_sanitizeHtml(message);
	} else {
		body.textContent = String(message);
	}
	return body;
};

const _kc_isSupportedInputType = (type) => {
	return ['text', 'number', 'date', 'textarea'].indexOf(type) !== -1;
};

const _kc_normalizeInputField = (field, index) => {
	if (!field || typeof field !== 'object') return null;
	const name = typeof field.name === 'string' ? field.name.trim() : '';
	if (!name) return null;
	const type = typeof field.type === 'string' ? field.type.trim().toLowerCase() : 'text';
	if (!_kc_isSupportedInputType(type)) return null;
	const label =
		typeof field.label === 'string' && field.label.trim()
			? field.label
			: '入力' + String(index + 1);
	return {
		name,
		label,
		type,
		value: field.value === undefined || field.value === null ? '' : String(field.value),
		placeholder:
			typeof field.placeholder === 'string' && field.placeholder.trim() ? field.placeholder : '',
		required: field.required === true,
		min: field.min,
		max: field.max,
		step: field.step,
		maxLength:
			typeof field.maxLength === 'number' &&
			Number.isInteger(field.maxLength) &&
			field.maxLength >= 0
				? field.maxLength
				: undefined,
		pattern: typeof field.pattern === 'string' && field.pattern.trim() ? field.pattern : undefined,
		patternMessage:
			typeof field.patternMessage === 'string' && field.patternMessage.trim()
				? field.patternMessage
				: undefined,
	};
};

const _kc_createInputControl = (field) => {
	const input = document.createElement(field.type === 'textarea' ? 'textarea' : 'input');
	if (field.type !== 'textarea') {
		input.type = field.type;
	}
	input.name = field.name;
	input.value = field.value;
	input.placeholder = field.placeholder;
	input.required = field.required;
	input.className = 'kc-input-dialog__control';
	input.style.width = '100%';
	input.style.boxSizing = 'border-box';
	input.style.marginTop = '4px';
	if (field.type === 'textarea') {
		input.rows = 4;
	}
	if (field.min !== undefined) input.min = String(field.min);
	if (field.max !== undefined) input.max = String(field.max);
	if (field.step !== undefined) input.step = String(field.step);
	if (field.maxLength !== undefined) input.maxLength = field.maxLength;
	if (field.pattern !== undefined && field.type !== 'textarea') input.pattern = field.pattern;
	return input;
};

const _kc_matchesPattern = (value, pattern) => {
	if (typeof pattern !== 'string' || !pattern) return true;
	try {
		return new RegExp(pattern).test(value);
	} catch {
		return true;
	}
};

const _kc_createInputDialogBody = (description, allowHtml, fields) => {
	const body = document.createElement('div');
	body.className = 'kc-input-dialog';
	body.style.display = 'flex';
	body.style.flexDirection = 'column';
	body.style.gap = '12px';
	body.style.padding = '8px 12px';
	body.style.boxSizing = 'border-box';

	if (typeof description === 'string' && description) {
		const descriptionElement = _kc_createTextBody(
			description,
			allowHtml,
			'kc-input-dialog__description'
		);
		descriptionElement.style.margin = '0';
		body.appendChild(descriptionElement);
	}

	fields.forEach((field) => {
		const fieldWrapper = document.createElement('label');
		fieldWrapper.className = 'kc-input-dialog__field';
		fieldWrapper.style.display = 'block';

		const labelText = document.createElement('div');
		labelText.className = 'kc-input-dialog__label';
		labelText.textContent = field.label;
		fieldWrapper.appendChild(labelText);
		fieldWrapper.appendChild(_kc_createInputControl(field));
		body.appendChild(fieldWrapper);
	});

	return body;
};

const _kc_isValidNumberString = (value) => {
	if (typeof value !== 'string') return false;
	const trimmed = value.trim();
	if (!trimmed) return false;
	if (!/^[+-]?(?:\d+\.\d+|\d+|\.\d+)$/.test(trimmed)) return false;
	const numericValue = Number(trimmed);
	return Number.isFinite(numericValue);
};

const _kc_isValidDateString = (value) => {
	if (typeof value !== 'string') return false;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
};

const _kc_normalizeDateInput = (value) => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	const compactDigits = trimmed.replace(/[０-９]/g, (char) =>
		String.fromCharCode(char.charCodeAt(0) - 0xfee0)
	);
	const compactMatch = compactDigits.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (compactMatch) {
		return [compactMatch[1], compactMatch[2], compactMatch[3]].join('-');
	}
	const normalized = trimmed
		.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
		.replace(/[年月/.]/g, '-')
		.replace(/日/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (!match) return null;
	return [match[1], match[2].padStart(2, '0'), match[3].padStart(2, '0')].join('-');
};

const _kc_collectInputDialogResult = (body, fields) => {
	return fields.reduce(
		(result, field) => {
			const input = body.querySelector('[name="' + field.name + '"]');
			if (!input) {
				result.values[field.name] = null;
				result.errors[field.name] = '入力欄を取得できませんでした。';
				return result;
			}

			const rawValue = typeof input.value === 'string' ? input.value : '';
			const trimmedValue = rawValue.trim();

			if (!trimmedValue) {
				if (field.required) {
					result.errors[field.name] = 'この項目は必須です。';
				}
				result.values[field.name] = null;
				return result;
			}

			if (field.type === 'number') {
				if (!_kc_isValidNumberString(trimmedValue)) {
					result.errors[field.name] = '数値を入力してください。';
					result.values[field.name] = null;
					return result;
				}
				const numericValue = Number(trimmedValue);
				if (field.min !== undefined && numericValue < Number(field.min)) {
					result.errors[field.name] = String(field.min) + '以上の数値を入力してください。';
					result.values[field.name] = null;
					return result;
				}
				if (field.max !== undefined && numericValue > Number(field.max)) {
					result.errors[field.name] = String(field.max) + '以下の数値を入力してください。';
					result.values[field.name] = null;
					return result;
				}
				result.values[field.name] = numericValue;
				return result;
			}

			if (field.type === 'date') {
				const normalizedDateValue = _kc_normalizeDateInput(trimmedValue);
				if (!normalizedDateValue || !_kc_isValidDateString(normalizedDateValue)) {
					result.errors[field.name] = '日付を確認してください。例: 2026-06-18、20260618';
					result.values[field.name] = null;
					return result;
				}
				if (input.value !== normalizedDateValue) {
					input.value = normalizedDateValue;
				}
				if (field.min !== undefined && normalizedDateValue < String(field.min)) {
					result.errors[field.name] = String(field.min) + '以降の日付を入力してください。';
					result.values[field.name] = null;
					return result;
				}
				if (field.max !== undefined && normalizedDateValue > String(field.max)) {
					result.errors[field.name] = String(field.max) + '以前の日付を入力してください。';
					result.values[field.name] = null;
					return result;
				}
				result.values[field.name] = normalizedDateValue;
				return result;
			}

			if (field.maxLength !== undefined && rawValue.length > field.maxLength) {
				result.errors[field.name] = String(field.maxLength) + '文字以内で入力してください。';
				result.values[field.name] = null;
				return result;
			}

			if (!_kc_matchesPattern(rawValue, field.pattern)) {
				result.errors[field.name] = field.patternMessage || '入力形式を確認してください。';
				result.values[field.name] = null;
				return result;
			}

			result.values[field.name] = rawValue;
			return result;
		},
		{ values: {}, errors: {} }
	);
};

const _kc_formatInputDialogErrors = (errors, fields) => {
	const fieldLabelMap = fields.reduce((map, field) => {
		map[field.name] = field.label;
		return map;
	}, {});
	const lines = ['入力内容を確認してください。'];
	Object.keys(errors).forEach((fieldName) => {
		const label = fieldLabelMap[fieldName] || fieldName;
		lines.push(label + ': ' + errors[fieldName]);
	});
	return lines.join('\n');
};

const _kc_focusFirstInvalidInput = (body, fields, errors) => {
	if (!body || !errors || typeof errors !== 'object') return;
	const firstInvalidField = fields.find((field) =>
		Object.prototype.hasOwnProperty.call(errors, field.name)
	);
	if (!firstInvalidField) return;
	const input = body.querySelector('[name="' + firstInvalidField.name + '"]');
	if (input && typeof input.focus === 'function') {
		try {
			input.focus();
		} catch {
			// noop
		}
	}
};

/**
 * 内部: ダイアログ作成＆表示の共通ロジック
 * options: {
 *   title: string,
 *   body: HTMLElement,
 * }
 */
const _kc_showDialog = (options) => {
	if (!options || typeof options !== 'object') return Promise.resolve(undefined);
	const {
		title,
		body,
		showOkButton = true,
		okButtonText = '閉じる',
		showCancelButton = false,
		cancelButtonText = '',
		showCloseButton = false,
		beforeClose = () => {
			return;
		},
		okAriaLabel,
	} = options;
	const config = {
		title: String(title || ''),
		body: body,
		showOkButton: showOkButton,
		okButtonText: String(okButtonText || ''),
		showCancelButton: showCancelButton,
		cancelButtonText: String(cancelButtonText || ''),
		showCloseButton: showCloseButton,
		beforeClose: typeof beforeClose === 'function' ? beforeClose : () => {},
	};

	try {
		const isMobilePath = _kc_isMobilePath();
		const isMobileBottomSheetAvailable =
			isMobilePath &&
			typeof kintone !== 'undefined' &&
			kintone.mobile &&
			typeof kintone.mobile.createBottomSheet === 'function';
		const createUi = () => {
			if (isMobileBottomSheetAvailable) {
				return kintone.mobile.createBottomSheet(config);
			}
			if (typeof kintone !== 'undefined' && kintone.createDialog) {
				return kintone.createDialog(config);
			}
			return null;
		};
		const dialog = createUi();
		const setOkAriaLabel = (dialogObj) => {
			try {
				const container = dialogObj.element || dialogObj.dialog || dialogObj.container || null;
				if (container) {
					const okBtn = container.querySelector('button.kintone-dialog-ok-button, button');
					if (okBtn) {
						okBtn.setAttribute('aria-label', String(okAriaLabel || okButtonText || 'OK'));
					}
				}
			} catch {
				// noop
			}
		};
		const showUi = (object) => {
			if (!object || typeof object.show !== 'function') return Promise.resolve(undefined);
			try {
				const showResult = object.show();
				setOkAriaLabel(object);
				return Promise.resolve(showResult).catch((error) => {
					console.error('ダイアログ/ボトムシート表示中にエラー:', error);
					return undefined;
				});
			} catch (error) {
				console.error('ダイアログ/ボトムシート表示中にエラー:', error);
				return Promise.resolve(undefined);
			}
		};
		if (dialog && typeof dialog.then === 'function') {
			return dialog
				.then((object) => {
					return showUi(object);
				})
				.catch((error) => {
					console.error('ダイアログ表示中にエラー:', error);
					return undefined;
				});
		} else if (dialog && typeof dialog.show === 'function') {
			return showUi(dialog);
		}
		return Promise.resolve(undefined);
	} catch (error) {
		console.error('_kc_showDialog error', error);
		try {
			alert(body && body.textContent ? body.textContent : String(title));
		} catch {
			/* noop */
		}
		return Promise.resolve(undefined);
	}
};

const _kc_showConfirmChoice = async (message, title, options) => {
	const dialogTitle = typeof title === 'string' && title ? title : '確認';
	const config = options && typeof options === 'object' ? options : {};
	const yesText = typeof config.yesText === 'string' && config.yesText ? config.yesText : 'はい';
	const noText = typeof config.noText === 'string' && config.noText ? config.noText : 'いいえ';
	const allowHtml = config.allowHtml === true;

	try {
		if (
			_kc_isMobilePath() &&
			typeof kintone !== 'undefined' &&
			kintone.mobile &&
			typeof kintone.mobile.showConfirmBottomSheet === 'function'
		) {
			const result = await kintone.mobile.showConfirmBottomSheet({
				title: dialogTitle,
				body: String(message),
				okButtonText: yesText,
				showCancelButton: true,
				cancelButtonText: noText,
			});
			return result === 'OK';
		}
		if (typeof kintone !== 'undefined' && typeof kintone.showConfirmDialog === 'function') {
			const result = await kintone.showConfirmDialog({
				title: dialogTitle,
				body: String(message),
				okButtonText: yesText,
				showCancelButton: true,
				cancelButtonText: noText,
			});
			return result === 'OK';
		}
	} catch (error) {
		console.error('確認ダイアログ表示中にエラー:', error);
	}

	const fallbackBody = _kc_createTextBody(message, allowHtml, 'kc-confirm-dialog__message');
	fallbackBody.style.padding = '8px 12px';
	fallbackBody.style.boxSizing = 'border-box';
	const action = await _kc_showDialog({
		title: dialogTitle,
		body: fallbackBody,
		showOkButton: true,
		okButtonText: yesText,
		showCancelButton: true,
		cancelButtonText: noText,
		okAriaLabel: yesText,
	});
	if (action !== undefined) {
		return action === 'OK';
	}
	try {
		return confirm(String(message));
	} catch {
		return false;
	}
};

// 公開: kintone 側から直接呼び出すための公開はファイル末尾で行います。

// ここから外部に公開する関数群
/**
 * エラーをユーザーに通知するダイアログを表示します。
 * - kintone.createDialog を使ってカスタムダイアログを表示します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 * - notifyInfo/notifyWarning と同様に共通ロジックを利用します。
 *
 * @param {string|Node} message 表示するメッセージ（文字列が想定）。Node を渡す場合はそのまま挿入されます。
 * @param {string} [title='エラー'] ダイアログのタイトル
 * @param {boolean} [allowHtml=false] メッセージを HTML として挿入するか（サニタイズされます）
 * @returns {Promise<string|undefined>} ダイアログ終了時の操作種別（OK/CANCEL/CLOSE/FUNCTION など）
 */
const notifyError = (message, title = 'エラー', allowHtml = false) => {
	const body = document.createElement('div');
	// class 名を付与してスタイルやテストを容易にする
	body.className = 'kc-notify-error';
	// アクセシビリティ: アラートダイアログとして扱う
	body.setAttribute('role', 'alertdialog');
	body.style.display = 'flex';
	body.style.alignItems = 'center';
	body.style.gap = '1em';
	body.style.margin = '1em';
	const errorImage = document.createElement('img');
	errorImage.src = _KC_ASSET_BASE + '/error-icon.png';
	errorImage.alt = 'エラーアイコン';
	errorImage.style.width = '32px';
	errorImage.style.height = '32px';
	// 装飾的な画像はスクリーンリーダーから隠す
	errorImage.setAttribute('aria-hidden', 'true');
	body.appendChild(errorImage);
	const errorText = document.createElement('div');
	// 読み上げ優先度: 即時読み上げが望ましいため assertive に設定
	errorText.setAttribute('role', 'status');
	errorText.setAttribute('aria-live', 'assertive');
	errorText.className = 'kc-notify-error__message';
	// 参照用 id を付与して dialog に関連付けられるようにする
	const messageId = 'kc-notify-error__message-' + Math.random().toString(36).slice(2, 8);
	errorText.id = messageId;
	if (allowHtml) {
		// HTML を許可する場合のみサニタイズ済の HTML を挿入
		errorText.innerHTML = _kc_sanitizeHtml(message);
	} else {
		// デフォルトはプレーンテキストとして表示（XSS リスク低減）
		errorText.textContent = String(message);
	}
	body.appendChild(errorText);
	// ダイアログにタイトルをラベルとして与える。aria-describedby で本文を参照。
	body.setAttribute('aria-label', String(title));
	body.setAttribute('aria-describedby', messageId);
	// 共通処理でダイアログ表示
	return _kc_showDialog({ title, body });
};

/**
 * getFieldValueOr - record から指定フィールドの value を安全に取得します。
 * - record が null/非オブジェクト、fieldCode が文字列でない場合は defaultValue を返します。
 * - 指定フィールドが存在しない、または value が undefined の場合は defaultValue を返します。
 * - defaultValue を省略した場合は undefined が返ります。
 *
 * @param {Object} record kintone の record オブジェクト想定
 * @param {string} fieldCode 取得するフィールドのフィールドコード
 * @param {*} [defaultValue] フィールドが無ければ返す既定値（省略可能）
 * @returns {*} フィールドの value または defaultValue
 */
const getFieldValueOr = (record, fieldCode, defaultValue) => {
	try {
		if (typeof fieldCode !== 'string' || !fieldCode.trim()) {
			console.warn('getFieldValueOr: invalid fieldCode', { fieldCode });
			return defaultValue;
		}
		if (typeof record !== 'object' || record === null || Array.isArray(record)) {
			console.warn('getFieldValueOr: invalid record', { record });
			return defaultValue;
		}
		const field = Object.prototype.hasOwnProperty.call(record, fieldCode)
			? record[fieldCode]
			: undefined;
		if (!field || typeof field !== 'object') {
			return defaultValue;
		}
		// value が存在する場合はそのまま返す（null や空文字も有効値として返す）
		if (Object.prototype.hasOwnProperty.call(field, 'value')) {
			return field.value;
		}
		return defaultValue;
	} catch (error) {
		console.error('getFieldValueOr: unexpected error', {
			error,
			record,
			fieldCode,
		});
		return defaultValue;
	}
};

/**
 * kintoneEventOn - kintone のイベント登録ラッパー
 * - 引数チェックを行い、登録成功で true、失敗で false を返します。
 * @param {string|string[]} events イベント名またはイベント名配列
 * @param {function} handler イベントハンドラ関数
 * @returns {boolean} 登録に成功したら true、入力が不正な場合は false
 */
const kintoneEventOn = (events, handler) => {
	// basic validation
	const isValidEvents =
		typeof events === 'string' ||
		(Array.isArray(events) && events.every((e) => typeof e === 'string'));
	if (!isValidEvents || typeof handler !== 'function') {
		console.warn('kintoneEventOn: invalid arguments', { events, handler });
		return false;
	}

	try {
		kintone.events.on(events, (event) => {
			try {
				return handler(event);
			} catch (error) {
				console.error('kintone event handler error', { events, error });
				try {
					notifyError(
						'システムエラーが発生しました。詳細はコンソールを確認してください。',
						undefined,
						true
					);
				} catch {}
				return event;
			}
		});
		return true;
	} catch (error) {
		console.error('kintoneEventOn: failed to register events', {
			events,
			error,
		});
		return false;
	}
};

/**
 * 情報をユーザーに通知するダイアログを表示します。
 * - kintone.createDialog を使ってカスタムダイアログを表示します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 * - notifyError/notifyWarning と同様に共通ロジックを利用します。
 *
 * @param {string|Node} message 表示するメッセージ（文字列が想定）。Node を渡す場合はそのまま挿入されます。
 * @param {string} [title='情報'] ダイアログのタイトル
 * @param {boolean} [allowHtml=false] メッセージを HTML として挿入するか（サニタイズされます）
 * @returns {Promise<string|undefined>} ダイアログ終了時の操作種別（OK/CANCEL/CLOSE/FUNCTION など）
 */
const notifyInfo = (message, title = '情報', allowHtml = false) => {
	const body = document.createElement('div');
	body.className = 'kc-notify-info';
	body.setAttribute('role', 'alertdialog');
	body.style.display = 'flex';
	body.style.alignItems = 'center';
	body.style.gap = '1em';
	body.style.margin = '1em';

	const infoImage = document.createElement('img');
	infoImage.src = _KC_ASSET_BASE + '/info-icon.png';
	infoImage.alt = '情報アイコン';
	infoImage.style.width = '32px';
	infoImage.style.height = '32px';
	infoImage.setAttribute('aria-hidden', 'true');
	body.appendChild(infoImage);

	const infoText = document.createElement('div');
	infoText.setAttribute('role', 'status');
	infoText.setAttribute('aria-live', 'polite');
	infoText.className = 'kc-notify-info__message';
	const messageId = 'kc-notify-info__message-' + Math.random().toString(36).slice(2, 8);
	infoText.id = messageId;
	if (allowHtml) {
		infoText.innerHTML = _kc_sanitizeHtml(message);
	} else {
		infoText.textContent = String(message);
	}
	body.appendChild(infoText);
	body.setAttribute('aria-label', String(title));
	body.setAttribute('aria-describedby', messageId);

	return _kc_showDialog({ title, body });
};

/**
 * 注意をユーザーに通知するダイアログを表示します。
 * - kintone.createDialog を使ってカスタムダイアログを表示します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 * - notifyError/notifyWarning と同様に共通ロジックを利用します。
 *
 * @param {string|Node} message 表示するメッセージ（文字列が想定）。Node を渡す場合はそのまま挿入されます。
 * @param {string} [title='注意'] ダイアログのタイトル
 * @param {boolean} [allowHtml=false] メッセージを HTML として挿入するか（サニタイズされます）
 * @returns {Promise<string|undefined>} ダイアログ終了時の操作種別（OK/CANCEL/CLOSE/FUNCTION など）
 */
const notifyWarning = (message, title = '注意', allowHtml = false) => {
	const body = document.createElement('div');
	body.className = 'kc-notify-warning';
	body.setAttribute('role', 'alertdialog');
	body.style.display = 'flex';
	body.style.alignItems = 'center';
	body.style.gap = '1em';
	body.style.margin = '1em';

	const warnImage = document.createElement('img');
	warnImage.src = _KC_ASSET_BASE + '/warning-icon.png';
	warnImage.alt = '注意アイコン';
	warnImage.style.width = '32px';
	warnImage.style.height = '32px';
	warnImage.setAttribute('aria-hidden', 'true');
	body.appendChild(warnImage);

	const warnText = document.createElement('div');
	warnText.setAttribute('role', 'status');
	warnText.setAttribute('aria-live', 'polite');
	warnText.className = 'kc-notify-warning__message';
	const messageId = 'kc-notify-warning__message-' + Math.random().toString(36).slice(2, 8);
	warnText.id = messageId;
	if (allowHtml) {
		warnText.innerHTML = _kc_sanitizeHtml(message);
	} else {
		warnText.textContent = String(message);
	}
	body.appendChild(warnText);
	body.setAttribute('aria-label', String(title));
	body.setAttribute('aria-describedby', messageId);
	// 共通処理でダイアログ表示
	return _kc_showDialog({ title, body });
};

/**
 * 「はい / いいえ」などの2択確認ダイアログを表示します。
 * - PC では kintone.showConfirmDialog、モバイルでは kintone.mobile.showConfirmBottomSheet を優先します。
 * - 利用できない場合は createDialog ベースの共通ダイアログにフォールバックします。
 *
 * @param {string} message 確認メッセージ
 * @param {string} [title='確認'] ダイアログのタイトル
 * @param {Object} [options] 表示オプション
 * @param {string} [options.yesText='はい'] OK 側ボタンの表示ラベル
 * @param {string} [options.noText='いいえ'] キャンセル側ボタンの表示ラベル
 * @param {boolean} [options.allowHtml=false] フォールバック表示時に message を HTML として扱うか
 * @returns {Promise<boolean>} 「はい」相当なら true、それ以外は false
 */
const showYesNoDialog = (message, title = '確認', options) => {
	return _kc_showConfirmChoice(message, title, options);
};

/**
 * 入力フォーム付きダイアログを表示します。
 * - text / number / date / textarea の入力欄を宣言的に構築します。
 * - OK 押下時に入力値を検証し、エラーがあればダイアログを閉じずに notifyError を表示します。
 * - 結果は { action, values } 形式で返します。
 *
 * @param {Object} options 表示オプション
 * @param {string} [options.title='入力'] ダイアログのタイトル
 * @param {string} [options.description=''] ダイアログ先頭の補足説明
 * @param {boolean} [options.allowHtml=false] description を HTML として扱うか
 * @param {string} [options.okButtonText='OK'] OK ボタンラベル
 * @param {string} [options.cancelButtonText='キャンセル'] キャンセルボタンラベル
 * @param {Array<Object>} options.fields 入力欄定義の配列
 * @returns {Promise<{action: string|undefined, values: Object|null}|undefined>} 実行結果
 */
const showInputDialog = async (options) => {
	if (!options || typeof options !== 'object') return undefined;
	const normalizedFields = Array.isArray(options.fields)
		? options.fields
				.map((field, index) => _kc_normalizeInputField(field, index))
				.filter((field) => !!field)
		: [];
	if (!normalizedFields.length) {
		console.warn('showInputDialog: fields are required');
		return undefined;
	}

	const title = typeof options.title === 'string' && options.title ? options.title : '入力';
	const okButtonText =
		typeof options.okButtonText === 'string' && options.okButtonText ? options.okButtonText : 'OK';
	const cancelButtonText =
		typeof options.cancelButtonText === 'string' && options.cancelButtonText
			? options.cancelButtonText
			: 'キャンセル';
	const body = _kc_createInputDialogBody(
		typeof options.description === 'string' ? options.description : '',
		options.allowHtml === true,
		normalizedFields
	);
	let validatedValues = null;
	const action = await _kc_showDialog({
		title,
		body,
		showOkButton: true,
		okButtonText,
		showCancelButton: true,
		cancelButtonText,
		okAriaLabel: okButtonText,
		beforeClose: async (dialogAction) => {
			if (dialogAction !== 'OK') {
				return true;
			}
			const collected = _kc_collectInputDialogResult(body, normalizedFields);
			if (Object.keys(collected.errors).length > 0) {
				validatedValues = null;
				await notifyError(
					_kc_formatInputDialogErrors(collected.errors, normalizedFields),
					'入力エラー',
					false
				);
				_kc_focusFirstInvalidInput(body, normalizedFields, collected.errors);
				return false;
			}
			validatedValues = collected.values;
			return true;
		},
	});
	if (action !== 'OK') {
		return {
			action,
			values: null,
		};
	}
	return {
		action,
		values: validatedValues,
	};
};

/**
 * kintone のレコード一覧のメニューの右側にボタン要素を追加または削除します。
 * - 既存の同 ID の要素は常に削除されます。
 * - 追加時は type="button" として作成し、onClick が関数であれば click イベントを登録します。
 * - ボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。
 * - kintone のデザインと調和したボタン外観にするには、アプリに「51-modern-default」スタイルシートを
 *   適用してください。
 *
 * @param {string} id 追加するボタン要素の id
 * @param {string|null} textContent ボタンの表示テキスト。null/空なら要素を削除して非表示にする
 * @param {function|null|undefined} [onClick] クリック時に実行するコールバック（関数でない場合は無視される）
 * @param {Object|null|undefined} [styleOptions] ボタンのスタイル指定（省略時は標準スタイル）
 * @param {string} [styleOptions.width] ボタンの幅（例: '120px', '100%'）
 * @param {string} [styleOptions.marginLeft] 左余白（例: '8px', '0.5rem'）
 * @param {string} [styleOptions.marginRight] 右余白（例: '8px', '0.5rem'）
 * @param {string} [styleOptions.horizontalMargin] 左右余白（後方互換用。marginLeft/marginRight が未指定の側に適用）
 * @returns {boolean|undefined} 要素の追加/削除に成功したら true/false を返します。入力が不正な場合は undefined を返すことがあります。
 */
const setHeaderMenuSpaceButton = (id, textContent, onClick, styleOptions) => {
	if (
		typeof id !== 'string' ||
		!id.trim() ||
		(textContent !== null && typeof textContent !== 'string') ||
		(onClick !== undefined && typeof onClick !== 'function' && onClick !== null) ||
		(styleOptions !== undefined && styleOptions !== null && typeof styleOptions !== 'object')
	) {
		return;
	}
	// 既存ボタン削除
	const buttonElementById = document.getElementById(id);
	if (buttonElementById) {
		buttonElementById.remove();
	}
	if (textContent) {
		// ボタン追加
		const button = document.createElement('button');
		// フォーム内で誤って submit を引き起こさないように type を明示する
		button.type = 'button';
		button.className = 'kintoneplugin-button-normal';
		button.id = id;
		button.textContent = textContent;
		if (styleOptions && typeof styleOptions === 'object') {
			if (typeof styleOptions.width === 'string' && styleOptions.width.trim()) {
				button.style.width = styleOptions.width;
			}
			const hasHorizontalMargin =
				typeof styleOptions.horizontalMargin === 'string' && styleOptions.horizontalMargin.trim();
			if (typeof styleOptions.marginLeft === 'string' && styleOptions.marginLeft.trim()) {
				button.style.marginLeft = styleOptions.marginLeft;
			} else if (hasHorizontalMargin) {
				button.style.marginLeft = styleOptions.horizontalMargin;
			}
			if (typeof styleOptions.marginRight === 'string' && styleOptions.marginRight.trim()) {
				button.style.marginRight = styleOptions.marginRight;
			} else if (hasHorizontalMargin) {
				button.style.marginRight = styleOptions.horizontalMargin;
			}
		}
		if (typeof onClick === 'function') {
			button.addEventListener('click', onClick);
		}
		const appNamespace = kintone.app;
		const spaceElement =
			appNamespace && typeof appNamespace.getHeaderMenuSpaceElement === 'function'
				? appNamespace.getHeaderMenuSpaceElement(id)
				: null;
		if (!spaceElement) {
			console.warn('setHeaderMenuSpaceButton: space element not found', id);
			return false;
		}
		spaceElement.appendChild(button);
		return true;
	} else {
		// 非表示
		return true;
	}
};

/**
 * kintone のレコード詳細・追加・編集の各画面のメニューの上側にボタン要素を追加または削除します。
 * - 既存の同 ID の要素は常に削除されます。
 * - 追加時は type="button" として作成し、onClick が関数であれば click イベントを登録します。
 * - ボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。
 * - kintone のデザインと調和したボタン外観にするには、アプリに「51-modern-default」スタイルシートを
 *   適用してください。
 *
 * @param {string} id 追加するボタン要素の id
 * @param {string|null} textContent ボタンの表示テキスト。null/空なら要素を削除して非表示にする
 * @param {function|null|undefined} [onClick] クリック時に実行するコールバック（関数でない場合は無視される）
 * @param {Object|null|undefined} [styleOptions] ボタンのスタイル指定（省略時は標準スタイル）
 * @param {string} [styleOptions.width] ボタンの幅（例: '120px', '100%'）
 * @param {string} [styleOptions.marginLeft] 左余白（例: '8px', '0.5rem'）
 * @param {string} [styleOptions.marginRight] 右余白（例: '8px', '0.5rem'）
 * @param {string} [styleOptions.horizontalMargin] 左右余白（後方互換用。marginLeft/marginRight が未指定の側に適用）
 * @returns {boolean|undefined} 要素の追加/削除に成功したら true/false を返します。入力が不正な場合は undefined を返すことがあります。
 */
const setRecordHeaderMenuSpaceButton = (id, textContent, onClick, styleOptions) => {
	if (
		typeof id !== 'string' ||
		!id.trim() ||
		(textContent !== null && typeof textContent !== 'string') ||
		(onClick !== undefined && typeof onClick !== 'function' && onClick !== null) ||
		(styleOptions !== undefined && styleOptions !== null && typeof styleOptions !== 'object')
	) {
		return;
	}
	// 既存ボタン削除
	const buttonElementById = document.getElementById(id);
	if (buttonElementById) {
		buttonElementById.remove();
	}
	if (textContent) {
		// ボタン追加
		const button = document.createElement('button');
		// フォーム内で誤って submit を引き起こさないように type を明示する
		button.type = 'button';
		button.className = 'kintoneplugin-button-normal';
		button.id = id;
		button.textContent = textContent;
		if (styleOptions && typeof styleOptions === 'object') {
			if (typeof styleOptions.width === 'string' && styleOptions.width.trim()) {
				button.style.width = styleOptions.width;
			}
			const hasHorizontalMargin =
				typeof styleOptions.horizontalMargin === 'string' && styleOptions.horizontalMargin.trim();
			if (typeof styleOptions.marginLeft === 'string' && styleOptions.marginLeft.trim()) {
				button.style.marginLeft = styleOptions.marginLeft;
			} else if (hasHorizontalMargin) {
				button.style.marginLeft = styleOptions.horizontalMargin;
			}
			if (typeof styleOptions.marginRight === 'string' && styleOptions.marginRight.trim()) {
				button.style.marginRight = styleOptions.marginRight;
			} else if (hasHorizontalMargin) {
				button.style.marginRight = styleOptions.horizontalMargin;
			}
		}
		if (typeof onClick === 'function') {
			button.addEventListener('click', onClick);
		}
		const recordNamespace = kintone.app && kintone.app.record ? kintone.app.record : null;
		const spaceElement =
			recordNamespace && typeof recordNamespace.getHeaderMenuSpaceElement === 'function'
				? recordNamespace.getHeaderMenuSpaceElement(id)
				: null;
		if (!spaceElement) {
			console.warn('setRecordHeaderMenuSpaceButton: space element not found', id);
			return false;
		}
		spaceElement.appendChild(button);
		return true;
	} else {
		// 非表示
		return true;
	}
};

/**
 * kintone のレコード詳細・追加・編集の各画面のメニューの上側に任意の HTML 文字列を挿入して表示／削除します。
 * - 挿入時は既存の同 ID 要素を削除してから追加します。
 * - innerHTML は内部でサニタイズされます。
 *
 * @param {string} id 追加する要素の id（既存要素があれば上書きの代わりに削除して再作成）
 * @param {string|null} innerHTML 表示する HTML。null/空文字 の場合は要素を削除して非表示にする
 * @returns {boolean} 成功したら true、引数不正や要素未発見などで失敗したら false
 */
const setRecordHeaderMenuSpaceText = (id, innerHTML) => {
	if (
		typeof id !== 'string' ||
		!id.trim() ||
		(innerHTML !== null && typeof innerHTML !== 'string')
	) {
		console.warn('setRecordHeaderMenuSpaceText: invalid arguments', { id, innerHTML });
		return false;
	}
	// 既存要素削除
	const existing = document.getElementById(id);
	if (existing) existing.remove();

	if (innerHTML) {
		const createElement = () => {
			const el = document.createElement('div');
			el.id = id;
			el.innerHTML = _kc_sanitizeHtml(innerHTML);
			return el;
		};

		let appended = false;
		try {
			const recordNamespace = kintone.app && kintone.app.record ? kintone.app.record : null;
			const spaceElement =
				recordNamespace && typeof recordNamespace.getHeaderMenuSpaceElement === 'function'
					? recordNamespace.getHeaderMenuSpaceElement(id)
					: null;
			if (spaceElement) {
				const existingNow = document.getElementById(id);
				if (existingNow) existingNow.remove();
				spaceElement.appendChild(createElement());
				appended = true;
			}
		} catch {
			appended = false;
		}

		// 非同期リトライ
		const startRetryLoop = () => {
			const intervals = [50, 100, 200, 400, 800];
			let idx = 0;
			const tryOnce = () => {
				if (document.getElementById(id)) return;
				try {
					const recordNamespace = kintone.app && kintone.app.record ? kintone.app.record : null;
					const se =
						recordNamespace && typeof recordNamespace.getHeaderMenuSpaceElement === 'function'
							? recordNamespace.getHeaderMenuSpaceElement(id)
							: null;
					if (se) {
						if (!document.getElementById(id)) {
							se.appendChild(createElement());
						}
						return;
					}
				} catch {
					// ignore and retry
				}
				if (idx < intervals.length) {
					const wait = intervals[idx++];
					setTimeout(tryOnce, wait);
				}
			};
			setTimeout(tryOnce, 0);
		};
		startRetryLoop();

		return appended;
	} else {
		// 非表示（削除済みであれば成功）
		return true;
	}
};

/**
 * setRecordValues - record の複数フィールドに対して値を一括設定するユーティリティ
 * - 引数チェックを行い、成功時は true、失敗時は false を返します。
 * @param {Object} record 各フィールドの値（kintone の record オブジェクト想定）
 * @param {Object} values 設定するフィールド値のオブジェクト（キーがフィールドコード、値が設定値）
 * @returns {boolean} 成功したら true、入力が不正な場合は false
 */
const setRecordValues = (record, values) => {
	if (
		typeof record !== 'object' ||
		record === null ||
		Array.isArray(record) ||
		typeof values !== 'object' ||
		values === null
	) {
		console.warn('setRecordValues: invalid arguments', { record, values });
		return false;
	}
	Object.keys(values).forEach((k) => {
		// 既存フィールドがある場合は value に設定する（kintone フィールドオブジェクト想定）
		if (Object.prototype.hasOwnProperty.call(record, k)) {
			const fieldObj = record[k];
			if (fieldObj && typeof fieldObj === 'object') {
				if (Object.prototype.hasOwnProperty.call(fieldObj, 'value')) {
					fieldObj.value = values[k];
				} else {
					// オブジェクトだが value プロパティが無い場合は value を追加する
					fieldObj.value = values[k];
				}
			} else {
				// 原始値が入っている場合は上書き
				record[k] = values[k];
			}
		} else {
			// フィールドが存在しない場合は簡易フィールドオブジェクトを作成して value を設定する
			record[k] = { value: values[k] };
		}
	});
	return true;
};

/**
 * kintone のスペースフィールド（スペースエレメント）を表示/非表示に切り替えます。
 *
 * @param {string} spaceField スペースフィールドのフィールドコード
 * @param {boolean} display true=表示, false=非表示
 * @returns {boolean} 成功したら true、引数不正や要素が見つからなければ false
 */
const setSpaceFieldDisplay = (spaceField, display) => {
	if (typeof spaceField !== 'string' || !spaceField.trim() || typeof display !== 'boolean') {
		console.warn('setSpaceFieldDisplay: invalid arguments', {
			spaceField,
			display,
		});
		return false;
	}
	const recordNamespace = _kc_getRecordNamespace();
	const spaceElement =
		recordNamespace && typeof recordNamespace.getSpaceElement === 'function'
			? recordNamespace.getSpaceElement(spaceField)
			: null;
	if (!spaceElement) {
		console.warn('setSpaceFieldDisplay: space element not found', spaceField);
		return false;
	}
	spaceElement.parentNode.style.display = display ? '' : 'none';
	return true;
};

/**
 * kintone のスペースフィールドにボタン要素を追加または削除します。
 * - 既存の同 ID の要素は常に削除されます。
 * - 追加時は type="button" として作成し、onClick が関数であれば click イベントを登録します。
 * - ボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。
 * - kintone のデザインと調和したボタン外観にするには、アプリに「51-modern-default」スタイルシートを
 *   適用してください。
 *
 * @param {string} spaceField スペースフィールドのフィールドコード
 * @param {string} id 追加するボタン要素の id
 * @param {string|null} textContent ボタンの表示テキスト。null/空なら要素を削除して非表示にする
 * @param {function|null|undefined} [onClick] クリック時に実行するコールバック（関数でない場合は無視される）
 * @param {Object|null|undefined} [styleOptions] ボタンのスタイル指定（省略時は標準スタイル）
 * @param {string} [styleOptions.width] ボタンの幅（例: '120px', '100%'）
 * @param {string} [styleOptions.marginLeft] 左余白（例: '8px', '0.5rem'）
 * @param {string} [styleOptions.marginRight] 右余白（例: '8px', '0.5rem'）
 * @param {string} [styleOptions.horizontalMargin] 左右余白（後方互換用。marginLeft/marginRight が未指定の側に適用）
 * @returns {boolean|undefined} 要素の追加/削除に成功したら true/false を返します。入力が不正な場合は undefined を返すことがあります。
 */
const setSpaceFieldButton = (spaceField, id, textContent, onClick, styleOptions) => {
	if (
		typeof spaceField !== 'string' ||
		!spaceField.trim() ||
		typeof id !== 'string' ||
		!id.trim() ||
		(textContent !== null && typeof textContent !== 'string') ||
		(onClick !== undefined && typeof onClick !== 'function' && onClick !== null) ||
		(styleOptions !== undefined && styleOptions !== null && typeof styleOptions !== 'object')
	) {
		return;
	}
	// 既存ボタン削除
	const buttonElementById = document.getElementById(id);
	if (buttonElementById) {
		buttonElementById.remove();
	}
	if (textContent) {
		// ボタン追加
		const button = document.createElement('button');
		// フォーム内で誤って submit を引き起こさないように type を明示する
		button.type = 'button';
		button.className = 'kintoneplugin-button-normal';
		button.id = id;
		button.textContent = textContent;
		if (styleOptions && typeof styleOptions === 'object') {
			if (typeof styleOptions.width === 'string' && styleOptions.width.trim()) {
				button.style.width = styleOptions.width;
			}
			const hasHorizontalMargin =
				typeof styleOptions.horizontalMargin === 'string' && styleOptions.horizontalMargin.trim();
			if (typeof styleOptions.marginLeft === 'string' && styleOptions.marginLeft.trim()) {
				button.style.marginLeft = styleOptions.marginLeft;
			} else if (hasHorizontalMargin) {
				button.style.marginLeft = styleOptions.horizontalMargin;
			}
			if (typeof styleOptions.marginRight === 'string' && styleOptions.marginRight.trim()) {
				button.style.marginRight = styleOptions.marginRight;
			} else if (hasHorizontalMargin) {
				button.style.marginRight = styleOptions.horizontalMargin;
			}
		}
		if (typeof onClick === 'function') {
			button.addEventListener('click', onClick);
		}
		const recordNamespace = _kc_getRecordNamespace();
		const spaceElement =
			recordNamespace && typeof recordNamespace.getSpaceElement === 'function'
				? recordNamespace.getSpaceElement(spaceField)
				: null;
		if (!spaceElement) {
			console.warn('setSpaceFieldButton: space element not found', spaceField);
			return false;
		}
		spaceElement.appendChild(button);
		setSpaceFieldDisplay(spaceField, true);
		return true;
	} else {
		// 非表示
		return setSpaceFieldDisplay(spaceField, false);
	}
};

// setSpaceFieldText の非同期リトライ競合を防ぐための内部状態管理
// key: `${spaceField}::${id}`
// value: { generation: number, timerIds: number[] }
const _kc_spaceFieldTextRetryStateMap = new Map();

const _kc_makeSpaceFieldTextRetryKey = (spaceField, id) => {
	return String(spaceField) + '::' + String(id);
};

const _kc_cancelPendingRetries = (key) => {
	const state = _kc_spaceFieldTextRetryStateMap.get(key);
	if (!state || !Array.isArray(state.timerIds)) return;
	state.timerIds.forEach((timerId) => {
		clearTimeout(timerId);
	});
	state.timerIds = [];
};

const _kc_isLatestGeneration = (key, generation) => {
	const state = _kc_spaceFieldTextRetryStateMap.get(key);
	return !!state && state.generation === generation;
};

/**
 * kintone のスペースフィールド内に任意の HTML 文字列を挿入して表示／削除します。
 * - 挿入時は既存の同 ID 要素を削除してから追加します。
 * - innerHTML は内部でサニタイズされます。
 *
 * @param {string} spaceField スペースフィールドのフィールドコード
 * @param {string} id 追加する要素の id（既存要素があれば上書きの代わりに削除して再作成）
 * @param {string|null} innerHTML 表示する HTML。null/空文字 の場合は要素を削除して非表示にする
 * @returns {boolean} 成功したら true、引数不正や要素未発見などで失敗したら false
 */
const setSpaceFieldText = (spaceField, id, innerHTML) => {
	if (
		typeof spaceField !== 'string' ||
		!spaceField.trim() ||
		typeof id !== 'string' ||
		!id.trim() ||
		(innerHTML !== null && typeof innerHTML !== 'string')
	) {
		console.warn('setSpaceFieldText: invalid arguments', {
			spaceField,
			id,
			innerHTML,
		});
		return false;
	}

	const retryKey = _kc_makeSpaceFieldTextRetryKey(spaceField, id);
	const prevState = _kc_spaceFieldTextRetryStateMap.get(retryKey) || {
		generation: 0,
		timerIds: [],
	};
	// 同一キーの旧リトライは新規呼び出し時に必ず無効化する
	_kc_cancelPendingRetries(retryKey);
	const generation = prevState.generation + 1;
	const state = {
		generation,
		timerIds: [],
	};
	_kc_spaceFieldTextRetryStateMap.set(retryKey, state);

	// 既存要素削除
	const spaceFieldElementById = document.getElementById(id);
	if (spaceFieldElementById) {
		spaceFieldElementById.remove();
	}

	if (innerHTML === null || innerHTML === '') {
		// 空文字/null は即時クリア最優先: 追加リトライは行わない
		return setSpaceFieldDisplay(spaceField, false);
	}

	if (innerHTML) {
		// 表示
		// createElement を関数化してリトライ時にも使えるようにする
		const createSpaceFieldElement = () => {
			const el = document.createElement('div');
			el.id = id;
			// innerHTML は HTML 形式での入力が想定されるため、可能な限りサニタイズしてから挿入する
			el.innerHTML = _kc_sanitizeHtml(innerHTML);
			return el;
		};

		// 初回アタック（同期的に試す）
		let appended = false;
		try {
			const recordNamespace = _kc_getRecordNamespace();
			const spaceElement =
				recordNamespace && typeof recordNamespace.getSpaceElement === 'function'
					? recordNamespace.getSpaceElement(spaceField)
					: null;
			if (spaceElement) {
				// 既に同 id の要素がある場合は削除してから追加
				const existing = document.getElementById(id);
				if (existing) existing.remove();
				spaceElement.appendChild(createSpaceFieldElement());
				appended = true;
				// 表示を許可
				setSpaceFieldDisplay(spaceField, true);
			} else {
				// do nothing here; we'll retry below
			}
		} catch {
			// ignore and let retry handle it
			appended = false;
		}

		// 非同期リトライ: 一時的な早すぎる実行や別処理による上書きを数回の試行で修復する
		// ※ 即時の戻り値は従来通り同期的な成功/失敗を返します（破壊的変更を避ける）
		const startRetryLoop = () => {
			// exponential backoff style intervals for faster initial response
			const intervals = [50, 100, 200, 400, 800]; // ms
			let idx = 0;

			const scheduleRetry = (fn, wait) => {
				const timerId = setTimeout(() => {
					const current = _kc_spaceFieldTextRetryStateMap.get(retryKey);
					if (current && Array.isArray(current.timerIds)) {
						current.timerIds = current.timerIds.filter((idValue) => idValue !== timerId);
					}
					if (!_kc_isLatestGeneration(retryKey, generation)) {
						return;
					}
					fn();
				}, wait);
				state.timerIds.push(timerId);
			};

			const tryOnce = () => {
				if (!_kc_isLatestGeneration(retryKey, generation)) {
					return;
				}
				// 要素が既に存在すれば成功とみなして終了
				if (document.getElementById(id)) {
					return;
				}
				// スペース要素が利用可能であれば追加を試みる
				try {
					const recordNamespace = _kc_getRecordNamespace();
					const se =
						recordNamespace && typeof recordNamespace.getSpaceElement === 'function'
							? recordNamespace.getSpaceElement(spaceField)
							: null;
					if (se) {
						if (!document.getElementById(id)) {
							se.appendChild(createSpaceFieldElement());
							setSpaceFieldDisplay(spaceField, true);
						}
						return;
					}
				} catch {
					// ignore and will retry
				}
				// schedule next attempt if available
				if (idx < intervals.length) {
					const wait = intervals[idx++];
					scheduleRetry(tryOnce, wait);
				}
			};

			// kick off immediately (non-blocking)
			scheduleRetry(tryOnce, 0);
		};
		// 実行
		startRetryLoop();

		return appended;
	}

	// 非表示
	return setSpaceFieldDisplay(spaceField, false);
};

// 公開: kintone 側から直接呼び出すためにグローバルに割り当てる（初期化後に安全に行う）
if (typeof window !== 'undefined') {
	try {
		window.notifyError = typeof notifyError !== 'undefined' ? notifyError : undefined;
	} catch {}
	try {
		window.getFieldValueOr = typeof getFieldValueOr !== 'undefined' ? getFieldValueOr : undefined;
	} catch {}
	try {
		window.kintoneEventOn = typeof kintoneEventOn !== 'undefined' ? kintoneEventOn : undefined;
	} catch {}
	try {
		window.notifyInfo = typeof notifyInfo !== 'undefined' ? notifyInfo : undefined;
	} catch {}
	try {
		window.notifyWarning = typeof notifyWarning !== 'undefined' ? notifyWarning : undefined;
	} catch {}
	try {
		window.showYesNoDialog = typeof showYesNoDialog !== 'undefined' ? showYesNoDialog : undefined;
	} catch {}
	try {
		window.showInputDialog = typeof showInputDialog !== 'undefined' ? showInputDialog : undefined;
	} catch {}
	try {
		window.setHeaderMenuSpaceButton =
			typeof setHeaderMenuSpaceButton !== 'undefined' ? setHeaderMenuSpaceButton : undefined;
	} catch {}
	try {
		window.setRecordHeaderMenuSpaceButton =
			typeof setRecordHeaderMenuSpaceButton !== 'undefined'
				? setRecordHeaderMenuSpaceButton
				: undefined;
	} catch {}
	try {
		window.setRecordValues = typeof setRecordValues !== 'undefined' ? setRecordValues : undefined;
	} catch {}
	try {
		window.setSpaceFieldDisplay =
			typeof setSpaceFieldDisplay !== 'undefined' ? setSpaceFieldDisplay : undefined;
	} catch {}
	try {
		window.setSpaceFieldButton =
			typeof setSpaceFieldButton !== 'undefined' ? setSpaceFieldButton : undefined;
	} catch {}
	try {
		window.setSpaceFieldText =
			typeof setSpaceFieldText !== 'undefined' ? setSpaceFieldText : undefined;
	} catch {}
	try {
		window.setRecordHeaderMenuSpaceText =
			typeof setRecordHeaderMenuSpaceText !== 'undefined'
				? setRecordHeaderMenuSpaceText
				: undefined;
	} catch {}
}
