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

/**
 * @param {string} type - MSG constant
 * @param {object} payload
 * @returns {{ type: string, payload: object }}
 */
export function createMessage(type, payload = {}) {
  return { type, payload };
}

/**
 * Send a message to the service worker and await the response.
 * @param {string} type
 * @param {object} payload
 * @returns {Promise<object>}
 */
export function sendToBackground(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(createMessage(type, payload), (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
