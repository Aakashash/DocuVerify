export type DocumentQualitySummary =
  | 'ok'
  | 'maybe_blurry'
  | 'maybe_overexposed'
  | 'needs_review';

export type DocumentQualitySuccess = {
  ok: true;
  /** Variance of Laplacian on downscaled grayscale (higher ≈ sharper). */
  blurVariance: number;
  /** Share of pixels with very high luminance (possible glare / wash-out). */
  highlightRatio: number;
  summary: DocumentQualitySummary;
  messages: string[];
};

export type DocumentQualityFailure = {
  ok: false;
  error: string;
};

export type DocumentQualityResult = DocumentQualitySuccess | DocumentQualityFailure;
