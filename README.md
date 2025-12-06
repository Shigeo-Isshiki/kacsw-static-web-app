# KACSW Static Web App

![Prepare dist workflow](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/workflows/prepare-dist.yml/badge.svg)

This repository is a small static web app used for building and testing
JavaScript utilities for handling Japanese phone numbers, postal codes,
and other helpers.

## ドキュメントとリファレンス

このリポジトリで公開しているユーティリティについて、使い方やスキーマ仕様、実用サンプルをまとめた「使い方リファレンス」は `docs/` に格納しています。今後さらにモジュールが増えることを想定して、モジュールごとの参照をここに一覧化していきます。

主なドキュメント:

- 銀行振込ユーティリティ（使い方リファレンス） — `src/bank-transfer.js` の仕様、正規化ルール、EDI（振込ファイル）生成のサンプルを含みます。
  - ドキュメント: [銀行振込ユーティリティ 使い方リファレンス — docs/bank-transfer.md](./docs/bank-transfer.md)
- CSV ビルダー（使い方リファレンス） — `src/csv-builder.js` のスキーマ仕様、`map` / `mapMode` の挙動、formatter の実例などを含みます。
  - ドキュメント: [CSV ビルダー 使い方リファレンス — docs/csv-builder.md](./docs/csv-builder.md)
- 日付ユーティリティ（使い方リファレンス） — `src/date-utils.js` の仕様、和暦/漢数字変換、利用例を含みます。
  - ドキュメント: [日付ユーティリティ 使い方リファレンス — docs/date-utils.md](./docs/date-utils.md)
- kintone カスタムユーティリティ（使い方リファレンス） — `src/kintone-custom-lib.js` の公開ヘルパー（notify / setSpaceField / setRecordValues など）、サニタイズやダイアログ生成の振る舞いをまとめています。
  - ドキュメント: [kintone カスタムライブラリ 使い方リファレンス — docs/kintone-custom-lib.md](./docs/kintone-custom-lib.md)
- 電話番号ユーティリティ（使い方リファレンス） — `src/phone-utils.js` の仕様、正規化・判定ルール、使用例を含みます。
  - ドキュメント: [電話番号ユーティリティ 使い方リファレンス — docs/phone-utils.md](./docs/phone-utils.md)
- システムユーティリティ（使い方リファレンス） — `src/system-utils.js` に含まれるパスワード生成、マスク表示、読み仮名変換などの小さなユーティリティ群。
  - ドキュメント: [システムユーティリティ 使い方リファレンス — docs/system-utils.md](./docs/system-utils.md)
- 文字列ユーティリティ（使い方リファレンス） — `src/text-suite.js` の全角/半角変換やかな相互変換、メール検証などの仕様をまとめています。
  - ドキュメント: [文字列ユーティリティ 使い方リファレンス — docs/text-suite.md](./docs/text-suite.md)
- その他のライブラリ — `phone-utils` の使い方ドキュメントは追って追加します（coming soon）。

銀行振込データ作成機能を利用する場合はまず上記の 銀行振込ユーティリティリファレンスを参照してください。
CSV 機能を利用する場合はまず上記の CSV ビルダーリファレンスを参照してください。

# Vanilla JavaScript App

[Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/overview) allows you to easily build JavaScript apps in minutes. Use this repo with the [quickstart](https://docs.microsoft.com/azure/static-web-apps/getting-started?tabs=vanilla-javascript) to build and customize a new static site.

This repo is used as a starter for a _very basic_ HTML web application using no front-end frameworks.

## 今回の追加・変更 (2025-11-03)

このリポジトリに対して最近行った主要な変更点と、ローカルでの確認手順をまとめます。

- 追加/変更された主なファイル・仕組み:
  - `.prettierrc` を追加して Prettier のルールを固定化しました（例: singleQuote, trailingComma, printWidth など）。
  - `src/all-window-exports.js` を追加 — 公開 API を安全に `window` に露出するためのヘルパー（既に定義されている識別子のみを添付し、既存のグローバルを上書きしないようになっています）。
  - ブラウザ検証用のテストページを追加: `src/test.html`, `src/test-only.html`, `src/test-all-scripts.html`。
  - `src/bank-transfer.js` を追加/更新 — kintone 向けの銀行振込ユーティリティ。
    - `getBank(input, callback)` はコールバック必須の非同期 API に変更しました（同期返却は廃止）。
    - `getBank` がコールバックで返す `kana` は半角カタカナ化され、長音記号や類似ダッシュはすべて半角ハイフン `-` に正規化されます。
  - 自動チェック用スクリプトを追加: `scripts/check-window-vm.js`（Node の VM 上での確認）、`scripts/puppeteer-check.js`（ヘッドレスブラウザでの確認）、`scripts/auto-check.js`（ファイル変更を監視して再実行）。
  - CI ワークフローを追加/更新: `.github/workflows/prepare-dist.yml`（Prettier/ESLint/prepare:dist を実行して PR をブロックする設定）。

- ローカルでの推奨確認手順（開発者向け）:

```bash
npm install
npm run format       # Prettier でコード整形
npm run lint         # ESLint のチェック
npm run lint:fix     # 可能な自動修正
npm run ci-check     # prepare:dist -> Node VM チェック -> Puppeteer ブラウザチェック
npm run prepare:dist # dist を作成
npm start            # src をローカル配信（http://localhost:8000）
```

- CI でよくある失敗と対処の指針:
  - Prettier のチェックに失敗した場合: `npm run format` を実行して整形後にコミットしてください。
  - ESLint エラーで止まる場合: `npm run lint` / `npm run lint:fix` を使って原因を確認・修正してください。

- 注意事項:
  - `window` に公開する際は、該当識別子が定義された後に公開してください（TDZ による未定義参照を避けるため）。`all-window-exports.js` はその補助をしますが、読み込み順を保証することも重要です。
  - GitHub Actions の詳細ログ（特にアーティファクトや ZIP ログ）はリポジトリの権限に依存します。取得できない場合はリポジトリ管理者に確認してください。

## 今回の変更 (2025-11-09)

以下はこの作業セッションで `src/bank-transfer.js` を中心に行った主な変更点です。kintone 側および銀行ファイル生成向けのフォーマットと検証を強化しました。

- SJIS バイト長関連ヘルパを追加
  - `_bt_sjisByteLength` / `_bt_sjisTruncate` による SJIS 相当バイト長での計測・切り詰めを実装しました。
- 受取人名・口座番号の正規化
  - `normalizePayeeName`（最大 30 バイト、半角カタカナ化や長音・ダッシュの正規化など）を追加しました。
  - `normalizeAccountNumber`（7 桁ゼロ埋め）を追加しました。
- 固定長 120 バイトレコードの厳格化
  - ヘッダ / データ / トレーラ / エンドレコードを厳密に 120 バイトで生成するようにしました。
  - 内部的に `_bt_generateDataRecordStrings`、`_bt_generateTrailerString`、`_bt_generateEndRecordString` を実装しています。
  - 公開 API は従来互換のためコールバック方式に統一しています。
- 失敗時の挙動を fail-fast に変更
  - レコード処理中に不正なフィールドが見つかった場合は即座にエラーを返し、処理を中断します（スキップ動作は行いません）。
- EDI 正規化の公開
  - `normalizeEdiInfo(input, options)` を公開し、kintone とバンクデータの EDI 生成で同じルールを使うようにしました。
  - カンマ（半角 `,` および全角 `，`）は許可せず、検出時はエラーを返します。
- 口座種別の検証強化
  - `toAccountType` を必須化し、無効な値はすぐにエラーとなるようにしました。
- 営業日判定ヘルパ追加
  - `nextBankBusinessDay`（デフォルト締切 18 時）を追加しました。
- 全体ファイル生成のオーケストレーション追加
  - `generateZenginData(headerData, records, callback)` を実装し、ヘッダ→データ→トレーラ→エンドを組み合わせて CRLF で結合した文字列を返します。
- テスト整理
  - 作業中に追加した単体テスト群はユーザの要望により削除され、`package.json` の `test` スクリプトは "No tests" に変更しています。

簡易な確認例:

```bash
node -e "global.window={}; global.fetch = () => Promise.resolve({ok:true,json:async()=>({})}); require('./src/bank-transfer.js'); console.log(global.window.BANK.normalizeEdiInfo('テスト',{padToBytes:true}));"
```

必要であれば、このセクションの英語版や詳細な互換性ルール（エラーオブジェクトの仕様など）を追記します。ご希望があれば教えてください。

This repo has a dev container. This means if you open it inside a [GitHub Codespace](https://github.com/features/codespaces), or using [VS Code with the remote containers extension](https://code.visualstudio.com/docs/remote/containers), it will be opened inside a container with all the dependencies already installed.

## ローカル開発（日本語）

このリポジトリは kintone カスタマイズ用の個別 JavaScript ファイル群を含んでいます。ローカルで動作確認をするための簡単な手順を示します。

- 依存パッケージをインストール:

```bash
npm install
```

- ローカル静的サーバを起動（`src` を公開）:

```bash
npm start
# ブラウザで http://localhost:8000 を開く
```

`npm start` は `sirv` を使って `./src` を配信します（`package.json` の `start` スクリプトに定義）。

## kintone 用パッケージ作成

個別の `.js` をそのまま kintone アプリに登録する運用を想定しています。配布用に選択したファイルを `dist/` にまとめて ZIP 化する簡単な手順:

- dist を準備して ZIP 化（例）:

```bash
npm run prepare:dist || true
npm run zip
# 生成される package.zip を kintone にアップロードしてください
```

（注）`prepare:dist` スクリプトは `package.json` に定義できます。現状のリポジトリには `zip` スクリプトがあり、`dist` 内のファイルを `package.zip` にまとめます。

## 注意事項

- kintone 側から呼び出される関数はグローバルに公開されている必要があります（`window.xxx = ...`）。ただしファイルのロード順や一時的な未初期化（TDZ）に注意してください。安全なパターンとしては関数定義後にファイル末尾で `window` に公開する方法です。
- 開発チームで環境を揃えるため、`package.json` と `package-lock.json` をリポジトリにコミットしています。

---

必要なら、この README に具体的なファイル一覧や `prepare:dist` のサンプルを追加します。どのファイルを配布対象にするか教えてください。

## 配布対象ファイル（例）

通常 kintone に登録する配布対象ファイルの例を以下に示します。プロジェクト構成に合わせて個別に選択して下さい。

- JavaScript ユーティリティ（主に kintone 上で利用するファイル）
  - `src/date-utils.js`
  - `src/kintone-custom-lib.js`
  - `src/phone-utils.js`
  - `src/shipping-processing.js`
  - `src/text-suite.js`
  - `src/zip-code-address-utils.js`
  - `src/zipcode_processing.js`
  - `src/phone_number_translation.js`
  - `src/character_handling.js`
  - `src/date_handling.js`
  - `src/financial_institution_processing.js`
  - `src/vc-check.js`
  - `src/password_generation.js`
  - `src/jquery.autoKana.js` (必要なら)

- 静的アセット / テンプレート
  - `src/index.html` （ローカルでの確認用）
  - `src/styles.css` （必要なら）

- 画像等のリソース
  - `src/image/` ディレクトリ内のファイル（必要に応じて）

メモ:

- kintone のアプリ設定で「JavaScript/CSSで読み込むファイル」を登録する際は、依存関係の順番（ユーティリティ → それを使うコード）を守ってください。
- もし配布対象を固定化したい場合は、`prepare:dist` スクリプトで上記ファイルのみを `dist/` にコピーするようにしておくと便利です。

## コミット前の自動整形（husky + lint-staged）

このリポジトリでは `husky` と `lint-staged` を使い、コミット前にステージされたファイルへ自動で Prettier による整形を実行する仕組みを導入しています。これにより、コードスタイルのばらつきを防ぎ、CI での指摘を減らせます。

セットアップ（開発者がローカルで最初に行うこと）:

1. 依存パッケージをインストールします。

```bash
npm install
```

2. 通常はこれで事足ります。`husky` は `package.json` の `prepare` スクリプトに設定されており、`npm install` 実行時に自動で Git フックが有効になります。したがって、`npx husky install` を手動で実行する必要はありません。

コミット時の挙動:

- ステージされた `src/**/*.{js,css,html}` ファイルに対して `prettier --write` が自動実行されます（lint-staged の設定）。
- 自動整形された変更はコミットに含められます。

### lint-staged の自動拡張

現在の設定では、コミット前に以下が実行されます:

- `prettier --write` — コード整形
- `eslint --fix` — 可能な ESLint の問題を自動修正

これにより、スタイルだけでなく軽微な ESLint ルール違反（例えば不要なセミコロン、インデント、簡単な未使用の修正など）が自動で修正され、開発者の手間が減ります。

もし `eslint --fix` が原因で望ましくない変更が自動挿入された場合は、コミット前に `git diff` で変更を確認してからコミットしてください。

## よくある CI 失敗例と対処法

以下は本リポジトリの CI（GitHub Actions）でよく起きる失敗例と対処法です。

1. Prettier のチェックに失敗する
   - 症状: Actions のログに `prettier --check` が失敗したと表示される。
   - 対処: ローカルで `npm run format` を実行してコードを整形し、整形後のファイルをコミットしてください。自動整形は `lint-staged` によりコミット時に適用されるはずですが、IDE の差分や空白設定の違いで残る場合があります。

2. ESLint がエラーで止まる
   - 症状: `npx eslint "src/**/*.js"` がエラーで終了する。
   - 対処: ローカルで `npm run lint` を実行してエラー箇所を確認し、必要に応じて `npm run lint:fix` を実行して自動修正してください。自動修正できない問題は手動で修正して再度コミットします。

3. workflow の `prepare:dist` ステップでファイルが見つからない
   - 症状: Actions で `npm run prepare:dist` が実行された際に cp エラーやファイルがない旨のログが出る。
   - 対処: README の配布対象リストに従って `src/` に対象ファイルが存在するか確認してください。もしファイル名を変更した場合は `package.json` の `prepare:dist` スクリプトを更新してください。

4. package.zip が生成されない／アップロードされない
   - 症状: Actions は通るがアーティファクトが生成されていない。
   - 対処: `npm run zip` をローカルで実行し、`package.zip` が作られるか確認します。`dist/` の中身を確認し、必要なファイルがコピーされているかチェックしてください。

5. Husky フックがローカルで動作しない
   - 症状: コミット時に自動整形が走らない。
   - 対処: `npm ci` を実行してフックを再生成し、必要なら `npm run prepare` を実行してください（通常 `npm install` 時に自動で有効化されます）。また Git の設定で `core.hooksPath` が上書きされていないか確認してください。

---

トラブルシューティング:

- もしフックが動作しない場合は、依存を再インストールしてから手動で準備スクリプトを実行できます:

```bash
npm ci
npm run prepare
```

---

## getBank と kana 正規化について

このライブラリの `getBank` は kintone を主対象にしたコールバック形式を採用しています。以下の点に注意してください。

- 呼び出しシグネチャ（推奨）: `getBank(input, (result) => { ... })`
  - single-arg スタイルを推奨します（kintone の既存のユーティリティに合わせた形）。
  - 成功時は銀行オブジェクト（例: `{ code:'0138', name:'横浜銀行', kana:'ﾖｺﾊﾏｷﾞﾝｺｳ' }`）を渡します。
  - 失敗時は `{ error: 'メッセージ' }` の形で返します。

- Node 互換: 宣言引数が 2 個以上あるコールバック関数を渡した場合は (err, res) 形式でも呼び出します。
  - 互換性のための保険です。基本的には single-arg を使ってください。

- kana 正規化ルール
  - Web API（BankKun 等）から取得した `kana` フィールドは、ライブラリ内部で可能な限り「半角カタカナ」に変換します。
  - 長音記号（`ー` 等）は半角ハイフン `-` に正規化します。
  - また、API 側で全角英数字（例: `ＵＦＪ`）が入っている場合は半角 ASCII（`UFJ`）へ変換し、英字は大文字化します。
  - 注意: API が `kana` にカタカナでの発音（例: `ユ-エフジェイ`）を入れている場合、ライブラリはそれを自動的に英字略称 `UFJ` に置換することは行いません（略称辞書による置換は将来的な拡張です）。

この挙動により、kintone 側では一貫した半角カタカナ/ASCII 表記で `kana` を扱うことができます。

### VSCode の JSON スキーマ自動取得の切替（オン / オフ）

開発中に VSCode が外部の JSON スキーマを自動取得しようとして一時的に取得できない場合、エディタ上にスキーマ取得エラーが表示されることがあります。
以下は簡単な切替手順です。

- ワークスペースで無効にする（推奨: オフライン時や外部スキーマの取得に問題がある場合）:
  1.  リポジトリルートに `.vscode/settings.json` を作成・編集します。
  2.  次の設定を追加します（既にある場合は上書き/編集してください）:

```json
{
	"json.schemaDownload.enable": false,
	"json.validate.enable": true
}
```

- ワークスペースで有効にする（オンライン環境で自動取得を許可する場合）:
  - `.vscode/settings.json` の `json.schemaDownload.enable` を `true` に変更します。
  - または VSCode の設定 UI（Preferences → Settings）で `json.schemaDownload.enable` を検索してトグルしてください。

- ローカルのスキーマを使いたい場合（安定した検証が必要な場合）:
  1.  必要なスキーマファイルをリポジトリ内の `./schemas/` 等に保存します。
  2.  `.vscode/settings.json` に `json.schemas` を追加してローカルファイルにマッピングします。例:

```json
{
	"json.schemas": [
		{
			"fileMatch": ["/package.json"],
			"url": "./schemas/package.json"
		}
	]
}
```

これにより VSCode は外部フェッチの代わりにローカルスキーマを使って JSON を検証します。

簡潔に言えば: ネットワーク環境や CI に依存せず安定して編集したければローカルスキーマを使い、問題がなければ自動取得を有効化しておく、という運用が便利です。

## API: エラー構造（Structured Error）

`bank-transfer.js` の公開 API（例: `convertYucho`）は、エラー時に単純な文字列だけでなく、kintone 側でどのフィールドにエラーを表示すべきかを判断できるように「構造化エラー」を返します。下記は仕様の抜粋です。

- 返却型: ErrorResult（オブジェクト）
  - `error` (string) — エラー識別子または簡易メッセージ（互換性のため常に設定されます）
  - `message` (string, optional) — ユーザー向けの説明文（日本語）
  - `code` (string, optional) — 詳細なプログラム向けエラーコード（例: `kigou.not_5_digits`）
  - `field` (string, optional) — エラー対象フィールド。主に以下のいずれかになります:
    - `kigou` (ゆうちょ記号)
    - `bangou` (ゆうちょ番号)
    - `bank` (銀行情報の取得)
    - `branch` (支店情報の取得)
    - `both` (記号・番号の両方)
    - `other` (その他/汎用)
  - `details` (object, optional) — 開発者向けの追加情報（正規化後の値など）。

例:

```json
{
	"error": "invalid_format",
	"code": "kigou.not_5_digits",
	"field": "kigou",
	"message": "記号は5桁の数字である必要があります",
	"details": { "raw": "１２３", "normalized": "123" }
}
```

kintone 側では `field` を見て該当フィールドにエラーメッセージを表示する実装が推奨されます（例: `app.record.setFieldError('記号フィールドコード', res.message)`）。

```

```
