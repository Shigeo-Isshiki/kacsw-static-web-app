# csv-builder ドキュメント（簡潔版）

このドキュメントは `src/csv-builder.js` に実装されている機能の簡潔で明確な参照です。
目的は「どう使うか」を素早く分かるようにすることです。詳細な用例や実験はリポジトリ内のテスト・サンプルをご参照ください。

## 概要

公開 API:

- `buildRow(schema, data, options) -> string` — 単一レコードから CSV の一行を生成します（改行なし）。
- `buildCSV(schema, dataArray, options) -> string` — レコード配列から CSV 全体を生成します（ヘッダ付き可）。

ブラウザでは `window.CSV.buildRow` / `window.CSV.buildCSV` として利用できます。テストでは `global.window = global` として読み込んでいます。

## クイックスタート（最短で動かす例）

ブラウザ:

```html
<script src="src/csv-builder.js"></script>
<script>
  const schema = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: '氏名' },
    { key: 'birth', label: '生年月日', type: 'date', format: 'YYYY/MM/DD' }
  ];
  const data = [{ id:1, name:'山田', birth:'19800115' }];
  console.log(window.CSV.buildCSV(schema, data, { header: true }));
</script>
```

Node（テストスタイル）:

```js
global.window = global;
require('./src/csv-builder.js');
const csv = window.CSV.buildCSV(schema, dataRows, { header: true });
console.log(csv);
```

## API リファレンス（要点）

1) buildRow(schema, data, options)
- schema: Array or Object（配列推奨）。各要素はスキーマ定義オブジェクト。
- data: 単一のレコードオブジェクト。
- options: { delimiter?: string }（デフォルト ',').
- 戻り値: CSV の 1 行文字列（改行なし）。

2) buildCSV(schema, dataArray, options)
- schema: 同上。
- dataArray: レコード配列。単一オブジェクトを渡すと自動で配列に変換されます。
- options: { delimiter?: string, header?: boolean }（header デフォルト true）。
- 戻り値: CSV 全体（複数行、改行は `\n`）。

## スキーマ: 必須プロパティと主要オプション

- key (string): 取得するプロパティ名またはドットパス（例: `user.name`, `items.0.price`）。
- label (string|function): ヘッダ名（または関数で動的に生成）。
- default (any|function): 値が undefined の場合の代替。関数なら default(record)。
- type (string): 'string' | 'date' | 'number'（日付/数値用の簡易フォーマットと連動）。
- format (string|object): type に応じたフォーマット。
- formatter (function): (value, record) => string。map 適用後に最優先で呼ばれ、その戻り値をセルに入れる。
- map: Map | function | (plain object with mapMode='string')。raw -> mapped を行う。
- mapMode: 'strict' | 'string'（デフォルト 'strict'）。
- mapDefault: any | function(raw, record) — map がヒットしないときの代替。
- mapFinal: boolean — true の場合 map 結果を最終出力とし、以降の formatter/type 処理をスキップ。

## 内部処理の順序（短く）

raw 値取得 -> map 適用 -> (mapFinal?) -> formatter -> type/format -> escape -> 出力

理解しておくとスキーマ設計が直感的になります。

## 代表的なフォーマット仕様

- 日付 format: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'YYYYMMDD' | 'YMMDD' | 'UNIX' | 'UNIX_MS'
  - 数値（秒/ミリ秒）や ISO 文字列を受け付け、閾値で秒判定して処理します。
- 数値 format: { width: N } — 整数部をゼロ埋めして幅を揃えます（負数は符号を保持）。小数部は切り捨て。

## エスケープ・出力のルール（短く）

- null/undefined -> ''
- 数値はクオートされずそのまま出力（例: 123）
- それ以外は文字列化し、カンマや改行、ダブルクォートを考慮して必要ならダブルクォートで囲む。ダブルクォートは `""` にエスケープ。

## 例: よくあるパターン（簡潔）

- ヘッダ付き、日付と金額（小数2桁）:

```js
const schema = [
  { key:'id', label:'ID' },
  { key:'date', label:'日付', type:'date', format:'YYYY/MM/DD' },
  { key:'amount', label:'金額', formatter:(v)=> v==null?'':`¥${Number(v).toFixed(2)}` }
];
const csv = window.CSV.buildCSV(schema, rows, { header:true });
```

- Map を使う例（型厳密）:

```js
const map = new Map([['りんご','A01'],['バナナ','B02']]);
const schema = [{ key:'product', map }];
```

## ドキュメントとテストの関係

`docs` のサンプルは `test/test-csv-doc-samples.js` のようなテストで自動チェックしています。サンプルを編集する場合は対応するテストも更新してください。

---

以上をベースに、さらに詳細なユースケースや挙動（CRLF 対応、マルチバイトの slice 処理など）を追記できます。どの項目を優先して追加したいか教えてください。
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

## API リファレンス — 使い方詳細

このセクションでは `src/csv-builder.js` が公開する関数の引数、戻り値、振る舞い、スキーマの指定方法を網羅的に説明します。外部向けライブラリのような厳密な仕様ではなく、実装に即した実用的なリファレンスです。

### 公開関数

- `buildRow(schema, data, options) -> string`
  - 概要: 単一のレコード `data` から CSV の1行（改行なし）を生成します。
  - 引数:
    - `schema` (Array|Object): スキーマ定義。配列またはオブジェクトで指定できます（詳細は下の「スキーマの指定方法」参照）。
    - `data` (Object): 1 レコード分のオブジェクト。スキーマ上の `key` を使って値を取り出します（ドットパスをサポート）。
    - `options` (Object, optional): オプション。現在サポートされているキー:
      - `delimiter` (string) — フィールド区切り文字（デフォルト `,`）
  - 戻り値: 生成された CSV 行（文字列）。各セルは CSV ルールに従ってエスケープされています。数値はクオートされず数値文字列のまま出力されます。

