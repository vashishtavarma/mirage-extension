import { REGEX_RULES } from './patterns/regex-rules.js';
import { loadCustomRules } from './patterns/custom-rules.js';

// wink-nlp is lazy-loaded on first use to avoid blocking the SW cold start
let nlp = null;
let nlpReady = false;

async function getNlp() {
  if (nlpReady) return nlp;

  // wink-eng-lite-web-model requires DOM (document) — not available in MV3
  // service workers. NER runs in content-script context only (future phase).
  if (typeof document === 'undefined') {
    nlp = null;
    nlpReady = true;
    return nlp;
  }

  try {
    const winkNlp = (await import('wink-nlp')).default;
    const model = (await import('wink-eng-lite-web-model')).default;
    nlp = winkNlp(model);
    nlpReady = true;
    console.log('[PrivacyMesh SW] wink-nlp loaded');
  } catch (err) {
    console.warn('[PrivacyMesh SW] wink-nlp unavailable, NER disabled:', err.message);
    nlp = null;
    nlpReady = true;
  }
  return nlp;
}

// Called at SW startup to pre-load the model before the first real prompt
export function warmupNlp() {
  getNlp().catch(() => {});
}

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

  // --- NLP / NER layer (balanced + strict only) ---
  if (sensitivity !== 'light') {
    const nerDetections = await runNER(text, settings, seen);
    detections.push(...nerDetections);
  }

  // Sort by position in text
  detections.sort((a, b) => a.start - b.start);

  return detections;
}

async function runNER(text, settings, seen) {
  const { sensitivity = 'balanced', detectors = {} } = settings;
  const isEnabled = (type) => detectors[type] !== false;
  const results = [];

  const engine = await getNlp();
  if (!engine) return results;

  try {
    const doc = engine.readDoc(text);
    const its = engine.its;

    doc.entities().each((entity) => {
      const label = entity.out(its.type);   // PERSON, ORG, LOCATION, etc.
      const value = entity.out(its.value);

      // Map wink-nlp labels to our types
      const typeMap = { PERSON: 'PERSON', ORG: 'ORGANIZATION', LOC: 'LOCATION', GPE: 'LOCATION' };
      const type = typeMap[label];
      if (!type || !isEnabled(type)) return;

      // Strict: include all NER hits. Balanced: high-confidence only (approximated by length > 3)
      const confidence = value.length > 3 ? 0.82 : 0.55;
      if (sensitivity === 'balanced' && confidence < 0.7) return;

      const key = `${type}:${value}`;
      if (seen.has(key)) return;
      seen.add(key);

      const start = text.indexOf(value);
      if (start === -1) return;

      results.push({
        type,
        value,
        start,
        end: start + value.length,
        confidence,
        source: 'ner',
      });
    });
  } catch (err) {
    console.warn('[PrivacyMesh] NER error:', err.message);
  }

  return results;
}
