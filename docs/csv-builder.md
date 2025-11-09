# csv-builder API ドキュメント

このドキュメントは `src/csv-builder.js` が公開する関数の使い方と、公開関数に与える引数（意味と指定方法）を整理したリファレンスです。

目的: kintone やブラウザ上で利用する開発者が、公開関数 `buildRow` / `buildCSV` を正しく使えるように、引数の型、スキーマ定義のパターン、挙動（デフォルト値、map、formatter の適用順序等）を明確に示します。

---

## 公開 API サマリ

- `buildRow(schema, data, options) -> string`
  - 単一レコード `data` から CSV の 1 行（改行無し）を返します。

- `buildCSV(schema, dataArray, options) -> string`
  - レコード配列 `dataArray` から CSV 全体（必要ならヘッダを含む）を返します。改行は `\n` です。

ブラウザでは `window.CSV.buildRow` / `window.CSV.buildCSV` として利用できます。Node で試す場合はテストと同じく `global.window = global` を行い `require('./src/csv-builder.js')` してください。

---

## 1) buildRow の詳細

**シグネチャ**:

```js
buildRow(schema, data, options = {})
```

**引数**:

- `schema` (Array|Object)
  - スキーマ配列かオブジェクト。配列を推奨します。各要素はスキーマ要素オブジェクト（下の「スキーマ要素」参照）。

- `data` (Object)
  - 単一のレコードオブジェクト。`key`（ドットパス可）を使って値を取り出します。

- `options` (Object)
  - `delimiter` (string) — フィールド区切り。デフォルト `,`。

**戻り値**:

- CSV の 1 行（string）。各セルは CSV ルールに基づいて必要ならクオートされます。数値型はそのまま数値文字列で出力（クオートされない）されます。

**例**:

```js
const schema = [ { key: 'id' }, { key: 'name' } ];
console.log(buildRow(schema, { id:1, name:'山田' })); // "1,山田"
```

**注意点**:

- `data` に `key` が存在しない場合は `undefined` と判定され、スキーマで `default` があればそれが使われます。`default` 未指定なら空文字列が入ります。

---

## 2) buildCSV の詳細

**シグネチャ**:

```js
buildCSV(schema, dataArray, options = {})
```

**引数**:

- `schema` (Array|Object) — 同上
- `dataArray` (Array|Object)
  - レコードの配列。配列を渡すのが通常です。非配列を渡すと内部で `[dataArray]` として扱われ、単一レコードでも動作します。
- `options` (Object)
  - `delimiter` (string) — フィールド区切り（デフォルト `,`）
  - `header` (boolean) — `true`（デフォルト）でヘッダ行を出力。ヘッダは各スキーマ要素の `label`（未指定なら `key`）を使用します。

**戻り値**:

- CSV 全体の文字列（複数行）。行区切りは `\n`。

**例**:

```js
const rows = [ { id:1, name:'山田' }, { id:2, name:'鈴木' } ];
console.log(buildCSV(schema, rows, { header:true }));
// "id,name\n1,山田\n2,鈴木"
```

---

## スキーマ要素（詳細）

各要素はオブジェクトで、以下のプロパティをサポートします。

- `key` (string)
  - 取得するプロパティ名。ドットパス（例: `user.name`, `items.0.price`）をサポートします。

- `label` (string | function)
  - ヘッダに出す文字列。関数を指定すると `label()` の戻り値が使われます。

- `default` (any | function(record))
  - `data` 上に `key` が存在しないときに使用する値。関数の場合は `default(record)` が呼ばれます。

- `type` (string)
  - `'string' | 'date' | 'number'`。

- `format` (string | object)
  - `type==='date'` の場合: `'YYYY-MM-DD' | 'YYYY/MM/DD' | 'YYYYMMDD' | 'YMMDD' | 'UNIX' | 'UNIX_MS'`
  - `type==='number'` の場合: `{ width: N }` のように整数部の固定幅ゼロ埋めを指定。

