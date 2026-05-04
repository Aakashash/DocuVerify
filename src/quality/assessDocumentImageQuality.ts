import ImageResizer from '@bam.tech/react-native-image-resizer';
import { decode } from 'jpeg-js';
import RNFS from 'react-native-fs';
import { ANALYSIS_MAX_DIMENSION } from './constants';
import { computeQualityFromRgba } from './computeQualityFromRgba';
import type { DocumentQualityResult } from './types';

function toResizeUri(filePath: string): string {
  const t = filePath.trim();
  if (t.startsWith('file://')) {
    return t;
  }
  if (t.startsWith('/')) {
    return `file://${t}`;
  }
  return t;
}

function stripFileScheme(pathOrUri: string): string {
  return pathOrUri.replace(/^file:\/\//, '');
}

function base64ToUint8Array(base64: string): Uint8Array {
  const atobFn = (globalThis as unknown as { atob: (d: string) => string }).atob;
  const binary = atobFn(base64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

/**
 * Heuristic quality pass on a scanned document image (local file path).
 * Downscales natively, then decodes a small JPEG in JS for blur + highlight signals.
 */
export async function assessDocumentImageQuality(
  imageFilePath: string,
): Promise<DocumentQualityResult> {
  let resizedPath: string | null = null;
  try {
    const resized = await ImageResizer.createResizedImage(
      toResizeUri(imageFilePath),
      ANALYSIS_MAX_DIMENSION,
      ANALYSIS_MAX_DIMENSION,
      'JPEG',
      82,
      0,
      undefined,
      false,
      { mode: 'contain', onlyScaleDown: true },
    );
    resizedPath = resized.path;

    const b64 = await RNFS.readFile(stripFileScheme(resized.path), 'base64');
    const bytes = base64ToUint8Array(b64);
    const decoded = decode(bytes, {
      useTArray: true,
      formatAsRGBA: true,
      maxMemoryUsageInMB: 64,
    });

    const { data, width, height } = decoded;
    if (!width || !height || data.length < width * height * 4) {
      return { ok: false, error: 'Could not decode image for quality check.' };
    }

    const q = computeQualityFromRgba(data, width, height);
    return { ok: true, ...q };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Quality check failed.';
    return { ok: false, error: msg };
  } finally {
    if (resizedPath) {
      try {
        await RNFS.unlink(stripFileScheme(resizedPath));
      } catch {
        // best-effort cleanup
      }
    }
  }
}
