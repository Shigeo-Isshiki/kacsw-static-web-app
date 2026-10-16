# phone-utils 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.0.0** です。

このドキュメントは `src/phone-utils.js` が公開する電話番号ユーティリティ関数の使い方、契約（引数・戻り値・副作用）をまとめたリファレンスです。

電話番号の出力は、2026年10月1日時点の総務省公開情報（電気通信番号計画（令和元年総務省告示第6号）第1第4項による公表）に基づきます。

---

`src/phone-utils.js` は日本国内の電話番号（固定電話、携帯、フリーダイヤル、IP 電話、M2M 等）を扱うためのユーティリティ群です。主に次を提供します:

- 電話番号の正規化（記号・全角数字の除去）
- 電話番号の妥当性検証（日本国内ルールに基づく）
- 電話番号のハイフン付きフォーマット
- 電話番号の種別判定（固定電話 / 携帯 / 着信課金 等）

ブラウザでは各関数を `window` に公開します。Nodeのテストではブラウザ環境を用意します。

---

## 読み込み・依存関係

- ソース：[src/phone-utils.js](../src/phone-utils.js)
- 配布URL：https://js.kacsw.or.jp/phone-utils.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。

ブラウザでは各関数を `window` に公開します。イベントハンドラー登録には `kintone.events.on` が必要です。単純な番号変換・判定にはイベント登録は不要です。Nodeでソースを読み込むテストでは、`window` などのブラウザ環境を用意します。

## 公開関数の目次

