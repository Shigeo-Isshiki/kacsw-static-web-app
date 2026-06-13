# csv-parser API ドキュメント

このドキュメントは [src/csv-parser.js](src/csv-parser.js) が公開する関数の使い方と、引数（schema/options）および返り値の仕様を整理したリファレンスです。

目的: kintone カスタマイズ側から CSV インポート処理を呼び出す際に、ファイル選択・文字コード変換・CSV パース・レコード化までの挙動を一貫して確認できるようにします。

---

## 公開 API サマリ

- `parseCSV(schema, options) -> Promise<Result>`
  - CSV ファイル選択ダイアログを内部で開き、読み込み・デコード・パース・schema マッピングまでを実行します。

ブラウザでは `parseCSV(...)` として直接利用できます（`window.parseCSV` に公開）。
併せて `window.CSV.parseCSV(...)` からも呼び出せます。Node/テスト環境では CommonJS エクスポート（`module.exports`）にも対応しています。

---

## 1) parseCSV の詳細

**シグネチャ**:

```js
parseCSV(schema, (options = {}));
```

**引数**:

- `schema` (Array|Object)
  - CSV の列を出力レコードへマッピングする定義。
  - 配列形式を推奨。オブジェクト形式も受け入れます。

- `options` (Object)
  - CSV 構文、文字コード、エラー挙動を制御します（詳細は後述）。

**戻り値（Promise 解決値）**:

- `Result` オブジェクト
  - `records` (Array): schema 適用後のレコード配列
  - `errors` (Array): 行単位/全体単位のエラー配列
  - `meta` (Object): 解析メタ情報
  - `rawRows` (Array, 任意): `includeRawRows` が true の場合のみ

---

## 2) options の詳細

### CSV 構文オプション

- `delimiter` (string)
  - 区切り文字。デフォルト `,`。

- `quoteChar` (string)
  - 引用符。デフォルト `"`。

- `escapeMode` (string)
  - クォートエスケープ方式。デフォルト `double-quote`。

- `newline` (string)
  - `auto` | `lf` | `crlf`。デフォルト `auto`。

- `hasHeader` (boolean)
  - 先頭行をヘッダとして扱うか。デフォルト `true`。

- `trimHeader` (boolean)
  - ヘッダ文字列の前後空白を除去するか。デフォルト `true`。

- `trimCell` (boolean)
  - セル文字列の前後空白を除去するか。デフォルト `false`。

- `skipEmptyLines` (boolean)
  - 空行を除外するか。デフォルト `true`。

- `strictColumnCount` (boolean)
  - ヘッダ列数と各行列数の不一致をエラー化するか。デフォルト `false`。

### 文字コードオプション

- `encoding` (string)
  - `AUTO` | `UTF8` | `SJIS` | `UTF16LE` など。デフォルト `AUTO`。

- `encodingLibrary` (string)
  - `auto` | `encodingjs` | `textdecoder`。デフォルト `auto`。

- `fallbackEncodings` (Array<string>)
  - `encoding: AUTO` 時の試行順。デフォルト `["UTF8", "SJIS"]`。

- `allowBom` (boolean)
  - BOM 判定を使うか。デフォルト `true`。

### ファイル選択オプション

- `accept` (string)
  - ファイル選択ダイアログに渡す `accept` 属性値。デフォルト `.csv,text/csv`。
  - 例: `'.csv,.txt,text/csv,text/plain'`（CSV と TXT を許可）
  - 例: `'*'`（制限なし）
  - ブラウザの UI フィルタのみで、強制制限ではありません。

### エラー/出力オプション

- `onRowError` (string)
  - `collect` | `skip` | `throw`。デフォルト `collect`。

- `includeRawRows` (boolean)
  - true の場合に `rawRows` を返す。デフォルト `false`。

---

## 3) schema 要素（詳細）

各要素はオブジェクトで、以下をサポートします。

- `column` (string | number)
  - 参照する CSV 列。ヘッダ名または列 index。

- `fieldCode` (string)
  - 出力レコードのキー名。

- `key` (string)
  - `fieldCode` の代替キーとしても扱われます。

- `type` (string)
  - `string` | `number` | `boolean` | `date` | `datetime`。

- `format` (string)
  - 主に `type: 'date'` / `type: 'datetime'` の入力形式ヒント。
  - 例: `YYYY-MM-DD` | `YYYY/MM/DD` | `YYYYMMDD` | `YYMMDD` | `YMMDD` | `UNIX` | `UNIX_MS`。

- `required` (boolean)
  - 必須チェック。

- `default` (any | function)
  - 空値時のデフォルト。

- `map` (Map | function | object)
  - 値変換。

- `mapMode` (`strict` | `string`)
  - object map 使用時のキー比較モード。

- `mapDefault` (any | function)
  - map ミス時の代替値。

- `parser` (function)
  - 個別変換ロジック。

- `validate` (function)
  - 値検証（`true`/`undefined` 以外はエラー扱い）。

---

## 4) 返り値仕様

### records

- schema に基づいて作成された配列。
- `onRowError` が `collect` または `skip` の場合、エラー行は records へ追加されません。

### errors

代表的なフィールド:

- `rowIndex` (number|null)
- `column` (string|number|null)
- `fieldCode` (string|null)
- `code` (string)
- `message` (string)
- `details` (any, 任意)

