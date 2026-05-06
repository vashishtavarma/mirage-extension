import { detectPII } from '../../src/engine/pii-detector.js';

// chrome.storage.sync.get is mocked in tests/setup.js (returns {})
// wink-nlp is mocked to return empty entities

const balanced = { sensitivity: 'balanced', detectors: {
  EMAIL: true, PHONE: true, SSN: true, CREDIT_CARD: true,
  IP_ADDRESS: true, DATE_OF_BIRTH: true, IBAN: true, PASSPORT: true,
  API_KEY: true, PERSON: true, ORGANIZATION: true, LOCATION: true,
}};

describe('detectPII() — regex layer', () => {
  test('detects email in prompt', async () => {
    const hits = await detectPII('Hi user@example.com', balanced);
    expect(hits.some((h) => h.type === 'EMAIL')).toBe(true);
    expect(hits.find((h) => h.type === 'EMAIL').value).toBe('user@example.com');
  });

  test('detects SSN', async () => {
    const hits = await detectPII('SSN: 123-45-6789', balanced);
    expect(hits.some((h) => h.type === 'SSN')).toBe(true);
  });

  test('detects phone number', async () => {
    const hits = await detectPII('Call me at (555) 123-4567', balanced);
    expect(hits.some((h) => h.type === 'PHONE')).toBe(true);
  });

  test('detects credit card', async () => {
    const hits = await detectPII('Card: 4111 1111 1111 1111', balanced);
    expect(hits.some((h) => h.type === 'CREDIT_CARD')).toBe(true);
  });

  test('detects IPv4 address', async () => {
    const hits = await detectPII('Server IP: 192.168.1.100', balanced);
    expect(hits.some((h) => h.type === 'IP_ADDRESS')).toBe(true);
  });

  test('detects API key', async () => {
    const hits = await detectPII('My key is sk-abcdefghijklmnopqrstuvwx12345', balanced);
    expect(hits.some((h) => h.type === 'API_KEY')).toBe(true);
  });

  test('detects multiple PII types in one prompt', async () => {
    const text = 'Email: a@b.com, SSN: 111-22-3333, Phone: (555) 123-4567';
    const hits = await detectPII(text, balanced);
    const types = hits.map((h) => h.type);
    expect(types).toContain('EMAIL');
    expect(types).toContain('SSN');
    expect(types).toContain('PHONE');
  });

  test('returns empty array for clean text', async () => {
    const hits = await detectPII('The weather is nice today', balanced);
    expect(hits).toHaveLength(0);
  });

  test('deduplicates the same value detected twice', async () => {
    const hits = await detectPII('a@b.com and a@b.com again', balanced);
    const emails = hits.filter((h) => h.type === 'EMAIL');
    expect(emails).toHaveLength(1);
  });

  test('respects disabled detector', async () => {
    const settings = { ...balanced, detectors: { ...balanced.detectors, EMAIL: false } };
    const hits = await detectPII('user@example.com', settings);
    expect(hits.some((h) => h.type === 'EMAIL')).toBe(false);
  });

  test('light sensitivity skips medium-confidence patterns', async () => {
    const light = { ...balanced, sensitivity: 'light' };
    // IBAN and PASSPORT are medium confidence
    const hits = await detectPII('Passport: AB1234567', light);
    expect(hits.some((h) => h.type === 'PASSPORT')).toBe(false);
  });

  test('returns detections sorted by start position', async () => {
    const text = 'SSN: 123-45-6789 and email: z@z.com';
    const hits = await detectPII(text, balanced);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i].start).toBeGreaterThanOrEqual(hits[i - 1].start);
    }
  });

  test('each detection has required fields', async () => {
    const hits = await detectPII('user@example.com', balanced);
    for (const hit of hits) {
      expect(hit).toHaveProperty('type');
      expect(hit).toHaveProperty('value');
      expect(hit).toHaveProperty('start');
      expect(hit).toHaveProperty('end');
      expect(hit).toHaveProperty('confidence');
      expect(hit).toHaveProperty('source');
      expect(hit.end).toBeGreaterThan(hit.start);
    }
  });

  test('performance: scans 4000-token prompt under 80ms', async () => {
    // ~4000 tokens ≈ 16000 chars
    const longText = 'The quick brown fox jumps over the lazy dog. '.repeat(360)
      + 'user@example.com SSN: 123-45-6789';
    const t0 = Date.now();
    await detectPII(longText, balanced);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(80);
  });
});
