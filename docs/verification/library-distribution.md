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

### 配布記録 PR #28 のプレビュー環境上限

- 配布証跡のみの PR #28 の初回チェックは、必須 `lint`・`test` とパッケージ作成が成功しましたが、[Azure プレビュー配信](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40167301022) は `This Static Web App already has the maximum number of staging environments` で失敗しました。本番コミット `ac8a0f4` の成功とは別の実行です。
- [削除なしのクリーンアップ診断](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/40167587226) は成功しましたが、既存処理は安全に削除可能な候補を認識しませんでした。環境の削除やクリーンアップ処理の変更は行っていません。
- 利用者はプレビュー失敗を明記したうえで、文書 PR を通常の保護ルール（必須 `lint`・`test`）に従ってマージすることを承認しました。文書のみの変更であり、ソース・ハッシュ・本番配布の既存証跡は変更しません。必須チェックの回避や管理者バイパスは行いません。

## 追加確認：formbridge-custom-lib 1.0.0

- 利用者から、PR #29 のAzureプレビュー失敗を承知したうえで、`main` へのマージとpush起点の本番反映を承認されました。PR #29 は保護ルールに従ってマージし、必須チェックを回避していません。
- 対象ソース：PR #29 のマージコミット [`a14b905c7606f9d2b3d2e7f96c6f84225eb70ed5`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/a14b905c7606f9d2b3d2e7f96c6f84225eb70ed5)、`src/formbridge-custom-lib.js`、バージョン **1.0.0**。
- 対象コミットの `main` へのpushに対応するワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41059987731)：lint・test成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41059987749)：`Build and Deploy Job` 成功。完了日時は2026-10-30 22:03:34（日本時間、UTC+09:00）。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41059987752)：整形確認・lint・`prepare:dist`・package.zip作成成功。
- 通常配布確認日時：2026-10-30 22:04:30（日本時間、UTC+09:00）。通常URL `https://js.kacsw.or.jp/formbridge-custom-lib.js` に `Cache-Control: no-cache` を指定してGETし、HTTP 200、対象コミットのソースとのバイト単位の完全一致、JSDocバージョン **1.0.0** を確認しました。

| 対象・通常配布 URL                                | HTTP | ソース／配布バイト数 | バージョン                  | 一致     | SHA-256（ソース・配布共通）                                        |
| ------------------------------------------------- | ---- | -------------------- | --------------------------- | -------- | ------------------------------------------------------------------ |
| <https://js.kacsw.or.jp/formbridge-custom-lib.js> | 200  | 9279 / 9279          | 1.0.0（両方のソースで確認） | 完全一致 | `f2ce6d7849669f3f5588aeb02dec36f127626f03d4db3137832573274f6d024f` |

- PR #29 のプレビューAzureワークフローは `Error: Could not detect the language from repo.` で失敗しました。これはPRイベントでの実行であり、マージ後の `main` pushに対するAzure本番デプロイ成功とは別の結果です。
- 上記の失敗原因の訂正（2026-10-31、日本時間）：[同プレビュー実行ログ](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41059700148)では、言語判定エラー後も既存の静的ファイルを使用して処理を継続しています。最終的な失敗理由は `This Static Web App already has the maximum number of staging environments`（プレビュー環境数の上限到達）でした。言語判定の省略と環境数の解消は別の対応です。本番配布の照合結果は変わりません。
- 通常配布の内容一致を確認しました。FormBridge利用フォームでの実画面動作、各フィールド型の値適合性、ブラウザーキャッシュの更新は未確認です。

## 追加確認：formbridge-custom-lib 1.0.1