代表的な `code`:

- `FILE_PICKER_UNAVAILABLE`: ファイル選択ダイアログを開けない
- `FILE_READER_UNAVAILABLE`: ファイル読み込み API を利用できない
- `FILE_READ_ERROR`: ファイルの読み込みに失敗した
- `ENCODING_JS_UNAVAILABLE`: 文字コード変換ライブラリを利用できない
- `ENCODING_JS_CODETOSTRING_UNAVAILABLE`: 文字列変換機能を利用できない
- `TEXT_DECODER_UNAVAILABLE`: `TextDecoder` を利用できない
- `ENCODING_ERROR`: 文字コードの判定または復号に失敗した
- `CSV_PARSE_ERROR_UNCLOSED_QUOTE`: CSV の引用符が閉じられていない
- `COLUMN_COUNT_MISMATCH`: 列数が一致しない
- `COLUMN_NOT_FOUND`: CSV ヘッダーに列が見つからない
- `REQUIRED_MISSING`: 必須項目が入力されていない
- `TYPE_NUMBER_INVALID`: 数値に変換できない
- `TYPE_BOOLEAN_INVALID`: 真偽値に変換できない
- `TYPE_DATE_INVALID`: 日付に変換できない
- `TYPE_DATETIME_INVALID`: 日時に変換できない
- `TYPE_CONVERSION_ERROR`: 値の変換に失敗した
- `ROW_ERROR`: 行エラーが発生した
- `VALIDATION_ERROR`: 入力値が条件を満たしていない
- `PARSE_ERROR`: 予期しない理由で CSV 解析に失敗した

### キャンセル時

- ファイル選択ダイアログをキャンセルした場合は `errors` には追加せず、`meta.cancelled = true` を返します。
- そのため、利用側では `result.meta.cancelled` を見てキャンセルとエラーを分けて扱えます。

### meta

- `totalRows` (number): データ行数（ヘッダ除く）
- `parsedRows` (number): records 化できた行数
- `errorRows` (number): エラー行数
- `header` (Array<string>): ヘッダ
- `detectedEncoding` (string|null): 実際に採用した文字コード
- `decodeMethod` (string|null): `encodingjs` または `textdecoder`
- `hadBom` (boolean): BOM 有無
- `cancelled` (boolean): ファイル選択をキャンセルしたか
- `delimiter` (string)
- `newline` (string)

---

## 5) 内部処理フロー（短く）

ファイル選択 -> バイト読み込み -> 文字コード判定/デコード -> CSV 構文解析 -> ヘッダ/データ分離 -> schema 変換・検証 -> 結果返却

### 日付変換の補足

- `type: 'date'` は最終的に `YYYY-MM-DD`（kintone 日付形式）へ正規化されます。
- `type: 'datetime'` は最終的に `YYYY-MM-DDTHH:MM:SSZ`（ミリ秒なし）へ正規化されます。
- `format` 未指定時でも、代表的な日付文字列/数値は自動判定で変換を試みます。

---

## 6) 運用上の注意

- `parseCSV` は内部でファイル選択ダイアログを開くため、ユーザー操作起点（クリックイベントなど）から呼び出してください。
- 文字コードが重要な運用では、`encoding` を明示指定してテストしたうえで `AUTO` を併用する運用を推奨します。
- `encodingLibrary: auto` の場合、`encoding.js` が利用可能なら優先し、利用不可時は `TextDecoder` にフォールバックします。

---

## 7) kintone で Shift_JIS CSV を読むサンプル

前提:

- `encoding.js` を読み込み済み
- `src/csv-parser.js` を読み込み済み
- ボタンクリックなどのユーザー操作内で `parseCSV` を呼ぶ

```js
const schema = [
	{ column: '顧客コード', fieldCode: 'customer_code', type: 'string', required: true },
	{ column: '顧客名', fieldCode: 'customer_name', type: 'string' },
	{ column: '取引日', fieldCode: 'trade_date', type: 'date', format: 'YYYYMMDD' },
	{ column: '金額', fieldCode: 'amount', type: 'number' },
	{ column: '更新日時', fieldCode: 'updated_at', type: 'datetime', format: 'UNIX' },
];

const options = {
	encoding: 'SJIS',
	encodingLibrary: 'encodingjs',
	hasHeader: true,
	delimiter: ',',
	onRowError: 'collect',
	accept: '.csv,text/csv', // ファイル選択ダイアログの絞り込み（省略時は .csv,text/csv）
};

const result = await parseCSV(schema, options);

if (result.meta.cancelled) {
	console.log('CSV の読み込みはキャンセルされました');
	return;
}

if (result.errors.length > 0) {
	console.warn('CSV 変換エラー', result.errors);
}

console.log('records', result.records);
console.log('meta', result.meta);
```

補足:

- `type: 'date'` は最終的に `YYYY-MM-DD` へ正規化されます。
- `type: 'datetime'` は最終的に `YYYY-MM-DDTHH:MM:SSZ` へ正規化されます。
- ユーザーがファイル選択をキャンセルした場合は `result.meta.cancelled` で判定します。
- 反映先アプリへの追加/更新/Upsert 判定は、`result.records` を使って kintone 側ロジックで実行してください。
