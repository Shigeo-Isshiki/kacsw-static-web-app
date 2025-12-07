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

// 日付の簡易フォーマッタ
const _cb_formatDateSimple = (value, fmt) => {
	if (value == null || value === '') return '';
	let d = null;
	if (value instanceof Date) d = value;
	else if (typeof value === 'number') {
		// 数値が UNIX 秒 (例: 1700000000) で渡されるケースがあるため自動判定して ms に変換
		// 目安: 秒は ~1e9〜1e10、ミリ秒は ~1e12 前後なので閾値で判定する
		const n = Number(value);
		if (!Number.isFinite(n)) return String(value);
		// 小さめの数値は秒とみなして 1000 を掛ける（閾値は 1e11）
		d = Math.abs(n) < 1e11 ? new Date(n * 1000) : new Date(n);
	} else if (typeof value === 'string') {
		const s = value.trim();
		if (/^\d{8}$/.test(s)) {
			const y = parseInt(s.substr(0, 4), 10);
			const m = parseInt(s.substr(4, 2), 10) - 1;
			const day = parseInt(s.substr(6, 2), 10);
			d = new Date(y, m, day);
		} else if (/^\d{6}$/.test(s)) {
			// YYMMDD を想定（YMMDD 指定時の扱い）
			const y2 = parseInt(s.substr(0, 2), 10);
			const fullY = y2 >= 70 ? 1900 + y2 : 2000 + y2;
			const m = parseInt(s.substr(2, 2), 10) - 1;
			const day = parseInt(s.substr(4, 2), 10);
			d = new Date(fullY, m, day);
		} else {
			const t = Date.parse(s);
			if (!Number.isNaN(t)) d = new Date(t);
		}
	}
	if (!d || Number.isNaN(d.getTime())) return String(value);
	// UNIX 出力オプション
	if (fmt === 'UNIX') return Math.floor(d.getTime() / 1000);
	if (fmt === 'UNIX_MS') return d.getTime();
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
