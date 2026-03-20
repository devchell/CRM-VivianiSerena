# 18 API Deploy Traceability

## Objetivo
Deixar o deploy da API em homologacao disparavel, verificavel e auditavel a partir do repositorio.

## Arquivos versionados
- `.github/workflows/deploy-homolog.yml`
- `scripts/verify-api-deploy.ps1`
- `render.yaml`

## Secrets e variables do GitHub
- `RENDER_DEPLOY_HOOK_API_HML`
- `API_HML_BASE_URL`
- opcional: `API_HML_SMOKE_ADMIN_EMAIL`
- opcional: `API_HML_SMOKE_ADMIN_PASSWORD`

## Como o fluxo funciona
1. O workflow `Deploy Homologation` dispara em `staging` ou manualmente.
2. O job `deploy-api-hml` dispara o Render Deploy Hook.
3. O script `scripts/verify-api-deploy.ps1` aguarda:
   - `GET /health/live`
   - `GET /health/ready`
   - `GET /health/deps`
4. O mesmo script compara `health.live.version` com o SHA do commit publicado.

## Como a versao publicada e comprovada
- a API publica `version` nos health checks
- o codigo usa, em ordem:
  - `NEXT_PUBLIC_APP_VERSION`
  - `APP_VERSION`
  - `RENDER_GIT_COMMIT`
  - fallback `1.0.0`
- o `render.yaml` ja injeta `APP_VERSION=${RENDER_GIT_COMMIT:-$APP_VERSION}` no `startCommand`

## Disparo manual
```bash
gh workflow run "Deploy Homologation" --ref staging
```

## Verificacao manual local
```powershell
./scripts/verify-api-deploy.ps1 -ApiBaseUrl https://api-hml.exemplo.com -ExpectedVersion <commit_sha>
```

## Verificacao manual com smoke autenticado
```powershell
./scripts/verify-api-deploy.ps1 `
  -ApiBaseUrl https://api-hml.exemplo.com `
  -ExpectedVersion <commit_sha> `
  -AdminEmail admin@exemplo.com `
  -AdminPassword <senha>
```

## Recomendacao operacional
- usar o job `deploy-api-hml` do workflow `Deploy Homologation` como caminho oficial
- evitar gatilhos paralelos no painel da Render para nao perder rastreabilidade
