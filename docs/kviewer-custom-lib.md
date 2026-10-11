# kViewer 専用共通ライブラリ

`src/kviewer-custom-lib.js` は kViewer 用の独立したブラウザー向けライブラリです。kintone 用ライブラリや `all-window-exports.js` は必要ありません。kViewer のカスタマイズ設定で、本ファイルを呼び出し側コードより先に読み込んでください。読み込むだけではイベント登録・DOM 操作を行いません。

## kintone 用ライブラリとの仕様対応

| 項目 | kintone 用 `kintone-custom-lib.js` | kViewer 用 `kviewer-custom-lib.js` |
| --- | --- | --- |
| `getFieldValueOr` | `record[fieldCode].value` を取得し、フィールド欠落・`value: undefined`・不正引数では default 値。`null` や空文字は保持 | 同じレコード形式・fallback の扱い。`0`、`false`、空配列もそのまま保持し、レコードを変更しない |
| `createDependencyChecker` | `{name, source}` 配列を受け、missing を警告・通知し、通常 `false` / strict 時 `Error` | 同形式・戻り値・strict を踏襲。`notifyError` がなくても警告を出す |
| エラー報告 | コンソール出力と、利用可能な場合の `notifyError` | 引数・コンテキスト・DOM 要素の失敗をコンソールに明示。依存不足では利用可能な `notifyError` も使用 |
| 公開 | `window` へ直接公開 | `window` へ直接公開。kintone ライブラリに依存しない |
| イベント登録 | `kintoneEventOn` あり | 初版ではなし。呼び出し側が `kviewer.events.on` を使う |

`getFieldValueOr` の引数名は依頼案に合わせ `fallback` としました。位置引数と挙動は既存関数の `defaultValue` と同じです。

## API

すべての操作関数は同期関数です。操作結果として `true`（成功）または `false`（引数不正、対象外コンテキスト、要素欠落・未設定など）を返し、失敗は `console.warn` / `console.error` にも報告します。

### `getFieldValueOr(record, fieldCode, fallback)`

- `record`: kintone 形式のフィールドレコード（イベントコンテキスト全体ではありません）。今回確認された新マイページビューの本番公開画面では、`context.record` はラッパーであり、フィールドレコードは `context.record.kintoneRecord` にあります。渡す前にフィールドが `{ value: ... }` 形式であることを確認してください。共通関数はラッパーの自動展開を行いません。
- `fieldCode`: 空でない文字列。
- `fallback`: フィールドが欠落している、フィールド形状が不正、または `value` が `undefined` の場合の戻り値。省略時は `undefined`。
- 正常時は `record[fieldCode].value` をそのまま返します。`null`、空文字、数値 `0`、`false`、空配列はいずれも有効値です。
- 不正なレコードまたはフィールドコードは警告して `fallback` を返します。値を取得するだけでレコードは変更しません。

### `setFieldShown(context, fieldCode, shown)`

- `context`: `record.show` イベントのコンテキスト。公開関数 `context.getFieldElement(fieldCode)` を使い、返された単一 DOM 要素全体を操作します。
- `fieldCode`: 空でない文字列。`shown`: 真偽値のみ。
- 表示状態を変更できた場合 `true`。不正入力、未対応コンテキスト、getter 例外、要素欠落では警告して `false`。
- 初回の非表示時にインライン `display` 値を要素単位で保存し、再表示時に復元します。したがって元の `grid` や `inline-flex` などを保ちます。連続した同じ指定では余分な `display` 変更をしません。
- 一覧列、サブテーブル内の列・行、固定コンテンツは対象外です。

### `setFormBridgeButtonShown(context, shown)` / `setPrintCreatorButtonShown(context, shown)`

