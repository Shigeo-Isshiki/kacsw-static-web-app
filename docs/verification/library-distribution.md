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

## 追加確認：bank-transfer 1.0.1のEDI正規化エラー処理

- 確認日：2026-10-24 11:02:22（日本時間、UTC+09:00）。
- 対象ライブラリ：[bank-transfer](../bank-transfer.md) 1.0.1。
- 対象ソース：PR #25のマージコミット [`e9d0fee823f9f259c446bbc8c70325412477984b`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/e9d0fee823f9f259c446bbc8c70325412477984b) の `src/bank-transfer.js`。
- 変更：総合振込のEDI正規化失敗時に生値出力へ切り替えるフォールバックを廃止し、既存のエラー返却で全体の生成を中止。文字種・コンマ禁止・20バイトの正規化仕様や給与／賞与のレコード構成は変更していません。
- 配布URL：[https://js.kacsw.or.jp/bank-transfer.js](https://js.kacsw.or.jp/bank-transfer.js)。`Cache-Control: no-cache` を付けてGETし、HTTP 200を確認しました。`git show e9d0fee823f9f259c446bbc8c70325412477984b:src/bank-transfer.js` の出力と取得ファイルを `cmp` で比較し、バイト単位の完全一致とJSDocバージョン `1.0.1` の一致を確認しました。
- SHA-256：`defc903e1eb99f5c3a2fe35d9f6387547f7f930b5b2029a2ea4b6ae2416d260c`（ソース・配布ファイル共通）。
- 対象コミットのワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40052397090)：Prettier・ESLint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40052397103)：本番デプロイ成功。配信元は `src/` です。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40052397249)：配布パッケージ作成成功。
- ローカル検証：`npm test`、`npm run lint`、`npm run ci-check`、`npm exec -- prettier --check 'src/**/*.{js,css,html}' test/test-bank-transfer-edi.js`、`git diff --check` はすべて成功。EDI正常・空欄・拒否、エラー情報・部分データなし、給与／賞与経路の詳細は [検証記録](bank-transfer.md) を参照してください。
- 取得した通常配布ファイルをNode.jsのモジュール読み込み時に差し替えて `test/test-bank-transfer-edi.js` を実行し、全項目成功を確認しました。銀行・支店検索はテスト用スタブであり、利用先実画面の検証ではありません。
- 呼び出し側のコードが提供されていないため、利用者の了承のもと、実アプリでのエラー表示・ダウンロード中止、ブラウザーキャッシュ更新、金融機関へのアップロードは未確認です。通常配布の内容一致と実画面検証は区別します。

## kintone-custom-lib 2.1.0 の配布前状況

- 記録日：2026-10-25（日本時間、UTC+09:00）。
- 対象ライブラリ：[kintone-custom-lib](../kintone-custom-lib.md) 2.1.0。
- 対象ソース：作業ブランチ `feature/field-code-input-lookup-20261025` の [src/kintone-custom-lib.js](../../src/kintone-custom-lib.js)。ベースコミットは `4aeb24f977126d4c223382e0f91c22bef5c22875`。配布対象コミットは未確定（未プッシュ・未配布）です。
- ローカルソースの SHA-256：`bd58eb16a054edb9faae4d6f92b569b3788c095ab0d3afc07eb01c75a73402cd`。通常配布ファイルのハッシュではありません。
- 変更：`getInputElementsByFieldCodes` の追加、公開登録、API リファレンスとバージョンの更新。利用側アプリの置き換えは行っていません。
- コミット：利用者の承認に基づき、今回の変更を作業ブランチにローカルコミットとして記録。プッシュ・本番配布：未実施。配信日時：なし。別途承認後にブランチ・PR と保護ルールに従って進めます。
- 通常配布URL：<https://js.kacsw.or.jp/kintone-custom-lib.js>。今回の GET・HTTP ステータス確認・バイト照合は未実行、2.1.0 の通常配布は未確認です。確認済み 2.0.0 の過去の証跡は上記のとおり保持します。
- 対象コミットの CI・デプロイ・配布パッケージ作成ワークフロー：未実行。下記のローカルチェック成功は GitHub ワークフロー成功・本番配布を意味しません。
- 利用先の実画面動作・ブラウザーキャッシュ更新：未確認。模擬 DOM と API スタブによる確認とは区別します。

### ローカル検証

[追加テスト](../../test/test-get-input-elements-by-field-codes.js) は模擬 DOM と `getFormFields` のスタブを使い、24 テストすべて成功しました。既存の [kintone テスト](../../test/test-kintone-custom-lib.js) は 25 チェック成功、`npm test` は追加分を含む全 20 ファイルが成功しました。

