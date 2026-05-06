import { deanonymize } from '../../src/engine/deanonymizer.js';

describe('deanonymize()', () => {
  test('returns text unchanged when tokenMap is empty', () => {
    expect(deanonymize('Hello [EMAIL_01]', {})).toBe('Hello [EMAIL_01]');
  });

  test('restores a single token', () => {
    const result = deanonymize(
      'Contact [EMAIL_01] for info',
      { '[EMAIL_01]': 'user@example.com' }
    );
    expect(result).toBe('Contact user@example.com for info');
  });

  test('restores multiple different tokens', () => {
    const result = deanonymize(
      '[EMAIL_01] called [PHONE_01]',
      { '[EMAIL_01]': 'a@b.com', '[PHONE_01]': '555-0100' }
    );
    expect(result).toBe('a@b.com called 555-0100');
  });

  test('restores repeated occurrences of same token', () => {
    const result = deanonymize(
      '[EMAIL_01] and also [EMAIL_01]',
      { '[EMAIL_01]': 'me@me.com' }
    );
    expect(result).toBe('me@me.com and also me@me.com');
  });

  test('handles tokens with special regex chars in brackets', () => {
    const result = deanonymize(
      'SSN is [SSN_01]',
      { '[SSN_01]': '123-45-6789' }
    );
    expect(result).toBe('SSN is 123-45-6789');
  });

  test('does not restore unknown tokens', () => {
    const result = deanonymize('Value [UNKNOWN_01]', { '[EMAIL_01]': 'x@x.com' });
    expect(result).toBe('Value [UNKNOWN_01]');
  });

  test('round-trips correctly with anonymizer output', async () => {
    const { anonymize } = await import('../../src/engine/anonymizer.js');
    const original = 'Send to user@example.com and call 555-123-4567';
    const detections = [
      { type: 'EMAIL', value: 'user@example.com', start: 8, end: 24, confidence: 0.95, source: 'regex' },
      { type: 'PHONE', value: '555-123-4567', start: 34, end: 46, confidence: 0.95, source: 'regex' },
    ];
    const { sanitized, tokenMap } = anonymize(original, detections);
    const restored = deanonymize(sanitized, tokenMap);
    expect(restored).toBe(original);
  });
});