- `formatter` (function(value, record) => string)
  - `map` 適用後に最優先で呼ばれ、その戻り値をそのままセルとして使います。小数桁制御や通貨表記など、文字列として柔軟に整形したいときに使用します。

- `map` (Map | function | plain object)
  - `Map`（推奨）: `map.get(rawValue)` で変換（キーは厳密比較 `===`）。
  - `function`: `(rawValue, record) => newValue`。`undefined` を返すと `mapDefault` が適用されます。
  - plain object を使う場合は `mapMode: 'string'` を指定すると `String(rawValue)` をキーにして照合します。

- `mapMode` ('strict' | 'string')
  - デフォルトは `'strict'`。

- `mapDefault` (any | function(raw, record))
  - map にヒットしなかった場合の代替値。関数なら `(raw, record) => fallback` が呼ばれます。

- `mapFinal` (boolean)
  - `true` を指定すると、map の戻り値をそのまま最終出力とし、その後の `formatter` / `type` / `format` の処理をスキップします。

---

## 内部の処理フロー（短く）

raw 値取得 -> map 適用 -> (mapFinal?) -> formatter -> type/format -> escape -> 出力

この順序を理解することで、map の戻り値をさらにフォーマットするか、そのまま出力するかを制御できます。

---

## 出力とエスケープのルール（補足）

- `null` / `undefined` -> 空文字列
- 数値 (`typeof === 'number'` && `Number.isFinite`) -> クオートされずそのまま出力（例: `123`）
- 上記以外は `String(value)` 化され、`"` は `""` に、カンマ/改行があれば全体を `"..."` で囲みます。

---

## 具体例

### 1) ヘッダ付き CSV（ブラウザ）

```html
<script src="src/csv-builder.js"></script>
<script>
  const schema = [
    { key:'id', label:'ID' },
    { key:'name', label:'氏名' },
    { key:'birth', label:'生年月日', type:'date', format:'YYYY/MM/DD' }
  ];
  const rows = [ { id:1, name:'山田', birth:'19800115' } ];
  console.log(window.CSV.buildCSV(schema, rows, { header:true }));
</script>
```

### 2) Node で formatter を使う例（小数2桁、通貨）

```js
global.window = global;
require('./src/csv-builder.js');
const schema = [
  { key:'amount', label:'金額', formatter: (v)=> v==null?'':`¥${Number(v).toFixed(2)}` }
];
console.log(window.CSV.buildCSV(schema, [{ amount:123.456 }], { header:true }));
```

### 3) Map と mapDefault の例

```js
const m = new Map([['りんご','A01']]);
const schema = [ { key:'product', map:m, mapDefault:'UNKNOWN' } ];
console.log(buildRow(schema, { product:'ばなな' })); // -> 'UNKNOWN'
```

---

## 契約（Contract）

- 入力: `schema`（配列/オブジェクト）、`data`（オブジェクト）または `dataArray`（配列）
- 出力: CSV 文字列（改行は `\n`、区切りは `options.delimiter`）
- エラー: 型エラーや致命的な例外はスローされますが、個々のフィールドは `default` / `mapDefault` で安全にフォールバックします。

---

## 注意点とエッジケース

- ドットパスで存在しないプロパティを辿ると `undefined` になるため `default` を設定することを推奨します。
- `map` に plain object を使うときは `mapMode:'string'` を指定してください（デフォルトは型厳密な Map を期待します）。
- `YMMDD` は年の下1桁 + 月2桁 + 日2桁を返します（例: 2025-11-09 -> '51109'）。
- UNIX 出力は `UNIX`（秒）と `UNIX_MS`（ミリ秒）をサポートします。数値入力は閾値で秒/ミリ秒判定されます。

---

必要ならこのドキュメントにさらにユースケース（CRLF 対応、複雑なマッピング、パフォーマンス注意事項など）を追加します。
