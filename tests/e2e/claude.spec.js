/**
 * E2E tests for claude.ai — requires a real Claude account.
 * Run with: npx playwright test tests/e2e/claude.spec.js
 *
 * Set env vars before running:
 *   CLAUDE_EMAIL=your@email.com
 *   CLAUDE_PASSWORD=yourpassword
 */
import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = path.resolve(__dirname, '../../');

test.describe('Privacy Mesh on claude.ai', () => {
  let browser, context, page;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        '--no-sandbox',
      ],
    });
    page = await browser.newPage();
    await page.goto('https://claude.ai');
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('P1: extension injects and content script activates', async () => {
    const log = page.waitForConsoleMessage((msg) =>
      msg.text().includes('[PrivacyMesh] Active on claude')
    );
    await page.reload();
    await expect(log).resolves.toBeDefined();
  });

  test('P2: email in textarea shows amber badge', async () => {
    const textarea = page.locator('div[contenteditable="true"]').first();
    await textarea.fill('Hi user@example.com');
    await page.keyboard.press('Enter');
    const badge = page.locator('#pm-badge-host').locator('text=/item.*redacted/');
    await expect(badge).toBeVisible({ timeout: 5000 });
  });

  test('P3: SSN triggers high-risk banner', async () => {
    const textarea = page.locator('div[contenteditable="true"]').first();
    await textarea.fill('My SSN is 123-45-6789');
    await page.keyboard.press('Enter');
    const banner = page.locator('#pm-banner-host').locator('text=High-risk data detected');
    await expect(banner).toBeVisible({ timeout: 5000 });
  });

  test('P4: sidebar shows token map after redaction', async () => {
    const sidebar = page.locator('#pm-sidebar-host').locator('.panel.open');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    const tokenEntry = sidebar.locator('.token');
    await expect(tokenEntry).toBeVisible();
  });

  test('P5: prompt received by Claude has token not original email', async () => {
    // Check last sent message in the conversation
    const sentMsg = page.locator('[data-testid="user-message"]').last();
    await expect(sentMsg).not.toContainText('user@example.com');
    await expect(sentMsg).toContainText('[EMAIL_');
  });

  test('P6: settings page loads and EMAIL toggle works', async () => {
    const settingsPage = await browser.newPage();
    const extId = await getExtensionId(browser);
    await settingsPage.goto(`chrome-extension://${extId}/dist/settings.html`);
    const emailToggle = settingsPage.locator('[data-detector="EMAIL"]');
    await emailToggle.uncheck();
    await settingsPage.click('#save');
    await settingsPage.close();
  });
});

async function getExtensionId(context) {
  const backgrounds = context.serviceWorkers();
  if (backgrounds.length) {
    const url = backgrounds[0].url();
    return url.split('/')[2];
  }
  return 'unknown';
}
