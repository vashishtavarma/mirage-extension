/**
 * NER runner — executes in the content script context which has DOM access,
 * allowing wink-nlp to initialise its model (the SW context does not have DOM).
 *
 * Called by the interceptor before the sanitise request is sent to the SW,
 * so the SW can combine regex + NER detections in one pass.
 */

let nlp = null;
let nlpLoading = false;
let nlpReady = false;

const TYPE_MAP = { PERSON: 'PERSON', ORG: 'ORGANIZATION', LOC: 'LOCATION', GPE: 'LOCATION' };

async function getEngine() {
  if (nlpReady) return nlp;
  if (nlpLoading) {
    // Wait for the in-flight load
    await new Promise((r) => setTimeout(r, 100));
    return getEngine();
  }
  nlpLoading = true;
  try {
    const [{ default: winkNlp }, { default: model }] = await Promise.all([
      import('wink-nlp'),
      import('wink-eng-lite-web-model'),
    ]);
    nlp = winkNlp(model);
    console.log('[PrivacyMesh] wink-nlp loaded in content script');
  } catch (err) {
    console.warn('[PrivacyMesh] wink-nlp unavailable:', err.message);
    nlp = null;
  }
  nlpReady = true;
  nlpLoading = false;
  return nlp;
}

/**
 * Run NER on text and return detections in the same shape as the regex layer.
 * @param {string} text
 * @param {object} settings  { sensitivity, detectors }
 * @returns {Promise<Detection[]>}
 */
export async function runNER(text, settings = {}) {
  const { sensitivity = 'balanced', detectors = {} } = settings;
  if (sensitivity === 'light') return [];

  const engine = await getEngine();
  if (!engine) return [];

  const results = [];
  const seen = new Set();

  try {
    const doc = engine.readDoc(text);
    const its = engine.its;

    doc.entities().each((entity) => {
      const label = entity.out(its.type);
      const value = entity.out(its.value);
      const type  = TYPE_MAP[label];

      if (!type || detectors[type] === false) return;

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

// Pre-warm on content script load (non-blocking)
getEngine().catch(() => {});
