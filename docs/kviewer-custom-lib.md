# kviewer-custom-lib 使い方リファレンス

## 概要・バージョン

kViewer専用の独立した基本操作ライブラリです。現行ソース・確認済み通常配布版は **1.1.0** です。

<a id="usage"></a>

## 読み込み・依存関係

- ソース：[src/kviewer-custom-lib.js](../src/kviewer-custom-lib.js)
- 配布URL：https://js.kacsw.or.jp/kviewer-custom-lib.js

- kViewerのカスタマイズ設定で、本ライブラリを呼び出し側コードより先に読み込んでください。候補版ファイルと通常配布版の二重読み込みは避けてください。
- kViewer専用の独立したブラウザー向けライブラリです。kintone用ライブラリや一括exportファイルは不要です。各公開関数をライブラリ自身が `window` に割り当てます。
- 読み込むだけではイベント登録・表示変更・操作抑止・遷移を行いません。ネットワーク通信・レコード更新・REST API呼び出しも行いません。
- 表示操作・登録・遷移指示は同期処理です。成功時 `true`、失敗時 `false` とコンソール報告を基本とします。値取得と依存チェックは各関数の戻り値・例外契約を参照してください。
- 業務条件、制御対象の選択、複数フィールド・複数静的コードへの逐次適用、イベント登録は各ビュー用コードの責務です。一括表示API・業務ルール・期間判定は持ちません。
- kViewerは非同期イベントハンドラーのPromise完了を待たずに次のハンドラーを実行します。kintone同等の完了待ちを仮定しないでください。本ライブラリはイベント登録ラッパーやPromise制御を追加しません。

**表示・導線の制御はアクセス権限の制御ではありません。** ブラウザーに渡された値の秘匿、FormBridgeへの直接アクセス禁止、編集・PDF出力権限を保証しません。非表示値のFormBridge引き継ぎはサービス側の別設定であり、表示関数は引き継ぎ処理を行いません。

## 公開関数の目次

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

## 関数リファレンス

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

ラベル・罫線でも、`getFieldElement(code)` が目的の要素全体を返す場合は、そのコードを `setFieldShown` に指定します。確認済みの実画面条件は [検証記録](verification/kviewer-custom-lib.md#verification) を参照してください。

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

`data-field-code` として出力され、`getFieldElement` で取得できる対象には [setFieldShown](#setfieldshown) を使用します。本関数は別属性検索や自動フォールバックを行いません。`no matching static content found in main content` は検索範囲内に一致対象がないことを意味し、表示用CSSの適用失敗ではありません。

```js
kviewer.events.on('view.show', (context) => {
	// shown はこのビュー側で期間などの業務条件から決めた真偽値。
	setStaticContentShown(context, 'static-field-content_Charge', shown);
});
```

例えば実DOMの `data-static-code` が `example_static_label` であれば、次の呼び出しで制御できます。仮のコードなので、実際の属性値に置き換えてください。

```js
setStaticContentShown(context, 'example_static_label', false);
setStaticContentShown(context, 'example_static_label', true);
```

期間判定・複数コードの逐次適用は呼び出し側で行います。

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

## 制約・注意事項

<a id="compatibility"></a>

### kintone用ライブラリとの仕様対応

既存の [kintone-custom-lib.js](../src/kintone-custom-lib.js) 本体を確認して実装しました。

| 項目         | kintone用                                             | kViewer用                                                       |
| ------------ | ----------------------------------------------------- | --------------------------------------------------------------- |
| 値取得       | `getFieldValueOr(record, fieldCode, defaultValue)`    | 位置引数・値の扱いを踏襲。引数名は `fallback`                   |
| 依存チェック | `{ name, source }` 配列、通常の真偽値、strict時の例外 | 同形式。通知が使えなくても不足を警告                            |
| エラー報告   | コンソール、利用可能な通知                            | 操作失敗はコンソール。依存不足は利用可能な `notifyError` も使用 |
| 公開方式     | `window` へ直接公開                                   | 同方式。kintone用ライブラリには依存しない                       |
| イベント登録 | `kintoneEventOn`                                      | 対応ラッパーなし。ビュー側が `kviewer.events.on` を使う         |

既存のフィールド・ボタン表示ヘルパーはdisplay文字列のみを保存します。その仕様は変更せず、静的コンテンツと印刷処理には優先度も保存する別の内部ヘルパーを共用しました。

### 対応環境・確認範囲

[公式JavaScript仕様](https://kviewer.kintoneapp.com/help/customize/v2) のイベント対応表に新マイページビューは明記されていません。公開APIの存在と実DOMの取得範囲は対象画面で確認してください。特定アプリの実画面確認を全ビュー・全CSS環境へ一般化しません。

<a id="verification"></a>
<a id="testing"></a>
<a id="diagnostics"></a>

詳しい実画面確認結果、自動テストの記録、一時診断コードの使い方は [調査・検証記録](verification/kviewer-custom-lib.md) を参照してください。

表示・導線の制御はアクセス権限の制御ではありません。操作抑止はコピー・印刷・OSの画面キャプチャを完全には防げず、操作性・アクセシビリティに影響します。

文書の構成は [文書作成標準](README.md) に従います。

<a id="history"></a>

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                               | 記録・配布確認                                                       |
| ---------- | ---------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| 1.0.0      | 未確認     | 値取得・依存チェック・単一フィールド・連携ボタンの初版 | `4773c6f`。配布日の詳細は未記録                                      |
| 1.0.1      | 2026-10-12 | 対象コンテナのメニュー内ボタン取得と一意性検証         | `08593d1`。CI・デプロイ・配布作成成功、配布URLのソース一致を確認     |
| 1.1.0      | 2026-10-12 | 操作抑止・詳細遷移・静的コンテンツ表示を追加           | `bf869cc`。CI・デプロイ・配布作成成功、配布URLのソース完全一致を確認 |

開発ブランチ・候補版・配布ハッシュなどの詳細は [調査・検証記録](verification/kviewer-custom-lib.md) を参照してください。
