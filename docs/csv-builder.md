# CSV ビルダーモジュール — スキーマの書き方と利用例

このドキュメントは `src/csv-builder.js` に実装されているスキーマ仕様と使い方の詳細をまとめたものです。元のファイルの先頭コメントを移植しています。

## 基本形
スキーマは配列またはオブジェクトで与えられます。内部では配列に正規化されます。

- 配列形式の例:

  ```js
  [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '氏名' },
    { key: 'birth', label: '生年月日', type: 'date', format: 'YYYY/MM/DD' }
  ]
  ```

- オブジェクト形式の例:

  ```js
  {
    id: { label: 'ID' },
    name: { label: '氏名' }
  }
  ```

## スキーマ要素の意味

- `key`: データオブジェクト上のプロパティ名。ドットパスをサポート（例: `user.name`）。
- `label`: ヘッダ名として使う文字列、または関数（`label()` を呼び値を使用）。
- `default`: フィールド値が存在しない場合に使う既定値。値または関数 (`default(record)`) を指定可。
- `type`: `'string' | 'date' | 'number'` のいずれか。`'date'` や `'number'` の場合は `format` による簡易整形が適用されます。

### format (日付)

サポートされる簡易フォーマット:

- `'YYYY-MM-DD'` (デフォルト)
- `'YYYY/MM/DD'`
- `'YYYYMMDD'`
- `'YMMDD'` — 年の下1桁 + 月2桁 + 日2桁（例: 2025-11-09 -> `51109`）

出力を UNIX 時刻にしたい場合:

- `'UNIX'` -> 秒単位の整数（例: `1700000000`）
- `'UNIX_MS'` -> ミリ秒単位の整数（例: `1700000000000`）

入力としては `Date` オブジェクト、ISO 文字列、`'YYYYMMDD'` や `'YYMMDD'` 形式、
または数値の UNIX 時刻（秒 / ミリ秒）を受け付けます。数値は閾値（abs(value) < 1e11）で秒判定し、必要ならミリ秒化して扱います。

### format (数値)

簡易指定はオブジェクト形式で行います。主な使い方はゼロ埋めの固定幅指定です。

例: `{ key: 'code', type: 'number', format: { width: 5 } }` -> `123` -> `"00123"`

- 負数: `-42` -> `"-00042"`（符号を保持、絶対値をゼロ埋め）
- 小数: 整数部を `Math.trunc` で切り捨ててゼロ埋めします（小数部を保持したい場合は `formatter` を使用してください）
- 先頭ゼロを保持したい識別子（例: 郵便番号 `'01234'`）は `type: 'string'` を使うか `formatter` で文字列を返してください

> 注意: `format` に数値そのものを渡す形式はサポートしていません。必ずオブジェクト `{ width: N }` を使用するか、`formatter` で柔軟に処理してください。

### map — 値の変換

`map` は値の変換ルールを与えるために使います（`map` は `formatter` / `type` / `format` の前に適用されます）。

- **Map を指定（推奨、型厳密マッチ）**

  `raw` 値をそのままキーにして厳密照合します（`===`）。

  例:

  ```js
  { key: 'product', map: new Map([[ 'りんご', 'A01' ], [ 'バナナ', 'B02' ]]) }
  ```

  Map にキーがなければ次の処理にフォールバックします（`mapDefault` があればそれを使い、なければ元の値を返します）。

- **関数で指定**

  `map: (value, record) => newValue` の形で動的に変換できます。

  例:

  ```js
  { key: 'price', map: (v, rec) => v == null ? '' : Number(v) > 0 ? `¥${v}` : v }
  ```

  関数が `undefined` を返した場合は `mapDefault` が使われ、なければ元の値に戻ります。

- **mapMode: `'strict' | 'string'`**

  - `'strict'`（デフォルト）: `Map` と `function` を想定（型厳密）。
  - `'string'`: plain object を許容し、`String(raw)` をキーとした照合を行います（互換モード）。

  例 (plain object + string モード):

  ```js
  { key: 'status', map: { OK: '1', NG: '0' }, mapMode: 'string' }
  ```

- **mapDefault**

  map にヒットしなかった場合の代替値。値または関数 (`mapDefault(raw, record)`) を指定可。

  例 (固定値):

  ```js
  { key: 'category', map: new Map([[ '食料', 'F' ]]), mapDefault: 'OTHER' }
  ```

  例 (関数):

  ```js
  { key: 'category', map: new Map([[ '食料', 'F' ]]), mapDefault: (raw) => raw ? String(raw).slice(0,3) : '' }
  ```

