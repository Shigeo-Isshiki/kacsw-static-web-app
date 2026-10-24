# KACSW Static Web App

![Prepare dist workflow](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/workflows/prepare-dist.yml/badge.svg)

kintone・kViewer向け、および汎用のJavaScript共通ライブラリ集です。必要なライブラリをファイル単位で選び、各リファレンスに従って利用できます。

## 目次

- [概要](#overview)
- [利用方法](#usage)
- [ライブラリ一覧](#docs)
- [開発・ローカル確認](#quickstart)
- [文書・保守・配布管理](#notes)
- [貢献・問い合わせ](#contributing)
- [ライセンス](#license)

<a id="overview"></a>

## 概要

- kintone・kViewerのカスタマイズと、文字列・日付・CSVなどの共通処理を提供します。
- 公開関数、読み込み順、外部APIへの依存、対応環境はライブラリごとに異なります。利用前に対象のリファレンスを確認してください。
- バージョンは各ライブラリの先頭JSDocとリファレンスで管理します。リポジトリ全体の単一バージョンとして扱いません。

<a id="usage"></a>

## 利用方法

通常配布URLは `https://js.kacsw.or.jp/<ライブラリ名>.js` です。利用するライブラリを、呼び出し側のカスタマイズコードより先に読み込んでください。

- **kintone・kViewer**：サービスのJavaScriptカスタマイズ設定に、対象ライブラリの配布URLを登録します。設定方法や利用できるイベントは各サービスの仕様を確認してください。
- **通常のWebページ**：対象ライブラリを `script` タグで読み込みます。例えば、文字列ユーティリティは次のように利用できます。

```html
<script src="https://js.kacsw.or.jp/text-suite.js"></script>
<script>
	console.log(toHalfWidth('ＡＢＣ１２３')); // ABC123
</script>
```

すべてのライブラリを読み込む必要はありません。必要な依存関係と公開方式は、下記の各リファレンスを参照してください。通常配布URLは更新されるため、利用先での更新確認・動作確認も行ってください。

### 共通CSSと文字色の競合

共通関数で生成するボタンなどの外観には、[51-modern-default.css](./src/51-modern-default.css) をCSSカスタマイズとして登録します。通常配布URLは `https://js.kacsw.or.jp/51-modern-default.css` です。共通関数の呼び出し方を変える必要はありません。

2026-10-23のソース変更では、他のCSSが後から `[class|=kintoneplugin] { color: #333; }` を追加しても、通常・無効・ダイアログボタン、入力欄、アラートなどの既定の文字色を維持するよう、各部品のセレクターに `[class]` を追加しました。既存クラスの対象要素は変えずに詳細度を上げ、入力欄のフォーカス色も維持します。`!important` は使いません。より強い指定、インライン指定、子要素自身の色指定との競合は対象外です。既存の独自CSSで部品色を上書きしている場合は、そのセレクターの詳細度も確認してください。

回帰テストは `node test/test-modern-default-css.js` で実行できます（既存のPuppeteerと対応するChromeが必要です）。2026-10-23（日本時間）に、コミット `a4467657be0cefd17c4e617e716a287c165487ef` の本番デプロイ成功と通常配布URLの内容一致を確認しました（[配布確認記録](./docs/verification/library-distribution.md#追加確認51-modern-defaultcssの文字色競合対策)）。変更後の利用先実画面での動作・ブラウザーキャッシュ更新は未確認です。

<a id="docs"></a>

## ライブラリ一覧

各リンク先に、配布URL・依存関係・公開関数・バージョン・制約を記載しています。

| ライブラリ             | 主な用途                         | リファレンス                                       |
| ---------------------- | -------------------------------- | -------------------------------------------------- |
| bank-transfer          | 全銀データの生成・銀行営業日判定 | [銀行振込](./docs/bank-transfer.md)                |
| csv-builder            | スキーマに基づくCSV生成          | [CSVビルダー](./docs/csv-builder.md)               |
| csv-parser             | CSVの解析                        | [CSVパーサー](./docs/csv-parser.md)                |
| date-utils             | 日付・和暦の変換                 | [日付](./docs/date-utils.md)                       |
| kintone-custom-lib     | kintoneのカスタマイズ共通処理    | [kintone](./docs/kintone-custom-lib.md)            |
| kviewer-custom-lib     | kViewerの表示制御などの共通処理  | [kViewer](./docs/kviewer-custom-lib.md)            |
| national-holidays      | 日本の祝日判定                   | [国民の祝日](./docs/national-holidays.md)          |
| phone-utils            | 電話番号の検証・整形             | [電話番号](./docs/phone-utils.md)                  |
| shipping-processing    | 配送処理の補助                   | [配送処理](./docs/shipping-processing.md)          |
| system-utils           | パスワード生成・マスクなど       | [システム](./docs/system-utils.md)                 |
| text-suite             | 文字列変換・正規化               | [文字列](./docs/text-suite.md)                     |
| vc-check               | ビデオ会議情報の検証             | [ビデオ会議](./docs/vc-check.md)                   |
| zip-code-address-utils | 郵便番号・住所の処理             | [郵便番号・住所](./docs/zip-code-address-utils.md) |

<a id="quickstart"></a>

## 開発・ローカル確認

リポジトリを取得した後、そのルートで実行します。Node.js 20以上とnpmが必要です。CIと開発依存関係に合わせ、ローカルでもNode.js 20以上を使用してください。

```bash
npm ci         # ロックファイルに従って開発依存関係を導入
npm run lint   # 静的解析
npm test       # 既存テスト
npm start      # ローカル配信（http://localhost:8000）
```

ローカル起動後は、まず以下のURLを開くと全体像を把握しやすくなります。

- http://localhost:8000/ ：[入口ページ](./src/index.html)
- http://localhost:8000/test.html ：[個別スクリプト確認ページ](./src/test.html)
- http://localhost:8000/test-all-scripts.html ：[一括読み込み確認ページ](./src/test-all-scripts.html)

### URL と JavaScript ファイルの対応

`npm start` は [src/](./src/) を配信します。例えば [text-suite.js](./src/text-suite.js) は http://localhost:8000/text-suite.js で確認できます。ローカルでの確認は、通常配布URLへの反映確認とは別です。

詳細なテスト・データ更新方法は [保守・開発手順](./docs/maintenance/library-maintenance.md) を参照してください。

<a id="notes"></a>

## 文書・保守・配布管理

- [文書作成標準](./docs/README.md)：APIリファレンスの構成、バージョン、履歴の記載ルール
- [保守・開発手順](./docs/maintenance/library-maintenance.md)：テスト環境、データ更新など
- [リリース・通常配布確認の標準手順](./docs/README.md#リリース通常配布確認の標準手順)：配布対象コミットの固定、ワークフロー確認、通常URLとの照合
- [通常配布確認記録](./docs/verification/library-distribution.md)：確認日、対象コミット、配布ハッシュ、確認結果
- [kViewerの調査・検証記録](./docs/verification/kviewer-custom-lib.md)・[銀行振込の検証記録](./docs/verification/bank-transfer.md)：個別の検証結果と未確認事項

配布パッケージの作成コマンドは `npm run prepare:dist` と `npm run zip` です。パッケージ作成、デプロイ成功、通常配布URLの内容一致、利用先の実画面動作は別々に確認します。ソースの変更と配布は、貢献ガイドと上記の標準手順に従ってください。

<a id="contributing"></a>

## 貢献・問い合わせ

- 貢献方法については [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

<a id="contact"></a>

### 問い合わせ・不具合報告

Issue を作成する際に記載していただきたい最小限の項目:

- 件名（短い要約）
- 再現手順（できるだけ簡潔に）
- 期待される挙動
- 実際の挙動（エラーメッセージやスクリーンショットがあれば添付）
- 実行環境（Node バージョン、OS など）
- 最小再現コードまたは該当ファイルの参照

報告先は [GitHub Issues](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/issues) です。個人情報・認証情報・アクセストークンを含むログは掲載しないでください。

<a id="license"></a>

## ライセンス

このプロジェクトは MIT ライセンスで公開されています。詳細は [LICENSE](./LICENSE) を参照してください。
