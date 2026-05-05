// Message types shared between content script and service worker
export const MSG = {
  SANITIZE_PROMPT: 'SANITIZE_PROMPT',
  SANITIZE_RESULT: 'SANITIZE_RESULT',
  SCAN_RESPONSE: 'SCAN_RESPONSE',
  SCAN_RESULT: 'SCAN_RESULT',
  GET_SETTINGS: 'GET_SETTINGS',
  SETTINGS_RESULT: 'SETTINGS_RESULT',
  GET_SESSION_STATS: 'GET_SESSION_STATS',
  SESSION_STATS_RESULT: 'SESSION_STATS_RESULT',
};

export function createMessage(type, payload = {}) {
  return { type, payload };
}

/**
 * Send a message to the service worker using a long-lived port.
 * Ports keep the MV3 service worker alive for the duration of the call,
 * preventing it from being killed mid-response (unlike sendMessage).
 *
 * @param {string} type
 * @param {object} payload
 * @param {number} timeoutMs
 * @returns {Promise<object>}
 */
export function sendToBackground(type, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    let port;
    try {
      port = chrome.runtime.connect({ name: 'privacymesh' });
    } catch (err) {
      reject(new Error(`Failed to connect to service worker: ${err.message}`));
      return;
    }

    const timer = setTimeout(() => {
      port.disconnect();
      reject(new Error('Service worker response timeout'));
    }, timeoutMs);

    port.onMessage.addListener((response) => {
      clearTimeout(timer);
      port.disconnect();
      resolve(response);
    });

    port.onDisconnect.addListener(() => {
      clearTimeout(timer);
      const err = chrome.runtime.lastError;
      reject(new Error(err?.message || 'Service worker port disconnected'));
    });

    port.postMessage(createMessage(type, payload));
  });
}
