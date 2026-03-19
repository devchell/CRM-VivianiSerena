# 09 Environment And Secrets

## Principio
Segredo fica em provedor de segredo ou em variavel de ambiente do runtime. Nao deve ficar em `.md`, codigo ou commit.

## API
Variaveis principais:
- `DATABASE_URL`
- `REDIS_URL`
- `API_BASE_URL`
- `CRM_URL`
- `CORS_ORIGIN`
- `JWT_PRIVATE_KEY`
- `JWT_PUBLIC_KEY`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- `ANONYMIZATION_SALT`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## CRM
Variaveis principais:
- `API_BASE_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Landing
Variaveis principais:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_LANDING_URL`
- `REVALIDATE_SECRET`

## GitHub Actions
- `VERCEL_TOKEN` em `Secrets`
- `VERCEL_ORG_ID` em `Variables`
- `VERCEL_PROJECT_ID_LANDING_HML` em `Variables`
- `VERCEL_PROJECT_ID_CRM_HML` em `Variables`

## Regra operacional
- qualquer token exposto em conversa, print ou commit deve ser rotacionado;
- cada ambiente deve ter seus proprios segredos.
