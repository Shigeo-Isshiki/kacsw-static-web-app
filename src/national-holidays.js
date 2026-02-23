/**
 * 国民の祝日に関する法律に基づいた国民の祝日の出力・判定ユーティリティ関数群
 *
 * @fileoverview 国民の祝日に関する法律（昭和23年法律第178号）に基づいて、
 * 指定された日付が祝日かどうかの判定、祝日名の取得、年間祝日リストの生成を行います。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_nh_)で始める
/* exported isNationalHoliday, getNationalHolidayNameByLaw, getNationalHolidaysInYear */
'use strict';

// --- 祝日定義定数 ---
/**
 * 国民の祝日統合定義
 * 祝日法（昭和23年法律第178号）施行日：1948年7月20日
 *
 * 祝日は３つのタイプに分類される：
 * - 'fixed'：月日が固定された祝日（例：元日1月1日）
 * - 'variable'：第n曜日のように計算される祝日（例：成人の日は1月第2月曜日）
 * - 'equinox'：天文計算で決められる祝日（春分の日、秋分の日）
 *
 * @type {Array<{
 *   type: 'fixed' | 'variable' | 'equinox',
 *   month: number,
 *   date?: number,
 *   week?: number,
 *   dayOfWeek?: number,
 *   calculator?: 'vernal' | 'autumnal',
 *   name: string,
 *   since: number,
 *   until?: number,
 *   excludeYears?: number[]
 * }>}
 * @private
 */
