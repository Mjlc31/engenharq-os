# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/e2e/workers.spec.ts >> Workers Page E2E >> should load workers, allow searching and display pagination
- Location: tests/e2e/workers.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Funcionários/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: /Funcionários/i }) with timeout 5000ms
  - waiting for getByRole('heading', { name: /Funcionários/i })

```

```yaml
- img "EngenharQ OS Logo"
- img "3D Safety Helmet"
- heading "Padrão Ouro em Segurança Operacional" [level=1]
- paragraph: Plataforma preditiva para controle de EPIs, conformidade com a NR-6 e rastreabilidade em tempo real de colaboradores no canteiro de obras.
- text: Industrial Security Protocol • v2.4.0
- heading "Autenticação" [level=2]
- paragraph: Insira suas credenciais corporativas para acessar o sistema.
- text: Email Corporativo
- textbox "engenheiro@construtora.com"
- text: Senha
- button "Esqueceu?"
- textbox "••••••••"
- button "Acessar Workspace"
- button "Cadastrar Novo Usuário"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Workers Page E2E', () => {
  4  |   test('should load workers, allow searching and display pagination', async ({ page }) => {
  5  |     // 1) Go to http://localhost:5176/workers
  6  |     await page.goto('http://localhost:5176/workers');
  7  | 
  8  |     // 2) Check if a heading contains 'Funcionários'
  9  |     const heading = page.getByRole('heading', { name: /Funcionários/i });
> 10 |     await expect(heading).toBeVisible();
     |                           ^ Error: expect(locator).toBeVisible() failed
  11 | 
  12 |     // 3) Test the search input by typing something
  13 |     // Look for a textbox, usually there's one for filtering the table
  14 |     const searchInput = page.getByRole('textbox').first();
  15 |     await expect(searchInput).toBeVisible();
  16 |     await searchInput.fill('João Silva');
  17 |     await expect(searchInput).toHaveValue('João Silva');
  18 | 
  19 |     // Clear search for pagination test
  20 |     await searchInput.fill('');
  21 | 
  22 |     // 4) Test the pagination controls exist
  23 |     const prevButton = page.getByRole('button', { name: 'Página Anterior' });
  24 |     const nextButton = page.getByRole('button', { name: 'Próxima Página' });
  25 | 
  26 |     // We can just verify the buttons are in the DOM (they might be disabled if there's only 1 page or no data)
  27 |     await expect(prevButton).toBeAttached();
  28 |     await expect(nextButton).toBeAttached();
  29 |   });
  30 | });
  31 | 
```