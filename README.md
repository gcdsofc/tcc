# OficinaPro — GarageOps

Plataforma web SaaS multi-tenant para organizar o atendimento e o serviço de oficinas mecânicas. Este repositório reúne a visão compartilhada do sistema e os guias de trabalho dos quatro integrantes do grupo.

> **Escopo em evolução:** este README registra as decisões atuais do grupo para o MVP. Mudanças de escopo ou regras de negócio devem ser acordadas pelo grupo e refletidas também nos documentos acadêmicos do repositório de documentação.

## O sistema em uma frase

O OficinaPro permite que várias oficinas usem a mesma plataforma e o mesmo endereço de acesso, enquanto cada oficina vê somente seus próprios usuários autorizados, clientes, veículos, ordens e pagamentos.

## Problema que o projeto aborda

Oficinas podem depender de papel, planilhas e conversas espalhadas para controlar o atendimento. Isso dificulta acompanhar o carro desde a entrada até a retirada, comprovar a aprovação do orçamento e preservar o histórico do que foi combinado e executado.

O OficinaPro organiza esse processo em uma aplicação: atendimento e equipe registram informações; o cliente acompanha a ordem e decide sobre o orçamento; a oficina registra a execução e o pagamento. As decisões importantes ficam vinculadas à ordem e podem ser consultadas depois.

## Como o SaaS será usado

- **Uma plataforma e um endereço de acesso:** todas as oficinas entram pela aplicação GarageOps.
- **Uma conta por pessoa:** a pessoa autentica uma vez e pode ter vínculos com uma ou mais oficinas.
- **Seleção da oficina ativa:** depois do login, a pessoa escolhe uma oficina para trabalhar. As permissões são específicas daquele vínculo.
- **Isolamento por oficina:** cada consulta e alteração deve ser autorizada no servidor e limitada à oficina ativa. Saber ou alterar um identificador na URL não concede acesso.
- **Identidade visual:** a tela de trabalho identifica a oficina selecionada. No MVP, a marca GarageOps continua sendo a identidade da plataforma; nome e cor da oficina podem diferenciá-la dentro do sistema.
- **Acesso do cliente:** o cliente usa sua conta GarageOps. A oficina cadastra o perfil local e envia um convite ao telefone registrado; o cliente confirma o código antes de ativar ou aceitar o vínculo.

Na visão completa do produto, o administrador também poderá gerenciar os vínculos da equipe. No protótipo acadêmico atual, os usuários internos são contas fictícias de demonstração; a gestão completa da equipe ainda não está implementada.

O cliente não precisa manter uma conta distinta para cada oficina. Sua identidade é única, mas cada oficina mantém seus próprios cadastros e atendimentos. Se a mesma pessoa levar carros a oficinas diferentes, os registros de cada local continuam separados e aparecem identificados pela oficina de origem.

## Papéis e permissões

As permissões abaixo são a referência de produto para o MVP. A implementação deve validar cada ação no backend, mesmo quando a interface já esconde o botão.

| Papel no vínculo com a oficina | Responsabilidades principais |
|---|---|
| Administrador da oficina | Configurar o espaço da oficina, gerenciar acessos e acompanhar o fluxo. Pode executar ações operacionais conforme a política definida para o MVP. |
| Atendente | Cadastrar clientes e veículos, abrir ordens, apoiar a comunicação e preparar informações do orçamento. |
| Mecânico | Registrar diagnóstico, propor serviços, consultar o orçamento aprovado e registrar os serviços executados. |
| Financeiro | Registrar pagamentos e acompanhar o saldo da ordem. |
| Cliente | Consultar seus veículos e ordens vinculados, conversar com a oficina e aprovar ou recusar cada versão do orçamento. |

Uma pessoa pode ter papéis diferentes em oficinas diferentes. Ser administrador em uma oficina não concede nenhuma permissão em outra.

## Fluxo de atendimento do início ao fim

