import { sendToBackground, MSG } from '../shared/messages.js';

const SUPPORTED_HOSTS = ['claude.ai', 'chat.openai.com', 'gemini.google.com'];

async function sendToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // Content script not present on this tab — silently ignore
  }
}

async function init() {
  const toggle = document.getElementById('enabled-toggle');
  const promptsEl = document.getElementById('prompts-processed');
  const piiEl = document.getElementById('pii-caught');
  const settingsLink = document.getElementById('open-settings');
  const sidebarBtn = document.getElementById('open-sidebar');
  const diffBtn = document.getElementById('open-diff');

  // Load enabled state
  const settings = await sendToBackground(MSG.GET_SETTINGS).catch(() => ({ enabled: true }));
  toggle.checked = settings.enabled !== false;

  toggle.addEventListener('change', async () => {
    const current = await sendToBackground(MSG.GET_SETTINGS).catch(() => ({}));
    await chrome.storage.sync.set({ settings: { ...current, enabled: toggle.checked } });
  });

  // Session stats
  const result = await chrome.storage.local.get('session_stats').catch(() => ({}));
  const stats = result.session_stats || { promptsProcessed: 0, piiCaught: 0 };
  promptsEl.textContent = stats.promptsProcessed;
  piiEl.textContent = stats.piiCaught;

  // Show whether current tab is supported
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isSupported = tab?.url && SUPPORTED_HOSTS.some((h) => tab.url.includes(h));
  sidebarBtn.disabled = !isSupported;
  diffBtn.disabled = !isSupported;
  if (!isSupported) {
    sidebarBtn.title = 'Open a supported AI chat tab first';
    diffBtn.title = 'Open a supported AI chat tab first';
  }

  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  sidebarBtn.addEventListener('click', async () => {
    if (tab?.id) { await sendToTab(tab.id, { type: 'TOGGLE_SIDEBAR' }); window.close(); }
  });

  diffBtn.addEventListener('click', async () => {
    if (tab?.id) { await sendToTab(tab.id, { type: 'SHOW_DIFF' }); window.close(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
