# bank-transfer 使い方リファレンス

このドキュメントは `src/bank-transfer.js` が公開する関数と、全銀フォーマット出力に必要な引数の詳細（契約）をまとめた使い方リファレンスです。

---

## 目次

- 概要
- 公開 API サマリ
- 公開関数の引数詳細
  - [`getBank(bankCodeOrName, callback)`](#getBank)
  - [`getBranch(bankCode, branchCodeOrName, callback)`](#getBranch)
  - [`convertYucho(kigou, bangou, callback)`](#convertYucho)
  - [`generateZenginData(headerData, records, callback)`](#generateZenginData)
  - [`generateHeader(headerData, callback)`](#generateHeader)
  - [`generateDataRecords(records, fromBankNo, callback)`](#generateDataRecords)
  - [`normalizeEdiInfo(input, options)`](#normalizeEdiInfo)
  - [`normalizePayeeName(name)`](#normalizePayeeName)
  - [`normalizeAccountNumber(input)`](#normalizeAccountNumber)
- エラー形式
- 実例
- 注意事項 / エッジケース

---

## 概要

`src/bank-transfer.js` は kintone やブラウザ上で動作する銀行振込関連のユーティリティ群です。公開 API は `window.BANK` に付与されています（ロード後に `window.BANK = ...`）。

主に次を提供します:
- 銀行・支店名の検索（`getBank`, `getBranch`）
- ゆうちょ変換（`convertYucho`）
- 全銀フォーマット（Zengin）用のレコード生成（`generateZenginData` など）
- 受取人名・口座番号の正規化ヘルパ

詳細な使い方、引数の意味、フォーマット規則はこのドキュメントにまとめています。

---

## 公開 API サマリ

- `getBank(bankCodeOrName, callback)`
- `getBranch(bankCode, branchCodeOrName, callback)`
- `convertYucho(kigou, bangou, callback)`
- `generateHeader(headerData, callback)`
- `generateDataRecords(records, fromBankNo, callback)`
- `generateTrailer(summaryData, callback)`
- `generateEndRecord(callback)`
- `generateZenginData(headerData, records, callback)`
  - `normalizeEdiInfo(input, options)`
  - `normalizePayeeName(name, options)`
- `normalizeAccountNumber(input)`
- `nextBankBusinessDay(baseDate, cutoffHour, callback)`

（各関数はコールバック単一引数スタイルを基本にしています。Node 風の (err, res) も互換的に扱える場合があります）

---

## 公開関数の引数詳細

<a id="getBank"></a>
### `getBank(bankCodeOrName, callback)`

概要:
- 銀行コード（4桁）または銀行名の一部/全体を与えて銀行情報を検索します。

引数:
- `bankCodeOrName` (string|number) — 銀行コード（例: '0001'）または検索文字列（例: '横浜'）。必須。
- `callback` (function(result)) — single-arg スタイルのコールバック。成功時は `BankResult`、失敗時は `ErrorResult` を返します。

戻り値（コールバックに渡すオブジェクトの例）:
- 成功: `{ bankCode: '0001', bankName: 'みどり銀行', bankKana: 'ﾐﾄﾞﾘｷﾞﾝｺｳ' }`
- 失敗: `{ error: 'not_found', message: '銀行が見つかりません', code: 'bank.not_found' }`

戻り値オブジェクトの各プロパティ（成功時）:

- `bankCode` (string) — 銀行コード（4桁、例: "0001"）。全銀フォーマット用にゼロ埋め済みのコードが返ります。
- `bankName` (string) — 取得した銀行の表示名（API の元データそのまま）。注: 出力に漢字や全角文字が含まれるため、振込ファイルなどバイト制約のある用途では `bankKana` を利用するか別途正規化してください。
- `bankKana` (string) — 銀行名のかな表記を半角カタカナに正規化した文字列（例: `ﾐﾄﾞﾘｷﾞﾝｺｳ`）。全銀ファイルなどで文字種制約がある場合はこちらを使うことを推奨します。

挙動・注意点:
- 引数が数値（または数字文字列）かつ 4 桁の場合はコード検索を優先します。
- 部分一致検索を行う場合は複数候補が返ることがあり、その場合は内部で最良候補を選んで返します（必要ならクライアント側で絞り込んでください）。

例:
```js
window.BANK.getBank('0005', (res) => { console.log(res); });
window.BANK.getBank('横浜', (res) => { console.log(res); });
```

---

<a id="getBranch"></a>
### `getBranch(bankCode, branchCodeOrName, callback)`

概要:
- 指定した銀行コード内で支店を検索します。支店コード（3桁）または支店名（部分一致）で検索できます。

引数:
- `bankCode` (string|number) — 銀行コード（4桁）。必須。
- `branchCodeOrName` (string|number) — 支店コード（3桁）または検索文字列。必須。
- `callback` (function(result)) — single-arg スタイルのコールバック。成功時は `BranchResult`、失敗時は `ErrorResult` を返します。

戻り値の例:
- 成功: `{ branchCode: '123', branchName: '本店営業部', branchKana: 'ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ' }`
- 失敗: `{ error: 'branch_not_found', message: '支店が見つかりません', code: 'branch.not_found' }`

戻り値オブジェクトの各プロパティ（成功時）:

- `branchCode` (string) — 支店コード（3桁、例: "123"）。ゼロ埋め済みのコードが返ります。
- `branchName` (string) — 取得した支店の表示名（API の元データそのまま）。漢字や全角文字が含まれる場合があります。
- `branchKana` (string) — 支店名のかな表記を半角カタカナに正規化した文字列（例: `ﾎﾝﾃﾝｴｲｷﾞｮｳﾌﾞ`）。全銀ファイルでの使用はこちらを推奨します。

挙動・注意点:
- `bankCode` が存在しない場合は早期にエラーを返します。
- 部分一致で複数候補が見つかる場合は代表候補を返します。詳細な候補リストが必要な場合は将来的に別 API を提供する可能性があります。

例:
```js
window.BANK.getBranch('0005', '123', (res) => { console.log(res); });
window.BANK.getBranch('0005', '横浜', (res) => { console.log(res); });
```

---

<a id="convertYucho"></a>
### `convertYucho(kigou, bangou, callback)`

概要:
- ゆうちょ口座（記号 + 番号）を全銀フォーマットで扱える形に正規化・変換します。ゆうちょ口座は預金種別により桁長が異なるため、適切に変換します。

引数:
- `kigou` (string|number) — ゆうちょ記号（例: '12345'）。必須。
- `bangou` (string|number) — ゆうちょ番号（例: '1234567'）。必須。
- `callback` (function(result)) — single-arg スタイルのコールバック。成功時は `ConvertYuchoResult`、失敗時は `ErrorResult` を返します。

戻り値の例:
- 成功: `{ yuchoKigou:'12345', yuchoBangou:'0123456', bankCode:'9900', bankName:'ゆうちょ銀行', branchCode:'000', accountType:'普通', accountNumber:'0012345' }`
- 失敗: `{ error:'invalid_format', message:'記号が5桁である必要があります', code:'kigou.not_5_digits', field:'kigou' }`

戻り値オブジェクトの各プロパティ（成功時）:

- `yuchoKigou` (string) — 入力から半角化・正規化されたゆうちょ記号（例: `"12345"`）。
- `yuchoBangou` (string) — ゆうちょ番号を預金種目に応じて0埋めした値（例: `"0123456"` または `"00123456"` のように、内部で扱いやすい桁数に整形）。
- `bankCode` (string) — 変換先の銀行コード（ゆうちょの場合は `"9900"`）。
- `bankName` (string) — 銀行の表示名（API 由来）。振込ファイルで直接使う場合は文字種に注意が必要です（下の `bankKana` を推奨）。
- `bankKana` (string) — 銀行名を半角カタカナに正規化した文字列（例: `ﾕｳﾁｮｷﾞﾝｺｳ`）。全銀フォーマットのフィールドに入れる文字列は通常こちらを利用します。
- `branchCode` (string) — 算出された支店コード（3桁、ゼロ埋め済み）。
- `branchName` (string) — 支店の表示名（取得に成功した場合にセットされます）。
- `branchKana` (string) — 支店名を半角カタカナに正規化した文字列（取得に成功した場合にセットされます）。
- `accountType` (string) — 表示用の預金種別ラベル（`'当座'` または `'普通'` 等）。
- `accountNumber` (string) — 全銀向けに0埋めされた7桁の口座番号（例: `"0012345"`）。

注意: 実際の全銀ファイルを生成する際は、漢字を含む `bankName`/`branchName` よりも `bankKana`/`branchKana` を使用して半角カタカナで出力するのが一般的です。以下の成功例では `bankName` を半角カタカナ表記に合わせた例を示します。

成功例（現実に合わせた表記）:
```json
{ "yuchoKigou":"12345", "yuchoBangou":"0123456", "bankCode":"9900", "bankName":"ﾕｳﾁｮｷﾞﾝｺｳ", "bankKana":"ﾕｳﾁｮｷﾞﾝｺｳ", "branchCode":"000", "accountType":"普通", "accountNumber":"0012345" }
```

挙動・注意点:
- 入力の数字がミスフォーマット（全角数字やハイフン混入等）の場合は内部で半角化・除去処理を行いますが、ルール外の値はエラーになります。
- 戻り値には全銀向けに整形した `accountNumber`（7 桁ゼロ埋め）や、対応する銀行コード/支店コードが含まれる場合があります（外部 API 依存）。

例:
```js
window.BANK.convertYucho('12345','1234567',(res)=>{ console.log(res); });
```

---

<a id="nextBankBusinessDay"></a>
### `nextBankBusinessDay(baseDate, cutoffHour, callback)`

概要:
- 指定日時から次の銀行営業日を計算し、結果をコールバックで返します。内部で土日・年末年始・国民の祝日判定（外部 API を利用）を行います。

引数:
- `baseDate` (Date|string) — 基準日時。Date オブジェクトまたは解析可能な日付文字列を受け付けます。省略時は現在日時を使用します。
- `cutoffHour` (number) — 当日の締切時刻（0-23、省略時は 18）。基準時刻がこの時刻以降であれば 翌営業日のさらに次 を返す挙動になります。
- `callback` (function(resultDateString)) — single-arg スタイルのコールバック。結果は 'YYYY-MM-DD' 形式の文字列で渡されます。

挙動・注意点:
- 祝日判定は内部で外部 API を参照します（ネットワークエラー時は祝日扱いとしないフェールソフトの挙動）。
- 関数はコールバック方式で結果を返すため、同期的な戻り値はありません。必ず `callback` を渡してください。

例:
```js
const d = new Date('2025-12-31T19:00:00');
window.BANK.nextBankBusinessDay(d, 18, (resDate) => {
  console.log(resDate); // '2026-01-05' など（YYYY-MM-DD 形式）
});
```

---

<a id="generateZenginData"></a>
### `generateZenginData(headerData, records, callback)`

概要:
- ヘッダ・データ群・トレーラ・エンドを順に生成して、CRLF で結合した文字列を `content` として返します。

引数:
- headerData (object)
  - typeCode: string — 全銀の種別コード（例: '11' または内部識別子 '給与振込' 等）。必須。
  - requesterCode: string|number — 振込依頼人コード。内部で左ゼロ埋めして 10 バイトにします。
  - requesterName: string — 振込依頼人の名称。内部で半角化・カナ化等の正規化を行い、SJIS 相当で 40 バイトに切り詰めます。
  - tradeDate: string|Date — 実行日。'MMDD'、'YYYY-MM-DD'、Date オブジェクトなどを受け付けます（内部で MMDD 部分を採用）。
  - fromBankNo: string — (任意) 仕向銀行コード（4桁）。存在すると generateDataRecords 呼び出し時に参照されます。
  - fromBranchNo: string — (任意) 仕向支店コード（3桁）。
  - depositType: string|number — 預金種目（'普通'/'当座' またはコード '1'/'2' 等）。
  - accountNumber: string|number — 依頼人口座番号。

- records (Array<object>) — 振込明細の配列。各要素の主要プロパティ:
  - toBankNo: string — 受取側銀行コード（4桁）。必須。
  - toBranchNo: string — 受取側支店コード（3桁）。必須。
  - toAccountType: string|number — 預金種目（'普通'/'当座' または '1'/'2'）。必須。
  - toAccountNumber: string|number — 口座番号（最大 7 桁）。内部で全銀向けに 0 埋めされます。
  - amount: number — 振込金額（整数）。必須。
  - customerName: string — 振込先氏名（日本語）。内部で正規化・SJIS 切り詰めされます。
  - customerKana: string — 受取人カナ（任意）。
  - ediInfo / reference: object|string — EDI 補助情報（任意）。

- callback (function(result)) — single-arg スタイルを推奨。成功時は次の形式を返します:
  { success: true, content: '<CRLF 結合文字列>', parts: { header, data, trailer, end } }

エラー時の形式は下で示します（ErrorResult 構造）。

備考:
- `content` は CRLF で結合された文字列です。Shift_JIS 変換やファイル出力は呼び出し側で行ってください。
- `parts` は個別レコード（120 バイト固定長）の断片が返るため、デバッグや個別検査に便利です。

---

<a id="generateHelpers"></a>
#### `generateHeader` / `generateDataRecords` / `generateTrailer` / `generateEndRecord`

これらは `generateZenginData` の下位関数で、個別に利用することも可能です。ここでは各関数を簡潔に説明します。

<a id="generateHeader"></a>
##### `generateHeader(headerData, callback)`
- 概要: ヘッダ（120バイト固定長行）を生成します。デバッグや個別検査で `header` 部分だけ欲しい場合に使います。
- 戻り値（コールバック）: `{ header: '<120バイト文字列>' }`
- 例: `window.BANK.generateHeader(headerData, res => console.log(res.header));`

<a id="generateDataRecords"></a>
##### `generateDataRecords(records, fromBankNo, callback)`
- 概要: `records` 配列からデータ行群（CRLFで結合）を生成します。`fromBankNo` があると仕向銀行情報を参照します。
- 戻り値（コールバック）: `{ data: '<CRLFで結合されたデータ行>' }`
- 例: `window.BANK.generateDataRecords(records, '0001', res => console.log(res.data));`

<a id="generateTrailer"></a>
##### `generateTrailer(summaryData, callback)`
- 概要: ファイルの合計等を元にトレーラ（120バイト固定長行）を作成します。
- 戻り値（コールバック）: `{ trailer: '<120バイト文字列>' }`
- 例: `window.BANK.generateTrailer(summary, res => console.log(res.trailer));`

<a id="generateEndRecord"></a>
##### `generateEndRecord(callback)`
- 概要: ファイルの終端を示すエンドレコード行（120バイト固定長）を生成します。
- 戻り値（コールバック）: `{ end: '<120バイト文字列>' }`
- 例: `window.BANK.generateEndRecord(res => console.log(res.end));`

---

<a id="normalizeEdiInfo"></a>
### `normalizeEdiInfo(input, options)`

- `normalizeEdiInfo(input, options)`
  - EDI 向け補助情報を銀行提出向けに簡易正規化するヘルパです。
  - 引数:
    - `input` (string) — 入力文字列（全角かな等を含む文字列）。実装上は文字列を受け取り、内部で半角カタカナ化や禁止文字チェックを行います。
    - `options` (object, optional) — オプション。サポートするキー:
      - `padToBytes` (boolean) — true の場合、返却文字列を `bytes` 長になるようにスペースでパディングします（デフォルト false）。
      - `bytes` (number) — `padToBytes` が true のときのバイト長（SJIS 相当で計測、デフォルト 20）。
  - 挙動:
    - 入力は内部で半角カタカナ化され、コンマ（`','` / '，'）はエラーになります。
    - 許容外文字が含まれている場合はエラーを投げます。
    - 指定されたバイト長で切り詰め（SJIS 相当）し、`padToBytes` が true の場合は右側をスペースで埋めた文字列を返します。

---

<a id="normalizePayeeName"></a>
### `normalizePayeeName(name, options)`

- `normalizePayeeName(name)`
  - 受取人名を全銀フォーマット向けに正規化するヘルパです。実装に沿った詳細な処理順は次の通りです。
    1. 入力を文字列化して前後の空白を除去。空文字なら Error を投げる。
    2. 入力文字列に ASCII の小文字（a–z）が含まれる場合は即座に Error を投げる（小文字は許容されません）。
    3. 法人略語・営業所略語・事業略語の置換を行う（内部マップ `_BT_CORPORATE_ABBREVIATIONS_LIST`、`_BT_SALES_OFFICES_LIST`、`_BT_BUSINESS_LIST` を使用）。
       - 各リストは「長いキー順」で処理し、同一リスト内では最初に一致した 1 件のみを置換（stateful replacer）します。
       - 法人・営業所の置換では位置に応じた括弧付与ルールが適用されます（先頭・末尾・中間で () の付与が変わる）。
    4. 全角数字を半角数字に変換。
    5. 半角カタカナ・英数字への半角化を行う（かな変換）。
    6. 半角化後に再度、上記の略語リストで置換を試みる（既に置換済みのリストは no-op になる）。
    7. ASCII の小文字が残っていれば大文字に変換（上の手順 2 で既に小文字がある場合はエラーになっているため、ここでの大文字化は変換過程で小文字が出た場合に備えた処理です）。
    8. 許容文字セット（半角カナ・英数字・一部記号など）を満たすか検査。
       - 満たす場合は Shift_JIS 相当で先頭 30 バイトに切り詰めて返す（pad は行わない）。
       - 満たさない場合は、許容外文字を列挙して Error を投げる。
  - 引数:
    - `name` (string) — 元の受取人名
  - 戻り値: 正規化済み文字列（半角カナ等、SJIS の先頭 30 バイトに切り詰め）か、検査に失敗した場合は Error を投げます。
  - 注記: 実装はオプション引数を受け取るようになりました。現時点でサポートするキー:
    - `skipAbbreviation` (boolean) — `true` を渡すと、法人略語・営業所略語・事業略語の自動置換（内部マップによる強制適用）をスキップします。
      - デフォルトは `false`（従来どおり略語置換を行う）。
      - kintone など呼び出し側から金融機関固有の表記を優先したい場合はこのオプションを `true` にして呼び出してください。
  
#### 具体例 (置換)

以下は `normalizePayeeName` が行う典型的な置換の例です。左が入力、右が正規化後の出力です（オプションにより多少異なる場合があります）。

- 法人略語の置換

```text
入力:  "株式会社 テストソリューション"
出力:  "ｶ) ﾃｽﾄｿﾘｭｰｼｮﾝ"  // 先頭に略語がある場合は末尾に ')' が付く(実装の括弧ルール)。続けて半角化される。
```

- 営業所略語の置換

```text
入力(注意: 漢字を含む場合は最終的に許容文字に変換されないことが多く、エラーになります):
  "東京営業所 山田太郎"
出力(エラー):  正規化後に許容外文字（例: 東京, 山田太郎 の漢字）が残るため Error が投げられます

入力(成功例: ひらがな/カナで与えた場合)
  "トウキョウ営業所 ヤマダタロウ"
出力:  "ﾄｳｷﾖｳ(ｴｲ) ﾔﾏﾀﾞﾀﾛｳ"  // 中間に略語がある場合は '(略)' の形で置換され、全体が半角化される
```

- 事業略語の置換

```text
入力:  "国民健康保険団体連合会 サンプル"
出力:  "ｺｸﾎﾚﾝ ｻﾝﾌﾟﾙ"  // 事業略語は括弧ルールを適用せず、半角化される
```

- 全角→半角カナ・長音正規化・切り詰め例

```text
入力(漢字含む場合はエラーになることが多い):
  "山田―太郎株式会社"
出力(エラー):  漢字が許容半角文字に変換されないためエラー

入力(成功例: カタカナで与えた場合)
  "ヤマダ―タロウ株式会社"
出力:  "ﾔﾏﾀﾞ-ﾀﾛｳ(ｶ)"  // 長音は '-' に正規化、末尾の法人略語は先頭/末尾ルールにより '(' が付く
```

注: 実際の出力は入力の文字種（漢字/かな）、内部マップ定義、及び文字列長により変わります。
- 重要: `normalizePayeeName` は英小文字を含む入力を即時にエラーとします（例: "yamada"）。
- 多くの日本語の氏名（漢字を含む）をそのまま渡すと、最終的に許容半角文字に変換されずエラーになります。API を呼ぶ側では可能なら `customerKana`（カナ表記）を優先して渡してください。

---

<a id="normalizeAccountNumber"></a>
### `normalizeAccountNumber(input)`

- `normalizeAccountNumber(input)`
  - 入力を半角数字に正規化して7桁の0埋め口座番号文字列を返します（実装上は幅固定で 7 桁になります）。
  - 引数:
    - `input` (string|number) — 全角数字やハイフン等を含む入力を受け付けます。
  - 挙動:
    - 全角数字は半角に変換され、数字以外の文字が含まれている場合はエラーになります。
    - 入力が空の場合はエラーを投げます。
    - 入力が7桁を超える場合はエラーになります（最大7桁）。
    - 正常時は7桁に左ゼロ埋めした文字列を返します（例: `"1234"` → `"0001234"`）。

---

## エラー形式 (ErrorResult)

共通の構造化エラー形式:

- error: string — 簡易メッセージ
- message?: string — ユーザ向けの詳細メッセージ
- code?: string — プログラム向けのエラーコード（例: 'kigou.not_5_digits'）
- field?: string — エラー対象フィールド（'kigou'|'bangou'|'bank'|'branch'|'both'|'other'）
- details?: any — 追加情報（内部の失敗結果等）

---

## 実例: generateZenginData の利用

```js
// Node / テスト環境の例
global.window = global;
require('./src/bank-transfer.js');

const headerData = {
  typeCode: '11',
  requesterCode: '12345',
  requesterName: 'テストカイシャ',
  tradeDate: '20251109',
  fromBankNo: '0001',
  fromBranchNo: '001',
  depositType: '普通',
  accountNumber: '1234567'
};

const records = [
  { toBankNo:'0005', toBranchNo:'123', toAccountType:'普通', toAccountNumber:'1234567', amount:1000, customerName:'山田 太郎' }
];

window.BANK.generateZenginData(headerData, records, (res) => {
  if (res && res.success) {
    // res.content を Shift_JIS に変換してファイル保存する
    console.log('Zengin content length:', res.content.length);
  } else {
    console.error('生成エラー', res);
  }
});

### 生成結果の実例（実行サンプル）

以下はリポジトリ内のサンプル実行結果の抜粋です（`scripts/generate-sample-zengin.js` を実行して得られた結果）。

- content の全長: 484
- 行数: 4（ヘッダ + データ行群 + トレーラ + エンド）

先頭 4 行（CRLF 区切り、各行は 120 バイト固定長）:

```text
1: 11100000012345ﾃｽﾄ会社                                 11090001ﾐｽﾞﾎｷﾞﾝｺｳ      001ﾄｳｷﾖｳ          11234567                 
2: 20005ﾐﾂﾋﾞｼﾕ-ｴﾌｼﾞｴｲｷﾞ123ﾖｺﾊﾏﾅｶﾔﾏ           11234567ﾔﾏﾀﾞ ﾀﾛｳ                      00000010001                    7Y       
3: 8000001000000001000                                                                                                      
4: 9                                                                                                                       
```

注:
- 上記はサンプル入力に対する一例です。`header.parts` と `parts.data` に分割して個別に検査できます。
- 実際の出力は入力データ（口座種別や口座番号、依頼人名）や内部の銀行データ取得の成否により変わります。
```

---

## 注意事項 / エッジケース

- 受取人名や依頼人名は SJIS 相当のバイト長で切り詰められます。切り詰めは視覚的に不自然になり得るため、事前に長さを検査してください。
- amount は整数（小数は扱えません）。必要に応じて小数を整数（円）に変換してください。
- records の各項目は厳密なフォーマット（桁数）を期待します。コード側で自動補正は行いますが、入力は可能な限り事前正規化してください。

---

必要なら、この文書を英語版に翻訳したり、`generateZenginData` の各下位関数に対するJSON スキーマを追加できます。ご希望があれば続けて対応します。
