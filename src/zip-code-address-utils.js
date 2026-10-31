/** 郵便番号から住所などを出力する処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.1.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_zc_)で始める
/* exported checkZipCodeExists, formatZipCode, getAddressByZipCode, getCityByZipCode, getPrefectureByZipCode, hasPrefectureName, registerZipCodeAddressHandler, registerFormBridgeZipCodeAddressHandler, normalizeZipCode */
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部
// 郵便番号APIベースURL
const _ZC_ZIPCODE_API_BASE_URL = 'https://api.kacsw.or.jp/zipcode/index.php/api/v1/address/digital';
const _ZC_PREFECTURE_NAMES = [
	'北海道',
	'青森県',
	'岩手県',
	'宮城県',
	'秋田県',
	'山形県',
	'福島県',
	'茨城県',
	'栃木県',
	'群馬県',
	'埼玉県',
	'千葉県',
	'東京都',
	'神奈川県',
	'新潟県',
	'富山県',
	'石川県',
	'福井県',
	'山梨県',
	'長野県',
	'岐阜県',
	'静岡県',
	'愛知県',
	'三重県',
	'滋賀県',
	'京都府',
	'大阪府',
	'兵庫県',
	'奈良県',
	'和歌山県',
	'鳥取県',
	'島根県',
	'岡山県',
	'広島県',
	'山口県',
	'徳島県',
	'香川県',
	'愛媛県',
	'高知県',
	'福岡県',
	'佐賀県',
	'長崎県',
	'熊本県',
	'大分県',
	'宮崎県',
	'鹿児島県',
	'沖縄県',
];

// 郵便番号で使用される可能性のある記号を検出するための正規表現
const _ZC_SYMBOLS_REGEX = /[\-－‐‑–—−ー― 　]/g;

// 全角英数字を検出するための正規表現
const _ZC_ZENKAKU_ALPHA_NUM_REG = /[Ａ-Ｚａ-ｚ０-９]/g;

//　ライブラリ内の共通関数定義部
/**
 * 郵便番号・デジタルアドレス入力値を正規化する内部関数
 * - 全角英数字を半角に変換
 * - 記号・空白を除去
 * - 英字を大文字化
 * @param {string|number} zipCode 入力値（郵便番号またはデジタルアドレス）
 * @returns {string} 正規化済みの半角英数字（記号除去・大文字化済み）
 */
