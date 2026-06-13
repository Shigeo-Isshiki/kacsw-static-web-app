/**
 * CSV パーサーモジュール — 簡易ドキュメント
 *
 * 詳細なオプション仕様、schema の挙動や利用例は
 * 今後 `docs/csv-parser.md` への追記を想定しています。
 *
 * - 公開 API:
 *   - parseCSV(schema, options) -> CSV ファイルを内部で読み込み、records/errors/meta を返す
 *
 * - 主な方針:
 *   - 呼び出し側は File を直接扱わず parseCSV を await するだけ
 *   - 文字コードは options で指定可能（AUTO 時は UTF8/SJIS を順次試行）
 *   - encoding.js が利用可能なら優先し、未利用時は TextDecoder へフォールバック
 */

'use strict';

const _cp_defaultOptions = {
	delimiter: ',',
	quoteChar: '"',
	escapeMode: 'double-quote',
	newline: 'auto',
	hasHeader: true,
	trimHeader: true,
	trimCell: false,
	skipEmptyLines: true,
	strictColumnCount: false,
	encoding: 'AUTO',
	encodingLibrary: 'auto',
	fallbackEncodings: ['UTF8', 'SJIS'],
	allowBom: true,
	onRowError: 'collect',
	includeRawRows: false,
	accept: '.csv,text/csv',
};

const _cp_createEmptyResult = () => ({
	records: [],
	errors: [],
	meta: {
		totalRows: 0,
		parsedRows: 0,
		errorRows: 0,
		header: [],
		detectedEncoding: null,
		decodeMethod: null,
		hadBom: false,
		cancelled: false,
		delimiter: ',',
		newline: 'auto',
	},
});

const _cp_errorMessagesJa = {
	FILE_PICKER_UNAVAILABLE: 'ファイル選択機能を利用できません',
	FILE_NOT_SELECTED: 'CSVファイルが選択されていません',
	FILE_READER_UNAVAILABLE: 'ファイル読み込み機能を利用できません',
	FILE_READ_ERROR: 'ファイルの読み込みに失敗しました',
	ENCODING_JS_UNAVAILABLE: '文字コード変換ライブラリを利用できません',
	ENCODING_JS_CODETOSTRING_UNAVAILABLE: '文字列変換機能を利用できません',
	TEXT_DECODER_UNAVAILABLE: '文字コードの復号機能を利用できません',
	ENCODING_ERROR: '文字コードの判定または復号に失敗しました',
	CSV_PARSE_ERROR_UNCLOSED_QUOTE: 'CSVの引用符が閉じられていません',
	TYPE_NUMBER_INVALID: '数値に変換できません',
	TYPE_BOOLEAN_INVALID: '真偽値に変換できません',
	TYPE_DATE_INVALID: '日付に変換できません',
	TYPE_DATETIME_INVALID: '日時に変換できません',
	COLUMN_COUNT_MISMATCH: '列数が一致しません',
	COLUMN_NOT_FOUND: 'CSVヘッダーに列が見つかりません',
	REQUIRED_MISSING: '必須項目が入力されていません',
	VALIDATION_ERROR: '入力値が条件を満たしていません',
	TYPE_CONVERSION_ERROR: '値の変換に失敗しました',
	ROW_ERROR: 'CSVの一部の行にエラーがあります',
	PARSE_ERROR: 'CSVの解析に失敗しました',
};

const _cp_toJapaneseMessage = (code, fallback) => {
	if (code && Object.prototype.hasOwnProperty.call(_cp_errorMessagesJa, code)) {
		return _cp_errorMessagesJa[code];
	}
	return fallback || String(code || '');
};

const _cp_createError = (code, details) => {
	const err = new Error(_cp_toJapaneseMessage(code));
	err.code = code;
	if (details !== undefined) err.details = details;
	return err;
};

