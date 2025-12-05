# zip-code-address-utils 使い方リファレンス

このドキュメントは `src/zip-code-address-utils.js` が公開する郵便番号／デジタルアドレス関連ユーティリティ関数の使い方と引数・戻り値の契約を整理したリファレンスです。テストや Node 環境でも `require('../src/zip-code-address-utils.js')` で利用できます（CommonJS エクスポートあり）。

---

## 目次

- 概要
- 公開 API サマリ
- 各関数の引数・戻り値詳細（戻り値の形を必ず記載）
  - `checkZipCodeExists(zipCode, callback)`
  - `formatZipCode(zipCode, callback)`
  - `getAddressByZipCode(zipCode, callback)`
  - `getCityByZipCode(zipCode, callback)`
  - `getPrefectureByZipCode(zipCode, callback)`
  - `normalizeZipCode(zipCode, callback)`
  - `kintoneZipSetSpaceFieldButton(spaceField, id, label, zipCode, callback)`
  - `kintoneZipSpaceFieldText(spaceField, id, display)`
- 実例
- 注意事項 / エッジケース

---

## 概要

`src/zip-code-address-utils.js` は以下の用途を想定したヘルパー群です。

- 入力（全角数字・英字、ハイフン、空白を含む）を正規化して API に問い合わせる
- 郵便番号／デジタルアドレスの存在確認・表示用フォーマット作成
- API 応答を整形して住所や都道府県・市区町村だけを取り出す
- kintone のスペースフィールド向けに DOM 要素を追加するユーティリティ

主な前処理:

- 全角英数字を半角に変換（例: `１２３` -> `123`）
- 記号や全角空白を除去（`-`, `ー`, 全角スペース 等）
- 英字は大文字化して扱う（デジタルアドレス対応）

API ベース URL: `https://digital-address.app`

---

## 公開 API サマリ

- `checkZipCodeExists(zipCode, callback)` — 存在確認を行い `callback(exists:boolean)` を呼び出す。
- `formatZipCode(zipCode, callback)` — 表示用の郵便番号（ハイフン付きなど）を `callback(result)` で返す。`result` は成功なら `{ zipCode: string }`、失敗なら `{ error: string }`。
- `getAddressByZipCode(zipCode, callback)` — 住所情報オブジェクトを `callback(result)` で返す。成功時は詳細フィールドを含むオブジェクトを返す（下記参照）。失敗時は `{ error: string }`。
- `getCityByZipCode(zipCode, callback)` — 市区町村名を `callback(cityName|string|null)` で返す（見つからなければ `null`）。
- `getPrefectureByZipCode(zipCode, callback)` — 都道府県名を `callback(prefName|string|null)` で返す（見つからなければ `null`）。
- `normalizeZipCode(zipCode, callback)` — 正規化済みの7文字（半角英数字）を `callback(result)` で返す。成功: `{ zipCode: string }`、失敗: `{ error: string }`。
- `kintoneZipSetSpaceFieldButton(spaceField, id, label, zipCode, callback)` — kintone のスペースフィールドにボタンを追加（または削除）します。
- `kintoneZipSpaceFieldText(spaceField, id, display)` — 説明テキストをスペースフィールドに追加/削除します。

---

## 各関数の引数・戻り値詳細

**注意**: すべての API 呼び出しは非同期でコールバックを利用します。

<a id="checkZipCodeExists"></a>

### `checkZipCodeExists(zipCode, callback)`

- 引数:
  - `zipCode` (string|number) — 郵便番号またはデジタルアドレス（全角や記号を含む可能性あり）。
  - `callback` (function) — 呼び出しシグネチャ: `(exists: boolean) => void`

- 動作:
  - 入力を内部で正規化し（全角→半角、記号除去、大文字化）、7 文字（`[0-9A-Z]{7}`）でない場合は `callback(false)` を返します。
  - API に問い合わせ、該当データがあれば `callback(true)`、見つからなければ `callback(false)`。
  - ネットワークエラー等では `callback(false)` を返します。

- 返り値（コールバック）:
  - `true` または `false`（`boolean`）

---

<a id="formatZipCode"></a>

### `formatZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — 呼び出しシグネチャ: `(result) => void`

- 動作:
  - 入力を正規化した上で API を問い合わせます。APIが該当データを返せば、内部で次のように `result` を決定します。

- `result` の形（必ず明記）:
  - 成功（数字7桁）: `{ zipCode: '123-4567' }` // 表示用にハイフンを追加
  - 成功（英数字混在／数字以外の7桁）: `{ zipCode: 'A1B2C3D' }` // 正規化済み7文字をそのまま返す
  - 失敗: `{ error: '郵便番号が存在しません' }` または `{ error: 'APIエラー（<status>）' }` / `{ error: 'API接続エラー' }`

- 例:

```js
formatZipCode('１２３－４５６７', (res) => {
	// res === { zipCode: '123-4567' }
});
```

---

<a id="getAddressByZipCode"></a>

### `getAddressByZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — 呼び出しシグネチャ: `(result) => void`

- 動作:
  - 正規化後に API に問い合わせ、単一の住所オブジェクトが返ってきた場合は整形して `callback` に渡します。
  - API が 404 や空配列を返した場合、`{ error: '<message>' }` を返します。
  - API レスポンスの構造が想定外の場合は `error` を返します。

