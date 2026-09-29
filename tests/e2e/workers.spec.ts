import { test, expect } from '@playwright/test';

test.describe('Workers Page E2E', () => {
  test('should load workers, allow searching and display pagination', async ({ page }) => {
    // 1) Go to http://localhost:5176/workers
    await page.goto('http://localhost:5176/workers');

    // 2) Check if a heading contains 'Funcionários'
    const heading = page.getByRole('heading', { name: /Funcionários/i });
    await expect(heading).toBeVisible();

    // 3) Test the search input by typing something
    // Look for a textbox, usually there's one for filtering the table
    const searchInput = page.getByRole('textbox').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('João Silva');
    await expect(searchInput).toHaveValue('João Silva');

    // Clear search for pagination test
    await searchInput.fill('');

    // 4) Test the pagination controls exist
    const prevButton = page.getByRole('button', { name: 'Página Anterior' });
    const nextButton = page.getByRole('button', { name: 'Próxima Página' });

    // We can just verify the buttons are in the DOM (they might be disabled if there's only 1 page or no data)
    await expect(prevButton).toBeAttached();
    await expect(nextButton).toBeAttached();
  });
});
