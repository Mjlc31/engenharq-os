# RELATÓRIO DE AUDITORIA E REGULARIZAÇÃO DO SISTEMA ENGENHARQ OS
**Documento Base:** *"EDIÇÕES NECESSÁRIAS PARA REGULARIZAÇÃO"* (Solicitações da equipe Engiarq)  
**Data da Auditoria:** 14/09/2026  
**Finalidade:** Guia completo de diagnóstico e especificação técnica para a equipe de desenvolvimento implementar as correções e novas funcionalidades solicitadas.

---

## 1. RESUMO EXECUTIVO (SCORECARD)

| Módulo / Requisito | Status Atual | Grau de Aderência | O que já existe | O que deve ser implementado/corrigido pelos devs |
| :--- | :---: | :---: | :--- | :--- |
| **1. Empresa / Obras** (Pág. 1) | 🟡 Parcial | **50%** | Nome, CNPJ, CNO, Datas de início/término, Endereço e Status no banco e modal de cadastro. | • Criar sistema de abas (*Dados da Empresa* e *Obras*);<br>• Criar tabela no banco para os dados da Matriz e tela de edição;<br>• Transformar listagem de obras em Tabela com colunas solicitadas (Código, Cidade, Responsável, Status, Ações);<br>• Upload real de imagem;<br>• Tornar Latitude e Longitude opcionais. |
| **2. Funcionários** (Pág. 2) | 🟡 Parcial | **65%** | Nome, CPF, Matrícula, Admissão, Nascimento, Obra vinculada, Setor, Fardamento, Bota, Aptidão Altura/Confinado, Telefone. | • Upload real de fotografia no cadastro;<br>• Implementar fluxo de "Nova Função / Promoção" que mantenha histórico com data e atualize a função vigente (`current_role`);<br>• Ajustar colunas da tabela de funcionários conforme mockup;<br>• Ajustar nomenclaturas e paginação com seletor de itens. |
| **3. Cadastro de EPIs & Estoque** (Pág. 3) | 🟡 Parcial | **60%** | Nome/Tipo, Descrição, Marca, CA, Validade CA, Vida útil, Estoque mínimo, Observações no catálogo. | • **CRÍTICO:** Atualização automática do estoque geral (`current_stock`) nas saídas/entregas e devoluções;<br>• Upload real de fotografia do EPI;<br>• Dropdown com categorias padronizadas da NR-6;<br>• Código sequencial do EPI (`EPI001`);<br>• Campo para Modelo do EPI;<br>• Visão unificada direta no catálogo de EPIs. |

---

## 2. PÁGINA 1: ABA DE CADASTROS E CADASTRO DE EMPRESA / OBRA

### 2.1 Requisitos Solicitados no Documento
1. **Menu Lateral:** Alterar o nome *"Empresas"* para *"Empresa / Obras"*.
2. **Cadastro de Empresa / Obra (Campos):**
   - Nome
   - CNPJ
   - CNO
   - Data de início
   - Data de término
   - Endereço
   - Imagem (fotografia/anexo da obra)
   - Status: Ativa / Finalizada
3. **Layout e Telas (Modelo Ilustrativo do Mockup):**
   - **Abas Superiores:** `Dados da Empresa` | `Obras` (o mockup indicava *"Filiais"* com a nota: *"Substituir o nome filiais por obras"*).
   - **Aba "Dados da Empresa":**
     - Logo e Razão Social / Nome Fantasia (*ex: "MetalSP Indústria Metalúrgica São Paulo Ltda"*);
     - Bloco *Informações Gerais*: CNPJ, Inscrição Estadual, Status (*Ativo*);
     - Bloco *Endereço*: Logradouro, Número, Complemento, Bairro, Cidade - UF, CEP;
     - Bloco *Contato*: Telefone comercial, E-mail corporativo, Site da empresa;
     - Bloco *Responsável Legal*: Nome completo;
     - Botão de **"Editar"** funcional.
   - **Aba "Obras":**
     - Botão `+ Nova Obra`;
     - Tabela corporativa com as colunas: `CÓDIGO` | `NOME` | `CIDADE` | `RESPONSÁVEL` | `STATUS` | `AÇÕES` (Visualizar / Editar).

