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
- `shown`: 真偽値のみ。詳細要素内の `.kv-detail-fb-button` または `.kv-detail-pc-button` を優先して取得します。入れ子の別コンテナ・別詳細に属するボタンは除外します。
- 詳細内で対象が見つからない場合だけ、最寄りの `.kv-container` を確認します。そのコンテナに直接属する `.kv-detail` が取得要素1件のみで、`.kv-record-menu` も1件のみなら、そのメニューに属する対象ボタンをすべて操作します。入れ子コンテナの詳細・メニュー・ボタンは対象に含めません。コンテナ内の詳細またはメニューが複数の場合、対応が一意ではないため警告して `false` を返します。先に対象を確定してから表示状態を変更します。
- 他ビューを含めた `document` 全体検索は行いません。再表示は各要素の元のインライン `display` を復元します。
- 詳細内にも、一意に対応したメニュー内にも対象が見つからなければ、検索範囲内で未検出と警告して `false`。未検出だけを根拠にサービス設定上の「ボタン未設定」とは判断できません。詳細範囲の取得不可・例外・不正入力も `false` です。

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

## 既存リストビューの連携ボタン不具合（2026-10-12、1.0.1配布済み）

アプリ226の既存リストビューの詳細画面で、配布版1.0.0の両ボタン関数が取得範囲内で対象を見つけられず、非表示処理を実行できなかったことが報告されました。業務条件を変えず、ページ全体で対象を取得し `hidden` と `display: none !important` を使う従来方式へ戻したところ、利用者が復旧を確認しています。他4本の公開画面にはボタン共通化を未適用との報告です。これは新マイページビューの単一フィールド表示確認とは別件です。

利用者による実DOM診断で、今回の取得失敗原因は詳細要素内だけを検索していたことと確認されました。両ボタンは取得された `.kv-detail` および `.kv-main-content` の外側の `.kv-record-menu` 内にあり、最寄りの共通祖先は `.kv-container` でした。当該コンテナの詳細要素・FormBridgeボタン・PrintCreatorボタンは各1件です。イベント時点と2描画フレーム後で配置・件数は変わりません。これは226の既存リストビューの観測であり、新マイページビューなど全環境への一般化はしません。

表示状態は従来方式適用後のものです。従来方式は検索範囲と表示方式の両方が異なるため、`hidden`・`!important` の必要性を今回のログや復旧結果だけで確定しません。

### 一時診断コード

[scripts/kviewer-button-diagnostics.js](../scripts/kviewer-button-diagnostics.js) はブラウザー用の一時診断ファイルです。ライブラリや配布対象には含めません。検証用ビューで再現できる場合はそちらを優先し、必要な場合だけ226のカスタマイズに一時追加して、詳細画面を読み直してください。226の復旧済みボタン制御は変更しません。

- `record.show` の時点と、その後の2回の描画フレームコールバック後に、`KV_BUTTON_DIAGNOSTIC` で始まるJSONを出力します。後者は有限回の比較診断であり、描画完了の保証や表示制御の回避策ではありません。
- イベントAPIは既存カスタマイズと同じグローバル識別子 `kviewer` で参照します。`window.kviewer` にプロパティがなくても、`kviewer` が利用可能なら登録できます。この環境差とAPI未定義時の警告を回帰テストで確認しています。
- 各取得APIの有無・取得結果、詳細要素内／ページ全体のボタン件数、包含関係、共通祖先・祖先列を記録します。`node` は診断中だけの連番で、DOMの実際のIDではありません。
- 要素はタグ名、限定した公開 `kv-*` クラス、兄弟要素内の位置で表します。レコード、テキスト、リンク、URL、属性値、任意のクラス名、HTML、例外メッセージは出力しません。
- `hidden` の有無、インライン `display` と優先度、計算済み表示状態も読み取ります。表示を変更せず、ネットワーク通信・無期限監視は行いません。
- 復旧方式が既に非表示にしている場合、CSS状態はその方式の適用後の状態です。このログだけでは通常の `display: none` の有効性は検証できません。
- 結果は該当する `eventNumber` の2件を共有してください。確認後は診断ファイルを設定から外し、ページを再読み込みして登録ハンドラーを除去してください。過去のコンテキスト全体やDOM要素を出力する診断コードは併用しません。

### 現在の変更・検証・配布状況

ローカルの1.0.1候補版では、詳細内の検索を維持し、未検出の場合のみ最寄りコンテナの一意に対応するメニューを検索する取得修正を実装しました。未検出時の `false` は維持し、未設定とは断定しません。ページ全体検索、固定タイマー、監視は追加していません。ボタンの表示方式・保存復元方式、値取得・フィールド表示は今回変更していません。

