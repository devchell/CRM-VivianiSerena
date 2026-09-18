# Operação da VivianiCRM na VPS

Este projeto roda inteiro na VPS, via Docker Compose. A arquitetura não depende de Vercel, Render, Supabase, Upstash ou outro serviço de execução externo.

## Serviços

- `nginx`: único serviço com portas públicas; recebe 80, 3001 e 4000 e faz proxy para landing, CRM e API.
- `landing`: site público Next.js, somente na rede interna.
- `crm`: painel Next.js, somente na rede interna; acesso externo continua compatível por `:3001` através do Nginx.
- `api`: API Express, somente na rede interna; acesso externo continua compatível por `:4000` através do Nginx.
- `postgres`: PostgreSQL 16, somente na rede Docker.
- `redis`: Redis 7 com senha, somente na rede Docker.

Os dados persistem nos volumes `postgres_data`, `redis_data` e `api_data`. O volume não substitui backup externo.

## Primeiro bootstrap

Na VPS, o diretório operacional é `/opt/viviani-crm`.

1. Copie o código do repositório para `/opt/viviani-crm`.
2. Crie `/opt/viviani-crm/deploy/vps/.env` a partir de [`deploy/vps/.env.example`](deploy/vps/.env.example).
3. Preencha todos os segredos, inclusive as senhas do PostgreSQL/Redis e as chaves RSA.
4. Para um banco novo, mantenha `FRESH_DATABASE=true` apenas durante o primeiro bootstrap. Depois troque para `false`.
5. Defina `DEPLOYMENT_STAGE=homologacao` para apresentação. Em produção, use o perfil HTTPS descrito abaixo. Rode o preflight antes de qualquer subida:

```bash
cd /opt/viviani-crm
sh deploy/vps/preflight.sh
docker compose --env-file deploy/vps/.env config
docker compose --env-file deploy/vps/.env up -d --build --force-recreate api crm landing nginx
```

O `config` deve terminar sem erro antes do `up`. O seed é idempotente e não deve ser usado para resetar o banco.

O preflight de `production` bloqueia HTTP/IP, cookies inseguros, HSTS desligado, `TRUST_PROXY` incorreto, Compose sem o override HTTPS, hosts públicos divergentes, placeholders, seed automático e ausência de confirmação de backup externo, firewall, rotação de SSH e rotação de segredos. As confirmações só devem ser marcadas depois que cada procedimento tiver sido executado e evidenciado.

## Perfil de produção HTTPS

O arquivo `deploy/docker/docker-compose.production.yml` substitui as portas de apresentação por `80` e `443`. O Nginx termina TLS, redireciona HTTP para HTTPS e encaminha os três hosts para os serviços internos. O `TRUST_PROXY=true` é obrigatório porque o Nginx remove e reescreve os cabeçalhos de encaminhamento antes de entregar a requisição à API.

Antes do go-live:

1. Aponte três hosts DNS distintos para a VPS e emita um certificado que cubra `NGINX_LANDING_HOST`, `NGINX_CRM_HOST` e `NGINX_API_HOST`.
2. Copie `fullchain.pem` e `privkey.pem` para `TLS_CERT_DIR` na VPS; mantenha a chave privada com `chmod 600`. Não os versione.
3. Configure `PUBLIC_LANDING_URL`, `PUBLIC_CRM_URL` e `PUBLIC_API_URL` com `https://` e os mesmos hosts definidos em `NGINX_*_HOST`.
4. Defina `DEPLOYMENT_STAGE=production`, `COOKIE_SECURE=true`, `ENABLE_HSTS=true`, `SEED_ON_START=false` e `COMPOSE_FILE=docker-compose.yml:deploy/docker/docker-compose.production.yml`.
5. Só após firewall restritivo, rotação do acesso SSH/root, rotação dos segredos e backup externo com restore isolado, marque as quatro confirmações de produção como `true`.

Valide e suba usando os dois arquivos, sem remover volumes:

```bash
cd /opt/viviani-crm
sh deploy/vps/preflight.sh
docker compose --env-file deploy/vps/.env -f docker-compose.yml -f deploy/docker/docker-compose.production.yml config >/dev/null
docker compose --env-file deploy/vps/.env -f docker-compose.yml -f deploy/docker/docker-compose.production.yml up -d --build --force-recreate api crm landing nginx
docker compose --env-file deploy/vps/.env -f docker-compose.yml -f deploy/docker/docker-compose.production.yml ps
```

O preflight precisa passar antes do `up`. Ele impede, entre outras coisas, que o Compose base seja usado por engano e reabra `3001` e `4000` publicamente.

## Atualização sem perder dados

Preserve `deploy/vps/.env` e os volumes. Atualize somente o código e execute:

```bash
cd /opt/viviani-crm
docker compose --env-file deploy/vps/.env config
docker compose --env-file deploy/vps/.env up -d --build --force-recreate api crm landing nginx
docker compose --env-file deploy/vps/.env ps
docker compose --env-file deploy/vps/.env logs --tail=100 api crm landing nginx
sh deploy/vps/operational-smoke.sh
```

Não use `down -v`: isso remove os volumes do banco, Redis e uploads. O `operational-smoke.sh` deve ser executado depois de cada deploy ou reload; ele verifica os seis healthchecks, `nginx -t`, endpoints públicos e a ausência de portas próprias em API/CRM.

## Validação operacional

```bash
curl -fsS http://SEU_IP/health
curl -fsS http://SEU_IP:4000/health/ready
curl -fsS http://SEU_IP:3001/login
docker compose --env-file deploy/vps/.env ps
```

O painel de Administração mostra banco, Redis, uploads, Google Calendar, SMTP e WhatsApp com estado separado. Uma integração só é considerada pronta quando o painel indicar conexão e o fluxo real tiver sido testado.

## Integrações externas opcionais

### Google Calendar e Google Business

Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `GOOGLE_CALENDAR_ID`. No Google Cloud Console, cadastre exatamente:

```text
http://SEU_IP:4000/api/v1/auth/google/callback
```

Depois, no CRM, abra Administração, autorize a conta Google e valide a criação, alteração e cancelamento de um agendamento.

### SMTP

O SMTP pode ser definido no `.env` (`SMTP_*`, `EMAIL_FROM`, `ADMIN_EMAIL`) ou salvo pelo painel de Administração. Depois de salvar, use `Enviar e-mail de teste`. O teste só é sucesso quando a mensagem chega ao destinatário.

### WhatsApp Business

Preencha `WHATSAPP_APP_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` e `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Configure na Meta o callback:

```text
http://SEU_IP:4000/api/v1/whatsapp/webhook
```

O Embedded Signup exige HTTPS em produção. Sem domínio e certificado, o canal oficial não deve ser declarado conectado.

## Backup e recuperação

Antes de qualquer operação destrutiva, faça dump do PostgreSQL e cópia dos uploads para fora da VPS. Para automatizar a cópia, monte um storage externo já existente e defina `BACKUP_EXTERNAL_DIR` no `.env`; o `backup.sh` gera três artefatos, aplica permissões restritivas e valida o checksum também no destino externo:

```bash
cd /opt/viviani-crm
BACKUP_EXTERNAL_DIR=/mnt/viviani-backups sh deploy/vps/backup.sh
```

O storage externo deve ser cifrado, restrito aos operadores e possuir retenção independente. O script não transforma um diretório comum da mesma VPS em backup externo e o preflight rejeita o diretório local ou seus filhos.

O procedimento de recuperação valida o manifesto SHA-256 antes de parar serviços, restaura o dump e os arquivos, sobe a Compose e valida `/health/ready`, login e leitura dos leads. `restore.sh` é destrutivo e deve ser usado somente após confirmação explícita e, preferencialmente, em clone/ambiente isolado:

```bash
cd /opt/viviani-crm
CONFIRM_RESTORE=YES sh deploy/vps/restore.sh /opt/viviani-crm/backups/db-<timestamp>.sql.gz /opt/viviani-crm/backups/uploads-<timestamp>.tar.gz
```

Para produção, instale o timer versionado depois de montar o storage cifrado e revisar permissões:

```bash
sudo install -m 0644 deploy/vps/viviani-crm-backup.service /etc/systemd/system/viviani-crm-backup.service
sudo install -m 0644 deploy/vps/viviani-crm-backup.timer /etc/systemd/system/viviani-crm-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now viviani-crm-backup.timer
sudo systemctl start viviani-crm-backup.service
sudo systemctl status viviani-crm-backup.timer viviani-crm-backup.service
```

Só depois de comprovar uma execução, a cifra do storage, a retenção, a cópia externa e um restore isolado, marque `BACKUP_EXTERNAL_CONFIRMED=true`, `BACKUP_EXTERNAL_ENCRYPTED_CONFIRMED=true` e `BACKUP_SCHEDULE_CONFIRMED=true`. Esses gates continuam falsos na VPS ativa.

## HTTPS e domínio

O acesso atual por IP usa HTTP para permitir a apresentação. Antes de uso real:

- apontar um domínio para a VPS;
- configurar certificado TLS no Nginx;
- atualizar `PUBLIC_LANDING_URL`, `PUBLIC_CRM_URL`, `PUBLIC_API_URL`, `GOOGLE_REDIRECT_URI` e CORS;
- definir `COOKIE_SECURE=true` e `ENABLE_HSTS=true`;
- repetir os fluxos de login, OAuth, SMTP e webhook.

Até essa etapa, o ambiente é de apresentação/homologação e não deve receber dados reais. A instância atual continua nesse estágio; o perfil de produção está preparado e protegido por gates, mas não deve ser ativado sem domínio, certificado, firewall, rotação, backup/restore e validação dos fluxos reais.