---

### 2.2 O que JÁ FOI FEITO no Sistema
- **Menu Lateral (`src/components/Layout.tsx`):** O item do menu já está configurado como `"Empresa / Obras"` com o ícone `Building2` apontando para a rota `/sites`.
- **Banco de Dados (`supabase/schema.sql`):** A tabela `construction_sites` possui as colunas básicas: `name`, `cnpj`, `cno`, `start_date`, `end_date`, `address`, `image_url` e `status`.
- **Formulário de Obra (`src/pages/Sites.tsx`):** Já existe modal que permite cadastrar e editar: Nome, CNPJ, CNO, Data de Início, Data de Término, Endereço, Imagem (URL) e Status (`ACTIVE` / `FINISHED`).
- **Ações de Suporte:** Já existem botões para Editar, Excluir (com proteção caso haja trabalhadores vinculados), além de Importação e Exportação em CSV.

---

### 2.3 O que NÃO FOI FEITO / Deve Ser Ajustado pelos Desenvolvedores
1. **Falta Estrutura de Abas na Página (`src/pages/Sites.tsx`):**
   - A página atual não possui abas. Deve ser criada a divisão por abas: `Dados da Empresa` e `Obras`.
2. **Falta Módulo de Dados da Empresa (Matriz):**
   - Hoje existe apenas um card com dados estáticos fixados no código (*hardcoded*): `"EngenharQ Construções e Soluções LTDA"`.
   - **Ação dos devs:** Criar uma tabela no Supabase (ex: `companies` ou `company_profile`) contendo: Razão Social, Nome Fantasia, CNPJ, Inscrição Estadual, Endereço completo, Telefone, E-mail, Site, Responsável Legal e Logo URL. Criar o formulário/modal para edição desses dados.
3. **Transformar Listagem de Obras em Tabela Conforme Mockup:**
   - Hoje as obras são exibidas em Cards em grade com mini-mapas Leaflet.
   - **Ação dos devs:** Implementar a visualização em **Tabela Corporativa** com as colunas: `CÓDIGO`, `NOME`, `CIDADE`, `RESPONSÁVEL`, `STATUS` e `AÇÕES`. (A exibição em mapa pode ser mantida como alternador de visualização ou movida para o módulo de Mapa).
4. **Campos Faltantes na Tabela `construction_sites`:**
   - Adicionar as colunas no Supabase e no formulário:
     - `code TEXT` (Código da obra, ex: `MTZ`, `FIL01`, `OB01`);
     - `city TEXT` (Cidade/UF da obra, para preencher a coluna "Cidade" da tabela);
     - `manager_name TEXT` (Responsável pela obra / Engenheiro residente).
5. **Upload Real de Imagem da Obra:**
   - O campo atual é `<input type="url">`.
   - **Ação dos devs:** Implementar upload de arquivos de imagem direto para o bucket de Storage do Supabase (ex: bucket `site-images`), salvando a URL pública gerada.
6. **Remover a Obrigatoriedade de Latitude e Longitude:**
   - Em `Sites.tsx`, o código valida `if (isNaN(lat) || isNaN(lng))` e bloqueia o salvamento caso não sejam inseridas coordenadas numéricas.
   - **Ação dos devs:** No schema do Supabase, alterar `latitude` e `longitude` para aceitarem `NULL`, e no formulário remover o bloqueio obrigatório.

---

## 3. PÁGINA 2: CADASTRO DE FUNCIONÁRIOS

