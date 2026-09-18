# Certificados TLS de produção

Este diretório é apenas um ponto de montagem documentado para a VPS. Os arquivos reais não pertencem ao repositório e são ignorados pelo Git.

Na VPS, coloque:

- `fullchain.pem`: cadeia completa do certificado que cobre os três hosts públicos;
- `privkey.pem`: chave privada correspondente, com permissão `600` e acesso somente ao operador/root.

O preflight de produção valida a existência e a leitura desses dois arquivos. Nunca copie chaves privadas para a máquina de desenvolvimento, para o repositório ou para logs.
