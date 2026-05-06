import { MSG } from '../shared/messages.js';
import { clearTokenMap, getTokenMap, mergeTokenMap } from './token-store.js';
import { detectPII } from '../engine/pii-detector.js';
import { anonymize } from '../engine/anonymizer.js';
import { syntheticReplace } from '../engine/synthetic-replacer.js';
import { semanticScrub } from '../engine/semantic-scrubber.js';
import { scanResponse } from '../engine/response-scanner.js';
import { logScan, getLog, clearLog, exportLog } from './audit-log.js';

// --- Port-based message router (keeps SW alive for the full async call) ---

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'privacymesh') return;

  port.onMessage.addListener(async (message) => {
    if (!message || !message.type) return;
    try {
      const result = await handleMessage(message, port.sender);
      port.postMessage(result);
    } catch (err) {
      console.error('[PrivacyMesh SW] Error:', err);
      try { port.postMessage({ error: err.message }); } catch (_) {}
    }
  });
});

// Keep legacy sendMessage support for popup / settings pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;
  handleMessage(message, sender).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(message, sender) {
  const { type, payload } = message;
  switch (type) {
    case MSG.SANITIZE_PROMPT:   return handleSanitizePrompt(payload, sender);
    case MSG.SCAN_RESPONSE:     return handleScanResponse(payload, sender);
    case MSG.GET_SETTINGS:      return handleGetSettings();
    case MSG.GET_SESSION_STATS: return handleGetSessionStats();
    case MSG.GET_AUDIT_LOG:    return { log: await getLog() };
    case MSG.CLEAR_AUDIT_LOG:  await clearLog(); return { ok: true };
    case MSG.EXPORT_AUDIT_LOG: return { json: await exportLog() };
    default: return { error: `Unknown message type: ${type}` };
  }
}

// --- Handlers ---

async function handleSanitizePrompt(payload, sender) {
  const { prompt } = payload;
  const tabId = sender?.tab?.id;
  const t0 = Date.now();

  const settings = await handleGetSettings();

  if (settings.enabled === false) {
    return { type: MSG.SANITIZE_RESULT, sanitizedPrompt: prompt, tokenMap: {}, piiCount: 0, detections: [] };
  }

  // Skip if the tab's domain is in the allowlist
  const domain = sender?.tab?.url ? new URL(sender.tab.url).hostname : '';
  const allowlist = await getAllowlist();
  if (allowlist.some((d) => domain.includes(d))) {
    console.log(`[PrivacyMesh SW] Domain ${domain} is allowlisted — skipping scan`);
    return { type: MSG.SANITIZE_RESULT, sanitizedPrompt: prompt, tokenMap: {}, piiCount: 0, detections: [] };
  }

  const detections = await detectPII(prompt, settings);

  // Synthetic mode: replace PII with realistic fake values instead of tokens
  const useSynthetic = settings.syntheticMode === true;
  const { sanitized, tokenMap } = useSynthetic
    ? syntheticReplace(prompt, detections)
    : anonymize(prompt, detections);

  // Semantic scrubbing: detect indirect identifiers (always runs, results are advisory)
  const semanticHits = settings.semanticScrubbing !== false
    ? semanticScrub(prompt)
    : [];

  if (Object.keys(tokenMap).length && tabId) {
    await mergeTokenMap(tabId, tokenMap);
  }

  await incrementStats(detections.length);

  const elapsed = Date.now() - t0;
  console.log(`[PrivacyMesh SW] Scanned ${prompt.length} chars — ${detections.length} PII found — ${elapsed}ms`);

  // Write to audit log (fire-and-forget, never blocks the response)
  logScan({ prompt, detections, elapsedMs: elapsed, domain }).catch(console.error);

  return {
    type: MSG.SANITIZE_RESULT,
    sanitizedPrompt: sanitized,
    tokenMap,
    piiCount: detections.length,
    detections,
    semanticHits,
    elapsedMs: elapsed,
    timingJitter: settings.timingJitter === true,
  };
}

async function handleScanResponse(payload, sender) {
  const { responseText } = payload;
  const tabId = sender?.tab?.id;
  const tokenMap = tabId ? await getTokenMap(tabId) : {};
  const { echoDetected, warnings } = scanResponse(responseText, tokenMap);
  if (warnings.length) console.warn('[PrivacyMesh SW] Response scan warnings:', warnings);
  return { type: MSG.SCAN_RESULT, echoDetected, warnings };
}

async function handleGetSettings() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings || getDefaultSettings();
}

async function getAllowlist() {
  const result = await chrome.storage.sync.get('domainAllowlist');
  return result.domainAllowlist || [];
}

async function handleGetSessionStats() {
  const result = await chrome.storage.local.get('session_stats');
  return { type: MSG.SESSION_STATS_RESULT, stats: result.session_stats || { promptsProcessed: 0, piiCaught: 0 } };
}

// --- Helpers ---

function getDefaultSettings() {
  return {
    enabled: true,
    sensitivity: 'balanced',
    detectors: {
      EMAIL: true, PHONE: true, SSN: true, CREDIT_CARD: true,
      IP_ADDRESS: true, DATE_OF_BIRTH: true, IBAN: true, PASSPORT: true,
      API_KEY: true, PERSON: true, ORGANIZATION: true, LOCATION: true,
    },
  };
}

async function incrementStats(piiCount) {
  const result = await chrome.storage.local.get('session_stats');
  const stats = result.session_stats || { promptsProcessed: 0, piiCaught: 0 };
  stats.promptsProcessed += 1;
  stats.piiCaught += piiCount;
  await chrome.storage.local.set({ session_stats: stats });
}

// --- Lifecycle ---

chrome.tabs.onRemoved.addListener((tabId) => {
  clearTokenMap(tabId).catch(console.error);
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PrivacyMesh SW] Installed.');
});
