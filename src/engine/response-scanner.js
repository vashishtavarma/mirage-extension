import { REGEX_RULES } from './patterns/regex-rules.js';

/**
 * Scan an AI response for:
 * 1. Tokens that were echoed back (the AI repeated a [TOKEN] verbatim)
 * 2. Raw PII patterns that appeared in the response (hallucinated or echoed)
 *
 * @param {string} responseText
 * @param {object} tokenMap  session token map for current tab
 * @returns {{ echoDetected: boolean, warnings: Warning[] }}
 *
 * Warning: { type, value, reason }
 */
export function scanResponse(responseText, tokenMap = {}) {
  const warnings = [];

  // 1. Check if any tokens were echoed back verbatim
  for (const token of Object.keys(tokenMap)) {
    if (responseText.includes(token)) {
      warnings.push({
        type: 'TOKEN_ECHO',
        value: token,
        reason: `AI echoed the redaction token ${token} in its response`,
      });
    }
  }

  // 2. Scan for raw PII patterns in the response
  const highRiskTypes = new Set(['EMAIL', 'SSN', 'CREDIT_CARD', 'IBAN', 'PASSPORT']);

  for (const rule of REGEX_RULES) {
    if (!highRiskTypes.has(rule.type)) continue;
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(responseText)) !== null) {
      warnings.push({
        type: 'PII_IN_RESPONSE',
        value: match[0],
        reason: `AI response contains what looks like a ${rule.type}`,
      });
    }
  }

  return {
    echoDetected: warnings.length > 0,
    warnings,
  };
}
