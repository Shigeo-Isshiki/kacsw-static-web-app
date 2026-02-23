/** 郵便番号や電話番号処理を除いた運送会社に関する処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_sp_)で始める
/* exported getNextBusinessDay, kintoneShippingInquiryButton, validateTrackingNumber */
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部
// 運送会社ごとの問い合わせURLテンプレート
const _SP_SHIPPING_INQUIRY_URL_MAP = {
	yamato: 'https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno={trackingNumber}', // ヤマト運輸
	japanpost:
		'https://trackings.post.japanpost.jp/services/srv/search/direct?searchKind=S002&locale=ja&reqCodeNo1={trackingNumber}', // 日本郵便
	sagawa: 'https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo={trackingNumber}', // 佐川急便
};

// ハイフン類を検出するための正規表現（全角・半角・ダッシュ類）
const _SP_HYPHEN_REGEX = /[－‐‑–—−ー―]/g;

//　ライブラリ内の共通関数定義部
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _sp_checkString = (str) => {
	return typeof str === 'string';
};

/**
 * boolean型であることを確認する関数
 * @param {*} val 確認する値
 * @returns {boolean} boolean型である = true、そうでない = false
 */
// _sp_checkBoolean は内部ユーティリティで、外部公開は行いません

// ========== 内部: 国民の祝日判定ロジック（national-holidays.jsより組み込み） ==========
// 【重要】kintoneでの単体動作のため、national-holidays.jsのロジックをここに組み込んでいます。
// 祝日定義を変更する場合は、以下のファイルも同時に更新してください：
// - src/national-holidays.js (オリジナル)
// - src/bank-transfer.js (プレフィックス: _bt_nh_)
// --- 祝日定義定数 ---
const _sp_nh_HOLIDAYS = [
	{ type: 'fixed', month: 1, date: 1, name: '元日', since: 1949 },
	{ type: 'fixed', month: 1, date: 15, name: '成人の日', since: 1949, until: 1999 },
	{ type: 'variable', month: 1, week: 2, dayOfWeek: 1, name: '成人の日', since: 2000 },
	{ type: 'fixed', month: 2, date: 11, name: '建国記念の日', since: 1966 },
	{ type: 'fixed', month: 2, date: 23, name: '天皇誕生日', since: 2020 },
	{ type: 'equinox', month: 3, calculator: 'vernal', name: '春分の日', since: 1949 },
	{ type: 'fixed', month: 4, date: 29, name: '天皇誕生日', since: 1949, until: 1988 },
	{ type: 'fixed', month: 4, date: 29, name: 'みどりの日', since: 1989, until: 2006 },
	{ type: 'fixed', month: 4, date: 29, name: '昭和の日', since: 2007 },
	{ type: 'fixed', month: 5, date: 1, name: '天皇の即位の日', since: 2019, until: 2019 },
	{ type: 'fixed', month: 5, date: 3, name: '憲法記念日', since: 1949 },
	{ type: 'fixed', month: 5, date: 4, name: 'みどりの日', since: 2007 },
	{ type: 'fixed', month: 5, date: 5, name: 'こどもの日', since: 1949 },
	{ type: 'fixed', month: 7, date: 20, name: '海の日', since: 1996, until: 2002 },
	{
		type: 'variable',
		month: 7,
		week: 3,
		dayOfWeek: 1,
		name: '海の日',
		since: 2003,
		excludeYears: [2020, 2021],
	},
	{ type: 'fixed', month: 7, date: 23, name: '海の日', since: 2020, until: 2020 },
	{ type: 'fixed', month: 7, date: 22, name: '海の日', since: 2021, until: 2021 },
	{ type: 'fixed', month: 7, date: 24, name: 'スポーツの日', since: 2020, until: 2020 },
	{ type: 'fixed', month: 7, date: 23, name: 'スポーツの日', since: 2021, until: 2021 },
	{ type: 'fixed', month: 8, date: 11, name: '山の日', since: 2016, excludeYears: [2020, 2021] },
	{ type: 'fixed', month: 8, date: 10, name: '山の日', since: 2020, until: 2020 },
	{ type: 'fixed', month: 8, date: 8, name: '山の日', since: 2021, until: 2021 },
	{ type: 'fixed', month: 9, date: 15, name: '敬老の日', since: 1966, until: 2002 },
	{ type: 'variable', month: 9, week: 3, dayOfWeek: 1, name: '敬老の日', since: 2003 },
	{ type: 'equinox', month: 9, calculator: 'autumnal', name: '秋分の日', since: 1949 },
	{ type: 'fixed', month: 10, date: 10, name: '体育の日', since: 1966, until: 1999 },
	{
		type: 'variable',
		month: 10,
		week: 2,
		dayOfWeek: 1,
		name: '体育の日',
		since: 2000,
		until: 2019,
	},
	{
		type: 'variable',
		month: 10,
		week: 2,
		dayOfWeek: 1,
		name: 'スポーツの日',
		since: 2020,
		excludeYears: [2020, 2021],
	},
	{ type: 'fixed', month: 10, date: 22, name: '即位礼正殿の儀', since: 2019, until: 2019 },
	{ type: 'fixed', month: 11, date: 3, name: '文化の日', since: 1949 },
	{ type: 'fixed', month: 11, date: 23, name: '勤労感謝の日', since: 1949 },
	{ type: 'fixed', month: 12, date: 23, name: '天皇誕生日', since: 1989, until: 2018 },
];
const _sp_nh_EQUINOX_COEFFICIENTS = {
	vernal: [
		{ startYear: 1948, endYear: 1979, constant: 20.8357, coefficient: 0.242194 },
		{ startYear: 1980, endYear: 2099, constant: 20.8431, coefficient: 0.242194 },
		{ startYear: 2100, endYear: 2150, constant: 21.851, coefficient: 0.242194 },
	],
	autumnal: [
		{ startYear: 1948, endYear: 1979, constant: 23.2588, coefficient: 0.242194 },
		{ startYear: 1980, endYear: 2099, constant: 23.2488, coefficient: 0.242194 },
		{ startYear: 2100, endYear: 2150, constant: 24.2488, coefficient: 0.242194 },
	],
};

