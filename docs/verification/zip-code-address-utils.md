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
