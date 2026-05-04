import {
  buildQualityAssessment,
  computeQualityFromRgba,
  highlightRatio,
  laplacianVariance,
} from './computeQualityFromRgba';
import {
  BLUR_LAPLACIAN_VARIANCE_WARN,
  HIGHLIGHT_LUMA_MIN,
  HIGHLIGHT_RATIO_WARN,
} from './constants';

describe('laplacianVariance', () => {
  it('is very low for a flat gray image', () => {
    const w = 32;
    const h = 32;
    const gray = new Float32Array(w * h).fill(120);
    const v = laplacianVariance(gray, w, h);
    expect(v).toBeLessThan(1);
  });

  it('is higher for a sharp vertical edge pattern', () => {
    const w = 32;
    const h = 32;
    const gray = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        gray[y * w + x] = x % 2 === 0 ? 40 : 220;
      }
    }
    const flat = new Float32Array(w * h).fill(128);
    const edgeV = laplacianVariance(gray, w, h);
    const flatV = laplacianVariance(flat, w, h);
    expect(edgeV).toBeGreaterThan(flatV * 50);
  });
});

describe('highlightRatio', () => {
  it('counts bright pixels', () => {
    const gray = new Float32Array(100).fill(250);
    expect(highlightRatio(gray, HIGHLIGHT_LUMA_MIN)).toBe(1);
    gray.fill(100);
    expect(highlightRatio(gray, HIGHLIGHT_LUMA_MIN)).toBe(0);
  });
});

describe('buildQualityAssessment', () => {
  it('returns ok when both metrics are good', () => {
    const r = buildQualityAssessment(
      BLUR_LAPLACIAN_VARIANCE_WARN + 50,
      HIGHLIGHT_RATIO_WARN * 0.5,
    );
    expect(r.summary).toBe('ok');
    expect(r.messages).toHaveLength(0);
  });

  it('flags blur when variance is low', () => {
    const r = buildQualityAssessment(
      BLUR_LAPLACIAN_VARIANCE_WARN - 10,
      HIGHLIGHT_RATIO_WARN * 0.5,
    );
    expect(r.summary).toBe('maybe_blurry');
    expect(r.messages.length).toBeGreaterThan(0);
  });

  it('flags needs_review when both are bad', () => {
    const r = buildQualityAssessment(
      BLUR_LAPLACIAN_VARIANCE_WARN - 10,
      HIGHLIGHT_RATIO_WARN + 0.05,
    );
    expect(r.summary).toBe('needs_review');
  });
});

describe('computeQualityFromRgba', () => {
  function rgbaSolid(w: number, h: number, r: number, g: number, b: number): Uint8Array {
    const buf = new Uint8Array(w * h * 4);
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
    return buf;
  }

  it('treats uniform color as blurry signal', () => {
    const w = 24;
    const h = 24;
    const q = computeQualityFromRgba(rgbaSolid(w, h, 100, 100, 100), w, h);
    expect(q.blurVariance).toBeLessThan(BLUR_LAPLACIAN_VARIANCE_WARN);
    expect(q.summary).not.toBe('ok');
  });
});