const _NH_HOLIDAYS = [
	// ===== 1月の祝日 =====
	// 元日（1月1日）
	{ type: 'fixed', month: 1, date: 1, name: '元日', since: 1949 },

	// 成人の日：1月15日固定（1949年から1999年）
	{ type: 'fixed', month: 1, date: 15, name: '成人の日', since: 1949, until: 1999 },

	// 成人の日：1月第2月曜日（2000年から）
	{ type: 'variable', month: 1, week: 2, dayOfWeek: 1, name: '成人の日', since: 2000 },

	// ===== 2月の祝日 =====
	// 建国記念の日（2月11日、1966年から）
	{ type: 'fixed', month: 2, date: 11, name: '建国記念の日', since: 1966 },

	// 天皇誕生日：2月23日（2020年から、令和天皇）
	{ type: 'fixed', month: 2, date: 23, name: '天皇誕生日', since: 2020 },

	// ===== 3月の祝日 =====
	// 春分の日（天文計算、1949年から）
	{ type: 'equinox', month: 3, calculator: 'vernal', name: '春分の日', since: 1949 },

	// ===== 4月の祝日 =====
	// 4月29日：天皇誕生日（1949年から1988年）
	{ type: 'fixed', month: 4, date: 29, name: '天皇誕生日', since: 1949, until: 1988 },

	// 4月29日：みどりの日（1989年から2006年）
	{ type: 'fixed', month: 4, date: 29, name: 'みどりの日', since: 1989, until: 2006 },

	// 4月29日：昭和の日（2007年から）
	{ type: 'fixed', month: 4, date: 29, name: '昭和の日', since: 2007 },

	// ===== 5月の祝日 =====
	// 天皇の即位の日（2019年のみ）
	{ type: 'fixed', month: 5, date: 1, name: '天皇の即位の日', since: 2019, until: 2019 },

	// 憲法記念日（5月3日、1949年から）
	{ type: 'fixed', month: 5, date: 3, name: '憲法記念日', since: 1949 },

	// みどりの日：5月4日（2007年から、旧みどりの日の移動）
	{ type: 'fixed', month: 5, date: 4, name: 'みどりの日', since: 2007 },

	// こどもの日（5月5日、1949年から）
	{ type: 'fixed', month: 5, date: 5, name: 'こどもの日', since: 1949 },

	// ===== 7月の祝日 =====
	// 海の日：7月20日固定（1996年から2002年）
	{ type: 'fixed', month: 7, date: 20, name: '海の日', since: 1996, until: 2002 },

	// 海の日：7月第3月曜日（2003年から）
	{
		type: 'variable',
		month: 7,
		week: 3,
		dayOfWeek: 1,
		name: '海の日',
		since: 2003,
		excludeYears: [2020, 2021],
	},

	// 海の日（2020年特例：7月23日）
	{ type: 'fixed', month: 7, date: 23, name: '海の日', since: 2020, until: 2020 },

	// 海の日（2021年特例：7月22日）
	{ type: 'fixed', month: 7, date: 22, name: '海の日', since: 2021, until: 2021 },

	// スポーツの日（2020年特例：7月24日）
	{ type: 'fixed', month: 7, date: 24, name: 'スポーツの日', since: 2020, until: 2020 },

	// スポーツの日（2021年特例：7月23日）
	{ type: 'fixed', month: 7, date: 23, name: 'スポーツの日', since: 2021, until: 2021 },

	// ===== 8月の祝日 =====
	// 山の日（8月11日、2016年から）
	{ type: 'fixed', month: 8, date: 11, name: '山の日', since: 2016, excludeYears: [2020, 2021] },

	// 山の日（2020年特例：8月10日）
	{ type: 'fixed', month: 8, date: 10, name: '山の日', since: 2020, until: 2020 },

	// 山の日（2021年特例：8月8日）
	{ type: 'fixed', month: 8, date: 8, name: '山の日', since: 2021, until: 2021 },

	// ===== 9月の祝日 =====
	// 敬老の日：9月15日固定（1966年から2002年）
	{ type: 'fixed', month: 9, date: 15, name: '敬老の日', since: 1966, until: 2002 },

	// 敬老の日：9月第3月曜日（2003年から）
	{ type: 'variable', month: 9, week: 3, dayOfWeek: 1, name: '敬老の日', since: 2003 },

	// 秋分の日（天文計算、1949年から）
	{ type: 'equinox', month: 9, calculator: 'autumnal', name: '秋分の日', since: 1949 },

	// ===== 10月の祝日 =====
	// 体育の日：10月10日固定（1966年から1999年）
	{ type: 'fixed', month: 10, date: 10, name: '体育の日', since: 1966, until: 1999 },

	// 体育の日：10月第2月曜日（2000年から2019年）
	{
		type: 'variable',
		month: 10,
		week: 2,
		dayOfWeek: 1,
		name: '体育の日',
		since: 2000,
		until: 2019,
	},

	// スポーツの日：10月第2月曜日（2020年から、体育の日から改称）
	{
		type: 'variable',
		month: 10,
		week: 2,
		dayOfWeek: 1,
		name: 'スポーツの日',
		since: 2020,
		excludeYears: [2020, 2021],
	},

	// 即位礼正殿の儀（2019年のみ）
	{ type: 'fixed', month: 10, date: 22, name: '即位礼正殿の儀', since: 2019, until: 2019 },

	// ===== 11月の祝日 =====
	// 文化の日（11月3日、1949年から）
	{ type: 'fixed', month: 11, date: 3, name: '文化の日', since: 1949 },

	// 勤労感謝の日（11月23日、1949年から）
	{ type: 'fixed', month: 11, date: 23, name: '勤労感謝の日', since: 1949 },

	// ===== 12月の祝日 =====
	// 天皇誕生日：12月23日（1989年から2018年、平成天皇）
	{ type: 'fixed', month: 12, date: 23, name: '天皇誕生日', since: 1989, until: 2018 },
];

// --- 内部関数とヘルパー定数 ---

/**
 * 天文計算用の係数定義
 * 国立天文台の公開式に基づく、年代別の春分・秋分計算係数
 * @type {Object}
 * @private
 */
const _NH_EQUINOX_COEFFICIENTS = {
	// 春分の日の計算係数（年代別）
	vernal: [
		// 1948～1979年の係数
		{ startYear: 1948, endYear: 1979, constant: 20.8357, coefficient: 0.242194 },
		// 1980～2099年の係数
		{ startYear: 1980, endYear: 2099, constant: 20.8431, coefficient: 0.242194 },
		// 2100～2150年の係数（将来の拡張用）
		{ startYear: 2100, endYear: 2150, constant: 21.851, coefficient: 0.242194 },
	],
	// 秋分の日の計算係数（年代別）
	autumnal: [
		// 1948～1979年の係数
		{ startYear: 1948, endYear: 1979, constant: 23.2588, coefficient: 0.242194 },
		// 1980～2099年の係数
		{ startYear: 1980, endYear: 2099, constant: 23.2488, coefficient: 0.242194 },
		// 2100～2150年の係数（将来の拡張用）
		{ startYear: 2100, endYear: 2150, constant: 24.2488, coefficient: 0.242194 },
	],
};