診断コードの自動テストは、包含関係・共通祖先・件数・表示非変更・機密情報非出力を確認します。ライブラリの回帰テストには、226で観測された「コンテナ内の詳細・メインコンテンツの外にメニューとボタンがある」配置を再現しました。詳細内の既存配置、同種ボタン複数、入れ子・隣接の別コンテナとの分離、複数詳細・複数メニュー時の拒否、非表示→再表示→再非表示も対象としています。回帰テストは観測された構造を再現したもので、サービスの実HTML・CSS全体の再現ではありません。

### 候補版1.0.1の226実画面確認結果

利用者から、候補版1.0.1と検証用カスタマイズによる次のログが提供され、目視でもボタン制御が有効と報告されました。

```text
KV_BUTTON_TEST {"eventNumber":1,"formBridge":{"shown":false,"success":true},"printCreator":{"shown":true,"success":true}}
KV_BUTTON_TEST {"eventNumber":2,"formBridge":{"shown":false,"success":true},"printCreator":{"shown":false,"success":true}}
```

- FormBridge編集ボタンの非表示、PrintCreator印刷ボタンの表示・非表示を、226の当該実画面で確認済みです。対応する関数の戻り値はすべて `true` でした。
- 確認した状態では取得範囲修正で表示制御が機能し、`hidden` や `display: none !important` を追加する必要は認められませんでした。全ビュー・全CSS環境への保証ではありません。
- FormBridgeの `shown: true` は今回のログに含まれないため、編集ボタンの表示条件は未確認です。226の既存フィールド動作も今回の報告だけでは個別確認済みとは扱いません。
- クリック操作による確認やレイアウトについての詳細な報告はなく、今回の報告以上の個別確認は記録しません。

226では表示されたレコードの値で条件を判定し、同一画面で値を動的に変更する運用ではありません。したがって、**同一画面での「非表示→再表示→再非表示」は今回の適用判断の必須実画面テストにはしません。** 実画面では条件の異なるレコードで指定どおりの表示・非表示を確認し、共通関数の反復呼び出し・非表示後の再表示・元の通常インライン表示状態の復元は自動テストで担保します。編集ボタンの表示条件の未確認は、同一画面の再表示テスト未完了とは区別します。

元の `hidden`・インライン優先度の保存復元は今回追加していません。これらを操作する方式が必要と判明した場合は別途実装・検証します。表示制御はアクセス権限を制御しません。

### 通常配布へ進める際の残確認事項

取得修正自体は226の実画面で有効と確認済みであり、追加の強制非表示処理や同一画面の反復テストを条件とせず、1.0.1として通常配布へ進める候補とします。ただし、未確認項目を確認済みとすることなく、編集ボタンの表示条件に合うレコードでの確認と226の既存フィールド動作のスモーク確認を残事項として共有します。既存フィールド処理は未変更で、自動テストは成功しています。

`main` への反映は別途承認後に行い、デプロイ結果と通常配布URLのバージョン・内容を確認してから配布更新完了とします。他4本への適用はその確認後に再開し、各対象画面で条件の異なるレコードを確認します。診断・検証用コードは確認終了後に撤去してください。

この調査段階の自動検証は次のとおりです。

- `node -r ./test/setup-tests.js test/test-kviewer-custom-lib.js` — 成功（226配置の回帰テスト、複数詳細・メニューの拒否、入れ子コンテナ・別詳細の分離、メニュー取得例外、既存の値取得・フィールド表示テストを含む）。
- `node -r ./test/setup-tests.js test/test-kviewer-button-diagnostics.js` — 成功。
- `npx prettier --check src/kviewer-custom-lib.js scripts/kviewer-button-diagnostics.js test/test-kviewer-custom-lib.js test/test-kviewer-button-diagnostics.js` — 成功。
- `npx eslint src/kviewer-custom-lib.js` — 成功。
- `node --check src/kviewer-custom-lib.js` / `node --check scripts/kviewer-button-diagnostics.js` / `git diff --check` — 成功。
- VS Codeのテスト実行ツールではテストが検出されなかったため、既存のNode実行方式を使用しました。
- `npm test` — 成功（候補版1.0.1の取得修正を含む全テスト）。
- `npx prettier --check "src/**/*.{js,css,html}"` / `npx eslint "src/**/*.js"` — 成功（リポジトリ全体のソースチェック）。

