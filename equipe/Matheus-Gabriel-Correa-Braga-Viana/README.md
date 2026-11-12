# Guia do Matheus Gabriel Correa Braga Viana

**Responsabilidade principal:** Desenvolvedor Frontend e UX do GarageOps.

Este guia ajuda a construir uma interface clara para as rotinas da oficina e do cliente. A interface deve explicar o que está acontecendo, orientar a próxima ação e respeitar as permissões recebidas do backend. A segurança continua sendo validada no servidor.

## Sua parte no projeto

- Desenhar os fluxos de acesso, seleção da oficina, clientes, veículos e ordens.
- Implementar telas e componentes conforme os critérios de aceite acordados.
- Integrar formulários e estados com os contratos documentados pelo Thiago.
- Mostrar mensagens claras para carregamento, sucesso, validação, erro e ausência de dados.
- Adaptar a navegação para computador e celular, com atenção à acessibilidade.
- Evitar informações falsas: listas, contadores e estados devem vir dos serviços.
- Testar os caminhos da equipe e do cliente com diferentes papéis e vínculos.

## Fluxos de interface a cobrir

1. **Entrar:** formulário de login, erro de credenciais e recuperação de uma sessão expirada.
2. **Selecionar oficina:** listar somente vínculos ativos; mostrar nome da oficina e papel naquele espaço.
3. **Trabalhar na oficina:** identificar visualmente a oficina ativa e permitir alternar sem misturar dados.
4. **Cadastrar cliente e veículo:** formulários distintos, validação de campos e confirmação do vínculo com a oficina atual.
5. **Abrir ordem:** selecionar cliente e veículo compatíveis e informar o problema relatado.
6. **Acompanhar ordem:** exibir status, diagnóstico, versões de orçamento, conversa, execução e pagamentos permitidos.
7. **Decidir orçamento como cliente:** identificar versão e total; permitir aprovar ou recusar somente enquanto aguarda decisão.
8. **Convidar cliente:** selecionar cliente já cadastrado, apresentar o estado de convite e deixar claro que link sozinho não concede acesso.

## Passo a passo para cada tela

1. Leia o critério de aceite e identifique o papel que usa a tela.
2. Esboce a sequência de ações antes de escrever o componente. Reduza campos desnecessários.
3. Liste estados necessários: inicial, carregando, vazio, sucesso, erro, acesso negado e dado não encontrado.
4. Confirme com o backend o contrato e os nomes dos campos. Não invente payloads no frontend.
5. Implemente componentes reaproveitáveis, como campos, aviso, confirmação e indicador de status.
6. Desabilite envio repetido enquanto uma requisição estiver em andamento.
7. Após uma ação, mostre confirmação e atualize os dados a partir da resposta/API.
8. Teste teclado, foco visível, rótulos, contraste, leitura em tela estreita e mensagens de erro.
9. Teste o mesmo fluxo com mais de um papel e com mais de uma oficina.
10. Inclua capturas ou passos de demonstração no Pull Request quando uma mudança visual precisar de revisão.

## Exemplo: cliente recebe um orçamento revisado

Exemplo ilustrativo de comportamento de interface:

- A tela da ordem mostra a versão mais recente, o total e os itens com descrição, quantidade e valor.
- A versão anterior continua acessível no histórico, com a decisão registrada.
- Se a versão atual estiver aguardando decisão, o cliente vê **Aprovar** e **Recusar**.
- Ao recusar, a interface pode pedir motivo opcional e explicar que a ordem permanece aberta para conversa.
- Depois de enviar a decisão, os botões são bloqueados durante a chamada; em sucesso, a tela recarrega a ordem e mostra a decisão registrada pelo servidor.
- Se a sessão não puder acessar a oficina ou a ordem, a interface mostra uma mensagem clara e não revela o conteúdo.

O frontend não deve presumir que clicar no botão significa que a decisão foi salva. A confirmação deve vir da resposta do backend.

## Estados que não podem faltar

| Estado | Exemplo de apresentação |
|---|---|
| Carregando | Indicador junto da seção que está buscando dados; impedir envio duplicado |
| Lista vazia | Explicar por que não há registros e qual ação permitida pode criá-los |
| Sucesso | Confirmar o que foi salvo e atualizar a lista |
| Erro de validação | Apontar o campo e explicar como corrigir |
| Sem permissão | Informar que o papel não pode executar aquela ação, sem mostrar controles que falharão |
| Sessão expirada | Pedir novo login e manter a pessoa fora de dados protegidos |
| Falha temporária | Permitir nova tentativa sem duplicar operação |

## Boas práticas de UX e segurança

- Exibir claramente qual oficina está ativa em todas as áreas operacionais.
- Não colocar dados de duas oficinas na mesma lista sem identificação e autorização explícitas.
- Não usar identificadores recebidos do navegador como prova de permissão.
- Não guardar senha, código temporário ou token no estado visual, logs ou mensagens de erro.
- Mostrar peças como itens informados manualmente no orçamento; não criar telas de estoque no MVP atual.
- Preservar a conversa e o histórico visualmente; não sugerir que uma recusa apagou a ordem.
- Usar nomes de status compreensíveis em português, mantendo o mapeamento para os estados da API.
- Não adicionar landing page externa nem telas de aplicativo nativo ao escopo atual.

## Organização sugerida da interface

A estrutura exata será escolhida conforme a arquitetura aprovada, mas os componentes devem ser divididos por responsabilidade:

```text
src/
├── app/
├── components/
├── features/
│   ├── access/
│   ├── customers/
│   ├── vehicles/
│   └── work-orders/
└── services/
```

O protótipo exploratório usa React e Vite. Os documentos-alvo mencionam React com TypeScript. Confirme a base que o grupo adotará antes de iniciar uma migração ou adicionar bibliotecas.

## Checklist visual e funcional

- [ ] A oficina ativa e o papel estão claros.
- [ ] Só aparecem ações que fazem sentido para o papel atual.
- [ ] Campos têm rótulo, tipo e validação adequada.
- [ ] A interface diferencia serviço e peça informada manualmente.
- [ ] Orçamentos anteriores continuam visíveis no histórico.
- [ ] A decisão do cliente atualiza a tela com confirmação do backend.
- [ ] Não há listas ou contadores fixos usados como se fossem dados reais.
- [ ] A tela funciona em largura de celular e por teclado.
- [ ] Erros não mostram stack trace, token ou dados de outra oficina.
- [ ] O Pull Request contém evidência visual quando a mudança altera uma tela.

## Definição de pronto para sua parte

A tela cobre os estados importantes, segue o contrato da API, funciona para o papel e a oficina corretos, é compreensível em celular e desktop e não depende de dados simulados para parecer concluída.
