# kintone-custom-lib 使い方リファレンス

このドキュメントは `src/kintone-custom-lib.js` が公開する関数ごとに使い方と契約（引数・戻り値・副作用）をまとめたリファレンスです。

各見出しは公開関数（`window` に公開される想定）に対応しています。テストや CI で Node 上から利用する場合は `global.window = global` を設定してから `require('../src/kintone-custom-lib.js')` してください。

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
- `setSpaceFieldDisplay(spaceField, display)`

## 個別関数の使い方

> 注意: ここに書かれた使用例はライブラリの公開 API に合わせたもので、実行環境（ブラウザ / kintone / Node+jsdom）によって前提が異なります。kintone の DOM 要素を参照する関数は、テスト時に `kintone.app` のモックや `document`（jsdom）の用意が必要です。

### getFieldValueOr(record, fieldCode, defaultValue)

- 動作概要: 指定した `record` から `fieldCode` の `value` を安全に取得します。存在しない場合や入力が不正な場合は `defaultValue` を返します。

- `record` (Object) — kintone の record オブジェクト想定（例: `{ name: { value: '山田' } }`）
- `fieldCode` (string) — 取得したいフィールドのフィールドコード
- `defaultValue` (any, optional) — フィールドが存在しない・取得に失敗した場合に返す既定値（省略時は `undefined`）

- 戻り値: フィールドの `value` または `defaultValue`。

注意: `defaultValue` を指定しない（省略）した場合は `undefined` が返されます。`field.value` が `null` や空文字列 (`''`) の場合は有効な値としてそのまま返され、フィールドが存在しないケースとは区別されます。

例:

```js
const rec = { name: { value: '山田' }, age: { value: 30 } };
getFieldValueOr(rec, 'name', '不明'); // -> '山田'
getFieldValueOr(rec, 'missing', '不明'); // -> '不明'
```

テストヒント: 無効な `record` を渡したときに `defaultValue` が返ることをアサートします。

### kintoneEventOn(events, handler)

- 動作概要: `kintone.events.on` にラップして指定イベントを登録します。ハンドラ内で例外が発生した場合はログ出力と `notifyError` の表示を行い、元のイベントオブジェクトを返します。

- `events` (string | string[]) — kintone のイベント名（例: `'app.record.create'`）または複数イベントの配列
- `handler` (function) — 登録するハンドラ。`event` オブジェクトを受け取り、必要に応じて `event` を返します（例外発生時は内部で処理されます）

例:

````js
kintoneEventOn('app.record.create', function(event) {
  return event;
});

テストヒント: `global.kintone = { events: { on: (ev, h) => h({}) } }` のようにスタブして、ハンドラが呼ばれることを確認します。


### setRecordValues(record, values)
 - 動作概要: 指定した `values` のキーと値を `record` に反映します。既にオブジェクトで `value` プロパティがある場合は上書きし、なければ `{ value: ... }` を作成して設定します。

  - `record` (Object) — 操作対象の kintone レコードオブジェクト
  - `values` (Object) — フィールドコードをキー、設定する値を値とするオブジェクト。既に `{ value: ... }` 形式のフィールドは上書き、プリミティブ値の場合は `{ value: 値 }` を設定します。
例:

