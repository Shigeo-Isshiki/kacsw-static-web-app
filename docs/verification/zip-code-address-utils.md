# FormBridge郵便番号・住所ハンドラーの検証記録

## 対象と根拠

- 記録日：2026-10-31（日本時間、UTC+09:00）。
- 対象：zip-code-address-utils 1.1.0 の `registerFormBridgeZipCodeAddressHandler`。API契約・汎用的なフィールド構成の利用例は[リファレンス](../zip-code-address-utils.md#registerFormBridgeZipCodeAddressHandler)を参照。
- [FormBridge公式仕様](https://formbridge.kintoneapp.com/help/customize/v2)を取得して確認。`fn` は各 `.show` 内／以降に利用できること、フィールド変更中の `getRecord()` は変更前を返すこと、`setFieldValue()` は変更イベントを発火しないこと、Promiseやasyncでもイベント処理が待機しないことを根拠としました。
- FormBridge実画面での検証ではありません。個別フォームのコードは変更していません。

## 自動テスト

`test/test-zip-code-address-formbridge.js` はVM内のグローバル `const formBridge` と共通基盤の実コードを使用します。`window.formBridge` は未定義、初期登録時の `fn` は未定義とし、フォーム表示後に初めて設定しています。郵便番号のレコード値を古いままにしても `event.value` で検索すること、設定APIが変更イベントを再発火しなくても保存欄が更新されることを確認します。

確認対象：

- 正常検索・通常郵便番号での既存住所保持／空欄補完・応答待機中の手入力。
- デジタルアドレスでの置換、任意結果欠落時の消去、関連住所入力／保存欄のクリア。
- 全角変換・手入力同期、変換例外・非文字列／Promise・変換後の空メイン住所の拒否と値保持。
- 通信・404・JSON・必須／任意結果の型・複数結果・空結果のエラー。
- 空郵便番号・連続入力・応答逆転・A→B→A、登録間の独立、画面遷移・dispose。
- APIの呼び出し時解決、API例外・エラー表示自体の失敗、設定途中の失敗を成功扱いにしないこと。
- 同期コールバックへの検索結果、同期イベント終了・検索前データで送信され得ること。
- リファレンスの架空フィールドによる利用例をそのままVM内で実行し、2組の住所入力／保存欄、通常時の追加住所欄保持・置換時のクリア、無関係な欄へ自動転記しないこと。

実行結果：

| コマンド | 結果 |
| --- | --- |
| `node --require ./test/setup-tests.js --test test/test-zip-code-address-formbridge.js test/test-zip-code-address-handler.js test/test-zip-code-address-utils.js test/test-formbridge-custom-lib.js test/test-text-suite.js` | 成功。新規FormBridgeテスト19件、既存kintoneハンドラー・検索・共通基盤・文字変換テストがすべて成功（Node runnerの集計35件。旧形式のテスト3ファイルはファイル単位の集計） |
| `npm run lint` | 成功 |
| `npx prettier --check src/zip-code-address-utils.js src/all-window-exports.js test/test-zip-code-address-formbridge.js` | 成功 |
| `npm run build` | 成功 |
| `cmp src/zip-code-address-utils.js dist/zip-code-address-utils.js` | 成功。ローカル生成物とソースがバイト単位で一致 |
| `cmp src/all-window-exports.js dist/all-window-exports.js` | 成功。ローカル生成物とソースがバイト単位で一致 |
| `git diff --check` | 成功 |

Nodeによる文書検査で、リファレンスの6章構成、相対リンク・明示アンカー・コードフェンスとソースのバージョン一致を確認しました。kintone版の関数本体・検索処理は変更していません。

main反映前の追加検証として、`npm test`（リポジトリ全体）、`npm run lint`、`npm run ci-check`（配布物生成・window VM・Puppeteer）、`npx prettier --check "src/**/*.{js,css,html}"`、`git diff --check` はすべて成功しました。利用例はアプリを特定しない架空のフィールド構成へ変更し、例をそのまま実行する19件のFormBridgeテストも成功しています。

## 配布・未検証

- PR #42をmainへマージし、コミット `cbdfc884b7f210ef01d5b74969f0fb8bb32ea5d1` のCI・本番デプロイ・配布パッケージ作成がすべて成功しました。2026-10-31 21:46:28（日本時間、UTC+09:00）に通常URLのHTTP 200と対象コミットのソースとのバイト単位の完全一致を確認しました。詳細なハッシュとワークフロー証跡は[通常配布確認記録](library-distribution.md#追加確認zip-code-address-utils-110)を参照してください。
- 705を含む実FormBridgeでのフィールド反映、エラー表示、ステップ移動・確認画面・送信、API通信のCORSと権限、ブラウザーキャッシュ更新は未検証です。モックテストを実画面確認として扱いません。
- FormBridgeには複数フィールドの更新トランザクションがありません。検索／変換失敗では書き込み前に停止しますが、設定API途中失敗・後続コールバック失敗による既反映値のロールバックは保証しません。
- 送信待機、送信キャンセル・再送信、地区判定・支部選択、705固有の会社名転記、個別フォーム変更・全フォーム展開は対象外です。

## 1.2.0：郵便番号変更時の選択的な置換

- 記録日：2026-11-01（日本時間、UTC+09:00）。
- 正式設定名：`replaceOnZipCodeChange`（boolean、既定 `false`）。省略／falseは1.1.0の住所保持を維持し、trueでは応答到着後・書き込み前の保存欄を正規化して検索結果の `apiZipCode` と比較します。
- 空でない保存済み番号が異なる場合だけ、デジタルアドレスと共通のクリア・変換・入力／保存欄反映・同期 `afterApply` 処理を使います。検索開始時の消去はありません。
- FormBridgeテストは既存19件に7件追加し、計26件です。省略／false、異なる番号、同じ番号・全角／ハイフン／空白の表記差、保存欄の空値、応答時点の保存欄参照、関連欄と保存欄のクリア、任意結果欠落、同期コールバック、検索／変換失敗時の値保持、連続入力・空入力・画面遷移・独立登録・デジタル置換を確認します。文書の汎用利用例も実行します。
- `npm test`（全リポジトリ）、`npm run lint`、`npm run ci-check`（配布物生成・VM・Puppeteer）、`cmp src/zip-code-address-utils.js dist/zip-code-address-utils.js` は成功しました。
- `node --require ./test/setup-tests.js --test test/test-zip-code-address-formbridge.js test/test-zip-code-address-handler.js test/test-zip-code-address-utils.js test/test-formbridge-custom-lib.js` は成功（41件集計、旧形式2ファイルはファイル単位。FormBridge専用は26件）。`npx prettier --check "src/**/*.{js,css,html}" test/test-zip-code-address-formbridge.js` と `git diff --check` も成功し、文書構造・リンク・アンカー・版数・汎用例とkintone関数本体の不変性を確認しました。
- kintone版・手入力住所の処理・世代管理・呼び出し時resolver・エラー処理は変更していません。送信制御やAPI途中失敗のロールバックは追加しません。
- 利用者承認に基づきPR #44をmainへマージしました。対象コミット `9cfdc218d2fa19c011fc3520d1aefbe7b09070b9` のCI・本番デプロイ・パッケージ作成はすべて成功し、2026-11-01 07:15:28（日本時間、UTC+09:00）に通常URLのHTTP 200・JSDoc 1.2.0・対象ソースとのバイト単位の完全一致を確認しました。詳細は[通常配布確認記録](library-distribution.md#追加確認zip-code-address-utils-120)を参照してください。
- 実FormBridgeでの新設定の動作・反映・エラー表示・CORS・画面遷移／送信・キャッシュ更新は未検証です。個別フォームのコードは変更していません。

## 利用側の実画面確認完了報告（2026-11-01）

- 2026-11-01 08:03（日本時間、UTC+09:00）に、公開版1.2.0を対象フォームへ導入し、複数住所欄で `replaceOnZipCodeChange: true` を有効にした郵便番号検索・住所補完／置換・入力／保存欄同期が問題なく動作したとの利用者報告を受領しました。デジタルアドレス入力欄が検索結果の郵便番号へ書き換わることも確認され、改善として了承されています。
- 利用側VM検証560件・静的チェックの合格は利用側の報告であり、この文書の共通ライブラリ側26件／関連41件とは別の証跡です。AIによる再実行や実画面の直接確認ではありません。
- 詳細な導入範囲・利用側処理・未確認事項は[利用側確認報告](library-distribution.md#formbridge-consumer-verification-2026-11-01)を参照してください。全フォーム・全API・全異常系の網羅確認ではなく、送信待機は保証しません。
- 上記の配布確認時点の未検証記録とコミット・ハッシュ・ワークフロー証跡は履歴として保持します。今回の記録では共通ライブラリのソース・版数や個別フォームのコードを変更していません。

## 1.2.1：入力検証エラーのコンソールログ抑制

- 記録日：2026-11-01（日本時間、UTC+09:00）。
- 追加設定なし。通常動作として、既存正規化後の入力途中・桁超過・不正文字を入力欄に検証エラーとして表示し、`status: 'error'` を返します。1.2.0のフィールド表示・戻り値を維持し、入力検証のコンソールログだけを抑制します。
- 正規化後7文字の英数字は通常郵便番号・デジタルアドレスとも検索します。非文字列値・必須フィールド欠落・通信・変換・設定・表示API等の処理異常はログとエラー処理を維持します。
- 入力途中・形式不正でも世代を更新し、先行する検索成功／失敗応答を破棄します。保存郵便番号・住所は保持し、変換・`afterApply` は実行しません。空入力は従来どおり保存郵便番号だけ消去し、入力エラーを解除します。検索可能な入力への変更でも前回の入力エラーを解除します。
- FormBridgeテストは7件追加して計33件です。全桁の入力途中・全角／ハイフン／空白正規化、不正文字・桁超過、正常7文字・デジタル検索、古い成功／失敗応答の破棄、空入力・独立登録・再検索、処理／表示API異常を検証します。汎用利用例は追加設定なしで入力途中のエラー表示とログ抑制も確認します。
- `node --require ./test/setup-tests.js --test test/test-zip-code-address-formbridge.js test/test-zip-code-address-handler.js test/test-zip-code-address-utils.js test/test-formbridge-custom-lib.js` は成功（48件集計、FormBridge専用33件。旧形式2ファイルはファイル単位の集計）。既存kintone・検索・共通基盤の回帰テストも成功しました。
- `npm run lint`、`npx prettier --check src/zip-code-address-utils.js test/test-zip-code-address-formbridge.js`、`npm run build`、`cmp src/zip-code-address-utils.js dist/zip-code-address-utils.js`、`git diff --check` は成功しました。文書の章立て・リンク・アンカー・コードフェンス・ソース版数一致と、kintone／検索実装の不変性も確認しました。
- main反映前の追加検証として、`npm test`（全リポジトリ）、`npm run lint`、`npx prettier --check "src/**/*.{js,css,html}" test/test-zip-code-address-formbridge.js`、`npm run ci-check`（配布物生成・window VM・Puppeteer）、`cmp src/zip-code-address-utils.js dist/zip-code-address-utils.js` はすべて成功しました。
- 配布・実画面検証は未実施です。1.2.0の利用者報告を今回変更の実画面確認へ流用しません。個別フォームは変更せず、デバウンス・送信時の完成チェック・送信待機／キャンセル／再送信は追加しません。入力途中・形式不正のまま送信すると、入力欄と以前の保存値が一致しない可能性があります。