- **mapFinal**

  `mapFinal: true` を指定すると、map の戻り値を最終出力として扱い、その後の `formatter` / `type` / `format` の処理をスキップします。

  例:

  ```js
  { key: 'price', map: v => `¥${v}`, mapFinal: true }
  ```

> 補足: map の返り値は mapFinal を指定していない限り、その後の `formatter` や `type/format` の処理に渡されます。

### formatter

`formatter: (value, record) => string` の関数を指定すると、これが最優先で使用されます（map 処理の後に呼ばれます）。

## 取り得る値の例と挙動

- ネストした値: `key: 'address.city'` のようにドットでネストを辿れます。
- `default` が関数の場合、レコード全体が引数として渡されます。
- ヘッダの出力は `buildCSV` の `options.header=true/false` で制御できます。

## 公開 API

- `buildRow(schema, data, options)` -> CSV の一行（改行なし）
- `buildCSV(schema, dataArray, options)` -> CSV 全体（ヘッダ行を含めるかは `options.header`）

ブラウザ環境では `window.CSV.buildRow` / `window.CSV.buildCSV` に公開されます。

---

## buildRow / buildCSV の `data` 引数について

`buildRow` と `buildCSV` の第2引数（`data` / `dataArray`）の取り方と注意点をまとめます。

- buildRow(schema, data, options)
  - `data` は単一のレコードオブジェクトを渡します。
  - スキーマの `key` はオブジェクト上のプロパティ名またはドットパス（例: `user.name`）を指定できます。
  - 該当プロパティが存在しない場合は、スキーマで `default` を指定していればその値（または `default(record)`）が使われ、未指定なら空文字列が出力されます。
  - 例:

```js
const schema = [
  { key: 'id', label: 'ID' },
  { key: 'user.name', label: '氏名' },
  { key: 'score', label: '得点', default: (rec) => rec.user && rec.user.defaultScore ? rec.user.defaultScore : 0 }
];
const rec = { id: 1, user: { name: '佐藤' } };
console.log(window.CSV.buildRow(schema, rec)); // -> "1,佐藤,0"
```

- buildCSV(schema, dataArray, options)
  - `dataArray` にはレコードの配列を渡します。単一レコードを渡したい場合は配列でラップするか、`buildCSV` は非配列を単一要素配列として扱います（内部で `Array.isArray` チェックをしています）。
  - `options.header` を `true` にすると、スキーマの `label`（または `key`）によるヘッダ行が先頭に挿入されます。
  - 例:

```js
const rows = [
  { id: 1, user: { name: '佐藤' }, score: 10 },
  { id: 2, user: { name: '鈴木' } } // score は default が使われる
];
console.log(window.CSV.buildCSV(schema, rows, { header: true }));
// -> "ID,氏名,得点\n1,佐藤,10\n2,鈴木,0"
```

### ネストと配列インデックス

ドットパスはネストしたオブジェクトを辿るのに使えます。配列の要素にアクセスする際はインデックスを指定できます（例: `items.0.name`）。存在しない経路を辿ると `undefined` となり、`default` があればそちらが使われます。

```js
const schema2 = [ { key: 'items.0.name', label: '第1商品' } ];
console.log(window.CSV.buildRow(schema2, { items: [{ name: 'りんご' }] })); // -> "りんご"
```

### 型とフォーマットの関係

`buildRow` / `buildCSV` はスキーマの `type`（`date` / `number` / `string`）や `format` を見て簡易整形を行いますが、より細かい整形（小数桁数、通貨記号付加など）は `formatter` を使って明示的に文字列を返すのが安全です。

### map の適用タイミング

データは内部で次の流れで処理されます: 取得した raw 値 -> `map` を適用 -> (`mapFinal` がある場合はそのまま最終出力) -> `formatter` があれば適用 -> `type`/`format` による簡易整形 -> CSV エスケープ。したがって `map` の戻り値に `type`/`format` を適用したい場合は `mapFinal: false`（デフォルト）にしてください。


必要ならこのドキュメントにサンプルコードや追加の変換パターン（日時の細かい扱い、複雑な map のユースケースなど）を追記できます。