- 確認日時：2026-10-31 09:40:31（日本時間、UTC+09:00）。
- 対象ライブラリ：`formbridge-custom-lib` **1.0.1**。利用者の修正・配布依頼によりPR #33を保護ルールに従ってマージしました。対象ソースはマージコミット [`3a8cb6d20be64281281214aa4e4caa562e27af62`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/3a8cb6d20be64281281214aa4e4caa562e27af62) の `src/formbridge-custom-lib.js` です。
- 対象コミットのワークフロー結果：
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41151339780)：lint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41151339943)：本番デプロイ成功。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41151339912)：非圧縮配布物生成・パッケージ作成成功。
- 通常URLへ `Cache-Control: no-cache` を指定してGETし、HTTP 200、JSDocバージョン1.0.1、対象コミットのソースとのバイト単位の完全一致を確認しました。

| 対象・通常配布 URL | HTTP | ソース／配布バイト数 | バージョン | 一致 | SHA-256（ソース・配布共通） |
| --- | --- | --- | --- | --- | --- |
| <https://js.kacsw.or.jp/formbridge-custom-lib.js> | 200 | 9527 / 9527 | 1.0.1 | 完全一致 | `08ab66e846778a223141cd7aa4032bb9234297e44776c8f91c07e44e10ded26e` |

- グローバル `const formBridge` と `window.formBridge` 未定義の組み合わせは、Nodeのvmによる自動テストで再現し、依存確認・全公開操作・`fn` の遅延利用と置換を検証済みです。
- 修正後の実FormBridge画面での読み込み・表示・送信、ブラウザーキャッシュの更新は未確認です。配布一致と実画面検証を混同しません。

## 追加確認：text-suite 1.2.0

- 確認日時：2026-10-31 10:40:51（日本時間、UTC+09:00）。
- 対象ライブラリ：`text-suite` **1.2.0**。PR [#36](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/pull/36)をマージしました。対象ソースはマージコミット [`ec932c0aeeaaf8ec505c7dc41690266dec4cd025`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/ec932c0aeeaaf8ec505c7dc41690266dec4cd025) の `src/text-suite.js` です。
- 対象コミットのワークフロー結果：
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41156391378)：lint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41156391396)：本番デプロイ成功。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41156391377)：非圧縮配布物生成・パッケージ作成成功。
- 通常URL <https://js.kacsw.or.jp/text-suite.js> に `Cache-Control: no-cache` を指定してGETし、HTTP 200、JSDocバージョン1.2.0、対象コミットのソースとのバイト単位の完全一致を確認しました。

| 対象・通常配布 URL                     | HTTP | ソース／配布バイト数 | バージョン | 一致     | SHA-256（ソース・配布共通）                                        |
| -------------------------------------- | ---- | -------------------- | ---------- | -------- | ------------------------------------------------------------------ |
| <https://js.kacsw.or.jp/text-suite.js> | 200  | 52251 / 52251        | 1.2.0      | 完全一致 | `7b045826550851e5f1b399f863ac4d0e552301120d34388949ab9e50e4f877b8` |

- FormBridgeの実画面でのイベント動作・値反映・エラー表示と、利用フォーム上のブラウザーキャッシュ更新は未確認です。通常配布の一致と実画面検証を混同しません。

## 追加確認：formbridge-custom-lib 1.1.0

