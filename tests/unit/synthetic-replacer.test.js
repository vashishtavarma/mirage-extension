import { syntheticReplace } from '../../src/engine/synthetic-replacer.js';

const makeDetection = (type, value, start) => ({
  type, value, start, end: start + value.length, confidence: 0.95, source: 'regex',
});

describe('syntheticReplace()', () => {
  test('returns original when no detections', () => {
    const { sanitized, tokenMap } = syntheticReplace('Hello world', []);
    expect(sanitized).toBe('Hello world');
    expect(tokenMap).toEqual({});
  });

  test('replaces email with realistic-looking synthetic value', () => {
    const { sanitized } = syntheticReplace(
      'Contact user@example.com',
      [makeDetection('EMAIL', 'user@example.com', 8)]
    );
    expect(sanitized).not.toContain('user@example.com');
    expect(sanitized).toMatch(/.+@.+\..+/); // still looks like an email
  });

  test('replaces phone with realistic-looking number', () => {
    const { sanitized } = syntheticReplace(
      'Call 555-123-4567',
      [makeDetection('PHONE', '555-123-4567', 5)]
    );
    expect(sanitized).not.toContain('555-123-4567');
  });

  test('maintains reverse map for de-anonymization', () => {
    const original = 'user@real.com';
    const { sanitized, tokenMap } = syntheticReplace(
      original,
      [makeDetection('EMAIL', original, 0)]
    );
    // The synthetic value maps back to the original
    expect(Object.values(tokenMap)).toContain(original);
    // The sanitized text is the synthetic value (the key in tokenMap)
    const synthetic = Object.keys(tokenMap)[0];
    expect(sanitized).toBe(synthetic);
  });

  test('generates unique synthetics for different detections', () => {
    const text = 'a@x.com and b@y.com';
    const { tokenMap } = syntheticReplace(text, [
      makeDetection('EMAIL', 'a@x.com', 0),
      makeDetection('EMAIL', 'b@y.com', 12),
    ]);
    const keys = Object.keys(tokenMap);
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  test('handles PERSON type', () => {
    const { sanitized } = syntheticReplace(
      'John Smith called',
      [makeDetection('PERSON', 'John Smith', 0)]
    );
    expect(sanitized).not.toContain('John Smith');
    expect(sanitized.split(' ').length).toBeGreaterThanOrEqual(2); // still a name-like value
  });

  test('SSN replaced with a different SSN-like value', () => {
    const { sanitized } = syntheticReplace(
      'SSN: 123-45-6789',
      [makeDetection('SSN', '123-45-6789', 5)]
    );
    expect(sanitized).not.toContain('123-45-6789');
    expect(sanitized).toMatch(/\d{3}-\d{2}-\d{4}/);
  });
});
