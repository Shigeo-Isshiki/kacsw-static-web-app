````markdown
# shipping-processing 使い方リファレンス

このドキュメントは `src/shipping-processing.js` が公開する配送関連ユーティリティ関数の使い方、引数・戻り値・副作用をまとめたリファレンスです。

---

## 概要

`src/shipping-processing.js` は運送会社の伝票番号チェック、荷物問い合わせボタン生成、及び発送日の営業日計算（国民の祝日判定を含む）など、配送に関する共通処理を提供します。

主に次を提供します:

- 伝票番号の正規化・妥当性検証 (`validateTrackingNumber`)
- kintone のスペースフィールドへ「荷物問い合わせ」ボタンを追加するユーティリティ (`kintoneShippingInquiryButton`)
- 営業日（平日・祝日・年末年始除く）に基づいた発送可能日を算出する関数 (`getNextBusinessDay`)

ブラウザと Node の両方で利用できるように設計されており、ブラウザ環境ではファイル末尾で `window` に関数を公開します。テストコードでは `global.window = global` を設定して利用しています。

---

## 公開 API サマリ

- `getNextBusinessDay(baseDate, cutoffHour, callback)`
- `kintoneShippingInquiryButton(spaceField, id, label, trackingNumber, carrier)`
- `validateTrackingNumber(trackingNumber, minLength, maxLength)`

（`getNextBusinessDay` はコールバック形式、`kintoneShippingInquiryButton` は DOM 操作を行い副作用を伴います。`validateTrackingNumber` は同期関数で、入力不正時は例外を投げます。）

---

## 各関数の詳細

### `validateTrackingNumber(trackingNumber, minLength = 10, maxLength = 14)`

- 概要: 与えられた伝票番号文字列を半角数字のみの形式に変換し、桁数や許容文字だけで構成されているかを検査します。日本の主要運送会社（ヤマト運輸 / 日本郵便 / 佐川急便）で広く使われる 10〜14 桁程度を想定した検証を行います。
- 引数:
  - `trackingNumber` (string) — チェック対象の伝票番号。全角数字・ハイフン・空白などを許容して内部で正規化します。
  - `minLength` (number, optional) — 最小桁数（デフォルト 10）。
  - `maxLength` (number, optional) — 最大桁数（デフォルト 14）。
- 戻り値: `string` — 半角数字のみの伝票番号（ハイフン・空白削除）
- 例外: 引数の型不正、許容外文字の混入、桁数制約違反などの場合に `Error` を投げます。

動作メモ:

- 全角数字は半角に変換され、全角ハイフンや各種ダッシュ類は半角ハイフンに統一されます。
- ハイフンや空白以外の記号（アルファベットや記号）が含まれる場合は例外を投げます。

使用例:

```js
validateTrackingNumber('１２３－４５６－７８９０'); // -> '1234567890'
validateTrackingNumber('123-45 67890', 10, 14); // -> '1234567890'
```

テストヒント:

- 全角数字 + ハイフンの混在を含む正常系。
- アルファベットや記号混入でエラーになること。
- `minLength` / `maxLength` の境界値テスト。

---

### `getNextBusinessDay(baseDate = new Date(), cutoffHour = 16, callback)`

- 概要: 指定日時から発送可能な次の営業日（YYYY-MM-DD 形式）を非同期に求めてコールバックに渡します。土日・国民の祝日・年末年始（12/29〜1/4）を営業日から除外します。`cutoffHour` 以降の場合は翌営業日が返されます。
- 引数:
  - `baseDate` (Date|string, optional) — 基準日時。Date オブジェクト、またはパース可能な日付文字列を受け付けます。省略時は現在日時。
  - `cutoffHour` (number, optional) — 当日の締め時刻（0〜23）。省略時は 16。
  - `callback` (function(businessDayString)) — single-arg コールバック。結果は `'YYYY-MM-DD'` 形式の文字列。
- 戻り値: なし（コールバックで結果を返す）
- 例外: `callback` が関数でない、`baseDate` が不正な場合などは `Error` を投げます。

動作メモ:

- 国民の祝日判定には外部 API (`https://api.national-holidays.jp/<YYYY-MM-DD>`) を利用します。API が 404 を返す場合は祝日でないと判断します。
- ネットワークエラーや API 異常時はフェールソフトで祝日扱いにせず営業日として扱います（安全側の判定）。

