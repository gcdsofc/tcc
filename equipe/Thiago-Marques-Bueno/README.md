# Guia do Thiago Marques Bueno

**Responsabilidade principal:** Desenvolvedor Backend e Integrações do GarageOps.

Leia primeiro a [visão completa e as regras de acesso](../../README.md). A decisão do grupo exige um bloqueio explícito: o papel de administrador da plataforma GarageOps não consulta conteúdo operacional dos tenants, nem por tela nem por API.

Este guia orienta a implementação das regras do OficinaPro no servidor e a comunicação entre serviços. O backend é responsável por validar identidade, oficina ativa, papel, dados e transições de negócio; a interface não pode ser a única barreira de segurança.

## Sua parte no projeto

- Definir e implementar contratos HTTP/eventos dos serviços, em conjunto com a equipe.
- Implementar regras de negócio de clientes, ordens, orçamentos, conversa e execução conforme as tarefas priorizadas.
- Validar autorização por usuário, papel e tenant em todas as operações.
- Integrar serviços por APIs/contratos definidos, sem consultar diretamente o banco de outro serviço.
- Devolver erros úteis e consistentes para a interface.
- Escrever testes para fluxos e regras críticas, incluindo acessos que devem ser negados.
- Documentar mudanças de contrato e riscos de integração.
- Implementar autorização distinta para administrador da plataforma e papéis vinculados às oficinas.

## Documentos e exigências do professor sob sua responsabilidade

| Item | O que o professor pede | Situação |
|---|---|---|
| Documento 06 — C4 Model | Três níveis obrigatórios: Contexto, Contêineres e Componentes | A fazer (6º encontro) |
| C1 — Microsserviços | Arquitetura de microsserviços de verdade, não um monólito dividido em pastas | Base no MVP (identidade, clientes/veículos e ordens com bancos separados) |
| C2 — API externa | Pelo menos uma API externa relevante para a regra de negócio | ViaCEP (cliente) e FIPE (veículo) funcionando no MVP, passando pelo serviço de clientes e com preenchimento manual se a API falhar |
| C8 — métricas | Serviços expondo métricas para o Prometheus | A fazer no 5º semestre (`/metrics` em cada serviço) |

Como fazer o Documento 06:

1. Copie `templates/06-c4-model.md` para `Projetos/OficinaPro/06-c4-model.md`.
2. **Contexto:** o OficinaPro no centro; equipe da oficina, cliente e administrador da plataforma como pessoas; ViaCEP, FIPE e o canal de envio de código como sistemas externos.
3. **Contêineres:** a aplicação web, cada microsserviço com o seu banco PostgreSQL, o RabbitMQ e a stack Prometheus/Grafana. Mostre que nenhum serviço acessa o banco de outro.
4. **Componentes:** detalhe pelo menos o Auth Service e o Work Order Service (controllers, verificação de tenant e papel, regras de orçamento, cliente HTTP para outros serviços).
5. Use os mesmos nomes de serviço dos Documentos 03, 04 e 05. Peça revisão ao Matheus (contêiner web) e ao Gabriel (infraestrutura).
6. Os ADRs de backend e comunicação entre serviços (ADR-001 e ADR-003 do template 07) são seus; entregue o texto para o Matheus consolidar.

## Antes de começar uma tarefa

1. Leia o requisito e os critérios de aceite aprovados.
2. Confirme com Eloisa o comportamento de negócio e com Gabriel o modelo/dados envolvidos.
3. Identifique qual serviço é dono dos dados e qual serviço apenas precisa consultá-los.
4. Escreva o contrato: método e rota, autenticação, papel permitido, entrada, saída e erros esperados.
5. Defina o que deve acontecer se a chamada for repetida ou uma integração estiver indisponível.
6. Só então implemente a regra e os testes.

## Regra central: o servidor deriva o escopo da sessão

O navegador nunca deve escolher livremente a oficina de uma operação enviando apenas um `tenant_id`. O servidor valida o token, recupera a oficina ativa e os papéis do vínculo e usa esse contexto nas consultas.

Em cada endpoint, verifique:

- a sessão é válida e não expirou;
- existe tenant ativo no contexto autenticado;
- o papel pode realizar a ação;
- cada cliente, veículo, ordem e versão pertence ao tenant ativo;
- a transição de estado é válida naquele momento;
- erros não revelam dados de outra oficina.

Para endpoints de administração da plataforma, não basta não definir `tenantId`: eles devem exigir o papel global de plataforma e retornar somente o cadastro das oficinas (nome, identificador, identidade visual (cor) e situação (ativa ou suspensa)), saúde global e métricas agregadas. A exclusão de uma oficina deve pedir a cada serviço que apague os próprios dados, sem devolvê-los ao console. Não crie endpoints de suporte para buscar cliente, veículo, diagnóstico, ordem, orçamento, mensagem ou pagamento.

## Exemplo de contrato: abrir ordem de serviço

