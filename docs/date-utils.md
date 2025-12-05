# date-utils 使い方リファレンス

このドキュメントは `src/date-utils.js` が公開する日付ユーティリティ関数群の使い方と引数・戻り値の契約を整理したリファレンスです。ブラウザや kintone 上で直接 `window` 経由で利用できることを前提としています。

---

## 目次

- 概要
- 公開 API サマリ
- 各関数の引数詳細
  - [`convertToSeireki(date)`](#convertToSeireki)
  - [`convertToEra(date)`](#convertToEra)
  - [`convertToYear(date)`](#convertToYear)
  - [`convertToYearMonth(date)`](#convertToYearMonth)
- エラー形式
- 実例
- 注意事項 / エッジケース

---

## 概要

`src/date-utils.js` は和暦（元号）表記・漢数字・全角数字など現場でよくある多様な日付表現を受け取り、安定した西暦文字列や和暦表記、年だけの抽出を行うユーティリティ群です。主要な変換は次のとおりです。

- `convertToSeireki`: 任意の受け口（和暦文字列や西暦文字列、Date オブジェクトなど）を標準化して `YYYY-MM-DD` 形式の文字列で返します。
- `convertToEra`: 日付から和暦の表現（漢字表記やイニシャル付き表記の複数形式）を返します。
- `convertToYear`: 様々な入力から西暦年（数値）だけを抽出します。
- `convertToYearMonth`: 様々な入力から西暦の年と月を抽出し、`{ year, month }` 形式で返します（月が欠ける場合は月を `1` として扱います）。

このライブラリは内部で次のような前処理・正規化を行います:

- 全角数字→半角、全角英字→半角英字の変換
- 漢数字（元・一〜千）→数値変換（概ね 1〜3999 相当）
- 元号漢字（明治/大正/昭和/平成/令和）→イニシャル（M/T/S/H/R）変換
- 日付区切りの正規化（年/月/日 を `-` 区切りに統一）

ブラウザ環境では、読み込み後に `window.DATE` 名前空間経由で利用可能です（`src` ファイル末尾で付与されます）。

---

## 公開 API サマリ

- `convertToSeireki(date) -> string` — 成功時は `'YYYY-MM-DD'` 形式の文字列を返す。
- `convertToEra(date) -> object` — `{ kanji, initial, initialOnly, numberOnly }` を返す。
- `convertToYear(date) -> number` — 西暦の年（数値）を返す。
- `convertToYearMonth(date) -> object` — `{ year: number, month: number }` を返す（month が欠ける場合は 1 を既定値とする）。

---

## 各関数の引数詳細

<a id="convertToSeireki"></a>

### `convertToSeireki(date)`

概要:

- 和暦表記（例: "令和元年5月1日"）、元号イニシャルを含む表記（例: "R1-5-1"）、西暦表記（"2025-10-14"）や `Date` オブジェクトなど、様々な入力を受け取り、`YYYY-MM-DD` 形式の文字列を返します。

引数:

- `date` (string | Date) — 解析対象。例: "令和元年5月1日", "H1/1/8", "2025-10-14", Date

戻り値:

- 成功: `string` — `'YYYY-MM-DD'` 形式（例: `'2019-05-01'`）

例外:

- `Error` を投げます（例: 不正な形式、存在しない日付など）。

挙動の要点:

- 全角数字や漢数字を半角に変換し、漢数字は内部で数値に変換されます（例: '元' -> 1）。
- 元号は内部の `_DU_ERAS` テーブル（令和/平成/昭和/大正/明治）を用いて変換されます。元年は `1` として扱われます。
- 日付が部分的（例: 元号+年のみ）で表現される場合、月／日はデフォルトで `1` とみなされることがあります（関数内部での粘り強い再試行ロジックにより最善解を探します）。

例:

```js
convertToSeireki('令和元年5月1日'); // -> '2019-05-01'
convertToSeireki('H1-1-8'); // -> '1989-01-08'
convertToSeireki(new Date('2025-10-14')); // -> '2025-10-14'
```

---

<a id="convertToEra"></a>

### `convertToEra(date)`

概要:

- 指定した日付を和暦に変換し、複数形式で返します。内部で `convertToSeireki` を用いて正規化した後、定義済みの元号テーブルから該当元号を決定します。

引数:

- `date` (Date | string) — Date オブジェクトまたは `convertToSeireki` で解釈可能な文字列。

戻り値 (object):

- `kanji` (string) — 元号と年を漢字表記で返す（例: "令和7年", 元年は "令和元年"）。
- `initial` (string) — 元号イニシャル＋2桁年（例: "R07"、元年は "R01"）。
- `initialOnly` (string) — イニシャルのみ（例: "R"）。
- `numberOnly` (string) — 元号年の2桁表記（例: "07"、元年は "01"）。

例:

```js
convertToEra('2025-10-14');
// -> { kanji: '令和7年', initial: 'R07', initialOnly: 'R', numberOnly: '07' }
```

例外:

- 明治以前の日付や解析不能な形式では `Error` を投げます。

---

<a id="convertToYear"></a>

### `convertToYear(date)`

概要:

- 様々な入力から西暦年（整数）だけを取り出します。`Date` オブジェクト、和暦文字列、元号イニシャル表記、4 桁の西暦文字列などに対応します。

引数:

- `date` (string | Date) — 例: "令和元年5月1日", "R1/5/1", "2019-05-01", "2025", Date

戻り値:

- 成功: `number` — 西暦年（例: `2019`）

挙動の要点:

- まず `Date` オブジェクトであればそのまま年を返します。
- 文字列の場合は `convertToSeireki` によりフル日付解釈を試み、失敗した場合は日付補完（"1日" 付加など）を試みます。
- それでも解釈できない場合は元号イニシャル＋年のパターンや文字列中の4桁を探すフォールバックを行います。

例:

```js
convertToYear(new Date('2025-10-14')); // -> 2025
convertToYear('令和1年'); // -> 2019
convertToYear('2025'); // -> 2025
```

---

<a id="convertToYearMonth"></a>

### `convertToYearMonth(date)`

概要:

- 様々な日付入力から西暦の年と月を抽出してオブジェクトで返します。戻り値は `{ year: number, month: number }` の形です。月が入力で与えられない場合は既定で `1` を返します。

引数:

- `date` (string | Date) — 例: `"令和元年5月1日"`, `"R1/5"`, `"2019-05-01"`, `"2025-05"`, `Date`

戻り値:

- 成功: `object` — `{ year: <number>, month: <number> }`（例: `{ year: 2025, month: 5 }`）

挙動の要点:

- `Date` オブジェクトで渡された場合はその年・月をそのまま返します。
- 文字列入力では `convertToSeireki` をまず試行し、フル日付が得られれば年・月を抽出します。年のみや年＋月のみの入力に対しては、内部で日付補完（'1日' を付加する等）や正規化を行い、可能な限り年と月を決定します。
- 元号（漢字／イニシャル）表記もサポートします。例: `"令和7年5月"`, `"R7-5"`, `"H02-03"` など。
- 解釈できない、あるいは元号のみ（例: `'R'`）のように年が不明な場合は `Error` を投げます。

例:

```js
convertToYearMonth(new Date('2025-05-10')); // -> { year: 2025, month: 5 }
convertToYearMonth('2025-05'); // -> { year: 2025, month: 5 }
convertToYearMonth('令和7年5月1日'); // -> { year: 2025, month: 5 }
convertToYearMonth('2025'); // -> { year: 2025, month: 1 }
```

---

## エラー形式

- 本モジュールは不正な入力や解析不能なケースで `Error` を投げます。エラーメッセージは日本語説明を含みます（例: '不正な入力形式です', '日付不正: Date型または文字列で指定してください' など）。

---

## 実例

### ブラウザ環境での利用

```html
<script src="src/date-utils.js"></script>
<script>
	console.log(window.DATE.convertToSeireki('令和元年5月1日'));
	// -> '2019-05-01'
	console.log(window.DATE.convertToEra('2025-10-14'));
	// -> { kanji: '令和7年', initial: 'R07', initialOnly: 'R', numberOnly: '07' }
	console.log(window.DATE.convertToYear('R1'));
	// -> 2019
	console.log(window.DATE.convertToYearMonth('令和7年5月1日'));
	// -> { year: 2025, month: 5 }
</script>
```

### Node / テスト環境での利用

```js
// CommonJS 形式でエクスポートしています
const DATE = require('./src/date-utils.js');
console.log(DATE.convertToSeireki('H1/1/8')); // '1989-01-08'
console.log(DATE.convertToEra('1989-01-08')); // { kanji: '平成1年', initial: 'H01', ... }
```

---

## 注意事項 / エッジケース

- 漢数字や全角数字の変換は概ね 1〜3999 程度までの範囲を想定した実装です。極端に大きな漢数字表現は想定外です。
- 元号は `令和` 以降の定義を内部テーブルで持っています。明治以前の扱いはサポート外で `Error` を投げます。
- 元号のみ（例: 'R'）の指定は年が不明なため `convertToYear` ではエラーになります。年が含まれる入力（'R1' など）を与えてください。
- 日付の部分（年/月/日）に 0 が来た場合は `1` に補正する挙動が一部の変換で採用されています（内部の互換処理に起因）。
- 出力は常に安定した形式（`YYYY-MM-DD` など）を返すようにしていますが、利用先での表示やローカライズは呼び出し側で行ってください。

---

## 参照

- 実装ソース: `src/date-utils.js`

必要があれば、さらに具体的なユースケース（例えば kintone レコードのフィールドからの変換例や、別ライブラリとの組合せ例）をこのドキュメントに追加します。

---

## 改元があった場合の対応方法

このモジュールは内部で `_DU_ERAS` 配列を参照して元号変換を行っています。改元（新しい元号の開始）が発生した場合は、以下の手順でソースとドキュメントを更新してください。

- 1. `src/date-utils.js` の `_DU_ERAS` 配列に新しい元号オブジェクトを先頭（配列の先頭が最新の元号）へ追加します。オブジェクトのフォーマットは次の通りです。

```js
// 例: 新元号 '新元号'（イニシャル 'X'）、開始日が 2025-11-26 の場合
{
	name: '新元号',            // 元号の漢字表記（例: '令和'）
	initial: 'X',             // イニシャル（半角英字1文字。既存のイニシャルと重複しないこと）
	number: 6,                // 実装上は参照用の番号フィールド（順序管理用）
	start: new Date('2025-11-26')
}
```

注意点:

- `start` にはその元号の開始日（西暦）を `new Date('YYYY-MM-DD')` 形式で指定してください。モジュールはこの `start` を使って該当元号を判定します。
- 新しい元号オブジェクトは配列の先頭（最新順）に置いてください。実装は配列を上から順に比較して最初にマッチした元号を採用します。
- `initial` は半角英字1文字で他の元号の `initial` と重複しないようにしてください。内部実装では大文字小文字を区別せず比較します。

- 2. ドキュメントの更新

- 本ファイル（`docs/date-utils.md`）に加えて、リリースノートや `README.md` に新元号の対応を明記してください。

- 3. テストとローカル確認

変更後は必ず既存のテストを実行し、簡単な動作確認を行ってください。例:

```bash
# プロジェクトのテストスクリプトが設定されていれば
npm test

# 簡単な Node 実行での動作確認例（CommonJS エクスポートを利用）
node -e "const d=require('./src/date-utils.js');console.log(d.convertToSeireki('X1-11-26'));"
```

上記の例では、`X1-11-26`（新元号の元年 11/26）を適切に西暦に変換できるかを検証します。

- 4. バージョンとリリース

必要に応じて `package.json` のバージョンを更新し、CHANGELOG やリリースノートを作成してください。チームで運用している場合は、ドキュメント周り（この `docs`）とリポジトリの README を更新しておくと追跡が容易です。

---
