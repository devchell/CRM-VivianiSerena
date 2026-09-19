# Pastas de clientes

## Fluxo

- `POST /api/v1/client-folders/clients` cria um cliente manualmente ou copia os dados de um lead ativo sem obrigar a criação imediata de uma pasta.
- `PATCH /api/v1/client-folders/clients/:id` edita os dados principais do cliente; `GET /api/v1/client-folders/clients/:id` devolve o cliente com todas as pastas e timelines.
- `POST /api/v1/client-folders/clients/:clientId/folders` cria uma pasta de atendimento com nome, data, serviço e notas. O endpoint legado `POST /api/v1/client-folders` continua aceito e cria a estrutura equivalente.
- `PATCH /api/v1/client-folders/clients/:clientId/folders/reorder` persiste a ordem definida pelo arraste nativo do CRM.
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

Migration base: `apps/api/prisma/migrations/20260918100000_client_folders/migration.sql`.

Migration de organização: `apps/api/prisma/migrations/20260919110000_clients_and_folder_order/migration.sql`. Ela cria `clients`, associa cada pasta a um cliente e adiciona nome, data e posição da pasta. A migração preserva as colunas legadas de contato para compatibilidade de dados e grava o novo cliente como fonte operacional.

Rollbacks controlados existem ao lado de cada migration. O rollback de organização copia os dados do cliente de volta para as colunas legadas e remove a tabela `clients`; deve ser executado somente após backup e janela de manutenção.