// --- ヘルパー関数 ---
const _sp_nh_getEquinoxCoefficient = (year, type) => {
	const coefficients = _sp_nh_EQUINOX_COEFFICIENTS[type];
	if (!coefficients) return null;
	for (const coeff of coefficients) {
		if (year >= coeff.startYear && year <= coeff.endYear) return coeff;
	}
	return null;
};
const _sp_nh_formatDateFromDate = (date) => {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const _sp_nh_formatDate = (year, month, day) => {
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const _sp_nh_parseDate = (dateStr) => {
	const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
	return new Date(year, month - 1, day);
};
const _sp_nh_addDays = (date, days) => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};
const _sp_nh_getVernalEquinoxDate = (year) => {
	const coeff = _sp_nh_getEquinoxCoefficient(year, 'vernal');
	if (!coeff) throw new Error(`春分の日の計算に対応していない年度です: ${year}年`);
	const a = Math.floor((year - 1980) / 4);
	const day = coeff.constant + coeff.coefficient * (year - 1980) - a;
	return Math.floor(day);
};
const _sp_nh_getAutumnalEquinoxDate = (year) => {
	const coeff = _sp_nh_getEquinoxCoefficient(year, 'autumnal');
	if (!coeff) throw new Error(`秋分の日の計算に対応していない年度です: ${year}年`);
	const a = Math.floor((year - 1980) / 4);
	const day = coeff.constant + coeff.coefficient * (year - 1980) - a;
	return Math.floor(day);
};
const _sp_nh_getNthWeekdayDate = (year, month, week, dayOfWeek) => {
	const firstDay = new Date(year, month - 1, 1);
	const firstDayOfWeek = firstDay.getDay();
	const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
	return 1 + diff + (week - 1) * 7;
};
const _sp_nh_isValidYear = (year) => year >= 1949;
const _sp_nh_getBaseHolidaysForYear = (year) => {
	const holidays = [];
	for (const holiday of _sp_nh_HOLIDAYS) {
		if (holiday.since > year || (holiday.until && year > holiday.until)) continue;
		if (holiday.excludeYears && holiday.excludeYears.includes(year)) continue;
		if (holiday.type === 'fixed') {
			const dateStr = _sp_nh_formatDate(year, holiday.month, holiday.date);
			holidays.push({ date: dateStr, name: holiday.name });
		}
		if (holiday.type === 'variable') {
			const day = _sp_nh_getNthWeekdayDate(year, holiday.month, holiday.week, holiday.dayOfWeek);
			const dateStr = _sp_nh_formatDate(year, holiday.month, day);
			holidays.push({ date: dateStr, name: holiday.name });
		}
		if (holiday.type === 'equinox') {
			let equinoxDate;
			if (holiday.calculator === 'vernal') equinoxDate = _sp_nh_getVernalEquinoxDate(year);
			else if (holiday.calculator === 'autumnal') equinoxDate = _sp_nh_getAutumnalEquinoxDate(year);
			const dateStr = _sp_nh_formatDate(year, holiday.month, equinoxDate);
			holidays.push({ date: dateStr, name: holiday.name });
		}
	}
	return holidays;
};
const _sp_nh_addNationalHolidays = (holidayMap, year) => {
	if (year < 1985) return;
	for (
		let date = new Date(year, 0, 1);
		date.getFullYear() === year;
		date = _sp_nh_addDays(date, 1)
	) {
		const dateStr = _sp_nh_formatDateFromDate(date);
		if (holidayMap.has(dateStr)) continue;
		const prevStr = _sp_nh_formatDateFromDate(_sp_nh_addDays(date, -1));
		const nextStr = _sp_nh_formatDateFromDate(_sp_nh_addDays(date, 1));
		if (holidayMap.has(prevStr) && holidayMap.has(nextStr)) {
			holidayMap.set(dateStr, '国民の休日');
		}
	}
};
const _sp_nh_addSubstituteHolidays = (holidayMap, year) => {
	if (year < 1973) return;
	const workingMap = new Map(holidayMap);
	const baseDates = Array.from(holidayMap.keys());
	for (const dateStr of baseDates) {
		const date = _sp_nh_parseDate(dateStr);
		if (date.getDay() !== 0) continue;
		if (year <= 2006) {
			const nextDate = _sp_nh_addDays(date, 1);
			const nextStr = _sp_nh_formatDateFromDate(nextDate);
			if (!workingMap.has(nextStr)) {
				workingMap.set(nextStr, '振替休日');
				holidayMap.set(nextStr, '振替休日');
			}
			continue;
		}
		let substituteDate = _sp_nh_addDays(date, 1);
		while (workingMap.has(_sp_nh_formatDateFromDate(substituteDate))) {
			substituteDate = _sp_nh_addDays(substituteDate, 1);
		}
		const substituteStr = _sp_nh_formatDateFromDate(substituteDate);
		workingMap.set(substituteStr, '振替休日');
		holidayMap.set(substituteStr, '振替休日');
	}
};
const _sp_nh_buildHolidayMap = (year) => {
	const map = new Map();
	const baseHolidays = _sp_nh_getBaseHolidaysForYear(year);
	for (const holiday of baseHolidays) {
		map.set(holiday.date, holiday.name);
	}
	_sp_nh_addNationalHolidays(map, year);
	_sp_nh_addSubstituteHolidays(map, year);
	return map;
};
const _sp_nh_getNationalHolidayNameByLaw = (date) => {
	let targetDate;
	if (typeof date === 'string') {
		const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (!match) throw new Error('日付は yyyy-MM-dd 形式で指定してください');
		targetDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
	} else if (date instanceof Date) {
		targetDate = new Date(date);
	} else {
		throw new Error('日付はDateオブジェクトまたは文字列で指定してください');
	}
	const year = targetDate.getFullYear();
	const month = targetDate.getMonth() + 1;
	const day = targetDate.getDate();
	if (!_sp_nh_isValidYear(year)) return null;
	const holidayMap = _sp_nh_buildHolidayMap(year);
	const dateStr = _sp_nh_formatDate(year, month, day);
	return holidayMap.get(dateStr) || null;
};
const _sp_nh_isNationalHoliday = (date) => {
	return _sp_nh_getNationalHolidayNameByLaw(date) !== null;
};
// ========== 国民の祝日判定ロジック終了 ==========

/**
 * 指定された日付が国民の祝日かどうかを判定する内部関数（コールバック形式）
 * @param {Date} date 判定対象の日付
 * @param {(isHoliday: boolean) => void} callback 判定結果を返すコールバック関数
 * @returns {void}
 */
const _sp_isNationalHolidayCallback = (date, callback) => {
	const result = _sp_nh_isNationalHoliday(date);
	callback(result);
};

/**
 * 指定された日付が営業日（土日・祝日・年末年始を除く平日）かどうかを判定する内部関数（コールバック形式）
 * @param {Date} date 判定対象の日付
 * @param {(isBusinessDay: boolean) => void} callback 判定結果を返すコールバック関数
 * @returns {void}
 */
const _sp_isBusinessDayCallback = (date, callback) => {
	const dayOfWeek = date.getDay(); // 0=日曜日, 6=土曜日
	const month = date.getMonth() + 1; // 1-12月
	const day = date.getDate();

	// 土曜日または日曜日は営業日ではない
	if (dayOfWeek === 0 || dayOfWeek === 6) {
		callback(false);
		return;
	}

	// 年末年始（12月29日〜1月4日）は営業日ではない
	if ((month === 12 && day >= 29) || (month === 1 && day <= 4)) {
		callback(false);
		return;
	}

	// 国民の祝日は営業日ではない
	_sp_isNationalHolidayCallback(date, (isHoliday) => {
		if (isHoliday) {
			callback(false);
		} else {
			callback(true);
		}
	});
};

//　ライブラリ本体部
/**
 * 発送日として適切な営業日を取得する関数（コールバック形式）
 * 土曜日、日曜日、国民の祝日、年末年始（12月29日～1月4日）を除いた営業日を返す
 * cutoffHour以降の場合は翌営業日を返す（省略時は16時）
 * @param {Date|string} [baseDate=new Date()] 基準日時（省略時は現在日時、kintoneの日付・日時フィールド形式にも対応）
 * @param {number} [cutoffHour=16] 締め時刻（省略時は16）
 * @param {(businessDay: string) => void} callback 発送可能な営業日（YYYY-MM-DD形式）を返すコールバック関数
 * @returns {void}
 * @throws {Error} 不正な日付の場合は例外
 */
const getNextBusinessDay = (baseDate = new Date(), cutoffHour = 16, callback) => {
	if (typeof callback !== 'function') {
		throw new Error('callback は関数である必要があります');
	}
	// cutoffHourが文字列の場合も数値化して判定
	const cutoffHourNum = Number(cutoffHour);
	if (!Number.isInteger(cutoffHourNum) || cutoffHourNum < 0 || cutoffHourNum > 23) {
		throw new Error('締め時刻は0～23の整数である必要があります');
	}
	let targetDate;
	let hasTimeInfo = false;
	// 文字列の場合はDateオブジェクトに変換
	if (typeof baseDate === 'string') {
		targetDate = new Date(baseDate);
		// 文字列に時刻情報が含まれているか判定（"T"や空白区切りで時刻がある場合）
		hasTimeInfo = /T\d{2}:\d{2}|\d{2}:\d{2}/.test(baseDate);
	} else if (baseDate instanceof Date) {
		targetDate = new Date(baseDate);
		// Date型で時刻が0:0:0以外なら時刻情報あり
		hasTimeInfo =
			targetDate.getHours() !== 0 || targetDate.getMinutes() !== 0 || targetDate.getSeconds() !== 0;
	} else {
		throw new Error('基準日時は日付文字列、またはDate型である必要があります');
	}
	// 有効な日付かチェック
	if (isNaN(targetDate.getTime())) {
		throw new Error('基準日時は有効な日付である必要があります');
	}
	// 時刻情報がある場合のみcutoffHour判定
	if (hasTimeInfo && targetDate.getHours() >= cutoffHourNum) {
		targetDate.setDate(targetDate.getDate() + 1);
	}
	// 営業日を探す再帰関数
	const findBusinessDay = () => {
		_sp_isBusinessDayCallback(targetDate, (isBusinessDay) => {
			if (isBusinessDay) {
				// 営業日が見つかったので結果を返す
				const year = targetDate.getFullYear();
				const month = String(targetDate.getMonth() + 1).padStart(2, '0');
				const day = String(targetDate.getDate()).padStart(2, '0');
				callback(`${year}-${month}-${day}`);
			} else {
				// 営業日でない場合は翌日をチェック
				targetDate.setDate(targetDate.getDate() + 1);
				findBusinessDay();
			}
		});
	};
	findBusinessDay();
};

/**
 * kintoneのスペースフィールドに荷物問い合わせボタンを追加・削除する関数
 *
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - ボタン要素のID名（任意のもの）
 * @param {string|undefined|null} label - ボタンラベル（省略時はデフォルト文言）
 *   - 文字列: 指定ラベル
 *   - undefined: デフォルト文言（例: '荷物問い合わせ'）
 *   - null/空文字: ボタン非表示（削除）
 * @param {string} trackingNumber - 問い合わせ番号（伝票番号）
 * @param {('yamato'|'japanpost'|'sagawa')} carrier - 運送会社（'yamato'、'japanpost'、または'sagawa'）
 * @returns {void}
 * @description labelの値により表示制御：
 *   - 文字列なら指定ラベルで表示
 *   - undefinedならデフォルト文言で表示
 *   - null/空文字ならボタン非表示（削除）
 *   ボタン押下時、公式サイト（ヤマト運輸・日本郵便・佐川急便）に遷移します。
 */
const kintoneShippingInquiryButton = (spaceField, id, label, trackingNumber, carrier) => {
	if (
		typeof spaceField !== 'string' ||
		!spaceField.trim() ||
		typeof id !== 'string' ||
		!id.trim() ||
		(label !== null && typeof label !== 'string' && typeof label !== 'undefined') ||
		(carrier !== null && typeof carrier !== 'string')
	) {
		return;
	}
	// 既存ボタン削除
	const buttonElementById = document.getElementById(id);
	if (buttonElementById) {
		buttonElementById.remove();
	}
	// URL生成関数
	const getInquiryUrl = (carrier, trackingNumber) => {
		const template = _SP_SHIPPING_INQUIRY_URL_MAP[carrier];
		if (!template) return '';
		return template.replace('{trackingNumber}', encodeURIComponent(trackingNumber));
	};
	let textContent = '';
	if (label !== undefined && label !== null && label !== '') {
		textContent = label;
	} else if (label === undefined) {
		// デフォルト文言
		textContent = '荷物問い合わせ';
	}
	if (textContent === '' || !trackingNumber || !carrier) {
		// 非表示
		const spaceElement = kintone.app.record.getSpaceElement(spaceField);
		if (spaceElement && spaceElement.parentNode) {
			spaceElement.parentNode.style.display = 'none';
		}
		return;
	}
	// ボタン追加
	const button = document.createElement('button');
	button.id = id;
	button.textContent = textContent;
	button.addEventListener('click', () => {
		const url = getInquiryUrl(carrier, trackingNumber);
		if (url) window.open(url, '_blank');
	});
	const spaceElement = kintone.app.record.getSpaceElement(spaceField);
	if (spaceElement) {
		spaceElement.appendChild(button);
		spaceElement.parentNode.style.display = '';
	}
	return;
};

/**
 * 運送会社の伝票番号を半角数字のみに変換し、正しい形式かどうかを判定する関数
 * 全角・半角を問わず数字とハイフン・空白を許容し、最終的に半角数字のみの形式に変換する
 * 日本郵便・ヤマト運輸・佐川急便の伝票番号形式に対応
 * @param {string} trackingNumber チェック対象の伝票番号
 * @param {number} [minLength=10] 最小桁数（省略時は10桁、日本の主要3社対応）
 * @param {number} [maxLength=14] 最大桁数（省略時は14桁、日本の主要3社対応）
 * @returns {string} 変換後の伝票番号（半角数字のみ）
 * @throws {Error} 不正な場合は例外
 */
const validateTrackingNumber = (trackingNumber, minLength = 10, maxLength = 14) => {
	if (!_sp_checkString(trackingNumber)) throw new Error('伝票番号は文字列である必要があります');
	if (!Number.isInteger(minLength) || minLength < 1)
		throw new Error('最小桁数は1以上の整数である必要があります');
	if (!Number.isInteger(maxLength) || maxLength < minLength)
		throw new Error('最大桁数は最小桁数以上の整数である必要があります');
	if (!trackingNumber.trim()) throw new Error('伝票番号が空です');
	// ハイフン類を統一し、全角文字を半角に変換
	let processed = trackingNumber.replace(_SP_HYPHEN_REGEX, '-');
	processed = processed.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
	processed = processed.replace(/\u3000/g, ' '); // 全角スペースを半角に
	// タブ・改行・復帰コードなども半角スペースに統一
	processed = processed.replace(/[\t\n\r]/g, ' ');
	// 半角数字・ハイフン・空白以外が含まれていればエラー
	if (!/^[0-9\- ]+$/.test(processed)) {
		const invalid = processed.match(/[^0-9\- ]/)[0];
		throw new Error(`伝票番号には半角数字・ハイフン・空白のみ許容されます。不正な文字: ${invalid}`);
	}
	// ハイフンと空白を除去して数字のみにする
	const digitsOnly = processed.replace(/[\- ]/g, '');
	// 桁数チェック
	if (digitsOnly.length < minLength || digitsOnly.length > maxLength) {
		throw new Error(
			`伝票番号は${minLength}桁以上${maxLength}桁以下の数字である必要があります（現在: ${digitsOnly.length}桁）`
		);
	}
	return digitsOnly;
};

// 公開
if (typeof window !== 'undefined') {
	window.getNextBusinessDay = getNextBusinessDay;
	window.kintoneShippingInquiryButton = kintoneShippingInquiryButton;
	window.validateTrackingNumber = validateTrackingNumber;
}

// shipping-processing の内部ユーティリティは非公開化しました
