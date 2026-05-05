/**
 * Replace detected PII with deterministic tokens and return the sanitized text
 * plus the token map { '[EMAIL_01]': 'user@example.com' }.
 *
 * @param {string} text
 * @param {Detection[]} detections  sorted by start position
 * @returns {{ sanitized: string, tokenMap: object }}
 */
export function anonymize(text, detections) {
  if (!detections.length) return { sanitized: text, tokenMap: {} };

  const tokenMap = {};
  const counters = {};
  let result = '';
  let cursor = 0;

  for (const det of detections) {
    // Append text before this detection unchanged
    result += text.slice(cursor, det.start);

    // Build a deterministic token
    const base = det.type;
    counters[base] = (counters[base] || 0) + 1;
    const token = `[${base}_${String(counters[base]).padStart(2, '0')}]`;

    tokenMap[token] = det.value;
    result += token;
    cursor = det.end;
  }

  // Append remaining text
  result += text.slice(cursor);

  return { sanitized: result, tokenMap };
}
