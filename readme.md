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