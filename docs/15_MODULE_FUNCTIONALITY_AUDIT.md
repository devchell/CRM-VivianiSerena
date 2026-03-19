# 15 Module Functionality Audit

## Perfis e acesso

### Admin
- acesso total a todos os modulos e acoes.

### Colaborador
- modulos possiveis:
  - `dashboard`
  - `leads`
  - `agenda`
  - `financeiro`
- recebe somente os modulos liberados pelo admin.

### Viewer
- modulos possiveis:
  - `dashboard`
  - `leads`
  - `agenda`
  - `financeiro`
- recebe somente os modulos liberados pelo admin;
- opera em modo somente leitura.

## Modulos do CRM

### Dashboard
- operacional
- disponivel para `Admin`, `Colaborador` e `Viewer` se liberado

### Leads
- operacional
- `Colaborador` pode operar
- `Viewer` apenas consulta

### Agenda
- operacional
- `Colaborador` pode operar
- `Viewer` apenas consulta

### Financeiro
- operacional
- `Colaborador` pode operar
- `Viewer` apenas consulta

### Editar Site
- operacional
- somente `Admin`

### Seguranca
- operacional
- somente `Admin`

### Colaboradores
- operacional
- somente `Admin`
- dividido em:
  - `Ativos`
  - `Inativos`

## Fluxo de colaboradores
- `Inativos`: ainda nao fizeram primeiro login; podem ser editados integralmente, reenviados ou removidos
- `Ativos`: ja acessaram; seguem fluxo normal de manutencao