### 3.1 Requisitos Solicitados no Documento
1. **Campos do Cadastro:**
   - Nome
   - Fotografia
   - Função inicial (Primeira função quando entrou na empresa)
   - Nova função (*"Recebeu alguma promoção – Nesse campo deverá possuir a opção de inserir novas funções sempre que o empregado for promovido, e que essa inserção da nova função não substitua a anterior, fiquem evidenciadas todas as mudanças de função bem como a data dessa mudança de função"*)
   - CPF
   - Matrícula
   - Data de admissão
   - Data de nascimento
   - Obra (*"Esse campo deverá ser lincado com as obras cadastradas"*)
   - Setor de trabalho
   - Tamanho de fardamento
   - Numeração de bota
   - Aptidão para trabalho em altura e espaço confinado (*"Deverá ter o campo – Apto para Trabalho em altura / Espaço confinado (Sim) (Não)"*)
   - Contato telefônico
2. **Layout e Telas (Modelo Ilustrativo do Mockup):**
   - Título: *"Funcionários - Gerencie o cadastro de funcionários"*;
   - Botões superiores: `Exportar`, `Importar`, `+ Novo Funcionário`;
   - Filtros: Campo de busca (*"Buscar por nome, matrícula ou CPF..."*), dropdown *"Todos os setores"*, dropdown *"Todos os status"*;
   - Tabela com 8 colunas:
     1. `FUNCIONÁRIO` (Avatar fotográfico + Nome completo em negrito + E-mail em cinza logo abaixo do nome)
     2. `MATRÍCULA` (ex: `001`, `002`...)
     3. `CPF` (ex: `123.456.789-00`...)
     4. `SETOR` (ex: Produção, Manutenção, Logística)
     5. `FUNÇÃO` (ex: Operador de Máquinas, Soldador, Eletricista)
     6. `ADMISSÃO` (ex: `09/01/2020`)
     7. `STATUS` (Badge verde: `• Ativo`)
     8. `AÇÕES` (Menu de contexto `⋮`)
   - Paginação: Controle de registros *"Por página: [ 10 v ]"* e paginação numérica.

---

### 3.2 O que JÁ FOI FEITO no Sistema
- **Banco de Dados (`supabase/schema.sql`):** A tabela `workers` contempla: `full_name`, `cpf`, `registration_number`, `initial_role`, `current_role`, `admission_date`, `birth_date`, `work_sector`, `uniform_size`, `boot_size`, `apt_for_height_and_confined_space`, `phone_contact`, `current_site_id`, `reference_photo_url`, `status`.
- **Tabela de Cargos (`worker_roles`):** Tabela criada com `worker_id`, `role_name`, `start_date`.
- **Formulário de Cadastro (`src/components/features/workers/WorkerForm.tsx`):**
  - Possui os campos de Nome, CPF, Matrícula, Função Inicial, Data de Admissão, Data de Nascimento, Setor, Fardamento, Bota, Telefone;
  - Vínculo dinâmico com obras cadastradas via `<select>`;
  - Seletor de Aptidão Altura e Espaço Confinado com botões de rádio (Sim / Não).
- **Filtros e Recursos:** Busca por texto, filtro de setor e status, além de exportação e importação de CSV.

---

### 3.3 O que NÃO FOI FEITO / Deve Ser Ajustado pelos Desenvolvedores
1. **Upload de Fotografia no Cadastro:**
   - O formulário `WorkerForm.tsx` usa apenas `<input type="text" placeholder="https://...">` para URL.
   - **Ação dos devs:** Adicionar componente de upload de imagem direto para o bucket de Storage do Supabase (ex: bucket `worker-photos`) com pré-visualização da imagem no ato do cadastro.
2. **Gestão de Promoções / Nova Função e Sincronização de Cargo:**
   - No `WorkerForm.tsx`, só há o campo "Cargo Inicial".
   - No `WorkerProfile.tsx`, ao adicionar novo cargo na tabela `worker_roles`, o campo `workers.current_role` **não é atualizado**.
   - Na listagem de trabalhadores (`Workers.tsx` linha 226), a tabela exibe fixamente `worker.initial_role` em vez da função atual vigente.
   - **Ação dos devs:**
     - Criar um botão/modal direto "Registrar Promoção" no perfil do funcionário e/ou na tabela de ações;
     - Ao cadastrar nova função com sua data de vigência, registrar o histórico em `worker_roles` e atualizar automaticamente `workers.current_role`;
     - Na tabela e na Ficha de EPI (PDF), exibir a função atual (`current_role || initial_role`).
