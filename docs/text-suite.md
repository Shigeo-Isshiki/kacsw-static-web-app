````markdown
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

---

## 公開 API サマリ

- `isSingleByteAlnumOnly(str)` — 半角英数字・記号・スペースのみで構成されているか判定
- `toFullWidthKatakana(str, [throwOnError=true])` — 可能な限り全角カタカナに変換
- `toFullWidthHiragana(str, [throwOnError=true])` — 可能な限り全角ひらがなに変換
- `toHalfWidthKana(str, [throwOnError=true])` — 可能な限り半角カタカナに変換
- `toFullWidth(str, [throwOnError=true])` — 文字列中の半角英数字・記号等を全角に変換
- `toHalfWidth(str, [throwOnError=true])` — 文字列中の全角英数字・記号等を半角に変換
- `assertEmailAddress(emailAddress)` — 半角に正規化し、簡易 RFC5322 相当の形式チェックを行う（正常時は小文字化した文字列を返す、異常時は例外）

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

---

## テストと運用ヒント

- 重要な境界値: 半角⇄全角の混在、長音符（`ー`）や波ダッシュ等の記号、合成濁点／半濁点（゛/゜ の結合処理）を含む入力を検証してください。
- `throwOnError=false` のケースでどのように非変換文字が残るかを確認するテストを用意すると堅牢です。
- `assertEmailAddress` は簡易検証であり、厳密な RFC 準拠が必要な用途には専用ライブラリの利用を検討してください。

### 長音符・波ダッシュに関する注意

ライブラリは全角長音符 `ー`（U+30FC）と半角長音符 `ｰ`（U+FF70）を変換テーブルに登録していますが、波ダッシュ（U+301C / U+FF5E など）や他のハイフン類はハイフン正規化の対象として `_TS_HYPHEN_REGEX` でまとめて扱われます。必要であれば追加のコードポイントを変換テーブルに加えることで一元的な正規化が可能です。

---

必要ならば関数ごとの戻り値の詳細（例: どのエラー文字列が返るか、throwOnError=false 時の正確な挙動）や内部変換テーブル（`_TS_CONVERT_CHARACTER_LIST`）の解説を追記します。どのレベルの詳細が欲しいですか？
