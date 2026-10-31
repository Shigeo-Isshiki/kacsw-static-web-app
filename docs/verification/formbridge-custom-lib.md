# formbridge-custom-lib API 検証記録

## 確認範囲

2026-10-30にFormBridge公式の新バージョンJavaScriptカスタマイズ資料と公開型定義を確認しました。確認したのはAPI名、イベント・関数名前空間、利用タイミング、およびイベントコンテキスト上の旧関数の非推奨扱いです。FormBridge上の実画面での動作検証は行っていません。通常配布URLとの照合結果は[通常配布確認記録](./library-distribution.md#追加確認formbridge-custom-lib-100)を参照してください。

## 公式資料で確認したAPI

- [新バージョンJavaScriptカスタマイズ API](https://formbridge.kintoneapp.com/help/customize/v2)
- [FormBridge JavaScriptカスタマイズ型定義](https://formbridge.kintoneapp.com/v2/types/formbridge-javascript-customize.d.ts)
- [JavaScript/CSSでカスタマイズ（操作ガイド）](https://guide.kintoneapp.com/formbridge/advanced-customization/)

上記資料では、次を確認しました。

- `formBridge.events.on` はフォーム読み込み直後から利用できるイベント登録API。
- `formBridge.fn` の関数は各画面の `.show` イベント内またはそれ以降に利用できる。
- `formBridge.fn.getRecord()` はフォーム回答レコードを返す。フィールド値変更イベント内では変更前の値になるため、変更後の値にはイベント引数の `value` を参照する。
- `formBridge.fn.setFieldValue(fieldCode, value)` は回答画面（通常・ステップフォーム）向け。確認・完了画面からの呼び出しは例外となる。
- `formBridge.fn.setFieldValueError(fieldCode, errorMessage)` は回答画面向けで、`null` によりエラーを解除できる。
- イベントコンテキストに含まれる `getRecord`、`setFieldValue`、`setFieldValueError` は後方互換用として非推奨であり、各 `formBridge.fn` 関数を利用する。

## 未検証事項

- FormBridgeの実画面にカスタマイズファイルを登録した際の読み込み順・各ファイル間のグローバル可視性。
- 実フォームでの各フィールド型に対する値型の適合性、値設定後の表示反映、確認画面への遷移。
- エラー設定・解除後のフォーム検証と送信制御。
- `.show` イベントの実行タイミング、ステップフォームでの挙動、実フォームの項目欠落時の例外内容。
- `https://js.kacsw.or.jp/formbridge-custom-lib.js` のHTTP応答・ソースとの内容一致・配布ワークフロー結果。

これらは自動テスト・公式型定義の確認だけでは保証されません。利用フォームに導入する前に対象環境で確認してください。

## 1.0.1：グローバルのconstで公開されたAPIへの対応

2026-10-31に利用者から、実画面で `typeof formBridge === 'object'`、`typeof formBridge.events.on === 'function'`、`typeof window.formBridge === 'undefined'` になるとの報告がありました。1.0.0はグローバルオブジェクトだけを参照していたため、その環境で依存確認とAPI呼び出しに失敗します。これは利用者の実画面報告であり、こちらでの実フォーム再検証結果ではありません。

1.0.1では `formBridge.*` の解決時に直接の識別子参照を優先します。ライブラリ読み込み時にAPIや `fn` を固定せず、依存チェック・操作ごとに解決します。`window.formBridge = formBridge` の回避策や公開APIの変更は不要です。

自動テストはNodeの `vm` でブラウザー相当のグローバル環境を作り、別スクリプトで `const formBridge` を定義します。`window` を同じグローバルオブジェクトにしつつ `window.formBridge` は存在しない状態で、依存確認、レコード取得、値取得、値設定、エラー設定・解除、転記、一括初期化を確認します。`fn` の後付け・置換、ライブラリ読み込み後のAPI定義、直接参照の優先、呼び出し先の `this`、既存のwindow公開方式も検証対象です。

- 修正後の実フォーム上の読み込み・表示・送信は未確認です。
- 1.0.0の配布証跡は保持します。1.0.1は2026-10-31 09:40:31（日本時間、UTC+09:00）に通常配布を確認しました。対象コミット `3a8cb6d20be64281281214aa4e4caa562e27af62` のCI・本番デプロイ・パッケージ作成が成功し、通常URLはHTTP 200、ソースと完全一致です。詳細は[1.0.1配布記録](./library-distribution.md#追加確認formbridge-custom-lib-101)を参照してください。実フォームの再検証結果ではありません。

## 1.1.0：サブテーブルAPIラッパーの追加

2026-10-31に公式の[新バージョンJavaScriptカスタマイズAPI](https://formbridge.kintoneapp.com/help/customize/v2)と[公開型定義](https://formbridge.kintoneapp.com/v2/types/formbridge-javascript-customize.d.ts)を再確認しました。型定義ではサブテーブル変更イベントのデータに0始まりの `rowIndex` と変更後の `value` があり、イベント名は `form.field.change` に続いて2つのコードを持つ形式です。また `formBridge.fn.setSubtableFieldValue` と `formBridge.fn.setSubtableFieldValueError` はテーブルコード・列コード・行番号を受け取ります。これに基づき、1.1.0では両APIを公開ラッパーとして追加しました。

- 自動テストでテーブル値・セルエラー設定の引数、0始まり行番号の検証、APIの遅延解決、API例外の伝播を確認しました。
- FormBridge実画面でのイベント名・行番号の対応、値の表示反映、セルエラーの見え方は未確認です。API型定義と自動テストの結果を、実画面検証済みとして扱いません。

### 1.0.1自動検証結果（2026-10-31）

- `node --test test/test-formbridge-custom-lib.js`：12テスト成功（グローバルconst・遅延APIの回帰テスト2件を含む）。
- `npm test`：全テスト成功。
- `npm run lint`：成功。
- `npm run build`：成功（非圧縮配布物の生成）。
- `node --check src/formbridge-custom-lib.js`：成功。
- `cmp src/formbridge-custom-lib.js dist/formbridge-custom-lib.js`：完全一致。
- `npx --no-install prettier --check src/formbridge-custom-lib.js test/test-formbridge-custom-lib.js docs/formbridge-custom-lib.md docs/verification/formbridge-custom-lib.md`：成功。
- `git diff --check`：成功。

### 1.1.0自動検証結果（2026-10-31）

- `node -r ./test/setup-tests.js test/test-formbridge-custom-lib.js`：13テスト成功（サブテーブル値・セルエラーAPIラッパーのテストを含む）。
- `node --test test/test-text-suite-formbridge.js`：14テスト成功（FormBridgeサブテーブルのイベント名・行指定・変換・エラー処理を含む）。
- `npm test`：成功。
- `npm run lint`：成功。
- `npx --no-install prettier --check .github/instructions/library-docs.instructions.md docs/README.md docs/formbridge-custom-lib.md docs/text-suite.md docs/verification/formbridge-custom-lib.md src/all-window-exports.js src/formbridge-custom-lib.js src/text-suite.js test/test-formbridge-custom-lib.js test/test-text-suite-formbridge.js`：成功。
- `npm run build`：成功。
- `npm run ci-check`：成功（生成物のwindow公開確認とPuppeteerブラウザ確認を含む）。
- `cmp src/text-suite.js dist/text-suite.js`、`cmp src/formbridge-custom-lib.js dist/formbridge-custom-lib.js`、`cmp src/all-window-exports.js dist/all-window-exports.js`：完全一致。
- `git diff --check`：成功。
- FormBridge実画面および通常配布URLは未確認です。