3. **Reestruturação das Colunas da Tabela de Funcionários (`src/pages/Workers.tsx`):**
   - **Ação dos devs:** Adequar as colunas exatamente como no modelo ilustrativo da obra:
     - Coluna 1: **FUNCIONÁRIO** (Foto/Avatar + Nome em negrito + E-mail logo abaixo em cinza);
     - Coluna 2: **MATRÍCULA** (coluna individual separada);
     - Coluna 3: **CPF** (coluna individual separada);
     - Coluna 4: **SETOR** (coluna individual separada);
     - Coluna 5: **FUNÇÃO** (coluna individual separada, exibindo o cargo vigente);
     - Coluna 6: **ADMISSÃO**;
     - Coluna 7: **STATUS** (Badge com dot: `• Ativo`);
     - Coluna 8: **AÇÕES** (menu dropdown de 3 pontinhos `⋮` contendo: Editar Perfil, Ver Ficha de EPI, Excluir).
   - Remover as colunas mescladas ("MATRÍCULA / CPF" e "SETOR / FUNÇÃO") e remover a coluna "CONTATO" da tabela principal.
4. **Nomenclaturas e Paginação:**
   - Trocar o título da página de *"Força de Trabalho"* para *"Funcionários - Gerencie o cadastro de funcionários"*;
   - Trocar o botão `+ Registrar` para `+ Novo Funcionário`;
   - Implementar o seletor de paginação `Por página: [10, 25, 50]`.

---

## 4. PÁGINA 3: CADASTRO DO EPI E CONTROLE DE ESTOQUE

### 4.1 Requisitos Solicitados no Documento
1. **Campos do Cadastro de EPI:**
   - Tipo de EPI (*"Nesse campo iremos digitar o nome do EPI, Ex: capacete verde, capacete azul, capacete para trabalho em altura"*);
   - Imagem (*"Aqui é interessante ter o campo onde possamos anexar uma fotografia do equipamento"*);
   - Categoria (*"Nele iremos: Proteção de cabeça, proteção auditiva, proteção de olhos, proteção de face..."*);
   - Descrição (*"Nesse campo iremos descrever a quem deverá ser entregue determinado EPI bem como as características e funcionalidades dele"*);
   - Marca;
   - C.A (*"Iremos inserir o código do Certificado de aprovação do EPI"*);
   - Validade do C.A;
   - Tempo ideal de troca;
   - Estoque mínimo;
   - Estoque inicial (*"Esse campo será onde iremos inserir o estoque inicial e que irá automaticamente alimentar o estoque geral de material – Será alimentado unicamente no cadastro do material, posteriormente o número do estoque irá alterar de acordo com a liberação ou aquisições do material"*);
   - Observação.
2. **Layout e Telas (Modelo Ilustrativo do Mockup):**
   - Título: *"Equipamentos de Proteção Individual - Cadastre e gerencie os EPIs da empresa"*;
   - Botão: `+ Novo EPI`;
   - Barra de busca e dropdown de filtro *"Todas as categorias"*;
   - Tabela com 8 colunas consolidadas:
     1. `CÓDIGO` (ex: `EPI001`, `EPI002`, `EPI003`, `EPI004`, `EPI005`, `EPI006`)
     2. `TIPO / DESCRIÇÃO` (ex: **Capacete de Segurança** com subtítulo *Capacete de segurança classe A e B*)
     3. `MARCA/MODELO` (ex: `3M \n H-700`, `Honeywell \n Uvex S3200`, `Volk \n LV209`, `Marluvas \n 50B18`)
     4. `CA` (ex: `29638`, `18967`, `5674`)
     5. `VALIDADE CA` (com ícone amarelo de alerta de proximidade do vencimento + data)
     6. `ESTOQUE` (exibição de Saldo Atual / Mínimo, ex: `45 / 10`, e ícone de alerta se estoque baixo: `⚠ 8 / 20`)
     7. `STATUS` (Badge verde: `• Ativo`)
     8. `AÇÕES` (Menu de contexto `⋮`)
   - Paginação: Controle *"Por página: [ 10 v ]"* e paginação numérica.

