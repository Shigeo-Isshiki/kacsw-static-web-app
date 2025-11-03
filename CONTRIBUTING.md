# CONTRIBUTING

このプロジェクトへの貢献に関する簡単なガイドです。

## コードスタイル
- Prettier をプロジェクト標準のフォーマッタとして使用しています。
- ルール（リポジトリルートの `.prettierrc` に設定済み）:
  - useTabs: true
  - tabWidth: 2
  - singleQuote: true
  - trailingComma: es5
  - semi: true
  - printWidth: 100
  - endOfLine: lf

## 開発フロー（推奨）
1. リポジトリを最新に更新

```bash
git checkout main
git pull origin main
```

2. 依存インストール

```bash
npm ci
```

3. コードの整形と静的チェック

```bash
npm run format
npm run lint
npm run lint:fix
```

4. ファイルをステージしてコミット

```bash
git add <files>
git commit -m "Your message"
```

コミット時には Husky + lint-staged によりステージしたファイルが自動整形されます。CI の `prettier --check` をパスするために、`npm run format` を事前に実行することを推奨します。

## エディタ設定
- VS Code の場合は `settings.json` に以下を追加すると便利です:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "files.eol": "\n"
}
```

## CI で失敗した場合の対処
- Prettier のチェックが失敗したら、`npm run format` を実行して変更をコミットし、再度 push してください。
- ESLint のエラーが残る場合は `npm run lint` / `npm run lint:fix` を試してください。

---

貢献ありがとうございます。PR を作成する際は、変更点の概要、影響範囲、CI の結果（可能なら実行ログのスクリーンショット）を添えてください。
