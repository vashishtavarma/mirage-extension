// Wraps chrome.storage.session for PII token maps.
// Tokens are scoped per-tab and wiped when the tab closes.

const KEY_PREFIX = 'token_map_tab_';

export async function saveTokenMap(tabId, tokenMap) {
  await chrome.storage.session.set({ [`${KEY_PREFIX}${tabId}`]: tokenMap });
}

export async function getTokenMap(tabId) {
  const result = await chrome.storage.session.get(`${KEY_PREFIX}${tabId}`);
  return result[`${KEY_PREFIX}${tabId}`] || {};
}

export async function clearTokenMap(tabId) {
  await chrome.storage.session.remove(`${KEY_PREFIX}${tabId}`);
}

export async function mergeTokenMap(tabId, newTokens) {
  const existing = await getTokenMap(tabId);
  await saveTokenMap(tabId, { ...existing, ...newTokens });
}
