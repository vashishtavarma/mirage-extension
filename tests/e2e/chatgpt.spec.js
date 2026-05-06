/**
 * E2E tests for chat.openai.com
 * Set env vars: OPENAI_EMAIL, OPENAI_PASSWORD
 */
import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '../../');

test.describe('Privacy Mesh on chat.openai.com', () => {
  let browser, page;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [`--disable-extensions-except=${EXT_PATH}`, `--load-extension=${EXT_PATH}`, '--no-sandbox'],
    });
    page = await browser.newPage();
    await page.goto('https://chat.openai.com');
  });

  test.afterAll(() => browser.close());

  test('extension activates on ChatGPT', async () => {
    const log = page.waitForConsoleMessage((m) => m.text().includes('[PrivacyMesh] Active on chatgpt'));
    await page.reload();
    await expect(log).resolves.toBeDefined();
  });

  test('email in prompt triggers redaction', async () => {
    const textarea = page.locator('textarea#prompt-textarea');
    await textarea.fill('My email is test@example.com');
    await page.keyboard.press('Enter');
    const badge = page.locator('#pm-badge-host').locator('text=/redacted/');
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  test('clipboard guard triggers on PII paste', async () => {
    const textarea = page.locator('textarea#prompt-textarea');
    await textarea.focus();
    await page.evaluate(() => {
      navigator.clipboard.writeText('SSN: 123-45-6789');
    });
    await page.keyboard.press('Control+V');
    const toast = page.locator('#pm-clipboard-host').locator('text=PII detected in clipboard');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
