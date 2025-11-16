# kintone カスタマイズ プロジェクト

このリポジトリは kintone アプリの JavaScript カスタマイズを開発するための最小セットアップです。

セットアップ手順（Windows PowerShell）:

```powershell
# 依存関係をインストール
npm install --save-dev rollup @rollup/plugin-node-resolve @rollup/plugin-commonjs eslint prettier eslint-config-prettier eslint-plugin-prettier

# ビルド
npm run build
```

出力は `dist/customize.js` に生成されます。生成されたファイルを kintone の「カスタマイズ / JavaScript」でアップロードしてください。

おすすめの VSCode 拡張:
- `ESLint`
- `Prettier`

注意:
- このサンプルは kintone グローバルオブジェクトが存在する環境で動作します。