- `context`: `view.detail.show` / `record.show` のコンテキスト。`getDetailViewElement()`（優先）または `getDetailElement()` で対象詳細ビューを取得します。
- `shown`: 真偽値のみ。詳細ビュー内の `.kv-detail-fb-button` または `.kv-detail-pc-button` をすべて操作し、成功なら `true` を返します。
- 他ビューを含めた `document` 全体検索は行いません。再表示は各要素の元のインライン `display` を復元します。
- 対象ビュー内にボタンがない場合（ボタン未設定を含む）は警告して `false`。詳細範囲の取得不可・例外・不正入力も `false` です。

これらの表示操作はユーザー導線の制御であり、アクセス権限や値の秘匿、FormBridgeへの直接アクセス、編集・PDF出力権限を制御するものではありません。画面非表示値を FormBridge に引き継ぐ設定はサービス側で別途行ってください。表示関数は値の引き継ぎを行いません。

### `createDependencyChecker(requirements)`

- `requirements`: `[{ name: 'setFieldShown', source: 'kviewer-custom-lib.js' }]` 形式。
- 戻り値の `checkDependencies(options)` は全関数が存在すれば `true`、不足時は missing 関数を `source (name)` 形式で警告して `false` を返します。
- `options.strict === true` の場合、不足を報告したあと同じ詳細メッセージの `Error` を投げます。呼び出し側は戻り値または例外で続行／停止を選べます。
- グローバル `notifyError` があれば通知します。未定義または通知例外でも警告・戻り値／strict 例外の扱いは継続します。

## 呼び出し側の利用例

各ビューの業務条件、対象フィールドの選択、複数フィールドの逐次適用は呼び出し側が担当します。共通ライブラリは一括制御や業務ルールを持ちません。

以下は今回の新マイページビューの本番公開画面で観測された `context.record.kintoneRecord` を使う例です。フィールドコードは実際のコードに置き換えてください。

```js
(() => {
	const checkDependencies = createDependencyChecker([
		{ name: 'getFieldValueOr', source: 'kviewer-custom-lib.js' },
		{ name: 'setFieldShown', source: 'kviewer-custom-lib.js' },
	]);

	if (!checkDependencies()) return;

	kviewer.events.on('record.show', (context) => {
		const record = context.record && context.record.kintoneRecord;
		if (!record || typeof record !== 'object' || Array.isArray(record)) {
			console.error('record.show: kintoneRecord が取得できません。');
			return;
		}
		const status = getFieldValueOr(record, '受付状況', '');
		const targets = ['確認事項', '対応メモ'];
		targets.forEach((fieldCode) => {
			setFieldShown(context, fieldCode, status === '対応中');
		});
	});
})();
```

業務条件が各ビューで異なる場合はそのビュー側で条件を決めてください。kViewer は非同期イベントハンドラーの Promise 完了を待たずに次のハンドラーを実行するため、kintone のイベント処理と同等の完了待ちを仮定できません。本ライブラリはイベント登録・Promise制御を行いません。

## 公式情報と新マイページビューの確認事項