1.0.1は調査用ブランチ `investigate/kviewer-button-scope` で開発後、`main`（`08593d1`）へ反映しました。2026-10-12にデプロイ・CI・配布作成の成功、および通常配布URLのバージョン1.0.1とソースの完全一致を確認しました。以下の第2段階候補版は、この配布済み1.0.1とは別です。

## 第2段階：1.1.0

開発ブランチは `feature/kviewer-stage-two` です。追加対象は次の3関数のみです。このリポジトリで各アプリのカスタマイズは変更していません。候補版の代表3画面の確認報告を受け、2026-10-12に通常配布への反映依頼がありました。既存5関数と1.0.1の連携ボタン取得修正は維持します。

### `installCopyPrintRestrictions()`

- 引数なし。必須登録が完了した場合と同じページで登録済みの場合は `true`。DOM・必須API欠落や登録失敗は警告またはエラーを報告して `false`。
- ページ全体の `contextmenu`、`selectstart` の既定動作を抑止します。`keydown` の Ctrl/Cmd＋P（大文字Pも対象）と PrintScreen は既定動作と伝播を抑止します。それ以外のキーは変更しません。
- `beforeprint` はbodyを `display: none !important` にし、`afterprint` は元のインラインdisplayと優先度を復元します。重複する印刷開始通知では元の保存状態を上書きしません。元のbodyを保持して復元するため、印刷中にbodyが差し替わっても別のbodyを復元対象にはしません。
- 利用可能な `matchMedia('print')` の `change` 通知に対応し、新APIの `addEventListener/removeEventListener`、旧APIの `addListener/removeListener` の順に使用します。任意APIがない場合は警告して必須登録を継続します。利用できるAPIの呼び出しが例外を投げた場合は登録失敗としてロールバックします。
- 印刷用CSS `@media print { body { display: none !important; } }` を登録します。重複呼び出しではリスナーとCSSを追加しません。
- 途中失敗時は、この呼び出しが追加したリスナー・styleのみを解除します。解除自体が失敗した項目は保持し、次回呼び出しで後始末を再試行します。未解除項目が残る間は新しい登録を追加せず `false` を返します。登録完了フラグは全登録成功後に設定します。
- 印刷コールバック内の失敗はコンソールへ報告します。復元失敗時は保存状態を保持し、後続の終了通知で再試行できます。初回の `true` は将来のイベントコールバックの成功を保証しません。
- 元から存在する無関係なリスナーやCSSは変更しません。公開解除APIや設定オプションは追加していません。

```js
kviewer.events.on('records.show', () => {
	installCopyPrintRestrictions();
});
kviewer.events.on('record.show', () => {
	installCopyPrintRestrictions();
});
```

**完全なコピー・保存・印刷・スクリーンショット防止機能ではありません。** PrintScreenキーイベントの抑止はOSの画面キャプチャを禁止しません。Ctrl/Cmd＋C自体を抑止する実装でもありません。アクセス権限やブラウザーへ渡された値の秘匿とは別であり、選択・コンテキストメニュー・印刷の操作性とアクセシビリティに影響します。ページ全体に必要なビューだけが明示的に呼び出してください。

### `redirectToRecordDetail(recordCode)`

- `recordCode` は `__kviewer_record_code__` の文字列。非文字列・空文字・空白のみは警告して `false`。正常なコードはtrimせず `encodeURIComponent` でエンコードします。
- 現在の `window.location.origin` と `pathname` の末尾スラッシュを除いたパスから、`/detail/{encodedCode}` を生成して `location.href` へ設定します。クエリ・ハッシュを引き継ぎません。
- 設定できれば `true`、location API欠落・生成例外・設定例外は報告して `false`。`true` は遷移指示の設定を意味し、遷移先の読み込み成功ではありません。
- レコードコードを任意URLとして扱いません。新マイページビューのURL対応は未確認です。呼び出し元は既存リストビューの一覧パスを前提とし、詳細画面から一覧パスを推測して作り直す処理は追加していません。詳細画面等から呼び出す場合は対応パスの確認が先に必要です。

```js
kviewer.events.on('records.show', (context) => {
	const records = context.records;
	if (Array.isArray(records) && records.length === 1) {
		redirectToRecordDetail(records[0].__kviewer_record_code__);
	}
});
```

1件かどうかの業務判断は呼び出し側です。ここでの1件は取得した配列が1件という意味であり、全検索結果が1件とは限りません。

### `setStaticContentShown(context, staticCode, shown)`

