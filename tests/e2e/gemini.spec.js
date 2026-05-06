/**
 * E2E tests for gemini.google.com
 * Set env vars: GOOGLE_EMAIL, GOOGLE_PASSWORD
 */
import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '../../');

test.describe('Privacy Mesh on gemini.google.com', () => {
  let browser, page;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox'],
    });
    page = await browser.newPage();
    await page.goto('https://gemini.google.com');
  });

  test.afterAll(() => browser.close());

  test('extension activates on Gemini', async () => {
    const log = page.waitForConsoleMessage((m) => m.text().includes('[PrivacyMesh] Active on gemini'));
    await page.reload();
    await expect(log).resolves.toBeDefined();
  });

  test('email triggers amber badge', async () => {
    const textarea = page.locator('div[contenteditable="true"]').first();
    await textarea.fill('Contact admin@company.com please');
    await page.keyboard.press('Enter');
    const badge = page.locator('#pm-badge-host').locator('text=/redacted/');
    await expect(badge).toBeVisible({ timeout: 5000 });
  });
});
