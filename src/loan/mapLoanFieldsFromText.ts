import type { LoanFieldExtraction } from './types';

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;
const DATE_RE =
  /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g;
const NAME_LABEL_RE =
  /^\s*(?:name|applicant|borrower|customer)\s*[:#]\s*(.+)$/gim;

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

function guessApplicantName(text: string): string | undefined {
  NAME_LABEL_RE.lastIndex = 0;
  const m = NAME_LABEL_RE.exec(text);
  if (!m?.[1]) {
    return undefined;
  }
  const line = m[1].trim();
  if (line.length > 120 || line.length < 2) {
    return undefined;
  }
  if (/@/.test(line) || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
    return undefined;
  }
  return line;
}

/**
 * Heuristic mapping from flat OCR text to loan-oriented fields.
 * Safe to unit test; does not call native code.
 */
export function mapLoanFieldsFromText(rawText: string): LoanFieldExtraction {
  const text = rawText.trim();
  const notes: string[] = [
    'Automated extraction can be wrong. Verify every field against the original document.',
  ];

  if (!text) {
    return {
      rawText: '',
      emails: [],
      phones: [],
      possibleDates: [],
      notes,
    };
  }

  const emails = uniquePreserveOrder(text.match(EMAIL_RE) ?? []);
  const phones = uniquePreserveOrder(
    (() => {
      const out: string[] = [];
      let m: RegExpExecArray | null;
      const re = new RegExp(PHONE_RE.source, 'g');
      while ((m = re.exec(text)) !== null) {
        out.push(m[0].trim());
      }
      return out;
    })(),
  );
  const possibleDates = uniquePreserveOrder(text.match(DATE_RE) ?? []);

  const applicantName = guessApplicantName(text);
  if (emails.length > 1) {
    notes.push('Multiple email addresses found; review which applies to the applicant.');
  }

  return {
    rawText: text,
    applicantName,
    emails,
    phones,
    possibleDates,
    notes,
  };
}