const _cp_mergeOptions = (options) => {
	const merged = { ..._cp_defaultOptions, ...(options || {}) };
	merged.encoding = _cp_normalizeEncodingLabel(merged.encoding || 'AUTO');
	merged.encodingLibrary = String(merged.encodingLibrary || 'auto').toLowerCase();
	merged.onRowError = String(merged.onRowError || 'collect').toLowerCase();
	merged.fallbackEncodings = Array.isArray(merged.fallbackEncodings)
		? merged.fallbackEncodings.map((e) => _cp_normalizeEncodingLabel(e)).filter(Boolean)
		: _cp_defaultOptions.fallbackEncodings.slice();
	if (merged.fallbackEncodings.length === 0)
		merged.fallbackEncodings = _cp_defaultOptions.fallbackEncodings.slice();
	return merged;
};

const _cp_normalizeSchema = (schema) => {
	if (!schema) return [];
	if (Array.isArray(schema)) return schema.map((f) => ({ ...f }));
	return Object.keys(schema).map((k) => ({ fieldCode: k, ...(schema[k] || {}) }));
};

const _cp_normalizeEncodingLabel = (encoding) => {
	if (!encoding) return '';
	const e = String(encoding).trim().toUpperCase().replace(/[-_]/g, '');
	if (e === 'AUTO') return 'AUTO';
	if (e === 'UTF8') return 'UTF8';
	if (e === 'UTF16' || e === 'UTF16LE') return 'UTF16LE';
	if (e === 'SHIFTJIS' || e === 'SJIS' || e === 'CP932' || e === 'MS932' || e === 'WINDOWS31J')
		return 'SJIS';
	return e;
};

const _cp_toTextDecoderEncoding = (encoding) => {
	if (encoding === 'UTF8') return 'utf-8';
	if (encoding === 'UTF16LE') return 'utf-16le';
	if (encoding === 'SJIS') return 'shift_jis';
	return String(encoding || '').toLowerCase();
};

const _cp_toEncodingJsLabel = (encoding) => {
	if (encoding === 'UTF8') return 'UTF8';
	if (encoding === 'UTF16LE') return 'UTF16';
	if (encoding === 'SJIS') return 'SJIS';
	return encoding;
};

const _cp_detectBom = (bytes) => {
	if (!bytes || bytes.length < 2) return { encoding: null, offset: 0, hadBom: false };
	if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
		return { encoding: 'UTF8', offset: 3, hadBom: true };
	if (bytes[0] === 0xff && bytes[1] === 0xfe)
		return { encoding: 'UTF16LE', offset: 2, hadBom: true };
	return { encoding: null, offset: 0, hadBom: false };
};

const _cp_pickCsvFile = async (accept) => {
	if (typeof document === 'undefined') {
		throw _cp_createError('FILE_PICKER_UNAVAILABLE');
	}

	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = accept || '.csv,text/csv';
		input.style.display = 'none';

		const body = document.body || document.documentElement;
		body.appendChild(input);

		let settled = false;
		const cleanup = () => {
			if (settled) return;
			settled = true;
			if (input.parentNode) input.parentNode.removeChild(input);
		};

		input.addEventListener('change', () => {
			const file = input.files && input.files[0] ? input.files[0] : null;
			cleanup();
			resolve(file);
		});

		const onWindowFocus = () => {
			setTimeout(() => {
				if (!settled) {
					cleanup();
					resolve(null);
				}
			}, 350);
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('focus', onWindowFocus, { once: true });
		}

		input.click();
	});
};

const _cp_readFileAsUint8Array = async (file) => {
	if (!file) throw _cp_createError('FILE_NOT_SELECTED');
	if (typeof file.arrayBuffer === 'function') {
		const ab = await file.arrayBuffer();
		return new Uint8Array(ab);
	}

	if (typeof FileReader === 'undefined') throw _cp_createError('FILE_READER_UNAVAILABLE');

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(_cp_createError('FILE_READ_ERROR'));
		reader.onload = () => {
			const ab = reader.result;
			resolve(new Uint8Array(ab));
		};
		reader.readAsArrayBuffer(file);
	});
};

