# OficinaPro — MVP GarageOps

MVP demonstrativo de uma plataforma web SaaS multi-tenant para oficinas mecânicas. O backend tem três microsserviços em **NestJS + TypeScript**: identidade/oficinas, clientes/veículos e ordens/orçamentos. Cada serviço tem o próprio banco PostgreSQL e a própria imagem Docker. A interface é React + Vite, e o navegador acessa tudo por uma URL local única.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `backend/libs/common` | Código comum dos serviços: token (`scope` account/tenant/platform), guardas de acesso por papel, erros padronizados, banco e chamadas internas |
| `backend/apps/identity` | Login, escolha de oficina, convites de cliente e console da plataforma |
| `backend/apps/customers` | Clientes, veículos e integrações externas (ViaCEP e FIPE) |
| `backend/apps/workorders` | Ordens, diagnóstico, orçamento versionado, decisão, conversa, execução e pagamentos |
| `web` | Interface React |
| `infra` | nginx (porta única, bloqueia `/internal/`) e criação dos três bancos |
| `scripts` | Testes de integração contra o ambiente rodando (`smoke` e `platform-check`) |

### Contrato de acesso

- O serviço de identidade é o único que emite tokens (HS256, emissor `garageops-identity`, validade de 8 horas). Os outros só verificam.
- `scope: account` é a conta logada sem oficina; `scope: tenant` traz `activeTenantId` e os papéis daquele vínculo; `scope: platform` é o administrador da plataforma, sem oficina.
- Toda rota precisa declarar quem pode acessar (`@TenantEndpoint`, `@AccountEndpoint`, `@PlatformEndpoint`, `@Public`). Rota sem declaração é negada.
- Papéis de oficina: `tenant_admin`, `attendant`, `mechanic`, `finance` e `customer`.
- Erros seguem o formato `{ statusCode, error, message }`. Só mensagens de regra de negócio chegam à tela; o resto é genérico e erros 500 vão para o log do serviço.

## O que funciona neste MVP

- Login GarageOps com identidade única, atalhos de contas demonstrativas e seleção de cada oficina autorizada.
- Cinco oficinas de demonstração com equipes e papéis diferentes.
- Cadastros locais de clientes e veículos, ordem de serviço, diagnóstico e orçamento versionado.
- Peças podem ser digitadas manualmente como itens de orçamento. Não há módulo, catálogo ou saldo de estoque.
- Aprovação/recusa de cada versão do orçamento; conversa textual associada à ordem; encerramento por recusa sem excluir o histórico.
- Interface demonstrativa com atalhos por oficina e papel (administração, atendimento, mecânica, financeiro e cliente).
- Execução bloqueada até aprovação do orçamento vigente; conclusão e registro manual de pagamentos.
- Convite de cliente por telefone, link de uso único com expiração e código temporário; link não concede acesso por si só.
- Histórico visível somente nos vínculos autorizados do cliente; dados de cada oficina permanecem isolados.
- Integração externa com ViaCEP: no cadastro do cliente, o CEP preenche rua, bairro, cidade e UF (a consulta passa pelo serviço de clientes); se o CEP não existir ou a API falhar, o endereço é digitado manualmente.
- Integração externa com a tabela FIPE: no cadastro do veículo, marca e modelo são escolhidos em listas com busca e o ano em uma lista; o sistema guarda o código FIPE e mostra o valor de referência. A consulta passa pelo serviço de clientes, com cache de 24 horas por causa do limite diário da API pública. Se a FIPE falhar ou o veículo não constar, há preenchimento manual.
- Pagamento feito no local e registrado pelo financeiro; pagamento online por provedor fica como evolução futura.
- Gestão da equipe pelo administrador da oficina (página **Equipe**): cadastra membros com papel de administrador, atendente, mecânico ou financeiro, troca o papel e desativa/reativa o acesso, só na própria oficina. Se o e-mail já tem conta GarageOps, a conta é reaproveitada. O administrador não altera o próprio acesso e a oficina nunca fica sem administrador ativo. Essas rotas e as de convite conferem o papel no banco a cada chamada, então quem é rebaixado ou desativado perde o poder na hora.
- Console do administrador da plataforma: cadastra, edita, suspende e exclui oficinas. Ele vê apenas o cadastro de cada oficina (nome, identificador, cor, status) e contagens de contas; os serviços de clientes e ordens recusam qualquer pedido dessa conta.
- Tela de entrada em tela cheia, sem rolagem no desktop, com fundo temático de oficina.

