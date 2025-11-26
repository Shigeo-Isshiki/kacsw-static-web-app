````markdown
# kintone-custom-lib 使い方リファレンス

このドキュメントは `src/kintone-custom-lib.js` が公開する主な関数の使い方と、引数・戻り値の契約をまとめたリファレンスです。ブラウザや kintone 上で直接 `window` 経由で利用できることを前提としています。

---

## 公開 API サマリ

- `notifyError(message, title = 'エラー', allowHtml = false)`
- `notifyInfo(message, title = '情報', allowHtml = false)`
- `notifyWarning(message, title = '注意', allowHtml = false)`
- `getFieldValueOr(record, fieldCode, defaultValue)`
- `kintoneEventOn(events, handler)`
- `setRecordValues(record, values)`
- `setHeaderMenuSpaceButton(id, textContent, onClick)`
- `setSpaceFieldButton(spaceField, id, textContent, onClick)`
- `setSpaceFieldText(spaceField, id, innerHTML)`

ブラウザでは `window` に各関数が公開されています。Node のテスト環境では `global.window = global` としてから `require('./src/kintone-custom-lib.js')` してください。

---

## 主要関数の説明

### `getFieldValueOr(record, fieldCode, defaultValue)`

- record が適切なオブジェクトでない場合や `fieldCode` が無効な場合は `defaultValue` を返します。
- 指定フィールドが存在し、`value` プロパティがあればそのまま返します（`null` や空文字も有効値として扱います）。

例:

```js
getFieldValueOr({ name: { value: '山田' } }, 'name', 'N/A'); // -> '山田'
getFieldValueOr(null, 'name', 'N/A'); // -> 'N/A'
```

### `kintoneEventOn(events, handler)`

- `events` は文字列または文字列配列、`handler` は関数である必要があります。引数チェックに失敗すると `false` を返します。
- 内部で `kintone.events.on(events, wrappedHandler)` に登録します。登録成功で `true` を返します。

注意: テスト環境では簡易的に `global.kintone = { events: { on: (...) => ... } }` を設定して動作確認できます。

### `setRecordValues(record, values)`

- `record` と `values` はオブジェクトでなければなりません。成功時は `true` を返します。
- 既存フィールドオブジェクトに `value` プロパティがあれば上書きし、なければ簡易フィールドオブジェクト `{ value: ... }` を作成して設定します。

例:

```js
const r = { a: { value: 1 }, b: 2 };
setRecordValues(r, { a: 10, c: 3 });
// r === { a: { value: 10 }, b: 2, c: { value: 3 } }
```

### `notifyError` / `notifyInfo` / `notifyWarning`

- `kintone.createDialog` を利用してカスタムダイアログを表示します。`allowHtml` が `true` の場合はメッセージをサニタイズしたうえで HTML として挿入します。
- Node テスト環境では DOM が無いため直接ダイアログの挙動をテストするのは難しく、主にブラウザ上での利用を想定しています。

### スペースフィールド操作系 (`setHeaderMenuSpaceButton`, `setSpaceFieldButton`, `setSpaceFieldText`)

- これらは DOM と kintone の `kintone.app.getHeaderMenuSpaceElement` / `kintone.app.record.getSpaceElement` に依存します。テストでは `kintone.app` と `document` のスタブを用意することで簡易検証が可能です。

---

## テスト時のヒント

- Node での単体テストは `global.window = global; require('./src/kintone-custom-lib.js')` の順でロードします。
- `kintone` オブジェクトの必要なメソッド（`events.on`、`app.getHeaderMenuSpaceElement`、`app.record.getSpaceElement` 等）をテスト用にスタブしてください。

---

実装や公開 API に差異がある場合は、このドキュメントを更新してください。

````
