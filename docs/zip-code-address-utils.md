# zip-code-address-utils 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.0.0** です。

このドキュメントは `src/zip-code-address-utils.js` が公開する郵便番号／デジタルアドレス関連ユーティリティ関数の使い方と引数・戻り値の契約を整理したリファレンスです。テストや Node 環境でも `require('../src/zip-code-address-utils.js')` で利用できます（CommonJS エクスポートあり）。

---

<a id="overview"></a>

`src/zip-code-address-utils.js` は以下の用途を想定したヘルパー群です。

- 入力（全角数字・英字、ハイフン、空白を含む）を正規化して API に問い合わせる
- 郵便番号／デジタルアドレスの存在確認・表示用フォーマット作成
- API 応答を整形して住所や都道府県・市区町村だけを取り出す
- kintone の住所自動補完・明示的な置換・ボタンと案内表示を登録するユーティリティ

主な前処理:

- 全角英数字を半角に変換（例: `１２３` -> `123`）
- 記号や全角空白を除去（`-`, `ー`, 全角スペース 等）
- 英字は大文字化して扱う（デジタルアドレス対応）

API ベース URL: `https://api.kacsw.or.jp/zipcode/index.php/api/v1/address/digital?search_code=xxxxxxx`

通信方式は実行環境で自動選択します。kintone で `kintone.proxy` が利用できる場合は同 API をプロキシ経由で呼び出し、FormBridge を含むその他のブラウザ環境では従来どおり `fetch` で直接呼び出します。公開関数の引数・コールバック形式は環境にかかわらず同じです。

---

## 読み込み・依存関係

- ソース：[src/zip-code-address-utils.js](../src/zip-code-address-utils.js)
- 配布URL：https://js.kacsw.or.jp/zip-code-address-utils.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。

ブラウザでは各関数を `window` に公開し、NodeではCommonJSエクスポートも提供します。検索には郵便番号APIへの通信が必要です。kintoneでは `kintone.proxy`、その他のブラウザでは `fetch` を使用します。住所設定ハンドラーにはkintoneのイベント・record APIとDOMが必要です。

## 公開関数の目次

<a id="public-api"></a>

### kintone の住所設定・表示制御

