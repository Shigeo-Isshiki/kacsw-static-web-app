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

## プルリクエスト (PR) ベースの開発フロー（推奨）

このリポジトリでは、`main` への直接コミットを避け、ブランチを切って Pull Request を作成するワークフローを推奨します。理由は次のとおりです:

- レビュープロセスを通して品質を保つため
- CI（Lint / Test）が PR に対して実行され、結果が可視化されるため
- ブランチ保護ルール（例: 1 件以上の承認、ステータスチェックの必須化）に準拠するため

基本手順:

1. `main` を最新にして新しいブランチを作成

```bash
git checkout main
git pull origin main
git switch -c feature/<short-description>
```

2. 変更を行い、ステージ・コミットする

```bash
git add <files>
git commit -m "feat: add ..."
```

3. ブランチをリモートに push し、PR を作成

手動で行う方法:

```bash
git push -u origin feature/<short-description>
# GitHub の UI から PR を作成
```

またはローカルで `gh` CLI が使える場合は簡易スクリプト `scripts/create-pr.sh` を使うと便利です（リポジトリルートに配置済み）。

スクリプトの簡単な使い方:

```bash
# ブランチ名を指定して PR 作成（コミット済みであること）
scripts/create-pr.sh feature/awesome-fix "fix: 修正の要約" "PR の詳細な説明"

# ブランチ名を空にすると自動で feature/<timestamp> 形式のブランチを作ります
scripts/create-pr.sh "" "chore: quick update" "説明"
```

CI ワークフロー

このリポジトリの CI は PR イベントで Lint と Test を自動実行するように設定されています。PR を作成すると、`CI` ワークフローが自動で走り、結果が PR に表示されます。

レガシーな直接コミットについて

既に `main` に直接コミットしてしまった変更を PR ベースに整えたい場合は、履歴の修正（revert やブランチ移行）を検討できます。履歴を書き換える操作は注意が必要なため、実行前にチーム内で合意してください。必要なら私が手順を作成して実行します。
