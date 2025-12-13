**System Utils**

- **説明**: `system-utils.js` は kintone カスタマイズ等で使う軽量ユーティリティ群です。主に次の機能を提供します:
  - `generatePassword` : 規則に沿ったセキュアなパスワード生成
  - `maskPassword` : パスワードの一部をマスク表示
  - `toKanaReading` : 英数字・記号を読み仮名に変換（既定マップ付属）

**インポート / 利用方法（ブラウザ/Node 共通）**

- ブラウザからは `window.generatePassword` 等のグローバル関数として利用できます（`src` を読み込んだ場合）。
- Node では CommonJS の `require` で読み込めます（`module.exports` が提供されます）。

```javascript
// ブラウザ（グローバル）
const pw = window.generatePassword({ length: 12, useSymbols: true });

// Node
const sys = require('../src/system-utils.js');
const pw2 = sys.generatePassword({ length: 16, useSymbols: false });
```

**API リファレンス**

- `generatePassword(options)`
  - 目的: 指定ルールに従い、安全なパスワードを生成します。
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
  - 特記事項: 視認で混同しやすい文字は既定で除外しています（例: 小文字 `i,l,o`、大文字 `I,L,O`、数字 `0,1`）。
  - 実装のポイント: 各選択種から最低1文字を確保し、残りを合成文字集合から選び、最後に Fisher–Yates でシャッフルします。乱数にはブラウザ `crypto.getRandomValues` / Node `crypto.randomBytes` を用い、モジュロバイアスを回避するために拒否サンプリング（`_su_randomIndex`）を使っています。

- `maskPassword(pw, visible)`
  - 目的: パスワードを部分的にマスクして表示用に整形します。
  - 引数:
    - `pw` (string) : 元のパスワード
    - `visible` (number) : 左右に残す文字数（既定 2）
  - 例: `maskPassword('Secr3tPW', 2)` -> `'Se****PW'`。長さが `visible*2` 以下の場合はすべて `*` に置換されます。

- `toKanaReading(str, options)`
  - 目的: 入力文字列中の英数字・記号を読み仮名（ヨミガナ）に置換して返します。
  - `options`:
    - `map` (object) : カスタム置換マップ（省略時はライブラリ付属の `_su_defaultReadingMap` を使用）
    - `strict` (boolean) : `true` の場合、マップにない文字があれば例外を投げます（既定 `false`）。
  - 挙動: 置換された読み同士は `・` で区切ります。マップにない文字は既定ではそのまま出力されます。
  - 既定マップ: ファイル内の `_su_defaultReadingMap` に英字・数字・代表的記号の読みが定義されています。必要に応じて上書きやカスタムマップを渡してください。

**例**

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

**セキュリティ注意**

- パスワードは生成後に平文で保存しないでください。保存する場合は適切なハッシュ化や秘密管理を行ってください。
- ブラウザで生成したパスワードをサーバへ送信する場合は TLS を必ず使用してください。

**テストの実行方法**

全テストを実行するにはリポジトリのテストランナーを使います:

```bash
node test/run-tests.js
```

個別ファイルを直接実行することもできます:

```bash
node test/test-system-utils.js
```

---

必要ならこのドキュメントに以下を追加できます:

- API の詳細な表（引数・戻り値・例外）
- 既定の `_su_defaultReadingMap` の完全一覧（現在はソース内に記載）
- 実運用向けの推奨設定例
