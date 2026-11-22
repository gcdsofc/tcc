# Guia do Gabriel Carneiro da Silva

**Responsabilidade principal:** DevOps, Banco de Dados e Qualidade do GarageOps.

Leia primeiro a [visão do sistema, o modelo de confiança e os critérios de integração](../../README.md). Além do isolamento oficina a oficina, existe uma regra importante: a conta de administrador da plataforma não pode ler conteúdo operacional dos tenants.

Este guia organiza a preparação dos dados e do ambiente, a verificação automatizada e a qualidade das entregas. A infraestrutura deve tornar o projeto reproduzível e observável; o banco deve proteger a integridade e o limite entre oficinas; os testes devem comprovar regras, inclusive as que negam uma ação.

## Sua parte no projeto

- Manter o ambiente local documentado e reproduzível com Docker Compose.
- Apoiar a definição do modelo físico e das migrations com o responsável pelo backend.
- Garantir que as consultas e restrições mantenham o escopo do tenant.
- Definir seeds fictícios que representem as cinco oficinas e seus diferentes perfis.
- Criar verificações de banco, serviços, build e testes no pipeline.
- Medir a cobertura conforme o requisito não funcional aprovado.
- Conferir logs, variáveis, dependências e comportamento do ambiente sem expor segredos.
- Registrar decisões de infraestrutura e consequências para o grupo.
- Provar com testes e configuração que nem o papel de administrador da plataforma nem o monitoramento acessam conteúdo operacional de tenant.

## Passo a passo para preparar uma tarefa

1. Identifique o requisito, os serviços envolvidos e como o professor espera que seja comprovado.
2. Confirme com Thiago qual serviço é dono dos dados e quais operações são necessárias.
3. Modele entidades, chaves, restrições, índices e migrations antes de alterar o banco compartilhado.
4. Inclua o tenant em cada dado operacional e valide que referências importantes pertencem ao mesmo tenant.
5. Prepare seeds fictícios reprodutíveis sem inserir dados pessoais reais.
6. Execute a mudança em um banco local limpo e também em um banco que já tenha a migration anterior aplicada.
7. Escreva testes de integridade, isolamento, falha e recuperação pertinentes à alteração.
8. Automatize as verificações no pipeline: lint/build, testes e cobertura conforme os critérios aprovados.
9. Documente comandos para iniciar, inspecionar logs, parar e recriar o ambiente, alertando quando uma ação apagar dados.
10. Revise o Pull Request e confirme que não contém `.env`, senhas, tokens, dumps ou dados reais.

## Entregas sob sua responsabilidade

1. Modelo relacional e migrations alinhados ao Documento 04 e às APIs do serviço dono dos dados.
2. Docker Compose local reproduzível, com health checks e `.env.example` sem segredos.
3. Seeds fictícios para cinco oficinas diferentes, incluindo um cliente compartilhado por duas oficinas e outro presente nas cinco, cada qual com perfis e históricos locais separados.
4. Testes automatizados de isolamento, papéis, autorização do administrador da plataforma, integridade e fluxo financeiro.
5. Pipeline de CI com build, testes e cobertura global definida no Documento 02.
6. Plano mínimo de observabilidade que entregue métricas agregadas e logs sanitizados, sem conteúdo de cliente ou ordem.
7. Instruções de setup e recuperação verificadas por um colega em clone limpo.

## Documentos e exigências do professor sob sua responsabilidade

| Item | O que o professor pede | Situação |
|---|---|---|
| README do grupo e Documentos 01 a 04 | Preenchidos com dados reais, sem texto genérico do template | Entregues; manter coerentes com o MVP junto com Eloisa |
| Documento 05 — Arquitetura em Nuvem | Diagrama oficial dos serviços AWS, rede, inventário de recursos, security groups, módulos Terraform, state e estimativa de custos | A fazer (5º encontro) |
| C3, C4, C5, C6, C7, C8 | Banco justificado, deploy na AWS, Terraform, GitHub Actions, cobertura ≥ 60% e Prometheus + Grafana | Planejar no Documento 05 e implementar no 5º semestre |

