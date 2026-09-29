# Relatório de QA: EngenharQ OS (Testes como Eng. de Segurança do Trabalho)

## 1. Dashboard
- **Status:** Testado e funcional.
- **Observações / UX:** Gráficos interativos (hover/tooltips) estão funcionando normalmente. Indicadores de "EPIs em uso" e "Estoque Disponível" carregam corretamente. Não houve lentidão ou quebra de layout ao clicar nos elementos visuais.

## 2. Empresa / Obras
- **Status:** Fluxo CRUD testado (Criação, Edição e Exclusão).
- **Bugs / Melhorias:** 
  - O sistema permite o cadastro de códigos de obra visualmente redundantes/duplicados (ex: permite criar `OB99` quando já existe um `OB-99`). Seria interessante aplicar uma normalização nos códigos de obra (remoção de caracteres especiais na validação) para evitar confusão no inventário.
  - Os modais de confirmação e os toasters de sucesso ("Obra atualizada", "Obra excluída") funcionaram perfeitamente sem falhas.

## 3. Colaboradores
- **Status:** Falha de Validação Crítica Encontrada.
- **Bugs / UX:**
  - **BUG CRÍTICO:** O campo "CPF" no modal de "Novo Colaborador" não possui validação real do dígito verificador. O sistema permitiu salvar com sucesso um funcionário fictício com o CPF `00000000000`. Isso é um risco grave, já que dados de Segurança do Trabalho precisam de integridade para e-Social e PPP.

## 4. Estoque NR-6 e Mapa
- **Status:** Funcional, porém com feedback de usuário (UX) fraco na alocação.
- **Bugs / Melhorias:**
  - A aba Estoque (NR-6) lista corretamente categorias, C.A. e validades.
  - No "Mapa de Ativos" (que utiliza Leaflet), ao usar o botão "Alocar EPI", o preenchimento dos campos ocorre normalmente. Contudo, ao clicar no botão "Confirmar Alocação", o modal é encerrado sem um feedback claro (toaster de Sucesso demorado) de que a operação concluiu no banco de dados. Isso pode fazer com que o usuário tente alocar de novo achando que a página travou ou que a requisição falhou silenciosamente.

## 5. Scanner (Almoxarifado)
- **Status:** Fluxo concluído com sucesso.
- **Observações / UX:**
  - Para testar a entrega "Pulando a Biometria/QR", utilizei o botão "Entrada Manual (Simulação)". 
  - A busca pela matrícula gerada no passo anterior funcionou. A escolha de EPI também foi fácil.
  - A etapa 3 (Foto de Evidência) efetuou a captura da imagem base64 simulada corretamente e liberou o botão de "Confirmar Entrega".
  - O fluxo finalizou perfeitamente, exibindo a tela de sucesso "Entrega Registrada". A usabilidade dessa parte está excelente e fluida.