| 関数名 | 機能 | リファレンス |
| --- | --- | --- |
| `isValidPhoneNumber(phoneNumber)` | 国内電話番号として有効かを判定する。 | [参照](#isvalidphonenumber) |
| `formatPhoneNumber(phoneNumber)` | 電話番号を正規化・整形し、判定結果を含むオブジェクトを返す。 | [参照](#formatphonenumber) |
| `getPhoneNumberType(phoneNumber)` | 電話番号の種別を判定する。 | [参照](#getphonenumbertype) |
| `normalizePhoneNumber(phoneNumber)` | 電話番号の数字を正規化する。 | [参照](#normalizephonenumber) |
| `registerPhoneNumberHandler(fieldCode, options)` | kintone フィールドの変更時に電話番号の整形・検証ハンドラーを登録する。 | [参照](#registerphonenumberhandler) |

各関数は同期処理です。番号引数は文字列または数値を受け取り、未入力・不正入力の扱いは各関数の契約を参照してください。

---

## 関数リファレンス

<a id="isvalidphonenumber"></a>

### `isValidPhoneNumber(phoneNumber)`

- 概要: 与えられた値が日本国内で有効とみなせる電話番号かを判定します。
- 引数: `phoneNumber` (string|number) — 任意の記号や全角数字を含む文字列も可。
- 戻り値: `boolean` — 有効なら `true`、無効なら `false` を返します。
- 例外: 入力が空や不正な場合は `Error` を投げることがあります（呼び出し側で try/catch 推奨）。

動作メモ:

- 国番号（+81）や `+` で始まるものは無効として扱います。
- 市外局番ごとの範囲や桁数ルールを参照して厳密に判定します（例: `03` 系は 10 桁固定、`080` は 11 桁、`0200` は 14 桁など）。

<a id="formatphonenumber"></a>

### `formatPhoneNumber(phoneNumber)`

- 概要: 電話番号を正規化（記号・全角→半角化）し、ハイフン付きの表記と判定結果などの属性を含むオブジェクトを返します。
- 引数: `phoneNumber` (string|number)
- 戻り値: `Object` — 次のプロパティを含みます:
  - `formattedNumber` {string} : ハイフン付きで整形された電話番号（例: `03-1234-5678`）
  - `type` {string} : 判定された電話番号の種類（例: `'固定電話'`, `'携帯電話'` 等）
  - `callCapable` {boolean} : 通話可能かどうか
  - `homeLine` {boolean} : 固定回線（自宅向け）かどうか
  - `faxCapable` {boolean} : FAX に適した回線かどうか
  - `mobile` {boolean} : 携帯電話かどうか
- 例外: 無効な入力は `Error` を投げます。

動作メモ:

- `091` で始まる 6～13 桁の番号は `091-xxxx...` の形式で必ず 3 桁プレフィックスを分離します。
- 種別に応じてハイフン分割パターンを決定します（固定電話は市外局番→市内局番→加入者番号、携帯は 3-4-4 等）。

<a id="getphonenumbertype"></a>

### `getPhoneNumberType(phoneNumber)`

- 概要: 電話番号の種別（文字列）を返します。
- 引数: `phoneNumber` (string|number)
- 戻り値: `string` — 代表的な戻り値例:
  - `'固定電話'`, `'携帯電話'`, `'着信課金'`, `'統一番号'`, `'IP電話'`, `'M2M'`, `'無線呼出'`, `'FMC'`, `'特定接続'`, `'付加サービス'`, `'不明'`
- 例外: 無効な入力は `Error` を投げます。

動作メモ:

- 内部では桁数（10/11/14 等）と市外局番プレフィックスの組み合わせ、`digit11PhoneNumberRange` などの設定を参照して判定します。

#### 戻り値（電話番号の種類）一覧

`formatPhoneNumber` と `getPhoneNumberType` が返す電話番号の種類（`type`）は同じ語彙を使います。代表的な戻り値と意味は次のとおりです。

- `固定電話` — 一般の市外局番を持つ固定回線（例: `03-1234-5678`）。通常は 10 桁の番号。
- `携帯電話` — 携帯電話番号（070/080/090 等）。主に 11 桁で判定される。
- `着信課金` — 利用者が受信時に料金を負担する番号（例: `0120` はフリーダイヤル扱いだが実装上は着信課金として扱う挙動があるため注意）。
- `統一番号` — 0570（ナビダイヤル等）のような統一番号サービス。
- `IP電話` — IP 電話（プレフィックス 050 等）。
- `M2M` — M2M（マシン・トゥ・マシン）用途の番号（例: `020` / `0200` 系等、11/14 桁扱いのものがある）。
- `無線呼出` — 無線呼出や無線サービスに割当てられた番号（`digit11PhoneNumberRange` の `wireless` 等に該当するもの）。
- `FMC` — FMC（例: `0600` 等、特定の 11 桁扱いプレフィックス）。
- `特定接続` — 091 で始まる 6〜13 桁の特殊接続番号など、固有ルールで扱う番号。
- `付加サービス` — 付加的なサービス番号や 10 桁で着信課金/統一番号に該当しない場合の分類。
- `不明` — 上記いずれにも該当しない、判定できない番号。

各語彙は実装中の `_PU_PHONE_NUMBER_CONFIG` の設定（`digit11PhoneNumberRange` / `notLandlinePhoneNumberRange` / `areaCodeRanges` 等）に依存します。新たなプレフィックス追加やルール変更時は該当設定を更新してください。

<a id="normalizephonenumber"></a>

### `normalizePhoneNumber(phoneNumber)`

- 概要: 電話番号を半角数字のみの文字列に正規化して返します（ハイフンや空白、全角数字を除去）。
- 引数: `phoneNumber` (string|number)
- 戻り値: `string` — 数字のみの形式（例: `0312345678`）。
- 例外: 無効な電話番号の場合は `Error` を投げます。

用途:

- フォーム保存前や比較処理用に「数字のみ」表現が必要な場合に利用します。

<a id="registerphonenumberhandler"></a>

### `registerPhoneNumberHandler(fieldCode, options)`

- 概要: kintone の追加・編集画面で、指定フィールドの変更時に電話番号を検証して整形します。画面表示イベントでは実行しません。
- `fieldCode` (string) — 対象フィールドコード。
- `options.type` (必須) — `callCapable`、`homeLine`、`faxCapable`、`mobile` のいずれか。未指定や未知の値は登録時にエラーになります。
- `options.errorMessages` (任意の object) — エラー文言を `errorMessages[fieldCode]` に設定し、空値または正常値では `null` にクリアします。省略可能です。
- `options.devices` (任意) — `desktop`、`mobile`、`both` のいずれか。既定値は `both` です。対象デバイスの追加・編集変更イベントだけに登録します。
- 戻り値: `void`。
- エラー時: 入力値は変更せず、フィールドの `error` と指定されたエラーマップに種別ごとの文言を設定します。`formatPhoneNumber` が投げたエラーもフィールドエラーとして処理し、イベント外へは投げません。空値と正常値では古いエラーをクリアします。

種別は `formatPhoneNumber` の戻り値にある同名フラグで判定します。`homeLine` は固定電話だけでなく、「通話可能かつ携帯電話ではない」番号（IP電話などを含む）です。

| `type`        | 判定条件               | エラーメッセージ                                     |
| ------------- | ---------------------- | ---------------------------------------------------- |
| `callCapable` | `callCapable === true` | 通話可能な電話番号を入力してください。               |
| `homeLine`    | `homeLine === true`    | 携帯電話以外の通話可能な電話番号を入力してください。 |
| `faxCapable`  | `faxCapable === true`  | FAX可能な電話番号を入力してください。                |
| `mobile`      | `mobile === true`      | 携帯電話番号を入力してください。                     |

```js
const errorMessages = {};
registerPhoneNumberHandler('phone', {
	type: 'homeLine',
	errorMessages,
	devices: 'both',
});
```

---

### 例

```js
// ブラウザでロードされた場合、window にエクスポートされます
// Node テストでは require した後に global.window = global として利用できます

isValidPhoneNumber('03-1234-5678'); // -> true
// formatPhoneNumber はオブジェクトを返します
formatPhoneNumber('０３ １２３４ ５６７８'); // -> { formattedNumber: '03-1234-5678', type: '固定電話', callCapable: true, homeLine: true, faxCapable: true, mobile: false }
getPhoneNumberType('080-1234-5678'); // -> '携帯電話'
normalizePhoneNumber('(080)-1234-5678'); // -> '08012345678'
```

---

## 制約・注意事項

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                    | 記録・配布確認                                         |
| ---------- | ---------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 1.0.0      | 2026-10-12 | ソース先頭JSDocのバージョンを現行版として記録。機能変更なし | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12） |
| 未設定     | 2025-10-29 | 現ファイル名での最古の登録（ファイル名変更）                | `b5e843e`。初版作成日・配布日は未確認                  |
| 未設定     | 2026-07-22 | 重複するプレフィックスの市外局番フォールバックを修正        | `508f3d1`。配布確認は未確認                            |
| 未設定     | 2026-09-05 | 総務省公開情報の基準日を2026-09-01へ更新                    | `05a2e0b`。配布確認は未確認                            |
| 未設定     | 2026-10-03 | 共通の電話番号ハンドラーを追加                              | `30ef533`。配布確認は未確認                            |
| 未設定     | 2026-10-17 | 総務省公開情報の基準日を2026-10-01へ更新（設定変更なし）    | 今回の作業。配布確認は未実施                            |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
