# national-holidays 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.0.0** です。

このドキュメントは [src/national-holidays.js](../src/national-holidays.js) が公開する祝日ユーティリティ関数群の使い方と引数・戻り値の契約を整理したリファレンスです。

> **重要**: このファイルの祝日判定ロジックは、kintoneでの利用を容易にするため、以下のファイルにも組み込まれています。
> 祝日定義を変更する際は、すべてのファイルを更新してください。
>
> - [src/bank-transfer.js](../src/bank-transfer.js) (プレフィックス: `_bt_nh_`)
> - [src/shipping-processing.js](../src/shipping-processing.js) (プレフィックス: `_sp_nh_`)

---

[ src/national-holidays.js ](../src/national-holidays.js) は「国民の祝日に関する法律（昭和23年法律第178号）」に基づいた祝日判定・取得ユーティリティです。固定日・可変日（第n月曜日）・天文計算（春分・秋分）を統一された定義配列で管理し、**振替休日** と **国民の休日** にも対応します。次の機能を提供します。

- 指定日が祝日かどうかを判定
- 祝日名の取得
- 指定年の祝日一覧の取得
- 振替休日・国民の休日の自動計算

ブラウザのグローバル公開とCommonJSに対応しています。公開方式は次章を参照してください。

---

## 読み込み・依存関係

- ソース：[src/national-holidays.js](../src/national-holidays.js)
- 配布URL：https://js.kacsw.or.jp/national-holidays.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。

ブラウザでは `isNationalHoliday` / `getNationalHolidayNameByLaw` / `getNationalHolidaysInYear` を `window` に公開します。Nodeでは `require("../src/national-holidays.js")` のCommonJSエクスポートを利用できます。祝日判定はローカルロジックで、外部APIへの通信はありません。

## 公開関数の目次

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `isNationalHoliday(date)` | 指定日が祝日かどうかを判定する。 | [参照](#isNationalHoliday) |
| `getNationalHolidayNameByLaw(date)` | 指定日の祝日名を返す。祝日でない場合は `null`。 | [参照](#getNationalHolidayNameByLaw) |
| `getNationalHolidaysInYear(year)` | 指定年の祝日を日付と名称の配列で返す。 | [参照](#getNationalHolidaysInYear) |

---

## 関数リファレンス

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

### 実例

#### Node.js での利用

```js
const nh = require('../src/national-holidays.js');

nh.isNationalHoliday('2025-01-01');
nh.getNationalHolidayNameByLaw('2025-09-15');
nh.getNationalHolidaysInYear(2025);
```

---

## 制約・注意事項

### 祝日定義の範囲

- 祝日法施行日: 1948年7月20日
- 実際に祝日が適用される年: 1949年以降
- 祝日定義は [src/national-holidays.js](../src/national-holidays.js) 内の `_NH_HOLIDAYS` で一元管理
- 春分・秋分は年代別係数に基づく近似計算で算出（国立天文台の公開式に準拠）
- 振替休日は 1973 年から適用（2006 年まで：翌日、2007 年以降：連続対応）
- 国民の休日は 1985 年から適用
- 特例移動（2019〜2021 年の皇位継承・五輪対応）を含む

---

### 注意事項 / 既知の制限

- 官報告示の最終結果と一致しない年があった場合は係数や特例定義の更新が必要です。
- 春分・秋分の日は近似式に基づく計算であり、**最終的な根拠は官報告示**です。
- 入力日付文字列は `YYYY-MM-DD` 形式のみを受け付けます。

---

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                    | 記録・配布確認                                          |
| ---------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12）  |
| 未設定     | 2026-02-23 | 振替休日・国民の休日に対応する祝日ユーティリティを追加      | `61f111b`。配布確認は未確認                             |
| 未設定     | 2026-02-23 | 祝日判定を外部APIからローカルロジックへ統一                 | `e233745`。配布確認は未確認                             |
| 未設定     | 2026-02-27 | 祝日変更時の対応方法を仕様書に追記                          | `6479d39`（本仕様書の変更）。配布内容の変更確認とは区別 |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
