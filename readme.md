<!--
  This README was updated by an automated edit to append a
  "設定で変更できるルール一覧" section describing phone number
  configuration available in `src/phoneUtils.js`.
-->

# My First Static Web App

This repository is a small static web app used for building and testing
JavaScript utilities for handling Japanese phone numbers, postal codes,
and other helpers.

## ディレクトリ構成

```
src/
  phoneUtils.js
  ... (省略)
readme.md
package.json
```

## 設定で変更できるルール一覧

`src/phoneUtils.js` の先頭にある `_PU_PHONE_NUMBER_CONFIG` には、電話番号の種類判定や属性（発信可能/携帯/ファクス可否）に用いるルールを含めることができます。

以下は現在の設定キーと意味です。将来の要件でルールを変えたい場合は、このオブジェクト内の値を書き換えてください。

- `callCapableTypes` (Array of string)
  - この配列に含まれる電話種別は「発信可能（callCapable）」と見なされます。
  - デフォルト例: `['固定電話','着信課金','統一番号','携帯電話','IP電話']`
- `faxExcludedTypes` (Array of string)
  - この配列に含まれる種別は「ファクス不可（faxCapable=false）」として扱われます。
  - デフォルト例: `['IP電話','携帯電話']`
- `mobileType` (string)
  - この文字列と一致する種別が「携帯（mobile）」として扱われます。
  - デフォルト例: `'携帯電話'`

formatPhoneNumber の戻り値では以下の boolean 属性が返されます。

- `callCapable` : 電話発信が可能な回線か（`callCapableTypes` に基づく）
- `homeLine` : 固定系の回線で発信可能か（`callCapable && !mobile`）
- `faxCapable` : ファクス送信が可能か（`callCapable && !mobile && type not in faxExcludedTypes`）
- `mobile` : 携帯回線か（`type === mobileType`）

例:

```
formatPhoneNumber('09012345678')
// => { formattedNumber: '090-1234-5678', type: '携帯電話', callCapable: true, homeLine: false, faxCapable: false, mobile: true }

formatPhoneNumber('0570123456')
// => { formattedNumber: '0570-123-456', type: '統一番号', callCapable: true, homeLine: true, faxCapable: true, mobile: false }
```

注意:

- `0570` は現在 `統一番号` と扱われ、`0570-123-456` の形で整形されます。
- 特殊な番号（例: `091` で始まる回線）は `特定接続` 等に分類され、デフォルトで発信不可と扱われます。

この README の説明は簡潔版です。将来的にルールが増えたり複雑になった場合は、`docs/phone-config.md` のような別ドキュメントに移動することを検討してください。
# Vanilla JavaScript App

[Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/overview) allows you to easily build JavaScript apps in minutes. Use this repo with the [quickstart](https://docs.microsoft.com/azure/static-web-apps/getting-started?tabs=vanilla-javascript) to build and customize a new static site.

This repo is used as a starter for a _very basic_ HTML web application using no front-end frameworks.

This repo has a dev container. This means if you open it inside a [GitHub Codespace](https://github.com/features/codespaces), or using [VS Code with the remote containers extension](https://code.visualstudio.com/docs/remote/containers), it will be opened inside a container with all the dependencies already installed.