- 成功時に返す `result` の形（必ず明記）:

```js
{
  originalZipCode: '１２３－４５６７',   // 入力値（記号・全角含む）
  normalizedZipCode: '1234567',         // 正規化済み（半角・大文字変換済み）
  apiZipCode: '1234567',                // API が返した zip_code
  zipCode: '123-4567',                  // 表示用（ハイフン付き）または正規化済み値
  zipCode1: '1',                        // 各桁を分割した値（1～7）
  zipCode2: '2',
  zipCode3: '3',
  zipCode4: '4',
  zipCode5: '5',
  zipCode6: '6',
  zipCode7: '7',
  address: '神奈川県横浜市西区みなとみらい1-1', // 結合された住所文字列（不要な空白を除去）
  prefName: '神奈川県',                 // 都道府県名
  cityName: '横浜市西区',               // 市区町村名
  townName: 'みなとみらい',             // 町名
  blockName: '1-1',                     // 番地（存在する場合）
  otherName: '○○マンション',            // その他の住所情報（存在する場合）
  bizName: '株式会社○○'                 // 事業所名（存在する場合）
}
```

- 失敗時は必ず次の形のオブジェクトを返す:

```js
{
	error: '郵便番号／デジタルアドレス「${zipCode}」に該当する住所が見つかりません';
}
```

---

<a id="getCityByZipCode"></a>

### `getCityByZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — `(cityName|null) => void`

- 動作/戻り値:
  - 成功: 市区町村名（`string`）を返す。
  - 見つからない / エラー: `null` を返す。

---

<a id="getPrefectureByZipCode"></a>

### `getPrefectureByZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — `(prefName|null) => void`

- 動作/戻り値:
  - 成功: 都道府県名（`string`）を返す。
  - 見つからない / エラー: `null` を返す。

---

<a id="normalizeZipCode"></a>

### `normalizeZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — `(result) => void`

- 動作:
  - 入力を正規化して API に問い合わせ、存在確認を行います。

- `result` の形:
  - 成功: `{ zipCode: '1234567' }`（正規化済み7文字）
  - 失敗: `{ error: '郵便番号が存在しません' }` や `{ error: 'API接続エラー' }`

---

<a id="kintoneZipSetSpaceFieldButton"></a>

### `kintoneZipSetSpaceFieldButton(spaceField, id, label, zipCode, callback)`

- 引数:
  - `spaceField` (string) — kintone のスペースフィールドコード
  - `id` (string) — 生成するボタンの `id`
  - `label` (string | undefined | null) — ボタンラベル。`undefined` はデフォルト文言、`null`/`''` は非表示（削除）
  - `zipCode` (string|number) — ボタン押下時に使う郵便番号/デジタルアドレス
  - `callback` (function|undefined|null) — 取得結果を受け取るコールバック（省略可）

- 動作:
  - 指定した `spaceField` のスペース要素にボタンを追加します。`label` が `null` または空文字の場合はボタンを削除/非表示にします。
  - ボタン押下時に `getAddressByZipCode` を呼び出し、`callback` に結果を返します。

- 戻り値:
  - `void`（DOM に対する副作用を行います）

---

<a id="kintoneZipSpaceFieldText"></a>

### `kintoneZipSpaceFieldText(spaceField, id, display)`

- 引数:
  - `spaceField` (string)
  - `id` (string)
  - `display` (boolean) — `true` で表示、`false` で非表示（削除）

- 動作:
  - スペースフィールドに説明テキスト用の要素を追加または削除します。

- 戻り値:
  - `void`（DOM に対する副作用を行います）

---

## 実例

### Node / テスト環境

```js
const zc = require('../src/zip-code-address-utils.js');

zc.formatZipCode('１２３－４５６７', (res) => {
	if (res.error) console.error(res.error);
	else console.log(res.zipCode); // '123-4567'
});

zc.getAddressByZipCode('1234567', (res) => {
	if (res.error) console.error(res.error);
	else console.log(res.prefName, res.cityName, res.townName);
});
```

### ブラウザ / kintone 環境

```html
<script src="src/zip-code-address-utils.js"></script>
<script>
	// window 上に関数が公開されています
	window.formatZipCode('1234567', function (res) {
		console.log(res);
	});

	// スペースフィールドにボタンを追加
	window.kintoneZipSetSpaceFieldButton(
		'スペースフィールドコード',
		'zip-btn',
		undefined,
		'1234567',
		function (result) {
			console.log(result);
		}
	);
</script>
```

---

## 注意事項 / エッジケース

- 入力はまず全角→半角・記号除去・大文字化されます。正規化後は必ず `^[0-9A-Z]{7}$` の形式で API に問い合わせられます。
- API レスポンスが複数件返ってきた場合はエラー（複数見つかりました）扱いになります。実装は単一ヒットを期待しています。
- kintone DOM ヘルパは kintone のランタイム環境に依存します。テスト時には DOM と `kintone.app.record.getSpaceElement` のスタブが必要です（テストコードで実施済み）。
- ネットワークや API の異常 JSON に対しては安全に `error` オブジェクトを返すよう実装されています。

---

## 参照

- 実装ソース: `src/zip-code-address-utils.js`
