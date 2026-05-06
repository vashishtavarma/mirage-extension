/**
 * Metadata Normalization — reduces side-channel information leakage.
 *
 * Timing jitter: adds a random delay before submission so prompt send-times
 * cannot be correlated with user activity patterns.
 *
 * Length bucketing: note — true network-level padding isn't possible in MV3
 * (no blocking webRequest). This module pads the sanitized prompt text to the
 * nearest 256-word bucket with trailing whitespace the AI ignores, providing
 * a best-effort defense against prompt-length inference.
 */

const BUCKET_SIZE_WORDS = 256;
const JITTER_MIN_MS = 50;
const JITTER_MAX_MS = 250;

/**
 * Applies random timing jitter. Call this before resuming submit.
 * @returns {Promise<void>}
 */
export function applyTimingJitter() {
  const delay = JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Pads the sanitized prompt text to the nearest word-count bucket.
 * Padding is trailing whitespace — ignored by AI models.
 * @param {string} text
 * @returns {string}
 */
export function padToBucket(text) {
  const words = text.trim().split(/\s+/).length;
  const target = Math.ceil(words / BUCKET_SIZE_WORDS) * BUCKET_SIZE_WORDS;
  const needed = target - words;
  if (needed <= 0) return text;
  // Trailing spaces — model tokenizers strip them, providing length normalization
  return text + ' '.repeat(needed);
}
