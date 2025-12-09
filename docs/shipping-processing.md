```markdown
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
```