---

### 4.2 O que JÁ FOI FEITO no Sistema
- **Banco de Dados (`supabase/schema.sql`):** A tabela `epi_catalog` possui: `name`, `category`, `description`, `brand`, `ca_number`, `ca_validity`, `lifespan_days`, `minimum_stock`, `current_stock`, `image_url`, `observations`.
- **Formulário de Cadastro (`CatalogTab.tsx`):** Contém campos para Nome do Modelo, Categoria, Marca, Número CA, Validade CA, Vida Útil (dias), Estoque Mínimo, Estoque Inicial e Observações.
- **Geração de Itens Físicos:** Ao criar um catálogo com estoque inicial, o sistema gera os registros individuais correspondentes na tabela `epi_inventory`.
- **Alerta de Estoque Mínimo:** A tabela já calcula e sinaliza quando o estoque está igual ou abaixo do mínimo estipulado.

---

### 4.3 O que NÃO FOI FEITO / Deve Ser Ajustado pelos Desenvolvedores
1. 🚨 **CRÍTICO: Sincronização Automática do Saldo de Estoque Geral (`current_stock`):**
   - **Problema atual:** Quando um EPI é liberado/entregue para um trabalhador via Scanner biométrico ou tela de Operações, o sistema altera o item físico em `epi_inventory` para `'IN_USE'`, mas **NUNCA decrementa o campo `current_stock` na tabela `epi_catalog`**. O saldo na tabela de catálogo permanece inalterado.
   - **Ação dos devs:**
     - Criar um Trigger no PostgreSQL no Supabase (ou atualizar as RPCs `assign_epi`, `bulk_assign_epis` e `return_epi`) para recalcular e atualizar o `current_stock` em `epi_catalog` automaticamente:
       ```sql
       -- Ao entregar um EPI: decrementar current_stock
       UPDATE public.epi_catalog 
       SET current_stock = GREATEST(0, current_stock - 1)
       WHERE id = (SELECT epi_catalog_id FROM public.epi_inventory WHERE id = p_epi_id);

       -- Ao devolver um EPI: incrementar current_stock
       UPDATE public.epi_catalog 
       SET current_stock = current_stock + 1
       WHERE id = (SELECT epi_catalog_id FROM public.epi_inventory WHERE id = p_epi_id);
       ```
     - Criar fluxo/modal de **"Aquisição de Estoque / Nova Entrada"** para permitir aumentar o estoque de um EPI já cadastrado sem precisar recriar o produto.
2. **Upload Real de Fotografia do Equipamento:**
   - O campo atual é `<input type="url">`.
   - **Ação dos devs:** Adicionar upload direto de fotos para o Supabase Storage (bucket `epi-photos`), exibindo miniatura da imagem no formulário e na listagem.
3. **Padronização das Categorias da NR-6:**
   - Hoje o campo de categoria é um texto livre digitado à mão.
   - **Ação dos devs:** Transformar o campo em um `<select>` ou combobox com as categorias oficiais da NR-6 citadas pela equipe:
     - *Proteção da Cabeça* (Capacetes, capuzes)
     - *Proteção Auditiva* (Protetores auriculares, abafadores)
     - *Proteção dos Olhos* (Óculos de segurança)
     - *Proteção da Face* (Protetor facial, máscaras de solda)
     - *Proteção Respiratória* (Máscaras PFF2, respiradores)
     - *Proteção dos Membros Superiores* (Luvas, mangotes)
     - *Proteção dos Membros Inferiores* (Botinas, calçados)
     - *Proteção do Tronco / Corpo Inteiro* (Vestimentas, macacões)
     - *Proteção contra Quedas* (Cintos de segurança, talabartes)
