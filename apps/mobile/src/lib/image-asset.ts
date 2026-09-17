import type { ImagePickerAsset } from 'expo-image-picker';

import { ApiError } from '@/data/errors';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function normalizeImageMime(mime?: string): string {
  if (!mime) return 'image/jpeg';
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime === 'image/heic' || mime === 'image/heif') return 'image/jpeg';
  return mime;
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function bytesFromImageAsset(asset: ImagePickerAsset): Promise<{ mime: string; bytes: Uint8Array; uri: string }> {
  const mime = normalizeImageMime(asset.mimeType);
  const file = asset.file;
  if (file && typeof file.arrayBuffer === 'function') {
    return {
      mime: normalizeImageMime(file.type) || mime,
      bytes: new Uint8Array(await file.arrayBuffer()),
      uri: asset.uri,
    };
  }
  if (asset.base64) {
    return { mime, bytes: bytesFromBase64(asset.base64), uri: asset.uri };
  }
  const res = await fetch(asset.uri);
  if (!res.ok) {
    throw new ApiError('NETWORK', 'No pudimos leer la imagen');
  }
  return { mime, bytes: new Uint8Array(await res.arrayBuffer()), uri: asset.uri };
}

export function assertImageUpload(mime: string, size: number) {
  if (!ALLOWED.has(normalizeImageMime(mime))) {
    throw new ApiError('VALIDATION_ERROR', 'Usa jpeg, png o webp.');
  }
  if (size > MAX_IMAGE_BYTES) {
    throw new ApiError('VALIDATION_ERROR', 'La imagen pesa más de 8 MB.');
  }
}