2026-10-11 時点で確認した[公式 JavaScript カスタマイズ仕様](https://kviewer.kintoneapp.com/help/customize/v2)には、`view.detail.show` の `getDetailViewElement()` と `record.show` の `getFieldElement(fieldCode)`、`getDetailElement()` が記載されています。また、複数ハンドラーは登録順に呼ばれる一方、非同期ハンドラーの Promise は待たない旨が明記されています。公開クラスとして `.kv-detail`、`.kv-detail-field`、`.kv-detail-fb-button`、`.kv-detail-pc-button` も掲載されています。

[新マイページビューの案内](https://faq.kintoneapp.com/--6ab59d39b2fc2da633e60065)は新デザインへの移行、ユーザー管理対応、FormBridge連携設定の別途確認などを案内していますが、上記 JavaScript 仕様のイベント対応表にはマイページビューが利用可能ビューとして記載されていません。このため、新マイページビューで同じイベント・コンテキスト関数・DOMクラスが使えることは公式記載だけからは確定できません。以下のユーザー提供結果で確認された本番公開画面の挙動と、公式仕様の記載は区別して扱います。

### ユーザー提供の本番公開画面での確認結果（2026-10-11）

今回のマイページビューの本番公開画面のコンソールログと目視報告では、次の内容が確認できました。当初はプレビューでの結果として記録していましたが、ユーザーから本番環境へ適用した状態での結果だったと訂正があったため、確認環境の記載を修正しました。これは当該本番公開画面での観測であり、すべてのビューや環境での対応を保証するものではありません。プレビューでの動作は別途確認していません。

- `record.show` が発火し、ハンドラーにコンテキストが渡されました。
- `context.getFieldElement` と `context.getDetailViewElement` が存在します。後者は公式表の `record.show` に記載された `getDetailElement` と名前が異なりますが、本ライブラリはどちらも受け付けます。
- `context.record.kintoneRecord` は配列ではないオブジェクトで、17個のキーがあります。`First_name` はオブジェクトとして存在し、自身の `value` プロパティを持つことが確認されました。値そのものは確認ログに出力していません。
- `getFieldElement('対象フィールド')` の結果は `null` でした。「対象フィールド」は例示用の文字列なので、実在する詳細フィールドのフィールドコードに置き換えて再確認してください。
- `context.getDetailViewElement()` は `.kv-detail` のDOM要素を返しました。
- `context.getFieldElement('First_name')` は `data-field-code="First_name"`、`data-field-type="SINGLE_LINE_TEXT"` を持つ `.kv-detail-field` のDOM要素を返しました。値の要素だけではなく、ラベル側と値側を含むフィールド全体の要素です。表示形式はクラスによる flex、インラインスタイルは `grid-area` の指定でした。
- `First_name` に対する `setFieldShown(context, 'First_name', false)` と、続く `setFieldShown(context, 'First_name', true)` がどちらも `true` を返しました。ユーザー提供ログで「非表示: 成功」「再表示: 成功」を確認しました。また、ユーザーの目視確認でラベルと値が両方消え、再表示後に元の位置・レイアウトへ戻ったことが報告されました。
- ボタン取得・表示制御、繰り返し呼び出し、複数ビュー間の分離は引き続き実画面では未検証です。
- 同じログに `connect-src` によるCSPの通信ブロックが出ています。通信先・発生元が提示されていないため原因や関連は未特定です。確認用のレコード・DOM取得コードおよび本ライブラリ自身はネットワーク通信を行いません。

## 実画面での確認手順（未検証部分）

追加検証は、まず本番に影響しない検証用ビューまたはプレビューにテスト用カスタマイズとして本ライブラリを先に読み込み、イベントの発火とコンテキスト関数をコンソールで確認します。本番公開画面に残っているタイマー付き表示確認コードや診断ログは、確認終了後に外してください。

1. `kviewer.events.on('record.show', context => console.log(context, context.getFieldElement && context.getFieldElement('対象フィールド')))` を一時登録し、詳細表示で発火・戻り値を確認します。
2. イベントが提供されない場合は `view.detail.show` と `context.getDetailViewElement()` を個別に確認します。イベント対応表にないため、発火・関数の存在を前提にしません。
3. `setFieldShown(context, '対象フィールド', false)` → `true` の順に呼び、フィールド全体と元のレイアウトを確認します。連続呼び出しでも同じ状態を確認します。
4. 対象詳細ビューにFormBridge/PrintCreatorボタンを複数設定し、各関数で非表示・再表示を確認します。別の詳細ビューを同時に描画し、そちらのボタンが変化しないことも確認します。
5. ボタン未設定時は `false` と警告になることを確認します。非表示値の FormBridge 引き継ぎは別途サービス設定で検証します。

この作業環境から実画面操作は実施していません。ユーザー提供ログで確認できた範囲は上記に記載し、それ以外は未検証として扱います。
