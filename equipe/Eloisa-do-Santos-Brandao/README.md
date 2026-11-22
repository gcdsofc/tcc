# Guia da Eloisa do Santos Brandão

**Responsabilidade principal:** Product Owner e Analista de Requisitos do GarageOps.

Leia primeiro a [visão completa do sistema](../../README.md). As responsabilidades abaixo refletem a decisão aprovada pelo grupo: o administrador da plataforma não acessa o conteúdo operacional das oficinas; as permissões dos papéis da oficina são delimitadas ao tenant ativo.

Este guia ajuda a transformar as necessidades do OficinaPro em prioridades e critérios verificáveis. O trabalho desta função é manter o grupo alinhado sobre **qual problema será resolvido, para quem e como saberemos que a entrega atende ao combinado**.

## Sua parte no projeto

- Conversar com os integrantes e registrar necessidades reais do fluxo da oficina.
- Manter o backlog priorizado e compreensível para o grupo.
- Escrever requisitos funcionais e não funcionais com critérios de aceite verificáveis.
- Definir atores, regras de negócio, exceções e dependências sem prescrever detalhes técnicos desnecessários.
- Acompanhar se a implementação e os testes correspondem ao requisito aprovado.
- Manter a matriz de papéis alinhada às áreas da aplicação, inclusive a restrição de acesso do administrador da plataforma.
- Manter os documentos acadêmicos e este README consistentes quando o grupo aprovar uma mudança.

## Documentos e exigências do professor sob sua responsabilidade

| Item | O que o professor pede | Situação |
|---|---|---|
| Documentos 01 e 02 | Solicitação do sistema e requisitos priorizados | Entregues; você mantém atualizados quando o grupo aprovar mudança |
| Documento 08 — Planejamento de Sprints | Sprints com tarefas, responsável por tarefa e sprint de entrega, refletindo a metodologia ágil | A fazer (8º encontro) |
| C9 e C10 | 8 documentos completos e atualizados; encontros com evolução e 1 commit por integrante por semana | Acompanhar e avisar o grupo quando algo atrasar |

Como fazer o Documento 08:

1. Copie `templates/08-planejamento-sprints-tarefas.md` para `Projetos/OficinaPro/08-planejamento-sprints-tarefas.md`.
2. Monte o backlog a partir dos RFs do Documento 02, com prioridade e estimativa; cada história aponta o RF de origem.
3. Distribua as sprints até a banca do 5º semestre: MVP e documentos no 4º; deploy AWS com Terraform, CI/CD, monitoramento e cobertura ≥ 60% no 5º.
4. Toda tarefa precisa de responsável. Use a tabela "O que o professor exige e quem cuida" do README principal para não deixar critério sem dono.
5. Registre as cerimônias (planejamento, revisão, retrospectiva) e onde ficam as evidências, por exemplo o quadro de tarefas e as fichas de encontro.

## Passo a passo para trabalhar em uma demanda

1. **Entenda o problema antes da solução.** Converse com o grupo: quem sente a dificuldade, em que momento e qual consequência ela causa?
2. **Identifique o ator e o contexto.** Exemplo: cliente autenticado, dentro de uma ordem da oficina à qual está vinculado.
3. **Escreva a necessidade em linguagem de comportamento.** Prefira “o sistema deve permitir/impedir/registrar...” a nomes de telas ou tecnologias.
4. **Descreva o resultado verificável.** Um colega deve conseguir testar o aceite sem adivinhar o que você quis dizer.
5. **Inclua os casos importantes.** Considere dados inválidos, falta de permissão, ação repetida, conflito de estado e indisponibilidade de integração quando aplicável.
6. **Priorize com critério.** Alta quando bloqueia o fluxo principal, segurança/isolamento ou exigência obrigatória do TCC; média quando agrega valor mas não bloqueia o MVP; baixa para melhorias complementares. Não marque tudo como alta.
7. **Registre dependências e dúvidas.** Se o grupo ainda não decidiu algo, marque como pendente em vez de inventar uma regra.
8. **Valide com quem vai implementar e testar.** Backend, frontend e qualidade precisam interpretar a regra da mesma maneira.
9. **Acompanhe a entrega.** Revise o comportamento demonstrado contra os critérios de aceite e registre o resultado.
10. **Atualize a documentação.** Se houver mudança aprovada, atualize o requisito, fluxo ou diagrama afetado e anote a revisão.

## Entregas que você coordena

1. Backlog priorizado do MVP, com cada história ligada a um fluxo do atendimento.
2. Matriz de papéis com ações permitidas e negadas para administrador da plataforma, administrador da oficina, atendente, mecânico, financeiro e cliente.
3. Critérios de aceite que cubram o fluxo normal, erros, estados e limites entre oficinas.
4. Revisão das mudanças de negócio nos Documentos 01 e 02 do repositório acadêmico.
5. Validação funcional dos fluxos integrados e aceite do grupo antes de considerar uma história concluída.

### Matriz mínima de permissões a detalhar