| 受け入れ項目 | 検証内容 | 結果 |
| --- | --- | --- |
| 1 | `window` への公開 | 成功 |
| 2 | 複数コードで API は 1 回 | 成功 |
| 3 | 従来の番号セレクターと同じ要素 | 成功 |
| 4 | 前後空白の除去・完全一致 | 成功 |
| 5 | 存在しないコード | 成功 |
| 6 | テーブル内も含めた項目名重複 | 成功 |
| 7 | テーブル内コードの除外 | 成功 |
| 8 | `input` のない欄 | 成功 |
| 9 | 画面の一致候補が 2 件 | 成功 |
| 10 | 画面の一致候補が 0 件 | 成功 |
| 11 | `noLabel: true` | 成功 |
| 12 | 複数の理由を警告 1 回に集約 | 成功 |
| 13 | `warn: false` | 成功 |
| 14 | 明示初期化されたモバイル | 成功 |
| 15 | API のない環境 | 成功 |
| 16 | API 失敗時に同じエラーで reject | 成功 |
| 17 | 配列以外の入力 | 成功 |
| 18 | DOM・フォーカス・値・入力イベント登録の非変更 | 成功 |
| 19 | 既存公開関数の回帰テスト | 成功 |

追加で、不正要素と疎配列、空配列、重複コード、クラス名の厳密な判定、トップレベル・非表示項目・テーブル自体との項目名重複、空の項目名、特殊なプロパティ名、URL・グローバル設定でのモバイル判定、API 失敗時の不正入力警告を検証しました。

実行コマンドと結果（リポジトリルート、Windows）:

| コマンド | 結果 |
| --- | --- |
| `node -r .\test\setup-tests.js .\test\test-get-input-elements-by-field-codes.js` | 成功（24 テスト） |
| `node -r .\test\setup-tests.js .\test\test-kintone-custom-lib.js` | 成功（25 チェック） |
| `npm test` | 成功（全 20 ファイル、追加テスト含む） |
| `npm run lint` | 成功 |
| `npx --no-install eslint --config eslint.config.cjs src\kintone-custom-lib.js src\all-window-exports.js` | 成功、警告なし |
| `npm run ci-check` | 成功（ローカル配布物生成・VM の公開確認・Puppeteer） |
| `npx --no-install prettier --check "src/**/*.{js,css,html}" test\test-get-input-elements-by-field-codes.js` | 成功 |
| `git diff --check` | 成功 |

文書の 6 章構成、目次・アンカー、相対リンク、コードフェンス、ソースとのバージョン一致、過去の配布証跡を追記のみで保持していることも確認済みです。

### 2026-10-25：未配布 2.1.0 のモバイル対応追記