const _zc_normalizeZipCodeInput = (zipCode) => {
	return String(zipCode)
		.replace(_ZC_ZENKAKU_ALPHA_NUM_REG, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
		.toUpperCase()
		.replace(_ZC_SYMBOLS_REGEX, '');
};

/**
 * 正規化＋7桁チェックを行う内部ヘルパー
 * @param {string|number} zipCode
 * @returns {{ok: boolean, normalized?: string, error?: string}}
 */
const _zc_getValidatedNormalized = (zipCode) => {
	const normalized = _zc_normalizeZipCodeInput(zipCode);
	if (typeof normalized !== 'string' || !/^[0-9A-Z]{7}$/.test(normalized)) {
		return {
			ok: false,
			error: '郵便番号／デジタルアドレスは7桁の半角英数字で指定してください',
		};
	}
	return { ok: true, normalized };
};

const _zc_buildZipcodeApiUrl = (normalized) => {
	return `${_ZC_ZIPCODE_API_BASE_URL}?search_code=${encodeURIComponent(normalized)}`;
};

const _zc_hasKintoneProxy = () =>
	typeof kintone !== 'undefined' && kintone && typeof kintone.proxy === 'function';

const _zc_requestJson = (url) => {
	if (!_zc_hasKintoneProxy()) return fetch(url);

	return new Promise((resolve, reject) => {
		const createResponse = (body, status) => ({
			ok: Number(status) >= 200 && Number(status) < 300,
			status: Number(status) || 0,
			json: () => {
				if (body && typeof body === 'object') return Promise.resolve(body);
				return Promise.resolve().then(() => JSON.parse(String(body || '')));
			},
		});
		try {
			kintone.proxy(
				url,
				'GET',
				{},
				'',
				(body, status) => resolve(createResponse(body, status)),
				(body, status) => resolve(createResponse(body, status))
			);
		} catch (error) {
			reject(error);
		}
	});
};

/**
 * 住所が正式な都道府県名で始まるかを厳密に判定します。
 * @param {string} address 判定対象の住所
 * @returns {boolean} 住所の先頭が47都道府県の正式名称なら true
 */
const hasPrefectureName = (address) => {
	if (typeof address !== 'string') return false;
	return _ZC_PREFECTURE_NAMES.some((prefectureName) => address.startsWith(prefectureName));
};

// 同期・非同期どちらの判定結果でも、必ず次のマクロタスクでcallbackを呼び出す（kintoneイベントハンドラ内での同期実行によるエラーを防ぐため）
const _zc_invokeCallback = (callback, result) => {
	if (typeof callback !== 'function') return;
	setTimeout(() => callback(result), 0);
};

//　ライブラリ本体部
/**
 * 郵便番号の存在チェック（APIで該当データがあるかだけ返す）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - (exists: boolean) => void 存在する場合はtrue、存在しない場合はfalse
 */
const checkZipCodeExists = (zipCode, callback) => {
	const v = _zc_getValidatedNormalized(zipCode);
	if (!v.ok) {
		_zc_invokeCallback(callback, false);
		return;
	}
	const normalized = v.normalized;
	_zc_requestJson(_zc_buildZipcodeApiUrl(normalized))
		.then((response) => {
			if (response.status === 404) {
				_zc_invokeCallback(callback, false);
				return null;
			}
			if (!response.ok) {
				_zc_invokeCallback(callback, false);
				return null;
			}
			return response.json();
		})
		.then((data) => {
			if (!data || !data.addresses || data.addresses.length === 0) {
				_zc_invokeCallback(callback, false);
				return null;
			}
			_zc_invokeCallback(callback, true);
		})
		.catch(() => {
			_zc_invokeCallback(callback, false);
		});
};

const _zc_formatValidatedZipCode = (normalized) =>
	/^\d{7}$/.test(normalized) ? normalized.slice(0, 3) + '-' + normalized.slice(3) : normalized;

/**
 * 郵便番号をハイフン付き（123-4567）にフォーマットする関数（APIで存在確認、callback型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。
 * @param {function} callback - (result: { zipCode: string } | { error: string }) => void
 */
const formatZipCode = (zipCode, callback) => {
	const v = _zc_getValidatedNormalized(zipCode);
	if (!v.ok) {
		_zc_invokeCallback(callback, { error: v.error });
		return;
	}
	const normalized = v.normalized;
	_zc_requestJson(_zc_buildZipcodeApiUrl(normalized))
		.then((response) => {
			if (response.status === 404) {
				_zc_invokeCallback(callback, { error: '郵便番号が存在しません' });
				return null;
			}
			if (!response.ok) {
				_zc_invokeCallback(callback, { error: `APIエラー（${response.status}）` });
				return null;
			}
			return response.json();
		})
		.then((data) => {
			if (!data || !data.addresses || data.addresses.length === 0) {
				_zc_invokeCallback(callback, { error: '郵便番号が存在しません' });
				return null;
			}
			_zc_invokeCallback(callback, { zipCode: _zc_formatValidatedZipCode(normalized) });
		})
		.catch(() => {
			_zc_invokeCallback(callback, { error: 'API接続エラー' });
		});
};

/**
 * 郵便番号またはデジタルアドレスから住所情報を取得する関数（API利用、コールバック型）
 * 指定した7桁の半角英数字（郵便番号またはデジタルアドレス）をAPIに問い合わせ、該当する住所情報をコールバックで返します。
 *
 * @param {string|number} zipCode - 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {function} callback - 取得結果を受け取るコールバック関数。引数は以下のいずれか：
 *   - 住所情報オブジェクト（下記参照）
 *   - エラー時は { error: エラーメッセージ }
 *
 * 住所情報オブジェクトの例：
 * {
 *   originalZipCode: '１２３－４５６７', // 入力値（記号・全角含む）
 *   normalizedZipCode: '1234567',      // 正規化済み（半角・記号除去・大文字化）
 *   apiZipCode: '1234567',             // API返却値（7桁数字のみ）
 *   zipCode: '123-4567',               // ハイフン付き郵便番号（表示用）
 *   zipCode1: '1', zipCode2: '2', ... zipCode7: '7', // 各桁分割
 *   prefName: '神奈川県',               // 都道府県
 *   cityName: '横浜市西区',             // 市区町村
 *   townName: 'みなとみらい',           // 町域
 *   bizName: '株式会社○○',              // 事業所名（存在する場合）
 *   blockName: '1-1-1',                // 番地等（存在する場合）
 *   otherName: '○○マンション',          // その他住所（存在する場合）
 *   businessName: '株式会社○○'          // 企業名（存在する場合）
 *   address: '神奈川県横浜市西区みなとみらい', // 住所（都道府県＋市区町村＋町名＋番地等）
 * }
 *
 * エラー時の例：
 * {
 *   error: 'APIへの接続に失敗しました: ...' // エラーメッセージ
 * }
 *
 */
const getAddressByZipCode = (zipCode, callback) => {
	const v = _zc_getValidatedNormalized(zipCode);
	if (!v.ok) {
		_zc_invokeCallback(callback, { error: v.error });
		return;
	}
	const normalized = v.normalized;
	// 正規化後は7文字の半角英数字であることが保証されている
	_zc_requestJson(_zc_buildZipcodeApiUrl(normalized))
		.then((response) => {
			if (!response.ok) {
				if (response.status === 404) {
					_zc_invokeCallback(callback, {
						error: `郵便番号／デジタルアドレス「${zipCode}」に該当する住所が見つかりません`,
					});
					return null;
				} else if (response.status >= 500) {
					_zc_invokeCallback(callback, { error: 'サーバーエラーが発生しました' });
					return null;
				} else {
					_zc_invokeCallback(callback, { error: `通信エラー（${response.status}）` });
					return null;
				}
			}
			// JSONパースエラーも個別に捕捉
			return response.json().catch(() => {
				_zc_invokeCallback(callback, { error: 'APIレスポンスのJSONパースに失敗しました' });
				return null;
			});
		})
		.then((result) => {
			if (!result) return;
			if (!Array.isArray(result.addresses) || result.addresses.length === 0) {
				_zc_invokeCallback(callback, {
					error:
						'該当する住所データが見つかりませんでした。郵便番号／デジタルアドレスを確認してください。',
				});
				return null;
			}
			let invalid = false;
			result.addresses.forEach((addr) => {
				if (
					!addr ||
					addr.zip_code == null ||
					typeof addr.zip_code !== 'string' ||
					!/^[0-9A-Z]{7}$/.test(addr.zip_code) ||
					addr.pref_name == null ||
					typeof addr.pref_name !== 'string' ||
					!addr.pref_name.replace(/[\u3000\u0020]/g, '') ||
					addr.city_name == null ||
					typeof addr.city_name !== 'string' ||
					!addr.city_name.replace(/[\u3000\u0020]/g, '') ||
					addr.town_name == null ||
					typeof addr.town_name !== 'string' ||
					(addr.biz_name != null && typeof addr.biz_name !== 'string') ||
					(addr.block_name != null && typeof addr.block_name !== 'string') ||
					(addr.other_name != null && typeof addr.other_name !== 'string') ||
					(addr.business_name != null && typeof addr.business_name !== 'string')
				) {
					invalid = true;
				}
			});
			if (invalid) {
				_zc_invokeCallback(callback, {
					error: 'APIレスポンスが不正です（郵便番号・デジタルアドレス情報）',
				});
				return null;
			}
			if (result.addresses.length === 1) {
				if (!result) return null;
				if (!result.addresses || result.addresses.length === 0) {
					_zc_invokeCallback(callback, {
						error:
							'該当する住所データが見つかりませんでした。郵便番号／デジタルアドレスを確認してください。',
					});
					return null;
				}
				let isInvalid = false;
				result.addresses.forEach((addressObj) => {
					if (
						!addressObj ||
						addressObj.zip_code == null ||
						typeof addressObj.zip_code !== 'string' ||
						addressObj.pref_name == null ||
						typeof addressObj.pref_name !== 'string' ||
						addressObj.city_name == null ||
						typeof addressObj.city_name !== 'string' ||
						addressObj.town_name == null ||
						typeof addressObj.town_name !== 'string' ||
						(addressObj.biz_name != null && typeof addressObj.biz_name !== 'string') ||
						(addressObj.block_name != null && typeof addressObj.block_name !== 'string') ||
						(addressObj.other_name != null && typeof addressObj.other_name !== 'string') ||
						(addressObj.business_name != null && typeof addressObj.business_name !== 'string')
					) {
						isInvalid = true;
					}
				});
				if (isInvalid) {
					_zc_invokeCallback(callback, {
						error: 'APIレスポンスが不正です（郵便番号・デジタルアドレス情報）',
					});
					return null;
				}
				const addressObj = result.addresses[0];
				const fullAddress = [
					addressObj.pref_name,
					addressObj.city_name,
					addressObj.town_name,
					addressObj.block_name ? addressObj.block_name : '',
				]
					.filter(Boolean)
					.join('');
				let zipCodeLeft;
				let zipCodeRight;
				let zipCodeArray = [];
				for (let i = 0; i < addressObj.zip_code.length; i++) {
					zipCodeArray.push(addressObj.zip_code[i]);
					if (i <= 2) {
						zipCodeLeft = (zipCodeLeft || '') + addressObj.zip_code[i];
					} else if (i >= 3) {
						zipCodeRight = (zipCodeRight || '') + addressObj.zip_code[i];
					}
				}
				_zc_invokeCallback(callback, {
					originalZipCode: zipCode,
					normalizedZipCode: normalized,
					apiZipCode: addressObj.zip_code,
					zipCode: _zc_formatValidatedZipCode(addressObj.zip_code),
					zipCode1: zipCodeArray[0] || null,
					zipCode2: zipCodeArray[1] || null,
					zipCode3: zipCodeArray[2] || null,
					zipCode4: zipCodeArray[3] || null,
					zipCode5: zipCodeArray[4] || null,
					zipCode6: zipCodeArray[5] || null,
					zipCode7: zipCodeArray[6] || null,
					address: fullAddress ? fullAddress.replace(/[\u3000\u0020]/g, '') : null,
					prefName: addressObj.pref_name
						? addressObj.pref_name.replace(/[\u3000\u0020]/g, '')
						: null,
					cityName: addressObj.city_name
						? addressObj.city_name.replace(/[\u3000\u0020]/g, '')
						: null,
					townName: addressObj.town_name
						? addressObj.town_name.replace(/[\u3000\u0020]/g, '')
						: null,
					bizName: addressObj.biz_name ? addressObj.biz_name.replace(/[\u3000\u0020]/g, '') : null,
					blockName: addressObj.block_name
						? addressObj.block_name.replace(/[\u3000\u0020]/g, '')
						: null,
					otherName: addressObj.other_name
						? addressObj.other_name.replace(/[\u3000\u0020]/g, '')
						: null,
					businessName: addressObj.business_name
						? addressObj.business_name.replace(/[\u3000\u0020]/g, '')
						: null,
				});
			} else {
				_zc_invokeCallback(callback, {
					error: `郵便番号／デジタルアドレス「${result.addresses[0].zip_code}」に該当する住所が複数見つかりました。郵便番号／デジタルアドレスを確認して再検索してください。`,
				});
			}
		})
		.catch((error) => {
			_zc_invokeCallback(callback, { error: `APIへの接続に失敗しました: ${error.message}` });
		});
};

/**
 * 郵便番号から市区町村名のみ取得する関数（API利用、コールバック型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {ZipCodeCityCallback} callback - 市区町村名（存在しない場合は null）を受け取るコールバック
 */
const getCityByZipCode = (zipCode, callback) => {
	const v = _zc_getValidatedNormalized(zipCode);
	if (!v.ok) {
		_zc_invokeCallback(callback, null);
		return;
	}
	const normalized = v.normalized;
	_zc_requestJson(_zc_buildZipcodeApiUrl(normalized))
		.then((response) => {
			if (response.status === 404) {
				_zc_invokeCallback(callback, null);
				return null;
			}
			if (!response.ok) {
				_zc_invokeCallback(callback, null);
				return null;
			}
			return response.json();
		})
		.then((data) => {
			if (!data || !data.addresses || data.addresses.length === 0) {
				_zc_invokeCallback(callback, null);
				return null;
			}
			_zc_invokeCallback(callback, data.addresses[0].city_name || null);
		})
		.catch(() => {
			_zc_invokeCallback(callback, null);
		});
};

/**
 * 郵便番号から都道府県名のみ取得する関数（API利用、コールバック型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。全角や記号・空白は自動で除去・変換されます。
 * @param {ZipCodePrefCallback} callback - 都道府県名（存在しない場合は null）を受け取るコールバック
 */
const getPrefectureByZipCode = (zipCode, callback) => {
	const v = _zc_getValidatedNormalized(zipCode);
	if (!v.ok) {
		_zc_invokeCallback(callback, null);
		return;
	}
	const normalized = v.normalized;
	_zc_requestJson(_zc_buildZipcodeApiUrl(normalized))
		.then((response) => {
			if (response.status === 404) {
				_zc_invokeCallback(callback, null);
				return null;
			}
			if (!response.ok) {
				_zc_invokeCallback(callback, null);
				return null;
			}
			return response.json();
		})
		.then((data) => {
			if (!data || !data.addresses || data.addresses.length === 0) {
				_zc_invokeCallback(callback, null);
				return null;
			}
			_zc_invokeCallback(callback, data.addresses[0].pref_name || null);
		})
		.catch(() => {
			_zc_invokeCallback(callback, null);
		});
};

/**
 * 郵便番号の入力変更・明示的な住所再設定・表示制御を登録します。
 * 設定・戻り値の契約は docs/zip-code-address-utils.md を参照してください。
 * @param {object} options
 * @returns {{apply: function, refresh: function, whenIdle: function, dispose: function}}
 */
const registerZipCodeAddressHandler = (options) => {
	if (!options || typeof options !== 'object' || Array.isArray(options))
		throw new Error('optionsはオブジェクトである必要があります');
	const {
		zipCodeField,
		mainAddressField,
		addressFields,
		clearFields = [],
		devices = 'desktop',
		watchFields = [],
		zipErrorMessages,
		addressErrorMessages,
		button,
		guidance,
		canApply = () => true,
		transformAddress = (value) => value,
		afterApply,
	} = options;
	const isCode = (value) => typeof value === 'string' && value.trim() !== '';
	const resultProperties = new Set([
		'originalZipCode',
		'normalizedZipCode',
		'apiZipCode',
		'zipCode',
		'zipCode1',
		'zipCode2',
		'zipCode3',
		'zipCode4',
		'zipCode5',
		'zipCode6',
		'zipCode7',
		'address',
		'prefName',
		'cityName',
		'townName',
		'blockName',
		'otherName',
		'bizName',
		'businessName',
	]);
	if (!isCode(zipCodeField) || !isCode(mainAddressField))
		throw new Error('郵便番号・メイン住所フィールドコードを指定してください');
	if (
		!addressFields ||
		typeof addressFields !== 'object' ||
		Array.isArray(addressFields) ||
		!Object.keys(addressFields).length ||
		!Object.entries(addressFields).every(
			([property, code]) => resultProperties.has(property) && isCode(code)
		)
	)
		throw new Error('addressFieldsは検索結果プロパティとフィールドコードの対応表です');
	const mappedFields = Object.values(addressFields);
	if (
		!mappedFields.includes(mainAddressField) ||
		new Set(mappedFields).size !== mappedFields.length ||
		!Array.isArray(clearFields) ||
		!clearFields.every(isCode) ||
		!Array.isArray(watchFields) ||
		!watchFields.every(isCode) ||
		[...mappedFields, ...clearFields].includes(zipCodeField)
	)
		throw new Error('住所フィールドの対応・クリア対象・監視対象が不正です');
	if (!['desktop', 'mobile', 'both'].includes(devices))
		throw new Error('devicesはdesktop、mobile、bothのいずれかです');
	for (const map of [zipErrorMessages, addressErrorMessages]) {
		if (!map || typeof map !== 'object' || Array.isArray(map))
			throw new Error('郵便番号用・住所用のerrorMessagesオブジェクトを指定してください');
	}
	for (const fn of [canApply, transformAddress, afterApply]) {
		if (fn !== undefined && typeof fn !== 'function')
			throw new Error('条件・変換・後続処理は関数で指定してください');
	}
	for (const ui of [button, guidance]) {
		if (
			ui !== undefined &&
			(!ui ||
				!isCode(ui.spaceField) ||
				!isCode(ui.id) ||
				(ui.visible !== undefined && typeof ui.visible !== 'function') ||
				(ui.text !== undefined && typeof ui.text !== 'string'))
		)
			throw new Error('表示設定にはspaceField、idと適切なvisible/textを指定してください');
	}
	if (button && guidance && button.id === guidance.id)
		throw new Error('ボタンと案内文には異なるidを指定してください');
	if (typeof kintone === 'undefined' || typeof kintone.events?.on !== 'function')
		throw new Error('kintone.events.onが利用できません');

	const targets = [...new Set([...mappedFields, ...clearFields])];
	let namespace;
	let sequence = 0;
	let screen = 0;
	let disposed = false;
	let busy = false;
	let pending = Promise.resolve({ status: 'skipped' });
	let buttonPending = pending;
	const elements = new Map();
	const setBusy = (value) => {
		busy = value;
		const element = elements.get(button?.id);
		if (element) element.disabled = value;
	};
	const context = (record, source) => ({ record, source, busy });
	const isEmptyTextField = (field) =>
		field?.value === undefined && ['SINGLE_LINE_TEXT', 'MULTI_LINE_TEXT'].includes(field?.type);
	const fieldValue = (field) => (isEmptyTextField(field) ? '' : field.value);
	const requireFields = (record) => {
		for (const code of [zipCodeField, ...targets]) {
			const field = record?.[code];
			if (!field || (typeof field.value !== 'string' && !isEmptyTextField(field))) {
				const error = new Error(`文字列フィールド「${code}」が存在しないか値が不正です`);
				error.fieldCode = code;
				throw error;
			}
		}
	};
	const setError = (record, code, message, map) => {
		map[code] = message;
		if (record?.[code]) record[code].error = message;
	};
	const removeElements = () => {
		for (const element of elements.values()) element.remove();
		elements.clear();
	};
	const render = (record) => {
		if (disposed || !namespace) return;
		for (const [ui, isButton] of [
			[button, true],
			[guidance, false],
		]) {
			if (!ui) continue;
			const space = namespace.getSpaceElement(ui.spaceField);
			const visible = ui.visible
				? ui.visible(context(record, 'display'))
				: Boolean(record?.[zipCodeField]?.value);
			let element = elements.get(ui.id);
			if (!visible || !space) {
				if (element) element.remove();
				elements.delete(ui.id);
				continue;
			}
			if (!element || element.parentNode !== space) {
				if (element) element.remove();
				element = document.createElement(isButton ? 'button' : 'div');
				element.id = ui.id;
				if (isButton) {
					element.type = 'button';
					element.className = 'kintoneplugin-button-normal';
					element.addEventListener('click', () => {
						// DOMイベントはPromiseを待たないため、apply内部で例外を処理する。
						void apply();
					});
				} else {
					element.style.whiteSpace = 'pre-line';
				}
				element.textContent =
					ui.text ??
					(isButton
						? '郵便番号から住所を取得'
						: '郵便番号の代わりにデジタルアドレスでも検索可能です。\nデジタルアドレスの場合は郵便番号に変換されます。');
				space.appendChild(element);
				elements.set(ui.id, element);
			}
			if (isButton) element.disabled = busy;
		}
	};
	const refresh = () => {
		if (!disposed && namespace) render(namespace.get().record);
	};
	const start = (source, input) => {
		const token = ++sequence;
		const view = screen;
		const api = namespace;
		let expectedZip = input;
		const isCurrent = () =>
			!disposed &&
			screen === view &&
			sequence === token &&
			api.get().record[zipCodeField]?.value === expectedZip;
		const task = async () => {
			let errorField = zipCodeField;
			let errorMap = zipErrorMessages;
			try {
				if (!isCurrent()) return { status: 'stale' };
				let record = api.get().record;
				requireFields(record);
				if (!input || !canApply(context(record, source))) return { status: 'skipped' };
				if (source === 'button' && button?.visible && !button.visible(context(record, source)))
					return { status: 'skipped' };
				const result = await new Promise((resolve) => getAddressByZipCode(input, resolve));
				if (!isCurrent()) return { status: 'stale' };
				record = api.get().record;
				if (!canApply(context(record, source))) return { status: 'skipped' };
				if (source === 'button' && button?.visible && !button.visible(context(record, source)))
					return { status: 'skipped' };
				if (result.error) throw new Error(result.error);
				if (
					result.normalizedZipCode !== _zc_normalizeZipCodeInput(input) ||
					typeof result.apiZipCode !== 'string' ||
					!/^[0-9A-Z]{7}$/.test(result.apiZipCode) ||
					typeof result.zipCode !== 'string' ||
					_zc_normalizeZipCodeInput(result.zipCode) !== result.apiZipCode ||
					!['address', 'prefName', 'cityName'].every(
						(key) => typeof result[key] === 'string' && result[key].trim() !== ''
					) ||
					!Object.entries(addressFields).some(
						([property, code]) =>
							code === mainAddressField &&
							typeof result[property] === 'string' &&
							result[property].trim() !== ''
					)
				)
					throw new Error('APIレスポンスが不正です（住所設定の必須項目）');
				requireFields(record);
				const replace = source === 'button' || result.normalizedZipCode !== result.apiZipCode;
				const assignAddress = replace || fieldValue(record[mainAddressField]) === '';
				const values = new Map();
				if (assignAddress) {
					if (replace) for (const code of targets) values.set(code, '');
					for (const [property, code] of Object.entries(addressFields)) {
						errorField = code;
						errorMap = addressErrorMessages;
						const value = result[property];
						if (value === null || value === undefined) continue;
						if (typeof value !== 'string')
							throw new Error(`検索結果「${property}」は文字列である必要があります`);
						const converted = transformAddress(value, { fieldCode: code, property, result });
						if (typeof converted !== 'string')
							throw new Error(`住所変換「${code}」は文字列を返す必要があります`);
						values.set(code, converted);
					}
				}
				// 検証・全角変換が全て成功してから一括反映する。
				record[zipCodeField].value = result.zipCode;
				setError(record, zipCodeField, null, zipErrorMessages);
				for (const [code, value] of values) {
					record[code].value = value;
					setError(record, code, null, addressErrorMessages);
				}
				api.set({ record });
				expectedZip = result.zipCode;
				if (assignAddress && afterApply) {
					errorField = mainAddressField;
					errorMap = addressErrorMessages;
					await afterApply({ record, result, source, isCurrent });
				}
				return { status: assignAddress ? 'applied' : 'formatted', result };
			} catch (error) {
				if (targets.includes(error?.fieldCode)) {
					errorField = error.fieldCode;
					errorMap = addressErrorMessages;
				}
				const message = error instanceof Error ? error.message : String(error);
				console.error('registerZipCodeAddressHandler:', error);
				if (isCurrent()) {
					const record = api.get().record;
					setError(record, errorField, message, errorMap);
					api.set({ record });
				}
				return { status: 'error', error: message };
			}
		};
		// changeイベント内のrecord.get/setとPromise返却はKintoneでは利用できない。
		pending = Promise.resolve()
			.then(task)
			.then((outcome) => {
				if (!disposed && screen === view) refresh();
				return outcome;
			})
			.catch((error) => {
				// レコード取得・エラー表示自体の失敗もDOMイベントへ漏らさない。
				console.error('registerZipCodeAddressHandler:', error);
				return { status: 'error', error: String(error) };
			});
		return pending;
	};
	const apply = () => {
		if (busy) return buttonPending;
		if (disposed || !namespace) return Promise.resolve({ status: 'skipped' });
		setBusy(true);
		try {
			const record = namespace.get().record;
			render(record);
			const operation = start('button', record[zipCodeField]?.value);
			pending = operation.then((outcome) => {
				setBusy(false);
				try {
					refresh();
				} catch (error) {
					console.error('registerZipCodeAddressHandler:', error);
					return { status: 'error', error: String(error) };
				}
				return outcome;
			});
			buttonPending = pending;
		} catch (error) {
			setBusy(false);
			console.error('registerZipCodeAddressHandler:', error);
			pending = Promise.resolve({ status: 'error', error: String(error) });
		}
		return pending;
	};
	const eventNames = [];
	for (const prefix of devices === 'both'
		? ['app', 'mobile.app']
		: [devices === 'mobile' ? 'mobile.app' : 'app']) {
		for (const mode of ['create', 'edit']) {
			eventNames.push(`${prefix}.record.${mode}.show`);
			for (const field of new Set([zipCodeField, ...watchFields]))
				eventNames.push(`${prefix}.record.${mode}.change.${field}`);
		}
	}
	const handler = (event) => {
		if (disposed) return event;
		namespace = event.type.startsWith('mobile.') ? kintone.mobile.app.record : kintone.app.record;
		if (event.type.endsWith('.show')) {
			screen++;
			sequence++;
			removeElements();
		} else if (event.type.endsWith(`.change.${zipCodeField}`)) {
			setError(event.record, zipCodeField, null, zipErrorMessages);
			start('change', event.record[zipCodeField]?.value);
		}
		render(event.record);
		return event;
	};
	kintone.events.on(eventNames, handler);
	return {
		apply,
		refresh,
		whenIdle: () =>
			busy && pending !== buttonPending
				? Promise.all([pending, buttonPending]).then(([outcome]) => outcome)
				: pending,
		dispose: () => {
			disposed = true;
			sequence++;
			removeElements();
			kintone.events.off(eventNames, handler);
		},
	};
};

/**
 * FormBridge新バージョンの郵便番号変更に住所補完・置換を登録する。
 * イベントは同期終了し、検索完了や送信待機を保証しない。
 * @param {object} options 設定（詳細はAPIリファレンス参照）
 * @param {string} options.zipCodeInputField 郵便番号入力欄
 * @param {string} options.zipCodeSavedField 郵便番号保存欄
 * @param {string} options.mainAddressField メイン住所入力欄
 * @param {Object<string, string>} options.addressFields 検索結果プロパティと入力欄の対応
 * @param {Object<string, string>} [options.fieldMappings] 住所入力欄と保存欄の対応
 * @param {string[]} [options.clearFields] 置換時にクリアする追加欄
 * @param {function} [options.transformAddress] 同期文字列変換
 * @param {function} [options.afterApply] 住所反映後の同期処理
 * @returns {{whenIdle: function, dispose: function}} 最新処理の観測・無効化用。送信制御用ではない。
 */
const registerFormBridgeZipCodeAddressHandler = (options) => {
	const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
	const isCode = (value) => typeof value === 'string' && value.trim() !== '';
	const properties = new Set([
		'address',
		'prefName',
		'cityName',
		'townName',
		'blockName',
		'otherName',
		'bizName',
		'businessName',
	]);
	const optionNames = [
		'zipCodeInputField',
		'zipCodeSavedField',
		'mainAddressField',
		'addressFields',
		'fieldMappings',
		'clearFields',
		'transformAddress',
		'afterApply',
	];
	if (!isObject(options) || Object.keys(options).some((key) => !optionNames.includes(key)))
		throw new TypeError('optionsに有効なFormBridge住所設定を指定してください');
	const {
		zipCodeInputField,
		zipCodeSavedField,
		mainAddressField,
		addressFields,
		fieldMappings = {},
		clearFields = [],
		transformAddress = (value) => value,
		afterApply,
	} = options;
	if (![zipCodeInputField, zipCodeSavedField, mainAddressField].every(isCode))
		throw new TypeError('郵便番号入力・保存・メイン住所のフィールドコードを指定してください');
	if (
		!isObject(addressFields) ||
		!Object.keys(addressFields).length ||
		!Object.entries(addressFields).every(([key, code]) => properties.has(key) && isCode(code))
	)
		throw new TypeError('addressFieldsは住所検索結果と入力フィールドコードの対応表です');
	const assignments = Object.entries(addressFields);
	const inputs = Object.values(addressFields);
	if (
		!inputs.includes(mainAddressField) ||
		new Set(inputs).size !== inputs.length ||
		!Array.isArray(clearFields) ||
		!clearFields.every(isCode) ||
		!isObject(fieldMappings)
	)
		throw new TypeError('住所フィールドの対応・クリア対象が不正です');
	const sources = [...new Set([...inputs, ...clearFields])];
	const mappings = Object.entries(fieldMappings);
	if (
		!mappings.every(
			([source, target]) => sources.includes(source) && isCode(target) && !sources.includes(target)
		) ||
		new Set(Object.values(fieldMappings)).size !== mappings.length
	)
		throw new TypeError('fieldMappingsは住所入力欄から異なる一意の保存欄への対応表です');
	const targets = [...sources, ...Object.values(fieldMappings)];
	if (targets.some((code) => [zipCodeInputField, zipCodeSavedField].includes(code)))
		throw new TypeError('郵便番号欄を住所・クリア対象に指定できません');
	if (
		typeof transformAddress !== 'function' ||
		(afterApply !== undefined && typeof afterApply !== 'function')
	)
		throw new TypeError('変換・後続処理は同期関数で指定してください');
	const globalObject = typeof window !== 'undefined' ? window : globalThis;
	const fb = globalObject.formBridgeCustomLib;
	if (
		!fb ||
		![
			'createDependencyChecker',
			'getFormBridgeRecord',
			'getFieldValue',
			'setFieldValue',
			'setFieldError',
		].every((name) => typeof fb[name] === 'function')
	)
		throw new Error('formBridgeCustomLib v1.0.1以上が利用できません');
	fb.createDependencyChecker(['formBridge.events.on'])({ strict: true });
	const events = (typeof formBridge !== 'undefined' ? formBridge : globalObject.formBridge).events;
	let sequence = 0;
	let active = false;
	let disposed = false;
	let pending = Promise.resolve({ status: 'skipped' });
	const logError = (error) => console.error('registerFormBridgeZipCodeAddressHandler:', error);
	const requireActive = () => {
		if (!active) throw new Error('FormBridgeのform.show後に処理してください');
	};
	const requireValue = (event) => {
		if (!isObject(event) || !Object.prototype.hasOwnProperty.call(event, 'value'))
			throw new TypeError('FormBridgeの変更イベントにvalueがありません');
		return event.value;
	};
	const textValue = (record, code) => {
		const value = fb.getFieldValue(record, code, { required: true });
		if (value !== null && typeof value !== 'string')
			throw new TypeError(`文字列フィールド「${code}」の値が不正です`);
		return value === null ? '' : value;
	};
	const requireFields = (record) => {
		for (const code of new Set([zipCodeInputField, zipCodeSavedField, ...targets]))
			textValue(record, code);
	};
	const requireSync = (value) => {
		if (value && typeof value.then === 'function') {
			Promise.resolve(value).catch(logError);
			throw new TypeError('住所変換・後続処理にPromiseは利用できません');
		}
		return value;
	};
	const convert = (value, context) => {
		const converted = requireSync(transformAddress(value, context));
		if (typeof converted !== 'string')
			throw new TypeError(`住所変換「${context.fieldCode}」は文字列を返す必要があります`);
		if (context.result && context.fieldCode === mainAddressField && converted.trim() === '')
			throw new TypeError('検索結果のメイン住所を変換後に空にすることはできません');
		return converted;
	};
	const savedFields = new Map(mappings);
	const addValue = (values, code, value) => {
		values.set(code, value);
		const saved = savedFields.get(code);
		if (saved) values.set(saved, value);
	};
	const start = (input) => {
		const token = ++sequence;
		const isCurrent = () => !disposed && active && sequence === token;
		pending = Promise.resolve().then(async () => {
			let errorField = zipCodeInputField;
			try {
				if (!isCurrent()) return { status: 'stale' };
				if (input !== null && input !== undefined && typeof input !== 'string')
					throw new TypeError('郵便番号は文字列で入力してください');
				requireFields(fb.getFormBridgeRecord());
				fb.setFieldError(zipCodeInputField, null);
				if (input === null || input === undefined || _zc_normalizeZipCodeInput(input) === '') {
					fb.setFieldValue(zipCodeSavedField, '');
					return { status: 'skipped' };
				}
				const result = await new Promise((resolve) => getAddressByZipCode(input, resolve));
				if (!isCurrent()) return { status: 'stale' };
				if (result.error) throw new Error(result.error);
				if (
					result.normalizedZipCode !== _zc_normalizeZipCodeInput(input) ||
					typeof result.apiZipCode !== 'string' ||
					!/^[0-9A-Z]{7}$/.test(result.apiZipCode) ||
					typeof result.zipCode !== 'string' ||
					_zc_normalizeZipCodeInput(result.zipCode) !== result.apiZipCode ||
					!['address', 'prefName', 'cityName'].every(
						(key) => typeof result[key] === 'string' && result[key].trim() !== ''
					) ||
					!assignments.some(
						([property, code]) =>
							code === mainAddressField &&
							typeof result[property] === 'string' &&
							result[property].trim() !== ''
					)
				)
					throw new Error('APIレスポンスが不正です（住所設定の必須項目）');
				const record = fb.getFormBridgeRecord();
				requireFields(record);
				const replace = result.normalizedZipCode !== result.apiZipCode;
				const assignAddress = replace || textValue(record, mainAddressField) === '';
				const values = new Map();
				if (assignAddress) {
					if (replace) for (const code of sources) addValue(values, code, '');
					for (const [property, code] of assignments) {
						errorField = code;
						const value = result[property];
						if (value === null || value === undefined) continue;
						if (typeof value !== 'string')
							throw new TypeError(`検索結果「${property}」は文字列である必要があります`);
						addValue(values, code, convert(value, { fieldCode: code, property, result }));
					}
				}
				// 全結果を検証後に設定する。設定APIは変更イベントを発火しない。
				if (!isCurrent()) return { status: 'stale' };
				errorField = zipCodeInputField;
				fb.setFieldValue(zipCodeInputField, result.zipCode);
				fb.setFieldValue(zipCodeSavedField, result.zipCode);
				for (const [code, value] of values) {
					errorField = code;
					fb.setFieldValue(code, value);
					fb.setFieldError(code, null);
				}
				if (assignAddress && afterApply) {
					errorField = mainAddressField;
					requireSync(afterApply({ result, record: fb.getFormBridgeRecord(), isCurrent }));
				}
				return { status: assignAddress ? 'applied' : 'formatted', result };
			} catch (error) {
				logError(error);
				const message = error && error.message ? error.message : String(error);
				if (isCurrent()) {
					try {
						fb.setFieldError(errorField, message);
					} catch (displayError) {
						logError(displayError);
					}
				}
				return { status: 'error', error: message };
			}
		});
	};
	for (const name of ['form.show', 'confirm.show', 'finish.show']) {
		events.on(name, () => {
			if (disposed) return;
			sequence++;
			active = name === 'form.show';
		});
	}
	events.on(`form.field.change.${zipCodeInputField}`, (event) => {
		if (disposed) return;
		requireActive();
		// getRecord()は変更前の郵便番号を返す場合があるため、event.valueを使う。
		start(requireValue(event));
	});
	for (const [source, target] of mappings) {
		events.on(`form.field.change.${source}`, (event) => {
			if (disposed) return;
			requireActive();
			const value = requireValue(event);
			let converted;
			try {
				if (value !== null && value !== undefined && typeof value !== 'string')
					throw new TypeError(`文字列フィールド「${source}」の値が不正です`);
				const record = fb.getFormBridgeRecord();
				textValue(record, source);
				textValue(record, target);
				const property = assignments.find(([, code]) => code === source)?.[0];
				converted =
					value == null || value === '' ? '' : convert(value, { fieldCode: source, property });
			} catch (error) {
				logError(error);
				fb.setFieldError(source, error && error.message ? error.message : String(error));
				return;
			}
			fb.setFieldValue(target, converted);
			fb.setFieldError(source, null);
		});
	}
	return {
		whenIdle: () => pending,
		dispose: () => {
			disposed = true;
			active = false;
			sequence++;
		},
	};
};

/**
 * 郵便番号を正規化（空白・記号除去、全角→半角、APIで存在確認、callback型）
 * @param {string|number} zipCode 郵便番号またはデジタルアドレス（7桁の半角英数字）。
 * @param {function} callback - (result: { zipCode: string } | { error: string }) => void
 */
const normalizeZipCode = (zipCode, callback) => {
	const v = _zc_getValidatedNormalized(zipCode);
	if (!v.ok) {
		_zc_invokeCallback(callback, { error: v.error });
		return;
	}
	const normalized = v.normalized;
	_zc_requestJson(_zc_buildZipcodeApiUrl(normalized))
		.then((response) => {
			if (response.status === 404) {
				_zc_invokeCallback(callback, { error: '郵便番号が存在しません' });
				return null;
			}
			if (!response.ok) {
				_zc_invokeCallback(callback, { error: `APIエラー（${response.status}）` });
				return null;
			}
			return response.json();
		})
		.then((data) => {
			if (!data) return;
			if (!data.addresses || data.addresses.length === 0) {
				_zc_invokeCallback(callback, { error: '郵便番号が存在しません' });
				return null;
			}
			_zc_invokeCallback(callback, { zipCode: normalized });
		})
		.catch(() => {
			_zc_invokeCallback(callback, { error: 'API接続エラー' });
		});
};

// 公開
if (typeof window !== 'undefined') {
	window.checkZipCodeExists = checkZipCodeExists;
	window.formatZipCode = formatZipCode;
	window.getAddressByZipCode = getAddressByZipCode;
	window.getCityByZipCode = getCityByZipCode;
	window.getPrefectureByZipCode = getPrefectureByZipCode;
	window.hasPrefectureName = hasPrefectureName;
	window.registerZipCodeAddressHandler = registerZipCodeAddressHandler;
	window.registerFormBridgeZipCodeAddressHandler = registerFormBridgeZipCodeAddressHandler;
	window.normalizeZipCode = normalizeZipCode;
}

// CommonJS export for Node/test environments
try {
	if (typeof module !== 'undefined' && module && module.exports) {
		module.exports = {
			checkZipCodeExists,
			formatZipCode,
			getAddressByZipCode,
			getCityByZipCode,
			getPrefectureByZipCode,
			hasPrefectureName,
			registerZipCodeAddressHandler,
			registerFormBridgeZipCodeAddressHandler,
			normalizeZipCode,
		};
	}
} catch (e) {}
