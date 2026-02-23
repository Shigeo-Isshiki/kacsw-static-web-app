# national-holidays 使い方リファレンス

このドキュメントは [src/national-holidays.js](src/national-holidays.js) が公開する祝日ユーティリティ関数群の使い方と引数・戻り値の契約を整理したリファレンスです。

> **重要**: このファイルの祝日判定ロジックは、kintoneでの利用を容易にするため、以下のファイルにも組み込まれています。
> 祝日定義を変更する際は、すべてのファイルを更新してください。
>
> - [src/bank-transfer.js](../src/bank-transfer.js) (プレフィックス: `_bt_nh_`)
> - [src/shipping-processing.js](../src/shipping-processing.js) (プレフィックス: `_sp_nh_`)

---

## 目次

- 概要
- 公開 API サマリ
- 各関数の引数詳細
  - [`isNationalHoliday(date)`](#isNationalHoliday)
  - [`getNationalHolidayNameByLaw(date)`](#getNationalHolidayNameByLaw)
  - [`getNationalHolidaysInYear(year)`](#getNationalHolidaysInYear)
- 祝日定義の範囲
- 注意事項 / 既知の制限
- 実例

---

## 概要

[ src/national-holidays.js ](src/national-holidays.js) は「国民の祝日に関する法律（昭和23年法律第178号）」に基づいた祝日判定・取得ユーティリティです。固定日・可変日（第n月曜日）・天文計算（春分・秋分）を統一された定義配列で管理し、**振替休日** と **国民の休日** にも対応します。次の機能を提供します。

- 指定日が祝日かどうかを判定
- 祝日名の取得
- 指定年の祝日一覧の取得
- 振替休日・国民の休日の自動計算

本モジュールは CommonJS 形式で `module.exports` を提供しています。ブラウザでのグローバル公開は行っていないため、ブラウザ利用が必要な場合は別途バンドルや公開処理が必要です。

---

## 公開 API サマリ

- `isNationalHoliday(date) -> boolean` — 指定日が祝日なら `true`
- `getNationalHolidayNameByLaw(date) -> string | null` — 祝日名または `null`
- `getNationalHolidaysInYear(year) -> Array<{ date: string, name: string }>` — 年内の祝日配列

---

## 各関数の引数詳細

<a id="isNationalHoliday"></a>

### `isNationalHoliday(date)`

概要:

- 指定日が祝日かどうかを判定します。

引数:

- `date` (Date | string) — `Date` オブジェクト、または `YYYY-MM-DD` 形式の文字列

戻り値:

- `boolean` — 祝日なら `true`、祝日でなければ `false`

例:

```js
isNationalHoliday('2025-01-01'); // true
isNationalHoliday(new Date(2025, 0, 2)); // false
```

---

<a id="getNationalHolidayNameByLaw"></a>

### `getNationalHolidayNameByLaw(date)`

概要:

- 指定日の祝日名を取得します。祝日でなければ `null` を返します。

引数:

- `date` (Date | string) — `Date` オブジェクト、または `YYYY-MM-DD` 形式の文字列

戻り値:

- `string | null` — 祝日名（例: `"元日"`）または `null`

例外:

- 形式不正の入力は `Error` を投げます（例: `"2025/01/01"`）。

例:

```js
getNationalHolidayNameByLaw('2025-01-01'); // '元日'
getNationalHolidayNameByLaw('2025-01-02'); // null
```

---

<a id="getNationalHolidaysInYear"></a>

### `getNationalHolidaysInYear(year)`

概要:

- 指定年の全祝日を日付昇順で返します。

引数:

- `year` (number) — 西暦年（整数）

戻り値:

- `Array<{ date: string, name: string }>` — `YYYY-MM-DD` 形式の配列

例外:

- 1949年未満の年、または整数以外は `Error` を投げます。

例:

```js
getNationalHolidaysInYear(2024);
// -> [{ date: '2024-01-01', name: '元日' }, ...]
```

---

## 祝日定義の範囲

- 祝日法施行日: 1948年7月20日
- 実際に祝日が適用される年: 1949年以降
- 祝日定義は [src/national-holidays.js](src/national-holidays.js) 内の `_NH_HOLIDAYS` で一元管理
- 春分・秋分は年代別係数に基づく近似計算で算出（国立天文台の公開式に準拠）
- 振替休日は 1973 年から適用（2006 年まで：翌日、2007 年以降：連続対応）
- 国民の休日は 1985 年から適用
- 特例移動（2019〜2021 年の皇位継承・五輪対応）を含む

---

## 注意事項 / 既知の制限

- 官報告示の最終結果と一致しない年があった場合は係数や特例定義の更新が必要です。
- 春分・秋分の日は近似式に基づく計算であり、**最終的な根拠は官報告示**です。
- 入力日付文字列は `YYYY-MM-DD` 形式のみを受け付けます。

---

## 実例

### Node.js での利用

```js
const nh = require('../src/national-holidays.js');

nh.isNationalHoliday('2025-01-01');
nh.getNationalHolidayNameByLaw('2025-09-15');
nh.getNationalHolidaysInYear(2025);
```

---

必要に応じて以下も拡張できます:

- 官報告示データの取り込み
- 未来の特例移動や法改正への追随
- 祝日種別の区分出力（祝日名に加えて種別ラベルの付与）
