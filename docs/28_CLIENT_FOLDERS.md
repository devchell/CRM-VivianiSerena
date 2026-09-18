# Pastas de clientes

## Fluxo

- `POST /api/v1/client-folders` cria uma pasta manualmente ou copia os dados de um lead ativo.
- `POST /api/v1/client-folders/:id/media` recebe JPEG/PNG/WebP, valida o conteúdo com `sharp`, preserva o original em storage privado e cria um WebP de leitura com qualidade 90, rotação EXIF e limite de 2400 px.
- `GET /api/v1/client-folders/:id/media/:mediaId` serve o derivado somente com autenticação. O CRM acessa essa rota pelo proxy autenticado `/api/client-folders/media/...`.
- `GET /api/v1/client-folders/public` e `/public/:id/media/:mediaId` retornam somente pastas publicadas com consentimento registrado; notas internas e chaves de storage nunca são públicas.
- O limite é de 100 imagens por pasta. A criação usa lock da linha da pasta para manter o limite sob uploads concorrentes.

## Publicação

Publicação exige a permissão `editar-site.publish` e confirmação explícita de autorização. A pasta só aparece com ao menos uma imagem. Retirar o consentimento despublica a pasta imediatamente. O painel compacto em `Editar Site` é a fonte operacional para ligar/desligar a exposição; a tela `Clientes` concentra a gestão do conteúdo.

## Privacidade e operação

- Originais e derivados ficam em `PRIVATE_UPLOAD_DIR`, fora do diretório servido por `/uploads`.
- A anonimização LGPD do lead remove a publicação, apaga os metadados e remove os arquivos de mídia associados.
- O export de privacidade inclui metadados da pasta e da timeline.
- O backup de uploads inclui `uploads/` e `private-uploads/`. Não remover o volume Docker nem restaurar sem o checksum.

## Schema e reversão

Migration: `apps/api/prisma/migrations/20260918100000_client_folders/migration.sql`.

Rollback controlado: `apps/api/prisma/migrations/20260918100000_client_folders/rollback.sql`. Ele remove as tabelas, enum e RLS da feature; deve ser executado somente após backup e janela de manutenção.