Como fazer o Documento 05:

1. Copie `templates/05-arquitetura-nuvem.md` para `Projetos/OficinaPro/05-arquitetura-nuvem.md`; não altere o template original.
2. Desenhe a VPC com subnets públicas e privadas: só o load balancer fica exposto; serviços, PostgreSQL e RabbitMQ ficam em subnet privada.
3. Preencha o inventário pensando no custo acadêmico: contêineres dos microsserviços (ECS Fargate ou EC2 com Docker), RDS PostgreSQL com um banco por serviço, Amazon MQ ou RabbitMQ em contêiner, ECR para as imagens e o Grafana/Prometheus.
4. Na seção de Terraform, descreva os módulos (rede, banco, serviços, monitoramento) e onde fica o state (S3 com lock).
5. Na estimativa de custos, use free tier quando possível e registre que o ambiente será desligado fora das demonstrações.
6. Os ADRs de nuvem, banco e containerização (ADR-002, ADR-004 e ADR-005 do template 07) são seus; entregue o texto para o Matheus consolidar.

O Documento 05 deve bater com os Documentos 03 e 04: mesmos serviços, mesmos bancos e o mesmo limite de acesso do administrador da plataforma.

## Exemplo de modelagem de um perfil de cliente por oficina

Exemplo didático de estrutura relacional; alinhe nomes e tipos com o modelo lógico e o serviço que será dono da tabela:

```sql
CREATE TABLE customer_profiles (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_customer_profiles_tenant_name
  ON customer_profiles (tenant_id, name);
```

O ponto principal é que o identificador do cliente não substitui o `tenant_id`. Leituras, alterações e relações precisam permanecer no escopo da oficina. Em bancos separados por serviço, não crie uma chave estrangeira física para uma tabela de outro serviço; valide a referência pela interface documentada.

## Exemplo de verificação de isolamento

Uma prova útil cria duas oficinas e dados semelhantes em cada uma. Depois valida tanto o acesso permitido quanto o negado:

```text
DADO um token de atendente vinculado à Oficina A
E um cliente cadastrado somente na Oficina B
QUANDO a API da Oficina A tenta abrir uma ordem usando esse cliente
ENTÃO a operação é negada
E nenhuma ordem é criada
E a resposta não revela os dados particulares da Oficina B
```

Repita a verificação para listas, busca por identificador, veículo, ordem, orçamento e conversa. Um endpoint que retorna `404` ou `403` corretamente não basta se outra rota ainda expõe o mesmo registro.

### Verificação negativa do administrador da plataforma

Prepare uma conta com somente o papel de administrador GarageOps. Confirme que ela consegue cadastrar, editar, suspender e excluir oficinas e ver o cadastro delas (nome, identificador, identidade visual (cor) e situação (ativa ou suspensa)), saúde global e métricas agregadas. Confirme que não consegue obter conteúdo de clientes, veículos, diagnósticos, ordens, orçamentos, valores, mensagens ou pagamentos pela UI ou API. Inclua consultas por ID conhecido, filtros, exportações e endpoints de relatórios. Não use dados reais; faça isso com seeds.

## Ambiente e infraestrutura

- Documente a versão do Docker/Docker Compose, variáveis necessárias e portas realmente usadas.
- Mantenha `.env.example` somente com nomes e valores de demonstração sem segredos reais.
- Cada serviço deve iniciar, ser verificado por health check e registrar falhas úteis.
- Bancos dos serviços não devem depender de uma ordem frágil de inicialização; use health checks e retry controlado quando necessário.
- Não exponha portas internas ou interfaces administrativas fora do ambiente local sem necessidade.
- Decisões de cloud, IaC, pipeline e observabilidade precisam estar ligadas aos requisitos do projeto e demonstráveis no escopo acadêmico.
- O protótipo exploratório já usa Docker Compose; a arquitetura final e as ferramentas devem seguir a validação do grupo e do professor.

## Banco e migrations

