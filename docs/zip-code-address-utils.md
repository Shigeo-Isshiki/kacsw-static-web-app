# zip-code-address-utils 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.2.1** です。FormBridgeの入力検証エラーをフィールドに表示し、コンソールログだけを抑制します。2026-11-01に1.2.1の通常配布URLとの一致を確認しました。同日、1.2.0で複数住所欄の `replaceOnZipCodeChange: true` を有効にした検索・補完・置換・入力／保存欄同期の実画面動作確認が完了し、問題なく動作したとの利用者報告を受領しました。配布の証跡は[通常配布確認記録](verification/library-distribution.md#追加確認zip-code-address-utils-121)、確認範囲は[利用側確認報告](verification/library-distribution.md#formbridge-consumer-verification-2026-11-01)を参照してください。1.2.1の変更は実画面未検証です。

このドキュメントは `src/zip-code-address-utils.js` が公開する郵便番号／デジタルアドレス関連ユーティリティ関数の使い方と引数・戻り値の契約を整理したリファレンスです。テストや Node 環境でも `require('../src/zip-code-address-utils.js')` で利用できます（CommonJS エクスポートあり）。

---

<a id="overview"></a>

`src/zip-code-address-utils.js` は以下の用途を想定したヘルパー群です。

- 入力（全角数字・英字、ハイフン、空白を含む）を正規化して API に問い合わせる
- 郵便番号／デジタルアドレスの存在確認・表示用フォーマット作成
- API 応答を整形して住所や都道府県・市区町村だけを取り出す
- kintone の住所自動補完・明示的な置換・ボタンと案内表示を登録するユーティリティ
- FormBridge新バージョンの郵便番号変更に住所補完・置換と入力／保存欄の同期を登録するユーティリティ

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

ブラウザでは各関数を `window` に公開し、NodeではCommonJSエクスポートも提供します。検索には郵便番号APIへの通信が必要です。kintoneでは `kintone.proxy`、その他のブラウザでは `fetch` を使用します。`registerZipCodeAddressHandler` はkintoneのイベント・record APIとDOM専用であり、FormBridgeから利用しません。

FormBridge専用ハンドラーは次の順で読み込みます。

1. [formbridge-custom-lib.js](formbridge-custom-lib.md) **1.0.1以上**（現行1.1.0）
2. `zip-code-address-utils.js` **1.1.0以上**
3. [text-suite.js](text-suite.md)（全角変換を使う場合。下記例では必要）
4. 利用フォームの登録スクリプト

登録スクリプトは初期読み込み時に実行し、`form.show` 内で登録しないでください。`formBridge.events.on` が必要ですが、登録時には `formBridge.fn` を参照しません。各 `.show` 後に利用可能になる `fn` は共通基盤のresolver経由で呼び出し時に解決します。グローバル `const formBridge` のみで `window.formBridge` がない環境にも対応します。

`replaceOnZipCodeChange` を使用する場合は `zip-code-address-utils.js` **1.2.0以上**が必要です。

## 公開関数の目次

<a id="public-api"></a>

