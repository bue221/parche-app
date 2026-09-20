import { API_URL, rewriteMediaUrl, rewritePreviewUrl, rewriteUploadUrl, webLink } from '@/data/env';

/**
 * These rewrites decide whether a presigned signature survives the trip. Assertions hang off
 * API_URL rather than a literal host so the suite does not depend on the local .env.
 */
describe('API_URL', () => {
  test('never carries a trailing slash, so path concatenation cannot double up', () => {
    expect(API_URL.endsWith('/')).toBe(false);
  });
});

describe('webLink', () => {
  const origin = 'https://parche.test';

  test('builds a shareable https link', () => {
    expect(webLink('/event/evt_1', origin)).toBe('https://parche.test/event/evt_1');
  });

  test('tolerates a trailing slash on the origin and a missing one on the path', () => {
    expect(webLink('event/evt_1', 'https://parche.test/')).toBe('https://parche.test/event/evt_1');
  });

  test.each(['', '   '])('returns null for the origin %p so callers fall back to the custom scheme', (value) => {
    expect(webLink('/event/evt_1', value)).toBeNull();
  });
});

describe('rewriteUploadUrl', () => {
  test('resolves a relative target against the API', () => {
    expect(rewriteUploadUrl('/v1/uploads/direct?token=abc')).toBe(`${API_URL}/v1/uploads/direct?token=abc`);
  });

  test('routes the direct upload endpoint back to the API host', () => {
    expect(rewriteUploadUrl('http://localhost:8080/v1/uploads/direct?token=abc')).toBe(
      `${API_URL}/v1/uploads/direct?token=abc`
    );
  });

  test('leaves a presigned object-store PUT alone so the signature stays valid', () => {
    const presigned = 'http://minio:9000/parche/flyers/a.jpg?X-Amz-Signature=deadbeef';
    const rewritten = rewriteUploadUrl(presigned);
    expect(rewritten).toBe('http://localhost:9000/parche/flyers/a.jpg?X-Amz-Signature=deadbeef');
    expect(rewritten).not.toContain('/v1/media');
  });

  test('never sends upload bytes through the read-only media proxy', () => {
    expect(rewriteUploadUrl('https://cdn.parche.test/flyers/a.jpg?X-Amz-Signature=x')).not.toContain('/v1/media');
  });

  test('trims surrounding whitespace', () => {
    expect(rewriteUploadUrl('  /v1/uploads/direct  ')).toBe(`${API_URL}/v1/uploads/direct`);
  });

  test.each(['', 'not a url'])('degrades gracefully on %p', (value) => {
    expect(rewriteUploadUrl(value)).toBe(value);
  });
});

describe('rewriteMediaUrl', () => {
  test.each([
    ['/flyers/a.jpg', '/v1/media/flyers/a.jpg'],
    ['/media/flyers/a.jpg', '/v1/media/flyers/a.jpg'],
    ['/v1/media/flyers/a.jpg', '/v1/media/flyers/a.jpg'],
    ['/media', '/v1/media'],
  ])('normalizes the relative path %s', (input, expected) => {
    expect(rewriteMediaUrl(input)).toBe(`${API_URL}${expected}`);
  });

  test('sends a Compose-internal MinIO URL through the API proxy, dropping the bucket prefix', () => {
    expect(rewriteMediaUrl('http://minio:9000/parche/flyers/a.jpg')).toBe(`${API_URL}/v1/media/flyers/a.jpg`);
  });

  test.each(['http://localhost:9000/parche/flyers/a.jpg', 'http://127.0.0.1:9000/parche/flyers/a.jpg'])(
    'proxies the loopback host %s that phones cannot reach',
    (input) => {
      expect(rewriteMediaUrl(input)).toBe(`${API_URL}/v1/media/flyers/a.jpg`);
    }
  );

  test('only strips a bucket segment named parche', () => {
    expect(rewriteMediaUrl('http://minio:9000/parchement/a.jpg')).toBe(`${API_URL}/v1/media/parchement/a.jpg`);
  });

  test('leaves a public CDN URL untouched', () => {
    expect(rewriteMediaUrl('https://cdn.parche.test/flyers/a.jpg')).toBe('https://cdn.parche.test/flyers/a.jpg');
  });

  test.each(['', 'not a url'])('degrades gracefully on %p', (value) => {
    expect(rewriteMediaUrl(value)).toBe(value);
  });
});

describe('rewritePreviewUrl', () => {
  test.each(['.preview.mp3', '.preview.m4a'])('proxies a loopback %s preview', (extension) => {
    expect(rewritePreviewUrl(`http://minio:9000/parche/audio/track${extension}`)).toBe(
      `${API_URL}/v1/media/audio/track${extension}`
    );
  });

  test('keeps an audio master on its signed URL instead of the media proxy', () => {
    const master = 'http://minio:9000/parche/audio/track.mp3?X-Amz-Signature=deadbeef';
    const rewritten = rewritePreviewUrl(master);
    expect(rewritten).toBe('http://localhost:9000/parche/audio/track.mp3?X-Amz-Signature=deadbeef');
    expect(rewritten).not.toContain('/v1/media');
  });

  test('a preview outside the audio folder is not proxied', () => {
    expect(rewritePreviewUrl('http://minio:9000/parche/other/track.preview.mp3')).not.toContain('/v1/media');
  });

  test('resolves a relative preview against the API without touching the path', () => {
    expect(rewritePreviewUrl('/v1/media/audio/track.preview.mp3')).toBe(
      `${API_URL}/v1/media/audio/track.preview.mp3`
    );
  });

  test('leaves a public preview URL untouched', () => {
    expect(rewritePreviewUrl('https://cdn.parche.test/audio/track.preview.mp3')).toBe(
      'https://cdn.parche.test/audio/track.preview.mp3'
    );
  });

  test.each(['', 'not a url'])('degrades gracefully on %p', (value) => {
    expect(rewritePreviewUrl(value)).toBe(value);
  });
});