- `buildCSV(schema, dataArray, options) -> string`
  - 概要: `dataArray`（配列）に対して `buildRow` を適用し、必要に応じてヘッダ行を付けて複数行の CSV を生成します。
  - 引数:
    - `schema` (Array|Object): 同上。
    - `dataArray` (Array|Object): レコードの配列。配列で渡すのが一般的ですが、単一オブジェクトを渡すと内部で `[dataArray]` として扱われます（つまり単一レコードでも動作します）。
    - `options` (Object, optional): オプション:
      - `delimiter` (string) — フィールド区切り文字（デフォルト `,`）
      - `header` (boolean) — `true` の場合、先頭行にヘッダを出力します（ヘッダは各スキーマ要素の `label`、未指定なら `key` を使う）。デフォルトは `true`。
  - 戻り値: 生成された CSV（複数行を含む文字列）。改行は `\n` が使われます。

### スキーマの指定方法（再掲・詳細）

スキーマは配列（推奨）かオブジェクトで与えられます。内部では配列に正規化されます。各スキーマ要素は以下のプロパティをサポートします。

- `key` (string) — 必須（オブジェクト形式で指定した場合はキー名が暗黙的に `key` になります）
  - 取り出すプロパティ名。ドットパスをサポート（例: `user.name`, `items.0.price`）。

- `label` (string|function) — オプション
  - ヘッダ名として使う文字列、または関数（`label()` を呼び出し、その戻り値を使用）。

- `default` (any|function) — オプション
  - 値が存在しない（`undefined`）ときに使う既定値。関数の場合は `default(record)` が呼ばれます。

- `type` (string) — オプション
  - `'string' | 'date' | 'number'` のいずれか。`date` / `number` の場合は `format` による簡易整形が適用されます。

- `format` (string|object) — オプション
  - `type === 'date'` のときは `'YYYY-MM-DD' | 'YYYY/MM/DD' | 'YYYYMMDD' | 'YMMDD' | 'UNIX' | 'UNIX_MS'` を指定可能。
  - `type === 'number'` のときは `{ width: N }` のように固定幅ゼロ埋め指定が可能。

- `formatter` (function) — オプション
  - `(value, record) => string` を実装すると、`map` の適用後に最優先で呼ばれ、その戻り値がそのままセルに入ります。複雑な整形（小数桁指定、通貨記号付与、複数カラム合成など）は `formatter` で実装するのが推奨です。

- `map` — オプション（変換ルール）
  - `Map`（推奨）: 型厳密な照合（`===`）で変換します。
  - `function`: `(rawValue, record) => newValue` で動的変換します。`undefined` を返すと `mapDefault` が使われます。
  - plain object を使いたい場合は `mapMode: 'string'` を設定すると `String(raw)` をキーにして照合します（互換モード）。

- `mapMode` (string) — `'strict' | 'string'`（デフォルト `'strict'`）
  - `'strict'` は `Map` と `function` を想定。`'string'` は plain object を許容します。

- `mapDefault` (any|function) — オプション
  - map にヒットしなかった場合の代替値。関数の場合は `(raw, record) => fallback` が呼ばれます。

- `mapFinal` (boolean) — オプション
  - `true` の場合、`map` の戻り値を「最終出力」とみなし、その後の `formatter` / `type` / `format` の処理をスキップします（`map` の戻り値が既に完成された文字列の場合に有用）。

### 内部処理の順序（重要）

データは内部で次の順序で処理されます。
1. raw 値を `data` から取得（`key` / ドットパス）
2. `map` を適用（`Map` / `function` / plain object）
3. `mapFinal` が `true` ならここで最終出力として確定
4. `formatter` があれば呼び出す（`map` 後の値を引数に受け取る）
5. `type` / `format` による簡易フォーマット（`date` / `number` 用の内部実装）
6. CSV のエスケープ（必要ならクオート、ダブルクォートは二重化）。ただし数値はクオートされずそのまま出力されます。

この順序を理解すると、例えば「マップでコードに変換してから日付整形する」「map の戻り値をそのまま出力する」等の意図的な振る舞いをスキーマで表現できます。

### エスケープルール（補足）

- `null` / `undefined` -> 空文字列
- 数値 (`typeof value === 'number'` かつ `Number.isFinite`) -> クオートされずそのまま数値文字列で出力
- それ以外の値は文字列化後、ダブルクォート `"` が含まれる場合は `""` に置換され、カンマや改行が含まれる場合は全体をダブルクォートで囲みます。

### 例: よくあるパターンの設計

- CSV エクスポートでヘッダ付き、日付は YYYY/MM/DD、金額は 2 桁小数で通貨記号を付ける:

```js
const schema = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '氏名' },
  { key: 'date', label: '日付', type: 'date', format: 'YYYY/MM/DD' },
  { key: 'amount', label: '金額', formatter: (v) => v == null ? '' : `¥${Number(v).toFixed(2)}` }
];
const csv = window.CSV.buildCSV(schema, dataRows, { header: true });
```

- map を使ってラベルをコード化（Map を使う）:

```js
const m = new Map([['りんご','A01'],['バナナ','B02']]);
const schema = [ { key: 'product', label: '商品', map: m } ];
```

---

この API 仕様で分かりにくい点や、ドキュメントに追加したい具体的なユースケース（例: マルチバイトの slice の挙動、CSV の改行方式 CRLF 対応など）があれば教えてください。必要ならサンプルをさらに増やし、ドキュメント内のコードブロックに対応する自動テストを追加します。

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