- 確認日時：2026-10-31 11:09:28（日本時間、UTC+09:00）。text-suite 1.2.0と同じデプロイで配布されました。
- 対象ソースはマージコミット [`ec932c0aeeaaf8ec505c7dc41690266dec4cd025`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/ec932c0aeeaaf8ec505c7dc41690266dec4cd025) の `src/formbridge-custom-lib.js` です。対象コミットのCI・デプロイ・パッケージ作成結果は[同じデプロイの記録](#追加確認text-suite-120)を参照してください。
- 通常URL <https://js.kacsw.or.jp/formbridge-custom-lib.js> に `Cache-Control: no-cache` を指定してGETし、HTTP 200、JSDocバージョン1.1.0、対象コミットのソースとのバイト単位の完全一致を確認しました。

| 対象・通常配布 URL                                | HTTP | ソース／配布バイト数 | バージョン | 一致     | SHA-256（ソース・配布共通）                                        |
| ------------------------------------------------- | ---- | -------------------- | ---------- | -------- | ------------------------------------------------------------------ |
| <https://js.kacsw.or.jp/formbridge-custom-lib.js> | 200  | 10862 / 10862        | 1.1.0      | 完全一致 | `e631a11f372f3d84b1ef90b497f1f729ce8de8e5f04e5e2ced7536d715526c49` |

- FormBridge実画面での関数読み込み・表示・送信、ブラウザーキャッシュ更新は未確認です。通常配布の一致と実画面検証を混同しません。

## 利用者によるFormBridge実画面確認報告（2026-10-31）

- 報告受領日時：2026-10-31 20:42（日本時間、UTC+09:00）。実際の検証実施時刻は未提示です。
- text-suite 1.2.0とformbridge-custom-lib 1.1.0のリリースに関する利用者報告として、実FormBridge画面での「イベント動作・値反映・エラー表示」は問題なく完了したと確認しました。AIによる実画面の直接検証ではありません。
- 上記の各配布確認時点の「実画面未確認」という記録は履歴として保持し、この報告を後続の確認結果として追記します。配布対象コミット・ハッシュ・ワークフローの証跡は変更しません。
- 対象フォーム、実画面で読み込まれたファイルの版数・ハッシュ、通常フィールド／サブテーブル別の検証内訳は未提示です。送信・確認画面への遷移、全オプション・境界値・権限別動作、ブラウザーキャッシュ更新まで確認済みとは扱いません。

## 追加確認：phone-utils 1.1.0

- 確認日時：2026-10-31 21:10:39～21:10:40（日本時間、UTC+09:00）。
- 対象ソース：PR #40のマージコミット [`5dee887a9f93d793d5c82c8eb8014e4dc83b10ff`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/5dee887a9f93d793d5c82c8eb8014e4dc83b10ff) の `src/phone-utils.js` と `src/all-window-exports.js`。
- 利用者からコミット・push・PR作成・mainマージ・自動本番デプロイの承認を受けて実施しました。個別フォームは変更していません。
- 対象コミットのワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41199840866)：Prettier・ESLint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41199840883)：本番デプロイ成功。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41199840902)：配布パッケージ作成成功。
- デプロイ成功後、通常URLへ `Cache-Control: no-cache` を指定してGETし、HTTP 200と対象コミットのソースとのバイト単位の完全一致を確認しました。phone-utilsのJSDocバージョンは `1.1.0` です。

| 対象・通常配布 URL | HTTP | ソース／配布バイト数 | バージョン | 一致 | SHA-256（ソース・配布共通） |
| --- | --- | --- | --- | --- | --- |
| <https://js.kacsw.or.jp/phone-utils.js> | 200 | 42853 / 42853 | 1.1.0 | 完全一致 | `8fbb236db79f0e56b0467d22607d5f6c8215f9d202b37dba4bef5db086e7f5b2` |
| <https://js.kacsw.or.jp/all-window-exports.js> | 200 | 3129 / 3129 | 定義なし | 完全一致 | `adee9a515aaa343afe773b5f59f461d3c4135fdc8c7991c5d50085d23bfa5016` |

- ローカルの `npm test`、`npm run lint`、`npm run build`、`npm run ci-check`、`git diff --check` は成功しました。文書構造・リンク・コードフェンス・バージョン・両環境のメッセージ順序も確認しました。
- 今回追加した電話番号ハンドラーの実FormBridge画面でのイベント動作・値反映・エラー表示・送信、ブラウザーキャッシュ更新は未確認です。通常配布の一致と実画面検証を混同しません。上記のtext-suite・共通基盤に対する利用者報告を、本ハンドラーの検証結果として流用していません。

## 電話番号ハンドラーのFormBridge実画面確認報告（2026-10-31）

