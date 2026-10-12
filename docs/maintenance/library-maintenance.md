# 共通ライブラリの保守・開発手順

利用方法・API契約は [文書一覧](../README.md#ライブラリ一覧) の各リファレンスを参照してください。この文書はソース更新・テスト環境・データ更新の手順をまとめます。手順の記載は実行結果の証拠ではありません。

## 共通の検証・バージョン更新

- 機能変更では、対象ライブラリの先頭JSDocの `@version` と仕様書の現行バージョン・更新履歴を更新します。リポジトリのpackageバージョンとは区別します。
- 既存テストは `npm test`、個別テストは `node -r ./test/setup-tests.js test/対象ファイル.js` で実行します。
- 静的チェックは `npm run lint`、`npx prettier --check "src/**/*.{js,css,html}"`、`node --check src/対象ファイル.js` を使用します。
- 文書検証は [文書作成標準](../README.md#文書変更時の検証) に従います。
- 実行したコマンドと結果、実画面確認と未確認事項は検証記録に残します。配布の確認はCI成功だけでなく配布URLの内容一致と区別して記録します。
- リリース時は [通常配布確認の標準手順](../README.md#リリース通常配布確認の標準手順) に従い、配布対象コミットの通常URLとの照合結果を [通常配布確認記録](../verification/library-distribution.md) に追記します。

## date-utils：改元があった場合の対応方法

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

- 2. 関連ファイルをまとめて更新

- `src/date-utils.js` の `_DU_ERAS` を更新したら、`src/csv-builder.js` の `_CB_ERAS` も同じ内容に更新してください。
- 仕様変更を反映するため、`docs/date-utils.md` と `docs/csv-builder.md` の両方を更新してください。
- 必要に応じて、リリースノートや `readme.md` に新元号対応を明記してください。

- 3. テストとローカル確認

変更後は必ず既存のテストを実行し、簡単な動作確認を行ってください。例:

```bash
# プロジェクトのテストスクリプトが設定されていれば
npm test

# 簡単な Node 実行での動作確認例（CommonJS エクスポートを利用）
node -e "const d=require('./src/date-utils.js');console.log(d.convertToSeireki('X1-11-26'));"

# csv-builder 側の和暦フォーマット確認（例）
node -e "global.window=global;require('./src/csv-builder.js');console.log(window.CSV.buildRow([{key:'d',type:'date',format:'ERA_INITIAL_JIS_YMD'}],{d:'X1-11-26'}));"
```

上記の例では、`X1-11-26`（新元号の元年 11/26）を適切に西暦に変換できるかを検証します。

- 4. バージョンとリリース

必要に応じて対象ライブラリの先頭JSDocの `@version` と仕様書のバージョンを更新し、CHANGELOG やリリースノートを作成してください。チームで運用している場合は、ドキュメント周り（この `docs`）とリポジトリの README を更新しておくと追跡が容易です。

---

## kintone-custom-lib：テスト用モック例（jsdom + Node）

簡易的なパターン:

```js
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body><div id="space-A"></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

// 必要な kintone API をモック
global.kintone = {
	app: {
		record: {
			getSpaceElement: (code) => document.getElementById(code),
		},
		getHeaderMenuSpaceElement: (id) => document.getElementById('header-' + id),
	},
	events: {
		on: (ev, h) => {
			/* stub */
		},
	},
	createDialog: (config) => ({
		element: config.body,
		show: () => document.body.appendChild(config.body),
	}),
};

require('../src/kintone-custom-lib.js');
```

このパターンを使うと `setSpaceFieldText` や `notifyError` 等の DOM 操作を Node 上で検証できます。

## national-holidays：祝日の変更があった場合の対応方法

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

また、リリースノートや `readme.md` にも祝日の変更を明記してください。

### 5. バージョンとリリース

祝日定義変更の場合は 対象ライブラリの先頭JSDocの `@version` と仕様書のバージョンを更新し、CHANGELOG またはリリースノートを作成することを推奨します。チームで運用している場合は、必ず追跡可能な形でドキュメントを残してください。

### 参考: 官報告示の確認

祝日の変更は官報告示による公式決定です。変更前に以下の情報源を確認してください。

- 国立天文台 (春分・秋分の日の計算)
- 内閣官房 ・官報（法改正・新祝日の告示）

## phone-utils：テストヒント

- `091` 系の長さ境界（6・13 桁）を確認する。
- 011/03/06 系など市外局番の境界ケース、`0120`/`0800` などの着信課金・フリーダイヤルの扱いを確認する。
- 全角数字・全角スペース・各種括弧・スラッシュなどの記号を含む入力で正規化とバリデーションの整合性を検証する。

---

---

## phone-utils：総務省の電話番号データが更新されたときに修正すべき点

総務省（あるいは同等の公式データ）が電話番号の割当や範囲を更新した場合、`src/phone-utils.js` 内のデータと挙動を最新化する必要があります。以下は短く実務的にやるべき項目です。

現状メモ: `src/phone-utils.js` のデータ定義は、2026年9月1日時点の総務省公開情報に対応しています。

- **更新対象データ**:
  - `/_PU_PHONE_NUMBER_CONFIG.areaCodeList`（市外局番ごとの市内局番桁数）
  - `/_PU_PHONE_NUMBER_CONFIG.areaCodeRanges`（市内局番の範囲指定）
  - `/_PU_PHONE_NUMBER_CONFIG.digit11PhoneNumberRange`（11桁扱いのプレフィックス群）
  - `/_PU_PHONE_NUMBER_CONFIG.notLandlinePhoneNumberRange`（固定電話扱い除外プレフィックス）
  - 併せて `callCapableTypes` / `faxExcludedTypes` / `mobileType` 等の判定ルールを見直す

- **実務手順（推奨）**:
  1. 総務省公開データ（または提供元の公式リリース）を入手し、更新要否を確認する。
  2. 上記の各フィールドへ新しい値を反映する。複数桁長（2/3/4/5 など）のキー配列は降順ソートで扱われるため、追加・削除後にソート順を保つ。
  3. ファイル先頭のバージョン表記（ヘッダコメント）や `@version` を更新してリリース履歴を残す。
  4. ローカルキャッシュ（`_pu_areaCodeListCache`）の初期値が残る場合があるため、デプロイ/再起動前にキャッシュを再生成するか、実行時に `null` にリセットする処置を検討する。

- **検証（必須）**:
  - 単体テストを追加／更新する:
    - 変更された市外局番について、正しいハイフンパターンが返るか (`formatPhoneNumber`) を確認する。
    - その市外局番での有効／無効判定（`isValidPhoneNumber`）を多数の正常系/異常系ケースで検証する。
    - `getPhoneNumberType` の出力が期待どおりか（例: 新たなプレフィックスが 11 桁扱いになる場合など）を確認する。
  - 既存のテスト（`test/` ディレクトリ）を実行して回帰がないことを確認する: `npm test` など。

- **注意点 / エッジケース**:
  - 一部プレフィックス（例: `0200` のような M2M、`0800`/`0120` 等の着信課金）は桁数ルールが他と異なるため、単純な桁数チェックだけでは不十分。`digit11PhoneNumberRange` の設定と `areaCodeRanges` の組み合わせを必ず確認する。
  - `areaCodeRanges` の表記（`"20-30,35,40-50"` 形式）は正しくパースされる必要があるため、取り込むデータがこの仕様に沿っているか検査する。
  - データ更新によって `formatPhoneNumber` のハイフン位置や `isValidPhoneNumber` の判定結果が変わるため、外部に保存している正規化済み値（DB 等）があれば影響範囲を検討する。

- **運用メモ**:
  - データ更新を管理するための小さなスクリプト（CSV/JSON → `src/phone-utils.js` の該当オブジェクトへ変換）を用意しておくと人的ミスが減ります。将来的には `data/` ディレクトリへ生データを置き、ビルド時に取り込む仕組みも検討してください。
  - 変更点は 各ライブラリ仕様書の「更新履歴・配布記録」やコミットメッセージに明確に書き残すと QA が楽になります。

---

## shipping-processing：テスト／検証のヒント

- `validateTrackingNumber` の境界、全角/半角、ハイフン・空白の扱いを網羅する
- `getNextBusinessDay` は内部に組み込まれた祝日判定ロジックを使用するため、外部APIへの依存はありません。土日・祝日・年末年始が連続するケースで正しく翌営業日に進むかを検証する。
- `kintoneShippingInquiryButton` は DOM と kintone API をスタブして副作用（ボタン追加、親の display 値、`window.open` 呼び出し）を検証する

## system-utils：テストの実行方法

全テストを実行するにはリポジトリのテストランナーを使います:

```bash
npm test
```

個別ファイルを直接実行することもできます:

```bash
node -r ./test/setup-tests.js test/test-system-utils.js
```

## text-suite：登録ハンドラの内部構成

通常フィールド版は `_ts_registerFieldValueHandler`、テーブル版は `_ts_registerTableFieldHandler` に登録処理を集約しています。どちらも `_ts_validateHandlerOptions` によるオプション検証と、kintoneイベントAPIの利用可否チェックを使用します。これらは非公開の内部関数です。

- 共通登録処理は、対象フィールドの取得、空値判定、エラーのクリア、正規化関数の呼び出し、失敗時の入力値維持とエラー設定を担当します。テーブル版には行の特定と行IDエラーマップの同期が加わります。
- 全角・ひらがなの各公開APIから渡す正規化関数が、変換 → 空白除去 → 文字数判定を担当します。通常版とテーブル版で同じ順序・既定値・エラーメッセージです。
- メールの各公開APIは `assertEmailAddress` を正規化関数として渡します。共通登録処理自体に全角変換固有の処理は含めません。
- 今後別の変換APIを追加する場合も、変換固有の処理は正規化関数側に定義し、イベント登録・エラー管理は共通登録処理を利用する構成です。

## text-suite：テストと運用ヒント

- 重要な境界値: 半角⇄全角の混在、長音符（`ー`）や波ダッシュ等の記号、合成濁点／半濁点（゛/゜ の結合処理）を含む入力を検証してください。
- `throwOnError=false` のケースでどのように非変換文字が残るかを確認するテストを用意すると堅牢です。
- `assertEmailAddress` は簡易検証であり、厳密な RFC 準拠が必要な用途には専用ライブラリの利用を検討してください。
- `registerFullWidthHandler` のテストでは `kintone.events.on` をスタブ化し、登録されたイベント名と、スタブ経由で取得したハンドラへ渡す擬似イベントオブジェクトの変化を検証します。

### 長音符・波ダッシュに関する注意

ライブラリは全角長音符 `ー`（U+30FC）と半角長音符 `ｰ`（U+FF70）を変換テーブルに登録していますが、波ダッシュ（U+301C / U+FF5E など）や他のハイフン類はハイフン正規化の対象として `_TS_HYPHEN_REGEX` でまとめて扱われます。必要であれば追加のコードポイントを変換テーブルに加えることで一元的な正規化が可能です。

## vc-check：テストと運用ヒント

- 入力検証は厳格です。ユーザ入力で全角かな・漢字等が混入している場合は `_vc_toHalfWidth` が例外を投げます。フォーム側で事前に入力制御（入力マスク・プレースホルダ）を追加することを推奨します。
- URL の判定は単純に `zoom.us` を含むかどうかで行います（サブドメインやパスを厳密に検査する場合は追加の検証を行ってください）。
- テストファイル: このリポジトリでは `test/test-vc-check.js` を用意しています。正常系・異常系（桁数不足、短すぎるパスコード、非 ASCII 混入、https 必須、zoom.us 欠如）をカバーしています。CI に組み込まれている場合は `npm run test` で自動実行されます。

## kintone-custom-lib：関数ごとのテスト観点

テストヒント: 無効な `record` を渡したときに `defaultValue` が返ることをアサートします。

テストヒント: `global.kintone = { events: { on: (ev, h) => h({}) } }` のようにスタブして、ハンドラが呼ばれることを確認します。

テストヒント: jsdom と `kintone.createDialog`（PC）または `kintone.mobile.createBottomSheet`（モバイル）のモックを用意し、生成されたコンテナ内に `.kc-notify-error__message` が存在すること、不正な `script` 要素や `on*` 属性が削除されていることを確認します。

テストヒント: `kintone.app.getHeaderMenuSpaceElement(id)` をモックして、返された要素に button が追加されることを検証します。

テストヒント: jsdom でテストする場合は `global.kintone.app.record.getHeaderMenuSpaceElement = id => document.getElementById('your-container')` のようにモックを用意し、返される要素に対して button が追加されることを確認します。

テストヒント: jsdom で `document` を用意し、`global.kintone.app.record.getHeaderMenuSpaceElement = id => document.getElementById('rec-header-space')` のようにモックしてから呼び出し、返された要素に該当 ID の要素が appendChild されることを確認します。

テストヒント: `initKintoneCustomLibRuntime({ isMobilePage: true })` を使うケースと、未初期化で `location.pathname = '/k/m/...'` を使うケースの両方を検証します。

## phone-utils：関数ごとのテスト観点

テストヒント: 無効値、全角数字やハイフンを含む入力、`091` 系の特殊番号（6〜13 桁）などで境界ケースを確認してください。

## shipping-processing：関数ごとのテスト観点

テストヒント:

- 全角数字とハイフン混在の正常系
- アルファベットや記号の混入でエラーになること
- `minLength` / `maxLength` の境界値テスト

テストヒント:

- 土日、年末年始（12/29〜1/4）、祝日が連続するケースで正しく翌営業日に進むかを確認する

テストヒント:

- `document.createElement` / kintone の record namespace をスタブして、生成される要素の `id`、`textContent`、およびクリック時に `window.open` が正しい URL を受け取ることを確認する
- `label === null` の場合に親要素が `display: none` になる挙動を確認する

## bank-transfer：開発時の確認事項

- 新しいPromise APIや公開名前空間の変更を検討する場合は、既存callback APIとkintoneイベントへの影響を確認します。現行APIへの追加を決定したものではありません。
- 全銀ファイルのShift_JIS実データ読み込みと給与振込の実機結果は、[検証記録](../verification/bank-transfer.md) と過去のコミットを参照してください。