- `context` は `getMainContentElement()` を持つオブジェクト、`staticCode` は空白のみではない文字列、`shown` は真偽値。正常なコードはtrimせず完全一致で照合します。
- メインコンテンツ自身と子孫の `data-static-code` 属性値を直接比較して、同じコードの全要素を操作します。コードをセレクターに埋め込まないため、引用符・バックスラッシュ等もそのまま扱えます。範囲外への検索・documentへのフォールバックはしません。
- 非表示時は元のインラインdisplayと優先度を保存して `display: none !important` にし、再表示時は保存した状態へ復元します。反復非表示で保存内容を上書きしません。`hidden` は変更しません。
- この関数が隠していない要素への `shown: true` はdisplayを変更しません。元からインラインやCSSで非表示だった要素を強制表示しません。
- 全対象に適用できれば `true`。不正引数・対象なし・取得失敗は報告して `false`。一部の適用失敗は報告して `false` を返し、他対象への適用は継続します。成功した要素はロールバックせず、保存状態を保持して再試行・復元できます。

```js
kviewer.events.on('view.show', (context) => {
	// shown はこのビュー側で期間などの業務条件から決めた真偽値。
	setStaticContentShown(context, 'static-field-content_Charge', shown);
});
```

既存の表示ヘルパーはdisplay文字列のみを保存しているため、その挙動は変更せず、優先度も保持する新しい内部ヘルパーを静的コンテンツと印刷用に共用しました。

### 既存処理との差異と実画面検証

重複処理の本体はこのリポジトリ内にはなく、依頼文に列挙された動作・現行URL式を基に共通化しました。73行の原本との行単位の同一性を検証したわけではありません。主な差異は登録失敗時の解除・再試行、印刷開始重複時の保存保護、表示優先度の復元、URLの末尾スラッシュ除去、入力検証・失敗報告です。

2026-10-12に、依頼元から候補版1.1.0の代表3画面について次の実画面確認結果が報告されました。これは利用者による確認であり、この作業環境から実画面操作を行ったものではありません。

| 対象 | 実画面で確認された範囲 | 未確認・証拠の制限 |
| --- | --- | --- |
| 207（操作抑止） | 一覧・詳細で `success: true`、操作も問題なしとの報告 | 個々のキー・OS操作・印刷通知別の詳細結果は報告されていないため、すべて個別確認済みとは扱わない |
| 154（詳細遷移） | 詳細遷移の動作確認完了との報告 | ログは取得されていない。関数戻り値のログ確認とは区別する |
| 353ダッシュボード（静的コンテンツ） | `shown: false / success: true`、非表示動作を確認 | 期間内の表示は実画面未確認。表示・復元は自動テスト結果のみ |

上記範囲で通常配布への反映依頼を受けました。期間内表示など未確認事項は配布後も未確認として維持します。OSの制約やCSP、印刷UIの実挙動は自動テストでは保証しません。反復呼び出し・復元の耐久性は自動テストで確認し、レコード値の動的変更を実画面テストの前提にはしません。通常配布URLへ戻す際は候補版との二重読み込みを避け、一時検証コードや旧処理の重複登録を除去してください。

### 第2段階の自動検証・取得先

- `npm test` — 成功。新しい `test/test-kviewer-stage-two.js` と既存の全テストを実行しました。既存5関数のテスト、226のメニュー配置、別コンテナ分離、曖昧な対応の拒否も含みます。
- 新3関数のテストでは、初回・反復登録、キーの既定動作と伝播、印刷通知重複、display・優先度の復元、matchMedia新旧APIと任意API欠落、リスナー・CSS・mediaの登録失敗と再試行、解除失敗時の再試行抑制、コールバック内の失敗報告を確認しました。
- 静的コンテンツはルート・子孫・複数対象・範囲外・特殊文字・初期非表示・通常およびimportantの復元・一部適用失敗を確認しました。遷移は特殊文字・末尾スラッシュ・クエリとハッシュ除去・型検証・設定例外・外部URL形コードを同じオリジンのパスとして扱うことを確認しました。
- `npx prettier --check "src/**/*.{js,css,html}" test/test-kviewer-stage-two.js` — 成功。
- `npm run lint` — 成功（全ソースのESLint）。
- `for file in src/*.js test/test-*.js; do node --check "$file" || exit 1; done` — 成功。
- `git diff --check` — 成功。

開発時の候補版は[開発ブランチのソース](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/blob/feature/kviewer-stage-two/src/kviewer-custom-lib.js)に保存されています。通常配布先は https://js.kacsw.or.jp/kviewer-custom-lib.js です。通常配布への反映は `main` へのプッシュ後のCI・デプロイ成功と、配布URLのバージョン1.1.0およびソース一致を確認して完了とします。
