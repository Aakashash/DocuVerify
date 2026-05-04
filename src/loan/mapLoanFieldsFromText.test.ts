import { mapLoanFieldsFromText } from './mapLoanFieldsFromText';

describe('mapLoanFieldsFromText', () => {
  it('returns empty buckets for empty input', () => {
    const r = mapLoanFieldsFromText('');
    expect(r.emails).toEqual([]);
    expect(r.phones).toEqual([]);
    expect(r.possibleDates).toEqual([]);
  });

  it('extracts email, phone, and applicant name', () => {
    const r = mapLoanFieldsFromText(`
      Applicant: Jane Doe
      Email: jane.doe@example.com
      Phone (555) 123-4567
      Requested loan amount: $15,000.00
    `);
    expect(r.emails).toContain('jane.doe@example.com');
    expect(r.phones.some((p) => p.includes('555'))).toBe(true);
    expect(r.applicantName).toMatch(/Jane Doe/i);
  });

  it('collects date-like tokens', () => {
    const r = mapLoanFieldsFromText('Signed on 04/05/2026 and effective 2026-01-01');
    expect(r.possibleDates.length).toBeGreaterThanOrEqual(1);
  });
});
