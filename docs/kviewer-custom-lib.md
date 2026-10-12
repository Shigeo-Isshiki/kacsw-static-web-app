# kviewer-custom-lib 使い方リファレンス

このドキュメントは [src/kviewer-custom-lib.js](../src/kviewer-custom-lib.js) が公開する関数ごとに、使い方と契約（引数・戻り値・副作用・エラー処理）をまとめたリファレンスです。作成時期ではなく、機能別に整理しています。

通常配布版は **1.1.0** です。配布URLは https://js.kacsw.or.jp/kviewer-custom-lib.js です。

## 公開 API サマリ

### レコード・依存チェック補助

- [getFieldValueOr(record, fieldCode, fallback)](#getfieldvalueor)
- [createDependencyChecker(requirements)](#createdependencychecker)
- [redirectToRecordDetail(recordCode)](#redirecttorecorddetail)

### 表示制御

- [setFieldShown(context, fieldCode, shown)](#setfieldshown)
- [setStaticContentShown(context, staticCode, shown)](#setstaticcontentshown)
- [setFormBridgeButtonShown(context, shown)](#setformbridgebuttonshown)
- [setPrintCreatorButtonShown(context, shown)](#setprintcreatorbuttonshown)

### ページ全体の操作抑止

- [installCopyPrintRestrictions()](#installcopyprintrestrictions)

### 補足

- [読み込み・共通仕様](#usage)
- [kintone用ライブラリとの仕様対応](#compatibility)
- [公式仕様と実画面確認結果](#verification)
- [自動検証・実画面の追加確認](#testing)
- [連携ボタンの一時診断コード](#diagnostics)
- [更新履歴・配布記録](#history)

<a id="usage"></a>

## 読み込み・共通仕様

- kViewerのカスタマイズ設定で、本ライブラリを呼び出し側コードより先に読み込んでください。候補版ファイルと通常配布版の二重読み込みは避けてください。
- kViewer専用の独立したブラウザー向けライブラリです。kintone用ライブラリや一括exportファイルは不要です。各公開関数をライブラリ自身が `window` に割り当てます。
- 読み込むだけではイベント登録・表示変更・操作抑止・遷移を行いません。ネットワーク通信・レコード更新・REST API呼び出しも行いません。
- 表示操作・登録・遷移指示は同期処理です。成功時 `true`、失敗時 `false` とコンソール報告を基本とします。値取得と依存チェックは各関数の戻り値・例外契約を参照してください。
- 業務条件、制御対象の選択、複数フィールド・複数静的コードへの逐次適用、イベント登録は各ビュー用コードの責務です。一括表示API・業務ルール・期間判定は持ちません。
- kViewerは非同期イベントハンドラーのPromise完了を待たずに次のハンドラーを実行します。kintone同等の完了待ちを仮定しないでください。本ライブラリはイベント登録ラッパーやPromise制御を追加しません。

**表示・導線の制御はアクセス権限の制御ではありません。** ブラウザーに渡された値の秘匿、FormBridgeへの直接アクセス禁止、編集・PDF出力権限を保証しません。非表示値のFormBridge引き継ぎはサービス側の別設定であり、表示関数は引き継ぎ処理を行いません。

## 個別関数の使い方

### レコード・依存チェック補助

<a id="getfieldvalueor"></a>

#### getFieldValueOr(record, fieldCode, fallback)

- 動作概要：kintone形式のレコードから指定フィールドの `value` を取得します。レコードは変更しません。
- `record` (object)：フィールド情報を持つレコード。イベントコンテキスト全体ではありません。確認された新マイページビューでは `context.record` はラッパーで、フィールドレコードは `context.record.kintoneRecord` です。関数側でラッパーを自動展開しません。
- `fieldCode` (string)：空白のみではないフィールドコード。正常なコードをtrimして検索することはありません。
- `fallback` (any, optional)：取得できない場合の戻り値。省略時は `undefined`。
- 戻り値：自身の `value` プロパティがある場合、その値を返します。`null`、空文字、`0`、`false`、空配列はそのまま保持します。
- 未入力・欠落時：フィールド欠落、フィールドがオブジェクトでない、`value` がない、または `undefined` の場合はfallbackを返します。正常な欠落・未入力では警告しません。
- エラー時：不正なrecord・fieldCodeは警告してfallbackを返します。取得例外はエラーを報告してfallbackを返します。

```js
const record = { First_name: { value: '例' }, empty: { value: '' } };
getFieldValueOr(record, 'First_name', '未設定'); // '例'
getFieldValueOr(record, 'empty', '未設定'); // ''
getFieldValueOr(record, 'missing', '未設定'); // '未設定'
```

<a id="createdependencychecker"></a>

#### createDependencyChecker(requirements)

- 動作概要：必要な外部関数が `globalThis` にあるかを確認する関数を生成します。
- `requirements` (Array&lt;Object&gt;)：`{ name, source }` の配列。`name` は必須関数名、`source` は不足時に表示する出典ファイル名です。単純なグローバル関数名を指定してください。
- 戻り値：`checkDependencies(options)` 関数。全関数が存在すれば `true`、不足時は `false`。
- `options.strict`：不足時に例外を投げる設定。既存実装同様、truthyな指定で `Error` を投げます。通常は `true` / `false` を指定してください。
- 不足時：不足関数だけを `source (name)` 形式で `console.warn` に列挙します。グローバルの `notifyError` があれば通知も試みます。未定義でも警告し、通知例外は `console.debug` に報告して戻り値・strict例外の処理を継続します。
- 入力検証の制限：配列以外は空配列として扱い、null要素・文字列nameを持たない定義は無視します。設定自体の厳格検証APIではありません。

```js
const checkDependencies = createDependencyChecker([
	{ name: 'setFieldShown', source: 'kviewer-custom-lib.js' },
	{ name: 'setStaticContentShown', source: 'kviewer-custom-lib.js' },
]);
if (checkDependencies()) {
	// 呼び出し側の処理を続行
}
// 不足を致命的エラーとして扱う場合：
checkDependencies({ strict: true });
```

<a id="redirecttorecorddetail"></a>

#### redirectToRecordDetail(recordCode)

- 動作概要：既存リストビューの一覧パスからレコード詳細へのURLを生成し、`window.location.href` に設定します。
- `recordCode` (string)：kViewerの `__kviewer_record_code__`。空文字・空白のみ・非文字列は警告して `false`。正常なコードはtrimせず `encodeURIComponent` でエンコードします。
- URL：現在の `origin` と `pathname` の末尾スラッシュを除いたパスに、`/detail/{encodedCode}` を付加します。元の検索クエリ・ハッシュは引き継ぎません。コードを任意URLとして扱わず、外部オリジンへの遷移機能は持ちません。
- 戻り値：遷移指示を設定できれば `true`。location API欠落・URL生成例外・設定例外は報告して `false`。
- 制限：`true` は遷移先の読み込み成功を保証しません。呼び出し元は既存リストビューの一覧パスを前提とします。詳細画面から一覧パスを推測して作り直す処理はありません。新マイページビューのURL対応は未確認です。

```js
kviewer.events.on('records.show', (context) => {
	const records = context.records;
	if (Array.isArray(records) && records.length === 1) {
		redirectToRecordDetail(records[0].__kviewer_record_code__);
	}
});
```

1件かどうかの判断は呼び出し側です。ここでの1件は取得配列が1件という意味で、全検索結果が1件とは限りません。

### 表示制御

<a id="setfieldshown"></a>

#### setFieldShown(context, fieldCode, shown)

- 動作概要：`context.getFieldElement(fieldCode)` が返す単一の詳細フィールド要素全体を表示・非表示にします。
- `context` (object)：`getFieldElement` を持つイベントコンテキスト。使用例は `record.show`。
- `fieldCode` (string)：空白のみではないフィールドコード。正常なコードをtrimして検索しません。
- `shown` (boolean)：`false` で非表示、`true` でこの関数による非表示前の状態を復元します。
- 戻り値：操作成功時 `true`。不正入力・API欠落・要素欠落・取得や適用例外は報告して `false`。
- 表示状態：初回非表示時のインライン `display` 文字列を保存し、再表示時に復元します。繰り返し非表示で保存内容を上書きせず、同じ指定では不要なdisplay変更をしません。この関数が隠していない要素への `true` は状態を変更しません。
- 対象：返された要素内のフィールド値・項目名・枠線や装飾は一緒に非表示になります。別要素のラベル・罫線、外側コンテナの罫線・背景は自動では連動しません。ただし、独立したラベル・罫線でも `getFieldElement(code)` が目的の要素全体を返す場合は、そのコードを個別に指定できます。実装はフィールド種別を制限しません。
- 対象外：一覧列、サブテーブル内の列・行、公開APIで取得できない固定コンテンツの専用制御。静的コードへの自動フォールバックはありません。見た目やコードの接頭辞ではなく取得方式で使い分け、メインコンテンツ内の `data-static-code` を対象とする場合は [setStaticContentShown](#setstaticcontentshown) を使用してください。
- 制限：既存仕様を維持し、元のdisplay優先度や `hidden` を保存・操作する関数ではありません。

アプリ196の新マイページビューでは、見出し・罫線の計10件を `getFieldElement` で取得でき、見出しは `data-field-type="LABEL"`、罫線は `data-field-type="HR"` として出力されることが報告されています。カスタマイズ側で次のように本関数を使用し、氏名変更の罫線は表示・非表示の両方、他9件は確認した各条件で戻り値trueと正常な表示状態を確認しました。確認範囲の詳細は [実画面確認結果](#verification) を参照してください。他ビューへの対応を保証するものではありません。

```js
setFieldShown(context, 'static_field_line_Name_change_group', canNameChangeGroup);
```

以下は新マイページビューで確認されたレコード形状を使う例です。業務条件と複数フィールドの逐次適用はビュー側に残します。コードは実際のフィールドコードに置き換えてください。

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
		const shown = getFieldValueOr(record, '受付状況', '') === '対応中';
		['確認事項', '対応メモ'].forEach((fieldCode) => {
			setFieldShown(context, fieldCode, shown);
		});
	});
})();
```

<a id="setstaticcontentshown"></a>

#### setStaticContentShown(context, staticCode, shown)

- 動作概要：メインコンテンツ内の単一静的コードに一致する全要素を表示・非表示にします。
- `context` (object)：`getMainContentElement()` を持つイベントコンテキスト。使用例は `view.show`。
- `staticCode` (string)：空白のみではない静的コンテンツコード。正常なコードはtrimせず完全一致で検索します。
- `shown` (boolean)：`false` で非表示、`true` で元の状態を復元します。
- 対象取得：取得したメインコンテンツ自身と子孫の `data-static-code` 属性値を直接比較します。同じコードが複数あればすべて対象にします。コードをセレクターへ埋め込まないため、引用符・バックスラッシュ等も扱えます。
- 対象範囲：メインコンテンツ外は検索しません。API欠落時に `document` 全体へフォールバックしません。
- 表示状態：初回非表示時のインラインdisplayと優先度を保存し、`display: none !important` にします。再表示は保存した状態を復元します。繰り返し非表示で保存内容を上書きせず、`hidden` は変更しません。
- 初期非表示：この関数が隠していない要素への `true` はdisplayを変更しません。元からインライン・CSSで非表示だった要素を強制表示しません。
- 戻り値：全対象への適用成功で `true`。不正入力・API欠落・対象なし・取得失敗は報告して `false`。一部適用失敗は報告して `false` とし、他対象の処理は継続します。成功した対象はロールバックせず、保存状態を保持して再試行・復元できます。

**静的ラベル・罫線は、コードを設定しただけで対象になるとは限りません。** 実DOMで `data-static-code` が指定コードに一致し、メインコンテンツ内にあることが必要です。公式記載はダッシュボードの静的ラベル・画像です。独立した罫線や他ビューの静的要素への属性付与は、実画面で確認してください。コードの接頭辞では対象を判定しません。

アプリ196の新マイページビューでは、診断した罫線・見出しのコードが `data-static-code` ではなく `data-field-code` として出力されていました。対象10件は `getFieldElement` で取得できたため、カスタマイズ側で [setFieldShown](#setfieldshown) を使用する対応が行われました。共通ライブラリ本体・配布URLは変更せず、本関数に別属性検索や自動フォールバックは追加していません。`no matching static content found in main content` は対象取得の失敗を意味し、表示用CSSの適用失敗ではありません。この観測を他のラベル・罫線や全ビューへ一般化しないでください。

```js
kviewer.events.on('view.show', (context) => {
	// shown はこのビュー側で期間などの業務条件から決めた真偽値。
	setStaticContentShown(context, 'static-field-content_Charge', shown);
});
```

例えば実DOMの `data-static-code` が `example_static_label` であれば、次の呼び出しで制御できます。これはアプリ196の確認済みコードではなく、取得条件を示す仮の例です。

```js
setStaticContentShown(context, 'example_static_label', false);
setStaticContentShown(context, 'example_static_label', true);
```

この例のラベル・罫線について実DOM確認済みという意味ではありません。期間判定・複数コードの逐次適用は呼び出し側で行います。

<a id="setformbridgebuttonshown"></a>

#### setFormBridgeButtonShown(context, shown)

- 動作概要：対象詳細に属する `.kv-detail-fb-button`（FormBridge編集ボタン）をすべて表示・非表示にします。
- `context` (object)：`getDetailViewElement()`（優先）または `getDetailElement()` を持つコンテキスト。使用例は `view.detail.show` / `record.show`。
- `shown` (boolean)：`false` で非表示、`true` で元の表示状態を復元します。
- 対象取得：詳細要素内を優先し、入れ子の別コンテナ・別詳細のボタンを除外します。詳細内で未検出の場合だけ最寄りの `.kv-container` を確認し、そのコンテナに属する `.kv-detail` が取得対象1件のみで `.kv-record-menu` も1件のみなら、メニュー内の対象ボタンを取得します。入れ子コンテナの詳細・メニュー・ボタンは数・対象に含めません。
- 戻り値：全対象の操作成功時 `true`。不正入力・取得失敗・対応が一意でない・検索範囲内で未検出・適用失敗は報告して `false`。一部適用失敗の場合も他対象の操作は継続します。
- 失敗診断：検索範囲・件数や対応の曖昧さを報告します。未検出だけを根拠にサービス設定の「ボタン未設定」とは断定しません。
- 表示状態：非表示前のインラインdisplay文字列を各要素に保存・復元します。反復非表示では保存内容を上書きしません。この関数が隠していない対象への `true` は変更しません。`hidden`・display優先度の保存復元や強制非表示は追加していません。
- 制限：無条件のページ全体検索、固定タイマー、監視は行いません。対応が一意でない場合は操作前に拒否します。

```js
kviewer.events.on('record.show', (context) => {
	// shouldShowFbButton は各ビュー側の業務条件で判定。
	setFormBridgeButtonShown(context, shouldShowFbButton);
});
```

<a id="setprintcreatorbuttonshown"></a>

#### setPrintCreatorButtonShown(context, shown)

- 動作概要：対象詳細に属する `.kv-detail-pc-button`（PrintCreator PDF出力ボタン）をすべて表示・非表示にします。
- `context`、`shown`、対象範囲、表示復元、戻り値、失敗時の報告は [setFormBridgeButtonShown](#setformbridgebuttonshown) と同じです。内部の取得・表示処理を共用します。
- FormBridgeボタンは操作しません。PDF出力権限や直接アクセスを制御する機能ではありません。

```js
kviewer.events.on('record.show', (context) => {
	// shouldShowPcButton は各ビュー側の業務条件で判定。
	setPrintCreatorButtonShown(context, shouldShowPcButton);
});
```

### ページ全体の操作抑止

<a id="installcopyprintrestrictions"></a>

#### installCopyPrintRestrictions()

- 動作概要：明示的な呼び出しにより、ページ全体の一部のコピー・印刷関連操作を抑止します。引数なし。
- 戻り値：必要な登録の成功、または同じページで登録済みの場合は `true`。必須DOM/API欠落・登録失敗は報告して `false`。実装は登録済み判定の前にも必須DOM/APIを検証します。
- 対象イベント：`contextmenu` と `selectstart` の既定動作を抑止します。`keydown` のCtrl/Cmd＋P（大文字Pも対象）とPrintScreenは既定動作・伝播を抑止し、他キーは変更しません。
- 印刷開始・終了：`beforeprint` はbodyを `display: none !important` にし、`afterprint` は元のインラインdisplayと優先度を復元します。重複する開始通知で保存内容を上書きしません。印刷中にbodyが差し替わっても、復元は変更した元のbodyを対象とします。
- 互換API：`matchMedia('print')` の新API `addEventListener/removeEventListener`、旧API `addListener/removeListener` の順に使用します。任意APIがない場合は警告して必須登録を継続します。利用可能なAPIの呼び出し例外は登録失敗として後始末します。
- 印刷用CSS：次のstyleを登録します。反復呼び出しでリスナー・CSSを重複追加しません。

```css
@media print {
	body {
		display: none !important;
	}
}
```

- 登録途中の失敗：この呼び出しが追加したリスナー・styleのみを解除します。解除失敗項目は保持し、次回呼び出しで後始末を再試行します。未解除項目が残る間は新規登録せず `false` を返します。登録完了フラグは全登録成功後に設定します。元からある無関係なリスナー・CSSは変更しません。
- コールバックの失敗：印刷時の非表示・復元・media通知処理の失敗もコンソールへ報告します。復元失敗では保存状態を保持し、後続の終了通知で再試行できます。初回の `true` は将来のコールバック成功を保証しません。
- 公開解除API・細かな設定オプションはありません。使うイベントとビューは呼び出し側で決めます。

```js
kviewer.events.on('records.show', () => {
	installCopyPrintRestrictions();
});
kviewer.events.on('record.show', () => {
	installCopyPrintRestrictions();
});
```

**完全なコピー・保存・印刷・スクリーンショット防止機能ではありません。** PrintScreenキーイベントの抑止はOSの画面キャプチャを禁止しません。Ctrl/Cmd＋C自体を抑止する実装でもありません。アクセス権限や値の秘匿とは別で、選択・コンテキストメニュー・印刷の操作性とアクセシビリティに影響します。

<a id="compatibility"></a>

## kintone用ライブラリとの仕様対応

既存の [kintone-custom-lib.js](../src/kintone-custom-lib.js) 本体を確認して実装しました。

| 項目 | kintone用 | kViewer用 |
| --- | --- | --- |
| 値取得 | `getFieldValueOr(record, fieldCode, defaultValue)` | 位置引数・値の扱いを踏襲。引数名は `fallback` |
| 依存チェック | `{ name, source }` 配列、通常の真偽値、strict時の例外 | 同形式。通知が使えなくても不足を警告 |
| エラー報告 | コンソール、利用可能な通知 | 操作失敗はコンソール。依存不足は利用可能な `notifyError` も使用 |
| 公開方式 | `window` へ直接公開 | 同方式。kintone用ライブラリには依存しない |
| イベント登録 | `kintoneEventOn` | 対応ラッパーなし。ビュー側が `kviewer.events.on` を使う |

既存のフィールド・ボタン表示ヘルパーはdisplay文字列のみを保存します。その仕様は変更せず、静的コンテンツと印刷処理には優先度も保存する別の内部ヘルパーを共用しました。

第2段階の重複処理原本（73行）はリポジトリ内になく、依頼文の動作仕様・URL式を基に実装しました。原本との行単位の同一性を確認したものではありません。登録失敗時の解除・再試行、印刷開始重複時の保存保護、表示優先度の復元、URLの末尾スラッシュ除去、入力検証・失敗報告を追加しています。

<a id="verification"></a>

## 公式仕様と実画面確認結果

### 公式資料

- [公式JavaScriptカスタマイズ仕様](https://kviewer.kintoneapp.com/help/customize/v2)（2026-10-11確認）：`view.detail.show` の `getDetailViewElement()`、`record.show` の `getFieldElement(fieldCode)` と `getDetailElement()`、公開DOMクラス、ダッシュボード静的ラベル・画像の `data-static-code` が記載されています。非同期ハンドラーのPromiseを待たないことも明記されています。
- [新マイページビューの案内](https://faq.kintoneapp.com/--6ab59d39b2fc2da633e60065)：新デザインへの移行とFormBridge連携設定等の案内です。上記JavaScript仕様のイベント対応表にマイページビューは明記されていないため、公式記載と以下の観測結果は区別します。

### 利用者報告による確認範囲

この作業環境から実画面操作を行ったものではありません。当初プレビューとして記録した新マイページの結果は、本番適用後だったとの訂正を受け、本番公開画面の確認として記録しています。プレビューや全ビューでの対応を保証しません。

| 画面・機能 | 確認済み | 未確認・証拠の制限 |
| --- | --- | --- |
| 新マイページ（2026-10-11） | `record.show` 発火、`getFieldElement` と `getDetailViewElement` の存在。後者は `.kv-detail` を返す。`context.record.kintoneRecord` はオブジェクト（17キー）、`First_name` は自身の `value` を持つ | プレビュー、同画面の連携ボタン、複数ビュー間の分離は未確認 |
| 新マイページの `First_name` | `.kv-detail-field` 全体を取得。属性は `data-field-code="First_name"`、`data-field-type="SINGLE_LINE_TEXT"`。flexクラスとgrid-area指定。非表示・再表示とも `true`、目視でラベルと値が消え、元の配置へ復元 | 反復呼び出しは自動テストと区別。例示用の「対象フィールド」での取得はnullだった |
| 196新マイページのラベル・罫線（2026-10-12） | `record.show` で対象10件を `getFieldElement` により取得。DOMに接続されmain内にあり、`data-field-code` は指定コードと完全一致。見出しは `LABEL`、罫線は `HR`（内部に `hr` 1件）、内部に別の `data-field-code` 要素や取得要素の `data-static-code` はなし。`setFieldShown` で下表の各条件の戻り値trueと正常な表示状態を確認 | 氏名変更の罫線以外の9件は下表と逆の表示条件が未確認。他ビュー・他環境、一時ログ削除後の最終版反映後の実画面は未確認 |
| 226既存リストビュー（1.0.1） | 詳細・mainの外側の `.kv-record-menu` に両ボタン。共通祖先は `.kv-container`、詳細・各種ボタンは各1件。イベント時点と2描画フレーム後で変化なし。修正後の編集非表示、印刷表示・非表示と戻り値trueを目視・ログ確認 | 編集ボタンの表示条件、既存フィールドの個別スモーク確認、クリック・レイアウトの詳細報告はなし |
| 207（1.1.0） | 一覧・詳細で `success: true`、操作も問題なしとの報告 | 個々のキー・OS操作・印刷通知別の詳細結果は未報告 |
| 154（1.1.0） | 詳細遷移の動作確認完了との報告 | ログ未取得。戻り値ログの確認とは区別 |
| 353ダッシュボード（1.1.0） | `shown: false / success: true`、非表示を確認 | 期間内表示は実画面未確認。表示・復元は自動テスト結果のみ |

#### アプリ196の詳細確認範囲

代表罫線 `static_field_line_Name_change_group` は、イベント時点と2描画フレーム後の両方でmainを取得できDOMに接続されていましたが、main内の `data-static-code` 要素数と、main内・ページ全体の指定コード一致数は0件でした。一方、`getFieldElement` は罫線全体を包む要素を返しました。対象取得失敗の原因は属性の違いとして整理しています。2フレームの観測だけであらゆる描画遅延を否定するものではありません。

自宅情報変更の見出しは、kViewer設定のコードに意図しない半角スペースがあり、利用者が `static_field_title_ Home_information_change_group` から `static_field_title_Home_information_change_group` へ修正しました。ライブラリによるtrimや入力補正で対応したものではありません。

| 対象 | 確認したshown | 戻り値・目視結果 |
| --- | --- | --- |
| 氏名変更の罫線 | false / true | 両方true、非表示・表示とも正常 |
| 氏名変更の見出し | true | true、正常 |
| 自宅情報変更の見出し・罫線 | true | 各true、正常 |
| 勤務先情報変更の見出し・罫線 | true | 各true、正常 |
| 支部選択希望変更の見出し・罫線 | false | 各true、正常 |
| 都道府県士会異動の見出し・罫線 | false | 各true、正常 |

カスタマイズ側では計10件を `setFieldShown` に統一し、未使用の `setStaticContentShown` の依存指定を削除しました。業務条件・イベント登録・レコード取得・通常フィールド制御は変更せず、追加CSS・固定タイマー・DOM監視・ページ全体検索による表示制御も追加していません。対応はカスタマイズ側で完結し、共通ライブラリの変更依頼はありません。

一時診断・検証ログとラッパーの削除後、カスタマイズ側でPrettier整形、ワークスペース設定のESLint、`node --check`、一時コード・旧関数呼び出しの残存確認が正常終了したとの報告があります。本リポジトリで再実行した結果ではなく、ログ削除後の最終版をkViewerへ反映した後の実画面確認とも区別します。

226の実画面ログ：

```text
KV_BUTTON_TEST {"eventNumber":1,"formBridge":{"shown":false,"success":true},"printCreator":{"shown":true,"success":true}}
KV_BUTTON_TEST {"eventNumber":2,"formBridge":{"shown":false,"success":true},"printCreator":{"shown":false,"success":true}}
```

226の確認した状態では取得修正だけで有効になり、`hidden`・`!important` の追加は不要でした。全CSS環境への保証ではありません。新マイページ確認時には `connect-src` のCSP通信ブロックも報告されましたが、宛先・発生元が不明で原因は未特定です。本ライブラリは通信しません。

<a id="testing"></a>

## 自動検証・実画面の追加確認

### 自動検証記録

次のコマンドは1.1.0開発時に成功しました。文書の再編だけを理由にテストを再実行した記録ではありません。

- `npm test`：新規・既存の全テスト。値取得、フィールド・ボタン表示、226のメニュー配置、別コンテナ分離、曖昧な対応の拒否を含む。
- `npm run lint`：全ソースのESLint。
- `npx prettier --check "src/**/*.{js,css,html}" test/test-kviewer-stage-two.js`：成功。
- `for file in src/*.js test/test-*.js; do node --check "$file" || exit 1; done`：成功。
- `git diff --check`：成功。

個別テストは [test-kviewer-custom-lib.js](../test/test-kviewer-custom-lib.js)、[test-kviewer-button-diagnostics.js](../test/test-kviewer-button-diagnostics.js)、[test-kviewer-stage-two.js](../test/test-kviewer-stage-two.js) です。`node -r ./test/setup-tests.js test/対象ファイル.js` で個別実行できます。1.0.1開発時のライブラリ・診断テストも成功しています。VS Codeのテストツールでは検出されなかったため、既存のNode実行方式を使用しました。

第2段階テストには、反復登録、キーと伝播、印刷通知重複、display・優先度復元、matchMedia新旧APIと任意API欠落、登録・解除失敗後の再試行、コールバック失敗報告、URLエンコードと例外、静的要素のルート・子孫・複数対象・範囲外・特殊文字・初期非表示・一部適用失敗を含みます。サービス側の実HTML・CSS全体、OS制約、CSP、印刷UIを保証するテストではありません。

### 実画面確認の進め方

- まず本番に影響しない検証用ビューを優先し、各取得APIの存在と対象のDOM範囲を確認します。静的ラベル・罫線は `data-static-code` の一致とmain内配置を確認してください。
- 業務条件が異なるレコードや画面状態で、表示・非表示・遷移が指定どおりかを確認します。取得配列の件数を全検索結果の件数と混同しないでください。
- 値の動的変更を前提としない運用では、同一画面の「非表示→再表示→再非表示」は必須実画面テストにはしません。反復・復元の耐久性は自動テストで担保します。表示条件の未確認と同一画面の復元テストは区別します。
- 連携ボタンの検証で旧方式が既に非表示にしていると、新方式の効果を判定できません。重複操作を避け、各対象画面でサービスCSS下の挙動を確認します。`hidden` や優先度操作が別途必要と判明した場合は、保存復元契約を含め再検討します。
- 一時診断・タイマー付き検証コードを終了後に撤去し、設定反映・再読み込みします。レコード・氏名・URL・HTMLを不要にログ出力しないでください。

<a id="diagnostics"></a>

## 連携ボタンの一時診断コード

[scripts/kviewer-button-diagnostics.js](../scripts/kviewer-button-diagnostics.js) はブラウザー用の一時診断ファイルです。ライブラリや通常配布対象には含めません。検証用ビューで再現できる場合はそちらを優先し、必要な場合だけ該当ビューへ一時追加します。

- `kviewer` 識別子でイベントAPIを参照します。`window.kviewer` がなくても識別子が使える環境と、API未定義の警告をテスト済みです。
- `record.show` 時点と2描画フレームコールバック後に、`KV_BUTTON_DIAGNOSTIC` で始まるJSONを出力します。これは有限回の診断であり、描画完了保証・表示制御の回避策ではありません。
- APIの有無・返却範囲、詳細内とページ全体の件数、包含関係、共通祖先・祖先列、hiddenの有無・displayと優先度・計算済み表示状態を読み取ります。`node` は診断中だけの連番です。
- 表示変更・ネットワーク通信・無期限監視は行いません。タグ名、限定公開クラス、兄弟位置で構造を表し、レコード、テキスト、リンク、URL、属性値、任意クラス、HTML、例外メッセージは出力しません。
- 旧方式適用後の表示状態だけでは、通常の `display: none` の有効性を判定できません。
- 同じ `eventNumber` の2件を共有してください。取得後はファイルを設定から外し、ページ再読み込みでハンドラーを除去します。コンテキスト全体やDOMそのものを出力する過去の診断コードは併用しません。

<a id="history"></a>

## 更新履歴・配布記録

| バージョン | 変更内容 | 配布記録 |
| --- | --- | --- |
| 1.0.0 | 独立した初版、値取得・依存チェック・単一フィールド・両連携ボタンの5関数 | `4773c6f` |
| 1.0.1 | 226の実DOMに基づくメニュー内ボタン取得、一意性検証・別コンテナ除外、未設定と断定しない警告。開発ブランチ `investigate/kviewer-button-scope` | `08593d1`。2026-10-12にCI・デプロイ・配布作成成功と、URLの1.0.1およびソース一致を確認 |
| 1.1.0 | 操作抑止・詳細遷移・静的コンテンツ表示を追加。開発ブランチ `feature/kviewer-stage-two`、候補版 `bd47b91` | `bf869cc`。代表3画面の確認報告を記録後、2026-10-12にCI・デプロイ・配布作成成功と、URLの1.1.0およびソース完全一致を確認 |

1.0.0の226では、両ボタンが詳細要素外にあるため未検出となり、非表示処理が実行されませんでした。業務条件を変えず、ページ全体で取得し `hidden` と `display: none !important` を使う旧方式へ戻して復旧したとの報告を受け、実DOM診断と1.0.1の取得修正を行いました。当時、他4本は公開画面へボタン共通化を未適用でした。1.0.1確認結果と通常配布更新を経て、各画面の確認を行いながら適用を再開する扱いです。

1.1.0配布内容のSHA-256は `601ab10a884a755dbfbbec9faa529269e16d5ed40e14fd334f4b796f2ede010b` でした。通常配布の更新はデプロイ結果に加えてURLの内容一致で確認しています。新機能を含む今後の更新も、候補版の確認結果と未確認事項を区別して判断します。
