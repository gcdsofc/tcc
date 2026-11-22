# Retorno da revisão — base do backend (22/11/2026)

**Revisado por:** Gabriel
**Material revisado:** `parte-do-thiago.zip` (base NestJS + TypeScript, arquivos de 18/11/2026)
**Como foi verificado:** `npm install`, `npm test` e `npm run build` numa cópia limpa, além da leitura de todos os arquivos e da comparação com o [seu guia](README.md), com o [README do grupo](../../README.md) e com o MVP atual.

## Resumo

A base está bem pensada e segue as regras de segurança do projeto. O problema é que ela ainda cobre uma parte pequena do que está no seu guia, e alguns contratos não batem com o que o MVP já faz. O mais urgente não é código: é o **Documento 06 (C4 Model)**, que é entrega do 4º semestre.

## O que está bom

- Tecnologia de acordo com o planejado: NestJS + TypeScript.
- Toda rota é bloqueada por padrão e precisa declarar quem pode acessar (`@TenantEndpoint` / `@PlatformEndpoint`).
- A oficina ativa vem só do token verificado, nunca do body, da query ou do header.
- O administrador da plataforma é barrado nas rotas das oficinas.
- Os erros não vazam detalhes internos, e o health check não expõe dados.
- 11 testes unitários, todos passando, incluindo os casos de acesso negado.
- O README diz com clareza o que ainda não foi feito e o que depende do grupo.

## Correções necessárias (em ordem de prioridade)

### 1. O build não compila

`npm run build` falha:

```text
src/common/errors/api-exception.filter.ts(24,63): error TS2526: A 'this' type is available only in a non-static member of a class or interface.
```

Correção testada: usar o tipo do Express.

```ts
import type { Response } from 'express';
// ...
const response = http.getResponse<Response>();
```

### 2. Mensagens de erro genéricas demais

O filtro troca toda mensagem por um texto padrão. Com isso, a tela do Matheus nunca consegue mostrar algo como "Já existe um cliente com esse telefone nesta oficina.", e o seu guia pede erros úteis para a interface. Sugestão, já testada: criar uma exceção de negócio, com mensagem escrita pelo time, que o filtro deixa passar. O resto continua genérico.

```ts
// src/common/errors/business.exception.ts
export class BusinessException extends HttpException {
  constructor(readonly code: string, message: string, status: HttpStatus = HttpStatus.CONFLICT) {
    super(message, status);
  }
}

// no filtro
error: exception instanceof BusinessException ? exception.code : this.errorCode(status),
message: exception instanceof BusinessException ? exception.message : message,
```

Uso: `throw new BusinessException('CUSTOMER_PHONE_TAKEN', 'Já existe um cliente com esse telefone nesta oficina.')`.

Aproveite para registrar no log, sem dados pessoais, os erros 500. Hoje eles somem sem deixar rastro.

### 3. O formato do token não é o mesmo do serviço de identidade

| | Sua base espera | O serviço de identidade do MVP emite |
|---|---|---|
| Oficina ativa | `activeTenantId` | `tenantId` |
| Tipo de sessão | `scope: 'tenant' \| 'platform'` | nenhum campo; a plataforma vem como `platform: true` |
| Emissor | não verifica | `iss: 'oficinapro-identity'` |
| Papel do administrador da oficina | `tenant_admin` | `owner` |

Do jeito que está, a sua base recusaria todo login feito pelo sistema. Proposta para combinarmos entre nós dois: manter o seu `scope` (é mais explícito), usar um único nome para a oficina ativa, **verificar o emissor** (`issuer` no `verifyAsync`) e adotar `tenant_admin` no sistema final. O MVP muda junto na migração. Quando fecharmos, registre o formato no ADR-003 e no contrato OpenAPI.

### 4. Regra do administrador da plataforma desatualizada

O seu `docs/contratos-e-decisoes.md` ainda diz que a plataforma vê só "informação técnica/agregada", com um "identificador opaco". Desde 20/11 a regra é outra: o administrador da plataforma **cadastra, edita, suspende e exclui oficinas** e vê o cadastro delas (nome, identificador, cor e situação). Ele continua sem acesso a clientes, veículos, ordens, orçamentos, valores, mensagens e pagamentos. Veja o seu guia atualizado e o RF-039 do Documento 02. No MVP, isso já funciona nas rotas `/platform/tenants`.

### 5. Reprodutibilidade

- Inclua o `package-lock.json`. Sem ele, cada pessoa instala versões diferentes.
- Inclua um `.env.example` com `JWT_SECRET` de exemplo (sem segredo real) e `PORT`.
- O Dockerfile e a entrada no Docker Compose ficam comigo, mas preciso do serviço rodando com `npm run build` + `node dist/main.js`.

## O que ainda falta da sua responsabilidade

| Item | Prazo | Situação |
|---|---|---|
| **Documento 06 — C4 Model** (Contexto, Contêineres e Componentes) | 6º encontro, 4º semestre | Não iniciado. **Prioridade 1** |
| Textos do ADR-001 (backend) e ADR-003 (comunicação entre serviços) para o Matheus consolidar no Doc 07 | 7º encontro | Não iniciados |
| Contrato OpenAPI das rotas | Antes dos módulos de negócio | Não iniciado |
| Módulos de clientes/veículos e de ordens/orçamentos | 5º semestre | Hoje só existem no MVP (Express); a lógica pode ser aproveitada de lá |
| ViaCEP e FIPE (critério C2) | 5º semestre | Já funcionam no MVP (`services/customers`); precisam ser levados para o NestJS |
| `/metrics` para o Prometheus (critério C8) | 5º semestre | Não iniciado |
| Testes de rota com Supertest (guard + policy + filtro juntos) | Junto de cada módulo | Hoje só há testes unitários |

O passo a passo do Documento 06 está no seu guia, na seção "Documentos e exigências do professor sob sua responsabilidade". Use os mesmos nomes de serviço dos Documentos 03 e 04.

## Decisão para levarmos ao grupo

O MVP está em JavaScript + Express, e a sua base está em NestJS + TypeScript, como manda a documentação. Precisamos decidir **quando e como migrar o MVP para a sua base**, e quem faz cada parte, para não termos dois backends andando em paralelo. Minha sugestão: a sua base vira o padrão de cada microsserviço, e migramos um serviço por vez (identidade, depois clientes/veículos, depois ordens), sempre com os testes do MVP passando.

## Próximos passos sugeridos

1. Corrigir o build e o filtro de erros (itens 1 e 2): coisa de minutos.
2. Começar o Documento 06.
3. Marcar uma conversa comigo para fechar o formato do token e o nome dos papéis (item 3).
4. Atualizar o `docs/contratos-e-decisoes.md` com a regra nova da plataforma (item 4).
