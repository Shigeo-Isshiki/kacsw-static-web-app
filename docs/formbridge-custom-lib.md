# formbridge-custom-lib 使い方リファレンス

## 概要・バージョン

FormBridge 新バージョン JavaScript カスタマイズ API のうち、レコード取得、フィールド値・エラー設定、値の転記と初期化を補助する独立したブラウザー向けライブラリです。現行ソース・確認済み通常配布版は **1.0.0** です。

公式仕様との照合結果は[FormBridge API 検証記録](./verification/formbridge-custom-lib.md)を参照してください。

## 読み込み・依存関係

- ソース：[src/formbridge-custom-lib.js](../src/formbridge-custom-lib.js)
- 配布URL：https://js.kacsw.or.jp/formbridge-custom-lib.js
- 対象：FormBridge 新バージョン JavaScript カスタマイズ API。旧バージョン API は対象外です。
- FormBridge のフォーム用 JavaScript カスタマイズに本ライブラリを登録し、利用側のカスタマイズコードより先に読み込んでください。`all-window-exports.js` や kintone・kViewer 用ライブラリは不要です。
- `window.formBridgeCustomLib` 名前空間に公開します。既に同名のグローバルがある場合は上書きせず、読み込み時に例外を投げます。
- ライブラリ自体はイベント登録、フォーム値の変更、外部通信を行いません。利用側でイベントを登録し、必要な関数のみ呼び出してください。
- `formBridge.events.on` はフォーム読み込み直後から利用できます。一方、`formBridge.fn` の関数は各画面の `.show` イベント内またはそれ以降で利用します。初期化時点での `formBridge.fn` 依存チェックは行わず、利用するイベント内で確認してください。

共通ライブラリが読み込まれなかった場合は、ライブラリ内の依存確認を呼べません。利用側は最初に名前空間を確認してください。
以下の関数例は、利用側の初期化コードを IIFE に入れ、最初の確認後に `fb` を定義した状態を前提とします。

```js
(function () {
	if (typeof window.formBridgeCustomLib === 'undefined') {
		console.error('formbridge-custom-lib.js が読み込まれていません。');
		return;
	}
	const fb = window.formBridgeCustomLib;
	// この後に利用側の初期化を記述する
})();
```

## 公開関数の目次

