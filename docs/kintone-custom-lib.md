# kintone-custom-lib 使い方リファレンス

このドキュメントは `src/kintone-custom-lib.js` が公開する関数ごとに使い方と契約（引数・戻り値・副作用）をまとめたリファレンスです。

各見出しは公開関数（`window` に公開される想定）に対応しています。テストや CI で Node 上から利用する場合は `global.window = global` を設定してから `require('../src/kintone-custom-lib.js')` してください。

## 公開 API サマリ

### ランタイム初期化

- [initKintoneCustomLibRuntime(options)](#initkintonecustomlibruntime)
- [resetKintoneCustomLibRuntime()](#resetkintonecustomlibruntime)

### 通知・ダイアログ

- [notifyError(message, title = 'エラー', allowHtml = false)](#notifyerror)
- [notifyInfo(message, title = '情報', allowHtml = false)](#notifyinfo)
- [notifyWarning(message, title = '注意', allowHtml = false)](#notifywarning)
- [showYesNoDialog(message, title = '確認', options)](#showyesnodialog)
- [showInputDialog(options)](#showinputdialog)

### レコード・イベント補助

- [getFieldValueOr(record, fieldCode, defaultValue)](#getfieldvalueor)
- [kintoneEventOn(events, handler)](#kintoneeventon)
- [setRecordValues(record, values)](#setrecordvalues)

### ヘッダー・スペース要素操作

- [setHeaderMenuSpaceButton(id, textContent, onClick, styleOptions)](#setheadermenuspacebutton)
- [setRecordHeaderMenuSpaceButton(id, textContent, onClick, styleOptions)](#setrecordheadermenuspacebutton)
- [setRecordHeaderMenuSpaceText(id, innerHTML)](#setrecordheadermenuspacetext)
- [setSpaceFieldButton(spaceField, id, textContent, onClick, styleOptions)](#setspacefieldbutton)
- [setSpaceFieldText(spaceField, id, innerHTML)](#setspacefieldtext)
- [setSpaceFieldDisplay(spaceField, display)](#setspacefielddisplay)

### サブテーブル操作ボタン制御

- [setupSubtableOperationControl(options)](#setupsubtableoperationcontrol)
- [updateSubtableOperationControl(controller, partialOptions)](#updatesubtableoperationcontrol)
- [teardownSubtableOperationControl(controller)](#teardownsubtableoperationcontrol)

## ランタイム初期化（推奨）

PC/モバイル判定を呼び出し側で一度だけ確定したい場合は、次の初期化 API を利用します。

また、`globalThis.KACSW_RUNTIME`（または `window.KACSW_RUNTIME`）に次の形式で設定すると、内部で自動同期されます。

```js
globalThis.KACSW_RUNTIME = {
	isMobilePage: true,
	version: Date.now(),
};
```

判定の優先順位は次の通りです。

- 明示初期化（`initKintoneCustomLibRuntime`）
- `KACSW_RUNTIME` の設定値
- 既存の自動判定（`location.pathname` ベース）

<a id="initkintonecustomlibruntime"></a>

### initKintoneCustomLibRuntime(options)

- 動作概要: PC/モバイル判定を明示設定し、内部キャッシュへ保存します。

- `options` (object)
  - `options.isMobilePage` (boolean, optional) — `true` でモバイル、`false` で PC。
  - `options.mode` (`'mobile' | 'pc'`, optional) — `isMobilePage` の代替指定。
  - `options.version` (number, optional) — 設定の更新世代番号。

- 戻り値: `boolean`（有効な判定が適用された場合 `true`）

例:

```js
initKintoneCustomLibRuntime({ isMobilePage: true, version: Date.now() });
```

<a id="resetkintonecustomlibruntime"></a>

### resetKintoneCustomLibRuntime()

- 動作概要: 内部キャッシュされたランタイム設定をクリアします。
- 戻り値: なし

例:

```js
resetKintoneCustomLibRuntime();
```

## 個別関数の使い方

> 注意: ここに書かれた使用例はライブラリの公開 API に合わせたもので、実行環境（ブラウザ / kintone / Node+jsdom）によって前提が異なります。kintone の DOM 要素を参照する関数は、テスト時に `kintone.app` のモックや `document`（jsdom）の用意が必要です。

以下では、個別の公開関数について順に説明します。まずはサブテーブル操作ボタン制御 API から整理し、その後に一般的なレコード操作・通知・ダイアログ系の関数へ続けて解説します。

### サブテーブル操作ボタン制御 API

<a id="setupsubtableoperationcontrol"></a>

#### setupSubtableOperationControl(options)

- 動作概要: サブテーブルの操作ボタン（例: `.subtable-operation-gaia`）を一括で非表示にするための共通コントローラを生成します。`observe: true` の場合は DOM 再描画後に自動で再適用されます。
- 戻り値: `controller` オブジェクト。`apply()` / `refresh()` / `disconnect()` / `destroy()` / `getState()` を持ちます。
- `options.mode` (string) — `alwaysHide` / `conditionalHide` / `scopedHide` のいずれか。
- `options.hideWhen` (boolean | function(context) => boolean) — `conditionalHide` で用いる判定条件。
- `options.target` (string | string[]) — `scopedHide` で対象とするサブテーブル識別子。`'all'` も可。
- `options.observe` (boolean, default `true`) — DOM 再描画時に再適用するか。
- `options.observerThrottleMs` (number, default `100`) — MutationObserver のスロットリング間隔。
- `options.hideLabelAndRowOps` (boolean, default `false`) — 行追加や行削除ラベル等の追加セレクタも対象にするか。
- `options.strategy` (string, default `'cssPlusInline'`) — `cssOnly` または `cssPlusInline`。
- `options.styleId` (string) — スタイル要素の重複注入を避けるための ID。
- `options.debug` (boolean) — デバッグログを出すか。
- `options.context` (any) — `hideWhen` で参照する任意コンテキスト。

例:

```js
// 320系: 常時非表示
const ctrl320 = setupSubtableOperationControl({
	mode: 'alwaysHide',
	observe: true,
});

// 364系: 条件付き非表示
const ctrl364 = setupSubtableOperationControl({
	mode: 'conditionalHide',
	hideWhen: (ctx) => !!(ctx && ctx.context && ctx.context.shouldHide),
	context: { shouldHide: true },
	observe: true,
});

// 626系: 対象サブテーブルだけ非表示
const ctrl626 = setupSubtableOperationControl({
	mode: 'scopedHide',
	target: ['SUBTABLE_CODE_1', 'SUBTABLE_CODE_2'],
	observe: true,
});

// 行追加/行削除ボタンや操作ラベルもまとめて非表示
const ctrlRowOps = setupSubtableOperationControl({
	mode: 'alwaysHide',
	hideLabelAndRowOps: true,
	observe: true,
});
```

<a id="updatesubtableoperationcontrol"></a>

#### updateSubtableOperationControl(controller, partialOptions)

- 動作概要: 既存の `controller` の `options` を部分更新し、即時に再適用します。
- `partialOptions` は `setupSubtableOperationControl()` と同じキーを受け取ります。`mode` や `context` などを変えた場合は、すぐに反映されます。

```js
updateSubtableOperationControl(ctrl364, {
	context: { shouldHide: false },
});
```

<a id="teardownsubtableoperationcontrol"></a>

#### teardownSubtableOperationControl(controller)

- 動作概要: 指定した `controller` を停止し、Observer・注入スタイル・内部状態を解放します。これにより制御は解除されます。

```js
teardownSubtableOperationControl(ctrl320);
```

<a id="getfieldvalueor"></a>

### getFieldValueOr(record, fieldCode, defaultValue)

- 動作概要: 指定した `record` から `fieldCode` の `value` を安全に取得します。存在しない場合や入力が不正な場合は `defaultValue` を返します。

- `record` (Object) — kintone の record オブジェクト想定（例: `{ name: { value: '山田' } }`）
- `fieldCode` (string) — 取得したいフィールドのフィールドコード
- `defaultValue` (any, optional) — フィールドが存在しない・取得に失敗した場合に返す既定値（省略時は `undefined`）

- 戻り値: フィールドの `value` または `defaultValue`。

注意: `defaultValue` を指定しない（省略）した場合は `undefined` が返されます。`field.value` が `null` や空文字列 (`''`) の場合は有効な値としてそのまま返されます。一方で `field.value` が `undefined` の場合は `defaultValue` を返します。

例:

```js
const rec = { name: { value: '山田' }, age: { value: 30 } };
getFieldValueOr(rec, 'name', '不明'); // -> '山田'
getFieldValueOr(rec, 'missing', '不明'); // -> '不明'
```

テストヒント: 無効な `record` を渡したときに `defaultValue` が返ることをアサートします。

<a id="kintoneeventon"></a>

### kintoneEventOn(events, handler)

- 動作概要: `kintone.events.on` にラップして指定イベントを登録します。ハンドラ内で例外が発生した場合はログ出力と `notifyError` の表示を行い、元のイベントオブジェクトを返します。

- `events` (string | string[]) — kintone のイベント名（例: `'app.record.create'`）または複数イベントの配列
- `handler` (function) — 登録するハンドラ。`event` オブジェクトを受け取り、必要に応じて `event` を返します（例外発生時は内部で処理されます）

例:

```js
kintoneEventOn('app.record.create', function (event) {
	return event;
});
```

テストヒント: `global.kintone = { events: { on: (ev, h) => h({}) } }` のようにスタブして、ハンドラが呼ばれることを確認します。

<a id="setrecordvalues"></a>

### setRecordValues(record, values)

- 動作概要: 指定した `values` のキーと値を `record` に反映します。既にオブジェクトで `value` プロパティがある場合は上書きし、なければ `{ value: ... }` を作成して設定します。

- `record` (Object) — 操作対象の kintone レコードオブジェクト
- `values` (Object) — フィールドコードをキー、設定する値を値とするオブジェクト。既に `{ value: ... }` 形式のフィールドは上書き、プリミティブ値の場合は `{ value: 値 }` を設定します。
  例:

```js
const r = { a: { value: 1 }, b: 2 };
setRecordValues(r, { a: 10, c: 3 });
// r.a.value === 10, r.c.value === 3
```

<a id="notifyerror"></a>

### notifyError(message, title = 'エラー', allowHtml = false)

- 動作概要: 指定メッセージを表示 UI で通知します。`allowHtml` が真の場合はサニタイズした HTML を挿入し、偽の場合はプレーンテキストとして表示します。アクセシビリティ用の属性（role/aria-live等）も設定されます。実行環境に応じて PC では `kintone.createDialog`、モバイルでは `kintone.mobile.createBottomSheet` を自動的に使用します（ランタイム初期化済みの場合はその判定を優先）。
- 文字サイズ・行間: 共通設定（[ダイアログ文字スタイル共通設定](#dialog-text-style)）を参照してください。
- 戻り値: `Promise<string | undefined>` を返します。`await` すると、通常は `OK` を受け取れます（notify 系は OK ボタンのみ表示）。ダイアログ API が利用できない場合や内部エラー時は `undefined` になります。`CANCEL` / `CLOSE` / `FUNCTION` は notify 系の現行設定では通常発生しません。

- `message` (string | Node) — ダイアログに表示する本文。Node を渡すとそのまま挿入可能（`allowHtml` の影響を受ける）
- `title` (string) — ダイアログタイトル（省略時は `'エラー'`）
- `allowHtml` (boolean) — true の場合 HTML を許可しサニタイズして挿入。false の場合はプレーンテキストとして扱う

例（ブラウザ）:

```js
notifyError('必須項目が未入力です');
// HTML を許可する場合（サニタイズされます）
notifyError('<strong>重要</strong><script>evil()</script>', 'エラー', true);

// Promise 対応: await で終了アクションを受け取れる
const action = await notifyError('送信に失敗しました', 'エラー');
if (action === 'OK') {
	console.log('ユーザーが閉じました');
}
```

テストヒント: jsdom と `kintone.createDialog`（PC）または `kintone.mobile.createBottomSheet`（モバイル）のモックを用意し、生成されたコンテナ内に `.kc-notify-error__message` が存在すること、不正な `script` 要素や `on*` 属性が削除されていることを確認します。

違い（用途の目安）:

- `notifyError`: フォームの必須入力漏れや致命的な例外など、ユーザーの即時対応を要するエラー表示に使います。デフォルトタイトルは `エラー` で、視認性の高いエラー系スタイル（クラス名例: `kc-notify-error`）を用います。
- `notifyWarning`: 処理は継続可能だが注意が必要なケース（例: 保存はできるが注意点あり）で使います。注意を促す警告系スタイル（クラス名例: `kc-notify-warning`）を用います。
- `notifyInfo`: 操作結果の確認や一般的な情報提供（例: 保存完了、非重大な通知）に使います。情報系の穏やかなスタイル（クラス名例: `kc-notify-info`）を用います。

実装上は `notifyError` / `notifyWarning` / `notifyInfo` の基本挙動（ダイアログ作成、サニタイズの適用など）は共通です。用途に応じてタイトルや CSS クラス、アクセシビリティの取り扱い（role や aria-live の優先度）を変えて使い分けてください。

<a id="notifyinfo"></a>

### notifyInfo(message, title = '情報', allowHtml = false)

- 動作概要: 情報表示用の通知 UI を表示します。操作の成功通知や一般的な案内に使い、`allowHtml` に応じてサニタイズされた HTML またはプレーンテキストを挿入します。実行環境に応じて PC では `kintone.createDialog`、モバイルでは `kintone.mobile.createBottomSheet` を自動的に使用します（ランタイム初期化済みの場合はその判定を優先）。
- 文字サイズ・行間: 共通設定（[ダイアログ文字スタイル共通設定](#dialog-text-style)）を参照してください。
- 戻り値: `Promise<string | undefined>` を返します。`await` すると、通常は `OK` を受け取れます（notify 系は OK ボタンのみ表示）。ダイアログ API が利用できない場合や内部エラー時は `undefined` になります。

- `message` (string | Node) — ダイアログに表示する本文
- `title` (string) — ダイアログタイトル（省略時は `'情報'`）
- `allowHtml` (boolean) — true の場合 HTML を許可しサニタイズして挿入

例:

```js
const infoAction = await notifyInfo('保存が完了しました', '情報');
console.log('notifyInfo action:', infoAction);
```

<a id="notifywarning"></a>

### notifyWarning(message, title = '注意', allowHtml = false)

- 動作概要: 注意喚起や軽度の問題を通知するための通知 UI を表示します。処理を継続できるがユーザーの注意を促したいケースで使用します。実行環境に応じて PC では `kintone.createDialog`、モバイルでは `kintone.mobile.createBottomSheet` を自動的に使用します（ランタイム初期化済みの場合はその判定を優先）。
- 文字サイズ・行間: 共通設定（[ダイアログ文字スタイル共通設定](#dialog-text-style)）を参照してください。
- 戻り値: `Promise<string | undefined>` を返します。`await` すると、通常は `OK` を受け取れます（notify 系は OK ボタンのみ表示）。ダイアログ API が利用できない場合や内部エラー時は `undefined` になります。

- `message` (string | Node) — ダイアログに表示する本文
- `title` (string) — ダイアログタイトル（省略時は `'注意'`）
- `allowHtml` (boolean) — true の場合 HTML を許可しサニタイズして挿入

例:

```js
const warningAction = await notifyWarning('入力内容を確認してください', '注意');
console.log('notifyWarning action:', warningAction);
```

<a id="dialog-text-style"></a>

### ダイアログ文字スタイル共通設定

- 対象: `notifyError` / `notifyInfo` / `notifyWarning` の本文、`showYesNoDialog` のフォールバック本文、`showInputDialog` の本文コンテナと入力コントロール。
- 適用方法: 内部関数 `_kc_applyDialogTextStyle` で文字サイズ・行間を共通適用しています。
- 調整ポイント: 文字サイズは `_KC_DIALOG_TEXT_FONT_SIZE`、行間は `_KC_DIALOG_TEXT_LINE_HEIGHT` を変更すると、対象ダイアログにまとめて反映されます。

<a id="showyesnodialog"></a>

### showYesNoDialog(message, title = '確認', options)

- 動作概要: `はい / いいえ` の2択確認ダイアログを表示します。PC では `kintone.showConfirmDialog()`、モバイルでは `kintone.mobile.showConfirmBottomSheet()` を優先し、利用できない場合は共通ダイアログ実装にフォールバックします。モバイル判定はランタイム初期化済みならその設定を優先します。
- 文字サイズ・行間: 共通設定（[ダイアログ文字スタイル共通設定](#dialog-text-style)）を参照してください。
- 戻り値: `Promise<boolean>`。`はい` 相当の操作なら `true`、`いいえ` やダイアログ表示失敗時は `false` を返します。

- `message` (string) — 本文メッセージ
- `title` (string) — ダイアログタイトル（省略時は `確認`）
- `options` (object, optional) — 表示オプション
- `options.yesText` (string) — OK 側ボタンラベル（省略時は `はい`）
- `options.noText` (string) — キャンセル側ボタンラベル（省略時は `いいえ`）
- `options.allowHtml` (boolean) — フォールバック表示時に本文を HTML として扱うか

例:

```js
const shouldUpdate = await showYesNoDialog(
	'選択したレコードを更新しますか？',
	'レコードの一括更新',
	{
		yesText: '更新する',
		noText: 'キャンセル',
	}
);

if (shouldUpdate) {
	// 更新処理
}
```

<a id="showinputdialog"></a>

### showInputDialog(options)

- 動作概要: `createDialog()` / `createBottomSheet()` を使って、入力フォーム付きダイアログを表示します。`text`、`number`、`date`、`textarea` の入力欄を宣言的に構成できます。
- 文字サイズ・行間: 共通設定（[ダイアログ文字スタイル共通設定](#dialog-text-style)）を参照してください。
- 入力値の扱い:
  - `number` はライブラリ側でも数値文字列かどうかを再検証し、`NaN` や文字列混入を返しません。
  - `date` は最終的に `YYYY-MM-DD` 形式へ正規化してから実在する日付かを再検証し、`2026-02-30` のような不正日付は返しません。
  - `date` では `20260608`、`2026/6/8`、`2026.6.8`、`2026年6月8日`、全角数字を含む同等表記のような「西暦4桁で始まる非曖昧な入力」を受け付けます。
  - `date` の入力エラー時は、例として `2026-06-18` や `20260618` を含む案内メッセージを表示します。
  - `required: true` を付けた項目は空文字を許可しません。
  - `text` / `textarea` では `maxLength` と `pattern` による追加バリデーションを指定できます。
- 検証エラー時の表示: 検証に失敗した場合はダイアログを閉じず、`notifyError()` を使ってフィールド名付きのエラーメッセージを統一的に表示します。ユーザーは入力値を保持したまま、その場で修正して再実行できます。
- フォーカス制御: 検証エラー後は、最初の不正項目へフォーカスを戻します。
- 戻り値: `Promise<{ action: string | undefined, values: Object | null } | undefined>`。`action === 'OK'` の場合に `values` に入力結果が入ります。キャンセル時は `values` は `null` です。入力エラーだけではダイアログは閉じないため、`VALIDATION_ERROR` は返しません。

- `options.title` (string) — ダイアログタイトル（省略時は `入力`）
- `options.description` (string, optional) — フォーム上部の補足説明
- `options.allowHtml` (boolean, optional) — `description` を HTML として扱うか
- `options.okButtonText` (string, optional) — OK ボタンラベル（省略時は `OK`）
- `options.cancelButtonText` (string, optional) — キャンセルボタンラベル（省略時は `キャンセル`）
- `options.fields` (Array<Object>) — 入力欄定義
- `fields[].name` (string) — 返却値オブジェクトのキーになる名前
- `fields[].label` (string) — 表示ラベル
- `fields[].type` (string) — `text` / `number` / `date` / `textarea`
- `fields[].value` (string | number, optional) — 初期値
- `fields[].placeholder` (string, optional) — プレースホルダー
- `fields[].required` (boolean, optional) — 必須属性
- `fields[].min` / `fields[].max` / `fields[].step` — `number` や `date` に渡す属性値
- `fields[].maxLength` (number, optional) — `text` / `textarea` の最大文字数
- `fields[].pattern` (string, optional) — 入力値が一致すべき正規表現パターン
- `fields[].patternMessage` (string, optional) — `pattern` 不一致時に表示するカスタムエラーメッセージ

例:

```js
const result = await showInputDialog({
	title: 'タスクの簡易登録',
	description: '必要な項目を入力してください。',
	okButtonText: '登録',
	fields: [
		{ name: 'title', label: 'タイトル', type: 'text', required: true, maxLength: 40 },
		{ name: 'count', label: '件数', type: 'number', min: 1, step: 1 },
		{ name: 'dueDate', label: '期限', type: 'date' },
		{
			name: 'memo',
			label: 'メモ',
			type: 'textarea',
			pattern: '^[A-Z]{3}-\\d{2}$',
			patternMessage: 'メモは ABC-12 の形式で入力してください。',
		},
	],
});

if (result && result.action === 'OK') {
	console.log(result.values.title);
	console.log(result.values.count);
	console.log(result.values.dueDate);
	console.log(result.values.memo);
}
```

<a id="setheadermenuspacebutton"></a>

### setHeaderMenuSpaceButton(id, textContent, onClick, styleOptions)

- 動作概要: ヘッダーメニューのスペース要素に指定 ID のボタンを追加または削除します。既に同一 ID の要素があれば差し替え（削除→追加）し、`textContent` が null/空文字の場合は削除動作を行います。
- 生成されるボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。kintone のデザインと調和したボタン外観にするには、アプリに **「51-modern-default」スタイルシート**を適用してください（`https://js.kacsw.or.jp/51-modern-default.css` から利用できます）。
- 注意: この関数は PC 版 API（`kintone.app.getHeaderMenuSpaceElement`）のみを使用します。モバイル版向け API は存在しないため、モバイル対応スイッチはありません。

- `id` (string) — ヘッダースペース内で一意に識別するための ID
- `textContent` (string | null) — ボタンに表示する文言。`null` または空文字で該当ボタンを削除
- `onClick` (function | null) — クリック時に呼ばれるハンドラ。`null` でイベント登録しない
- `styleOptions` (object | null) — 任意のスタイル指定（省略時は標準ボタン）
- `styleOptions.width` (string) — ボタン幅（例: `120px`, `100%`）
- `styleOptions.marginLeft` (string) — 左余白（例: `8px`, `0.5rem`）
- `styleOptions.marginRight` (string) — 右余白（例: `8px`, `0.5rem`）
- `styleOptions.horizontalMargin` (string) — 左右余白（後方互換用。`marginLeft`/`marginRight` 未指定側に適用）

テストヒント: `kintone.app.getHeaderMenuSpaceElement(id)` をモックして、返された要素に button が追加されることを検証します。

<a id="setrecordheadermenuspacebutton"></a>

### setRecordHeaderMenuSpaceButton(id, textContent, onClick, styleOptions)

- 動作概要: レコード詳細／追加／編集画面のヘッダーメニュー上部（`kintone.app.record.getHeaderMenuSpaceElement` が返す要素）に指定 ID のボタンを追加または削除します。既に同一 ID の要素があれば削除してから追加します。`textContent` が `null` または空文字の場合は削除動作を行います。
- 生成されるボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。kintone のデザインと調和したボタン外観にするには、アプリに **「51-modern-default」スタイルシート**を適用してください（`https://js.kacsw.or.jp/51-modern-default.css` から利用できます）。
- 注意: この関数は PC 版 API（`kintone.app.record.getHeaderMenuSpaceElement`）のみを使用します。モバイル版向け API は存在しないため、モバイル対応スイッチはありません。

- `id` (string) — 追加するボタン要素の id（ヘッダースペース内で一意に識別するための値）
- `textContent` (string | null) — ボタンに表示する文言。`null` または空文字で該当ボタンを削除
- `onClick` (function | null) — クリック時に呼ばれるハンドラ。関数でない場合は無視される
- `styleOptions` (object | null) — 任意のスタイル指定（省略時は標準ボタン）
- `styleOptions.width` (string) — ボタン幅（例: `120px`, `100%`）
- `styleOptions.marginLeft` (string) — 左余白（例: `8px`, `0.5rem`）
- `styleOptions.marginRight` (string) — 右余白（例: `8px`, `0.5rem`）
- `styleOptions.horizontalMargin` (string) — 左右余白（後方互換用。`marginLeft`/`marginRight` 未指定側に適用）

戻り値: 操作成功時は `true`（追加・削除が意図通り行われた場合）。要素が見つからない等で失敗した場合は `false`、引数が不正な場合は `undefined` を返すことがあります。

実装上の注意点:

- 生成するボタンには `type="button"` を明示しており、フォーム内で誤って `submit` を発生させないようにしています。
- ボタン追加時に `onClick` が関数であれば `addEventListener('click', onClick)` を登録します。

例（ブラウザ / kintone 上）:

```js
// ヘッダーメニュー上にボタンを追加
setRecordHeaderMenuSpaceButton('my-rec-btn', '詳細表示', function () {
	// 詳細処理
});

// 幅と左右余白を指定
setRecordHeaderMenuSpaceButton(
	'my-rec-btn',
	'詳細表示',
	function () {
		// 詳細処理
	},
	{
		width: '140px',
		marginLeft: '4px',
		marginRight: '12px',
	}
);

// ボタン削除
setRecordHeaderMenuSpaceButton('my-rec-btn', null);
```

テストヒント: jsdom でテストする場合は `global.kintone.app.record.getHeaderMenuSpaceElement = id => document.getElementById('your-container')` のようにモックを用意し、返される要素に対して button が追加されることを確認します。

<a id="setrecordheadermenuspacetext"></a>

### setRecordHeaderMenuSpaceText(id, innerHTML)

- 動作概要: レコード詳細／追加／編集画面のヘッダーメニュー上部（`kintone.app.record.getHeaderMenuSpaceElement` が返す要素）に任意の HTML 文字列を挿入して表示／削除します。挿入時は既存の同 ID 要素を削除してから追加し、`innerHTML` は内部でサニタイズされます。DOM が未準備の場合に備えて非同期リトライを行います。
- 注意: この関数は PC 版 API（`kintone.app.record.getHeaderMenuSpaceElement`）のみを使用します。モバイル版向け API は存在しないため、モバイル対応スイッチはありません。

- `id` (string) — 挿入する要素の ID（既存要素があれば上書きの代わりに削除して再作成）
- `innerHTML` (string | null) — 挿入する HTML（サニタイズされます）。`null` または空文字列の場合は要素を削除して非表示にします。

- 戻り値: 同期実行で要素が正常に追加できた場合は `true`（早すぎて追加できなかった場合は `false` が返ることがあります）。引数不正の場合は `false` を返します。非同期でリトライして最終的に要素が追加される場合があります。

例:

```js
// HTML をサニタイズして挿入
setRecordHeaderMenuSpaceText('rec-text', '<strong>ヘッダ情報</strong>');

// 削除
setRecordHeaderMenuSpaceText('rec-text', null);
```

テストヒント: jsdom で `document` を用意し、`global.kintone.app.record.getHeaderMenuSpaceElement = id => document.getElementById('rec-header-space')` のようにモックしてから呼び出し、返された要素に該当 ID の要素が appendChild されることを確認します。

<a id="setspacefieldbutton"></a>

### setSpaceFieldButton(spaceField, id, textContent, onClick, styleOptions)

- 動作概要: 指定したスペースフィールドにボタンを追加または削除します。追加時は `type="button"` を設定し、`onClick` を登録します。実行環境に応じて PC / モバイルの API を自動判定して `getSpaceElement` を使用します。
- API 選択ルール: `initKintoneCustomLibRuntime` または `KACSW_RUNTIME` で PC/モバイルが指定されていればその設定を優先します。未設定の場合は `location.pathname` による自動判定を行います。優先先が使えない場合はもう一方へフォールバックします。
- `getSpaceElement` が `null` を返す画面（スペースフィールド非対応画面など）では、要素追加は行われず `false` を返します。
- 生成されるボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。kintone のデザインと調和したボタン外観にするには、アプリに **「51-modern-default」スタイルシート**を適用してください（`https://js.kacsw.or.jp/51-modern-default.css` から利用できます）。

- `spaceField` (string) — スペースフィールドのコード
- `id` (string) — 追加する要素の ID（同一 ID があれば差し替える）
- `textContent` (string | null) — ボタンに表示する文言。`null` または空文字で削除
- `onClick` (function | null) — ボタンのクリックハンドラ
- `styleOptions` (object | null) — 任意のスタイル指定（省略時は標準ボタン）
- `styleOptions.width` (string) — ボタン幅（例: `120px`, `100%`）
- `styleOptions.marginLeft` (string) — 左余白（例: `8px`, `0.5rem`）
- `styleOptions.marginRight` (string) — 右余白（例: `8px`, `0.5rem`）
- `styleOptions.horizontalMargin` (string) — 左右余白（後方互換用。`marginLeft`/`marginRight` 未指定側に適用）

例（テスト）:

```js
// jsdom の DOM を作成しておき、
// global.kintone.app.record.getSpaceElement = code => document.getElementById(code);
setSpaceFieldButton('space-A', 'btn-1', '実行', () => console.log('clicked'));

// 幅と左右余白を任意指定
setSpaceFieldButton('space-A', 'btn-2', '実行', () => console.log('clicked'), {
	width: '140px',
	horizontalMargin: '8px',
});

// 左右を個別に指定
setSpaceFieldButton('space-A', 'btn-3', '実行', () => console.log('clicked'), {
	marginLeft: '4px',
	marginRight: '12px',
});
```

<a id="setspacefieldtext"></a>

### setSpaceFieldText(spaceField, id, innerHTML)

- 動作概要: 指定スペースフィールドに HTML（サニタイズ済）を挿入します。`innerHTML` が null または空文字列の場合は該当要素を削除します。DOM が未準備の場合はリトライ設計を採ることを想定しています。実行環境に応じて PC / モバイルの API を自動判定して `getSpaceElement` を使用します。
- API 選択ルールは `setSpaceFieldButton` と同じです（ランタイム設定優先、未設定時は自動判定）。
- スペース要素が取得できない場合、同期戻り値は `false` になります（内部リトライで後追い復旧する設計）。

- `spaceField` (string) — スペースフィールドのコード
- `id` (string) — 挿入する要素の ID
- `innerHTML` (string | null) — 挿入する HTML（サニタイズ済を想定）。`null` または空文字で削除

テストヒント: `initKintoneCustomLibRuntime({ isMobilePage: true })` を使うケースと、未初期化で `location.pathname = '/k/m/...'` を使うケースの両方を検証します。

<a id="setspacefielddisplay"></a>

### setSpaceFieldDisplay(spaceField, display)

- 動作概要: 指定したスペースフィールドの親ノードの `style.display` を切り替えます。`display` が `true` のときは表示、`false` のときは非表示に設定します。実行環境に応じて PC / モバイルの API を自動判定して `getSpaceElement` を使用します。
- API 選択ルールは `setSpaceFieldButton` と同じです（ランタイム設定優先、未設定時は自動判定）。
- 取得したスペース要素またはその親ノードが存在しない場合は `false` を返します。
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
