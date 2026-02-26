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

## 祝日の変更があった場合の対応方法

祝日法の改正、新しい祝日の制定、振替休日や特例移動が発生した場合は、以下の手順でソースコードとドキュメントを更新してください。

### 1. `src/national-holidays.js` の `_NH_HOLIDAYS` 配列を更新

祝日定義は `src/national-holidays.js` 内の `_NH_HOLIDAYS` 配列で一元管理されています。変更が必要な場合は、以下のフォーマットに従って定義オブジェクトを追加・修正してください。

**固定日の祝日の例（元日など）**:

```js
{
	name: '祝日名',                 // 祝日の日本語名（例: '元日'）
	type: 'fixed',                 // 固定日の場合は 'fixed'
	month: 1,                      // 月（1-12）
	day: 1,                        // 日（1-31）
	startYear: 1949                // その祝日が制定された年（以降を対象）
}
```

**可変日の祝日の例（成人の日：第2月曜など）**:

```js
{
	name: '成人の日',              // 祝日の日本語名
	type: 'nthWeekday',            // n番目の曜日の場合は 'nthWeekday'
	month: 1,                      // 月
	weekday: 1,                    // 曜日（0=日, 1=月, ..., 6=土）
	n: 2,                          // n番目（第n月曜日の場合は 2）
	startYear: 1966,               // その祝日が制定された年
	endYear: 1999                  // 廃止された場合は終了年を指定（省略可）
}
```

**春分・秋分を含む祝日の例**:

```js
{
	name: '海の日',
	type: 'equinox',               // 春分・秋分の場合は 'equinox'
	month: 3,                      // 3 = 春分、9 = 秋分
	startYear: 2003,
	coefficients: { a: 0.2422, b: 20.8357, year: 2000 }  // 近似計算の係数
}
```

**特例移動（令和宮位継承・五輪対応など）**:

```js
{
	name: '祝日名',
	type: 'fixed',
	month: 2,
	day: 11,
	startYear: 1966,
	specialMove: {
		year: 2019,                // 特例が適用される年
		from: { month: 2, day: 11 },  // 元の日付
		to: { month: 2, day: 10 }     // 移動先
	}
}
```

変更後は、配列の順序や一貫性を確認してください。配列内のオブジェクト順序に依存する処理はありませんが、可読性のため時系列順に並べるか、制定年順に並べることを推奨します。

### 2. 複数ファイルへの影響を確認して更新

ドキュメント冒頭の注記にある通り、祝日定義は以下のファイルにも組み込まれています。祝日定義を変更した場合は、これらのファイルもあわせて更新してください。

- `src/bank-transfer.js` (プレフィックス: `_bt_nh_`)
- `src/shipping-processing.js` (プレフィックス: `_sp_nh_`)

これらのファイルで祝日定義ロジック重複がないか確認し、必要に応じて同じ変更を適用してください。

### 3. テストを実行

変更後は必ず既存のテストを実行し、祝日判定が正しく動作することを確認してください。

```bash
# プロジェクトのテストスクリプト実行
npm test

# または
npm run test

# 簡単な動作確認例（Node.js）
node -e "const nh = require('./src/national-holidays.js'); console.log(nh.isNationalHoliday('2025-01-01')); console.log(nh.getNationalHolidaysInYear(2025));"
```

### 4. ドキュメトの更新

本ファイル（`docs/national-holidays.md`）の以下のセクションを必要に応じて更新してください。

- **祝日定義の範囲**: 新しい祝日の制定年や廃止年を記載
- **注意事項 / 既知の制限**: 官報告示データとの差異があれば記載
- **実例**: 新しい祝日の例があれば追加

また、リリースノートや `README.md` にも祝日の変更を明記してください。

### 5. バージョンとリリース

祝日定義変更の場合は `package.json` のバージョンを更新し、CHANGELOG またはリリースノートを作成することを推奨します。チームで運用している場合は、必ず追跡可能な形でドキュメントを残してください。

### 参考: 官報告示の確認

祝日の変更は官報告示による公式決定です。変更前に以下の情報源を確認してください。

- 国立天文台 (春分・秋分の日の計算)
- 内閣官房 ・官報（法改正・新祝日の告示）

---

必要に応じて以下も拡張できます:

- 官報告示データの取り込み
- 未来の特例移動や法改正への追随
- 祝日種別の区分出力（祝日名に加えて種別ラベルの付与）
