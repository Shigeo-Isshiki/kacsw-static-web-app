# text-suite 使い方リファレンス

`src/text-suite.js` は文字列変換・正規化に関するユーティリティ群を提供します。主に日本語の全角⇄半角変換、かなの相互変換（ひらがな⇄カタカナ、全角⇄半角カナ）、メールアドレスの簡易検証など、kintone カスタマイズやフォーム入力の正規化に便利な関数を収録しています。

---

## 概要

提供される主要関数は同期的で、ブラウザと Node 双方で利用可能です。ブラウザではファイル末尾で `window` に安全に公開されます（既存グローバルを上書きしない実装）。

主な機能:

- 全角／半角変換（英数字・記号・スペース）
- ひらがな ⇄ 全角カタカナ変換
- 全角カタカナ ⇄ 半角カタカナ変換（濁点・半濁点を考慮）
- 長音符やハイフン類の正規化（ライブラリ内で扱う記号群）
- メールアドレスの半角化と簡易検証
- 文字種の簡易チェック（半角英数字のみか等）
- kintone フィールド変更イベントへの全角変換ハンドラ登録

---

## 公開 API サマリ

- `isSingleByteAlnumOnly(str)` — 半角英数字・記号・スペースのみで構成されているか判定
- `toFullWidthKatakana(str, [throwOnError=true])` — 可能な限り全角カタカナに変換
- `toFullWidthHiragana(str, [throwOnError=true])` — 可能な限り全角ひらがなに変換
- `toHalfWidthKana(str, [throwOnError=true])` — 可能な限り半角カタカナに変換
- `toFullWidth(str, [throwOnError=true])` — 文字列中の半角英数字・記号等を全角に変換
- `toHalfWidth(str, [throwOnError=true])` — 文字列中の全角英数字・記号等を半角に変換
- `assertEmailAddress(emailAddress)` — 半角に正規化し、簡易 RFC5322 相当の形式チェックを行う（正常時は小文字化した文字列を返す、異常時は例外）
- `registerFullWidthHandler(fieldCode, [options])` — kintone の追加・編集画面のフィールド変更イベントに全角変換ハンドラを登録する
- `registerFullWidthHiraganaHandler(fieldCode, [options])` — kintone の追加・編集画面のフィールド変更イベントに全角ひらがな変換ハンドラを登録する

各関数は引数に不正な型や変換不能な文字が含まれている場合、デフォルトで例外を投げます（`throwOnError=false` を使える関数では例外を抑止して非変換文字をそのまま残す挙動も可能）。

---

## 関数の詳細

### `isSingleByteAlnumOnly(str)`

- 引数: `str` (string)
- 戻り値: `boolean` — 半角 ASCII のみなら `true`
- ユースケース: 入力が半角英数字のみであることを保証したい場合の簡易チェック

### `toFullWidthKatakana(str, throwOnError = true)`

- 概要: ひらがな・半角カナ・一部合成濁点を全角カタカナへ変換します
- 例外: 全角カタカナ以外の文字が残る場合は `Error` を投げます（`throwOnError` で制御）

### `toFullWidthHiragana(str, throwOnError = true)`

- 概要: 半角カナ→全角カナ→ひらがな の順で変換し、最終的にひらがな以外が残ると例外を投げます
- 補足: 長音符（`ー` / U+30FC）は許容されます（長音を含むフリガナ等を扱う用途に配慮）

### `toHalfWidthKana(str, throwOnError = true)`

- 概要: ひらがな→全角カタカナ→半角カナ の順で変換します。濁点/半濁点の合成処理やスペースの正規化を行います。

### `toFullWidth` / `toHalfWidth`

- 概要: 英数字・記号・スペースの全角／半角変換を行います。チルダやバックスラッシュ・円記号等、一部の記号は例外的に対応します（例: `\\` -> `￥`、`~` -> `～`）。

### `assertEmailAddress(emailAddress)`

- 概要: 入力を半角に正規化し、簡易的に RFC5322 相当の形式で検証します。正常時は小文字化して返します。
- 例外: 不正な形式の場合は `Error` を投げます。

### `registerFullWidthHandler(fieldCode, options = {})`

kintone 標準の `kintone.events.on` を使い、指定フィールドの変更イベントに全角変換ハンドラを登録します。処理は `text-suite.js` 内で完結しており、`kintone-custom-lib.js` には依存しません。

- 引数: `fieldCode` (string) — 対象フィールドコード（空文字不可）
- 引数: `options` (object, 省略可)
- 戻り値: `void`
- 例外: 引数・オプションが不正な場合、または `kintone.events.on` が利用できない場合は登録時に `Error` を投げます

#### options

| オプション              | 型                                    | 既定値                                                | 説明                                                                                             |
| ----------------------- | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `throwOnError`          | boolean                               | `false`                                               | `toFullWidth(value, throwOnError)` にそのまま渡します                                            |
| `removeWhitespace`      | boolean                               | `false`                                               | `true` の場合、全角変換後に `/[\s\u3000]+/g` で空白文字をすべて削除します（trim ではありません） |
| `maxLength`             | number \| null                        | `null`                                                | 変換・空白除去後の `.length` による上限。`null` は無制限。正の整数以外は登録時にエラー           |
| `maxLengthErrorMessage` | string                                | `全角変換後、{maxLength}文字以内で入力してください。` | 文字数超過時のエラーメッセージ                                                                   |
| `devices`               | `'desktop'` \| `'mobile'` \| `'both'` | `'desktop'`                                           | 登録対象のデバイス                                                                               |
| `errorMessages`         | object                                | なし                                                  | 既存のエラーマップ。オブジェクト自体は差し替えず `errorMessages[fieldCode]` のみ更新します       |

