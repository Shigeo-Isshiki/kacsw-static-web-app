# shipping-processing 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.0.0** です。

このドキュメントは `src/shipping-processing.js` が公開する配送関連ユーティリティ関数の使い方（引数・戻り値・副作用）をまとめたリファレンスです。

> **重要**: このファイルには、kintoneでの単体動作のため、[src/national-holidays.js](../src/national-holidays.js) の祝日判定ロジックが組み込まれています（プレフィックス: `_sp_nh_`）。
> 祝日定義を変更する際は、以下のファイルも同時に更新してください：
>
> - [src/national-holidays.js](../src/national-holidays.js) (オリジナル)
> - [src/bank-transfer.js](../src/bank-transfer.js) (プレフィックス: `_bt_nh_`)

---

`src/shipping-processing.js` は配送に関する共通処理を提供するユーティリティです。主に次を提供します。

- 伝票番号の正規化・妥当性検証（`validateTrackingNumber`）
- kintone のスペースフィールドへ「荷物問い合わせ」ボタンを追加するユーティリティ（`kintoneShippingInquiryButton`）
- 営業日（平日・祝日・年末年始を除く）に基づく発送可能日の算出（`getNextBusinessDay`）

**祝日判定について**: 営業日算出で必要な祝日判定は、[national-holidays.js](../src/national-holidays.js) のローカルロジックを内部に組み込んでいます。外部APIを使用せず、オフラインでも動作します。

ブラウザと Node の両方で利用できるように設計されています。ブラウザ環境ではファイル末尾で `window` に関数を公開します。テストでは `global.window = global` として利用します。

---

## 読み込み・依存関係

- ソース：[src/shipping-processing.js](../src/shipping-processing.js)
- 配布URL：https://js.kacsw.or.jp/shipping-processing.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。

ブラウザでは各関数を `window` に公開します。問い合わせボタンにはkintoneのrecord APIとDOMが必要です。祝日判定は内蔵しており、追加ライブラリや外部祝日APIは不要です。Nodeのテストでは `window`・DOM・kintone APIを用意してください。

### ランタイム設定

ランタイム初期化（推奨）:

```js
globalThis.KACSW_RUNTIME = {
	isMobilePage: true,
	version: Date.now(),
};
initShippingProcessingRuntime(globalThis.KACSW_RUNTIME);
```

判定優先順位は `initShippingProcessingRuntime` の設定、`KACSW_RUNTIME`、未設定時の自動判定（`location.pathname`）です。

（注）`getNextBusinessDay` は同期関数、`kintoneShippingInquiryButton` は DOM に副作用を与えます。`validateTrackingNumber` は同期関数で、入力不正時に `Error` を投げます。

## 公開関数の目次

