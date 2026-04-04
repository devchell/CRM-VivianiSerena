#!/bin/bash
#
# VivianiCRM — Setup Produção (Vercel + Render + Supabase + Upstash)
#
# Este script automatiza a criação e configuração de todos os serviços para produção.
#
# PRÉ-REQUISITOS:
# 1. Vercel CLI instalado: npm install -g vercel
# 2. Supabase CLI instalado: brew install supabase/tap/supabase
# 3. Render CLI (se disponível) ou acesso ao painel
# 4. Estar logado: vercel login, supabase login
#
# VARIÁVEIS A CONFIGURAR (ou passar como argumentos):

set -e

VERCEL_ORG_ID="${1:-}" # seu Vercel Org ID (team_xxx ou username)
SUPABASE_ACCESS_TOKEN="${2:-}" # seu Supabase Access Token
UPSTASH_EMAIL="${3:-}" # seu email Upstash
UPSTASH_API_KEY="${4:-}" # seu Upstash API Key

echo "🚀 VivianiCRM — Setup Produção"
echo "=============================="
echo ""

if [ -z "$VERCEL_ORG_ID" ]; then
  echo "❌ ERRO: VERCEL_ORG_ID não fornecido"
  echo "Uso: ./scripts/setup-production.sh <VERCEL_ORG_ID> <SUPABASE_TOKEN> <UPSTASH_EMAIL> <UPSTASH_API_KEY>"
  echo ""
  echo "Como obter:"
  echo "  VERCEL_ORG_ID: https://vercel.com/account/general (ORG ID)"
  echo "  SUPABASE_TOKEN: https://app.supabase.com/account/tokens (Personal Tokens)"
  echo "  UPSTASH_EMAIL: seu email cadastrado no Upstash"
  echo "  UPSTASH_API_KEY: https://console.upstash.com/account/api (API Key)"
  exit 1
fi

echo "✅ Configuração fornecida"
echo ""

# ============================================================================
# 1. VERCEL — Criar Landing e CRM
# ============================================================================

echo "📦 [1/4] Vercel — Criando Landing e CRM..."
echo ""

# Link dos projetos existentes (ou criar novos)
echo "  → Listando projetos Vercel..."
vercel projects --scope=$VERCEL_ORG_ID 2>/dev/null | grep -E "(landing|crm)" || echo "  ⚠️  Nenhum projeto encontrado (será criado durante deploy)"

echo ""
echo "  📝 Você precisa:"
echo "    1. Criar projeto 'landing-prod' no Vercel manualmente"
echo "    2. Criar projeto 'crm-prod' no Vercel manualmente"
echo "    3. Configurar env vars em cada um (vide abaixo)"
echo ""
echo "  Se preferir automático:"
echo "    vercel --prod --cwd=apps/landing --name=landing-prod --scope=$VERCEL_ORG_ID"
echo "    vercel --prod --cwd=apps/crm --name=crm-prod --scope=$VERCEL_ORG_ID"
echo ""

# ============================================================================
# 2. SUPABASE — Criar Projeto
# ============================================================================

echo "📦 [2/4] Supabase — Criando Projeto..."
echo ""

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
  echo "  ❌ Supabase CLI não instalado"
  echo "  $ brew install supabase/tap/supabase"
  exit 1
fi

# Criar projeto Supabase (interativo)
echo "  🔐 Autenticando com Supabase..."
# supabase login

# Criar projeto (manual por enquanto)
echo "  📝 Para criar projeto Supabase:"
echo "    1. Acesse https://app.supabase.com/"
echo "    2. Clique 'New Project'"
echo "    3. Nome: viviani-crm-prod"
echo "    4. Região: sua escolha (ex: us-east-1)"
echo "    5. Copie os dados:"
echo "       - Project URL"
echo "       - Anon Key"
echo "       - Service Role Key"
echo ""

