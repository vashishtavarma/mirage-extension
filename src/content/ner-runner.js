import winkNlp from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

const TYPE_MAP = { PERSON: 'PERSON', ORG: 'ORGANIZATION', LOC: 'LOCATION', GPE: 'LOCATION' };

let nlp = null;
try {
  nlp = winkNlp(model);
} catch (err) {
  console.warn('[PrivacyMesh] wink-nlp init failed:', err.message);
}

export async function runNER(text, settings = {}) {
  const { sensitivity = 'balanced', detectors = {} } = settings;
  if (sensitivity === 'light' || !nlp) return [];

  const results = [];
  const seen = new Set();

  try {
    const doc = nlp.readDoc(text);
    const its = nlp.its;

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

      results.push({ type, value, start, end: start + value.length, confidence, source: 'ner' });
    });
  } catch (err) {
    console.warn('[PrivacyMesh] NER error:', err.message);
  }

  return results;
}