const _cp_decodeWithEncodingJs = (bytes, encoding) => {
	if (typeof Encoding === 'undefined' || !Encoding || typeof Encoding.convert !== 'function') {
		throw _cp_createError('ENCODING_JS_UNAVAILABLE');
	}
	const src = Array.from(bytes);
	const converted = Encoding.convert(src, {
		to: 'UNICODE',
		from: _cp_toEncodingJsLabel(encoding),
		type: 'array',
	});
	if (typeof Encoding.codeToString !== 'function') {
		throw _cp_createError('ENCODING_JS_CODETOSTRING_UNAVAILABLE');
	}
	return Encoding.codeToString(converted);
};

const _cp_decodeWithTextDecoder = (bytes, encoding) => {
	if (typeof TextDecoder === 'undefined') throw _cp_createError('TEXT_DECODER_UNAVAILABLE');
	const decoder = new TextDecoder(_cp_toTextDecoderEncoding(encoding), { fatal: true });
	return decoder.decode(bytes);
};

const _cp_tryDecodeByLibrary = (bytes, encoding, library) => {
	if (library === 'encodingjs') {
		const text = _cp_decodeWithEncodingJs(bytes, encoding);
		return { text, decodeMethod: 'encodingjs' };
	}
	if (library === 'textdecoder') {
		const text = _cp_decodeWithTextDecoder(bytes, encoding);
		return { text, decodeMethod: 'textdecoder' };
	}

	try {
		const text = _cp_decodeWithEncodingJs(bytes, encoding);
		return { text, decodeMethod: 'encodingjs' };
	} catch (e) {
		const text = _cp_decodeWithTextDecoder(bytes, encoding);
		return { text, decodeMethod: 'textdecoder' };
	}
};

const _cp_decodeBytes = (bytes, options) => {
	// BOM と options をもとに候補エンコーディングを決め、順次デコードを試行する
	const bom = options.allowBom
		? _cp_detectBom(bytes)
		: { encoding: null, offset: 0, hadBom: false };
	const trimmed = bom.offset > 0 ? bytes.subarray(bom.offset) : bytes;

	const candidates = [];
	if (options.encoding !== 'AUTO') {
		candidates.push(options.encoding);
	} else {
		if (bom.encoding) candidates.push(bom.encoding);
		for (const e of options.fallbackEncodings) {
			if (!candidates.includes(e)) candidates.push(e);
		}
	}

	const errors = [];
	for (const enc of candidates) {
		try {
			const decoded = _cp_tryDecodeByLibrary(trimmed, enc, options.encodingLibrary);
			return {
				text: decoded.text,
				detectedEncoding: enc,
				decodeMethod: decoded.decodeMethod,
				hadBom: bom.hadBom,
			};
		} catch (e) {
			const code = e && e.code ? e.code : 'DECODE_FAILED';
			errors.push({
				encoding: enc,
				code,
				message: _cp_toJapaneseMessage(code, '復号に失敗しました'),
			});
		}
	}

	throw _cp_createError('ENCODING_ERROR', errors);
};