/**
 * 指定された年の天文計算用係数を取得する
 * @param {number} year 西暦年
 * @param {'vernal' | 'autumnal'} type 春分または秋分
 * @returns {Object|null} 係数オブジェクト、該当なければnull
 * @private
 */
const _nh_getEquinoxCoefficient = (year, type) => {
	const coefficients = _NH_EQUINOX_COEFFICIENTS[type];
	if (!coefficients) return null;

	for (const coeff of coefficients) {
		if (year >= coeff.startYear && year <= coeff.endYear) {
			return coeff;
		}
	}
	return null;
};

/**
 * Date オブジェクトを YYYY-MM-DD 形式の文字列に変換する
 * @param {Date} date Date オブジェクト
 * @returns {string} YYYY-MM-DD 形式
 * @private
 */
const _nh_formatDateFromDate = (date) => {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
		date.getDate()
	).padStart(2, '0')}`;
};

/**
 * 年月日を YYYY-MM-DD 形式の文字列に変換する
 * @param {number} year 西暦年
 * @param {number} month 月（1-12）
 * @param {number} day 日（1-31）
 * @returns {string} YYYY-MM-DD 形式
 * @private
 */
const _nh_formatDate = (year, month, day) => {
	return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/**
 * YYYY-MM-DD 形式の文字列を Date オブジェクトに変換する
 * @param {string} dateStr YYYY-MM-DD 形式
 * @returns {Date} Date オブジェクト
 * @private
 */
const _nh_parseDate = (dateStr) => {
	const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
	return new Date(year, month - 1, day);
};

/**
 * Date オブジェクトに日数を加算する
 * @param {Date} date Date オブジェクト
 * @param {number} days 加算日数
 * @returns {Date} 新しい Date オブジェクト
 * @private
 */
const _nh_addDays = (date, days) => {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
};

/**
 * 指定年の基本祝日（振替・国民の休日を除く）を取得する
 * @param {number} year 西暦年
 * @returns {Array<{date: string, name: string}>} 祝日配列
 * @private
 */
const _nh_getBaseHolidaysForYear = (year) => {
	const holidays = [];

	for (const holiday of _NH_HOLIDAYS) {
		if (holiday.since > year || (holiday.until && year > holiday.until)) {
			continue;
		}
		if (holiday.excludeYears && holiday.excludeYears.includes(year)) {
			continue;
		}

		if (holiday.type === 'fixed') {
			const dateStr = _nh_formatDate(year, holiday.month, holiday.date);
			holidays.push({ date: dateStr, name: holiday.name });
		}

		if (holiday.type === 'variable') {
			const day = _nh_getNthWeekdayDate(year, holiday.month, holiday.week, holiday.dayOfWeek);
			const dateStr = _nh_formatDate(year, holiday.month, day);
			holidays.push({ date: dateStr, name: holiday.name });
		}

		if (holiday.type === 'equinox') {
			let equinoxDate;
			if (holiday.calculator === 'vernal') {
				equinoxDate = _nh_getVernalEquinoxDate(year);
			} else if (holiday.calculator === 'autumnal') {
				equinoxDate = _nh_getAutumnalEquinoxDate(year);
			}
			const dateStr = _nh_formatDate(year, holiday.month, equinoxDate);
			holidays.push({ date: dateStr, name: holiday.name });
		}
	}

	return holidays;
};

/**
 * 国民の休日を追加する（1985年以降）
 * @param {Map<string, string>} holidayMap 祝日マップ
 * @param {number} year 西暦年
 * @private
 */
const _nh_addNationalHolidays = (holidayMap, year) => {
	if (year < 1985) return;

	for (let date = new Date(year, 0, 1); date.getFullYear() === year; date = _nh_addDays(date, 1)) {
		const dateStr = _nh_formatDateFromDate(date);
		if (holidayMap.has(dateStr)) continue;

		const prevStr = _nh_formatDateFromDate(_nh_addDays(date, -1));
		const nextStr = _nh_formatDateFromDate(_nh_addDays(date, 1));
		if (holidayMap.has(prevStr) && holidayMap.has(nextStr)) {
			holidayMap.set(dateStr, '国民の休日');
		}
	}
};

/**
 * 振替休日を追加する
 * - 1973年から適用
 * - 2006年までは次の1日だけ
 * - 2007年以降は最初の平日に繰り下げ
 * @param {Map<string, string>} holidayMap 祝日マップ
 * @param {number} year 西暦年
 * @private
 */
const _nh_addSubstituteHolidays = (holidayMap, year) => {
	if (year < 1973) return;

	const workingMap = new Map(holidayMap);
	const baseDates = Array.from(holidayMap.keys());

	for (const dateStr of baseDates) {
		const date = _nh_parseDate(dateStr);
		if (date.getDay() !== 0) continue;

		if (year <= 2006) {
			const nextDate = _nh_addDays(date, 1);
			const nextStr = _nh_formatDateFromDate(nextDate);
			if (!workingMap.has(nextStr)) {
				workingMap.set(nextStr, '振替休日');
				holidayMap.set(nextStr, '振替休日');
			}
			continue;
		}

		let substituteDate = _nh_addDays(date, 1);
		while (workingMap.has(_nh_formatDateFromDate(substituteDate))) {
			substituteDate = _nh_addDays(substituteDate, 1);
		}
		const substituteStr = _nh_formatDateFromDate(substituteDate);
		workingMap.set(substituteStr, '振替休日');
		holidayMap.set(substituteStr, '振替休日');
	}
};

/**
 * 指定年の祝日マップを生成する
 * @param {number} year 西暦年
 * @returns {Map<string, string>} 祝日マップ
 * @private
 */
const _nh_buildHolidayMap = (year) => {
	const map = new Map();
	const baseHolidays = _nh_getBaseHolidaysForYear(year);
	for (const holiday of baseHolidays) {
		map.set(holiday.date, holiday.name);
	}

	_nh_addNationalHolidays(map, year);
	_nh_addSubstituteHolidays(map, year);

	return map;
};

/**
 * 春分の月日を計算するヘルパー関数
 * 近似公式を使用：国立天文台の計算法に基づく
 * 精度：1948年～2099年の範囲で日本国内での計算に対応
 * 注：国立天文台が前年の2月1日に官報で告示する正式な日付が最終的な根拠
 * @param {number} year 西暦年
 * @returns {number} 春分の日（1-31）
 * @throws {Error} 年代外の場合
 * @private
 */
const _nh_getVernalEquinoxDate = (year) => {
	const coeff = _nh_getEquinoxCoefficient(year, 'vernal');
	if (!coeff) {
		throw new Error(`春分の日の計算に対応していない年度です: ${year}年`);
	}

	// 国立天文台の公開式：INT(constant + coefficient * (year - 1980) - INT((year - 1980) / 4))
	const a = Math.floor((year - 1980) / 4);
	const day = coeff.constant + coeff.coefficient * (year - 1980) - a;
	return Math.floor(day);
};

/**
 * 秋分の月日を計算するヘルパー関数
 * 近似公式を使用：国立天文台の計算法に基づく
 * 精度：1948年～2099年の範囲で日本国内での計算に対応
 * 注：国立天文台が前年の2月1日に官報で告示する正式な日付が最終的な根拠
 * @param {number} year 西暦年
 * @returns {number} 秋分の日（1-31）
 * @throws {Error} 年代外の場合
 * @private
 */
const _nh_getAutumnalEquinoxDate = (year) => {
	const coeff = _nh_getEquinoxCoefficient(year, 'autumnal');
	if (!coeff) {
		throw new Error(`秋分の日の計算に対応していない年度です: ${year}年`);
	}

	// 国立天文台の公開式：INT(constant + coefficient * (year - 1980) - INT((year - 1980) / 4))
	const a = Math.floor((year - 1980) / 4);
	const day = coeff.constant + coeff.coefficient * (year - 1980) - a;
	return Math.floor(day);
};

/**
 * 指定された年月の第n週の特定曜日の日付を計算するヘルパー関数
 * 例：2025年1月の第2月曜日 → _nh_getNthWeekdayDate(2025, 1, 2, 1) → 13日
 * @param {number} year 西暦年
 * @param {number} month 月（1-12）
 * @param {number} week 第n週（1-5）
 * @param {number} dayOfWeek 曜日（0=日, 1=月, ..., 6=土）
 * @returns {number} 該当する日付（1-31）
 * @private
 */
const _nh_getNthWeekdayDate = (year, month, week, dayOfWeek) => {
	const firstDay = new Date(year, month - 1, 1);
	const firstDayOfWeek = firstDay.getDay();
	const diff = (dayOfWeek - firstDayOfWeek + 7) % 7;
	return 1 + diff + (week - 1) * 7;
};

/**
 * 指定日が祝日法の対象年か確認する
 * 祝日法の施行日は1948年7月20日だが、実際の祝日適用は1949年から（昭和24年）
 * @param {number} year 西暦年
 * @returns {boolean} 1949年以降ならtrue
 * @private
 */
const _nh_isValidYear = (year) => year >= 1949;

// --- 外部公開関数群 ---

/**
 * 指定日が祝日法に基づく祝日かどうかを判定する
 * @function isNationalHoliday
 * @param {Date|string} date 判定対象の日付（Dateオブジェクトまたはyyyy-MM-dd形式の文字列）
 * @returns {boolean} 祝日ならtrue、そうでなければfalse
 * @public
 * @example
 * isNationalHoliday('2025-01-01'); // true (元日)
 * isNationalHoliday(new Date(2025, 0, 13)); // true (成人の日)
 */
const isNationalHoliday = (date) => {
	return getNationalHolidayNameByLaw(date) !== null;
};

/**
 * 指定日の祝日名を祝日法から取得する
 * @function getNationalHolidayNameByLaw
 * @param {Date|string} date 判定対象の日付（Dateオブジェクトまたはyyyy-MM-dd形式の文字列）
 * @returns {string|null} 祝日名、祝日でなければnull
 * @throws {Error} 不正な日付形式の場合
 * @public
 * @example
 * getNationalHolidayNameByLaw('2025-01-01'); // '元日'
 * getNationalHolidayNameByLaw('2025-01-13'); // '成人の日'
 * getNationalHolidayNameByLaw('2025-01-10'); // null
 */
const getNationalHolidayNameByLaw = (date) => {
	let targetDate;

	// 日付の正規化
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

	if (!_nh_isValidYear(year)) {
		return null;
	}

	const holidayMap = _nh_buildHolidayMap(year);
	const dateStr = _nh_formatDate(year, month, day);
	return holidayMap.get(dateStr) || null;
};

/**
 * 指定年の全祝日をリスト形式で取得する
 * @function getNationalHolidaysInYear
 * @param {number} year 西暦年
 * @returns {Array<{date: string, name: string}>} 祝日の配列（日付昇順）
 * @throws {Error} 不正な年度の場合
 * @public
 * @example
 * getNationalHolidaysInYear(2025);
 * // [
 * //   { date: '2025-01-01', name: '元日' },
 * //   { date: '2025-01-13', name: '成人の日' },
 * //   ...
 * // ]
 */
const getNationalHolidaysInYear = (year) => {
	if (!Number.isInteger(year) || !_nh_isValidYear(year)) {
		throw new Error('年度は1949年以降の整数で指定してください');
	}

	const holidayMap = _nh_buildHolidayMap(year);
	const holidays = Array.from(holidayMap.entries()).map(([date, name]) => ({
		date,
		name,
	}));

	// 日付でソート
	holidays.sort((a, b) => a.date.localeCompare(b.date));

	return holidays;
};

// --- CommonJS 形式でのエクスポート ---
if (typeof module !== 'undefined' && module.exports) {
	module.exports = {
		isNationalHoliday,
		getNationalHolidayNameByLaw,
		getNationalHolidaysInYear,
	};
}
