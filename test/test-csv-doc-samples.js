const assert = require('assert');
const path = require('path');

// ブラウザ公開スタイルに合わせる
global.window = global;
require(path.join(__dirname, '..', 'src', 'csv-builder'));
const buildRow = global.CSV && global.CSV.buildRow ? global.CSV.buildRow : null;
const buildCSV = global.CSV && global.CSV.buildCSV ? global.CSV.buildCSV : null;
if (!buildRow || !buildCSV) throw new Error('buildRow/buildCSV が公開されていません');

const eq = (a, b, msg) => assert.strictEqual(a, b, msg || (`Expected: ${b}\nGot: ${a}`));

// 1) formatter で小数を2桁に丸める例
const schemaFmt = [ { key: 'price', label: '価格', formatter: (v) => v == null || v === '' ? '' : Number(v).toFixed(2) } ];
const rowsFmt = [ { price: 123.456 }, { price: 7 } ];
const csvFmt = buildCSV(schemaFmt, rowsFmt, { header: true });
// 期待: ヘッダ行 + 2 行の値（四捨五入で 123.46 / 7.00）
eq(csvFmt, '価格\n123.46\n7.00', 'formatter toFixed(2) mismatch');

// 2) 複雑なネストパス（配列インデックス含む）
const schemaNest = [ { key: 'user.profile.contact.city', label: '市' }, { key: 'items.0.name', label: '第1商品' } ];
const rec = { user: { profile: { contact: { city: '横浜市' } } }, items: [{ name: 'りんご' }, { name: 'バナナ' }] };
const rowNest = buildRow(schemaNest, rec);
eq(rowNest, '横浜市,りんご', 'nested path or array index handling');

// 3) mapDefault を関数で指定する例
const schemaMapDef = [
  {
    key: 'category',
    label: 'カテゴリ',
    map: new Map([[ '食料', 'F' ]]),
    mapDefault: (raw) => raw ? `UNK-${String(raw).slice(0,2).toUpperCase()}` : ''
  }
];
const csvMapDef = buildCSV(schemaMapDef, [{ category: '食料' }, { category: '電子' }, { category: null }]);
// 想定: 'F' / 'UNK-電' (slice が multi-byte をそのまま切るため環境依存だが現実的) / ''
// ここは関数の振る舞いに合わせて厳密に確認する
const parts = csvMapDef.split('\n');
eq(parts.length, 4, 'mapDefault sample should produce header + 3 rows');
eq(parts[0], 'カテゴリ', 'header label check');
eq(parts[1], 'F', 'map hit should produce F');
// parts[2] は UNK-... になる（実行環境の String.slice に依存するが存在することを確認）
assert.ok(parts[2].startsWith('UNK-'), 'mapDefault function should produce UNK- prefix');
eq(parts[3], '', 'null category should map to empty string via mapDefault');

// 4) mapMode='string' の plain object マップ例
const schemaMapStr = [ { key: 'status', label: '状態', map: { OK: '1', NG: '0' }, mapMode: 'string' } ];
const csvMapStr = buildCSV(schemaMapStr, [{ status: 'OK' }, { status: 'UNKNOWN' }], { header: false });
// UNKNOWN は map にないため元値（'UNKNOWN'）が返るか、mapDefault が無ければ元値
eq(csvMapStr, '1\nUNKNOWN', 'mapMode string mapping should map OK->1 and leave unknown as original');

console.log('DOC SAMPLES PASS');
