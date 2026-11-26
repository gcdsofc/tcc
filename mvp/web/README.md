# OficinaPro — Interface web (GarageOps)

Interface única em **React + TypeScript** (Vite) do OficinaPro. Cobre os seis perfis
(administrador da plataforma, administrador da oficina, atendente, mecânico, financeiro e
cliente) em uma só aplicação, com a navegação e as ações montadas conforme o papel ativo.

Esta versão substitui o protótipo exploratório (que era um único `main.jsx` em JavaScript).
Os contratos de API (rotas, payloads, formato do token) foram mantidos, então ela conversa
com o mesmo backend; a migração para NestJS preservou rotas e respostas.

## Como rodar

### Com Docker (recomendado — sobe tudo junto)

Na pasta `mvp/` (um nível acima):

```bash
docker compose up --build
```

Depois abra <http://localhost:8080>. O container `web` builda esta interface e serve os
estáticos pelo nginx, que também faz proxy de `/api/*` para os microsserviços
(ver `infra/nginx/default.conf`). Todas as contas de demonstração usam a senha
`GarageOps2026!`; a tela de login traz um seletor de perfis.

### Local, só a interface (com os serviços rodando à parte)

```bash
npm install
npm run dev
```

O Vite sobe em <http://localhost:5173> e faz proxy de `/api/identity`, `/api/customers` e
`/api/orders` para `localhost:3001/3002/3003` (ver `vite.config.ts`).

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Vite). |
| `npm run build` | Checagem de tipos (`tsc -b`) + build de produção em `dist/`. |
| `npm run preview` | Serve o `dist/` localmente para conferência. |
| `npm run lint` | Só a checagem de tipos. |
| `npm test` | Testes (Vitest + Testing Library). |

## Estrutura

```
src/
├── main.tsx                 # ponto de entrada
├── App.tsx                  # roteamento por sessão/papel
├── styles/global.css        # design system (identidade GarageOps)
├── types/api.ts             # contratos da API (tipos)
├── services/                # cliente HTTP + um módulo por serviço
│   ├── http.ts              # fetch central, ApiError, token
│   ├── identity.ts          # auth, oficinas, convites, equipe, plataforma
│   ├── customers.ts         # clientes, veículos, ViaCEP, FIPE
│   └── workorders.ts        # ordens, orçamentos, decisões, conversa, pagamentos
├── app/                     # estado e regras de aplicação
│   ├── session.tsx          # sessão (token/usuário/oficina), persistência, validação
│   ├── tenant-data.tsx      # dados da oficina ativa (ordens, clientes, veículos)
│   ├── permissions.ts       # capacidades derivadas dos papéis
│   ├── format.ts            # rótulos e formatadores (moeda, datas, status)
│   ├── hooks.ts             # useAsync (ações) e useResource (carregamento)
│   └── Workspace.tsx        # navegação + páginas da oficina
├── components/              # UI reutilizável (AppShell, Icon, blocos)
└── features/
    ├── access/              # login, seleção de oficina, convites
    ├── customers/           # clientes
    ├── vehicles/            # veículos (seletor FIPE)
    ├── work-orders/         # painel e detalhe da ordem
    ├── team/                # equipe da oficina
    ├── invites/             # convite de cliente
    └── platform/            # console do administrador da plataforma
```

## Decisões que guiaram a interface (ver Documento 07 — ADR)

- **Autorização é do servidor; a interface é reflexo.** Esconder um botão melhora a
  experiência, mas não protege nada. Toda tela trata resposta `403` e nunca usa dado do
  navegador como prova de permissão (ADR-009).
- **Oficina ativa sempre explícita.** Uma conta pode ter vínculo com várias oficinas; a
  interface deixa visível qual está ativa e não mistura dados de oficinas diferentes (ADR-007).
- **Console da plataforma sem dados operacionais.** O administrador da plataforma só vê
  cadastro de oficinas e contagens; nenhuma tela de cliente, ordem ou valor (ADR-010).
- **Orçamento versionado.** Cada revisão é uma versão; só a versão vigente aprovada autoriza
  execução; recusar não apaga a ordem (ADR-011).
- **Peças como item manual** do orçamento, sem módulo de estoque (ADR-012).
- **Convite traz nome e e-mail do cadastro da oficina**, em somente leitura (ADR-013).
- **Pagamento registrado no local**; não há pagamento online (ADR-014).

## Estados tratados

Carregando, vazio, sucesso, erro de validação, acesso negado (`403`), sessão expirada
(`401`) e servidor fora do ar (`status 0`, "nada foi salvo"). Os formulários têm validação
no cliente, mas a autoridade é sempre o backend.

## Testes

`npm test` cobre, com Vitest + Testing Library: as capacidades por papel, o tratamento de
erro do cliente HTTP, a validação do formulário de orçamento, os hooks de ação, os
componentes de UI e um teste de fumaça que monta o app inteiro. O fluxo ponta a ponta
(com os três serviços e o banco) é validado rodando `docker compose up --build`.