使用例:

```js
getNextBusinessDay(new Date('2025-11-12T10:00:00'), 16, (d) => console.log(d)); // -> '2025-11-12'
getNextBusinessDay('2025-11-12', 16, (d) => console.log(d));
```

テストヒント:

- `fetch` をモックして API の応答 404 / success / ネットワークエラーをシミュレートし、祝日判定の分岐を検証してください。
- 土日、年末年始（12/29〜1/4）、祝日の連続するケースで正しく翌営業日に進むかを確認してください。

---

### `kintoneShippingInquiryButton(spaceField, id, label, trackingNumber, carrier)`

- 概要: kintone のスペースフィールドに「荷物問い合わせ」ボタンを追加します。`label` に `null` または空文字を渡すとボタンを非表示（親要素を非表示）にできます。ボタン押下時は指定の運送会社の追跡ページを新しいウィンドウで開きます。
- 引数:
  - `spaceField` (string) — kintone のスペースフィールドコード（`kintone.app.record.getSpaceElement` に渡す値）。必須。
  - `id` (string) — 生成するボタン要素の ID。必須。
  - `label` (string|undefined|null) — ボタンラベル。
    - 文字列: 指定ラベルで表示
    - `undefined`: デフォルト文言 `'荷物問い合わせ'` を使用
    - `null` / 空文字: ボタン非表示（スペース親を非表示にする）
  - `trackingNumber` (string) — 問い合わせ伝票番号（必須であれば表示）
  - `carrier` (`'yamato'|'japanpost'|'sagawa'`) — 運送会社識別子（`'yamato'` = ヤマト運輸、`'japanpost'` = 日本郵便、`'sagawa'` = 佐川急便）。URL テンプレートは内部定義により生成されます。
- 戻り値: なし（DOM への副作用）
- 例外: 引数の型が想定外の場合、早期に何もしない実装です（例外は投げません）。

動作メモ:

- 既に同じ `id` の要素が存在する場合はそれを削除してから新しいボタンを追加します。
- URL テンプレートは内部の `_SP_SHIPPING_INQUIRY_URL_MAP` に定義されています。
- ボタンが追加できない（`getSpaceElement` が `null` を返す）場合は何もしません。

使用例:

```js
kintoneShippingInquiryButton('space_shipping', 'trackBtn', undefined, '1234567890', 'yamato');
```

テストヒント:

- `document.createElement` / `kintone.app.record.getSpaceElement` をスタブして、ボタンの `id`、`textContent` 設定、およびクリック時に `window.open` が正しい URL を受け取ることを確認してください。
- `label === null` の場合に親要素が `display: none` になる振る舞いを確認してください。

---

## 既知の内部設定／定数

- ` _SP_HOLIDAY_API_BASE_URL` — 祝日判定に使う API のベース URL。
- `_SP_SHIPPING_INQUIRY_URL_MAP` — 運送会社ごとの問い合わせ URL テンプレート（`yamato` = ヤマト運輸 / `japanpost` = 日本郵便 / `sagawa` = 佐川急便）。

---

## 例

```js
// 伝票番号の検証
try {
  const tn = validateTrackingNumber('１２３－４５６－７８９０');
  // tn === '1234567890'
} catch (err) {
  console.error('伝票番号が不正:', err.message);
}

// 営業日の取得
getNextBusinessDay(new Date(), 16, (d) => console.log('発送可能日:', d));

// kintone でボタンを追加
kintoneShippingInquiryButton('space1', 'trackBtn', undefined, '1234567890', 'japanpost');
```

---

## テスト／検証のヒント

- `validateTrackingNumber` の境界、全角/半角、ハイフン・空白の扱いを網羅する。
- `getNextBusinessDay` は外部 API に依存するため、テストでは `fetch` をスタブして挙動を決定論的にする。
- `kintoneShippingInquiryButton` は DOM と kintone API をスタブして副作用（ボタン追加、親の display 値、window.open 呼び出し）を検証する。

---

必要であれば、このドキュメントに `URL` テンプレート一覧（`_SP_SHIPPING_INQUIRY_URL_MAP` の実際のテンプレート）や、祝日 API のレート制限・失敗時の挙動詳細を追記できます。どの部分を詳述しますか？

````