const _cp_normalizeNewline = (text, newlineOption) => {
	if (newlineOption === 'lf') return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	if (newlineOption === 'crlf')
		return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
	return String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

const _cp_parseCsvText = (text, options) => {
	// クォート内改行を壊さないため、1文字ずつ状態機械でパースする
	const delimiter = String(options.delimiter || ',');
	const quoteChar = String(options.quoteChar || '"');
	const normalized = _cp_normalizeNewline(text, options.newline);

	const rows = [];
	let row = [];
	let cell = '';
	let inQuotes = false;

	for (let i = 0; i < normalized.length; i += 1) {
		const ch = normalized[i];

		if (inQuotes) {
			if (ch === quoteChar) {
				if (options.escapeMode === 'double-quote' && normalized[i + 1] === quoteChar) {
					cell += quoteChar;
					i += 1;
				} else {
					inQuotes = false;
				}
			} else {
				cell += ch;
			}
			continue;
		}

		if (ch === quoteChar) {
			inQuotes = true;
			continue;
		}

		if (ch === delimiter) {
			row.push(cell);
			cell = '';
			continue;
		}

		if (ch === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
			continue;
		}

		cell += ch;
	}

	if (inQuotes) {
		throw _cp_createError('CSV_PARSE_ERROR_UNCLOSED_QUOTE');
	}

	row.push(cell);
	rows.push(row);

	if (!options.skipEmptyLines) return rows;

	return rows.filter((r) => r.some((c) => String(c || '').trim() !== ''));
};

const _cp_getHeaderAndRows = (allRows, options) => {
	if (!options.hasHeader) {
		return { header: [], dataRows: allRows };
	}
	if (allRows.length === 0) return { header: [], dataRows: [] };
	const rawHeader = allRows[0] || [];
	const header = options.trimHeader
		? rawHeader.map((h) => String(h || '').trim())
		: rawHeader.map((h) => String(h || ''));
	return { header, dataRows: allRows.slice(1) };
};

const _cp_resolveColumnIndex = (field, header, rowLength, options, schemaIndex) => {
	if (typeof field.column === 'number' && Number.isInteger(field.column)) return field.column;
	if (typeof field.column === 'string' && options.hasHeader) {
		const name = options.trimHeader ? field.column.trim() : field.column;
		return header.indexOf(name);
	}
	if (typeof field.key === 'string' && options.hasHeader) {
		const name = options.trimHeader ? field.key.trim() : field.key;
		const idx = header.indexOf(name);
		if (idx >= 0) return idx;
	}
	if (!options.hasHeader && schemaIndex < rowLength) return schemaIndex;
	return -1;
};

const _cp_applyMap = (f, rawVal, record) => {
	const mode = f && f.mapMode ? f.mapMode : 'strict';
	if (!f || f.map === undefined || f.map === null) return rawVal;
	try {
		if (typeof Map !== 'undefined' && f.map instanceof Map) {
			if (f.map.has(rawVal)) return f.map.get(rawVal);
			if (f.mapDefault !== undefined)
				return typeof f.mapDefault === 'function' ? f.mapDefault(rawVal, record) : f.mapDefault;
			return rawVal;
		}

		if (typeof f.map === 'function') {
			const v = f.map(rawVal, record);
			if (v !== undefined) return v;
			if (f.mapDefault !== undefined)
				return typeof f.mapDefault === 'function' ? f.mapDefault(rawVal, record) : f.mapDefault;
			return rawVal;
		}

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
	return rawVal;
};

const _cp_pad2 = (n) => String(n).padStart(2, '0');

const _cp_toKintoneDateString = (d) => {
	const yyyy = d.getFullYear();
	const mm = _cp_pad2(d.getMonth() + 1);
	const dd = _cp_pad2(d.getDate());
	return `${yyyy}-${mm}-${dd}`;
};

const _cp_toKintoneDateTimeString = (d) => {
	const iso = d.toISOString();
	return iso.replace(/\.\d{3}Z$/, 'Z');
};

const _cp_makeValidDate = (y, m, d) => {
	const date = new Date(y, m - 1, d);
	if (
		Number.isNaN(date.getTime()) ||
		date.getFullYear() !== y ||
		date.getMonth() !== m - 1 ||
		date.getDate() !== d
	) {
		return null;
	}
	return date;
};

const _cp_inferYearFromYMMDD = (y1) => {
	const now = new Date();
	const currentYear = now.getFullYear();
	let year = Math.floor(currentYear / 10) * 10 + y1;
	if (year - currentYear > 5) year -= 10;
	if (currentYear - year > 94) year += 100;
	return year;
};

const _cp_parseDateFromFormat = (raw, format) => {
	if (raw == null || raw === '') return null;
	if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;

	const normalizedFormat = format ? String(format).toUpperCase() : '';
	const s = String(raw).trim();

	if (normalizedFormat === 'UNIX') {
		const n = Number(s);
		if (!Number.isFinite(n)) return null;
		const d = new Date(n * 1000);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	if (normalizedFormat === 'UNIX_MS') {
		const n = Number(s);
		if (!Number.isFinite(n)) return null;
		const d = new Date(n);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	const mYmd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (mYmd) return _cp_makeValidDate(Number(mYmd[1]), Number(mYmd[2]), Number(mYmd[3]));

	const mYmdSlash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
	if (mYmdSlash)
		return _cp_makeValidDate(Number(mYmdSlash[1]), Number(mYmdSlash[2]), Number(mYmdSlash[3]));

	const m8 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (m8) return _cp_makeValidDate(Number(m8[1]), Number(m8[2]), Number(m8[3]));

	const m6 = s.match(/^(\d{2})(\d{2})(\d{2})$/);
	if (m6) {
		const y2 = Number(m6[1]);
		const year = y2 >= 70 ? 1900 + y2 : 2000 + y2;
		return _cp_makeValidDate(year, Number(m6[2]), Number(m6[3]));
	}

	const m5 = s.match(/^(\d)(\d{2})(\d{2})$/);
	if (m5) {
		const year = _cp_inferYearFromYMMDD(Number(m5[1]));
		return _cp_makeValidDate(year, Number(m5[2]), Number(m5[3]));
	}

	if (
		!normalizedFormat ||
		normalizedFormat === 'YYYY-MM-DD' ||
		normalizedFormat === 'YYYY/MM/DD' ||
		normalizedFormat === 'YYYYMMDD' ||
		normalizedFormat === 'YYMMDD' ||
		normalizedFormat === 'YMMDD'
	) {
		const t = Date.parse(s);
		if (!Number.isNaN(t)) return new Date(t);
	}

	return null;
};

const _cp_convertByType = (type, value, format) => {
	if (value == null) return value;
	if (type === 'string' || !type) return String(value);
	if (type === 'number') {
		if (value === '') return null;
		const n = Number(value);
		if (Number.isNaN(n)) throw new Error('TYPE_NUMBER_INVALID');
		return n;
	}
	if (type === 'boolean') {
		if (typeof value === 'boolean') return value;
		const s = String(value).trim().toLowerCase();
		if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
		if (['false', '0', 'no', 'n', 'off', ''].includes(s)) return false;
		throw new Error('TYPE_BOOLEAN_INVALID');
	}
	if (type === 'date' || type === 'datetime') {
		if (value === '') return null;
		const d = _cp_parseDateFromFormat(value, format);
		if (!d) throw new Error(type === 'date' ? 'TYPE_DATE_INVALID' : 'TYPE_DATETIME_INVALID');
		return type === 'date' ? _cp_toKintoneDateString(d) : _cp_toKintoneDateTimeString(d);
	}
	return value;
};

const _cp_mapRows = (dataRows, header, schema, options) => {
	// schema 定義に基づいて 1 行ずつ型変換・検証し records を組み立てる
	const records = [];
	const errors = [];

	for (let i = 0; i < dataRows.length; i += 1) {
		const row = dataRows[i];
		const rowIndex = options.hasHeader ? i + 2 : i + 1;
		const record = {};
		const rowErrors = [];

		if (options.strictColumnCount && options.hasHeader && header.length !== row.length) {
			rowErrors.push({
				rowIndex,
				column: null,
				fieldCode: null,
				code: 'COLUMN_COUNT_MISMATCH',
				message: `期待される列数は ${header.length} 列ですが、実際は ${row.length} 列です`,
			});
		}

		for (let s = 0; s < schema.length; s += 1) {
			const f = schema[s];
			const idx = _cp_resolveColumnIndex(f, header, row.length, options, s);
			const fieldCode =
				f.fieldCode || f.key || (typeof f.column === 'string' ? f.column : `field_${s}`);
			const columnName = typeof f.column === 'string' ? f.column : idx;

			if (idx < 0) {
				rowErrors.push({
					rowIndex,
					column: columnName,
					fieldCode,
					code: 'COLUMN_NOT_FOUND',
					message: 'CSVヘッダーに列が見つかりません',
				});
				continue;
			}

			let raw = idx < row.length ? row[idx] : '';
			if (options.trimCell && typeof raw === 'string') raw = raw.trim();

			if ((raw === '' || raw === undefined || raw === null) && f.default !== undefined) {
				raw = typeof f.default === 'function' ? f.default(row, rowIndex) : f.default;
			}

			if (f.required && (raw === '' || raw === undefined || raw === null)) {
				rowErrors.push({
					rowIndex,
					column: columnName,
					fieldCode,
					code: 'REQUIRED_MISSING',
					message: '必須項目が入力されていません',
				});
				continue;
			}

			let value = _cp_applyMap(f, raw, record);
			try {
				if (typeof f.parser === 'function') value = f.parser(value, row, rowIndex);
				else value = _cp_convertByType(f.type, value, f.format);
			} catch (e) {
				rowErrors.push({
					rowIndex,
					column: columnName,
					fieldCode,
					code: e && e.code ? e.code : 'TYPE_CONVERSION_ERROR',
					message:
						e && e.code ? _cp_toJapaneseMessage(e.code, e.message) : '値の変換に失敗しました',
				});
				continue;
			}

			if (typeof f.validate === 'function') {
				const vr = f.validate(value, row, rowIndex, record);
				if (vr !== true && vr !== undefined) {
					rowErrors.push({
						rowIndex,
						column: columnName,
						fieldCode,
						code: 'VALIDATION_ERROR',
						message: typeof vr === 'string' ? vr : '入力値が条件を満たしていません',
					});
					continue;
				}
			}

			record[fieldCode] = value;
		}

		if (rowErrors.length > 0) {
			errors.push(...rowErrors);
			if (options.onRowError === 'throw') {
				throw _cp_createError('ROW_ERROR', rowErrors);
			}
			if (options.onRowError === 'skip' || options.onRowError === 'collect') {
				continue;
			}
		}

		records.push(record);
	}

	return { records, errors };
};

/**
 * CSV ファイル選択から読み込み・デコード・schema マッピングまでを一括実行する
 */
const parseCSV = async (schema, options = {}) => {
	const result = _cp_createEmptyResult();
	const opt = _cp_mergeOptions(options);
	result.meta.delimiter = opt.delimiter;
	result.meta.newline = opt.newline;

	try {
		const file = await _cp_pickCsvFile(opt.accept);
		if (!file) {
			result.meta.cancelled = true;
			return result;
		}

		const bytes = await _cp_readFileAsUint8Array(file);
		const decoded = _cp_decodeBytes(bytes, opt);
		result.meta.detectedEncoding = decoded.detectedEncoding;
		result.meta.decodeMethod = decoded.decodeMethod;
		result.meta.hadBom = decoded.hadBom;

		const allRows = _cp_parseCsvText(decoded.text, opt);
		const split = _cp_getHeaderAndRows(allRows, opt);
		result.meta.header = split.header;
		result.meta.totalRows = split.dataRows.length;

		const normSchema = _cp_normalizeSchema(schema);
		const mapped = _cp_mapRows(split.dataRows, split.header, normSchema, opt);
		result.records = mapped.records;
		result.errors.push(...mapped.errors);
		result.meta.parsedRows = mapped.records.length;
		result.meta.errorRows = new Set(mapped.errors.map((e) => e.rowIndex)).size;

		if (opt.includeRawRows) {
			result.rawRows = split.dataRows.map((r) => r.slice());
		}
		return result;
	} catch (e) {
		result.errors.push({
			rowIndex: null,
			column: null,
			fieldCode: null,
			code: e && e.code ? e.code : e && e.message ? e.message : 'PARSE_ERROR',
			message: e && e.code ? _cp_toJapaneseMessage(e.code, e.message) : 'CSVの解析に失敗しました',
			details: e && e.details ? e.details : undefined,
		});
		return result;
	}
};

if (typeof window !== 'undefined') {
	window.CSV = window.CSV || {};
	Object.assign(window.CSV, {
		parseCSV,
	});
	window.parseCSV = parseCSV;
}

try {
	if (typeof module !== 'undefined' && module && module.exports) {
		module.exports = { parseCSV };
	}
} catch (e) {}
