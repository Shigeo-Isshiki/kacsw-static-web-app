# text-suite 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.2.0** です。1.2.0ではFormBridge用通常フィールド・サブテーブルの文字変換ハンドラを追加しました。配布ファイルと対象ソースの一致を確認済みです。2026-11-01に、導入した全角・ひらがな変換の実画面動作確認が完了し、問題なく動作したとの利用者報告を受領しました。確認範囲は[利用側確認報告](verification/library-distribution.md#formbridge-consumer-verification-2026-11-01)を参照してください。

`src/text-suite.js` は文字列変換・正規化に関するユーティリティ群を提供します。主に日本語の全角⇄半角変換、かなの相互変換（ひらがな⇄カタカナ、全角⇄半角カナ）、メールアドレスの簡易検証など、kintone カスタマイズやフォーム入力の正規化に便利な関数を収録しています。

---

提供される主要関数は同期的です。ブラウザでは各関数を `window` に公開します。Nodeでのテスト環境は次章を参照してください。

主な機能:

- 全角／半角変換（英数字・記号・スペース）
- ひらがな ⇄ 全角カタカナ変換
- 全角カタカナ ⇄ 半角カタカナ変換（濁点・半濁点を考慮）
- 長音符やハイフン類の正規化（ライブラリ内で扱う記号群）
- メールアドレスの半角化と簡易検証
- 文字種の簡易チェック（半角英数字のみか等）
- kintone フィールド変更イベントへの全角変換ハンドラ登録
- FormBridge フィールド・サブテーブル変更イベントへの全角・全角ひらがな変換ハンドラ登録

---

## 読み込み・依存関係

- ソース：[src/text-suite.js](../src/text-suite.js)
- 配布URL：https://js.kacsw.or.jp/text-suite.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。
- FormBridge用通常フィールドハンドラは、FormBridge新バージョンAPI用の [formbridge-custom-lib.js](formbridge-custom-lib.md) **1.0.1以上**を、サブテーブルハンドラは **1.1.0以上**を先に読み込み、その後に本ライブラリ、最後に利用側コードの順で読み込んでください。`text-suite.js` は読み込むだけではFormBridge APIを参照せず、各関数を登録するときに `formBridge.events.on` と必要な公開関数を確認します。`formBridge.fn` は変更イベント内で共通ライブラリ関数を呼ぶ時点に解決されます。
- FormBridge APIにはグローバル識別子 `formBridge` を使い、`window.formBridge` への依存・代入はありません。既存のkintone用関数は従来どおりkintone APIのみを登録時に必要とします。

ブラウザでは各関数を `window` に公開します。イベントハンドラー登録には `kintone.events.on` が必要です。登録処理は本ライブラリ内で完結し、kintone-custom-libには依存しません。Nodeのテストでは `window` と、登録APIを検証する場合はkintone APIを用意してください。

## 公開関数の目次

### 変換・検証関数

