import { anonymize } from '../../src/engine/anonymizer.js';

const makeDetection = (type, value, start) => ({
  type, value, start, end: start + value.length, confidence: 0.95, source: 'regex',
});

describe('anonymize()', () => {
  test('returns original text unchanged when no detections', () => {
    const { sanitized, tokenMap } = anonymize('Hello world', []);
    expect(sanitized).toBe('Hello world');
    expect(tokenMap).toEqual({});
  });

  test('replaces a single PII value with a token', () => {
    const text = 'Hi user@example.com how are you';
    const { sanitized, tokenMap } = anonymize(text, [
      makeDetection('EMAIL', 'user@example.com', 3),
    ]);
    expect(sanitized).toBe('Hi [EMAIL_01] how are you');
    expect(tokenMap['[EMAIL_01]']).toBe('user@example.com');
  });

  test('replaces multiple different types with sequential tokens', () => {
    const text = 'Email: a@b.com Phone: 555-123-4567';
    const detections = [
      makeDetection('EMAIL', 'a@b.com', 7),
      makeDetection('PHONE', '555-123-4567', 22),
    ];
    const { sanitized, tokenMap } = anonymize(text, detections);
    expect(sanitized).toBe('Email: [EMAIL_01] Phone: [PHONE_01]');
    expect(tokenMap['[EMAIL_01]']).toBe('a@b.com');
    expect(tokenMap['[PHONE_01]']).toBe('555-123-4567');
  });

  test('uses separate counter per type', () => {
    const text = 'a@x.com and b@y.com';
    const detections = [
      makeDetection('EMAIL', 'a@x.com', 0),
      makeDetection('EMAIL', 'b@y.com', 12),
    ];
    const { sanitized, tokenMap } = anonymize(text, detections);
    expect(sanitized).toBe('[EMAIL_01] and [EMAIL_02]');
    expect(tokenMap['[EMAIL_01]']).toBe('a@x.com');
    expect(tokenMap['[EMAIL_02]']).toBe('b@y.com');
  });

  test('pads token counter to 2 digits', () => {
    const text = Array.from({ length: 9 }, (_, i) => `user${i}@x.com`).join(' ');
    const detections = text.match(/user\d@x\.com/g).map((v, i) => ({
      type: 'EMAIL', value: v,
      start: text.indexOf(v, i === 0 ? 0 : text.indexOf(text.match(/user\d@x\.com/g)[i - 1]) + 1),
      end: 0, confidence: 0.95, source: 'regex',
    }));
    // Recalculate proper positions
    let cursor = 0;
    const fixed = [];
    for (const m of text.matchAll(/user\d@x\.com/g)) {
      fixed.push(makeDetection('EMAIL', m[0], m.index));
    }
    const { tokenMap } = anonymize(text, fixed);
    expect('[EMAIL_09]' in tokenMap).toBe(true);
  });

  test('preserves text before and after detection', () => {
    const text = 'prefix SSN: 123-45-6789 suffix';
    const { sanitized } = anonymize(text, [makeDetection('SSN', '123-45-6789', 12)]);
    expect(sanitized.startsWith('prefix SSN: ')).toBe(true);
    expect(sanitized.endsWith(' suffix')).toBe(true);
  });

  test('handles detection at start of string', () => {
    const { sanitized } = anonymize('a@b.com is the email', [makeDetection('EMAIL', 'a@b.com', 0)]);
    expect(sanitized).toBe('[EMAIL_01] is the email');
  });

  test('handles detection at end of string', () => {
    const { sanitized } = anonymize('email is a@b.com', [makeDetection('EMAIL', 'a@b.com', 9)]);
    expect(sanitized).toBe('email is [EMAIL_01]');
  });

  test('100% token round-trip — all values recoverable from map', () => {
    const text = 'Name: John, Email: john@x.com, SSN: 111-22-3333';
    const detections = [
      makeDetection('PERSON', 'John', 6),
      makeDetection('EMAIL', 'john@x.com', 19),
      makeDetection('SSN', '111-22-3333', 36),
    ];
    const { tokenMap } = anonymize(text, detections);
    expect(Object.keys(tokenMap)).toHaveLength(3);
    expect(Object.values(tokenMap)).toContain('John');
    expect(Object.values(tokenMap)).toContain('john@x.com');
    expect(Object.values(tokenMap)).toContain('111-22-3333');
  });
});
