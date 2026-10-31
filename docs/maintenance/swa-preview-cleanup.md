# Azure Static Web Apps プレビュー環境の自動クリーンアップ

## 動作

[`.github/workflows/swa-preview-cleanup.yml`](../../.github/workflows/swa-preview-cleanup.yml) は、毎日 03:17 UTC にAzure環境をGitHubのオープンPR一覧と照合します。`workflow_dispatch` では既定でdry runし、削除候補だけを表示します。PRクローズ時は既存のAzure Static Web Apps標準処理を維持し、この定期照合で失敗・取りこぼしを回収します（回収まで最大約24時間かかる場合があります）。

処理は次の条件をすべて満たす環境だけを削除します。

- Azure環境一覧でPR番号が明示されるか、環境名が `pr-<番号>` または正の整数（例：`24`）形式である。名前は候補抽出だけに使用し、名前だけでは削除しない。
- `main` ブランチの環境、`default` / `production` / `prod` 環境ではない。
- `main` 宛てのオープンPR一覧にその番号がない。
- GitHubの個別PR APIでも、PR番号の一致と `closed` 状態を確認できる。
- PRのbaseリポジトリが実行対象リポジトリ、baseブランチが `main` と一致する。
- PRのheadリポジトリも実行対象リポジトリであり、headブランチがAzure環境の `sourceBranch` と一致する。

PR番号や対応関係を安全に確認できない環境は削除せず、ログに残します。明示されたPR番号と環境名の番号が矛盾する環境、ブランチ情報がない環境、fork由来やheadリポジトリが削除済みのPR環境も保持し、手動で確認します。全候補の照合が完了してから削除を開始するため、個別PR APIの403・404などの取得失敗時は削除せずワークフローを失敗させます。削除途中でAzure APIが失敗した場合、既に完了した削除は取り消されません。

ログには総環境数・候補数・検証済み数・保持数を出力します。dry runも同じ照合を行い、検証済みの候補だけを表示します。PR由来のワークフローにAzure削除権限を与えないため、クリーンアップは定期実行と手動実行に限定します。

ローカルのモックテストは `node test/test-swa-preview-cleanup.js` で実行します。実際のAzureメタデータとの一致や削除成功は、このテストだけでは確認できません。反映後は必ず `dry_run: true` で対象PR・ブランチと候補を照合し、不一致や未確認の環境を名前だけで削除しないでください。

## 静的ファイルのデプロイ

[Azureデプロイワークフロー](../../.github/workflows/azure-static-web-apps-wonderful-dune-09934f50f.yml) は `app_location: './src'`、`skip_app_build: true`、`output_location: ''` とし、ビルド済みコンテンツとしてソースディレクトリの静的ファイルを直接配信します。[公式のビルド省略設定](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration#skip-building-front-end-app)に従い、不要なOryxビルド・言語判定を省略します。独立したCIのlint・テストや配布パッケージ作成は変更しません。

ビルド省略はプレビュー環境数を減らしません。上限対策は上記のクリーンアップで行い、利用中のプレビューがStandardの上限10環境に達した場合は同時利用数の調整が必要です。

## 初回のみ必要なAzure/GitHub設定

クリーンアップはAzure Resource ManagerへGitHub Actions OIDCでサインインします。デプロイ用Static Web AppsトークンではAzure環境一覧や削除を実行できません。

1. Azure Entra IDに専用アプリケーションとサービスプリンシパルを作成します。クライアントシークレットは作成・保存しません。
2. アプリケーションにGitHub Actionsのフェデレーション資格情報を1つ登録します。Issuerは `https://token.actions.githubusercontent.com`、Audienceは `api://AzureADTokenExchange`、Subjectは `repo:Shigeo-Isshiki/kacsw-static-web-app:ref:refs/heads/main` です。ワークフローは `main` から手動実行してください。
3. 専用のカスタムRBACロールを作成し、Static Web Appリソース `/subscriptions/<subscription-id>/resourceGroups/static-web-apps/providers/Microsoft.Web/staticSites/kacsw-static-web-app` のみに割り当てます。必要なActionsは `Microsoft.Web/staticSites/read`、`Microsoft.Web/staticSites/builds/read`、`Microsoft.Web/staticSites/builds/delete` です。サブスクリプションやリソースグループ全体への `Contributor` / `Owner` ロールは使用しません。
4. リポジトリの **Settings → Secrets and variables → Actions → Variables** に、以下のRepository variablesを登録します。
   - `AZURE_CLIENT_ID`：専用アプリケーションのApplication (client) ID
   - `AZURE_TENANT_ID`：Azure Entra tenant ID
   - `AZURE_SUBSCRIPTION_ID`：Static Web Appが存在するsubscription ID
5. `main` に設定を反映後、Actionsから **Azure Static Web Apps preview cleanup** を手動実行し、`dry_run: true` の候補一覧を確認します。問題がなければ `dry_run: false` で動作を確認します。

このリポジトリで確認済みの対象リソースは、Static Web App `kacsw-static-web-app`、リソースグループ `static-web-apps`、production branch `main` です。環境上限はプランに依存し、Standardプランでは1アプリあたり10個です。詳細は[Azure Static Web Appsのpreview environments](https://learn.microsoft.com/en-us/azure/static-web-apps/preview-environments)、[quotas](https://learn.microsoft.com/en-us/azure/static-web-apps/quotas)、[Azure CLI environment commands](https://learn.microsoft.com/en-us/cli/azure/staticwebapp/environment?view=azure-cli-latest)を参照してください。
