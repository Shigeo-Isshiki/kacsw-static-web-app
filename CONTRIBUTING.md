# CONTRIBUTING

簡潔な貢献ガイド（最低限）:

- コード整形: Prettier を使用しています。変更前に `npm run format` を実行してください。
- 静的解析: `npm run lint` を実行して問題がないことを確認してください。
- テスト: `npm run test` でテストを実行してください。
- 文書: [文書作成標準](./docs/README.md) に従ってライブラリのリファレンスを更新してください。API契約は本文、詳細な調査・検証結果や保守手順は別文書に分け、先頭JSDocと仕様書のバージョンを一致させてください。
- リリース・配布確認: [標準手順](./docs/README.md#リリース通常配布確認の標準手順) に従い、配布対象コミットのワークフロー成功と通常URLの内容一致を確認してから確認済み表記に更新してください。確認日・対象コミット・ハッシュ・結果は [通常配布確認記録](./docs/verification/library-distribution.md) に追記します。
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

文書の章立て・目次・リンク・バージョンを確認し、確認していない配布や実画面動作を成功として記載しないでください。