# ============================================================================
# 3. UPSTASH — Criar Redis
# ============================================================================

echo "📦 [3/4] Upstash — Criando Redis..."
echo ""

if [ -z "$UPSTASH_API_KEY" ]; then
  echo "  ⚠️  UPSTASH_API_KEY não fornecido, pulando..."
else
  echo "  🔐 Criando Redis no Upstash via API..."

  curl -X POST "https://api.upstash.com/v2/redis/databases" \
    -H "Authorization: Bearer $UPSTASH_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "viviani-crm-prod",
      "region": "us-east-1",
      "type": "standard"
    }' \
    2>/dev/null | jq . || echo "  ❌ Erro ao criar Redis no Upstash"
fi

echo ""

# ============================================================================
# 4. RENDER — Criar Serviço Web
# ============================================================================

echo "📦 [4/4] Render — Criando Serviço API..."
echo ""

echo "  📝 Para criar serviço no Render:"
echo "    1. Acesse https://dashboard.render.com/"
echo "    2. Clique 'New +' → 'Web Service'"
echo "    3. Conectar repositório GitHub"
echo "    4. Selecionar branch: main"
echo "    5. Nome: viviani-crm-api-prod"
echo "    6. Root Directory: apps/api"
echo "    7. Runtime: Node"
echo "    8. Build Command: pnpm install && pnpm --filter @viviani/api build"
echo "    9. Start Command: node dist/main.js"
echo "    10. Environment Variables (vide abaixo)"
echo "    11. Deploy!"
echo ""

# ============================================================================
# CONFIGURAÇÃO DE ENVIRONMENT VARIABLES
# ============================================================================

echo "🔐 ENVIRONMENT VARIABLES PARA CONFIGURAR"
echo "========================================"
echo ""

echo "📍 VERCEL (Landing e CRM):"
echo "  NEXT_PUBLIC_API_URL = https://api-prod.render.com (ou seu domínio)"
echo "  NEXTAUTH_SECRET = [gerar: openssl rand -base64 32]"
echo "  NEXTAUTH_URL = https://crm-prod.vercel.app"
echo "  NEXT_PUBLIC_LANDING_URL = https://viviani.com (seu domínio)"
echo ""

echo "📍 RENDER (API):"
echo "  DATABASE_URL = postgresql://user:password@host:5432/postgres (Supabase)"
echo "  UPSTASH_REDIS_REST_URL = https://xxx.upstash.io (Upstash)"
echo "  UPSTASH_REDIS_REST_TOKEN = [token Upstash]"
echo "  SUPABASE_URL = https://xxx.supabase.co (Supabase)"
echo "  SUPABASE_SERVICE_ROLE_KEY = [service role key Supabase]"
echo "  JWT_PRIVATE_KEY = [gerar chave RSA]"
echo "  JWT_PUBLIC_KEY = [parte pública da chave RSA]"
echo "  ENCRYPTION_KEY = [gerar: openssl rand -hex 32]"
echo "  NEXTAUTH_URL = https://crm-prod.vercel.app"
echo "  NEXTAUTH_SECRET = [mesmo de Vercel]"
echo "  CORS_ORIGIN = https://crm-prod.vercel.app,https://viviani.com"
echo ""

echo "📍 Supabase:"
echo "  Habilitar RLS em todas as tabelas"
echo "  Executar migrações (pnpm --filter @viviani/api db:push)"
echo ""

echo "📍 Cloudflare (Opcional):"
echo "  Apontar DNS para Vercel (landing-prod.vercel.app)"
echo "  Apontar DNS para Render (api-prod.render.com)"
echo "  Habilitar WAF, DDoS protection"
echo ""

echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Criar projetos nos painéis acima"
echo "  2. Configurar environment variables"
echo "  3. Fazer push para main (deployment automático via GitHub)"
echo "  4. Acompanhar em: https://github.com/devchell/CRM-VivianiSerena/actions"
echo ""