- 報告受領日時：2026-10-31 21:23（日本時間、UTC+09:00）。実際の検証実施時刻は未提示です。
- phone-utils 1.1.0で追加した電話番号ハンドラーについて、利用者から「FormBridge上で問題なく動作することを確認した旨報告を受けました」との連絡を受領しました。利用者経由の確認報告であり、AIによる実画面の直接検証ではありません。
- 上記の配布確認時点の「実画面未確認」という記録は履歴として保持し、この報告を後続の確認結果として追記します。配布対象コミット・ハッシュ・ワークフローの証跡は変更しません。
- 対象フォーム、実画面で読み込まれたライブラリの版数・ハッシュ、検証項目別の結果は未提示です。4種別すべての正常・不一致、空欄・不正型・境界値、エラー解除、送信・確認画面への遷移、権限別動作、ブラウザーキャッシュ更新まで個別に確認済みとは扱いません。他のフォームへの適合も保証しません。

## 配布前記録：zip-code-address-utils 1.1.0

- 記録日：2026-10-31（日本時間、UTC+09:00）。これは配布確認日ではありません。
- 対象：`src/zip-code-address-utils.js`（FormBridge専用住所ハンドラー追加）と `src/all-window-exports.js`（公開一覧追加）。
- 作業元コミット：`fc74f062e4a5240e2601f96827a568a823f2e14f`。対象変更はローカル未コミットで、配布対象コミットは未確定です。コミット・push・本番反映は未実施です。
- 対象変更のCI・デプロイ・パッケージ作成ワークフローはすべて未実行です。他コミットの成功を今回の変更の配布証跡として扱いません。
- `npm run build` と生成ファイルの `cmp` は成功しました。下表は**ローカルソースだけのSHA-256**であり、通常URLのハッシュ・一致を示しません。

| 対象・通常配布URL | ソース版 | ローカルソースSHA-256 | 通常URL GET・HTTP・一致 |
| --- | --- | --- | --- |
| <https://js.kacsw.or.jp/zip-code-address-utils.js> | 1.1.0 | `4cae385c48fcdb816439ec7936c069cf1bdae12fd6854218f8ecd78a931817bf` | 未実行・未確認・未照合 |
| <https://js.kacsw.or.jp/all-window-exports.js> | 定義なし | `cc464d17f67a17cbb77455ad716fc000bfb54435c32515cf0c3b4ea239d571bd` | 未実行・未確認・未照合 |

- 対象テスト・lint・ローカルビルドの結果は[FormBridge住所ハンドラー検証記録](zip-code-address-utils.md)を参照してください。
- 705を含む実FormBridgeでの住所反映・エラー表示・送信・確認画面、CORS、ブラウザーキャッシュ更新は未検証です。個別フォーム変更・横展開は実施していません。送信待機・キャンセル・再送信は対象外です。
- 承認後の配布時には、配布対象コミットを固定し、同コミットのワークフロー成功・通常URLのGETと内容一致を標準手順で確認して追記してください。過去の配布証跡は保持します。

## 追加確認：zip-code-address-utils 1.1.0

- 確認日時：2026-10-31 21:46:28（日本時間、UTC+09:00）。
- 対象ソース：PR #42のマージコミット [`cbdfc884b7f210ef01d5b74969f0fb8bb32ea5d1`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/cbdfc884b7f210ef01d5b74969f0fb8bb32ea5d1) の `src/zip-code-address-utils.js` と `src/all-window-exports.js`。
- 利用者からコミット・push・PR経由でのmain反映の承認を受けて実施しました。電話番号ハンドラーの実画面確認報告の文書変更も、利用者の明示的な承認により同PRに含めました。個別フォームは変更していません。
- 対象コミットのワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41202511071)：Prettier・ESLint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41202511074)：本番デプロイ成功。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41202511079)：配布パッケージ作成成功。
- デプロイ成功後、通常URLへ `Cache-Control: no-cache` を指定してGETし、HTTP 200と対象コミットのソースとのバイト単位の完全一致を確認しました（`git show <対象コミット>:src/<対象ファイル>` と取得ファイルを `cmp` で照合）。郵便番号ライブラリのJSDocバージョンは `1.1.0` です。

