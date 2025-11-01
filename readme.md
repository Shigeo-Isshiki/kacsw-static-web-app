# My First Static Web App

This repository is a small static web app used for building and testing
JavaScript utilities for handling Japanese phone numbers, postal codes,
and other helpers.

# Vanilla JavaScript App

[Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/overview) allows you to easily build JavaScript apps in minutes. Use this repo with the [quickstart](https://docs.microsoft.com/azure/static-web-apps/getting-started?tabs=vanilla-javascript) to build and customize a new static site.

This repo is used as a starter for a _very basic_ HTML web application using no front-end frameworks.

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
	- `src/kintone-custom-lib.js`
	- `src/zip-code-address-utils.js`
	- `src/zipcode_processing.js`
	- `src/phone_number_translation.js`
	- `src/phone-utils.js`
	- `src/character_handling.js`
	- `src/date-utils.js`
	- `src/date_handling.js`
	- `src/text-suite.js`
	- `src/financial_institution_processing.js`
	- `src/shipping-processing.js`
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