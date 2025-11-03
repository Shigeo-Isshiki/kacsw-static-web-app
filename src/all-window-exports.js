/*
 * all-window-exports.js
 *
 * このファイルはリポジトリ内の各ソースファイルで `/* exported ... *` コメント
 * によって公開予定とマークされた識別子を末尾でまとめて `window` に割り当てます。
 *
 * 注意:
 * - このファイルは他のスクリプトの後で読み込む必要があります（TDZ を避けるため）。
 * - 存在しない識別子や参照できないものは無視します（安全なガードつき）。
 */
(function () {
	'use strict';

	var globalObj =
		typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : globalThis;

	// src/* 内の /* exported ... */ コメントから抽出した公開候補名のリスト
	var names = [
		// date-utils.js
		'convertToSeireki',
		'convertToEra',
		'convertToYear',
		// kintone-custom-lib.js
		'notifyError',
		'getFieldValueOr',
		'kintoneEventOn',
		'notifyInfo',
		'notifyWarning',
		'setRecordValues',
		'setSpaceFieldDisplay',
		'setSpaceFieldButton',
		'setSpaceFieldText',
		// phone-utils.js
		'isValidPhoneNumber',
		'formatPhoneNumber',
		'getPhoneNumberType',
		'normalizePhoneNumber',
		// shipping-processing.js
		'getNextBusinessDay',
		'kintoneShippingInquiryButton',
		'validateTrackingNumber',
		// text-suite.js
		'isSingleByteAlnumOnly',
		'toFullWidthKatakana',
		'toFullWidth',
		'toFullWidthHiragana',
		'toHalfWidthKana',
		'toHalfWidth',
		'assertEmailAddress',
		// vc-check.js
		'validateZoomMeetingId',
		'validateZoomPasscode',
		'validateZoomUrl',
		// zip-code-address-utils.js
		'checkZipCodeExists',
		'formatZipCode',
		'getAddressByZipCode',
		'getCityByZipCode',
		'getPrefectureByZipCode',
		'kintoneZipSetSpaceFieldButton',
		'kintoneZipSpaceFieldText',
		'normalizeZipCode',
		// national_holiday_handling.js
		'getNationalHolidayName',
		// password_generation.js
		'getPassword',
		// zipcode_processing.js
		'getZipcodeAddress',
		// character_handling.js
		'convert_to_hiragana',
		'convert_to_double_byte_characters',
		'convert_to_email_address',
		'check_single_byte_numbers',
		// financial_institution_processing.js
		'convertAccountHolderKana',
		'getByteLength',
		'sliceByByteLength',
		'convertJapanPostAccount',
		'isValidTransferDate',
		// jquery.autoKana.js
		// note: `start` and `toggle` are defined only inside the plugin scope and
		// are not safe to expose as globals; keep `stop` which is provided as a helper
		'stop',
	];

	names.forEach(function (name) {
		try {
			// typeof を文字列で評価して ReferenceError を避ける
			var t = eval('typeof ' + name);
			if (t !== 'undefined') {
				// 既に window にある場合は上書きしない（kintone 側の既存定義を壊さない）
				if (typeof globalObj[name] === 'undefined') {
					globalObj[name] = eval(name);
				}
			}
		} catch {
			// 安全のため何もしない
		}
	});
})();