## Executar localmente

1. Instale Docker Desktop e aguarde o mecanismo Docker ficar pronto.
2. Copie `.env.example` para `.env` e troque os segredos locais.
3. Na pasta do projeto, execute `docker compose up --build`.
4. Acesse `http://localhost:8080`.

O primeiro início baixa imagens e dependências, compila os três serviços (uma imagem para cada), cria os três bancos e carrega os dados fictícios. Num banco que já tinha dados da versão anterior em Express, os serviços atualizam o esquema sozinhos e convertem o papel antigo `owner` em `tenant_admin`. Para parar, use `docker compose down`. Para apagar e recriar os dados de demonstração do PostgreSQL, use `docker compose down -v`.

## Contas de demonstração

Todas as contas abaixo usam inicialmente a senha `GarageOps2026!`. Troque-a antes de qualquer uso fora de uma demonstração local.

| Conta | E-mail | Vínculos/papel |
|---|---|---|
| Administrador da plataforma | `plataforma@garageops.local` | Nenhuma oficina; acessa só o console da plataforma |
| Ana Cliente | `ana@cliente.demo.local` | Garagem Central (A), Horizonte (B) e Torque (C) |
| Bruno Cliente | `bruno@cliente.demo.local` | Todas as cinco oficinas |
| Carla Cliente | `carla@cliente.demo.local` | Horizonte |
| Administradores | `admin1@demo.garageops.local` a `admin5@demo.garageops.local` | Um por oficina, papel de administrador |
| Mecânico Garagem Central | `mecanico.a@demo.garageops.local` | Garagem Central |
| Atendente Garagem Central | `atendente.a@demo.garageops.local` | Garagem Central |
| Financeiro Garagem Central | `financeiro.a@demo.garageops.local` | Garagem Central |
| Equipe Horizonte | `atendente.h@demo.garageops.local`, `mecanico.h@demo.garageops.local`, `mecanico.h2@demo.garageops.local`, `financeiro.b@demo.garageops.local` | Horizonte |
| Equipe Torque | `atendente.t@demo.garageops.local`, `mecanico.t1@demo.garageops.local` a `mecanico.t6@demo.garageops.local`, `financeiro.c@demo.garageops.local` | Torque |
| Equipe Box 12 | `atendente.b1@demo.garageops.local`, `atendente.b2@demo.garageops.local`, `mecanico.box@demo.garageops.local`, `financeiro.d@demo.garageops.local` | Box 12 |
| Equipe Rota Auto Center | `atendente.r1@demo.garageops.local`, `atendente.r2@demo.garageops.local`, `mecanico.r1@demo.garageops.local` a `mecanico.r4@demo.garageops.local`, `financeiro.e@demo.garageops.local` | Rota Auto Center |

No ambiente Docker local, o código do convite aparece para a demonstração. Em produção, é necessário integrar um provedor de SMS e remover a exposição do código da resposta da API.

## Roteiro de demonstração

