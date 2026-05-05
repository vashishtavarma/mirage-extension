import { MSG } from '../shared/messages.js';
import { clearTokenMap } from './token-store.js';

// --- Message Router ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => {
      console.error('[PrivacyMesh SW] Error handling message:', err);
      sendResponse({ error: err.message });
    });

  // Return true to keep the message channel open for async response
  return true;
});

async function handleMessage(message, sender) {
  const { type, payload } = message;

  switch (type) {
    case MSG.SANITIZE_PROMPT:
      return handleSanitizePrompt(payload, sender);

    case MSG.SCAN_RESPONSE:
      return handleScanResponse(payload, sender);

    case MSG.GET_SETTINGS:
      return handleGetSettings();

    case MSG.GET_SESSION_STATS:
      return handleGetSessionStats(sender);

    default:
      console.warn('[PrivacyMesh SW] Unknown message type:', type);
      return { error: `Unknown message type: ${type}` };
  }
}

// --- Handlers (stubs — filled in Phase 2/4) ---

async function handleSanitizePrompt(payload, sender) {
  const { prompt } = payload;
  const tabId = sender.tab?.id;

  console.log(`[PrivacyMesh SW] INTERCEPTED prompt from tab ${tabId} (${prompt.length} chars)`);

  // Phase 1 stub: pass prompt through unchanged, no PII detection yet
  return {
    type: MSG.SANITIZE_RESULT,
    sanitizedPrompt: prompt,
    tokenMap: {},
    piiCount: 0,
    detections: [],
  };
}

async function handleScanResponse(payload, sender) {
  const { responseText } = payload;
  console.log(`[PrivacyMesh SW] Scanning response (${responseText.length} chars)`);

  // Phase 2 stub
  return { type: MSG.SCAN_RESULT, piiEchoDetected: false, warnings: [] };
}

async function handleGetSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || getDefaultSettings();
}

async function handleGetSessionStats(sender) {
  const tabId = sender.tab?.id;
  const result = await chrome.storage.local.get('session_stats');
  const stats = result.session_stats || { promptsProcessed: 0, piiCaught: 0 };
  return { type: MSG.SESSION_STATS_RESULT, tabId, stats };
}

function getDefaultSettings() {
  return {
    enabled: true,
    sensitivity: 'balanced',
    detectors: {
      EMAIL: true,
      PHONE: true,
      SSN: true,
      CREDIT_CARD: true,
      IP_ADDRESS: true,
      DATE_OF_BIRTH: true,
      IBAN: true,
      PASSPORT: true,
      PERSON: true,
      ORGANIZATION: true,
      LOCATION: true,
    },
  };
}

// --- Lifecycle ---

// Clear token map when a tab is closed to prevent stale PII tokens
chrome.tabs.onRemoved.addListener((tabId) => {
  clearTokenMap(tabId).catch((err) =>
    console.error('[PrivacyMesh SW] Failed to clear token map for tab', tabId, err)
  );
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PrivacyMesh SW] Installed and ready.');
});
