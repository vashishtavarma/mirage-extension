/**
 * Restore tokens in AI response text back to original PII values — for local
 * display only. Never writes de-anonymized content to any storage.
 *
 * @param {string} text  AI response text containing tokens like [EMAIL_01]
 * @param {object} tokenMap  { '[EMAIL_01]': 'user@example.com', ... }
 * @returns {string}
 */
export function deanonymize(text, tokenMap) {
  if (!tokenMap || !Object.keys(tokenMap).length) return text;

  let result = text;
  for (const [token, original] of Object.entries(tokenMap)) {
    // Escape brackets for regex
    const escaped = token.replace(/[[\]]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), original);
  }
  return result;
}
