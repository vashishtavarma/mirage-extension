// Built-in regex PII patterns. Each rule: { type, pattern, confidence }
// confidence: 'high' = auto-redact, 'medium' = flag for review

export const REGEX_RULES = [
  {
    type: 'EMAIL',
    // RFC 5322 simplified — covers 99.9% of real addresses
    pattern: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    confidence: 'high',
  },
  {
    type: 'PHONE',
    // US/international: +1-800-555-0100, (800) 555-0100, 800.555.0100, +44 20 7946 0958
    pattern: /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}\b/g,
    confidence: 'high',
  },
  {
    type: 'SSN',
    // NNN-NN-NNNN — require dashes to reduce false positives
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 'high',
  },
  {
    type: 'CREDIT_CARD',
    // Visa, MC, Amex, Discover — 13-16 digits with optional separators
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|6011|3[47]\d{2})[- ]?\d{4}[- ]?\d{4}[- ]?\d{0,4}\b/g,
    confidence: 'high',
  },
  {
    type: 'IP_ADDRESS',
    // IPv4
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    confidence: 'high',
  },
  {
    type: 'IP_ADDRESS_V6',
    // IPv6 full and compressed forms
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b/g,
    confidence: 'high',
  },
  {
    type: 'DATE_OF_BIRTH',
    // Contextual: "born on", "DOB:", "birthday:" followed by a date
    pattern: /(?:born\s+(?:on\s+)?|dob[:\s]+|date\s+of\s+birth[:\s]+|birthday[:\s]+)(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\w+ \d{1,2},?\s*\d{4})/gi,
    confidence: 'high',
  },
  {
    type: 'IBAN',
    // ISO 13616: 2-letter country + 2 digits + up to 30 alphanumeric
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g,
    confidence: 'medium',
  },
  {
    type: 'PASSPORT',
    // US passport: letter + 8 digits. Common international: 1-2 letters + 6-9 digits
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    confidence: 'medium',
  },
  {
    type: 'API_KEY',
    // Generic high-entropy tokens: sk-, ghp_, Bearer tokens, etc.
    pattern: /\b(?:sk-|ghp_|gho_|github_pat_|xox[baprs]-)[a-zA-Z0-9_\-]{10,}\b/g,
    confidence: 'high',
  },
];
