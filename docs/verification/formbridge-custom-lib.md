# formbridge-custom-lib API 検証記録

## 確認範囲

2026-10-30にFormBridge公式の新バージョンJavaScriptカスタマイズ資料と公開型定義を確認しました。確認したのはAPI名、イベント・関数名前空間、利用タイミング、およびイベントコンテキスト上の旧関数の非推奨扱いです。FormBridge上の実画面での動作検証や通常配布URLの照合は行っていません。

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