1. **A oficina prepara o acesso:** um administrador da oficina cria ou administra os vínculos da equipe. O cliente é cadastrado pela oficina antes de receber o convite.
2. **Atendimento registra a entrada:** seleciona ou cadastra o cliente, cadastra o veículo e abre uma ordem com o problema relatado.
3. **Mecânico avalia o veículo:** registra diagnóstico e os serviços recomendados.
4. **Oficina prepara o orçamento:** inclui serviços e, quando necessário, peças digitadas manualmente, com quantidade e valor. O sistema calcula o total e envia uma versão para análise do cliente.
5. **Cliente decide:** autenticado, aprova ou recusa aquela versão. A decisão guarda quem decidiu, a versão, a data e a hora; o motivo pode ser registrado quando informado.
6. **Se o cliente recusar:** a ordem permanece no histórico. Cliente e oficina podem conversar pela ordem; a oficina pode preparar outra versão e enviá-la novamente. Se o cliente desistir definitivamente, a oficina encerra a ordem como recusada, sem apagar o registro.
7. **Se o cliente aprovar:** a equipe registra a execução dos serviços autorizados. Não se inicia execução antes da aprovação da versão vigente.
8. **Veículo fica pronto:** após registrar a execução, a oficina informa que o veículo está pronto para retirada.
9. **Financeiro registra pagamentos:** podem ser lançados pagamentos dentro do saldo pendente. A ordem só é encerrada como paga quando o total aprovado estiver quitado.
10. **Histórico permanece disponível:** cliente e oficina consultam as informações conforme suas permissões e dentro do vínculo correto.

### Regras importantes do fluxo

- Recusar um orçamento não apaga a ordem nem encerra automaticamente a conversa.
- Uma revisão cria uma nova versão; versões e decisões anteriores são preservadas.
- Somente a versão vigente aprovada autoriza execução.
- Um serviço adicional ou divergente precisa ser orçado e aprovado antes de ser executado.
- Pagamentos não podem ultrapassar o saldo. O encerramento financeiro depende da quitação.
- Mensagens, decisões e alterações importantes devem permanecer vinculadas à ordem e à oficina correspondentes.

## Escopo do MVP atual

### Incluído

- Acesso da equipe e do cliente por uma aplicação web.
- Uma conta GarageOps com vínculos independentes para várias oficinas.
- Seleção de uma oficina ativa e controle de acesso por papel.
- Cadastro de clientes e veículos por oficina.
- Convite de cliente ao telefone cadastrado, com código temporário de uso limitado.
- Abertura de ordem, diagnóstico, orçamento versionado e decisão do cliente.
- Conversa textual dentro da ordem.
- Registro de execução, prontidão do veículo, pagamentos e histórico.
- Peças lançadas manualmente como itens do orçamento, quando houver necessidade.
- Oficinas e usuários fictícios para demonstrar vínculos, papéis e isolamento entre tenants.

### Fora do MVP atual

- Estoque próprio, catálogo de peças, saldo de peças e baixa interna. A premissa atual é que muitas oficinas obtêm peças por meio de autopeças parceiras. Se uma peça for necessária no orçamento, ela é informada manualmente.
- Gerenciamento completo dos usuários internos e dos papéis da equipe; no protótipo, as contas de demonstração são pré-carregadas.
- Landing page comercial externa.
- Aplicativo nativo distribuído pela Google Play ou App Store.
- Pagamento real integrado a um provedor. O registro de pagamento no protótipo é demonstrativo/manual.
- Envio real de SMS, e-mail, WhatsApp ou notificações push. O código de convite é simulado no ambiente local.
- Implantação comercial pronta para clientes reais.

Esses itens só entram no escopo depois de decisão explícita do grupo e atualização dos documentos do TCC.

## Cenário de demonstração com cinco oficinas

O ambiente de demonstração deve mostrar que a solução funciona com oficinas de tamanhos e composições diferentes, além de clientes que usam mais de uma oficina.

| Oficina de demonstração | Composição prevista da equipe |
|---|---|
| Garagem Central | Administrador e um mecânico; sem atendente dedicado. |
| Horizonte | Administrador, um atendente e dois mecânicos. |
| Torque | Administrador, um atendente e seis mecânicos. |
| Box 12 | Administrador, dois atendentes e um mecânico. |
| Rota Auto Center | Administrador, dois atendentes e quatro mecânicos. |

Os dados devem permitir demonstrar pelo menos estes casos: um cliente ligado a duas oficinas, outro cliente ligado às cinco e um cliente ligado a uma única oficina. O teste deve confirmar que a conta global facilita a entrada, mas não compartilha veículos ou ordens entre oficinas.

Os nomes e registros de demonstração são fictícios. Não usar dados reais de clientes no ambiente acadêmico.

## Arquitetura e estado de implementação

### Protótipo executável atual

O protótipo acadêmico já exercitado usa:

| Parte | Implementação do protótipo |
|---|---|
| Interface web | React e Vite |
| Serviços HTTP | Node.js e Express, separados em identidade, clientes/veículos e ordens |
| Persistência | PostgreSQL, com bancos separados por serviço no ambiente local |
| Ambiente local | Docker Compose |
| Acesso do navegador | Uma URL local, servida pelo container web |

