## 概要

（変更内容を短くまとめてください — 例: 「`.gitattributes` を追加して EOL を LF に正規化」「Husky pre-commit の実行ビットを index に記録」「Puppeteer デバッグスクリプトを追加」）

## 変更の目的

- なぜこの変更が必要か（背景、問題点、改善点）を記載してください。

## 確認チェックリスト

- [ ] 変更は小さく、目的が明確である（大きい変更は分割を検討）
- [ ] 既存の機能に影響がない（互換性の破壊がある場合は明示）
- [ ] `.gitattributes` を追加/変更した場合は、renormalize を行いましたか？（例: `git add --renormalize .` の結果を確認）
- [ ] Husky のフック実行ビットを index に記録した場合はその理由を記載しましたか？（例: `.husky/pre-commit` が実行されることを確認済み）
- [ ] 依存関係をインストールして lint/staged が動くことを確認しましたか？（`npm ci` -> 変更をステージ -> `git commit` で確認）
- [ ] `npm run ci-check`（prepare:dist, window VM check, puppeteer-check）やプロジェクトの CI スクリプトが通ることを確認しましたか？
- [ ] 主要な静的チェック（`npm run lint` / `npm run lint:ci`）を通過しましたか？
- [ ] 変更による UI/機能の影響がある場合、再現手順とスクリーンショット/ログを添付しましたか？
- [ ] ドキュメント（README、CHANGELOG、PR 本文）を更新しましたか？
- [ ] Windows を使う開発者向けの注意点があれば記載しましたか？（例: `npm ci` を実行する、必要なら `git update-index --chmod=+x .husky/pre-commit`）

## テスト手順（レビュワー向け）

1. ブランチをチェックアウト:

   ```bash
   git fetch origin
   git checkout <このブランチ名>
   ```

2. 依存をインストール:

   ```bash
   npm ci
   ```

3. 自動チェックを実行（任意だが推奨）:

   ```bash
   npm run lint:ci
   npm run prepare:dist
   npm run ci-check
   ```

4. フック確認（Husky）:

   - 空コミットで pre-commit が起動することを確認する:

     ```bash
     git commit --allow-empty -m "test: husky"
     ```

   - または小さな変更をステージして通常コミットし、`lint-staged` による自動整形が行われることを確認してください。

## 影響範囲 / リスク

- `.gitattributes` による影響（行末の正規化で差分が出る場合があるため、レビュー時に差分を注意深く確認してください）。
- Husky の実行フラグはプラットフォーム依存の扱いがある（Windows では FS の実行権限概念が異なります）。

## 関連チケット / 参考

- 関連する issue や外部参照があればリンクを貼ってください。

---

（このテンプレートはチームのベストプラクティスに合わせて調整してください。必要なら英文版も用意します）
## 概要

この PR が何を変更するかを簡潔に記載してください（例: README 更新、バグ修正、機能追加など）。

## 変更内容
- 変更したファイルの一覧と短い説明を箇条書きで書いてください。

## 必須チェックリスト (作成者用)
下の項目を確認してから PR を作成してください。

- [ ] ローカルで `npm ci` を実行し、依存が最新であることを確認した
- [ ] `npm run lint` を実行してエラーがないことを確認した（必要なら `npm run lint:fix` を実行）
- [ ] `npm run format` を実行してコードを整形した（またはコミット前フックで自動整形されることを確認）
- [ ] (必要時) `npm run prepare:dist` と `npm run zip` を実行して `package.zip` を確認した
- [ ] レビュワーに @mention してレビューを依頼した


## 確認手順（レビュワー向け）
1. ローカルで依存をインストール: `npm ci`
2. コミット前フック（husky + lint-staged）が有効になっていることを確認します（通常は `npm ci` で自動設定されます）。
3. 必要に応じてローカルでフォーマットと lint を実行:
   - `npm run format`（任意）
   - `npm run lint`（エラーがないか確認）
4. (変更がビルド対象の場合) `npm run prepare:dist` → `npm run zip` を実行して `package.zip` を確認します。

## CI チェック
- 本リポジトリでは PR 作成時に以下が自動実行されます:
  - Prettier のフォーマットチェック
  - ESLint の実行
  - (定義があれば) `npm test`
  - `prepare:dist` とパッケージの作成

CI が失敗した場合は、Actions のログを確認し、README の「よくある CI 失敗例と対処法」を参照してください。

## レビュアーへの依頼
- レビューを依頼したい人を @mention してください（例: `@team`）。
- レビューで特に見てほしい点があれば記載してください。

## 備考
- この PR に関する補足情報（関連 Issue 番号、スクリーンショット、注意点など）があれば記載してください。
