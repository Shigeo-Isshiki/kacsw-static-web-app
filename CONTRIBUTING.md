# CONTRIBUTING

簡潔な貢献ガイド（最低限）:

- コード整形: Prettier を使用しています。変更前に `npm run format` を実行してください。
- 静的解析: `npm run lint` を実行して問題がないことを確認してください。
- テスト: `npm run test` でテストを実行してください。
- ワークフロー:
  1. `main` を最新にして新しいブランチを作成
     ```bash
     git checkout main
     git pull origin main
     git switch -c feature/<短い説明>
     ```
  2. 変更をコミットし、リモートに push
     ```bash
     git add <files>
     git commit -m "feat: ..."
     git push -u origin feature/<短い説明>
     ```
  3. GitHub で PR を作成し、変更点の概要を記載してください。

- 問題報告・問い合わせ: バグ報告や提案は Issue を作成してください。

以上を満たしていれば基本的に受け入れ可能です。詳細な運用ルールが必要な場合は別途追記します。