O protótipo serve para explorar o fluxo e validar regras com dados fictícios. Ele não deve ser descrito como produto pronto para operação real. A entrega final precisa seguir os requisitos e a arquitetura aprovados para o TCC, incluindo os itens obrigatórios de infraestrutura, implantação independente dos microsserviços, segurança, testes e observabilidade.

### Direção técnica a validar nos documentos do projeto

Os documentos acadêmicos existentes registram tecnologias e componentes planejados, como TypeScript/NestJS, RabbitMQ, AWS, Terraform, GitHub Actions, Prometheus e Grafana. A adoção de cada componente deve ser confirmada pelo grupo e pelo professor e justificada por uma necessidade concreta. Não adicionar infraestrutura, serviços ou integrações apenas por parecerem sofisticados.

Em qualquer desenho de microsserviços, cada serviço deve ter responsabilidade clara, interface documentada e capacidade de execução e implantação independentes. Um serviço não deve ler ou gravar diretamente no banco de outro; integração ocorre pelos contratos definidos entre eles.

## Requisitos de segurança e qualidade

- Toda operação deve obter o tenant e os papéis do contexto autenticado no servidor; não confiar em `tenant_id` fornecido livremente pelo navegador.
- Validar que cliente, veículo e ordem pertencem à mesma oficina antes de criar relações entre eles.
- Usar autenticação segura, hash de senha, proteção contra tentativas repetidas e expiração de sessão.
- Convites são de uso limitado, expiram, aceitam poucas tentativas e não concedem acesso apenas por conhecer o link.
- Não armazenar ou registrar senhas, códigos temporários, tokens ou segredos em texto puro.
- Guardar decisões de orçamento e operações críticas com autoria e data/hora.
- Testar acessos permitidos e negados, inclusive tentativas de atravessar o limite entre oficinas.
- Medir cobertura e qualidade de acordo com o RNF aprovado e automatizar as verificações no pipeline.
- Nunca colocar `.env`, credenciais, dados de clientes ou tokens reais no Git.

## Organização deste repositório

```text
.
├── README.md
└── equipe/
    ├── Eloisa-do-Santos-Brandao/README.md
    ├── Thiago-Marques-Bueno/README.md
    ├── Matheus-Gabriel-Correa-Braga-Viana/README.md
    └── Gabriel-Carneiro-da-Silva/README.md
```

Este repositório atualmente organiza a visão do sistema e o trabalho da equipe. Quando o código, o Docker Compose e as instruções de execução forem adicionados aqui, o README deve ser atualizado com comandos testados neste próprio repositório.

## Responsabilidades do grupo

| Integrante | Responsabilidade principal | Guia de trabalho |
|---|---|---|
| Eloisa do Santos Brandão | Product Owner e Analista de Requisitos | [Abrir guia](equipe/Eloisa-do-Santos-Brandao/README.md) |
| Thiago Marques Bueno | Backend e Integrações | [Abrir guia](equipe/Thiago-Marques-Bueno/README.md) |
| Matheus Gabriel Correa Braga Viana | Frontend e UX | [Abrir guia](equipe/Matheus-Gabriel-Correa-Braga-Viana/README.md) |
| Gabriel Carneiro da Silva | DevOps, Banco de Dados e Qualidade | [Abrir guia](equipe/Gabriel-Carneiro-da-Silva/README.md) |

Cada integrante deve trabalhar na sua área em colaboração com os demais. As fronteiras indicam responsabilidade principal, não propriedade exclusiva sobre o produto.

## Como trabalhar neste repositório

1. Leia este README e o guia da sua pasta.
2. Confirme com o grupo que a tarefa está alinhada ao escopo e aos requisitos aprovados.
3. Abra uma issue ou registre a tarefa no quadro do grupo, com responsável e critério de conclusão.
4. Crie uma branch curta e específica a partir da branch principal vigente.
5. Faça alterações pequenas e documente decisões que afetem outros integrantes.
6. Revise os arquivos alterados e execute as verificações pertinentes à mudança.
7. Abra um Pull Request com objetivo, resumo, verificações feitas e pontos que precisam de revisão.
8. Peça revisão a pelo menos um colega; não faça merge de uma alteração que ainda conflita com os requisitos.

Use nomes de branch como `docs/visao-do-produto`, `feat/cadastro-cliente` ou `fix/isolamento-tenant`. Escreva commits objetivos, por exemplo `Documenta fluxo de convite do cliente`.

## Como contribuir

Se uma decisão ainda estiver em aberto, registre a dúvida e as opções antes de codificar. Se uma regra de negócio mudar, atualize o requisito, os critérios de aceite, o modelo/diagrama afetado e este README. O objetivo é que o código, os documentos acadêmicos e a demonstração contem a mesma história do OficinaPro.
