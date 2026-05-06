/**
 * Detect indirect identifiers — contextual phrases that reveal PII without
 * containing it directly (e.g. "my daughter's school in Austin").
 * Returns warnings to surface in the sidebar, not auto-redacted.
 */

const INDIRECT_PATTERNS = [
  {
    type: 'FAMILY_RELATION',
    pattern: /\bmy\s+(daughter|son|wife|husband|mother|father|sister|brother|child|kids?|grandma|grandpa|grandparent|nephew|niece|uncle|aunt|cousin|in-law)\b/gi,
    reason: 'Mentions a family member — could be used to re-identify you',
  },
  {
    type: 'WORK_RELATION',
    pattern: /\bmy\s+(boss|colleague|coworker|co-worker|manager|supervisor|employee|assistant|direct\s+report|team(?:\s+member)?)\b/gi,
    reason: 'Mentions a work relationship — may identify your workplace',
  },
  {
    type: 'LOCATION_HINT',
    pattern: /\b(?:I\s+live|I\s+reside|my\s+(?:home|house|apartment|flat|address)\s+is?)\b/gi,
    reason: 'Hints at your home location',
  },
  {
    type: 'EMPLOYER_HINT',
    pattern: /\b(?:I\s+work\s+(?:at|for)|I(?:'m|\s+am)\s+employed\s+(?:at|by)|my\s+(?:company|employer|workplace|firm|startup))\b/gi,
    reason: 'Hints at your employer',
  },
  {
    type: 'SCHOOL_HINT',
    pattern: /\b(?:I\s+(?:study|go|attend)\s+(?:at|to)|my\s+(?:school|university|college|campus))\b/gi,
    reason: 'Hints at your educational institution',
  },
  {
    type: 'ORIGIN_HINT',
    pattern: /\b(?:I(?:'m|\s+am)\s+from|I\s+(?:was\s+)?born\s+in|I\s+grew\s+up\s+in|my\s+hometown)\b/gi,
    reason: 'Reveals geographic origin',
  },
  {
    type: 'MEDICAL_HINT',
    pattern: /\b(?:I\s+have\s+(?:been\s+diagnosed|a\s+condition)|my\s+(?:doctor|therapist|psychiatrist|diagnosis|medication|prescription))\b/gi,
    reason: 'May reveal medical history',
  },
];

/**
 * @param {string} text
 * @returns {IndirectHit[]}  { type, match, reason, index }
 */
export function semanticScrub(text) {
  const hits = [];
  for (const rule of INDIRECT_PATTERNS) {
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(text)) !== null) {
      hits.push({ type: rule.type, match: m[0], reason: rule.reason, index: m.index });
    }
  }
  return hits;
}