| Papel | Necessidades que você transforma em histórias |
|---|---|
| Administrador da plataforma | Cadastrar, editar, suspender e excluir oficinas; ver o cadastro delas (nome, identificador, identidade visual (cor) e situação (ativa ou suspensa)), saúde global e métricas agregadas; não ver conteúdo operacional (clientes, veículos, diagnósticos, ordens, orçamentos, valores, mensagens ou pagamentos) |
| Administrador da oficina | Gerenciar usuários e papéis somente no tenant próprio; supervisionar a operação |
| Atendente | Cadastrar cliente/veículo e abrir ordem no tenant ativo |
| Mecânico | Diagnosticar e registrar serviços apenas após aprovação do orçamento vigente |
| Financeiro | Registrar pagamentos e consultar pendências necessárias ao fechamento |
| Cliente | Consultar seus vínculos, conversar e decidir sobre versões de orçamento próprias |

Detalhe exceções como atendente também exercer financeiro, se o grupo aprovar múltiplos papéis por vínculo. Até lá, marque essa combinação como questão aberta e não presuma permissão.

## Exemplo de requisito bem verificável

Exemplo ilustrativo para discutir com o grupo antes de tratar como decisão final:

> **Necessidade:** o cliente precisa decidir sobre a proposta que recebeu sem perder o histórico se pedir uma revisão.
>
> **Comportamento esperado:** quando o cliente autenticado aprovar ou recusar uma versão de orçamento de uma ordem que pode acessar, o sistema registra a decisão ligada àquela versão, a identidade do responsável e o instante da decisão. Se houver recusa, a ordem continua disponível para conversa e revisão. A versão anterior continua consultável.
>
> **Critérios de aceite:**
> 1. Um cliente sem vínculo com a ordem não consegue registrar uma decisão.
> 2. Uma versão que não está aguardando decisão não aceita uma nova decisão.
> 3. Uma decisão bem-sucedida informa no histórico quem decidiu, qual versão e quando.
> 4. Recusar o orçamento não apaga a ordem nem a conversa.
> 5. Uma revisão aparece como nova versão e não sobrescreve a anterior.

O exemplo mostra a forma de detalhar; IDs, prioridades e redação oficial devem seguir o documento de requisitos aprovado.

## Exemplo adicional: isolamento do administrador da plataforma

> **História:** como administrador da plataforma GarageOps, quero cadastrar e manter as oficinas e acompanhar a disponibilidade técnica do SaaS sem visualizar os dados operacionais delas.
>
> **Aceite:** o console permite cadastrar, editar, suspender e excluir oficinas e mostra o cadastro delas (nome, identificador, identidade visual (cor) e situação (ativa ou suspensa)), saúde global, falhas técnicas e métricas agregadas; tentativas de consultar clientes, veículos, diagnósticos, ordens, orçamentos, mensagens ou pagamentos são negadas pela API e não retornam conteúdo. O administrador da oficina continua acessando apenas o próprio tenant.

Este exemplo está alinhado à decisão aprovada. Use-o para detalhar critérios e casos negativos, sem acrescentar uma função de suporte que leia os dados do tenant.

## O que conferir antes de considerar um requisito pronto

- O ator está identificado?
- O requisito descreve uma capacidade ou regra que pode ser observada?
- O critério de aceite explica o resultado, inclusive os casos de acesso negado?
- O nível de prioridade tem justificativa clara?
- Existe dependência de outra regra ou serviço?
- Há um termo ambíguo que o grupo precisa definir?
- O requisito conflita com o escopo atual, como estoque interno, app nativo ou landing page externa?
- A regra aparece de forma coerente nos diagramas e no fluxo do projeto?
- O administrador da plataforma está impedido de acessar conteúdo do tenant tanto na tela quanto nos critérios de autorização da API?

## Como organizar uma tarefa de produto

Para cada item do backlog, registre:

| Campo | O que escrever |
|---|---|
| Título | Resultado em poucas palavras |
| Problema/objetivo | Por que a tarefa existe |
| Ator | Quem inicia ou recebe o comportamento |
| Critérios de aceite | Condições observáveis de conclusão |
| Prioridade | Alta, média ou baixa com justificativa |
| Dependências | Regras, dados ou APIs necessários |
| Questões abertas | Decisões ainda não tomadas |
| Evidência | Link do PR, teste ou demonstração que comprova o aceite |

## Limites da responsabilidade

Você decide a prioridade do produto em conjunto com o grupo, mas não deve escolher arquitetura, formato do banco ou tecnologia sozinha. Também não deve ampliar o escopo por conta própria. Quando uma decisão técnica impactar o fluxo ou o prazo, leve opções e consequências para a conversa do grupo.

## Definição de pronto para sua parte

- O requisito está escrito no local acordado pelo grupo.
- Critérios positivos e negativos relevantes estão definidos.
- Prioridade e dependências estão justificadas.
- Dúvidas pendentes estão visíveis.
- Backend, frontend e qualidade conseguem explicar como validar o requisito.
- Documentos relacionados foram atualizados após aprovação de mudança.
