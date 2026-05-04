import {
  BLUR_LAPLACIAN_VARIANCE_WARN,
  HIGHLIGHT_LUMA_MIN,
  HIGHLIGHT_RATIO_WARN,
} from './constants';
import type { DocumentQualitySuccess, DocumentQualitySummary } from './types';

function rgbaToGray(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const gray = new Float32Array(width * height);
  let p = 0;
  for (let i = 0; i < data.length; i += 4) {
    gray[p++] =
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/** Interior pixels only; classic blur detector. */
export function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  if (width < 3 || height < 3) {
    return 0;
  }
  const responses: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap =
        gray[i - width] +
        gray[i + width] +
        gray[i - 1] +
        gray[i + 1] -
        4 * gray[i];
      responses.push(lap);
    }
  }
  if (responses.length === 0) {
    return 0;
  }
  const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
  let v = 0;
  for (const r of responses) {
    const d = r - mean;
    v += d * d;
  }
  return v / responses.length;
}

export function highlightRatio(gray: Float32Array, lumaMin: number): number {
  let hi = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] >= lumaMin) {
      hi++;
    }
  }
  return gray.length > 0 ? hi / gray.length : 0;
}

export function buildQualityAssessment(
  blurVariance: number,
  highlightR: number,
): Pick<DocumentQualitySuccess, 'summary' | 'messages'> {
  const blurry = blurVariance < BLUR_LAPLACIAN_VARIANCE_WARN;
  const washed = highlightR > HIGHLIGHT_RATIO_WARN;

  let summary: DocumentQualitySummary = 'ok';
  const messages: string[] = [];

  if (blurry) {
    messages.push(
      'This image looks soft or blurry. Retake with steady hands and good light if possible.',
    );
  }
  if (washed) {
    messages.push(
      'Bright areas may hide text (glare or overexposure). Try angling the document away from direct light.',
    );
  }

  if (blurry && washed) {
    summary = 'needs_review';
  } else if (blurry) {
    summary = 'maybe_blurry';
  } else if (washed) {
    summary = 'maybe_overexposed';
  }

  return { summary, messages };
}

export function computeQualityFromRgba(
  rgba: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): Pick<DocumentQualitySuccess, 'blurVariance' | 'highlightRatio' | 'summary' | 'messages'> {
  const gray = rgbaToGray(rgba, width, height);
  const blurVar = laplacianVariance(gray, width, height);
  const hi = highlightRatio(gray, HIGHLIGHT_LUMA_MIN);
  const { summary, messages } = buildQualityAssessment(blurVar, hi);
  return {
    blurVariance: blurVar,
    highlightRatio: hi,
    summary,
    messages,
  };
}