| 関数名                                       | 機能                                                                   | リファレンス                     |
| -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| `createDependencyChecker(requiredFunctions)` | グローバル関数やFormBridge APIの不足をまとめて確認する関数を生成する。 | [参照](#createdependencychecker) |
| `getFormBridgeRecord()`                      | FormBridge の回答レコードを取得する。                                  | [参照](#getformbridgerecord)     |
| `getFieldValue(record, fieldCode, options)`  | レコードから任意・必須フィールドの値を取得する。                       | [参照](#getfieldvalue)           |
| `setFieldValue(fieldCode, value)`            | FormBridge の通常フィールドに値を設定する。                            | [参照](#setfieldvalue)           |
| `setFieldError(fieldCode, errorMessage)`     | フィールドエラーを設定・解除する。                                     | [参照](#setfielderror)           |
| `copyFieldValues(record, mappings, options)` | 対応表に従ってフィールド値を転記する。                                 | [参照](#copyfieldvalues)         |
| `initializeFields(record, fields)`           | 明示した複数フィールドに初期値を設定し、指定したエラーを解除する。     | [参照](#initializefields)        |

## 関数リファレンス

### 依存確認

<a id="createdependencychecker"></a>

#### createDependencyChecker(requiredFunctions)

- `requiredFunctions` (`string[]`)：存在を確認するグローバル関数のパス。例：`'notifyError'`、`'formBridge.events.on'`、`'formBridge.fn.getRecord'`。空配列は有効です。
- 戻り値：`checkDependencies(options)` 関数。全て存在すれば `true`、不足があれば `false` を返します。
- `options.strict` (`boolean`, optional, default `false`)：`true` の場合、不足をまとめた `Error` を投げます。
- 不正な配列・パス・options は `TypeError` です。依存不足では不足パスを `console.warn` にまとめ、`notifyError` が存在すれば一般的な不足通知を試みます。通知失敗は `console.debug` に記録し、依存チェック結果を返します。
- FormBridge の `formBridge.fn` は `.show` より前には利用できない場合があります。該当関数の確認はイベントハンドラー内で行ってください。

```js
(function () {
	const fb = window.formBridgeCustomLib;
	if (typeof fb === 'undefined') {
		console.error('formbridge-custom-lib.js が読み込まれていません。');
		return;
	}
	const check = fb.createDependencyChecker(['formBridge.events.on']);
	if (!check()) return;

	const checkFormApi = fb.createDependencyChecker([
		'formBridge.fn.getRecord',
		'formBridge.fn.setFieldValue',
	]);
	formBridge.events.on('form.show', function () {
		if (!checkFormApi()) return;
		// 必要な処理
	});
})();
```

### レコード・フィールド値の取得

<a id="getformbridgerecord"></a>

#### getFormBridgeRecord()

- 動作概要：`formBridge.fn.getRecord()` を呼び出し、現在の回答レコードを返します。
- 引数：なし。
- 戻り値：FormBridge のフィールドコードをキーに持つレコードオブジェクト。
- FormBridge API が未定義の場合は `Error`、API がレコードオブジェクトを返さない場合は `TypeError` です。FormBridge API が投げた例外もそのまま伝播します。
- API の利用可能タイミングを守り、`.show` イベント内またはそれ以降に呼び出してください。フィールド値変更イベント内の `getRecord()` は変更前の値を返す場合があるため、変更後の値にはイベント引数の `value` を使います。

<a id="getfieldvalue"></a>

#### getFieldValue(record, fieldCode, options)

- `record` (`object`)：フィールドレコード。イベントコンテキストではなく、`getFormBridgeRecord()` の戻り値などを渡します。
- `fieldCode` (`string`)：空白だけではないフィールドコード。値を trim して検索することはありません。
- `options.required` (`boolean`, optional, default `false`)：必須フィールドとして扱う場合 `true`。
- `options.fallback` (`any`, optional)：任意フィールドの欠落時に返す代替値。`required: true` と同時には指定できません。
- 戻り値：`record[fieldCode].value`。`0`、`false`、空文字、`null`、空配列はそのまま返します。値が `undefined`、フィールド自体が欠落、または `value` を持たない場合は、任意なら代替値（未指定時は `undefined`）、必須なら `ReferenceError` です。
- 不正レコード・フィールドコード・options は `TypeError` です。値の取得時に発生した例外は隠さず伝播します。

```js
const record = fb.getFormBridgeRecord();
const optional = fb.getFieldValue(record, 'OPTIONAL_CODE', { fallback: '' });
const required = fb.getFieldValue(record, 'REQUIRED_CODE', { required: true });
```

### フィールド値・エラーの設定

<a id="setfieldvalue"></a>

#### setFieldValue(fieldCode, value)

- 動作概要：`formBridge.fn.setFieldValue(fieldCode, value)` を呼び出します。イベントコンテキスト上の旧式 `setFieldValue` は使用しません。
- `fieldCode` (`string`)：空白だけではないフィールドコード。
- `value` (`any`)：設定値。値を変換しません。
- 戻り値：FormBridge API の戻り値（公式型定義では `void`）。
- 不正コードは `TypeError`、API未定義は `Error`、APIの設定失敗はその例外が伝播します。
- 回答画面（通常フォーム・ステップフォーム）で利用できます。確認・完了画面で呼ぶと公式 API が例外を投げます。

<a id="setfielderror"></a>

#### setFieldError(fieldCode, errorMessage)

- 動作概要：`formBridge.fn.setFieldValueError(fieldCode, errorMessage)` を呼び出します。
- `fieldCode` (`string`)：空白だけではないフィールドコード。
- `errorMessage` (`string | null`)：空白だけではないエラーメッセージ。`null` はエラー解除です。
- 戻り値：FormBridge API の戻り値（公式型定義では `void`）。API未定義・設定失敗は例外として伝播します。
- 回答画面（通常フォーム・ステップフォーム）で利用できます。確認・完了画面では利用できません。

```js
fb.setFieldError('EMAIL', 'メールアドレスを確認してください');
fb.setFieldError('EMAIL', null); // エラー解除
```

### フィールド転記・一括初期化

<a id="copyfieldvalues"></a>

#### copyFieldValues(record, mappings, options)

- 動作概要：保存欄などの値を、明示した対応表に従って `formBridge.fn.setFieldValue` で転記します。値の変換・業務判定はしません。
- `record` (`object`)：転記元・転記先のフィールドを含むレコード。
- `mappings` (`Array<{source: string, target: string}>`)：転記元と転記先のフィールドコード。転記先の重複は禁止です。
- `options.copyEmpty` (`boolean`, optional, default `true`)：`false` の場合、`null`、`undefined`、空文字、空配列は転記しません。`0` と `false` は転記します。
- 戻り値：実際に設定したフィールド数。空の対応表では `0`。
- 対応表、転記元、転記先、必要APIを全て操作前に検証します。対応するフィールドの欠落や値未定義は `ReferenceError`、不正引数は `TypeError` です。FormBridge API の実行例外は伝播します。
- 設定APIの実行開始後にAPIが例外を投げた場合、それ以前に成功した設定をロールバックする機能はありません。

フォーム表示イベント自体は利用側で登録してください。

```js
formBridge.events.on('form.show', function () {
	const record = fb.getFormBridgeRecord();
	fb.copyFieldValues(
		record,
		[
			{ source: 'SAVED_NAME', target: 'INPUT_NAME' },
			{ source: 'SAVED_EMAIL', target: 'CONFIRM_EMAIL' },
		],
		{ copyEmpty: false }
	);
});
```

<a id="initializefields"></a>

#### initializeFields(record, fields)

- 動作概要：指定した複数フィールドに値を設定します。初期化する業務条件、対象フィールド、設定値は利用側が決めます。入力欄・保存欄のいずれも明示的に指定できます。
- `record` (`object`)：対象フィールドを含むレコード。
- `fields` (`Array<{fieldCode: string, value: any, clearError?: boolean}>`)：各フィールドの初期値。値プロパティは必須で、`''`、`[]`、`0`、`false`、`null` などをそのまま設定します。同じフィールドコードの重複は禁止です。
- `clearError` (`boolean`, optional, default `false`) が `true` のフィールドだけ、値設定後に `formBridge.fn.setFieldValueError(fieldCode, null)` でエラーを解除します。
- 戻り値：値を設定したフィールド数。空配列では `0`。
- 全フィールド・値・エラー解除指定・必要APIを操作前に検証します。フィールド欠落は `ReferenceError`、不正引数は `TypeError` です。FormBridge API の実行例外は伝播します。API実行開始後の部分的な成功はロールバックされません。

```js
formBridge.events.on('form.show', function () {
	const record = fb.getFormBridgeRecord();
	if (fb.getFieldValue(record, 'APPLICATION_TYPE') === 'NONE') {
		fb.initializeFields(record, [
			{ fieldCode: 'INPUT_REASON', value: '', clearError: true },
			{ fieldCode: 'SAVED_REASON', value: '' },
			{ fieldCode: 'INPUT_OPTIONS', value: [] },
		]);
	}
});
```

## 制約・注意事項

- FormBridge 新バージョン JavaScript カスタマイズ API の `formBridge.events.on`、`formBridge.fn.getRecord`、`formBridge.fn.setFieldValue`、`formBridge.fn.setFieldValueError` を使用します。イベントコンテキスト内の `getRecord`、`setFieldValue`、`setFieldValueError` は公式型定義で後方互換用として非推奨です。
- `formBridge.events` はイベント登録用です。`formBridge.fn` はレコード取得・設定用で、`.show` イベント内またはそれ以降に利用します。値設定・エラー設定APIは回答画面（通常・ステップフォーム）専用です。
- サブテーブルの操作・エラー管理、イベント登録機構、フィールド型変換、個別業務条件は含みません。
- 必須設定エラーや API エラーを空値に置き換えません。回答レコードや入力値をログ・通知へ出力しません。
- API の公開仕様は公式資料に基づいています。実際の FormBridge フォーム上の挙動・ファイル設定・権限別動作は別途実画面で確認してください。

## 更新履歴・配布記録

| バージョン | 記録日     | 内容                                                                                                                                                                        | 配布状況 |
| ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1.0.0      | 2026-10-30 | FormBridge の依存確認、値取得・設定、転記、一括初期化を追加。2026-10-30に通常配布を確認（[記録](./verification/library-distribution.md#追加確認formbridge-custom-lib-100)） | 確認済み |