| 対象・通常配布URL | HTTP | ソース／配布バイト数 | バージョン | 一致 | SHA-256（ソース・配布共通） |
| --- | --- | --- | --- | --- | --- |
| <https://js.kacsw.or.jp/zip-code-address-utils.js> | 200 | 43672 / 43672 | 1.1.0 | 完全一致 | `4cae385c48fcdb816439ec7936c069cf1bdae12fd6854218f8ecd78a931817bf` |
| <https://js.kacsw.or.jp/all-window-exports.js> | 200 | 3174 / 3174 | 定義なし | 完全一致 | `cc464d17f67a17cbb77455ad716fc000bfb54435c32515cf0c3b4ea239d571bd` |

- ローカルの `npm test`、`npm run lint`、`npm run build`、`npm run ci-check`、`npx prettier --check "src/**/*.{js,css,html}"`、`git diff --check` は成功しました。単体テスト・文書利用例の結果は[検証記録](zip-code-address-utils.md)を参照してください。
- 住所ハンドラーの実FormBridgeでのイベント動作・住所反映・エラー表示・通信許可（CORS）・確認画面／送信、ブラウザーキャッシュ更新は未検証です。配布一致を実画面検証として扱わず、電話番号や文字変換ハンドラーの確認報告も流用していません。検索中の送信待機は保証しません。
- 配布前記録は履歴として保持します。この確認結果の保存は文書のみの変更であり、ライブラリのバージョン・ソースには変更を加えません。

## 配布前記録：zip-code-address-utils 1.2.0

- 記録日：2026-11-01（日本時間、UTC+09:00）。配布確認日ではありません。
- 対象：`src/zip-code-address-utils.js`。`replaceOnZipCodeChange`（既定false）を追加し、kintone版と既定のFormBridge動作は維持します。
- 作業元コミット：`6786d0d902c86716272983a59b4e6488ea29b140`。対象変更はローカル未コミットで配布対象コミットは未確定です。
- 利用者からコミット・push・PR作成・mainマージ・本番配布・配布記録保存の承認を受けました。この記録時点では本番反映・対象変更のワークフローは未実行、通常URL <https://js.kacsw.or.jp/zip-code-address-utils.js> のGET・HTTP・内容一致は未確認です。
- ローカル生成物とソースの `cmp` は成功。ローカルソースSHA-256は `122d55a955555dcc976d9df78e1f7be5810e54cc3c13a4c7f1051feda1548a3d` です（配布ハッシュではありません）。
- ローカルテスト・lint・ビルド／スモークチェックの結果は[検証記録](zip-code-address-utils.md)を参照してください。実FormBridgeでの新設定の動作・反映・送信・CORS・キャッシュ更新は未検証です。個別フォーム変更・送信制御は実施していません。

## 追加確認：zip-code-address-utils 1.2.0

- 確認日時：2026-11-01 07:15:28（日本時間、UTC+09:00）。
- 対象ソース：PR #44のマージコミット [`9cfdc218d2fa19c011fc3520d1aefbe7b09070b9`](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/commit/9cfdc218d2fa19c011fc3520d1aefbe7b09070b9) の `src/zip-code-address-utils.js`。
- 新設定は `replaceOnZipCodeChange`（boolean、既定false）。利用者承認に基づきコミット・push・PR・mainマージ・自動本番デプロイを実施しました。個別フォームは変更していません。
- 対象コミットのワークフローはすべて成功しました。
  - [CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41247271598)：Prettier・ESLint・全テスト成功。
  - [Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41247271512)：本番デプロイ成功。
  - [Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41247271539)：配布パッケージ作成成功。
