const STORAGE_KEY = 'audit_log';
const DEFAULT_RETENTION_DAYS = 30;

/**
 * Append one entry to the audit log.
 * Stores only metadata — never raw prompt content.
 */
export async function logScan({ prompt, detections, elapsedMs, domain }) {
  const settings = await getRetentionDays();
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: Date.now(),
    promptHash: hashText(prompt),
    promptLength: prompt.length,
    piiTypes: [...new Set(detections.map((d) => d.type))],
    piiCount: detections.length,
    elapsedMs,
    domain: domain || 'unknown',
  };

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const log = result[STORAGE_KEY] || [];
  log.push(entry);

  // Purge entries older than retention period
  const cutoff = Date.now() - settings * 24 * 60 * 60 * 1000;
  const pruned = log.filter((e) => e.timestamp >= cutoff);

  await chrome.storage.local.set({ [STORAGE_KEY]: pruned });
}

export async function getLog() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

export async function clearLog() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export async function exportLog() {
  const log = await getLog();
  return JSON.stringify(log, null, 2);
}

async function getRetentionDays() {
  const result = await chrome.storage.sync.get('settings');
  return result.settings?.auditRetentionDays ?? DEFAULT_RETENTION_DAYS;
}

// Simple djb2 hash — identifies a prompt without storing its content
function hashText(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return (hash >>> 0).toString(16);
}