```js
const r = { a: { value: 1 }, b: 2 };
setRecordValues(r, { a: 10, c: 3 });
// r.a.value === 10, r.c.value === 3
````

### notifyError(message, title = 'エラー', allowHtml = false)

- 動作概要: 指定メッセージをダイアログで表示します。`allowHtml` が真の場合はサニタイズした HTML を挿入し、偽の場合はプレーンテキストとして表示します。アクセシビリティ用の属性（role/aria-live等）も設定されます。

- `message` (string | Node) — ダイアログに表示する本文。Node を渡すとそのまま挿入可能（`allowHtml` の影響を受ける）
- `title` (string) — ダイアログタイトル（省略時は `'エラー'`）
- `allowHtml` (boolean) — true の場合 HTML を許可しサニタイズして挿入。false の場合はプレーンテキストとして扱う

例（ブラウザ）:

```js
notifyError('必須項目が未入力です');
// HTML を許可する場合（サニタイズされます）
notifyError('<strong>重要</strong><script>evil()</script>', 'エラー', true);
```

テストヒント: jsdom と `kintone.createDialog` のモックを用意し、生成されたダイアログコンテナ内に `.kc-notify-error__message` が存在すること、不正な `script` 要素や `on*` 属性が削除されていることを確認します。

違い（用途の目安）:

- `notifyError`: フォームの必須入力漏れや致命的な例外など、ユーザーの即時対応を要するエラー表示に使います。デフォルトタイトルは `エラー` で、視認性の高いエラー系スタイル（クラス名例: `kc-notify-error`）を用います。
- `notifyWarning`: 処理は継続可能だが注意が必要なケース（例: 保存はできるが注意点あり）で使います。注意を促す警告系スタイル（クラス名例: `kc-notify-warning`）を用います。
- `notifyInfo`: 操作結果の確認や一般的な情報提供（例: 保存完了、非重大な通知）に使います。情報系の穏やかなスタイル（クラス名例: `kc-notify-info`）を用います。

実装上は `notifyError` / `notifyWarning` / `notifyInfo` の基本挙動（ダイアログ作成、サニタイズの適用など）は共通です。用途に応じてタイトルや CSS クラス、アクセシビリティの取り扱い（role や aria-live の優先度）を変えて使い分けてください。

### notifyInfo(message, title = '情報', allowHtml = false)

- 動作概要: 情報表示用のダイアログを表示します。操作の成功通知や一般的な案内に使い、`allowHtml` に応じてサニタイズされた HTML またはプレーンテキストを挿入します。

- `message` (string | Node) — ダイアログに表示する本文
- `title` (string) — ダイアログタイトル（省略時は `'情報'`）
- `allowHtml` (boolean) — true の場合 HTML を許可しサニタイズして挿入

### notifyWarning(message, title = '注意', allowHtml = false)

- 動作概要: 注意喚起や軽度の問題を通知するためのダイアログを表示します。処理を継続できるがユーザーの注意を促したいケースで使用します。

- `message` (string | Node) — ダイアログに表示する本文
- `title` (string) — ダイアログタイトル（省略時は `'注意'`）
- `allowHtml` (boolean) — true の場合 HTML を許可しサニタイズして挿入

### setHeaderMenuSpaceButton(id, textContent, onClick)

- 動作概要: ヘッダーメニューのスペース要素に指定 ID のボタンを追加または削除します。既に同一 ID の要素があれば差し替え（削除→追加）し、`textContent` が null/空文字の場合は削除動作を行います。

- `id` (string) — ヘッダースペース内で一意に識別するための ID
- `textContent` (string | null) — ボタンに表示する文言。`null` または空文字で該当ボタンを削除
- `onClick` (function | null) — クリック時に呼ばれるハンドラ。`null` でイベント登録しない

テストヒント: `kintone.app.getHeaderMenuSpaceElement(id)` をモックして、返された要素に button が追加されることを検証します。

### setSpaceFieldButton(spaceField, id, textContent, onClick)

- 動作概要: 指定したスペースフィールド（`kintone.app.record.getSpaceElement` から取得）にボタンを追加または削除します。追加時は `type="button"` を設定し、`onClick` を登録します。

- `spaceField` (string) — スペースフィールドのコード（`kintone.app.record.getSpaceElement` に渡す値）
- `id` (string) — 追加する要素の ID（同一 ID があれば差し替える）
- `textContent` (string | null) — ボタンに表示する文言。`null` または空文字で削除
- `onClick` (function | null) — ボタンのクリックハンドラ

例（テスト）:

```js
// jsdom の DOM を作成しておき、
// global.kintone.app.record.getSpaceElement = code => document.getElementById(code);
setSpaceFieldButton('space-A', 'btn-1', '実行', () => console.log('clicked'));
```

### setSpaceFieldText(spaceField, id, innerHTML)

- 動作概要: 指定スペースフィールドに HTML（サニタイズ済）を挿入します。`innerHTML` が null または空文字列の場合は該当要素を削除します。DOM が未準備の場合はリトライ設計を採ることを想定しています。

- `spaceField` (string) — スペースフィールドのコード
- `id` (string) — 挿入する要素の ID
- `innerHTML` (string | null) — 挿入する HTML（サニタイズ済を想定）。`null` または空文字で削除

テストヒント: `kintone.app.record.getSpaceElement` をモックして、要素が appendChild されることを確認します。

### setSpaceFieldDisplay(spaceField, display)

- 動作概要: 指定したスペースフィールドの親ノードの `style.display` を切り替えます。`display` が `true` のときは表示、`false` のときは非表示に設定します。

- `spaceField` (string) — スペースフィールドのコード
- `display` (boolean) — true で表示、false で非表示にする指定

## テスト用モック例（jsdom + Node）

簡易的なパターン:

```js
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body><div id="space-A"></div></body></html>`);
global.window = dom.window;
global.document = dom.window.document;

// 必要な kintone API をモック
global.kintone = {
	app: {
		record: {
			getSpaceElement: (code) => document.getElementById(code),
		},
		getHeaderMenuSpaceElement: (id) => document.getElementById('header-' + id),
	},
	events: {
		on: (ev, h) => {
			/* stub */
		},
	},
	createDialog: (config) => ({
		element: config.body,
		show: () => document.body.appendChild(config.body),
	}),
};

require('../src/kintone-custom-lib.js');
```

このパターンを使うと `setSpaceFieldText` や `notifyError` 等の DOM 操作を Node 上で検証できます。

必要があれば各関数のより詳細なシグネチャ（例: 例外の種類、内部ロギングの仕様、非同期の挙動など）を追記します。ご希望があればどの関数の説明をさらに掘り下げるか教えてください。
