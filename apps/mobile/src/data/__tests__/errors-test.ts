import { ApiError, userMessage } from '@/data/errors';

describe('ApiError', () => {
  test('carries the API code and keeps instanceof working across the catch boundary', () => {
    const error = new ApiError('FORBIDDEN', 'No tienes permiso de puerta.');
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('FORBIDDEN');
  });

  test('field errors are optional and survive round-tripping', () => {
    expect(new ApiError('VALIDATION_ERROR', 'Revisa los campos.').fieldErrors).toBeUndefined();
    expect(new ApiError('VALIDATION_ERROR', 'Revisa los campos.', { email: 'Inválido' }).fieldErrors).toEqual({
      email: 'Inválido',
    });
  });
});

describe('userMessage', () => {
  test('shows the Spanish message the API already produced', () => {
    expect(userMessage(new ApiError('GONE', 'Esa invitación ya se usó.'))).toBe('Esa invitación ya se usó.');
  });

  test.each([
    'Network request failed',
    'fetch failed',
    'TypeError: Failed to fetch',
  ])('turns the transport failure %p into a connectivity hint', (message) => {
    expect(userMessage(new Error(message))).toBe(
      'No hay conexión con Parche. Revisa el servidor e intenta de nuevo.'
    );
  });

  test.each([new Error('boom'), 'boom', null, undefined, { code: 500 }])(
    'falls back to a generic Spanish message for %p',
    (error) => {
      expect(userMessage(error)).toBe('Algo falló. Intenta de nuevo.');
    }
  );

  test('never leaks a token or a request id into the copy', () => {
    const message = userMessage(new Error('401 Bearer eyJhbGciOi req_123'));
    expect(message).not.toContain('Bearer');
    expect(message).not.toContain('req_123');
  });
});
