/**
 * Best-effort fields inferred from OCR text. Not a substitute for human review
 * or a credit decision.
 */
export type LoanFieldExtraction = {
  rawText: string;
  /** Single-line guess from labels like "Name:", "Applicant:". */
  applicantName?: string;
  emails: string[];
  phones: string[];
  /** Date-like substrings (MM/DD/YYYY, DD-MM-YYYY, etc.). */
  possibleDates: string[];
  /** UX / parsing caveats. */
  notes: string[];
};