- [`registerZipCodeAddressHandler(options)`](#registerZipCodeAddressHandler) — kintone の郵便番号変更、住所の割り当て・置換、ボタン・案内表示をまとめて登録する。

`registerZipCodeAddressHandler` の登録対象は `devices` で指定します。実際に使用する PC/モバイルの record API は Kintone のイベント種別から選択するため、ランタイム初期化、`KACSW_RUNTIME`、URL による画面判定は不要です。

### 郵便番号の存在確認・整形・正規化

- [`checkZipCodeExists(zipCode, callback)`](#checkZipCodeExists) — 存在確認を行い `callback(exists:boolean)` を呼び出す。
- [`formatZipCode(zipCode, callback)`](#formatZipCode) — 表示用の郵便番号（ハイフン付きなど）を `callback(result)` で返す。成功: `{ zipCode: string }`、失敗: `{ error: string }`。
- [`normalizeZipCode(zipCode, callback)`](#normalizeZipCode) — 正規化済みの7文字（半角英数字）を `callback(result)` で返す。成功: `{ zipCode: string }`、失敗: `{ error: string }`。

### 住所・市区町村・都道府県の検索

- [`getAddressByZipCode(zipCode, callback)`](#getAddressByZipCode) — 住所情報オブジェクトを `callback(result)` で返す。成功時は詳細フィールドを含むオブジェクト、失敗時は `{ error: string }`。
- [`getCityByZipCode(zipCode, callback)`](#getCityByZipCode) — 市区町村名を `callback(cityName|string|null)` で返す（見つからなければ `null`）。
- [`getPrefectureByZipCode(zipCode, callback)`](#getPrefectureByZipCode) — 都道府県名を `callback(prefName|string|null)` で返す（見つからなければ `null`）。

### 住所文字列の検証

- [`hasPrefectureName(address)`](#hasPrefectureName) — 住所が47都道府県の正式名称で始まるかを厳密に判定する。

---

## 関数リファレンス

<a id="api-details"></a>

**注意**: 検索 API は非同期コールバック型です。新しい登録 API の `apply()` / `whenIdle()` は Promise 型です。

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
  - 住所検索1回につきAPI通信は1回です。取得・検証済みの `zip_code` はローカルで表示用に整形し、整形のための再問い合わせは行いません。公開の `formatZipCode` は従来どおりAPIで存在確認します。キャッシュは追加せず、検索ごとにAPIへ問い合わせます。
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
  prefName: '神奈川県',                 // 都道府県名
  cityName: '横浜市西区',               // 市区町村名
  townName: 'みなとみらい',             // 町域
  bizName: '株式会社○○',               // 事業所名（存在する場合）
  blockName: '1-1',                     // 番地等（存在する場合）
  otherName: '○○マンション',            // その他住所（存在する場合）
  businessName: '株式会社○○',           // 企業名（ビジネスデジタルアドレス、存在する場合）
  address: '神奈川県横浜市西区みなとみらい1-1', // 結合された住所文字列（不要な空白を除去）
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

<a id="hasPrefectureName"></a>

### `hasPrefectureName(address)`

- 引数:
  - `address` (string) — 判定対象の住所文字列。

- 戻り値:
  - `boolean` — 住所の先頭が47都道府県の正式名称なら `true`、それ以外は `false`。

- 動作:
  - `北海道`、`東京都`、`京都府`、`大阪府`、および `○○県` を含む、47都道府県の正式名称だけを許可します。
  - 都道府県名が住所の途中にある場合、略称の場合、先頭に半角・全角を問わず空白がある場合は `false` です。
  - `null`、`undefined`、数値など文字列以外の値は `false` です。

```js
hasPrefectureName('東京都千代田区千代田1-1'); // true
hasPrefectureName('北海道札幌市中央区北一条'); // true
hasPrefectureName('千代田区東京都千代田1-1'); // false
hasPrefectureName('東京千代田区千代田1-1'); // false
hasPrefectureName(' 東京都千代田区千代田1-1'); // false
```

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

<a id="registerZipCodeAddressHandler"></a>

### `registerZipCodeAddressHandler(options)`

アプリ初期化時に一度登録します。住所の地区判定など、業務固有処理は含めません。既存の `getAddressByZipCode` を検索 API として使用します。

<a id="handler-options"></a>

#### 設定オブジェクト

| キー                   | 型・既定値                                                                 | 契約                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `zipCodeField`         | string、必須                                                               | 郵便番号／デジタルアドレスのフィールドコード                                                         |
| `mainAddressField`     | string、必須                                                               | 空欄補完の判定対象。`addressFields` の割り当て先に含める                                             |
| `addressFields`        | object、必須                                                               | `{ 検索結果のプロパティ名: Kintoneフィールドコード }`。同一フィールドへの重複割り当ては禁止          |
| `clearFields`          | string[]、`[]`                                                             | 置換時に空文字にする追加の関連フィールド。割り当て先も自動でクリア対象となる                         |
| `zipErrorMessages`     | object、必須                                                               | 郵便番号・検索・必須結果検証エラーを保持する既存オブジェクト                                         |
| `addressErrorMessages` | object、必須                                                               | 住所割り当て・全角変換・後続処理エラーを保持する既存オブジェクト                                     |
| `devices`              | `'desktop' \| 'mobile' \| 'both'`、`'desktop'`                             | 登録する画面。PC/モバイルの record API は実際のイベントから選択する                                  |
| `watchFields`          | string[]、`[]`                                                             | 郵便番号以外に表示更新を監視するフィールド。これらの変更では検索しない                               |
| `canApply`             | `({ record, source, busy }) => boolean`、常に true                         | 検索・反映の業務上の許可条件。開始時と結果到着時に最新レコードで評価                                 |
| `button`               | object、省略可                                                             | `{ spaceField, id, text?, visible? }`。`text` は完全なボタンラベル（既定「郵便番号から住所を取得」） |
| `guidance`             | object、省略可                                                             | `{ spaceField, id, text?, visible? }`。省略時は案内自体を作成しない                                  |
| `transformAddress`     | `(value, { fieldCode, property, result }) => string`、そのまま返す         | 任意の同期住所変換。全角変換・文字数検証等を実施できる。失敗は throw する                            |
| `afterApply`           | `({ record, result, source, isCurrent }) => void \| Promise<void>`、省略可 | 住所反映後だけ実行。地区判定等をアプリ側で実施する。完了まで `apply()` は待つ                        |

対象は通常の文字列フィールドです（サブテーブル・配列型は非対応）。郵便番号フィールドを住所割り当て先やクリア対象に含めてはいけません。設定不正は登録時に例外、フィールドの欠落・値型不正は処理時にエラーとなります。`addressFields` のプロパティ名は `getAddressByZipCode` の公開結果から選びます。メイン住所の検索結果値は空でない文字列が必須です。

フィールドが存在し、`type` が `SINGLE_LINE_TEXT` または `MULTI_LINE_TEXT` の場合、`value === undefined` は Kintone の空欄として許容し、検証・メイン住所の空欄判定では `''` と同じ扱いにします。関連住所・クリア対象にも適用します。空欄判定だけでレコード値を書き換えることはなく、検索・変換失敗時や住所保持時には元の値を維持します。フィールド欠落、null、数値・配列・オブジェクトなどの不正な値、文字列フィールド型を確認できない `undefined` は引き続きエラーです。

`visible` のシグネチャは `({ record, source, busy }) => boolean`。描画時の `source` は `'display'`、ボタン操作の再検証時は `'button'` です。既定の表示条件は郵便番号が空でないことです。`canApply` の `source` は `'change'` または `'button'`。条件関数は同期・副作用なしとしてください。`busy` は処理中の表示情報であり、条件に `!busy` を使うとボタン操作自体が不許可になるため、二重押下対策には利用しないでください（ライブラリで disabled を制御します）。

<a id="handler-application"></a>

#### 反映ルール

| 操作                       | 郵便番号             | 住所                                                                           |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| 作成・編集の画面表示       | 検索も整形もしない   | ボタン・案内の表示だけ更新                                                     |
| 通常郵便番号の入力変更     | 検索成功後に整形     | メイン住所が空文字の場合だけ存在する結果を補完。既存住所・関連欄は保持         |
| デジタルアドレスの入力変更 | API の郵便番号に置換 | 既存住所にかかわらず全割り当て先＋`clearFields` をクリアして存在する結果を反映 |
| ボタン操作／`apply()`      | 検索成功後に整形     | 利用者による明示的な置換。デジタルアドレスと同じクリア・反映                   |
| 空の郵便番号への変更       | 検索しない           | 住所を保持し、古い検索を無効化                                                 |
| `watchFields` の変更       | 検索しない           | 表示だけ更新                                                                   |

デジタルアドレスの判定は **`normalizedZipCode !== apiZipCode`** のみです。英字の有無では判定しません。

検索・変換をすべて検証してから一括でレコード値を設定します。必須 API 項目は `zip_code`（7文字の半角大文字英数字）、`pref_name` / `city_name`（空白除去後も空でない文字列）、`town_name`（文字列、API による空文字は許可）です。検索結果には正しい `normalizedZipCode`、`apiZipCode`、`zipCode`、空でない `address` / `prefName` / `cityName` が必要です。

`other_name`、`biz_name`、`block_name`、`business_name` は欠落・null を許容します。存在する場合は文字列が必要です。任意結果がない場合、通常の補完では既存の関連欄を保持し、置換ではクリアしたままになります。必須項目不正や全角変換失敗では、郵便番号を含むレコード値を変更しません（エラー情報だけを設定します）。

非同期結果は、開始時の**入力値そのもの**と現在の郵便番号が一致する場合だけ適用します。別の変更・検索、次の作成編集画面表示、`dispose()` でも古い処理を無効化するため、値が A → B → A と戻っても古い A の結果は適用されません。結果到着時に許可条件とメイン住所の空欄状態を再確認します。通常検索の待機中に住所が入力された場合は、郵便番号だけ整形します。通信自体はキャンセルしません。

<a id="handler-promises"></a>

#### 戻り値と Promise

```js
{
  apply(),     // 明示的な住所置換。Promise<Outcome>
  whenIdle(),  // 最新検索と進行中のボタン操作の完了を待つ。Promise<Outcome>
  refresh(),   // 現在レコードで表示だけ更新。void
  dispose(),   // イベント解除、生成要素削除、進行中結果を無効化。void
}
```

`Outcome` は次のいずれかです。

- `{ status: 'applied', result }` — 住所を反映し後続処理も完了
- `{ status: 'formatted', result }` — 郵便番号だけ整形、住所は保持
- `{ status: 'skipped' }` — 空入力・条件不成立・未表示・解除済み
- `{ status: 'stale' }` — 古い検索結果を破棄
- `{ status: 'error', error: string }` — エラーを記録し処理完了

ボタン処理中の `apply()` は進行中のボタン Promise を返し、二重検索を起こしません。失敗時も disabled を解除します。DOM のクリックイベントは Promise を待たないため、ライブラリ内部で検索・後続処理の例外を処理し、エラーマップとフィールドの `error`、`console.error` に記録します。呼び出し元は reject ではなく `status` を確認します。

Kintone のフィールド変更イベントでは Promise を返せず、ハンドラ内で `record.get/set` もできません。この API はイベントを同期的に返し、イベント終了後に最新レコードを取得・設定します。保存イベントは登録せず、`event.error` は設定しません。各アプリで両エラーマップと `whenIdle()` を確認し、保存を待つ／止める方針を決めてください。保存完了後の非同期更新を避けるには、保存成功・画面離脱時に `dispose()` し、再表示時に必要なら再登録してください。

成功した対象のエラーは `null` にします。変更していない住所欄や他のフィールドのエラーは消しません。エラーマップは既存の全角変換ハンドラと同様に `{ フィールドコード: エラー文字列 | null }` 形式です。複数の処理が同じエントリを所有する場合の競合管理はアプリ側で行ってください。

`afterApply` 開始時点で住所はすでに反映済みです。後続処理の失敗はメイン住所に記録し、住所反映は巻き戻しません。渡す `record` はスナップショットで、変更しても自動保存しません。非同期の業務処理がレコードを更新する場合は、`isCurrent()` で確認し、最新レコードを取り直して必要な業務フィールドだけ更新してください。

<a id="handler-example"></a>

#### 登録例

```js
const zipErrors = {};
const addressErrors = {};
const addressHandler = registerZipCodeAddressHandler({
	zipCodeField: '郵便番号',
	mainAddressField: '住所',
	addressFields: {
		address: '住所',
		otherName: '建物名',
		bizName: '事業所名',
	},
	clearFields: ['住所補足'],
	devices: 'both',
	watchFields: ['処理状況'],
	zipErrorMessages: zipErrors,
	addressErrorMessages: addressErrors,
	canApply: ({ record }) => record.処理状況.value !== '完了',
	button: {
		spaceField: '住所設定スペース',
		id: 'address-set-button',
		text: '郵便番号から住所を再設定',
		visible: ({ record }) => Boolean(record.郵便番号.value) && record.処理状況.value !== '完了',
	},
	guidance: {
		spaceField: '住所案内スペース',
		id: 'address-guidance',
		text: 'デジタルアドレスも入力できます。\n住所の再設定はボタンを押してください。',
		visible: ({ record }) => record.処理状況.value !== '完了',
	},
	// text-suite.js を読み込んでいるアプリで、必要な場合だけ指定する。
	transformAddress: (value) => toFullWidth(value, true),
	afterApply: async ({ result, isCurrent }) => {
		const district = await lookupDistrict(result.address); // アプリ固有の処理
		if (!isCurrent()) return;
		// アプリ自身のPC/モバイル判定ヘルパーを使い、最新レコードの地区欄だけ更新する。
		updateDistrictField(district);
	},
});
// アプリ独自のボタンからも完了を待てる。
// const outcome = await addressHandler.apply();
```

<a id="removed-apis"></a>

#### 案内文と旧 API の削除

案内文は `textContent` と `white-space: pre-line` で描画し、既定の2行の文言・改行表示を維持します。`text` に HTML が含まれても実行せず文字列として表示します。任意 HTML 文字列の指定には対応しません。リッチな案内が必要なら、アプリ側で信頼済み DOM を別途構築してください。表示制御は生成した要素だけを削除・追加し、共有スペースの親要素を隠しません。ボタンは `kintoneplugin-button-normal` クラスを維持します。外観を合わせるには [51-modern-default.css](https://js.kacsw.or.jp/51-modern-default.css) をアプリに適用してください。

2026年10月11日、利用元アプリでの参照削除と `registerZipCodeAddressHandler` への統合完了の報告を受け、旧 `kintoneZipSetSpaceFieldButton` と `kintoneZipSpaceFieldText` を削除しました。本体、window/CommonJS 公開、一括公開リスト、旧関数専用のスペース・画面判定ヘルパーとテストを削除しています。旧名への呼び出しは利用できません。`getAddressByZipCode` は検索 API として引き続き利用できます。

同日、利用元で未使用と確認された `initZipCodeAddressUtilsRuntime` と `resetZipCodeAddressUtilsRuntime` も削除しました。郵便番号ライブラリのランタイム初期化・リセットは不要です。登録対象は `devices`、PC/モバイルの record API はイベント種別で決まります。他のライブラリのランタイム初期化関数には変更ありません。

古いカスタマイズを再利用する場合は、住所対応表・クリア対象・エラーマップ・ボタンと案内の表示条件を登録設定に移し、地区判定等は `afterApply` で実施してください。旧関数を呼ぶコードや旧検索変更ハンドラを残さず、上記の登録例を使用します。このリポジトリには業務アプリのコードは含まれないため、公開後の確認は各アプリの作成・編集、PC/モバイル画面で行ってください。

検証コマンド:

```bash
node -r ./test/setup-tests.js test/test-zip-code-address-handler.js
node -r ./test/setup-tests.js test/test-zip-code-address-utils.js
```

---

<a id="examples"></a>

### 実例

#### Node / テスト環境

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

if (!zc.hasPrefectureName('東京都千代田区千代田1-1')) {
	console.error('住所の先頭に都道府県名を入力してください');
}
```

#### ブラウザ / kintone 環境

```html
<script src="src/zip-code-address-utils.js"></script>
<script>
	// window 上に関数が公開されています
	window.formatZipCode('1234567', function (res) {
		console.log(res);
	});

	if (!window.hasPrefectureName(event.record.住所.value)) {
		event.error = '住所の先頭に都道府県名を入力してください。';
	}

	// 住所設定・ボタン・案内表示は registerZipCodeAddressHandler の登録例を参照してください。
</script>
```

---

## 制約・注意事項

<a id="notes"></a>

### 注意事項 / エッジケース

- 入力はまず全角→半角・記号除去・大文字化されます。正規化後は必ず `^[0-9A-Z]{7}$` の形式で API に問い合わせられます。
- API レスポンスが複数件返ってきた場合はエラー（複数見つかりました）扱いになります。実装は単一ヒットを期待しています。
- `registerZipCodeAddressHandler` は kintone のイベント・record API と DOM に依存します。テストではこれらのスタブを用意し、PC・モバイルのイベント種別で対応する record API を利用することを確認してください。ランタイム初期化は不要です。
- ネットワークや API の異常 JSON に対しては安全に `error` オブジェクトを返すよう実装されています。

---

<a id="references"></a>

### 参照

- 実装ソース: `src/zip-code-address-utils.js`

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                    | 記録・配布確認                                         |
| ---------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12） |
| 未設定     | 2025-10-29 | 現ファイル名での最古の登録（ファイル名変更）                | `651dead`。初版作成日・配布日は未確認                  |
| 未設定     | 2026-10-05 | 住所検索時の不要なZIP API再リクエストを回避                 | `7b1da89`。配布確認は未確認                            |
| 未設定     | 2026-10-11 | 移行済みの旧kintone郵便番号ボタン・案内APIを削除            | `1d2a27b`。配布確認は未確認                            |
| 未設定     | 2026-10-11 | 未使用のZIP実行時APIを削除し、API仕様書を整理               | `502864f`。配布確認は未確認                            |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