| 関数名                                          | 機能                                             | リファレンス                       |
| ----------------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| `isSingleByteAlnumOnly(str)`                    | 半角ASCIIのみで構成されているか判定する。        | [参照](#api-issinglebytealnumonly) |
| `toFullWidthKatakana(str, throwOnError = true)` | ひらがな・半角カナなどを全角カタカナに変換する。 | [参照](#api-tofullwidthkatakana)   |
| `toFullWidthHiragana(str, throwOnError = true)` | 入力を全角ひらがなに変換する。                   | [参照](#api-tofullwidthhiragana)   |
| `toHalfWidthKana(str, throwOnError = true)`     | カナを半角カタカナに変換する。                   | [参照](#api-tohalfwidthkana)       |
| `toFullWidth(str, throwOnError = true)`         | 半角英数字・記号などを全角に変換する。           | [参照](#api-tofullwidth)           |
| `toHalfWidth(str, throwOnError = true)`         | 全角英数字・記号などを半角に変換する。           | [参照](#api-tohalfwidth)           |
| `assertEmailAddress(emailAddress)`              | メールアドレスを半角に正規化して形式を検証する。 | [参照](#api-assertemailaddress)    |

入力・例外の扱いは各関数と共通契約を参照してください。`isSingleByteAlnumOnly` は判定値を返し、文字変換関数には変換不能文字に対する例外を制御する `throwOnError` があります。

イベントハンドラの目次はプラットフォームごとに分け、共通機能は全角変換、全角ひらがな変換の順に揃えています。

### kintone用イベントハンドラ登録関数

| 関数名                                                                      | 機能                                                                              | リファレンス                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------- |
| `registerFullWidthHandler(fieldCode, options)`                              | kintoneのフィールド変更時に全角変換ハンドラーを登録する。                         | [参照](#api-registerfullwidthhandler)              |
| `registerTableFullWidthHandler(tableFieldCode, fieldCode, options)`         | kintoneのサブテーブル列の変更時に全角変換ハンドラーを登録する。                   | [参照](#api-registertablefullwidthhandler)         |
| `registerFullWidthHiraganaHandler(fieldCode, options)`                      | kintoneのフィールド変更時に全角ひらがな変換ハンドラーを登録する。                 | [参照](#api-registerfullwidthhiraganahandler)      |
| `registerTableFullWidthHiraganaHandler(tableFieldCode, fieldCode, options)` | kintoneのサブテーブル列の変更時に全角ひらがな変換ハンドラーを登録する。           | [参照](#api-registertablefullwidthhiraganahandler) |
| `registerEmailAddressHandler(fieldCode, options)`                           | kintoneの通常フィールドの変更時にメールアドレス検証・正規化ハンドラーを登録する。 | [参照](#api-registeremailaddresshandler)           |
| `registerTableEmailAddressHandler(tableCode, columnCode, options)`          | kintoneのサブテーブル列の変更時にメールアドレス検証・正規化ハンドラーを登録する。 | [参照](#api-registertableemailaddresshandler)      |

### FormBridge用イベントハンドラ登録関数

| 関数名                                                                                                     | 機能                                                                       | リファレンス                                                 |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `registerFormBridgeFullWidthHandler(inputFieldCode, savedFieldCode, options)`                              | FormBridgeの入力フィールドを全角変換し、保存フィールドへ設定する。         | [参照](#api-registerformbridgefullwidthhandler)              |
| `registerFormBridgeTableFullWidthHandler(tableFieldCode, inputFieldCode, savedFieldCode, options)`         | FormBridgeの入力列を全角変換し、同じ行の保存列へ設定する。                 | [参照](#api-registerformbridgetablefullwidthhandler)         |
| `registerFormBridgeFullWidthHiraganaHandler(inputFieldCode, savedFieldCode, options)`                      | FormBridgeの入力フィールドを全角ひらがな変換し、保存フィールドへ設定する。 | [参照](#api-registerformbridgefullwidthhiraganahandler)      |
| `registerFormBridgeTableFullWidthHiraganaHandler(tableFieldCode, inputFieldCode, savedFieldCode, options)` | FormBridgeの入力列を全角ひらがな変換し、同じ行の保存列へ設定する。         | [参照](#api-registerformbridgetablefullwidthhiraganahandler) |

---

## 関数リファレンス

### 変換・検証関数の詳細

#### 文字変換5関数の共通契約

`toFullWidthKatakana`、`toFullWidthHiragana`、`toHalfWidthKana`、`toFullWidth`、`toHalfWidth` に共通します。

- `str` (string)：変換対象。省略時は空文字列ですが、空文字列は `Error` になります。
- `throwOnError` (boolean)：既定true。falseの場合は変換不能文字を残します。
- 戻り値：変換後の文字列。元の入力値は変更しません。
- エラー：不正な引数型・空文字列はfalse指定でも例外になります。変換不能文字に対する例外の有無を `throwOnError` で指定します。
- 利用例は各関数の説明と、この章末尾の「例」を参照してください。

<a id="api-issinglebytealnumonly"></a>

#### `isSingleByteAlnumOnly(str)`

- 引数: `str` (string)
- 戻り値: `boolean` — 半角 ASCII のみなら `true`
- 未入力・不正型: 省略・空文字列はtrue、文字列以外はfalseです。
- ユースケース: 入力が半角英数字のみであることを保証したい場合の簡易チェック

<a id="api-tofullwidthkatakana"></a>

#### `toFullWidthKatakana(str, throwOnError = true)`

- 概要: ひらがな・半角カナ・一部合成濁点を全角カタカナへ変換します
- 例外: 全角カタカナ以外の文字が残る場合は `Error` を投げます（`throwOnError` で制御）

<a id="api-tofullwidthhiragana"></a>

#### `toFullWidthHiragana(str, throwOnError = true)`

- 概要: 半角カナ→全角カナ→ひらがな の順で変換し、最終的にひらがな以外が残ると例外を投げます
- 補足: 長音符（`ー` / U+30FC）は許容されます（長音を含むフリガナ等を扱う用途に配慮）

<a id="api-tohalfwidthkana"></a>

#### `toHalfWidthKana(str, throwOnError = true)`

- 概要: ひらがな→全角カタカナ→半角カナ の順で変換します。濁点/半濁点の合成処理やスペースの正規化を行います。

<a id="api-tofullwidth"></a>

<a id="api-tohalfwidth"></a>

#### `toFullWidth` / `toHalfWidth`

- 概要: 英数字・記号・スペースの全角／半角変換を行います。チルダやバックスラッシュ・円記号等、一部の記号は例外的に対応します（例: `\\` -> `￥`、`~` -> `～`）。

<a id="api-assertemailaddress"></a>

#### `assertEmailAddress(emailAddress)`

- 概要: 入力を半角に正規化し、簡易的に RFC5322 相当の形式で検証します。正常時は小文字化して返します。
- 引数: `emailAddress` (string)。前後空白を除去して検証します。
- 戻り値: 正規化したメールアドレス（string）。
- 例外: 空文字列・省略・文字列以外・不正な形式の場合は `Error` を投げます。

---

### イベントハンドラ登録関数の詳細

各プラットフォーム向けの関数は、プラットフォーム別に分けて記載します。共通する全角変換、全角ひらがな変換の順序は目次・説明で揃えています。

### kintone用イベントハンドラ

kintone向けのイベントハンドラは、通常フィールド、サブテーブル列の順に説明します。`devices` の既定値は `'desktop'` で、画面表示イベントには登録しません。

<a id="api-registerfullwidthhandler"></a>

#### `registerFullWidthHandler(fieldCode, options = {})`

kintone 標準の `kintone.events.on` を使い、指定フィールドの変更イベントに全角変換ハンドラを登録します。処理は `text-suite.js` 内で完結しており、`kintone-custom-lib.js` には依存しません。

- 引数: `fieldCode` (string) — 対象フィールドコード（空文字不可）
- 引数: `options` (object, 省略可)
- 戻り値: `void`
- 例外: 引数・オプションが不正な場合、または `kintone.events.on` が利用できない場合は登録時に `Error` を投げます

##### options

| オプション              | 型                                    | 既定値                                                | 説明                                                                                             |
| ----------------------- | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `throwOnError`          | boolean                               | `false`                                               | `toFullWidth(value, throwOnError)` にそのまま渡します                                            |
| `removeWhitespace`      | boolean                               | `false`                                               | `true` の場合、全角変換後に `/[\s\u3000]+/g` で空白文字をすべて削除します（trim ではありません） |
| `maxLength`             | number \| null                        | `null`                                                | 変換・空白除去後の `.length` による上限。`null` は無制限。正の整数以外は登録時にエラー           |
| `maxLengthErrorMessage` | string                                | `全角変換後、{maxLength}文字以内で入力してください。` | 文字数超過時のエラーメッセージ                                                                   |
| `devices`               | `'desktop'` \| `'mobile'` \| `'both'` | `'desktop'`                                           | 登録対象のデバイス                                                                               |
| `errorMessages`         | object                                | なし                                                  | 既存のエラーマップ。オブジェクト自体は差し替えず `errorMessages[fieldCode]` のみ更新します       |

##### 登録されるイベント

- `desktop`: `app.record.create.change.{fieldCode}` / `app.record.edit.change.{fieldCode}`
- `mobile`: `mobile.app.record.create.change.{fieldCode}` / `mobile.app.record.edit.change.{fieldCode}`
- `both`: 上記すべて

##### ハンドラの挙動

1. 対象フィールドがイベントレコードに無い場合は、何もせずイベントを返します。
2. 処理開始時に `record[fieldCode].error` と（指定時）`errorMessages[fieldCode]` をクリアします。
3. 値が `null` / `undefined` / 空文字の場合は変換せずエラーなしでイベントを返します。
4. `toFullWidth(value, throwOnError)` → 空白除去（`removeWhitespace` 時） → 文字数検証（`maxLength` 時）の順に処理します。
5. すべて成功した場合のみ `record[fieldCode].value` に変換後の値を設定します。
6. 変換例外または文字数超過の場合は、元の値を維持したまま `record[fieldCode].error` と（指定時）`errorMessages[fieldCode]` にメッセージを設定します。
7. エラー後の次の変更で成功すれば、エラー状態は解除されます。

住所欄のように「全角変換したうえで文字数を制限したい」ケースは、専用ハンドラを作らず `maxLength` オプションで対応できます。

<a id="api-registertablefullwidthhandler"></a>

#### `registerTableFullWidthHandler(tableFieldCode, fieldCode, options = {})`

サブテーブル内の指定列について、変更された行のセルだけを全角に変換します。オプション、既定値、型検証、変換 → 空白除去 → 文字数判定の順序は `registerFullWidthHandler` と同じです。

- `tableFieldCode` はサブテーブルのフィールドコード、`fieldCode` は変換対象列のフィールドコードです。
- 変更行は、まず `event.changes.row.id` とレコード内の行IDで照合します。変更行にIDがない場合は、変更行オブジェクトまたは `row.value` オブジェクトの参照がレコード内の行と一意に一致するときに限り処理します。値の内容だけでは照合しません。一意に特定できないイベントでは値を変更しません。
- 行追加・削除に対応するサブテーブル自体の変更イベントにも登録し、エラーマップから現在存在しない行の情報を除去します。
- エラーマップは `errorMessages[tableFieldCode][rowId][fieldCode]` 形式です。`rowId` はkintoneの行IDです。ID未設定行はセルの `error` を更新しますが、安定した行キーがないためエラーマップには登録しません。対象セルのエラーは成功時・空値時にクリアし、変換失敗・文字数超過時に設定します。

```js
const tableFieldErrorMessages = {};

registerTableFullWidthHandler('Training_content_list', 'Instructor_last_name', {
	throwOnError: true,
	devices: 'both',
	errorMessages: tableFieldErrorMessages,
});
```

<a id="api-registerfullwidthhiraganahandler"></a>

#### `registerFullWidthHiraganaHandler(fieldCode, options = {})`

`registerFullWidthHandler` と同じイベント登録方式・オプション契約で、対象フィールドを `toFullWidthHiragana` により正規化します。追加・編集画面に登録し、`devices` で PC・モバイルを選択できます。変換エラーや文字数超過時はフィールド値を維持してフィールドエラーを設定します。

##### options

| オプション              | 型                                    | 既定値                                                | 説明                                                                                                 |
| ----------------------- | ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `throwOnError`          | boolean                               | `false`                                               | `toFullWidthHiragana(value, throwOnError)` に渡します                                                |
| `removeWhitespace`      | boolean                               | `false`                                               | `true` の場合、ひらがな変換後に `/[\s\u3000]+/g` で空白文字をすべて削除します（trim ではありません） |
| `maxLength`             | number \| null                        | `null`                                                | 変換・空白除去後の `.length` による上限。`null` は無制限。正の整数以外は登録時にエラー               |
| `maxLengthErrorMessage` | string                                | `全角変換後、{maxLength}文字以内で入力してください。` | 文字数超過時のエラーメッセージ                                                                       |
| `devices`               | `'desktop'` \| `'mobile'` \| `'both'` | `'desktop'`                                           | 登録対象のデバイス                                                                                   |
| `errorMessages`         | object                                | なし                                                  | 既存のエラーマップ。該当フィールドの値のみ更新します                                                 |

文字数制限は `maxLength` を指定した場合にのみ適用されます。変換成功時・空値時はフィールドエラーと `errorMessages[fieldCode]` がクリアされます。

<a id="api-registertablefullwidthhiraganahandler"></a>

#### `registerTableFullWidthHiraganaHandler(tableFieldCode, fieldCode, options = {})`

サブテーブル内の指定列について、変更された行のセルだけを全角ひらがなに変換します。オプション、既定値、型検証、変換 → 空白除去 → 文字数判定の順序は `registerFullWidthHiraganaHandler` と同じです。行の特定、登録イベント、行IDによるエラーマップ管理は `registerTableFullWidthHandler` と同じです。

```js
const tableFieldErrorMessages = {};

registerTableFullWidthHiraganaHandler('Member_list', 'Last_name_kana', {
	throwOnError: true,
	removeWhitespace: true,
	errorMessages: tableFieldErrorMessages,
});
```

<a id="api-registeremailaddresshandler"></a>

#### `registerEmailAddressHandler(fieldCode, options = {})`

指定した通常フィールドの追加・編集画面における値変更イベントへ、`assertEmailAddress` による形式検証・半角小文字への正規化を登録します。画面表示イベントには登録しません。

- `fieldCode` は空でない文字列です。
- `options.devices` は `'desktop'` / `'mobile'` / `'both'` を受け付け、既定値は `'desktop'` です。PC・モバイル両方で利用する場合は `devices: 'both'` を指定してください。
- `options.errorMessages` は省略可能な既存エラーマップです。`errorMessages[fieldCode]` を更新します。
- 空値・検証成功時はフィールドエラーとマップの値を `null` にします。失敗時は入力値を維持し、エラーをフィールドとマップの両方に設定します。

##### 任意のドメイン制約（通常版・テーブル版共通）

既存の呼び出しはそのまま利用できます。`domainConstraint` を省略すれば従来どおり基本形式検証・正規化だけを行います。

| オプション                        | 型                                       | 説明                                                                                                                                                                                    |
| --------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domainConstraint.allowedDomains` | string[]                                 | 空でない許可ドメイン配列。`@` を付けず指定します。大文字小文字を区別しない完全一致で、サブドメインは別のドメインとして扱います                                                          |
| `domainConstraint.errorMessage`   | string                                   | 空でない制約違反メッセージ                                                                                                                                                              |
| `domainConstraint.when`           | `(record, emailAddress, row) => boolean` | 任意の同期条件関数。現在のレコードと正規化後のメールアドレスを受け取ります。テーブル版は第3引数に対象行（`id`・`value`）を渡し、通常版は `undefined` を渡します。省略時は常に適用します |
| `watchFields`                     | string[]                                 | 再検証を行う通常フィールドのコード配列。既定は `[]`。通常版は対象メール欄を、テーブル版は対象テーブルの全行を再検証します                                                               |
| `watchColumns`                    | string[]                                 | テーブル版のみ。同じテーブル内の監視列コード配列。既定は `[]`。列変更時に変更行だけを再検証します                                                                                       |

メール形式検証 → 正規化 → 適用条件判定 → ドメイン照合の順に実行します。制約違反時は正規化後の値も書き戻さず、元の入力を維持します。条件が `false` になった場合も基本形式検証は行い、それが成功すれば古いエラーを解除します。空値は従来どおり許容します。

監視対象の変更ではイベント内の現在のレコードを使ってメール欄を再検証します。`devices` に従い追加・編集画面の変更イベントだけを登録し、表示・保存イベントは登録しません。条件関数の例外やboolean以外の戻り値もフィールドとエラーマップのエラーとして表示します。

```js
// 区分に応じて制約を適用する例
registerEmailAddressHandler('Contact_email', {
	devices: 'both',
	errorMessages: emailAddressHandlerErrorMessage,
	watchFields: ['Contact_type'],
	domainConstraint: {
		allowedDomains: ['example.com'],
		when: (record, emailAddress) => record.Contact_type.value === '社内',
		errorMessage: '社内連絡先には @example.com ドメインのメールアドレスを指定してください。',
	},
});

// 常に制約を適用する例
registerEmailAddressHandler('Notification_email', {
	devices: 'both',
	errorMessages: emailAddressHandlerErrorMessage,
	domainConstraint: {
		allowedDomains: ['example.com'],
		errorMessage: '@example.com ドメインのメールアドレスを指定してください。',
	},
});
```

上記のフィールドコード・区分・ドメイン・メッセージは説明用の架空の例です。実際のアプリ設定に置き換えてください。このライブラリは特定アプリの条件やドメインを内部に固定しません。個別アプリの移行や保存時の最終検査はアプリ側で行ってください。

公開時は変更をレビュー・マージして `main` に反映し、Azure Static Web Apps CI/CD のデプロイ成功を確認してください。配信先は `https://js.kacsw.or.jp/text-suite.js` です。アプリでURL読み込みを利用している場合は再読み込み後に新しいオプションの動作を確認し、ファイルアップロードを利用している場合は更新済みJSをアプリへ再アップロードしてアプリを更新してください。

<a id="api-registertableemailaddresshandler"></a>

#### `registerTableEmailAddressHandler(tableCode, columnCode, options = {})`

サブテーブルの指定列について、変更された行だけを `assertEmailAddress` で検証・正規化します。`devices`、`errorMessages`、`domainConstraint` の仕様は通常版と同じで、`devices` の既定値は `'desktop'` です。形式検証・正規化・条件判定・ドメイン照合は通常版と共有しています。

- `watchFields` はテーブル外の通常フィールドを指定します。その変更時は現在のレコードを使い、対象テーブルの全行を再検証します。
- `watchColumns` は同じテーブル内の列を指定します。その変更時は行ID（IDが無い場合は一意なオブジェクト参照）で変更行を特定し、その行だけを再検証します。一意に特定できない場合はセルを変更しません。
- 条件関数は `when(record, normalizedEmailAddress, row)` です。`row.value[columnCode].value` で対象行の条件列を参照できます。メール値の引数は正規化後ですが、レコード・行のメール欄は検証成功まで元の入力値を保持します。
- エラーマップは `errorMessages[tableCode][rowId][columnCode]` 形式です。ID未設定行のエラーはセルだけに設定します。通常フィールドの監視による全行再検証でも行番号をキーにはしません。
- 同じ監視コードの重複は除去します。`watchFields` と `watchColumns` の重複、テーブルコードの監視、対象メール列を `watchFields` に指定する設定は登録時にエラーになります。対象メール列を `watchColumns` に含めても二重登録しません。
- ドメイン制約・監視を省略した既存呼び出しは、従来どおり対象メール列の変更時だけ検証し、テーブル変更時は削除済み行のエラー整理だけを行います。保存イベントは登録しません。

```js
registerTableEmailAddressHandler('Contacts', 'Email_address', {
	devices: 'both',
	errorMessages: emailAddressHandlerErrorMessage,
	watchFields: ['Restrict_email_domain'],
	watchColumns: ['Contact_type'],
	domainConstraint: {
		allowedDomains: ['example.com'],
		when: (record, emailAddress, row) =>
			record.Restrict_email_domain.value === '有効' || row.value.Contact_type.value === '社内',
		errorMessage: '@example.com ドメインのメールアドレスを指定してください。',
	},
});
```

`assertEmailAddress` 自体は基本形式の検証・正規化のみを行い、ドメイン制約は通常版・テーブル版とも明示的に指定した場合だけ適用します。他テーブルの列監視や個別アプリの移行は対象外です。

##### メールハンドラのイベントと移行時の注意

- 通常版・テーブル版とも、対象フィールド（列）の `app.record.create.change.{fieldCode}` / `app.record.edit.change.{fieldCode}` に登録します。モバイル対象の場合は `mobile.` 接頭辞のイベントにも登録します。画面表示イベントには登録しません。
- テーブル版は、行追加・削除時に削除済み行のエラーを除去するため、テーブルコードの追加・編集変更イベントにも登録します。行番号はエラーマップのキーに使いません。ID未設定行は、一意なオブジェクト参照で特定できる場合にセルだけ処理し、エラーマップには登録しません。
- 空値は `null` / `undefined` / 空文字です。空白文字だけの入力は空値扱いせず、`assertEmailAddress` の検証結果に従います。
- 移行時は、従来の基本形式検証・正規化ハンドラとの二重登録を避けてください。既定はPCのみなので、モバイルにも適用する場合は `devices: 'both'` を明示します。保存時の検証や業務固有ルールはこのAPIに含まれないため、必要な処理はアプリ側に残してください。
- kintoneの変更イベントに対応するフィールドが対象です。「リンク（メールアドレス）」フィールドは変更イベント非対応のため、メール欄自体の変更ではこのハンドラは動きません。監視フィールドも変更イベント対応の種類を指定してください。入力時の検証には「文字列（1行）」を使用し、リンクフィールドを維持する場合の保存時検証はアプリ側で対応してください。

---

### FormBridge用イベントハンドラ

以下の関数は [FormBridge新バージョンAPI](https://formbridge.kintoneapp.com/help/customize/v2) の `formBridge.events.on` を使います。FormBridge新バージョン向けの [formbridge-custom-lib.js](formbridge-custom-lib.md) が必要です。`formBridge.fn` の値設定APIはイベント内で共通ライブラリを通じて呼び出します。

#### 共通オプション

4つのハンドラで共通するオプションです。既定値は空白保持・上限なし・厳格でない変換・空欄時の保存欄消去です。

| オプション               | 型             | 既定値                                                | 説明                                                                                                                     |
| ------------------------ | -------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `throwOnError`           | boolean        | `false`                                               | 変換関数へ渡す厳格さ指定です。                                                                                           |
| `removeWhitespace`       | boolean        | `false`                                               | `true` の場合、変換後に `/[\s\u3000]+/g` ですべての空白を削除します。                                                    |
| `maxLength`              | number \| null | `null`                                                | 変換・空白処理後の `.length` による上限です。正の整数または `null` を指定します。                                        |
| `maxLengthErrorMessage`  | string         | `全角変換後、{maxLength}文字以内で入力してください。` | 文字数超過時のエラーメッセージ。指定時は空でない文字列にします。                                                         |
| `clearSavedFieldOnEmpty` | boolean        | `true`                                                | 空欄時に保存欄を消去するかを選びます。`false` の場合は保存欄を保持します。どちらの場合も入力欄の既存エラーを解除します。 |

`null` / `undefined` / `''` は空欄、文字列以外の値は入力エラーです。文字変換・文字数検証の失敗では保存欄を空にして入力欄にエラーを設定します。FormBridgeの値・エラー設定APIの例外は変換エラーにせず、そのまま伝播します。

<a id="api-registerformbridgefullwidthhandler"></a>

#### `registerFormBridgeFullWidthHandler(inputFieldCode, savedFieldCode, options = {})`

通常フィールドの変更時に `form.field.change.{inputFieldCode}` を登録し、イベント引数の `value` を全角変換して保存フィールドへ設定します。入力欄そのものは変更しません。

- 引数のフィールドコードは空白だけではない文字列で、入力と保存には別のコードを指定します。
- 共通オプションと戻り値は前述のとおりです。
- 登録時に `formBridge.events.on` と共通ライブラリの必要関数を検証します。`formBridge.fn` は登録時に要求しません。
- イベントに `value` がない場合は `TypeError` です。不正な入力値型も変換エラーとして入力欄に表示します。

<a id="api-registerformbridgetablefullwidthhandler"></a>

#### `registerFormBridgeTableFullWidthHandler(tableFieldCode, inputFieldCode, savedFieldCode, options = {})`

サブテーブルの入力列変更時に `form.field.change.{tableFieldCode}.{inputFieldCode}` を登録します。公式型定義に従い、イベント引数の `rowIndex`（0始まり）と `value` を使い、変換結果を同じ行の保存列へ設定します。行データから行番号を推測しません。

- `tableFieldCode`、`inputFieldCode`、`savedFieldCode` は空白だけではない文字列です。入力列と保存列は異なるコードにしてください。
- イベントに `value` または `rowIndex` がない場合、`rowIndex` が0以上の安全な整数でない場合は明示的に例外になります。
- セルの値・エラー設定には `formbridge-custom-lib.js` **1.1.0以上**の `setSubtableFieldValue` / `setSubtableFieldValueError` を使います。
- 空欄、変換エラー、空白処理、文字数上限の動作は通常フィールド版と同じです。FormBridge APIによる値設定は変更イベントを再発火しません。

```js
registerFormBridgeTableFullWidthHandler('Items', 'Name_input', 'Name', {
	throwOnError: true,
});
```

<a id="api-registerformbridgefullwidthhiraganahandler"></a>

#### `registerFormBridgeFullWidthHiraganaHandler(inputFieldCode, savedFieldCode, options = {})`

通常フィールド版の全角変換ハンドラと同じイベント・引数・オプション・エラー動作で、`toFullWidthHiragana(value, throwOnError)` による変換を行います。

<a id="api-registerformbridgetablefullwidthhiraganahandler"></a>

#### `registerFormBridgeTableFullWidthHiraganaHandler(tableFieldCode, inputFieldCode, savedFieldCode, options = {})`

サブテーブル版の全角変換ハンドラと同じイベント・行特定・オプション・エラー動作で、`toFullWidthHiragana(value, throwOnError)` による変換を行います。

```js
registerFormBridgeTableFullWidthHiraganaHandler('Members', 'Name_kana_input', 'Name_kana', {
	throwOnError: true,
});
```

登録関数はフィールド変更イベントのみを扱い、初期表示時の値転記、行追加・削除、個別業務条件、サブテーブル以外への一括検証は行いません。

---

### 例

```js
// ブラウザで読み込んだ場合は window に公開されます
isSingleByteAlnumOnly('Hello123'); // -> true
toFullWidth('A~\\'); // -> 'Ａ～￥'
toFullWidthKatakana('ひらがな'); // -> 'ヒラガナ'
toHalfWidthKana('カタカナ'); // -> 'ｶﾀｶﾅ'
toFullWidthHiragana('ｶﾀｶﾅ'); // -> 'かたかな'
assertEmailAddress('ＴＥＳＴ@Example.COM'); // -> 'test@example.com'
```

```js
// kintoneでの汎用的な登録例です。フィールドコードは説明用の例です。
// 実際のアプリのフィールドコードに置き換えてください。
const fullWidthHandlerErrorMessage = {};

// 氏名: 変換不能文字があればエラーにし、PC・モバイル両方へ登録
registerFullWidthHandler('Name', {
	throwOnError: true,
	devices: 'both',
	errorMessages: fullWidthHandlerErrorMessage,
});

// 住所: 空白を除去したうえで20文字以内に制限
registerFullWidthHandler('Address', {
	maxLength: 20,
	maxLengthErrorMessage: '住所は20文字以内で入力してください。',
	removeWhitespace: true,
	errorMessages: fullWidthHandlerErrorMessage,
});

// フリガナ: ひらがなへ変換し、空白を除去。PC・モバイル両方へ登録
registerFullWidthHiraganaHandler('Name_kana', {
	removeWhitespace: true,
	devices: 'both',
	errorMessages: fullWidthHandlerErrorMessage,
});
```

```js
// FormBridgeでの汎用的な登録例です。フィールドコードは説明用の例です。
// 実際のフォームの入力欄・保存欄のコードに置き換えてください。
// 氏名など、変換不能文字をエラーにする例
registerFormBridgeFullWidthHandler('Name_input', 'Name_saved', {
	throwOnError: true,
	clearSavedFieldOnEmpty: true,
});

// 住所など、空白を保持し、変換後の長さを20文字以内に制限する例
registerFormBridgeFullWidthHandler('Address_input', 'Address_saved', {
	throwOnError: false,
	maxLength: 20,
	maxLengthErrorMessage: '住所は20文字以内で入力してください。',
	clearSavedFieldOnEmpty: true,
});

// フリガナなど、ひらがな以外の文字をエラーにする例
registerFormBridgeFullWidthHiraganaHandler('Name_kana_input', 'Name_kana_saved', {
	throwOnError: true,
	clearSavedFieldOnEmpty: true,
});

// 名称など、変換不能文字を許容し、文字数を制限しない例
registerFormBridgeFullWidthHandler('Company_name_input', 'Company_name_saved', {
	throwOnError: false,
	clearSavedFieldOnEmpty: true,
});
```

---

## 制約・注意事項

### 検証・文字変換の制約

`assertEmailAddress` は簡易検証です。厳密なRFC準拠を保証しません。長音符と波ダッシュ・ハイフン類は異なる変換規則を使います。

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

2026-10-31にPR #36をマージし、1.2.0を通常配布しました。対象コミット、CI・デプロイ結果、通常URLとの一致は[1.2.0配布確認記録](verification/library-distribution.md#追加確認text-suite-120)を参照してください。同日、利用者から実画面でのイベント動作・値反映・エラー表示に問題がないとの報告を受けました。

| バージョン | 記録日     | 主な変更                                                                 | 記録・配布確認                                         |
| ---------- | ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| 1.2.0      | 2026-10-31 | FormBridgeサブテーブルの全角・全角ひらがな変換イベントハンドラを追加     | `ec932c0`。通常配布URLとの完全一致を確認（2026-10-31） |
| 1.1.0      | 2026-10-31 | FormBridge通常フィールド用の全角・全角ひらがな変換イベントハンドラを追加 | 1.2.0に含めて配布。実画面の確認範囲は上記報告を参照    |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし              | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12） |
| 未設定     | 2025-10-29 | 現ファイル名での最古の登録（ファイル名変更）                             | `0299cda`。初版作成日・配布日は未確認                  |
| 未設定     | 2026-10-03 | IDのない新規テーブル行の処理を修正                                       | `ee2b5c0`。配布確認は未確認                            |
| 未設定     | 2026-10-04 | メールハンドラーを追加し、テキストハンドラー登録を統一                   | `5cddccf`。配布確認は未確認                            |
| 未設定     | 2026-10-04 | 任意のメールドメイン制約と依存検証を追加                                 | `47aa625`。配布確認は未確認                            |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
