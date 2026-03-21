param(
  [Parameter(Mandatory = $true)]
  [string]$HookUrl,

  [switch]$DispatchWorkflow,

  [switch]$Wait
)

$ErrorActionPreference = 'Stop'

if (-not $HookUrl.StartsWith('https://')) {
  throw 'HookUrl must start with https://'
}

gh secret set RENDER_DEPLOY_HOOK_API_HML --body $HookUrl

Write-Host 'RENDER_DEPLOY_HOOK_API_HML updated in GitHub Actions secrets.'

if ($DispatchWorkflow) {
  gh workflow run "Deploy Homologation" --ref staging
  Write-Host 'Deploy Homologation workflow dispatched on staging.'

  if ($Wait) {
    Start-Sleep -Seconds 3
    $runId = gh run list --workflow "Deploy Homologation" --branch staging --limit 1 --json databaseId --jq '.[0].databaseId'

    if (-not $runId) {
      throw 'Could not resolve the latest Deploy Homologation run id.'
    }

    gh run watch $runId --exit-status
  }
}