## Try it — 短いサンプル

以下はすぐ試せる簡単なサンプルです。ブラウザ版と Node (テスト環境のように `global.window = global` を使う) の両方を示します。

### ブラウザでの利用例

```html
<script src="src/csv-builder.js"></script>
<script>
  const schema = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '名前' },
    { key: 'birth', label: '生年月日', type: 'date', format: 'YYYY/MM/DD' },
    { key: 'product', label: '商品コード', map: new Map([['りんご','A01'],['バナナ','B02']]) }
  ];
  const data = { id: 1, name: '山田太郎', birth: '19800115', product: 'りんご' };
  // ヘッダ付き CSV を作る
  console.log(window.CSV.buildCSV(schema, [data], { header: true }));
</script>
```

### Node での利用例（テスト/スクリプト用）

```js
// Node 環境で window にバインドする例（テストのときと同様の使い方）
global.window = global;
require('./src/csv-builder.js');

const schema = [
  { key: 'id', label: 'ID' },
  { key: 'price', label: '価格', map: v => Number(v) > 0 ? `¥${v}` : v, mapFinal: true },
  { key: 'created', label: '作成日', type: 'date', format: 'UNIX' }
];

const rows = [
  { id: 1, price: 1200, created: 1700000000 },
  { id: 2, price: 0, created: '2020-01-02' }
];

console.log(window.CSV.buildCSV(schema, rows));
```

### mapMode と mapDefault の小例

```js
global.window = global;
require('./src/csv-builder.js');

const schema = [
  { key: 'status', label: '状態', map: { OK: '1', NG: '0' }, mapMode: 'string', mapDefault: '9' }
];
console.log(window.CSV.buildCSV(schema, [{ status: 'OK' }, { status: 'UNKNOWN' }]));
// UNKNOWN は mapDefault により '9' となる
```

---

ドキュメントにさらに載せたいサンプル（例: 複雑な formatter、ネストドットパス、mapDefault を関数にする等）があれば教えてください。

## 追加ユースケース: 具体例

以下は現場でよく出るパターンの短い例です。

### 1) formatter で小数を2桁に丸めて出力する

CSV に通す前に数値を小数点以下2桁で丸めたい場合は `formatter` を使います。`type: 'number'` の簡易フォーマットは整数部のゼロ埋め用なので、小数を保持した整形は `formatter` に実装します。

```js
const schema = [
  { key: 'price', label: '価格', formatter: (v) => v == null || v === '' ? '' : Number(v).toFixed(2) }
];
const data = [{ price: 123.456 }, { price: 7 }];
console.log(window.CSV.buildCSV(schema, data));
// 出力例: "価格\n123.46\n7.00"
```

### 2) 複雑なネストパス（配列インデックスや深いネスト）

ドットパスは単純なプロパティ連結に対応します。配列の先頭要素などを参照する場合は `items.0.name` のように指定できます。

```js
const schema = [
  { key: 'user.profile.contact.city', label: '市区町村' },
  { key: 'items.0.name', label: '第1商品名' }
];
const rec = {
  user: { profile: { contact: { city: '横浜市' } } },
  items: [{ name: 'りんご' }, { name: 'バナナ' }]
};
console.log(window.CSV.buildRow(schema, rec));
```

注意: ドット区切りで存在しないパスを辿ると `undefined` となり、`default` が設定されていればそちらが使われます。

### 3) `mapDefault` を関数で指定して柔軟にハンドルする

マップにヒットしなかったときに、単純な代替値ではなく入力値に基づいた派生値を返したい場合は `mapDefault` を関数にできます。

```js
const schema = [
  {
    key: 'category',
    label: 'カテゴリコード',
    map: new Map([[ '食料', 'F' ], [ '日用品', 'D' ]]),
    mapDefault: (raw) => raw ? `UNK-${String(raw).slice(0,2).toUpperCase()}` : ''
  }
];
console.log(window.CSV.buildCSV(schema, [{ category: '食料' }, { category: '電子' }, { category: null }]));
// 結果例: 食料 -> 'F', 電子 -> 'UNK-電' (slice の動作に依存), null -> ''
```

---

これらの例をベースに、さらに複雑なフォーマッタや map の組合せ例を追加できます。別の具体例が必要なら種類（例: 通貨、パディング、複数列マッピング）を教えてください。