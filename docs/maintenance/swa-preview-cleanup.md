# Azure Static Web Apps プレビュー環境の自動クリーンアップ

## 動作

[`.github/workflows/swa-preview-cleanup.yml`](../../.github/workflows/swa-preview-cleanup.yml) は、毎日 03:17 UTC にAzure環境をGitHubのオープンPR一覧と照合します。`workflow_dispatch` では既定でdry runし、削除候補だけを表示します。PRクローズ時は既存のAzure Static Web Apps標準処理を維持し、この定期照合で失敗・取りこぼしを回収します（回収まで最大約24時間かかる場合があります）。

処理は次の条件をすべて満たす環境だけを削除します。

- Azure環境一覧でPR番号が明示されるか、環境名が `pr-<番号>` 形式である。
- `main` ブランチの環境、`default` / `production` / `prod` 環境ではない。
- `main` 宛てのオープンPR一覧にその番号がない。

PR番号を安全に特定できない環境は削除せず、ログに残します。削除やAzure/GitHub APIの失敗はワークフロー失敗として表面化します。PR由来のワークフローにAzure削除権限を与えないため、クリーンアップは定期実行と手動実行に限定します。

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