- デプロイ成功後、通常URLへ `Cache-Control: no-cache` を指定してGETし、HTTP 200と対象コミットのソースとのバイト単位の完全一致を確認しました（`git show <対象コミット>:src/zip-code-address-utils.js` と取得ファイルを `cmp` で照合）。JSDocバージョンは `1.2.0` です。

| 対象・通常配布URL | HTTP | ソース／配布バイト数 | バージョン | 一致 | SHA-256（ソース・配布共通） |
| --- | --- | --- | --- | --- | --- |
| <https://js.kacsw.or.jp/zip-code-address-utils.js> | 200 | 44191 / 44191 | 1.2.0 | 完全一致 | `122d55a955555dcc976d9df78e1f7be5810e54cc3c13a4c7f1051feda1548a3d` |

- ローカルの全テスト・関連41件（FormBridge専用26件）・lint・整形・配布物生成／VM／Puppeteer・文書検査の結果は[検証記録](zip-code-address-utils.md)を参照してください。kintone版と既定のFormBridge動作は維持しています。
- 実FormBridgeでの新設定の住所置換・既存住所保持・エラー表示・CORS・画面遷移／送信・キャッシュ更新は未検証です。配布一致を実画面確認とは扱いません。送信待機・キャンセル・再送信は追加していません。
- 配布前記録は履歴として保持します。配布証跡を保存する後続変更は文書のみで、ライブラリのソース・版数は変更しません。

<a id="formbridge-consumer-verification-2026-11-01"></a>

## FormBridge共通ライブラリの利用側動作確認完了報告（2026-11-01）

- 報告受領日時：2026-11-01 08:03（日本時間、UTC+09:00）。実際の各検証実施時刻は未提示です。
- 利用側の対象フォームへ導入した以下の機能について、利用者による実画面確認が完了し、問題なく動作しているとの報告を受領しました。AIによる実画面の直接検証ではありません。アプリ番号・実フィールドコードは記載しません。

| ライブラリ | 報告された版・対象機能 | 利用者による実画面確認 |
| --- | --- | --- |
| formbridge-custom-lib | 依存確認、レコード取得、値・エラー設定、転記、一括初期化。導入時の版数は未提示（下記resolver修正後の解消報告あり） | 完了。共通基盤導入時はテスト・本番環境とも正常 |
| text-suite 1.2.0 | 全角・ひらがな変換 | 完了 |
| phone-utils 1.1.0 | 複数電話番号欄の検証・整形 | 完了 |
| zip-code-address-utils 1.2.0 | 複数住所欄の郵便番号検索、住所補完・置換、住所入力／保存欄の同期 | 完了 |

### 共通基盤・住所ハンドラーの確認内容

- 共通基盤は、`window.formBridge` が未定義でも直接参照できる `formBridge` を解決する1.0.1の修正後、実フォームの依存確認エラーが解消したとの報告です。現在の実画面で読み込まれた共通基盤の正確な版数・ハッシュは未提示です。
- 複数の住所登録で `replaceOnZipCodeChange: true` を有効にし、修正版の動作に問題がないことを利用者が確認しました。
- デジタルアドレス入力時、入力欄が検索結果の郵便番号へ書き換わることも実画面で確認されました。従来の利用側処理にはなかった書き換えであり、利用者は改善として了承しています。共通ライブラリの追加変更ではなく、既存1.2.0の動作に対する確認です。

### 利用側の実装・自動検証に関する報告

- 旧電話番号・郵便番号ハンドラーを置き換え、住所手入力の保存処理も一本化し、二重登録を防止。
- 住所手入力の全角変換・空白保持・20文字制限を維持。これらは利用側の設定・処理の確認であり、共通住所ハンドラーが一律に20文字制限を持つことを示しません。
- 会社名転記は利用側の同期 `afterApply` に残置。
- 公開版住所ライブラリ1.2.0を使用した利用側VM検証560件、ESLint・整形・構文チェックに合格し、変更前バックアップ・更新履歴を保存したとの報告です。AIは今回これらを実行・再検証しておらず、共通ライブラリ側の自動テスト件数へ加算しません。

