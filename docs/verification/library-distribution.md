# 共通ライブラリの通常配布確認記録

## 確認対象・方法

- 確認日：2026-10-12（日本時間）。初版の公開日ではありません。
- 対象ソース：コミット `4acf76f94e5038d26b21798d4b999435b1201441` の `src/*.js` のうち、下表の13ライブラリ。
- 配布URL：`https://js.kacsw.or.jp/<ライブラリ名>.js`。候補版・圧縮版ではなく通常配布URLを使用しました。
- デプロイ成功後、通常URLへ `Cache-Control: no-cache` を付けてGETし、取得したバイト列と対象コミットのソースを直接比較しました。
- 全13本でHTTP 200、バイト単位の完全一致、先頭JSDocのバージョン一致を確認しました。取得ファイルのSHA-256は下表のとおりです。
- これは配布内容の確認であり、各利用先のブラウザーキャッシュ更新や実画面での機能・業務条件の検証ではありません。

## ワークフロー結果

対象コミットで次の3ワークフローがすべて成功しました。

- [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/38225495336)：Prettier・ESLint・`npm test` 成功。
- [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/38225495477)：デプロイ成功。
- [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/38225495413)：配布パッケージ作成成功。

通常配布URLの照合対象は上記コミットのソースです。パッケージ作成成功だけで全13本のパッケージ収録を保証するものではありません。

## 照合結果

全行の結果は **HTTP 200・ソース完全一致** です。

| ライブラリ                                             | バージョン | SHA-256                                                            |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------ |
| [bank-transfer](../bank-transfer.md)                   | 1.0.0      | `aec2c01f2e06443416e6fff0aa6afda5cbee1a67941328e6c3b89ee96333d0ba` |
| [csv-builder](../csv-builder.md)                       | 1.0.0      | `f2599bd0ea3d67fea167de7ef058d1938ff61c6ec28cfe4a1a4a0ad6c9864e4e` |
| [csv-parser](../csv-parser.md)                         | 1.0.0      | `4734161c0537843d01fcb300b74e15aee2bbd466da630b1311adc303d90dc65b` |
| [date-utils](../date-utils.md)                         | 1.0.0      | `082d220709fb307b6872e1934dcfdd260b69509f5ddf96f5e20b5b42584b7a11` |
| [kintone-custom-lib](../kintone-custom-lib.md)         | 1.0.0      | `41f98efe72e458672e892fe9ec8b6f0e2a708288a14443daddf103689e42c4de` |
| [kviewer-custom-lib](../kviewer-custom-lib.md)         | 1.1.0      | `601ab10a884a755dbfbbec9faa529269e16d5ed40e14fd334f4b796f2ede010b` |
| [national-holidays](../national-holidays.md)           | 1.0.0      | `fb25e8f11be10b39c2b08d68ae58c8b3ed5d39b9d0092996f43b6ee65065e4dd` |
| [phone-utils](../phone-utils.md)                       | 1.0.0      | `6805e8e62857eb21d90a810255e572fb95d389dcffaa8ba07fcc349c9ad50a0c` |
| [shipping-processing](../shipping-processing.md)       | 1.0.0      | `1843c866286ad787b9e0d207c1044c06e487bd6163c57f28637dd343b72dd75b` |
| [system-utils](../system-utils.md)                     | 1.0.0      | `c6fb038fa6886193f2927cacbdc9fe7e8bce4fed661df11cec93410649fea84d` |
| [text-suite](../text-suite.md)                         | 1.0.0      | `0343dda269c6575e333463b952f577aacf235819a0428bf99f1e9526e06d3e88` |
| [vc-check](../vc-check.md)                             | 1.0.0      | `960df7d80001ac7282f25210a7a7244bf9ad63f641b67e104010ef28cedab939` |
| [zip-code-address-utils](../zip-code-address-utils.md) | 1.0.0      | `8e5b1456bf2071870e999da71eb927983200b3264a45bf717150d3b2320fdead` |