### kintone の住所設定・表示制御

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `registerZipCodeAddressHandler(options)` | 郵便番号変更時の住所割り当て・置換とボタン・案内表示を登録する。 | [参照](#registerZipCodeAddressHandler) |

`registerZipCodeAddressHandler` の登録対象は `devices` で指定します。実際に使用する PC/モバイルの record API は Kintone のイベント種別から選択するため、ランタイム初期化、`KACSW_RUNTIME`、URL による画面判定は不要です。

### FormBridge の住所設定

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `registerFormBridgeZipCodeAddressHandler(options)` | 郵便番号変更後の非同期住所補完・置換と入力／保存欄の同期を登録する。 | [参照](#registerFormBridgeZipCodeAddressHandler) |

### 共通（kintone・FormBridge・Node）

#### 郵便番号の存在確認・整形・正規化

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `checkZipCodeExists(zipCode, callback)` | 郵便番号の存在を確認して結果をコールバックに返す。 | [参照](#checkZipCodeExists) |
| `formatZipCode(zipCode, callback)` | 郵便番号を表示用に整形して結果をコールバックに返す。 | [参照](#formatZipCode) |
| `normalizeZipCode(zipCode, callback)` | 郵便番号を7文字の半角英数字に正規化して結果を返す。 | [参照](#normalizeZipCode) |

#### 住所・市区町村・都道府県の検索

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `getAddressByZipCode(zipCode, callback)` | 郵便番号から詳細な住所情報を検索する。 | [参照](#getAddressByZipCode) |
| `getCityByZipCode(zipCode, callback)` | 郵便番号から市区町村名を検索する。 | [参照](#getCityByZipCode) |
| `getPrefectureByZipCode(zipCode, callback)` | 郵便番号から都道府県名を検索する。 | [参照](#getPrefectureByZipCode) |

#### 住所文字列の検証

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `hasPrefectureName(address)` | 住所が都道府県の正式名称で始まるかを判定する。 | [参照](#hasPrefectureName) |

---

## 関数リファレンス

<a id="api-details"></a>

**注意**: 検索 API は非同期コールバック型です。kintone登録 API の `apply()` / `whenIdle()`、FormBridge登録 API の `whenIdle()` は観測用のPromiseです。FormBridgeイベントや送信を待機させません。

### 共通（kintone・FormBridge・Node）

<a id="checkZipCodeExists"></a>

#### `checkZipCodeExists(zipCode, callback)`

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

#### `formatZipCode(zipCode, callback)`

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

#### `getAddressByZipCode(zipCode, callback)`

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

#### `getCityByZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — `(cityName|null) => void`

- 動作/戻り値:
  - 成功: 市区町村名（`string`）を返す。
  - 見つからない / エラー: `null` を返す。

---

<a id="getPrefectureByZipCode"></a>

#### `getPrefectureByZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — `(prefName|null) => void`

- 動作/戻り値:
  - 成功: 都道府県名（`string`）を返す。
  - 見つからない / エラー: `null` を返す。

---

<a id="hasPrefectureName"></a>

#### `hasPrefectureName(address)`

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

#### `normalizeZipCode(zipCode, callback)`

- 引数:
  - `zipCode` (string|number)
  - `callback` (function) — `(result) => void`

- 動作:
  - 入力を正規化して API に問い合わせ、存在確認を行います。

- `result` の形:
  - 成功: `{ zipCode: '1234567' }`（正規化済み7文字）
  - 失敗: `{ error: '郵便番号が存在しません' }` や `{ error: 'API接続エラー' }`

---

### kintone 向け

<a id="registerZipCodeAddressHandler"></a>

#### `registerZipCodeAddressHandler(options)`

アプリ初期化時に一度登録します。住所の地区判定など、業務固有処理は含めません。既存の `getAddressByZipCode` を検索 API として使用します。

<a id="handler-options"></a>

##### 設定オブジェクト

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

##### 反映ルール

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

##### 戻り値と Promise

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

##### 登録例

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

##### 案内文と旧 API の削除

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

### FormBridge 向け

<a id="registerFormBridgeZipCodeAddressHandler"></a>

#### `registerFormBridgeZipCodeAddressHandler(options)`

新バージョンFormBridgeの通常文字列フィールド専用です。郵便番号の変更イベントは同期的に終了し、既存の `getAddressByZipCode` で非同期検索した結果をフィールドAPIから反映します。利用側の業務処理、送信キャンセル・再送信は実装しません。

##### 設定

| キー | 型・既定値 | 契約 |
| --- | --- | --- |
| `zipCodeInputField` | string、必須 | 郵便番号の入力フィールド |
| `zipCodeSavedField` | string、必須 | 郵便番号の保存フィールド。同一コードも可 |
| `mainAddressField` | string、必須 | 補完の可否を判定する住所入力欄。`addressFields` の割り当て先に含める |
| `addressFields` | object、必須 | `{ 検索結果プロパティ: 住所入力コード }`。割り当て先は一意 |
| `fieldMappings` | object、`{}` | `{ 住所入力コード: 保存コード }`。検索時と手入力変更時に保存欄も設定 |
| `clearFields` | string[]、`[]` | 置換時にクリアする追加の入力欄／関連欄。その保存欄も自動でクリア |
| `replaceOnZipCodeChange` | boolean、`false`（1.2.0追加） | `true` の場合、空でない保存済み郵便番号が検索結果の郵便番号と異なると住所を置換。真偽値以外は登録時にエラー |
| `transformAddress` | function、値をそのまま返す | `(value, { fieldCode, property, result? }) => string`。同期・副作用なしの変換 |
| `afterApply` | function、省略可 | `({ result, record, isCurrent }) => void`。住所反映後のみ実行する同期コールバック |

`addressFields` のキーは `address` / `prefName` / `cityName` / `townName` / `blockName` / `otherName` / `bizName` / `businessName` です。メイン住所に対応する検索結果は空でない文字列が必須です。汎用の割り当て設定はできますが、ライブラリが会社名のフィールドや `bizName` / `businessName` の優先順位を推測することはありません。

`fieldMappings` の入力側は `addressFields` の割り当て先または `clearFields` に含めます。保存側は一意で、入力側のどのコードとも重複させません。同一欄で保存する住所は対応表への指定不要です。郵便番号欄を住所・保存・クリア対象と重複させることは禁止します。未知のオプション、空コード、重複割り当て等は登録時に例外とします。コード名や `_input` の規則は推測しません。

実行時は必要なフィールドの存在と文字列値を検証します。FormBridgeの未入力 `null` は空文字相当として扱います。欠落・`undefined`・数値・配列等はエラーです。空白だけの住所は既存住所として保持します（空欄判定は `null` または `''`）。

検索時は変換済み住所を入力・保存の両欄へ直接設定します。`setFieldValue()` は変更イベントを発火しないため、別の文字変換ハンドラーの発火に依存しません。対応表の入力欄を手入力した場合も `event.value` から同期変換して保存欄だけを更新し、入力欄自体は書き換えません。手入力の空値（`null` / `undefined` / `''`）は変換せず保存欄を空にします。手入力の変換時は `result` がなく、クリア専用欄では `property` もありません。同じ欄の保存処理を他のハンドラーと二重登録しないでください。

##### 反映とエラー

| 操作 | 郵便番号入力・保存欄 | 住所 |
| --- | --- | --- |
| `form.show` | 検索・整形しない | 変更しない。前画面の検索を無効化 |
| 通常郵便番号の変更（設定省略／`false`） | 成功後に両欄を整形 | 応答時点でメイン住所が空の場合のみ補完。既存住所なら全住所・関連欄を保持 |
| 通常郵便番号の変更（`true`、保存済み番号が空でなく異なる） | 成功後に両欄を整形 | デジタルアドレスと同じ処理で住所・関連欄・保存欄を置換 |
| 通常郵便番号の変更（`true`、保存済み番号が同じ／空） | 成功後に両欄を整形 | メイン住所が空の場合のみ補完。既存住所・関連欄は保持 |
| デジタルアドレスの変更 | 成功後にAPI郵便番号へ置換 | 全割り当て先・`clearFields` と対応する保存欄をクリアする計画を作り、存在する検索結果で置換 |
| 空の郵便番号への変更 | 保存欄だけ空にする | 検索せず住所保持。先行検索を無効化 |
| 入力途中・形式不正（正規化後7文字の英数字でない） | 変更しない | 検索せず住所保持。入力欄に検証エラーを表示し、先行検索を無効化。コンソールログなし |
| 検索・変換・必須項目の検証失敗 | 値を変更しない | 値を変更しない。エラーを表示 |

デジタル判定はkintone同様 **`normalizedZipCode !== apiZipCode`** であり、英字の有無ではありません。任意結果の欠落・nullは通常補完では既存欄を保持し、置換では空になります。正規化後に空となる記号・空白だけの郵便番号も空入力とします。

1.2.1では、入力途中（1〜6文字）・桁超過・不正文字などの文字列入力の検証エラーは、通常動作として入力欄に表示し `status: 'error'` を返しますが、`console.error` は出しません。追加設定は不要です。既存の全角英数字・ハイフン・空白等の正規化後に判断し、7文字の英数字なら通常郵便番号・デジタルアドレスとも検索します。入力途中・形式不正では郵便番号の保存欄も住所も保持し、先行検索を無効化します。空入力は従来どおり保存郵便番号だけ消去し、入力エラーを解除します。検索可能な入力への変更時も前回の入力エラーを解除します。1.2.0から変更するのは入力検証エラーのコンソール記録であり、フィールド表示・戻り値のエラー状態は維持します。デバウンスや入力確定時の検証は追加しません。

`replaceOnZipCodeChange: true` の比較は、応答到着後・検索結果を書き込む前の `zipCodeSavedField` の値を既存処理で正規化し、`result.apiZipCode` と比較します。全角・ハイフン・空白等の表記差では置換しません。保存欄の `null`・空文字・正規化後の空値では置換しません。検索開始時点で住所を消さず、置換時のクリア・変換・保存欄同期・`afterApply` はデジタルアドレスと共用します。省略／`false` は1.1.0の動作を維持します。

入力と保存に同じ郵便番号コードを使う場合、入力変更によって比較元の値も変わり、以前の保存済み番号を参照できない場合があります。この設定で保存済み番号との比較を行う場合は、入力欄と保存欄を別コードにし、検索成功前に別ハンドラーで保存欄を上書きしないでください。

検索結果の必須項目と全割り当て先の変換結果（文字列）を検証してから設定APIを呼び出すため、検索・変換失敗による部分消去を防ぎます。検索時のメイン住所は変換後も空白だけ・空文字を許可しません（意図しない住所消去を防ぐFormBridge版の追加検証）。ただしFormBridgeには一括更新トランザクションがなく、**設定APIが途中で失敗した場合や `afterApply` が失敗した場合、反映済みの値はロールバックしません**。設定失敗を成功扱いにはしません。

検索／変換エラーと非同期中のAPI例外は `console.error` へ記録し、郵便番号入力欄または該当住所欄に `setFieldValueError` で表示して `status: 'error'` とします。表示API自体の失敗もログに残します。手入力の変換失敗は保存値を保持し入力欄へエラーを表示します。イベント引数不正、表示前の処理、手入力時の設定APIの例外は同期的に呼び出し元へ伝播します。

ログ抑制は利用者の郵便番号文字列入力の検証だけに適用します。非文字列のイベント値、必須フィールド欠落、API・変換・後続処理の例外は従来どおり異常として扱い、ログを抑制しません。入力途中でも必要なAPI・フィールドは検証し、検証メッセージの表示／解除APIが失敗した場合もログに残します。

`afterApply` は住所補完・置換後のみ呼びます（通常郵便番号で住所保持した場合は呼びません）。`result` には `bizName` / `businessName` を含む検索結果全体、`record` には反映後のレコードを渡します。検索結果を使った追加転記はこのコールバック内で利用側がコード・優先順位を明示し、共通基盤の `setFieldValue` で入力／保存欄を両方設定できます。戻り値のPromiseはエラーです。同期コールバックでも実行済みの副作用は取り消せません。

##### 非同期・戻り値

- 変更後の郵便番号は `event.value` だけから取得します。変更前を返すことがある `getRecord()` の郵便番号値で代用しません。
- 登録ごとの世代番号で最新変更だけを反映します。空入力、A→B→A、再表示、`confirm.show` / `finish.show`、`dispose()` でも先行結果を無効化します。通信自体はキャンセルしません。
- 複数の住所欄は各1回、別々のコードで登録します。同一入力欄への重複登録や外部スクリプトによる郵便番号のプログラム変更は自動追跡しません（APIによる変更はイベントが発火しないため）。
- 戻り値は `{ whenIdle, dispose }`。`whenIdle()` は呼び出し時点の最新処理の `Promise<Outcome>`、`dispose()` はイベント登録を残してコールバックを無効化する同期関数です。公式にないイベント解除APIには依存しません。
- `Outcome` は `{ status: 'applied' | 'formatted', result }`、`{ status: 'skipped' | 'stale' }`、または `{ status: 'error', error: string }`。`afterApply` の `isCurrent()` でその検索世代が現在も有効か確認できます。

**FormBridgeは非同期ハンドラーの完了を待ちません。戻り値をPromiseにした場合や `async` 関数でも同様です。** 本ハンドラーは同期終了し、`whenIdle()` もフォーム送信や次のイベントを待機させません。**検索中に送信すると住所反映前のデータが送信される可能性があります。** 送信キャンセル・再送信・送信待機保証は対象外であり、必要になった場合は別要件です。

入力エラーの表示は、送信時の入力完成チェック・送信阻止を保証しません。入力途中・形式不正では以前の保存郵便番号・住所を保持するため、その状態で送信すると入力欄と保存欄が一致しない可能性があります。送信時検証・キャンセル・待機は今回の変更に含めません。

kintone版との差分は、置換ボタン・`apply()`・DOM表示・業務条件判定を設けず郵便番号変更だけで補完／置換すること、保存用の別コードを明示すること、FormBridgeの `null` 空値を扱うこと、空郵便番号では古い保存用郵便番号も空にすることです。kintoneのイベント・レコードAPIは利用せず、既存kintone版の動作は変更しません。

<a id="formbridge-example"></a>

##### 複数の住所欄を登録する例

以下のフィールドコードは説明用の架空の名前です。実際のフォームに合わせて、入力欄と保存欄の対応を明示してください。2組目は追加の住所欄を置換時にクリアする例です。
2組目では `replaceOnZipCodeChange: true` を指定し、通常郵便番号が保存済み番号と異なる場合の置換も有効にしています。1組目は設定を省略して既存住所を保持します。
1.2.1では、既存設定のまま入力途中・形式不正のフィールドエラー表示を維持し、コンソールログだけを抑制します。

```js
const primaryAddressHandler = registerFormBridgeZipCodeAddressHandler({
	zipCodeInputField: 'Primary_postal_entry',
	zipCodeSavedField: 'Primary_postal_value',
	mainAddressField: 'Primary_line_1_entry',
	addressFields: {
		address: 'Primary_line_1_entry',
		otherName: 'Primary_line_2_entry',
	},
	fieldMappings: {
		Primary_line_1_entry: 'Primary_line_1_value',
		Primary_line_2_entry: 'Primary_line_2_value',
	},
	transformAddress: (value) => value === '' ? '' : toFullWidth(value, false),
});

const secondaryAddressHandler = registerFormBridgeZipCodeAddressHandler({
	zipCodeInputField: 'Secondary_postal_entry',
	zipCodeSavedField: 'Secondary_postal_value',
	mainAddressField: 'Secondary_line_1_entry',
	addressFields: {
		address: 'Secondary_line_1_entry',
		otherName: 'Secondary_line_2_entry',
	},
	fieldMappings: {
		Secondary_line_1_entry: 'Secondary_line_1_value',
		Secondary_line_2_entry: 'Secondary_line_2_value',
		Secondary_line_3_entry: 'Secondary_line_3_value',
	},
	clearFields: ['Secondary_line_3_entry'],
	replaceOnZipCodeChange: true,
	transformAddress: (value) => value === '' ? '' : toFullWidth(value, false),
});
```

郵便番号・住所の同期処理を重複して登録しないでください。業務固有の追加転記はこの例に含めていません。

## 制約・注意事項

<a id="notes"></a>

### 注意事項 / エッジケース

- 入力はまず全角→半角・記号除去・大文字化されます。正規化後は必ず `^[0-9A-Z]{7}$` の形式で API に問い合わせられます。
- API レスポンスが複数件返ってきた場合はエラー（複数見つかりました）扱いになります。実装は単一ヒットを期待しています。
- `registerZipCodeAddressHandler` は kintone のイベント・record API と DOM に依存します。テストではこれらのスタブを用意し、PC・モバイルのイベント種別で対応する record API を利用することを確認してください。ランタイム初期化は不要です。
- ネットワークや API の異常 JSON に対しては安全に `error` オブジェクトを返すよう実装されています。
- FormBridge向けは新バージョン専用・通常文字列フィールドのみ。導入した検索・補完・置換・入力／保存欄同期について実画面確認完了の利用者報告を受領しています。全API・全異常系、権限／環境別の通信許可（CORS）、確認画面／送信・キャッシュ更新の網羅確認は未報告です。送信待機は保証しません。
- 公式仕様とモック単体テストの確認範囲、コマンド結果・未確認事項は[FormBridge住所ハンドラー検証記録](verification/zip-code-address-utils.md)を参照してください。

---

<a id="references"></a>

### 参照

- 実装ソース: `src/zip-code-address-utils.js`
- [FormBridge新バージョンJavaScriptカスタマイズ公式仕様](https://formbridge.kintoneapp.com/help/customize/v2)

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                    | 記録・配布確認                                         |
| ---------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 1.2.1      | 2026-11-01 | FormBridgeの入力検証エラーはフィールド表示を維持し、コンソールログだけ抑制。追加設定なし・kintone版は維持 | `6b0717e`。通常配布URLとの完全一致・対象コミットのCI・デプロイ・パッケージ作成成功を確認。[配布記録](verification/library-distribution.md#追加確認zip-code-address-utils-121)。今回変更の実画面は未検証 |
| 1.2.0      | 2026-11-01 | `replaceOnZipCodeChange` を追加。既定の住所保持動作とkintone版は維持 | `9cfdc21`。通常配布URLとの完全一致・対象コミットのCI・デプロイ・パッケージ作成成功を確認。[配布記録](verification/library-distribution.md#追加確認zip-code-address-utils-120)。導入機能の[実画面確認完了報告](verification/library-distribution.md#formbridge-consumer-verification-2026-11-01)を利用者から受領 |
| 1.1.0      | 2026-10-31 | FormBridge専用住所ハンドラー・入力／保存欄同期・世代管理を追加。kintone版は維持 | `cbdfc88`。通常配布URLとの完全一致・対象コミットのCI・デプロイ・パッケージ作成成功を確認。[配布記録](verification/library-distribution.md#追加確認zip-code-address-utils-110)。実FormBridgeは未検証 |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12） |
| 未設定     | 2025-10-29 | 現ファイル名での最古の登録（ファイル名変更）                | `651dead`。初版作成日・配布日は未確認                  |
| 未設定     | 2026-10-05 | 住所検索時の不要なZIP API再リクエストを回避                 | `7b1da89`。配布確認は未確認                            |
| 未設定     | 2026-10-11 | 移行済みの旧kintone郵便番号ボタン・案内APIを削除            | `1d2a27b`。配布確認は未確認                            |
| 未設定     | 2026-10-11 | 未使用のZIP実行時APIを削除し、API仕様書を整理               | `502864f`。配布確認は未確認                            |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