- [`getNextBusinessDay(baseDate, cutoffHour)`](#api-getnextbusinessday)
- [`kintoneShippingInquiryButton(spaceField, id, label, trackingNumber, carrier)`](#api-kintoneshippinginquirybutton)
- [`validateTrackingNumber(trackingNumber, minLength, maxLength)`](#api-validatetrackingnumber)
- [`initShippingProcessingRuntime(options)`](#api-initshippingprocessingruntime)
- [`resetShippingProcessingRuntime()`](#api-resetshippingprocessingruntime)

## 関数リファレンス

<a id="api-validatetrackingnumber"></a>

### `validateTrackingNumber(trackingNumber, minLength = 10, maxLength = 14)`

- 概要: 伝票番号文字列を半角数字のみの形式に変換し、桁数と許容文字のみで構成されているかを検査します。
- 引数:
  - `trackingNumber` (string) — チェック対象の伝票番号。全角数字・ハイフン・空白などを許容して内部で正規化します。
  - `minLength` (number, optional) — 最小桁数（デフォルト 10）。
  - `maxLength` (number, optional) — 最大桁数（デフォルト 14）。
- 戻り値: `string` — 半角数字のみの伝票番号（ハイフン・空白を削除した文字列）。
- 例外: 引数の型不正、許容外文字、桁数制約違反などの場合に `Error` を投げます。

動作メモ:

- 全角数字は半角に変換される（U+FF10–FF19 を対応）
- 全角ハイフンや各種ダッシュ類は半角ハイフンに統一される
- スペース要素の取得は実行環境で自動切替される（`initShippingProcessingRuntime` または `KACSW_RUNTIME` が設定されていればその判定を優先。未設定時は `location.pathname` ベースで推定）
- スペース要素が取得できない場合（対応外画面・要素未配置など）は、追加処理はスキップされる
- タブ・改行・全角スペースは半角スペースに置換される
- 半角数字・ハイフン・空白以外が含まれる場合はエラーになる
- ハイフン・空白を除去した数字のみの長さで桁数チェックを行う

使用例:

```js
validateTrackingNumber('１２３－４５６－７８９０'); // -> '1234567890'
validateTrackingNumber('123-45 67890', 10, 14); // -> '1234567890'
```

---

<a id="api-getnextbusinessday"></a>

### `getNextBusinessDay(baseDate = new Date(), cutoffHour = 16)`

- 概要: 指定日時から発送可能な次の営業日（`YYYY-MM-DD`）を同期的に返します。土日・国民の祝日・年末年始（12/29〜1/4）を営業日から除外します。`cutoffHour` 以降の場合は翌営業日を返します。
- 引数:
  - `baseDate` (Date|string, optional) — 基準日時。Date オブジェクト、またはパース可能な日付文字列を受け付けます。省略時は現在日時。
  - `cutoffHour` (number, optional) — 当日の締め時刻（0〜23）。省略時は `16`。
- 戻り値: `string` — 結果は `'YYYY-MM-DD'` 形式の文字列。
- 例外: `baseDate` が不正な場合は `Error` を投げます。

動作メモ:

- `baseDate` に時刻情報が含まれる場合のみ `cutoffHour` を考慮する（日時文字列に時間が無ければ時刻なしと見なす）
- 国民の祝日判定は [national-holidays.js](../src/national-holidays.js) のローカルロジックを内部に組み込んで使用します。外部APIへの依存はありません。
- **v2.0から同期返却形式に変更されました**。以前のコールバック方式とは互換性がありませんので、既存コードの更新が必要です。

使用例:

```js
const d = getNextBusinessDay(new Date('2025-11-12T10:00:00'), 16);
console.log(d); // -> '2025-11-12'
const d2 = getNextBusinessDay('2025-11-12', 16);
console.log(d2); // -> '2025-11-12'
```

---

<a id="api-kintoneshippinginquirybutton"></a>

### `kintoneShippingInquiryButton(spaceField, id, label, trackingNumber, carrier)`

- 概要: kintone のスペースフィールドに「荷物問い合わせ」ボタンを追加します。`label` に `null` または空文字を渡すと親要素を非表示にします。ボタン押下時は指定の運送会社の追跡ページを新しいウィンドウで開きます。
- 生成されるボタンには常にクラス名 `kintoneplugin-button-normal` が付与されます。kintone のデザインと調和したボタン外観にするには、アプリに **「51-modern-default」スタイルシート**を適用してください（`https://js.kacsw.or.jp/51-modern-default.css` から利用できます）。
- 引数:
  - `spaceField` (string) — kintone のスペースフィールドコード（内部で PC/モバイルを自動判定して取得します）。必須。
  - `id` (string) — 生成するボタン要素の ID。必須。
  - `label` (string|undefined|null) — ボタンラベル。
    - 文字列: 指定ラベルで表示
    - `undefined`: デフォルト文言 `'荷物問い合わせ'` を使用
    - `null` / 空文字: ボタン非表示（親要素を非表示にする）
  - `trackingNumber` (string) — 問い合わせ伝票番号（表示と URL 生成に利用）
  - `carrier` (`'yamato'|'japanpost'|'sagawa'`) — 運送会社識別子
- 戻り値: なし（DOM への副作用）
- 例外: 引数の型が想定外の場合は何もしない（例外は投げない）

動作メモ:

- 既に同じ `id` の要素が存在する場合は削除してから新しいボタンを追加する
- ボタン未表示（`label === null` など）の場合は親要素の `display` を `none` に設定する
- 運送会社の表示名（ドキュメント内）:
  - `yamato` = ヤマト運輸
  - `japanpost` = 日本郵便
  - `sagawa` = 佐川急便
- 問い合わせ URL のテンプレートは内部定数 `_SP_SHIPPING_INQUIRY_URL_MAP` を利用して生成する

---

<a id="api-initshippingprocessingruntime"></a>

### `initShippingProcessingRuntime(options)`

- 引数:
  - `options` (object)
  - `options.isMobilePage` (boolean, optional)
  - `options.mode` (`'mobile' | 'pc'`, optional)
  - `options.version` (number, optional)

- 動作:
  - PC/モバイル判定を内部キャッシュへ保存します。

- 戻り値:
  - `boolean`（有効な判定を適用できた場合 `true`）

---

<a id="api-resetshippingprocessingruntime"></a>

### `resetShippingProcessingRuntime()`

- 動作:
  - 内部キャッシュされたランタイム設定をクリアします。

- 戻り値:
  - `void`

---

### 例

```js
// 伝票番号の検証
try {
	const tn = validateTrackingNumber('１２３－４５６－７８９０');
	// tn === '1234567890'
} catch (err) {
	console.error('伝票番号が不正:', err.message);
}

// 営業日の取得
const d = getNextBusinessDay(new Date(), 16);
console.log('発送可能日:', d);

// kintone でボタンを追加
// kintone の record namespace をスタブするか、kintone 環境で実行
kintoneShippingInquiryButton('space1', 'trackBtn', undefined, '1234567890', 'japanpost');
```

---

## 制約・注意事項

### 既知の内部定数

- `_SP_SHIPPING_INQUIRY_URL_MAP` — 運送会社ごとの問い合わせ URL テンプレート（`yamato` = ヤマト運輸, `japanpost` = 日本郵便, `sagawa` = 佐川急便）

---

### バージョンの扱い

以前の仕様書にあった「v2.0」は、現在の先頭JSDocのバージョンと対応を確認できないため、現行版の識別には使いません。現行の `getNextBusinessDay` は同期関数です。

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                        | 記録・配布確認                                          |
| ---------- | ---------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし     | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12）  |
| 未設定     | 2025-10-29 | 現ファイル名での最古の登録（ファイル名変更）                    | `94d6590`。初版作成日・配布日は未確認                   |
| 未設定     | 2026-06-03 | モバイルの `getSpaceElement` 処理を修正し、仕様書・テストを更新 | `285a5fc`。配布確認は未確認                             |
| 未設定     | 2026-06-03 | モバイルのスペース要素取得フォールバックを統一                  | `5e120d5`。配布確認は未確認                             |
| 未設定     | 2026-06-18 | モバイルモード初期化を実行時キャッシュに対応                    | `01b9b5c`。配布確認は未確認                             |
| 未設定     | 2026-09-26 | 依存チェックに関する説明を更新                                  | `f75e4a7`（本仕様書の変更）。配布内容の変更確認とは区別 |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
