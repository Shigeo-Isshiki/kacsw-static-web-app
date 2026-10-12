---
description: 'Use when creating or updating shared-library API documentation, version records, release notes, or verification records.'
applyTo: 'docs/**/*.md,src/*.js'
---

# 共通ライブラリの文書規約

- ライブラリ文書は `docs/README.md` の文書作成標準に従う。
- リファレンスは「概要・バージョン」「読み込み・依存関係」「公開関数の目次」「関数リファレンス」「制約・注意事項」「更新履歴・配布記録」の順で構成する。
- API契約・利用例・利用判断に必要な制約を保持し、関数目次とアンカーを一致させる。
- 現行バージョンはソース先頭JSDocの `@version` と一致させる。過去のバージョン・配布日は推測しない。
- 詳細な調査・実画面検証・配布証跡は `docs/verification/`、保守・テスト手順は `docs/maintenance/` に分離し、本文からリンクする。
- 公式仕様、自動テスト、実画面確認、未確認事項を区別し、特定環境の結果を一般化しない。
- 文書だけの変更で機能バージョンを上げない。章立て・アンカー・リンク・コードフェンス・バージョン一致・差分の空白エラーを検証する。
