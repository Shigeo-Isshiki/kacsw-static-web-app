# KACSW Static Web App

![Prepare dist workflow](https://github.com/Shigeo-Isshiki/kacsw-static-web-app/actions/workflows/prepare-dist.yml/badge.svg)

kintone 向けおよび汎用の小さな JavaScript ユーティリティ集です。各モジュールの使い方は `docs/` に記載しています。

## 目次

- [ドキュメント](#docs)
- [クイックスタート](#quickstart)
- [補足](#notes)
- [貢献](#contributing)
- [ライセンス](#license)
- [連絡先（Issues）](#contact)

<a id="docs"></a>

## ドキュメント

- [銀行振込ユーティリティ — docs/bank-transfer.md](./docs/bank-transfer.md) — `src/bank-transfer.js`
- [CSV ビルダー — docs/csv-builder.md](./docs/csv-builder.md) — `src/csv-builder.js`
- [日付ユーティリティ — docs/date-utils.md](./docs/date-utils.md) — `src/date-utils.js`
- [kintone カスタムライブラリ — docs/kintone-custom-lib.md](./docs/kintone-custom-lib.md) — `src/kintone-custom-lib.js`
- [国民の祝日ユーティリティ — docs/national-holidays.md](./docs/national-holidays.md) — `src/national-holidays.js`
- [電話番号ユーティリティ — docs/phone-utils.md](./docs/phone-utils.md) — `src/phone-utils.js`
- [配送処理ユーティリティ — docs/shipping-processing.md](./docs/shipping-processing.md) — `src/shipping-processing.js`
- [システムユーティリティ — docs/system-utils.md](./docs/system-utils.md) — `src/system-utils.js`
- [文字列ユーティリティ — docs/text-suite.md](./docs/text-suite.md) — `src/text-suite.js`
- [ビデオ会議ユーティリティ — docs/vc-check.md](./docs/vc-check.md) — `src/vc-check.js`
- [郵便番号／住所ユーティリティ — docs/zip-code-address-utils.md](./docs/zip-code-address-utils.md) — `src/zip-code-address-utils.js`

<a id="quickstart"></a>

## クイックスタート

```bash
npm install
npm run test    # テスト実行（scripts/run-tests.js を使用）
npm start       # ./src を配信（http://localhost:8000）
```

ローカル起動後は、まず以下のURLを開くと全体像を把握しやすくなります。

- `http://localhost:8000/` : 入口ページ（`src/index.html`）
- `http://localhost:8000/test.html` : 個別スクリプト確認ページ
- `http://localhost:8000/test-all-scripts.html` : 一括読み込み確認ページ

### URL と JavaScript ファイルの対応

`npm start` は `src/` をそのまま配信するため、`src` 配下の JavaScript は URL で直接確認できます。

- 例: `src/text-suite.js` -> `http://localhost:8000/text-suite.js`
- 例: `src/phone-utils.js` -> `http://localhost:8000/phone-utils.js`
- 例: `src/kintone-custom-lib.js` -> `http://localhost:8000/kintone-custom-lib.js`

どのファイルを使うべきか迷う場合は、先に `docs/` の各説明を参照してください。

<a id="notes"></a>

## 補足

- テストは `test/` 配下にあります。
- 配布用ファイル作成は `npm run prepare:dist` と `npm run zip` を使用します。
- `npm run prepare:dist` は `src/index.html` を `dist/index.html` としてコピーします。
- 電話番号ユーティリティで参照している総務省公開情報は、2026年4月1日時点の内容に基づいています。

---

<a id="contributing"></a>

## 貢献

- 貢献方法については [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

<a id="license"></a>

## ライセンス

このプロジェクトは MIT ライセンスで公開されています。詳細は [LICENSE](./LICENSE) を参照してください。

<a id="contact"></a>

## 連絡先（Issues）

Issue を作成する際に記載していただきたい最小限の項目:

- 件名（短い要約）
- 再現手順（できるだけ簡潔に）
- 期待される挙動
- 実際の挙動（エラーメッセージやスクリーンショットがあれば添付）
- 実行環境（Node バージョン、OS など）
- 最小再現コードまたは該当ファイルの参照

(上記を埋めていただければ対応が早くなります。)

※ Issues は GitHub のリポジトリ Issues ページで作成してください: https://github.com/Shigeo-Isshiki/kacsw-static-web-app/issues
