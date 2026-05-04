/** Max width/height passed to the native resizer before JS decode (memory / speed). */
export const ANALYSIS_MAX_DIMENSION = 480;

/**
 * Laplacian variance below this (on our downscaled pipeline) suggests motion blur
 * or misfocus. Tune on real devices; start advisory-only (P3.3).
 */
export const BLUR_LAPLACIAN_VARIANCE_WARN = 95;

/** Luminance above this counts as “near white” for highlight / glare heuristic. */
export const HIGHLIGHT_LUMA_MIN = 248;

/** If this fraction of pixels are near-white, flag possible overexposure / glare. */
export const HIGHLIGHT_RATIO_WARN = 0.11;
