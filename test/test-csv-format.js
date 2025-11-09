const assert = require('assert');
const path = require('path');
// ブラウザ公開スタイルに合わせる
global.window = global;
require(path.join(__dirname, '..', 'src', 'csv-builder'));
const buildRow = global.CSV && global.CSV.buildRow ? global.CSV.buildRow : null;
const buildCSV = global.CSV && global.CSV.buildCSV ? global.CSV.buildCSV : null;
if (!buildRow || !buildCSV) throw new Error('buildRow/buildCSV が公開されていません');

// テスト用ユーティリティ
const eq = (a, b, msg) => assert.strictEqual(a, b, msg || (`Expected: ${b}\nGot: ${a}`));

// 1) 日付フォーマット群
const date = new Date(2025, 10, 9); // 2025-11-09
const schemaDates = [
  { key: 'd1', label: 'd1', type: 'date' }, // default YYYY-MM-DD
  { key: 'd2', label: 'd2', type: 'date', format: 'YYYY/MM/DD' },
  { key: 'd3', label: 'd3', type: 'date', format: 'YYYYMMDD' },
  { key: 'd4', label: 'd4', type: 'date', format: 'YMMDD' },
  { key: 'd5', label: 'd5', type: 'date', format: 'UNIX' },
  { key: 'd6', label: 'd6', type: 'date', format: 'UNIX_MS' },
];
const rowDates = { d1: date, d2: date, d3: date, d4: date, d5: date, d6: date };
const r = buildRow(schemaDates, rowDates, { delimiter: ',' });
// d1: YYYY-MM-DD
const expectDates = ['2025-11-09','2025/11/09','20251109','51109', String(Math.floor(date.getTime()/1000)), String(date.getTime())].join(',');
eq(r, expectDates, 'date formats mismatch');

// 2) UNIX 秒数入力を受け取っても正しく解釈される（入力が秒単位の数値）
const unixSec = Math.floor(Date.UTC(2025,10,9,0,0,0)/1000); // UTC での秒
const schemaUnixInput = [ { key: 't', type: 'date', format: 'YYYY-MM-DD' }, { key: 'u', type: 'date', format: 'UNIX' } ];
const rowUnixInput = { t: unixSec, u: unixSec };
const r2 = buildRow(schemaUnixInput, rowUnixInput);
eq(r2, `${new Date(unixSec*1000).toISOString().slice(0,10)},${unixSec}`, 'unix second input handling');

// 3) 数値固定幅ゼロ埋め（幅5）、負数、小数切捨て
const schemaNums = [
  { key: 'a', type: 'number' , format: { width: 5 } },
  { key: 'b', type: 'number' , format: { width: 5 } },
  { key: 'c', type: 'number' , format: { width: 5 } },
];
const rowNums = { a: 123, b: -42, c: 12.34 };
const r3 = buildRow(schemaNums, rowNums);
eq(r3, '00123,-00042,00012', 'number zero-pad/negative/decimal handling');

// 4) 先頭ゼロを保持したい場合は string を使う
const schemaZip = [ { key: 'zip', type: 'string' } ];
const r4 = buildRow(schemaZip, { zip: '01234' });
eq(r4, '01234', 'leading zero string should be preserved');

// 5) ドットパスと default(function) と formatter
const schemaExtra = [
  { key: 'user.name', label: 'name' },
  { key: 'score', label: 'score', default: (rec) => rec.user && rec.user.defaultScore ? rec.user.defaultScore : 0 },
  { key: 'code', label: 'code', formatter: (v) => `X-${v}` }
];
const dataExtra = { user: { name: '太郎', defaultScore: 7 }, code: 99 };
const r5 = buildRow(schemaExtra, dataExtra);
eq(r5, '太郎,7,X-99', 'dot-path, default function, formatter');

// 6) map（オブジェクト指定と関数指定）の検証
const schemaMap = [
  { key: 'product', label: 'prd', map: new Map([['りんご', 'A01'], ['バナナ', 'B02']]) },
  { key: 'qty', label: 'qty' },
  { key: 'code', label: 'code', map: (v) => (v == null ? '' : `C-${v}`) }
];
const dataMap = { product: 'りんご', qty: 3, code: 9 };
const r6 = buildRow(schemaMap, dataMap);
eq(r6, 'A01,3,C-9', 'map object and function handling');

// 7) mapFinal: map の戻り値を最終出力とする
const schemaMapFinal = [
  { key: 'price', map: (v) => `¥${v}`, mapFinal: true }
];
const r7 = buildRow(schemaMapFinal, { price: 100 });
eq(r7, '¥100', 'mapFinal should use mapped value as final output');

// 8) mapMode='string' と mapDefault の検証（plain object を使用）
const schemaMapString = [
  { key: 'prd', map: { apple: 'P1', orange: 'P2' }, mapMode: 'string' },
  { key: 'cnt' }
];
const r8 = buildRow(schemaMapString, { prd: 'apple', cnt: 2 });
eq(r8, 'P1,2', 'mapMode string should map via String(raw) keys');

// mapDefault value
const schemaMapDefaultVal = [ { key: 'x', map: new Map([[1,'ONE']]), mapDefault: 'UNKNOWN' } ];
const r9 = buildRow(schemaMapDefaultVal, { x: 2 });
eq(r9, 'UNKNOWN', 'mapDefault value should be used when map misses');

// mapDefault function
const schemaMapDefaultFn = [ { key: 'x', map: new Map([[1,'ONE']]), mapDefault: (raw) => `DEF-${raw}` } ];
const r10 = buildRow(schemaMapDefaultFn, { x: 9 });
eq(r10, 'DEF-9', 'mapDefault function should be used when map misses');

// 6) buildCSV のヘッダ出力有無
const schemaHeader = [ { key: 'id', label: 'ID' }, { key: 'name', label: 'Name' } ];
const csvWithHeader = buildCSV(schemaHeader, [{ id: 1, name: 'A' }], { header: true });
const csvWithoutHeader = buildCSV(schemaHeader, [{ id: 1, name: 'A' }], { header: false });
eq(csvWithHeader, 'ID,Name\n1,A', 'header true output');
eq(csvWithoutHeader, '1,A', 'header false output');

console.log('ALL FORMAT TESTS PASS');
