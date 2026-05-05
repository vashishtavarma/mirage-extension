import { sendToBackground, MSG } from '../shared/messages.js';

async function init() {
  const toggle = document.getElementById('enabled-toggle');
  const promptsEl = document.getElementById('prompts-processed');
  const piiEl = document.getElementById('pii-caught');
  const settingsLink = document.getElementById('open-settings');

  // Load persisted enabled state
  const settings = await sendToBackground(MSG.GET_SETTINGS).catch(() => ({ enabled: true }));
  toggle.checked = settings.enabled !== false;

  toggle.addEventListener('change', async () => {
    const current = await sendToBackground(MSG.GET_SETTINGS).catch(() => ({}));
    await chrome.storage.sync.set({ settings: { ...current, enabled: toggle.checked } });
  });

  // Load session stats
  const result = await chrome.storage.local.get('session_stats').catch(() => ({}));
  const stats = result.session_stats || { promptsProcessed: 0, piiCaught: 0 };
  promptsEl.textContent = stats.promptsProcessed;
  piiEl.textContent = stats.piiCaught;

  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
}

document.addEventListener('DOMContentLoaded', init);
