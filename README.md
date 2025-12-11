# KACSW Static Web App

![Prepare dist workflow](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/workflows/prepare-dist.yml/badge.svg)


kintone 向けおよび汎用の小さな JavaScript ユーティリティ集です。各モジュールの使い方は `docs/` に記載しています。

## 目次

- [ドキュメント（主要）](#docs)
- [クイックスタート](#quickstart)
- [補足](#notes)

<a id="docs"></a>
## ドキュメント

- [銀行振込ユーティリティ — docs/bank-transfer.md](./docs/bank-transfer.md)
- [CSV ビルダー — docs/csv-builder.md](./docs/csv-builder.md)
- [日付ユーティリティ — docs/date-utils.md](./docs/date-utils.md)
- [kintone カスタムライブラリ — docs/kintone-custom-lib.md](./docs/kintone-custom-lib.md)
- [電話番号ユーティリティ — docs/phone-utils.md](./docs/phone-utils.md)
- [配送処理ユーティリティ — docs/shipping-processing.md](./docs/shipping-processing.md)
- [システムユーティリティ — docs/system-utils.md](./docs/system-utils.md)
- [文字列ユーティリティ — docs/text-suite.md](./docs/text-suite.md)
- [ビデオ会議ユーティリティ — docs/vc-check.md](./docs/vc-check.md)
- [郵便番号／住所ユーティリティ — docs/zip-code-address-utils.md](./docs/zip-code-address-utils.md)

<a id="quickstart"></a>
## クイックスタート

```bash
npm install
npm run test    # テスト実行（scripts/run-tests.js を使用）
npm start       # ./src を配信（http://localhost:8000）
```

<a id="notes"></a>
## 補足

- テストは `test/` 配下にあります。
- 配布用ファイル作成は `npm run prepare:dist` と `npm run zip` を使用します。

---
## 貢献

- 貢献方法については [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

## ライセンス

このプロジェクトは MIT ライセンスで公開されています。詳細は [LICENSE](./LICENSE) を参照してください。