## 再確認手順

1. 確認するソースのコミットを固定し、対象コミットのデプロイ成功を確認する。
2. 各リファレンスの通常配布URLからファイルを取得し、HTTPステータスを確認する。
3. 対象コミットのソースと取得ファイルをバイト単位で比較し、JSDocのバージョンとSHA-256を確認する。
4. 不一致・取得失敗があれば確認済みと記載せず、対象と結果を記録する。
5. 一致した対象のリファレンスと本記録に、確認日・対象コミット・ワークフロー結果を追記する。

## 追加確認：kintone-custom-lib 2.0.0

- 確認日：2026-10-17 04:49（日本時間、UTC+09:00）。
- 対象ソース：マージコミット [`ee59b6d5e81ed18b40a4e7cf8941abe42b23d808`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/ee59b6d5e81ed18b40a4e7cf8941abe42b23d808) の `src/kintone-custom-lib.js`。
- 配布URL：[https://js.kacsw.or.jp/kintone-custom-lib.js](https://js.kacsw.or.jp/kintone-custom-lib.js)。`Cache-Control: no-cache` を付けてGETし、HTTP 200、バイト単位の完全一致、JSDocバージョン `2.0.0` の一致を確認しました。
- SHA-256：`a3ddba7c066eafc5e4161e15ba98578f4b8e20f476e5cac2c781a7c0d1af4e43`（ソース・配布ファイル共通）。
- 対象コミットのワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/38957467251)：成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/38957467044)：本番デプロイ成功。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/38957466986)：配布パッケージ作成成功。
- この確認は通常配布URLの内容一致に関するものです。利用先でのブラウザーキャッシュ更新や実画面動作の確認ではありません。

## 追加確認：51-modern-default.cssの文字色競合対策

- 確認日：2026-10-23 20:54:42（日本時間、UTC+09:00）。
- 対象：共有スタイルシート `51-modern-default.css`（バージョン番号の定義なし）。
- 対象ソース：PR #22のマージコミット [`a4467657be0cefd17c4e617e716a287c165487ef`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/a4467657be0cefd17c4e617e716a287c165487ef) の `src/51-modern-default.css`。
- 変更：部品セレクター11箇所の詳細度を上げ、後から追加される `[class|=kintoneplugin] { color: #333; }` による文字色の上書きを防止しました。
- 配布URL：[https://js.kacsw.or.jp/51-modern-default.css](https://js.kacsw.or.jp/51-modern-default.css)。`Cache-Control: no-cache` を付けてGETし、HTTP 200を確認しました。`git show a4467657be0cefd17c4e617e716a287c165487ef:src/51-modern-default.css` の出力と取得ファイルを `cmp` で比較し、バイト単位の完全一致を確認しました。
- SHA-256：`0ed7a5edbb2a8a845b69b2fcd9c21009f6109bd7851378510ed94f4434b00b3f`（ソース・配布ファイル共通）。
- 対象コミットのワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/39949284841)：Prettier・ESLint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/39949284769)：本番デプロイ成功。配信元は `src/` です。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/39949284792)：配布パッケージ作成成功。ただし既存のコピー対象リストに本CSSはなく、パッケージ収録の確認ではありません。
- ローカル検証：`npm test`、`npm run lint`、`./node_modules/.bin/prettier --check 'src/**/*.{js,css,html}' test/test-modern-default-css.js`、`CI=true node test/test-modern-default-css.js`、`git diff --check` はすべて成功しました。Chromiumで修正前相当と修正後の外観一致、競合CSSの前後配置、ボタンのホバー・フォーカスと入力欄のフォーカス色を検証しました。
- 修正前の利用先実画面では、利用者が競合指定の `color` を一時的に無効化すると青色へ戻ることを確認しました。変更後の利用先実画面動作・ブラウザーキャッシュ更新は未確認です。通常配布の内容一致と実画面検証を区別します。