4. **Formatação do Código Sequencial do EPI (`EPI001`, `EPI002`):**
   - Hoje o código é gerado como um corte feio de UUID (`catalog.id.substring(0, 8)` -> `A1B2C3D4`).
   - **Ação dos devs:** Criar uma coluna `code TEXT` sequencial (ex: `EPI001`, `EPI002`...) gerada automaticamente no banco via sequence ou trigger.
5. **Adicionar Campo de "Modelo":**
   - Adicionar o campo `model TEXT` na tabela `epi_catalog` e no formulário, para exibir na tabela a composição `MARCA/MODELO` (ex: Marca: `3M` / Modelo: `H-700`).
6. **Coluna Status no Catálogo:**
   - Adicionar coluna `status TEXT DEFAULT 'ACTIVE'` em `epi_catalog` para exibir o badge `• Ativo` em vez de misturar com o status de estoque.
7. **Organização da Tela Principal de EPIs:**
   - Hoje a rota `/assets` abre em duas abas ("Inventário" e "Catálogo"), caindo por padrão no inventário de rastreio unitário.
   - **Ação dos devs:** Fazer com que a visualização padrão seja a tabela de **Equipamentos de Proteção Individual (Catálogo com Saldos de Estoque)** conforme o mockup da obra. O inventário unitário de rastreio pode ser uma aba secundária ou detalhe do item.
8. **Nomenclaturas:**
   - Trocar título para *"Equipamentos de Proteção Individual - Cadastre e gerencie os EPIs da empresa"*;
   - Trocar botão para `+ Novo EPI`.

---

## 5. CHECKLIST PARA A SPRINT DOS DESENVOLVEDORES

### Camada 1: Banco de Dados (Supabase SQL)
- [ ] Criar tabela `companies` com campos de Informações Gerais, Endereço, Contato, Responsável Legal e Logo;
- [ ] Em `construction_sites`: adicionar `code`, `city`, `manager_name`; tornar `latitude` e `longitude` opcionais (`NULLABLE`);
- [ ] Em `workers`: garantir atualização de `current_role` em gatilhos de promoção;
- [ ] Em `epi_catalog`: adicionar `code` sequencial (`EPI001`...), `model`, `status`;
- [ ] Atualizar RPCs `assign_epi`, `bulk_assign_epis` e `return_epi` para sincronizar e debitar/creditar o `current_stock` de `epi_catalog`.

### Camada 2: Frontend & Telas (React / Tailwind)
- [ ] **Módulo Empresa / Obras (`Sites.tsx`):**
  - [ ] Implementar abas "Dados da Empresa" e "Obras";
  - [ ] Criar visualização e modal de edição da Matriz;
  - [ ] Implementar Tabela de Obras com colunas `CÓDIGO`, `NOME`, `CIDADE`, `RESPONSÁVEL`, `STATUS`, `AÇÕES`;
  - [ ] Upload de imagem da obra para o Supabase Storage.
- [ ] **Módulo Funcionários (`Workers.tsx` e `WorkerForm.tsx`):**
  - [ ] Reestruturar tabela com colunas separadas: `FUNCIONÁRIO` (com email abaixo), `MATRÍCULA`, `CPF`, `SETOR`, `FUNÇÃO`, `ADMISSÃO`, `STATUS`, `AÇÕES` (menu ⋮);
  - [ ] Upload de foto no formulário de cadastro de funcionário;
  - [ ] Modal/Fluxo de "Nova Função / Promoção" com histórico e atualização do cargo vigente na listagem e na ficha PDF.
- [ ] **Módulo de EPIs (`Assets.tsx` e `CatalogTab.tsx`):**
  - [ ] Padronizar tela principal diretamente na tabela de EPIs com saldos consolidados;
  - [ ] Adicionar dropdown de categorias oficiais da NR-6;
  - [ ] Adicionar campo de Modelo e compor a coluna "MARCA/MODELO";
  - [ ] Formatar códigos no padrão `EPI001`;
  - [ ] Upload de fotos de EPIs para o Storage;
  - [ ] Criar modal de "Entrada / Aquisição de Estoque".
