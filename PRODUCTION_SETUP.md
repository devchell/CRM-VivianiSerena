# 🚀 Produção — Checklist Rápido (3 min)

Vercel ja está linkado! ✅

Faltam **3 coisas simples**:

---

## 1. Supabase (1 min)
Abra: https://app.supabase.com/new

- **Projeto**: viviani-crm-prod
- **Region**: us-east-1
- **Password**: `[gerar seguro]`

**Copie após criado:**
- Database URL → `DATABASE_URL`
- Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`
- Anon Key → `SUPABASE_ANON_KEY`

---

## 2. Upstash (1 min)
Abra: https://console.upstash.com/redis

Clique "Create Database"

- **Name**: viviani-crm-prod
- **Region**: us-east-1
- **Type**: Free (ou Standard se quiser)

**Copie após criado:**
- REST URL → `UPSTASH_REDIS_REST_URL`
- REST Token → `UPSTASH_REDIS_REST_TOKEN`

---

## 3. Render (1 min)
Abra: https://dashboard.render.com/

Clique "New+" → "Web Service"

**Selecionar repositório:**
- `devchell/CRM-VivianiSerena`
- Branch: `main`

**Preencher:**
- Name: `viviani-crm-api-prod`
- Root: `apps/api`
- Runtime: `Node`
- Build: `pnpm install && pnpm --filter @viviani/api build`
- Start: `node dist/main.js`

**Clique "Advanced" e adicione env vars:**
```
DATABASE_URL = [de Supabase]
SUPABASE_SERVICE_ROLE_KEY = [de Supabase]
UPSTASH_REDIS_REST_URL = [de Upstash]
UPSTASH_REDIS_REST_TOKEN = [de Upstash]
NEXTAUTH_SECRET = [rodar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
NEXTAUTH_URL = https://crm-prod.vercel.app
CORS_ORIGIN = https://crm-prod.vercel.app,https://landing-prod.vercel.app
CRM_URL = https://crm-prod.vercel.app
API_BASE_URL = https://api-prod-xxx.render.com
JWT_PRIVATE_KEY = [vide abaixo]
JWT_PUBLIC_KEY = [vide abaixo]
ENCRYPTION_KEY = [rodar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
```

**Para gerar JWT keys, rode LOCALMENTE:**
```bash
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -pubout -out public_key.pem
cat private_key.pem | base64 -w 0  # copie saída
cat public_key.pem | base64 -w 0   # copie saída
```

Depois clique "Deploy"!

---

## 4. GitHub Secrets (1 min)
Abra: https://github.com/devchell/CRM-VivianiSerena/settings/secrets/actions

Adicione:
- `RENDER_DEPLOY_HOOK_API` = [de Render, Settings → Deploy Hook]

---

## 5. Migrations Supabase
Após tudo criado, rode LOCALMENTE:
```bash
export SUPABASE_URL="..." # de Supabase
export SUPABASE_SERVICE_ROLE_KEY="..." # de Supabase
pnpm --filter @viviani/api db:push
```

---

## 6. Deploy Final

Faça push:
```bash
git add . && git commit -m "prod: configure production"
git push origin main
```

GitHub Actions vai fazer deploy automático:
✅ Landing → Vercel
✅ CRM → Vercel
✅ API → Render

---

**Pronto! Você terá:**
- Landing: https://landing-prod.vercel.app
- CRM: https://crm-prod.vercel.app
- API: https://api-prod-xxx.render.com

---
