/**
 * CSV ビルダーモジュール — 簡易ドキュメント
 *
 * 詳細なスキーマ仕様、format/map の挙動や利用例は
 * `docs/csv-builder.md` を参照してください。
 *
 * - 公開 API:
 *   - buildRow(schema, data, options) -> CSV の一行（改行なし）
 *   - buildCSV(schema, dataArray, options) -> CSV 全体（ヘッダ行を含めるかは options.header）
 *
 * ドキュメントの更新・追加例:
 * - map, mapMode, mapDefault, mapFinal の具体例
 * - 日付フォーマット (YMMDD / UNIX / UNIX_MS)
 * - 数値のゼロ埋めフォーマット ({ width: N })
 *
 * 詳細: ./docs/csv-builder.md
 */

'use strict';

const _cb_normalizeSchema = (schema) => {
	if (Array.isArray(schema)) return schema.map((f) => ({ ...f }));
	return Object.keys(schema).map((k) => ({ key: k, ...(schema[k] || {}) }));
};

const _cb_escapeCell = (cell) => {
	if (cell === null || cell === undefined) return '';
	// 数値はそのまま数値文字列として出力（クオートしない）
	if (typeof cell === 'number' && Number.isFinite(cell)) return String(cell);
	const s = String(cell);
	const needsQuotes = /[",\n\r,]/.test(s);
	const escaped = s.replace(/"/g, '""');
	return needsQuotes ? `"${escaped}"` : escaped;
};

// ドットパス対応の値取得
const _cb_getValue = (obj, path) => {
	if (obj == null || path == null) return undefined;
	if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
	const parts = String(path).split('.');
	let cur = obj;
	for (const p of parts) {
		if (cur == null) return undefined;
		cur = cur[p];
	}
	return cur;
};

// スキーマの map を適用するユーティリティ
// 方針: 型厳密マッチを実現するため Map と function のみを正式サポートします。
// - f.map instanceof Map: rawVal をそのままキーとして厳密に照合します（===）
// - typeof f.map === 'function': 動的変換を行います
// - その他（未指定）は元の値を返します
const _cb_applyMap = (f, rawVal, record) => {
	// mapMode: 'strict' (default) | 'string'
	const mode = f && f.mapMode ? f.mapMode : 'strict';
	if (!f || f.map === undefined || f.map === null) return rawVal;
	try {
		// 1) Map を優先的に扱う（型厳密マッチ）
		if (typeof Map !== 'undefined' && f.map instanceof Map) {
			if (f.map.has(rawVal)) return f.map.get(rawVal);
			// mapDefault があれば使う
			if (f.mapDefault !== undefined)
				return typeof f.mapDefault === 'function' ? f.mapDefault(rawVal, record) : f.mapDefault;
			return rawVal;
		}

		// 2) function を使う
		if (typeof f.map === 'function') {
			const v = f.map(rawVal, record);
			if (v !== undefined) return v;
			// undefined を返した場合は mapDefault を適用する
			if (f.mapDefault !== undefined)
				return typeof f.mapDefault === 'function' ? f.mapDefault(rawVal, record) : f.mapDefault;
			return rawVal;
		}

		// 3) string モードではプレーンオブジェクトを許容する
		if (mode === 'string' && typeof f.map === 'object') {
			const key = String(rawVal);
			if (Object.prototype.hasOwnProperty.call(f.map, key)) return f.map[key];
			if (f.mapDefault !== undefined)
				return typeof f.mapDefault === 'function' ? f.mapDefault(rawVal, record) : f.mapDefault;
			return rawVal;
		}
	} catch (e) {
		return rawVal;
	}
	// どの分岐にも当てはまらない場合は元値
	return rawVal;
};

// date-utils.js と同等の元号テーブル（kintone で扱う和暦フォーマット用）
const _CB_ERAS = [
	{ name: '令和', initial: 'R', start: new Date('2019-05-01') },
	{ name: '平成', initial: 'H', start: new Date('1989-01-08') },
	{ name: '昭和', initial: 'S', start: new Date('1926-12-25') },
	{ name: '大正', initial: 'T', start: new Date('1912-07-30') },
	{ name: '明治', initial: 'M', start: new Date('1868-01-25') },
];

const _CB_KANJI_NUM = {
	〇: 0,
	一: 1,
	二: 2,
	三: 3,
	四: 4,
	五: 5,
	六: 6,
	七: 7,
	八: 8,
	九: 9,
	十: 10,
	百: 100,
	千: 1000,
};

const _cb_kanjiToNumber = (kanji) => {
	if (kanji === '元') return 1;
	let num = 0;
	let tmp = 0;
	for (let i = 0; i < kanji.length; i++) {
		const c = kanji[i];
		if (_CB_KANJI_NUM[c] >= 10) {
			if (tmp === 0) tmp = 1;
			num += tmp * _CB_KANJI_NUM[c];
			tmp = 0;
		} else if (_CB_KANJI_NUM[c] >= 0) {
			tmp = tmp * 10 + _CB_KANJI_NUM[c];
		}
	}
	num += tmp;
	return num;
};

const _cb_parseDateLikeDateUtils = (value) => {
	if (value == null || value === '') return null;
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return null;
		return Math.abs(value) < 1e11 ? new Date(value * 1000) : new Date(value);
	}
	if (typeof value !== 'string') return null;

	const input = value.trim();
	if (!input) return null;

	// まず既存互換の西暦系パターンを優先
	if (/^\d{8}$/.test(input)) {
		const y = parseInt(input.slice(0, 4), 10);
		const m = parseInt(input.slice(4, 6), 10) - 1;
		const day = parseInt(input.slice(6, 8), 10);
		return new Date(y, m, day);
	}
	if (/^\d{6}$/.test(input)) {
		const y2 = parseInt(input.slice(0, 2), 10);
		const fullY = y2 >= 70 ? 1900 + y2 : 2000 + y2;
		const m = parseInt(input.slice(2, 4), 10) - 1;
		const day = parseInt(input.slice(4, 6), 10);
		return new Date(fullY, m, day);
	}

	const toHankaku = (s) =>
		s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
	const toHankakuAlpha = (s) =>
		s.replace(/[Ａ-Ｚａ-ｚ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
	const kanjiNumReg = /[元一二三四五六七八九十百千〇]+/g;
	const kanjiToNumStr = (s) => s.replace(kanjiNumReg, (m) => String(_cb_kanjiToNumber(m)));
	const kanjiToInitial = (s) => {
		let out = s;
		for (const era of _CB_ERAS) {
			out = out.replace(new RegExp(era.name, 'g'), era.initial);
		}
		return out;
	};

	let normalized = toHankakuAlpha(toHankaku(input));
	normalized = kanjiToNumStr(normalized);
	normalized = kanjiToInitial(normalized);
	normalized = normalized.replace(/年|\/|\.|\s|月/g, '-').replace(/日/g, '');
	normalized = normalized.replace(/^-+|-+$/g, '');

	const parts = normalized.split('-').filter(Boolean);
	if (parts.length >= 3) {
		let initial = parts[0];
		let yearStr = '';
		if (initial.length > 1) {
			yearStr = initial.slice(1);
			initial = initial[0];
		}
		const era = _CB_ERAS.find((e) => e.initial.toUpperCase() === initial.toUpperCase());
		if (era) {
			let yearNum;
			let monthNum;
			let dayNum;
			if (yearStr) {
				yearNum = parseInt(yearStr, 10);
				monthNum = parseInt(parts[1], 10);
				dayNum = parseInt(parts[2], 10);
			} else {
				yearNum = parseInt(parts[1], 10);
				monthNum = parseInt(parts[2], 10);
				dayNum = parts.length >= 4 ? parseInt(parts[3], 10) : 1;
			}
			if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum) || !Number.isFinite(dayNum))
				return null;
			if (yearNum === 0) yearNum = 1;
			if (monthNum === 0) monthNum = 1;
			if (dayNum === 0) dayNum = 1;
			const fullYear = era.start.getFullYear() + yearNum - 1;
			return new Date(fullYear, monthNum - 1, dayNum);
		}
	}

	const t = Date.parse(normalized);
	if (!Number.isNaN(t)) return new Date(t);
	return null;
};

const _cb_convertToEra = (d) => {
	for (const era of _CB_ERAS) {
		if (d >= era.start) {
			const eraYear = d.getFullYear() - era.start.getFullYear() + 1;
			const yearKanji = eraYear === 1 ? '元' : String(eraYear);
			const year2 = eraYear === 1 ? '01' : String(eraYear).padStart(2, '0');
			return {
				kanji: `${era.name}${yearKanji}年`,
				initial: `${era.initial}${year2}`,
				initialOnly: era.initial,
				numberOnly: year2,
			};
		}
	}
	return null;
};

// 日付の簡易フォーマッタ
const _cb_formatDateSimple = (value, fmt) => {
	if (value == null || value === '') return '';
	const d = _cb_parseDateLikeDateUtils(value);
	if (!d || Number.isNaN(d.getTime())) return String(value);
	// UNIX 出力オプション
	if (fmt === 'UNIX') return Math.floor(d.getTime() / 1000);
	if (fmt === 'UNIX_MS') return d.getTime();
	const era = _cb_convertToEra(d);
	if (era) {
		if (fmt === 'ERA_KANJI') return era.kanji;
		if (fmt === 'ERA_INITIAL') return era.initial;
		if (fmt === 'ERA_INITIAL_ONLY') return era.initialOnly;
		if (fmt === 'ERA_NUMBER_ONLY') return era.numberOnly;
		if (fmt === 'ERA_KANJI_YM') return `${era.kanji}${d.getMonth() + 1}月`;
		if (fmt === 'ERA_KANJI_DATE') return `${era.kanji}${d.getMonth() + 1}月${d.getDate()}日`;
		if (fmt === 'ERA_KANJI_DATE_PAD') {
			const m2 = String(d.getMonth() + 1).padStart(2, '0');
			const d2 = String(d.getDate()).padStart(2, '0');
			return `${era.kanji}${m2}月${d2}日`;
		}
		if (fmt === 'ERA_INITIAL_YY/MM')
			return `${era.initial}/${String(d.getMonth() + 1).padStart(2, '0')}`;
		if (fmt === 'ERA_INITIAL_KANJI_DATE')
			return `${era.initialOnly}${Number(era.numberOnly)}年${d.getMonth() + 1}月${d.getDate()}日`;
		if (fmt === 'ERA_INITIAL_Y/M/D')
			return `${era.initialOnly}${Number(era.numberOnly)}/${d.getMonth() + 1}/${d.getDate()}`;
		if (fmt === 'ERA_INITIAL_YY/MM/DD')
			return `${era.initial}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
		// JIS X 0301 の表記に合わせたピリオド区切り（例: R07.11.09）
		if (fmt === 'ERA_INITIAL_JIS_YM')
			return `${era.initial}.${String(d.getMonth() + 1).padStart(2, '0')}`;
		if (fmt === 'ERA_INITIAL_JIS_YMD')
			return `${era.initial}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
	}
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	if (!fmt || fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
	// Japanese full-width format: 2025年12月07日
	if (fmt === 'YYYY年MM月DD日') return `${yyyy}年${mm}月${dd}日`;
	// Japanese non-padded format: 2025年12月7日 (no zero padding for month/day)
	if (fmt === 'YYYY年M月D日') return `${yyyy}年${d.getMonth() + 1}月${d.getDate()}日`;
	if (fmt === 'YYYY/MM/DD') return `${yyyy}/${mm}/${dd}`;
	if (fmt === 'YYYYMMDD') return `${yyyy}${mm}${dd}`;
	if (fmt === 'YMMDD') {
		// 年の下1桁 + 月2桁 + 日2桁 (例: 2025-11-09 -> 5 11 09 -> "51109")
		const y1 = String(yyyy).slice(-1);
		return `${y1}${mm}${dd}`;
	}
	return `${yyyy}-${mm}-${dd}`;
};

// 数値の簡易フォーマッタ（固定長ゼロ埋め）
const _cb_formatNumberSimple = (value, fmt) => {
	if (value == null || value === '') return '';
	const n = Number(value);
	if (Number.isNaN(n)) return String(value);
	if (!fmt) return String(n);
	if (typeof fmt === 'object' && fmt.width) {
		const s = String(Math.trunc(Math.abs(n)));
		const padded = s.padStart(fmt.width, '0');
		return n < 0 ? `-${padded}` : padded;
	}
	return String(n);
};

/**
 * 単一の CSV 行を生成する（改行なし）
 */
const buildRow = (schema, data, options = {}) => {
	const delimiter = options.delimiter || ',';
	const norm = _cb_normalizeSchema(schema);
	return norm
		.map((f) => {
			const rawVal = (() => {
				const v = _cb_getValue(data, f.key);
				if (v === undefined) {
					return typeof f.default === 'function'
						? f.default(data)
						: f.default !== undefined
							? f.default
							: '';
				}
				return v;
			})();

			// map 処理を適用
			const mappedVal = _cb_applyMap(f, rawVal, data);

			// mapFinal が指定されていれば map の戻り値を最終出力とする（formatter/type はスキップ）
			if (f && f.mapFinal) {
				return _cb_escapeCell(mappedVal);
			}

			// formatter があれば最優先（map 後の値が渡される）
			if (typeof f.formatter === 'function') {
				return _cb_escapeCell(f.formatter(mappedVal, data));
			}

			// type/format による簡易フォーマット （map 後の値を使う）
			let out;
			if (f.type === 'date') out = _cb_formatDateSimple(mappedVal, f.format);
			else if (f.type === 'number') out = _cb_formatNumberSimple(mappedVal, f.format);
			else out = mappedVal == null ? '' : mappedVal;

			return _cb_escapeCell(out);
		})
		.join(delimiter);
};

/**
 * スキーマとデータ配列から CSV 全体を生成する
 */
const buildCSV = (schema, dataArray, options = {}) => {
	const delimiter = options.delimiter || ',';
	const includeHeader = options.header !== undefined ? options.header : true;
	const norm = _cb_normalizeSchema(schema);

	const lines = [];
	if (includeHeader) {
		lines.push(
			norm
				.map((f) =>
					_cb_escapeCell(
						typeof f.label === 'function' ? f.label() : f.label !== undefined ? f.label : f.key
					)
				)
				.join(delimiter)
		);
	}

	const arr = Array.isArray(dataArray) ? dataArray : [dataArray];
	for (const d of arr) {
		lines.push(
			norm
				.map((f) => {
					const rawVal = (() => {
						const v = _cb_getValue(d, f.key);
						if (v === undefined)
							return typeof f.default === 'function'
								? f.default(d)
								: f.default !== undefined
									? f.default
									: '';
						return v;
					})();

					// map 処理を適用
					const mappedVal = _cb_applyMap(f, rawVal, d);
					// mapFinal が指定されていれば map の戻り値を最終出力とする
					if (f && f.mapFinal) return _cb_escapeCell(mappedVal);
					if (typeof f.formatter === 'function') return _cb_escapeCell(f.formatter(mappedVal, d));
					let out;
					if (f.type === 'date') out = _cb_formatDateSimple(mappedVal, f.format);
					else if (f.type === 'number') out = _cb_formatNumberSimple(mappedVal, f.format);
					else out = mappedVal == null ? '' : mappedVal;
					return _cb_escapeCell(out);
				})
				.join(delimiter)
		);
	}

	return lines.join('\n');
};

// 公開: 統一ネームスペース window.CSV
if (typeof window !== 'undefined') {
	window.CSV = window.CSV || {};
	Object.assign(window.CSV, {
		buildRow,
		buildCSV,
	});
}
// end

// CommonJS export for Node/test environments
try {
	if (typeof module !== 'undefined' && module && module.exports) {
		module.exports = { buildRow, buildCSV };
	}
} catch (e) {}