- 利用者の承認に基づき、上記 PC 限定版の仕様を PC・モバイル対応へ拡張しました。上記の項目 14「モバイルでは対象外」の結果とハッシュは PC 限定版の履歴です。現在の項目 14 はモバイルでの入力欄取得成功と API 呼び出し 1 回を検証します。未配布の機能追加のためバージョンは 2.1.0 を維持します。
- 対象：作業ブランチ `feature/field-code-input-lookup-20261025` の未コミット変更。ベースは PC 限定版のローカルコミット `a299963395e5420fdf2dbc6e1dddbb53ba9370f9`。現在のソース SHA-256 は `0a23afc9c23c237fbad3ae6b1c46f5c383e100fba610980ba959527edf8f5fc2`（通常配布ファイルのハッシュではありません）。
- 公式仕様：[getFormFields](https://cybozu.dev/ja/kintone/docs/js-api/app/get-form-fields/) は PC・モバイル共通で `kintone.app.getFormFields()` を使用し、両環境の追加・編集画面に対応しています。
- 利用者提供のモバイル画面診断では、モバイル URL、入力要素 49 件、`value-数字` 要素 59 件、`.control-label-text-gaia` は 0 件でした。「申出人（姓）」の入力欄は `.control-gaia` 内の `.control-value-gaia.value-数字` にあり、同じコントロール内の `h3.control-label-gaia` の文字列が項目名と完全一致しました。これは特定画面での構造観測であり、関数の実画面動作確認ではありません。診断に使った番号を実装に固定していません。
- 実装：既存の `_kc_isMobileRuntime()` に従い、PC は `.control-label-text-gaia`、モバイルは `.control-label-gaia` で検索。項目名の完全一致、テーブル内・非表示・重複の除外、API エラー伝播、画面非変更は維持しています。
- ローカル検証：追加テストは更新後 28 件すべて成功。モバイルの明示初期化・URL・グローバル設定、PC 明示設定・リセット、複数コードの API 呼び出し 1 回、完全一致、全除外理由・警告集約・抑制、API 失敗・欠如、DOM・値・フォーカス・入力イベント登録の非変更を確認しました。PC の既存ケースも成功しています。
- 次の正確なコマンドはすべて成功しました。
  - `node -r .\test\setup-tests.js .\test\test-get-input-elements-by-field-codes.js`（28 テスト）
  - `npm test`（既存テストと追加分を含む）
  - `npm run lint`
  - `npx --no-install eslint --config eslint.config.cjs src\kintone-custom-lib.js`（警告なし）
  - `npx --no-install prettier --check "src/**/*.{js,css,html}" test\test-get-input-elements-by-field-codes.js`
  - `npm run ci-check`（ローカル配布物生成・VM・Puppeteer）
  - `git diff --check`
- モバイル変更のコミット・プッシュ・本番配布：未実施。配信日時：なし。配布対象コミットは未確定、対象コミットの GitHub ワークフローは未実行、通常配布 URL の GET・HTTP 確認・バイト照合は未実行です。
- 未確認：利用先の追加・編集両画面での関数の取得結果、必須表示を含む全ラベル構造、実機の日本語入力・autoKana 動作、ブラウザーキャッシュ更新。ラベル文字列が項目名と完全一致しなければ安全のため `null` を返します。模擬 DOM テストや今回の構造観測から、これらを確認済みとは扱いません。

### 2026-10-25：Git 同期の承認

- 利用者から Git 同期の承認を受け、PC・モバイル対応の変更を作業ブランチ `feature/field-code-input-lookup-20261025` でコミット・プッシュする工程へ進みます。上記の未コミット・未プッシュの記述は同期前の記録です。
- 今回の承認範囲は作業ブランチの同期です。`main` へのマージ・本番配布は行いません。配信日時はなく、通常配布確認・対象コミットのワークフロー結果・利用先の実画面動作は未確認です。

## 追加確認：kintone-custom-lib 2.1.0

- 利用者から本番配信までの継続承認を受け、PR #27 を保護ルールに従ってマージしました。上記の未配布・未確認の記述は配布前の履歴として保持します。
- 対象ソース：PR #27 のマージコミット [`ac8a0f47147bcd550e1e0a9903d02292678bbbef`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/ac8a0f47147bcd550e1e0a9903d02292678bbbef)。対象ライブラリは [kintone-custom-lib](../kintone-custom-lib.md) 2.1.0 と、その公開登録を追加した `all-window-exports.js` です。
- 本番デプロイジョブ完了日時：2026-10-25 14:51:41（日本時間、UTC+09:00）。Azure ワークフローの `Build and Deploy Job` の `completed_at` は `2026-10-25T05:51:41Z` です。
- 配布確認日時：2026-10-25 14:52:21（日本時間、UTC+09:00）。UTC では `2026-10-25T05:52:21.113Z`。
- 対象コミットの `main` への push に対応する次のワークフローはすべて成功しました。別コミットの成功や PR プレビュー配信で代用していません。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40167002125)：成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40167002115)：本番デプロイ成功。配信元は `src/`。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40167002034)：配布パッケージ作成成功。
- 通常配布 URL に `Cache-Control: no-cache` を付けて GET し、HTTP 200 と、固定したマージコミットのソースとのバイト単位の完全一致を確認しました。変換なしのソースと直接照合し、候補版・圧縮版・ローカル配信では代用していません。

| 対象・通常配布 URL | HTTP | ソース／配布バイト数 | バージョン | 一致 | SHA-256（ソース・配布共通） |
| --- | --- | --- | --- | --- | --- |
| <https://js.kacsw.or.jp/kintone-custom-lib.js> | 200 | 75458 / 75458 | 2.1.0（両方の JSDoc で確認） | 完全一致 | `0a23afc9c23c237fbad3ae6b1c46f5c383e100fba610980ba959527edf8f5fc2` |
| <https://js.kacsw.or.jp/all-window-exports.js> | 200 | 2901 / 2901 | 定義なし | 完全一致 | `ac8e07c854c555bbb400502a1e9f0ef6b94541d71a638dd46c27315a2db5d9dd` |

- PR #27 の必須 `lint`・`test` とプレビュー配信・パッケージ作成も成功してから、通常のマージ API で反映しました。保護ルールのバイパスは行っていません。
- ローカルの 28 テスト・既存テスト・Lint・Prettier・ローカル CI チェックの結果は上記のモバイル対応追記を参照してください。本確認は通常配布の内容一致であり、利用側アプリの置き換え、追加・編集両画面での関数の取得結果、必須表示などの全条件、実機の日本語入力・autoKana 動作、ブラウザーキャッシュ更新は未確認です。