- Não edite manualmente o esquema de uma instalação como única forma de aplicar uma mudança.
- Versione alterações do esquema com migrations reproduzíveis e, quando necessário, uma forma segura de reversão.
- Use constraints para integridade possível dentro do banco do serviço, como unicidade por tenant.
- Crie índices para consultas reais, considerando tenant e filtros usados nas rotas; evite índices sem justificar custo de escrita e armazenamento.
- Não compartilhe tabelas como atalho de integração entre microsserviços independentes.
- Separe seed de demonstração de dados que poderiam ser confundidos com clientes reais.
- Separe credenciais de runtime e operação; o papel da aplicação `platform_admin` não deve ter credencial de banco nem um endpoint de leitura dos dados de tenant. Logs e métricas não devem carregar texto de mensagens, placa, diagnóstico, orçamento ou dados pessoais.
- Registre em ADR como o ambiente restringe e audita acesso técnico privilegiado aos bancos; uma tela sem permissão não é suficiente para cumprir a promessa de confidencialidade.
- O escopo atual do MVP **não contém estoque interno**. Não criar tabelas, containers ou testes de inventário sem uma decisão nova do grupo.

## Estratégia de testes

Priorize testes nas regras que podem causar acesso indevido ou inconsistência de atendimento:

1. Autenticação, expiração de sessão e seleção de vínculo ativo.
2. Isolamento de tenant em cada serviço e papel.
3. Associação de cliente e veículo somente dentro da mesma oficina.
4. Transições da ordem e bloqueio de execução sem orçamento aprovado.
5. Preservação das versões e decisões anteriores do orçamento.
6. Restrição de pagamentos ao saldo pendente e encerramento somente após quitação.
7. Convite expirado, código incorreto, tentativas limitadas e token de uso único.
8. Integrações com timeout, indisponibilidade e resposta inválida.
9. Acesso negado do administrador da plataforma ao conteúdo de todos os domínios de tenant, incluindo rotas de relatório e exportação.

O Documento 02 registra meta mínima de cobertura de 60% conforme sua métrica definida. A medição deve cobrir o código-fonte dos microsserviços e ser verificada no pipeline, segundo a redação aprovada pelo professor. Cobertura é uma métrica; ela não substitui testes de comportamento e segurança.

## Exemplo de pipeline de Pull Request

Uma pipeline inicial pode executar, na ordem:

1. Instalar dependências usando o lockfile.
2. Verificar formatação/lint e compilação.
3. Subir serviços necessários para testes de integração.
4. Rodar testes unitários e de integração.
5. Calcular cobertura e falhar se o mínimo aprovado não for atingido.
6. Validar configuração Docker/Compose e migrations em banco descartável.
7. Publicar relatórios de teste sem incluir segredos ou dados pessoais.

Defina os comandos exatos depois que a estrutura final de código estiver neste repositório. Não documente comandos de um protótipo externo como se já estivessem disponíveis aqui.

## Verificações antes do Pull Request

- [ ] `docker compose config` valida a configuração.
- [ ] Serviços sobem com dados fictícios e health checks ficam saudáveis.
- [ ] Migrations funcionam em base vazia e em base com versão anterior.
- [ ] Testes cobrem acesso entre tenants permitido e negado.
- [ ] O cálculo de cobertura corresponde ao escopo do RNF aprovado.
- [ ] Seeds cobrem as cinco oficinas e os casos de cliente multi-oficina.
- [ ] A conta de administrador da plataforma acessa somente o cadastro das oficinas e a observabilidade agregada; nenhuma rota retorna conteúdo operacional.
- [ ] Segredos e permissões de infraestrutura/banco estão separados das permissões do usuário administrador da aplicação e têm trilha de auditoria.
- [ ] `.env` e credenciais não aparecem no diff.
- [ ] Instruções de setup e recuperação foram atualizadas.
- [ ] Logs não contêm token, senha, código temporário nem dados pessoais.

## Definição de pronto para sua parte

Outro integrante deve conseguir clonar o repositório, preparar as variáveis de exemplo, iniciar o ambiente, rodar os testes e entender como inspecionar uma falha sem depender de configuração secreta ou intervenção manual não documentada.
