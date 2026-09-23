const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER_ERROR:', error));
  
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);
  
  await page.fill('input[type="email"]', 'admin@engenharq.com');
  await page.fill('input[type="password"]', 'JHFENGQ123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  console.log('Logged in. Navigating to scanner...');
  await page.click('text=Almoxarifado');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'scanner_crash.png' });
  await browser.close();
})();
