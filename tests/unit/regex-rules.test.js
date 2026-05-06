import { REGEX_RULES } from '../../src/engine/patterns/regex-rules.js';
import samples from '../fixtures/pii-samples.json';

function matchAll(pattern, text) {
  const re = new RegExp(pattern.source, pattern.flags);
  re.lastIndex = 0;
  const matches = [];
  let m;
  while ((m = re.exec(text)) !== null) matches.push(m[0]);
  return matches;
}

function ruleFor(type) {
  return REGEX_RULES.find((r) => r.type === type);
}

// ── EMAIL ─────────────────────────────────────────────────────────────────────
describe('EMAIL regex', () => {
  const rule = ruleFor('EMAIL');

  test('detects standard addresses', () => {
    for (const email of samples.EMAIL.positive) {
      const hits = matchAll(rule.pattern, email);
      expect(hits.length).toBeGreaterThan(0);
    }
  });

  test('rejects non-email strings', () => {
    for (const neg of samples.EMAIL.negative) {
      const hits = matchAll(rule.pattern, neg);
      expect(hits.length).toBe(0);
    }
  });

  test('detects email inside a sentence', () => {
    const hits = matchAll(rule.pattern, 'Contact me at user@example.com for details');
    expect(hits).toContain('user@example.com');
  });

  test('detects multiple emails in one string', () => {
    const hits = matchAll(rule.pattern, 'From a@x.com to b@y.org');
    expect(hits).toHaveLength(2);
  });
});

// ── PHONE ─────────────────────────────────────────────────────────────────────
describe('PHONE regex', () => {
  const rule = ruleFor('PHONE');

  test('detects US phone formats', () => {
    const positives = ['(555) 123-4567', '555.123.4567', '555-123-4567', '+1-800-555-0100'];
    for (const p of positives) {
      expect(matchAll(rule.pattern, p).length).toBeGreaterThan(0);
    }
  });

  test('does not match short numeric strings', () => {
    expect(matchAll(rule.pattern, '12345').length).toBe(0);
    expect(matchAll(rule.pattern, '555-12').length).toBe(0);
  });
});

// ── SSN ───────────────────────────────────────────────────────────────────────
describe('SSN regex', () => {
  const rule = ruleFor('SSN');

  test('detects NNN-NN-NNNN format', () => {
    for (const ssn of samples.SSN.positive) {
      expect(matchAll(rule.pattern, ssn).length).toBeGreaterThan(0);
    }
  });

  test('requires dashes — does not match plain digits', () => {
    for (const neg of samples.SSN.negative) {
      expect(matchAll(rule.pattern, neg).length).toBe(0);
    }
  });

  test('detects SSN in sentence context', () => {
    const hits = matchAll(rule.pattern, 'My SSN is 123-45-6789 on file');
    expect(hits).toContain('123-45-6789');
  });
});

// ── CREDIT CARD ───────────────────────────────────────────────────────────────
describe('CREDIT_CARD regex', () => {
  const rule = ruleFor('CREDIT_CARD');

  test('detects Visa test card', () => {
    expect(matchAll(rule.pattern, '4111111111111111').length).toBeGreaterThan(0);
    expect(matchAll(rule.pattern, '4111 1111 1111 1111').length).toBeGreaterThan(0);
  });

  test('detects Mastercard range', () => {
    expect(matchAll(rule.pattern, '5500000000000004').length).toBeGreaterThan(0);
  });

  test('rejects all-zeros', () => {
    expect(matchAll(rule.pattern, '0000000000000000').length).toBe(0);
  });
});

// ── IP ADDRESS ────────────────────────────────────────────────────────────────
describe('IP_ADDRESS regex', () => {
  const rule = ruleFor('IP_ADDRESS');

  test('detects valid IPv4 addresses', () => {
    for (const ip of samples.IP_ADDRESS.positive) {
      expect(matchAll(rule.pattern, ip).length).toBeGreaterThan(0);
    }
  });

  test('rejects invalid octets (256+)', () => {
    expect(matchAll(rule.pattern, '256.0.0.1').length).toBe(0);
  });

  test('rejects incomplete addresses', () => {
    expect(matchAll(rule.pattern, '192.168.1').length).toBe(0);
  });
});

// ── API KEY ───────────────────────────────────────────────────────────────────
describe('API_KEY regex', () => {
  const rule = ruleFor('API_KEY');

  test('detects sk- prefixed keys', () => {
    // TESTONLY — not a real key
    expect(matchAll(rule.pattern, 'sk-TESTONLY_abcdefghijklmnopqrstuvwxyz').length).toBeGreaterThan(0);
  });

  test('detects ghp_ prefixed tokens', () => {
    // TESTONLY — not a real token
    expect(matchAll(rule.pattern, 'ghp_TESTONLY1234567890abcdefghijklmnop').length).toBeGreaterThan(0);
  });

  test('detects github_pat_ prefixed tokens', () => {
    // TESTONLY — not a real token
    expect(matchAll(rule.pattern, 'github_pat_TESTONLY_abcdefghijklmnopqrstuvwx').length).toBeGreaterThan(0);
  });

  test('rejects bare prefixes without token body', () => {
    expect(matchAll(rule.pattern, 'sk-').length).toBe(0);
    expect(matchAll(rule.pattern, 'ghp_').length).toBe(0);
  });
});

// ── DATE OF BIRTH ─────────────────────────────────────────────────────────────
describe('DATE_OF_BIRTH regex', () => {
  const rule = ruleFor('DATE_OF_BIRTH');

  test('detects contextual DOB patterns', () => {
    const hits = matchAll(rule.pattern, 'DOB: 01/15/1990');
    expect(hits.length).toBeGreaterThan(0);
  });

  test('detects born-on patterns', () => {
    expect(matchAll(rule.pattern, 'born on 03/22/1985').length).toBeGreaterThan(0);
  });

  test('does not match bare dates without context', () => {
    expect(matchAll(rule.pattern, '01/15/1990').length).toBe(0);
  });
});

// ── IBAN ──────────────────────────────────────────────────────────────────────
describe('IBAN regex', () => {
  const rule = ruleFor('IBAN');

  test('detects standard IBANs', () => {
    for (const iban of samples.IBAN.positive) {
      expect(matchAll(rule.pattern, iban).length).toBeGreaterThan(0);
    }
  });

  test('rejects short strings', () => {
    expect(matchAll(rule.pattern, 'GB12').length).toBe(0);
  });
});
