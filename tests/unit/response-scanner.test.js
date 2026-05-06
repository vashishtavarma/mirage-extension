import { scanResponse } from '../../src/engine/response-scanner.js';

describe('scanResponse()', () => {
  test('returns no warnings for clean response', () => {
    const { echoDetected, warnings } = scanResponse('Hello! How can I help you today?', {});
    expect(echoDetected).toBe(false);
    expect(warnings).toHaveLength(0);
  });

  test('detects token echo in AI response', () => {
    const tokenMap = { '[EMAIL_01]': 'user@example.com' };
    const { echoDetected, warnings } = scanResponse(
      'You asked about [EMAIL_01], which is your address.',
      tokenMap
    );
    expect(echoDetected).toBe(true);
    expect(warnings.some((w) => w.type === 'TOKEN_ECHO')).toBe(true);
  });

  test('detects raw email in AI response', () => {
    const { echoDetected, warnings } = scanResponse(
      'Your email address appears to be someone@domain.com based on context.',
      {}
    );
    expect(echoDetected).toBe(true);
    expect(warnings.some((w) => w.type === 'PII_IN_RESPONSE')).toBe(true);
  });

  test('detects SSN in AI response', () => {
    const { warnings } = scanResponse('The SSN 123-45-6789 was mentioned.', {});
    expect(warnings.some((w) => w.type === 'PII_IN_RESPONSE')).toBe(true);
  });

  test('detects credit card in AI response', () => {
    const { warnings } = scanResponse('Card number: 4111 1111 1111 1111', {});
    expect(warnings.some((w) => w.type === 'PII_IN_RESPONSE')).toBe(true);
  });

  test('detects multiple token echoes', () => {
    const tokenMap = {
      '[EMAIL_01]': 'a@b.com',
      '[SSN_01]': '111-22-3333',
    };
    const { warnings } = scanResponse(
      'Found [EMAIL_01] and [SSN_01] in records.',
      tokenMap
    );
    const echoes = warnings.filter((w) => w.type === 'TOKEN_ECHO');
    expect(echoes).toHaveLength(2);
  });

  test('false positive rate — clean professional text should not trigger', () => {
    const cleanTexts = [
      'The project deadline is next Friday at 5pm.',
      'Please review the attached document and share your feedback.',
      'The server is running on port 8080 and logs are healthy.',
      'Our Q3 revenue grew by 12.5% compared to last year.',
      'I recommend using TypeScript for better type safety.',
    ];
    let fpCount = 0;
    for (const text of cleanTexts) {
      const { echoDetected } = scanResponse(text, {});
      if (echoDetected) fpCount++;
    }
    // FP rate must be below 5% (0 out of 5 = 0%)
    expect(fpCount / cleanTexts.length).toBeLessThan(0.05);
  });

  test('returns warning with value and reason fields', () => {
    const { warnings } = scanResponse('SSN detected: 987-65-4321', {});
    expect(warnings[0]).toHaveProperty('type');
    expect(warnings[0]).toHaveProperty('value');
    expect(warnings[0]).toHaveProperty('reason');
  });
});
