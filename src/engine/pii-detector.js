import { REGEX_RULES } from './patterns/regex-rules.js';
import { loadCustomRules } from './patterns/custom-rules.js';

/**
 * Detect all PII in a prompt.
 * @param {string} text
 * @param {object} settings  - { sensitivity, detectors }
 * @returns {Promise<Detection[]>}
 *
 * Detection: { type, value, start, end, confidence, source: 'regex'|'ner' }
 */
export async function detectPII(text, settings = {}) {
  const { sensitivity = 'balanced', detectors = {} } = settings;
  const isEnabled = (type) => detectors[type] !== false;

  const detections = [];
  const seen = new Set(); // deduplicate by value+type

  // --- Regex layer ---
  const customRules = await loadCustomRules();
  const allRules = [...REGEX_RULES, ...customRules];

  for (const rule of allRules) {
    if (!isEnabled(rule.type)) continue;
    if (rule.confidence === 'medium' && sensitivity === 'light') continue;

    // Reset lastIndex before each use (global regex reuse pitfall)
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      const key = `${rule.type}:${match[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      detections.push({
        type: rule.type,
        value: match[0],
        start: match.index,
        end: match.index + match[0].length,
        confidence: rule.confidence === 'high' ? 0.95 : 0.65,
        source: 'regex',
      });
    }
  }

  detections.sort((a, b) => a.start - b.start);
  return detections;
}
