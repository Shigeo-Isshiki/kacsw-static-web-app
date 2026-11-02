# date-utils 使い方リファレンス

## 概要・バージョン

現行ソースは **1.2.0** です。確認済み通常配布版は **1.1.0**（2026-11-02確認）で、1.2.0の配布確認は未実施です。詳細は[通常配布確認記録](verification/library-distribution.md#追加確認date-utils-110)を参照してください。

このドキュメントは `src/date-utils.js` が公開する日付ユーティリティ関数群の使い方と引数・戻り値の契約を整理したリファレンスです。ブラウザや kintone 上で直接 `window` 経由で利用できることを前提としています。

> **重要**: 元号定義は `date-utils` だけでなく `csv-builder` にも組み込まれています。
> 改元対応では、次のファイルをセットで更新してください。
>
> - `src/date-utils.js`（`_DU_ERAS`）
> - `src/csv-builder.js`（`_CB_ERAS`）
> - `docs/date-utils.md`（本ドキュメント）
> - `docs/csv-builder.md`（和暦フォーマット仕様）

---

`src/date-utils.js` は和暦（元号）表記・漢数字・全角数字など現場でよくある多様な日付表現を受け取り、安定した西暦文字列や和暦表記、年だけの抽出を行うユーティリティ群です。主要な変換は次のとおりです。

- `convertToSeireki`: 任意の受け口（和暦文字列や西暦文字列、Date オブジェクトなど）を標準化して `YYYY-MM-DD` 形式の文字列で返します。
- `convertToEra`: 日付から和暦の表現（漢字表記やイニシャル付き表記の複数形式）を返します。
- `convertToYear`: 様々な入力から西暦年（数値）だけを抽出します。
- `convertToYearMonth`: 様々な入力から西暦の年と月を抽出し、`{ year, month }` 形式で返します（月が欠ける場合は月を `1` として扱います）。
- `convertToAge`: 生年月日と基準日から年齢を返します（`false`: 満年齢、`true`: 法律ベース年齢）。
- `registerFormBridgeDateInputHandler`: FormBridge新バージョンAPIの入力欄変更時に日付・年・年月を変換し、別の保存欄へ設定するハンドラーを登録します。

このライブラリは内部で次のような前処理・正規化を行います:

- 全角数字→半角、全角英字→半角英字の変換
- 漢数字（元・一〜千）→数値変換（概ね 1〜3999 相当）
- 元号漢字（明治/大正/昭和/平成/令和）→イニシャル（M/T/S/H/R）変換
- 日付区切りの正規化（年/月/日 を `-` 区切りに統一）

ブラウザ環境では、読み込み後に `window.DATE` 名前空間経由で利用可能です（`src` ファイル末尾で付与されます）。

---

## 読み込み・依存関係

- ソース：[src/date-utils.js](../src/date-utils.js)
- 配布URL：https://js.kacsw.or.jp/date-utils.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。

ブラウザでは `window.DATE` 名前空間に公開します。Nodeでは `require("../src/date-utils.js")` のCommonJSエクスポートを利用できます。元号定義は内蔵しています。日付変換関数の利用にイベント登録や外部ライブラリは不要です。

FormBridge用ハンドラーは、次の順で読み込んで利用してください。

1. [formbridge-custom-lib.js](formbridge-custom-lib.md) **v1.0.1以上**（公開名前空間 `window.formBridgeCustomLib`）
2. `date-utils.js` **v1.1.0以上**（`afterChange` オプションは **v1.2.0以上**）
3. 利用側の登録コード

FormBridge用の依存は登録関数を呼ぶ時点で確認します。読み込むだけではイベント登録・値変更・外部通信は行いません。通常のWebページやkintoneでの既存機能にFormBridgeの依存は追加されません。`text-suite.js`、`kintone-custom-lib.js`、`all-window-exports.js` はFormBridge用日付入力ハンドラーには不要です。

登録時には直接参照できる `formBridge.events.on` と共通基盤の公開設定関数を確認します。`window.formBridge` は参照せず、そこへのAPIのコピーも不要です（`window.formBridge` のみ存在する環境でも動作します）。登録時には `formBridge.fn` を要求しません。値・エラー設定は回答画面の表示後に発生する変更イベント内で共通基盤を通して行います。DOM操作には依存しません。

利用側で `formBridgeCustomLib.createDependencyChecker` により依存確認する場合の正式な関数パスは `DATE.registerFormBridgeDateInputHandler` です（既存日付関数と同様に `window.DATE` 配下に公開されます）。

## 公開関数の目次

### 共通ユーティリティ

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `convertToSeireki(date)` | 日付を西暦の `YYYY-MM-DD` 形式に変換する。 | [参照](#convertToSeireki) |
| `convertToEra(date)` | 日付を元号情報（漢字・イニシャル・年数）に変換する。 | [参照](#convertToEra) |
| `convertToYear(date)` | 日付から西暦年を取得する。 | [参照](#convertToYear) |
| `convertToYearMonth(date)` | 日付から西暦年と月を取得する。月が欠ける場合は1を既定値とする。 | [参照](#convertToYearMonth) |
| `convertToAge(birthDate, asOfDate?, useLegalAge?)` | 生年月日と基準日から年齢を算出する。 | [参照](#convertToAge) |

### FormBridge

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `registerFormBridgeDateInputHandler(inputFieldCode, savedFieldCode, options)` | 入力欄の変更時に日付・年・年月を変換し、別の保存欄へ設定する。 | [参照](#registerformbridgedateinputhandler) |

---

## 関数リファレンス

### 共通ユーティリティ

<a id="convertToSeireki"></a>

#### `convertToSeireki(date)`

概要:

- 和暦表記（例: "令和元年5月1日"）、元号イニシャルを含む表記（例: "R1-5-1"）、西暦表記（"2025-10-14"）や `Date` オブジェクトなど、様々な入力を受け取り、`YYYY-MM-DD` 形式の文字列を返します。

引数:

- `date` (string | Date) — 解析対象。例: "令和元年5月1日", "H1/1/8", "2025-10-14", Date

戻り値:

- 成功: `string` — `'YYYY-MM-DD'` 形式（例: `'2019-05-01'`）

例外:

- `Error` を投げます。以下のケースが該当します:
  - 不正な形式（解析できない文字列など）
  - 無効な月（1～12 の範囲外）
  - 無効な日（1～31 の範囲外、または各月の最大日数を超える。例: 2月30日）

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

#### `convertToEra(date)`

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

#### `convertToYear(date)`

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

#### `convertToYearMonth(date)`

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

<a id="convertToAge"></a>

#### `convertToAge(birthDate, asOfDate, useLegalAge)`

概要:

- 生年月日と基準日を受け取り、`useLegalAge` に応じて年齢を返します。
  - `false`: 満年齢（誕生日未到来なら 1 引く）
  - `true`: 年齢計算ニ関スル法律ベース（誕生日の前日満了で加齢）

引数:

- `birthDate` (string | Date) — 生年月日。`convertToSeireki` で解釈可能な形式を受け付けます。
- `asOfDate` (string | Date, optional) — 基準日。省略時は当日。
- `useLegalAge` (boolean, optional) — 年齢算出モード。`true` は法律ベース、`false` は満年齢。省略時は `false`。

戻り値:

- 成功: `number` — 満年齢

例外:

- `Error` を投げます。以下のケースが該当します:
  - 入力形式が不正
  - 基準日が生年月日より前

例:

```js
convertToAge('1990-05-10', '2026-05-09'); // -> 35
convertToAge('1990-05-09', '2026-05-09'); // -> 36
convertToAge('平成2年5月9日', '2026-05-09'); // -> 36
convertToAge('1990-05-10', '2026-05-09', true); // -> 36
```

---

### エラー形式

- 本モジュールは不正な入力や解析不能なケースで `Error` を投げます。エラーメッセージは日本語説明を含みます（例: '不正な入力形式です', '日付不正: Date型または文字列で指定してください' など）。

---

### 実例

#### ブラウザ環境での利用

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
	console.log(window.DATE.convertToAge('1990-05-10', '2026-05-09'));
	// -> 35
</script>
```

#### Node / テスト環境での利用

```js
// CommonJS 形式でエクスポートしています
const DATE = require('./src/date-utils.js');
console.log(DATE.convertToSeireki('H1/1/8')); // '1989-01-08'
console.log(DATE.convertToEra('1989-01-08')); // { kanji: '平成1年', initial: 'H01', ... }
```

---

### FormBridge

<a id="registerformbridgedateinputhandler"></a>

#### `registerFormBridgeDateInputHandler(inputFieldCode, savedFieldCode, options)`

入力欄の `form.field.change.<inputFieldCode>` に同期ハンドラーを1つ登録します。戻り値は `void` です。登録関数は一組につき一度だけ呼んでください（重複登録の抑止・解除は行いません）。初期読み込み時に登録でき、`form.show` 内での再登録は不要です。登録しただけでは値・エラーを変更しません。

| 引数・オプション           | 型・既定値         | 契約                                                                 |
| -------------------------- | ------------------ | -------------------------------------------------------------------- |
| `inputFieldCode`           | string、必須       | 空白のみでない入力欄コード                                           |
| `savedFieldCode`           | string、必須       | 空白のみでない保存欄コード。入力欄と同じコードは登録時エラー         |
| `options`                  | object、必須       | 配列・nullは不可。下記以外のキーは登録時エラー                       |
| `options.type`             | string、必須       | `'date'`／`'year'`／`'yearMonth'` のいずれか1つ                      |
| `options.invalidMessage`   | string、下表の文言 | 変換不成立時のみ上書き。空文字・空白のみは不可                       |
| `options.exceptionMessage` | string、省略可     | 変換関数の例外時に表示する固定文言。省略時は例外のメッセージを表示   |
| `options.afterChange`      | function、省略可   | 値・エラー設定の完了後に同期実行する処理結果通知コールバック（v1.2.0以降）。関数以外は登録時エラー |

フィールドコードは別々に明示指定し、`_input` などの命名規則には依存しません。不正引数・不正オプション・登録時の依存不足は例外として表面化し、イベントは登録しません。`clearValue` や空欄時の保存値保持などのオプションはありません。消去値は `type` から一意に決まります。

| `type`      | 使用する既存関数     | 保存形式                            | 空欄・変換失敗時の消去値 | 既定の変換不成立メッセージ         |
| ----------- | -------------------- | ----------------------------------- | ------------------------ | ---------------------------------- |
| `date`      | `convertToSeireki`   | `YYYY-MM-DD`（例: `2026-11-02`）    | **`null`**               | 日付の形式で入力してください。     |
| `year`      | `convertToYear`      | `${year}年`（例: `2026年`）         | **`''`**                 | 年の形式で入力してください。       |
| `yearMonth` | `convertToYearMonth` | `${year}年${month}月`（例: `2026年4月`） | **`''`**            | 年月の形式で入力してください。     |

年月の月はゼロ埋めしません（例: `2026年4月`）。受理する表記・日付の妥当性・和暦等の解釈は既存変換関数の仕様のままで、独自の解析処理は追加していません。既存関数の戻り値が所定の形（日付は `YYYY-MM-DD` 文字列、年は整数、年月は年・月とも整数で月が1〜12）でない場合は変換不成立として扱い、不成立結果を文字列化して保存しません。

イベント処理は次の順序です。

1. イベント引数に自身の `value` があることを確認し、入力欄の既存エラーを `setFieldError(inputFieldCode, null)` で解除します。`value` のないイベントは例外です。変更イベント中のレコード取得値は変更前の場合があるため、レコード取得・旧context getter/setterは使用しません。
2. `value` が `null`、`undefined`、`''` の場合は空欄として保存欄を種別の消去値（日付は `null`、年・年月は `''`）にします。変換関数は呼びません。空白のみの文字列は空欄扱いせず、既存変換関数へ渡してその結果に従います。
3. 空欄以外の非文字列（`0`、`false`、配列、オブジェクト、その他の数値等）は暗黙に文字列化せず、保存欄を種別の消去値にし、入力欄に `文字列で入力してください。` と表示します。
4. 文字列は種別の既存変換関数に渡します。変換例外では保存欄を種別の消去値にし、`exceptionMessage`（省略時は例外のメッセージ、例外に利用可能なメッセージがない場合は種別ごとの既定文）を入力欄に表示します。
5. 変換不成立では保存欄を種別の消去値にし、`invalidMessage`（省略時は種別ごとの既定文）を入力欄に表示します。正常時は所定の形式で保存欄へ設定します。
6. `afterChange` が指定されている場合のみ、上記の値・エラー設定がすべて正常に完了した後、処理結果を同期通知します（下記「処理結果の通知（`afterChange`）」）。

入力欄の値・イベント内のレコードは変更しません。値・エラー設定はすべて `window.formBridgeCustomLib.setFieldValue` / `setFieldError` を使用します。変換失敗として処理する `try/catch` は変換処理に限定しており、これらの設定APIの例外はそのまま伝播し、変換エラーへの置き換え・再試行・フォールバックは行いません。初期表示時の保存欄から入力欄への転記や登録直後の自動変換は行わないため、初期転記が必要な場合は利用側の既存処理を維持してください。

##### 処理結果の通知（`afterChange`）

`options.afterChange` は、変換・値設定・エラー設定の正常完了後に、対象の変更イベント1回につき1回だけ同期実行されるコールバックです（v1.2.0以降）。引数は次の1オブジェクトです。

| プロパティ       | 内容                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| `event`          | 元の変更イベント（そのまま渡します）                                                   |
| `inputFieldCode` | 登録した入力欄コード                                                                   |
| `savedFieldCode` | 登録した保存欄コード                                                                   |
| `status`         | `'success'`（正常変換）／`'empty'`（空欄化）／`'invalid'`（変換不成立・変換例外・非文字列入力） |
| `savedValue`     | 保存欄へ設定した値。正常時は保存形式の値、空欄化・失敗時は種別の消去値（日付は厳密に `null`、年・年月は厳密に `''`） |
| `errorMessage`   | 正常・空欄は `null`。失敗時は入力欄に実際に表示した文言                               |

契約は次のとおりです。

- 通知は空欄化・変換失敗で保存値を消去した場合も行います。関連項目に残った整合性エラーの再判定に利用できます。
- `afterChange` に関数以外を指定すると登録時エラーになります。未指定時の動作はv1.1.0と同一です。
- 登録時・初期表示時には通知しません。自動転記も追加しません。
- 値・エラー設定APIが失敗した場合は、その例外が伝播し、コールバックは呼ばれません。
- コールバックの例外はそのまま伝播します。変換エラーとして扱わず、保存値の消去や変換エラーへの置き換えも行いません。
- コールバックは同期用途です。戻り値（Promise等）の完了待機・送信待機は行いません。
- 通知後にライブラリが値・エラーを変更することはないため、コールバック内で利用側が設定した業務エラー（`setFieldError`）は次の変更イベントまで残ります。エラー解除は次の変更イベントの冒頭（上記手順1）で行われます。
- 変更イベント中のFormBridgeのレコード取得値は変更前の場合があるため、利用側は通知された `savedValue` を処理中のレコードへ反映して判定してください。

##### 日付・年・年月の登録例

生年月日（日付）・国家試験年（年）・養成施設卒業年月（年月）を登録する例です。フィールドコードは説明用であり、利用するフォームに合わせて置き換えてください。

```js
(function () {
	registerFormBridgeDateInputHandler('Birthday_input', 'Birthday', {
		type: 'date',
	});
	registerFormBridgeDateInputHandler(
		'National_examination_year_input',
		'National_examination_year',
		{
			type: 'year',
			invalidMessage: '国家試験年の形式で入力してください。',
			exceptionMessage: '国家試験年の形式が正しくありません。',
		}
	);
	registerFormBridgeDateInputHandler(
		'Training_facility_school_completion_date_input',
		'Training_facility_school_completion_date',
		{
			type: 'yearMonth',
			invalidMessage: '年月の形式で入力してください。',
			exceptionMessage: '年月の形式が正しくありません。',
		}
	);
})();
```

##### `afterChange` による整合性チェックの例

生年月日の変換結果に連動して、個別フォーム側で基準日との整合性を再判定する例です。フィールドコードは説明用の架空のものです。業務条件そのものは本ライブラリに含まれないため、判定内容は利用側で実装してください。

```js
(function () {
	const fb = window.formBridgeCustomLib;
	// 利用側で保持する処理中のレコード値（FormBridgeのレコード取得値の即時更新には依存しない）
	const current = { Person_birth_date: null };

	const revalidateBirthDateConsistency = () => {
		// 例: 生年月日と報告基準日・契約日等との整合性を再判定し、
		// 関連項目のエラーを設定・解除する（業務条件は個別フォームで実装）
	};

	registerFormBridgeDateInputHandler('Person_birth_date_input', 'Person_birth_date', {
		type: 'date',
		afterChange: ({ inputFieldCode, savedFieldCode, status, savedValue, errorMessage }) => {
			// 通知されたsavedValueを処理中のレコードへ反映して判定する
			current[savedFieldCode] = savedValue;
			if (status === 'success') {
				// 正常変換後の整合性チェック（業務エラーは利用側が設定し、ライブラリは解除しない）
				revalidateBirthDateConsistency();
			} else if (status === 'empty') {
				// 空欄化（savedValueは日付のためnull）による関連エラーの再判定
				revalidateBirthDateConsistency();
			} else {
				// status === 'invalid': 関連エラーを再判定したうえで、
				// 実際に表示された入力形式エラーを維持（再設定）する
				revalidateBirthDateConsistency();
				fb.setFieldError(inputFieldCode, errorMessage);
			}
		},
	});
})();
```

このAPIは、日付・年・年月の変換、保存欄への設定、エラー表示、処理結果の通知という共通部分を扱います。生年月日と他の日付との整合性チェックなどの業務条件は `afterChange` を利用して個別フォーム側で実装してください。フォーム固有の実装・業務条件まで一律に置き換えられることは保証しません。

---

## 制約・注意事項

### 注意事項 / エッジケース

- 漢数字や全角数字の変換は概ね 1〜3999 程度までの範囲を想定した実装です。極端に大きな漢数字表現は想定外です。
- 元号は `令和` 以降の定義を内部テーブルで持っています。明治以前の扱いはサポート外で `Error` を投げます。
- 元号のみ（例: 'R'）の指定は年が不明なため `convertToYear` ではエラーになります。年が含まれる入力（'R1' など）を与えてください。
- 日付の部分（年/月/日）に 0 が来た場合は `1` に補正する挙動が一部の変換で採用されています（内部の互換処理に起因）。
- 西暦形式（`YYYY-MM-DD`）での入力では、月が 1～12、日が各月の有効範囲内であることが厳密に検証されます。例えば `2026-13-27`（13月）や `2026-02-30`（2月30日）のような不在の日付はエラーになります。
- 出力は常に安定した形式（`YYYY-MM-DD` など）を返すようにしていますが、利用先での表示やローカライズは呼び出し側で行ってください。

### FormBridge用ハンドラーの注意事項

- FormBridgeは[新バージョンAPI](https://formbridge.kintoneapp.com/help/customize/v2)のみ対象です。旧context APIへの自動切り替えはありません。
- 対象は通常フィールドの変更イベントのみです。サブテーブル、初期表示時の値転記は対象外です。変換後の値に連動する業務処理は `afterChange`（v1.2.0以降）で利用側が実装し、業務条件そのものは本ライブラリに含めません。
- `YYYY-MM-DD` を保存する日付欄の消去値は `null`、文字列を保存する年・年月欄の消去値は `''` に固定です。日付保存欄へ `''` を設定することはありません。空欄時に保存値を保持する設定もありません。
- 既存の個別フォーム処理から移行する場合は、利用側で旧ハンドラーを削除して二重登録を防いでください。初期表示時の保存欄から入力欄への転記は、利用側の既存処理を維持してください。
- 自動テストはグローバルの `const formBridge` のみ存在する環境と `window.formBridge` のみ存在する環境、表示前の登録・表示後の設定、エラー解除、設定APIの例外伝播、`afterChange` の通知内容・通知順序・例外伝播などをモックで確認します。実画面での動作を保証するものではありません。
- 本番配布前に、実FormBridgeでライブラリ順序、回答画面表示前の登録、対象の各欄の正常変換・入力欄保持、変換不成立・例外時のエラー表示、その後の正常入力・空欄化での解除、空欄時の保存欄消去（日付は `null`、年・年月は `''`）を確認してください。`afterChange` を利用する場合は、通知に連動する業務チェックの表示調整も実画面で確認してください。既存のフォーム固有処理との競合や重複登録も確認が必要です。

---

### 参照

- 実装ソース: `src/date-utils.js`

---

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

現行ソース **1.2.0** の配布・配布確認は未実施です。2026-11-02に、1.1.0（`8960985`）のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。2026-10-12の1.0.0確認記録も履歴として保持します。確認日は初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                    | 記録・配布確認                                         |
| ---------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 1.2.0      | 2026-11-02 | `registerFormBridgeDateInputHandler` に処理結果を同期通知する `afterChange` オプションを追加。未指定時の挙動・既存変換関数の仕様変更なし | 配布確認は未実施 |
| 1.1.0      | 2026-11-02 | FormBridge用日付・年・年月入力ハンドラー（`registerFormBridgeDateInputHandler`）、公開設定・自動テストを追加。既存変換関数の仕様変更なし | `8960985`。通常配布URLとの完全一致を確認（2026-11-02）。[配布記録](verification/library-distribution.md#追加確認date-utils-110) |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12） |
| 未設定     | 2025-10-29 | 現ファイル名での最古の登録（ファイル名変更）                | `226cf91`。初版作成日・配布日は未確認                  |
| 未設定     | 2026-03-06 | `H13/5` などの和暦年月フォールバック解析を修正              | `5d64233`。配布確認は未確認                            |
| 未設定     | 2026-05-09 | 年齢算出オプションを追加し、仕様書を更新                    | `9b5888c`。配布確認は未確認                            |
| 未設定     | 2026-05-09 | `convertToAge` の `asOfDate` にnullを渡す場合の不具合を修正 | `ef59764`。配布確認は未確認                            |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