Exemplo de contrato para discussão e implementação; a rota final deve seguir o padrão aprovado pelo grupo:

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "customerId": "uuid-do-perfil-local",
  "vehicleId": "uuid-do-veiculo",
  "problem": "Ruído ao frear"
}
```

Comportamento esperado:

1. O servidor extrai `userId`, `tenantId` e papéis do contexto autenticado.
2. Confirma que o papel permite abrir ordens, por exemplo administrador ou atendente, conforme matriz aprovada.
3. Consulta o serviço de clientes/veículos para validar que cliente e veículo existem no mesmo tenant e que o veículo pertence ao cliente informado.
4. Cria a ordem no estado inicial definido no domínio.
5. Retorna a ordem criada sem expor dados internos de outro tenant.

Exemplos de respostas a validar:

| Situação | Resultado esperado |
|---|---|
| Token ausente, inválido ou expirado | `401 Unauthorized` |
| Papel sem permissão | `403 Forbidden` |
| Cliente ou veículo inexistente no tenant ativo | Erro controlado, sem revelar dados de outro tenant |
| Payload inválido | `400 Bad Request`, com campos que precisam de correção |
| Serviço de clientes indisponível | Erro temporário controlado, sem criar ordem parcial |
| Solicitação válida | `201 Created`, com identificador e estado inicial |

## Exemplo de regra: enviar uma versão de orçamento

1. Autorize o papel que pode preparar orçamento.
2. Confirme que a ordem pertence ao tenant ativo e aceita uma nova proposta.
3. Valide cada item: tipo permitido (serviço ou peça digitada), descrição, quantidade e preço.
4. Calcule o total no servidor; não confie em total enviado pelo navegador.
5. Crie uma nova versão imutável em vez de sobrescrever uma versão que o cliente já viu.
6. Marque a nova versão como aguardando decisão e torne versões pendentes anteriores substituídas, se essa regra for mantida pelo grupo.
7. Registre autoria e data/hora.
8. Cubra com testes: total correto, item inválido rejeitado, versão anterior preservada, ordem de outro tenant inacessível e tentativa de executar antes da aprovação negada.

No MVP atual, não existe catálogo ou saldo interno de peças: a peça é descrita manualmente no orçamento. Não implemente baixa de estoque como parte deste escopo sem uma decisão nova do grupo.

## Integrações e limites entre serviços

- Documente quem é dono de cada entidade e quem pode alterá-la.
- Prefira contratos explícitos, com timeout e tratamento de erro, para chamadas síncronas necessárias ao fluxo.
- Para processamento assíncrono, documente nome do evento, produtor, consumidor, versão e estratégia de repetição.
- Use chave idempotente quando reprocessar a mesma operação puder criar duplicação.
- Não use uma transação de banco compartilhada entre serviços independentes.
- Não armazene tokens, códigos de convite, senhas ou segredos nos logs.
- Evite criar uma API/integrador externo sem requisito e decisão aprovada. As integrações aprovadas são ViaCEP (endereço) e FIPE (veículo). Pagamento online, inclusive em sandbox, ficou para o futuro; qualquer outra integração precisa de requisito e decisão aprovada.

## Entregas e contratos para integração

1. Publique rotas, esquemas de entrada e saída e erros no contrato OpenAPI versionado do projeto.
2. Identifique o serviço dono de cada regra e dado; se a mudança afetar mais de um domínio, combine o contrato antes de abrir PR.
3. Inclua exemplos reais de sucesso, validação, falta de permissão e tenant incorreto.
4. Avise Matheus quando a rota estiver disponível para a interface e Gabriel quando forem necessárias migrations, variáveis ou dependências locais.
5. Inclua testes de regra e autorização no mesmo PR do endpoint.
6. Não declare a tarefa integrada até que a UI consuma a rota e o fluxo seja reproduzido com os seeds das cinco oficinas.

### Contratos de exemplo para administração

O painel GarageOps pode receber indicadores técnicos agregados, por exemplo disponibilidade de serviços e contagem de erros por período. O contrato não deve incluir nomes de clientes, placas, textos de diagnóstico, itens de orçamento, conteúdo de mensagens ou valores detalhados de pagamentos. Já o administrador da oficina consulta e altera usuários somente com o tenant obtido da sessão e validado no backend.

## Organização sugerida de uma implementação

Adapte à estrutura real aprovada pelo grupo:

```text
src/
├── modules/
│   ├── identity/
│   ├── customers/
│   └── work-orders/
├── common/
│   ├── auth/
│   ├── tenant-context/
│   └── errors/
└── main.ts
```

O projeto-alvo planejado nos documentos usa Node.js, TypeScript e NestJS. O protótipo acadêmico exploratório usa Node.js/Express em JavaScript. Não misture decisões dos dois sem alinhar com o grupo; antes de adicionar dependências ou mudar a base, confirme a direção técnica do TCC.

## Checklist do Pull Request

- [ ] O critério de aceite está ligado à implementação.
- [ ] A autorização e o tenant são verificados no servidor.
- [ ] Dados relacionados são validados no tenant correto.
- [ ] Entradas e transições de estado são validadas.
- [ ] Erros não expõem dados ou segredos.
- [ ] Testes cobrem sucesso, falha e isolamento multi-tenant.
- [ ] Contrato da API/evento e documentação foram atualizados.
- [ ] A conta de administrador da plataforma não consegue acessar dados operacionais por nenhuma rota criada ou alterada.
- [ ] Nenhuma credencial real ou arquivo `.env` foi incluído.

## Definição de pronto para sua parte

O endpoint/integração tem contrato revisado, regra implementada no serviço dono dos dados, autorização validada no backend, testes reproduzíveis e documentação suficiente para Matheus integrar a interface e Gabriel verificar execução e pipeline.