#### 登録されるイベント

- `desktop`: `app.record.create.change.{fieldCode}` / `app.record.edit.change.{fieldCode}`
- `mobile`: `mobile.app.record.create.change.{fieldCode}` / `mobile.app.record.edit.change.{fieldCode}`
- `both`: 上記すべて

#### ハンドラの挙動

1. 対象フィールドがイベントレコードに無い場合は、何もせずイベントを返します。
2. 処理開始時に `record[fieldCode].error` と（指定時）`errorMessages[fieldCode]` をクリアします。
3. 値が `null` / `undefined` / 空文字の場合は変換せずエラーなしでイベントを返します。
4. `toFullWidth(value, throwOnError)` → 空白除去（`removeWhitespace` 時） → 文字数検証（`maxLength` 時）の順に処理します。
5. すべて成功した場合のみ `record[fieldCode].value` に変換後の値を設定します。
6. 変換例外または文字数超過の場合は、元の値を維持したまま `record[fieldCode].error` と（指定時）`errorMessages[fieldCode]` にメッセージを設定します。
7. エラー後の次の変更で成功すれば、エラー状態は解除されます。

住所欄のように「全角変換したうえで文字数を制限したい」ケースは、専用ハンドラを作らず `maxLength` オプションで対応できます。

### `registerFullWidthHiraganaHandler(fieldCode, options = {})`

`registerFullWidthHandler` と同じイベント登録方式・オプション契約で、対象フィールドを `toFullWidthHiragana` により正規化します。追加・編集画面に登録し、`devices` で PC・モバイルを選択できます。変換エラーや文字数超過時はフィールド値を維持してフィールドエラーを設定します。

#### options

| オプション              | 型                                    | 既定値                                                | 説明                                                                                             |
| ----------------------- | ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `throwOnError`          | boolean                               | `false`                                               | `toFullWidthHiragana(value, throwOnError)` に渡します                                            |
| `removeWhitespace`      | boolean                               | `false`                                               | `true` の場合、ひらがな変換後に `/[\s\u3000]+/g` で空白文字をすべて削除します（trim ではありません） |
| `maxLength`             | number \| null                        | `null`                                                | 変換・空白除去後の `.length` による上限。`null` は無制限。正の整数以外は登録時にエラー           |
| `maxLengthErrorMessage` | string                                | `全角変換後、{maxLength}文字以内で入力してください。` | 文字数超過時のエラーメッセージ                                                                   |
| `devices`               | `'desktop'` \| `'mobile'` \| `'both'` | `'desktop'`                                           | 登録対象のデバイス                                                                               |
| `errorMessages`         | object                                | なし                                                  | 既存のエラーマップ。該当フィールドの値のみ更新します                                             |

文字数制限は `maxLength` を指定した場合にのみ適用されます。変換成功時・空値時はフィールドエラーと `errorMessages[fieldCode]` がクリアされます。

---

## 例

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
// kintone カスタマイズJSでの利用例
const fullWidthHandlerErrorMessage = {};

// 氏名: 変換不能文字があればエラーにし、PC・モバイル両方へ登録
registerFullWidthHandler(F.LAST_NAME, {
	throwOnError: true,
	devices: 'both',
	errorMessages: fullWidthHandlerErrorMessage,
});

// 住所: 空白を除去したうえで20文字以内に制限
registerFullWidthHandler(F.ADDRESS, {
	maxLength: 20,
	maxLengthErrorMessage: '住所は20文字以内で入力してください。',
	removeWhitespace: true,
	errorMessages: fullWidthHandlerErrorMessage,
});

// フリガナ: ひらがなへ変換し、空白を除去。PC・モバイル両方へ登録
registerFullWidthHiraganaHandler(F.FURIGANA, {
	removeWhitespace: true,
	devices: 'both',
	errorMessages: fullWidthHandlerErrorMessage,
});
```

---

## テストと運用ヒント

- 重要な境界値: 半角⇄全角の混在、長音符（`ー`）や波ダッシュ等の記号、合成濁点／半濁点（゛/゜ の結合処理）を含む入力を検証してください。
- `throwOnError=false` のケースでどのように非変換文字が残るかを確認するテストを用意すると堅牢です。
- `assertEmailAddress` は簡易検証であり、厳密な RFC 準拠が必要な用途には専用ライブラリの利用を検討してください。
- `registerFullWidthHandler` のテストでは `kintone.events.on` をスタブ化し、登録されたイベント名と、スタブ経由で取得したハンドラへ渡す擬似イベントオブジェクトの変化を検証します。

### 長音符・波ダッシュに関する注意

ライブラリは全角長音符 `ー`（U+30FC）と半角長音符 `ｰ`（U+FF70）を変換テーブルに登録していますが、波ダッシュ（U+301C / U+FF5E など）や他のハイフン類はハイフン正規化の対象として `_TS_HYPHEN_REGEX` でまとめて扱われます。必要であれば追加のコードポイントを変換テーブルに加えることで一元的な正規化が可能です。

---

必要ならば関数ごとの戻り値の詳細（例: どのエラー文字列が返るか、throwOnError=false 時の正確な挙動）や内部変換テーブル（`_TS_CONVERT_CHARACTER_LIST`）の解説を追記します。どのレベルの詳細が欲しいですか？
