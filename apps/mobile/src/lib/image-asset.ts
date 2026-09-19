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

function sniffImageMime(bytes: Uint8Array, fallback: string): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return normalizeImageMime(fallback);
}

export function bytesAsBody(bytes: Uint8Array, mime: string): BodyInit {
  const copy = bytes.slice();
  if (typeof Blob !== 'undefined') {
    return new Blob([copy as unknown as BlobPart], { type: mime });
  }
  return copy as unknown as BodyInit;
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
  let bytes: Uint8Array;
  let declared = mime;
  if (file && typeof file.arrayBuffer === 'function') {
    declared = file.type ? normalizeImageMime(file.type) : mime;
    bytes = new Uint8Array(await file.arrayBuffer());
  } else if (asset.base64) {
    bytes = bytesFromBase64(asset.base64);
  } else {
    const res = await fetch(asset.uri);
    if (!res.ok) {
      throw new ApiError('NETWORK', 'No pudimos leer la imagen');
    }
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  return { mime: sniffImageMime(bytes, declared), bytes, uri: asset.uri };
}

export function assertImageUpload(mime: string, size: number) {
  if (!ALLOWED.has(normalizeImageMime(mime))) {
    throw new ApiError('VALIDATION_ERROR', 'Usa jpeg, png o webp.');
  }
  if (size > MAX_IMAGE_BYTES) {
    throw new ApiError('VALIDATION_ERROR', 'La imagen pesa más de 8 MB.');
  }
}
