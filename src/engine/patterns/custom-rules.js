// Loads user-defined regex patterns from chrome.storage.sync.
// Returns an array in the same shape as REGEX_RULES.

export async function loadCustomRules() {
  try {
    const result = await chrome.storage.sync.get('customRules');
    const raw = result.customRules || [];
    return raw
      .filter((r) => r.pattern && r.type)
      .map((r) => ({
        type: r.type.toUpperCase(),
        pattern: new RegExp(r.pattern, 'g'),
        confidence: r.confidence || 'high',
        custom: true,
      }));
  } catch {
    return [];
  }
}