### 証跡の区別・未確認事項

- 今回の報告は対象フォームへ導入した機能の実画面確認であり、全フォーム展開、全API・全異常系・サブテーブルの網羅確認ではありません。権限／環境別のCORS、確認画面／送信・キャッシュ更新の検証内訳と、実画面で読み込まれたファイルのハッシュは未提示です。
- 送信待機・送信キャンセル・再送信は追加していません。住所検索中の送信には待機保証がなく、住所反映前のデータが送信される可能性は引き続き残ります。
- 過去の配布確認時点の「実画面未検証／未確認」は履歴として保持し、この報告を後続の確認結果として追記します。配布対象コミット・SHA-256・ワークフロー結果を変更せず、配布一致・共通ライブラリ側自動テスト・利用側自動検証・利用者実画面確認を区別します。

## zip-code-address-utils 1.2.1 配布前記録（2026-11-01）

- 対象：`zip-code-address-utils.js` 1.2.1。FormBridgeの入力途中・形式不正は通常動作としてフィールドにエラー表示し、コンソールログだけ抑制。追加設定はなく、kintone版・処理異常のログは維持します。
- 対象コミット・SHA-256・ワークフロー結果：未確定／未実行。コミット・プッシュ・main反映・通常配布URL照合は未実施です。確認済み通常配布版は引き続き1.2.0で、過去の証跡を保持します。
- テスト・未確認事項は[検証記録](zip-code-address-utils.md#121入力検証エラーのコンソールログ抑制)を参照してください。今回変更の実FormBridge動作は未検証です。個別フォーム・送信制御は変更しません。

## 追加確認：zip-code-address-utils 1.2.1

- 確認日時：2026-11-01 22:32:59（日本時間、UTC+09:00）。
- 配布対象コミット：`6b0717efbfd2df4b91d447df28c2c44812a3bfeb`（PR #47のmainマージ）。
- 対象ワークフロー：[CI - Lint & Test](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41311689155)、[Azure Static Web Apps CI/CD](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41311689162)、[Prepare dist and package](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/runs/41311689227) はすべて成功。別コミットの結果ではなく、上記SHAを対象とする実行結果を確認しました。

| 対象 | 通常配布URL | 版数 | HTTP | 対象ソースとの一致 | SHA-256 | バイト数 |
| --- | --- | --- | --- | --- | --- | --- |
| zip-code-address-utils | https://js.kacsw.or.jp/zip-code-address-utils.js | 1.2.1 | 200 | 完全一致 | `75ed73a6ab7f252bdd2cb23c120bcc346ad88dddfc92ddc91f14196bf6acc7d5` | 44399 |

- `Cache-Control: no-cache` を付けた通常URLのGETで取得し、固定コミットの `src/zip-code-address-utils.js` と `cmp` でバイト単位の完全一致を確認。JSDocの版数とSHA-256も確認しました。変更対象はこのライブラリだけで、他ライブラリは今回再照合していません。
- 全リポジトリテスト・関連48件（FormBridge専用33件）・lint・整形・配布物生成／VM／Puppeteer・文書検査は成功。詳細は[検証記録](zip-code-address-utils.md#121入力検証エラーのコンソールログ抑制)を参照してください。
- 入力途中・形式不正はフィールドにエラー表示し、コンソールログだけ抑制。追加設定はなく、kintone版・処理異常のログ・戻り値のエラー状態は維持しています。新たな送信制御はありません。
- 今回変更の実FormBridgeでのエラー表示・コンソールログ・CORS・画面遷移／送信・キャッシュ更新は未検証です。1.2.0の利用者確認報告は対象機能・版数の範囲に限り、今回の配布一致を実画面確認へ読み替えません。
- 配布前記録と過去の証跡は履歴として保持します。配布証跡を保存する後続変更は文書のみで、ソース・版数は変更しません。