1. Na tela de entrada, selecione um perfil dentro do grupo da oficina. Todas as contas de demonstração usam a mesma senha descrita acima.
2. Entre como Ana; confirme que aparecem Garagem Central (A), Horizonte (B) e Torque (C). A conta usa uma identidade só e escolhe a oficina antes de ver os dados dela.
3. Saia e entre como Bruno; confirme que aparecem as cinco oficinas.
4. Abra uma oficina e verifique nome, identidade visual e papel daquela conta.
5. Como administrador ou atendente, abra uma ordem para um cliente e veículo da oficina.
6. Entre como mecânico e registre o diagnóstico. Monte o orçamento com campos separados para tipo, descrição, quantidade e preço unitário; confira o total antes de enviar.
7. Entre como Ana, escolha a oficina B e abra o atendimento. Recuse o orçamento pelo formulário dentro da tela, envie uma mensagem e aguarde a resposta do mecânico B.
8. Volte como mecânico, responda na conversa e envie uma nova versão do orçamento; a anterior continua registrada no histórico.
9. Aprove a nova versão como cliente; registre a execução como mecânico, marque o veículo pronto e registre o pagamento/encerramento como financeiro ou administrador.
10. Como administrador ou atendente, cadastre um cliente informando o CEP (ViaCEP preenche o endereço) e um veículo escolhendo marca, modelo e ano na tabela FIPE.
11. Como administrador da Garagem Central, abra **Equipe**, cadastre um mecânico com senha inicial, entre com ele em outra janela, troque o papel para financeiro e depois desative: a oficina some da lista dele.
12. Entre como administrador da plataforma; cadastre uma oficina com um administrador novo, edite a cor, suspenda (ela some da lista de quem tem vínculo) e reative. Exclua digitando o identificador para confirmar. Tente chamar `/api/orders/orders` ou `/api/customers/customers` com o token dessa conta: a API recusa.
13. Tente abrir uma ordem de outra oficina por URL/API usando uma conta sem vínculo; o serviço deve negar a consulta.
14. Gere um convite para um cliente de demonstração e mostre que o link isolado não apresenta dados; só depois do código aparecem o nome e o e-mail cadastrados pela oficina, sem edição. Tente convidar o Bruno na Rota Auto Center: o sistema avisa que ele já tem acesso.

## Verificações

- `npm run build` compila a interface web e os três serviços.
- `npm test` executa os testes do backend (Jest + Supertest): token e políticas de acesso por HTTP, filtro de erros, regras de orçamento, pagamento, CEP e FIPE.
- `npm run test:cov` mostra a cobertura. Hoje está em torno de 25%, porque os controllers dependem do banco e são verificados pelos testes de integração abaixo; a meta de 60% do professor depende de testes de integração com banco de teste.
- `npm run smoke` executa o roteiro de integração contra o ambiente Docker iniciado.
- `npm run team-check` verifica a equipe: cadastro, conta reaproveitada, troca de papel, desativação, proteção do último administrador, administrador rebaixado perdendo acesso na hora e isolamento entre oficinas (usa uma oficina temporária e a exclui no fim).
- `npm run platform-check` verifica o console da plataforma: CRUD de oficinas, suspensão, exclusão com limpeza dos dados nos três serviços e negativa de acesso a dados operacionais.

O fluxo de integração depende dos containers PostgreSQL e dos três serviços em execução. Para testar num banco limpo sem mexer nos seus dados, suba uma segunda cópia em outra porta: `WEB_PORT=8081 docker compose -p garageops-test up --build -d`, rode `APP_URL=http://localhost:8081 npm run smoke` e depois remova com `docker compose -p garageops-test down -v`. Dados de teste são fictícios; credenciais, segredos padrão e entrega local de códigos não são adequados para produção.

## Limites conhecidos

Este é um MVP acadêmico de demonstração, não uma implantação pronta para clientes reais. Quem já estava com uma oficina aberta continua com acesso por até 8 horas depois que ela é suspensa ou excluída, até o token da sessão expirar; o sistema final deve revogar sessões ou consultar a situação do tenant a cada chamada. Ainda requer revisão de segurança, gestão de segredos, recuperação de conta, configuração de envio real de SMS, política de privacidade/retenção, monitoração, cobertura ampliada, CI/CD e infraestrutura cloud com Terraform. O projeto não inclui assinatura comercial SaaS, estoque, landing page nem aplicativo nativo.
