# system-utils 使い方リファレンス

## 概要・バージョン

現行ソース・確認済み通常配布版は **1.0.0** です。

パスワードの生成・マスク表示、英数字・記号の読み仮名変換を提供します。kintoneなどのブラウザ環境とNodeで利用できます。

## 読み込み・依存関係

- ソース：[src/system-utils.js](../src/system-utils.js)
- 配布URL：https://js.kacsw.or.jp/system-utils.js
- 本ライブラリを呼び出すカスタマイズより先に読み込んでください。

ブラウザでは各関数を `window` に公開します。Nodeでは `require("../src/system-utils.js")` のCommonJSエクスポートを利用できます。パスワード生成にはブラウザの `crypto.getRandomValues` またはNodeの `crypto.randomBytes` が必要です。

```javascript
// ブラウザ（グローバル）
const pw = window.generatePassword({ length: 12, useSymbols: true });

// Node
const sys = require('../src/system-utils.js');
const pw2 = sys.generatePassword({ length: 16, useSymbols: false });
```

## 公開関数の目次

- [`generatePassword(options)`](#generatepassword)
- [`maskPassword(pw, visible)`](#maskpassword)
- [`toKanaReading(str, options)`](#tokanareading)

## 関数リファレンス

<a id="generatepassword"></a>

### `generatePassword(options)`

- 目的: 指定ルールに従い、安全なパスワードを生成します。
- 戻り値: 生成したパスワード（string）。`options` 省略時は既定設定を使用します。
- エラー: 安全な乱数APIを利用できない場合は例外になります。入力オプションの厳密な型検証を行うAPIではないため、以下の型・範囲で指定してください。
- 注意: 関数はオプションオブジェクトを直接受け取ります。誤って二重にラップして
  `{ options: { ... } }` のように渡すと、内部で `options.useSymbols` 等が見つからず
  期待した挙動になりません（例: 記号が含まれない）。以下の例を参照してください。
  - 正しい呼び出し例:
    - `generatePassword({ length: 16, useLower: true, useUpper: true, useNumbers: true, useSymbols: true })`
  - 誤った呼び出し例（避ける）:
    - `generatePassword({ options: { length: 16, useSymbols: true } })`

- `options`:
  - `length` (number) : 生成する長さ（既定 12、最小 4）。
  - `useLower` (boolean) : 小文字を含めるか（既定 true）。
  - `useUpper` (boolean) : 大文字を含めるか（既定 true）。
  - `useNumbers` (boolean) : 数字を含めるか（既定 true）。
  - `useSymbols` (boolean) : 記号を含めるか（既定 false）。
- 生成できる文字:
  - 小文字（`useLower: true`）:
    ```text
    abcdefghjkmnpqrstuvwxyz
    ```
  - 大文字（`useUpper: true`）:
    ```text
    ABCDEFGHJKMNPQRSTUVWXYZ
    ```
  - 数字（`useNumbers: true`）:
    ```text
    23456789
    ```
  - 記号（`useSymbols: true`）:
    ```text
    #$%&=@+*/?
    ```
  - 有効にした各カテゴリから最低1文字が含まれます。`useSymbols` の既定値は `false` です。
- 特記事項: 視認で混同しやすい文字は既定で除外しています（例: 小文字 `i,l,o`、大文字 `I,L,O`、数字 `0,1`）。
- 実装のポイント: 各選択種から最低1文字を確保し、残りを合成文字集合から選び、最後に Fisher–Yates でシャッフルします。乱数にはブラウザ `crypto.getRandomValues` / Node `crypto.randomBytes` を用い、モジュロバイアスを回避するために拒否サンプリング（`_su_randomIndex`）を使っています。

<a id="maskpassword"></a>

### `maskPassword(pw, visible)`

- 目的: パスワードを部分的にマスクして表示用に整形します。
- 引数:
  - `pw` (string) : 元のパスワード
  - `visible` (number) : 左右に残す文字数（既定 2）
- 戻り値: マスクした文字列。`pw` が文字列でない場合や空文字列の場合は空文字列を返します。`visible` が数値でなければ2、負数なら0として扱います。
- 例: `maskPassword('Secr3tPW', 2)` -> `'Se****PW'`。長さが `visible*2` 以下の場合はすべて `*` に置換されます。

<a id="tokanareading"></a>

### `toKanaReading(str, options)`

- 目的: 入力文字列中の英数字・記号を読み仮名（ヨミガナ）に置換して返します。
- `str`：入力値。null・undefinedは空文字列を返し、文字列以外は文字列化します。
- `options`:
  - `map` (object) : カスタム置換マップ（省略時はライブラリ付属の `_su_defaultReadingMap` を使用）
  - `strict` (boolean) : `true` の場合、マップにない文字があれば例外を投げます（既定 `false`）。
- 挙動: 置換された読み同士は `・` で区切ります。マップにない文字は既定ではそのまま出力されます。
- 戻り値: 変換後の文字列。空文字列は空文字列を返します。
- エラー: strictモードで置換マップにない文字を検出した場合は `Error` を投げます。
- 既定マップ: ファイル内の `_su_defaultReadingMap` に英字・数字・代表的記号の読みが定義されています。必要に応じて上書きやカスタムマップを渡してください。

### 例

```javascript
// 16文字のパスワード（大文字/小文字/数字/記号を含む）
const pw = generatePassword({ length: 16, useSymbols: true });

// マスク表示（左右1文字ずつ残す）
const masked = maskPassword(pw, 1);

// 読み仮名変換（デフォルトマップ）
const name = toKanaReading('A1@+');
// -> 例: 'エイ・イチ・アットマーク・プラス'

// カスタムマップと strict モード
try {
	const name2 = toKanaReading('Aあ', { map: { A: 'エー' }, strict: true });
} catch (e) {
	// strict=true だと未定義文字で例外
}
```

## 制約・注意事項

### セキュリティ注意

- パスワードは生成後に平文で保存しないでください。保存する場合は適切なハッシュ化や秘密管理を行ってください。
- ブラウザで生成したパスワードをサーバへ送信する場合は TLS を必ず使用してください。

文書の構成は [文書作成標準](README.md) に従います。保守・テストの手順は [保守・開発手順](maintenance/library-maintenance.md) を参照してください。

## 更新履歴・配布記録

2026-10-12に、`4acf76f` のソースと通常配布URLの内容が完全一致することを確認しました。CI・デプロイ・配布パッケージ作成も成功しています。確認日であり、初版の公開日を示すものではありません。詳細は [通常配布確認記録](verification/library-distribution.md) を参照してください。

| バージョン | 記録日     | 主な変更                                                                  | 記録・配布確認                                          |
| ---------- | ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1.0.0      | 2026-10-12 | 現行ソースを基準版として記録し、先頭JSDocにバージョンを明記。機能変更なし | `4acf76f`。通常配布URLとの完全一致を確認（2026-10-12）  |
| 未設定     | 2025-12-06 | system-utilsを追加                                                        | `e19f5c4`。配布確認は未確認                             |
| 未設定     | 2025-12-06 | `formatUserName` を `toKanaReading` へ改名し、テスト・仕様書を更新        | `f177bef`。配布確認は未確認                             |
| 未設定     | 2025-12-06 | グローバルの `exports` との衝突を避けるため内部名を変更                   | `92a9a9f`。配布確認は未確認                             |
| 未設定     | 2026-08-14 | 仕様書に関数リンクを追加                                                  | `c94a3f4`（本仕様書の変更）。配布内容の変更確認とは区別 |

過去の未設定行はGitの主要変更の抜粋です。記録日はコミット日で、初版作成日・配布日とは限りません。過去の各コミット時点の配布URLの内容・CI・デプロイは未確認です。過去のバージョンは推測で割り当てていません。
