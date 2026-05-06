import { semanticScrub } from '../../src/engine/semantic-scrubber.js';

describe('semanticScrub()', () => {
  test('returns empty array for clean text', () => {
    expect(semanticScrub('The weather is nice today')).toHaveLength(0);
  });

  test('detects family relation mention', () => {
    const hits = semanticScrub("My daughter's school is nearby");
    expect(hits.some((h) => h.type === 'FAMILY_RELATION')).toBe(true);
  });

  test('detects work relation mention', () => {
    const hits = semanticScrub('My boss told me to submit the report');
    expect(hits.some((h) => h.type === 'WORK_RELATION')).toBe(true);
  });

  test('detects location hint', () => {
    const hits = semanticScrub('I live in downtown Chicago');
    expect(hits.some((h) => h.type === 'LOCATION_HINT')).toBe(true);
  });

  test('detects employer hint', () => {
    const hits = semanticScrub('I work at a fintech startup in New York');
    expect(hits.some((h) => h.type === 'EMPLOYER_HINT')).toBe(true);
  });

  test('detects school hint', () => {
    const hits = semanticScrub('I study at Stanford University');
    expect(hits.some((h) => h.type === 'SCHOOL_HINT')).toBe(true);
  });

  test('detects origin hint', () => {
    const hits = semanticScrub("I'm from Seattle originally");
    expect(hits.some((h) => h.type === 'ORIGIN_HINT')).toBe(true);
  });

  test('detects medical hint', () => {
    const hits = semanticScrub('My doctor prescribed new medication last week');
    expect(hits.some((h) => h.type === 'MEDICAL_HINT')).toBe(true);
  });

  test('returns match and reason fields', () => {
    const hits = semanticScrub('My wife works from home');
    expect(hits[0]).toHaveProperty('match');
    expect(hits[0]).toHaveProperty('reason');
    expect(hits[0]).toHaveProperty('type');
    expect(hits[0]).toHaveProperty('index');
  });

  test('detects multiple indirect identifiers in one prompt', () => {
    const text = 'I live in Austin and my boss Sarah works at Google';
    const hits = semanticScrub(text);
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  test('is case-insensitive', () => {
    const hits = semanticScrub('MY DAUGHTER goes to school here');
    expect(hits.some((h) => h.type === 'FAMILY_RELATION')).toBe(true);
  });
});
