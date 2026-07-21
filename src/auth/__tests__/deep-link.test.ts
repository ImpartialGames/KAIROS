import { parseAuthLink } from '@/auth/deep-link';

describe('parseAuthLink', () => {
  it('extrait le code d’un lien de confirmation/reset', () => {
    expect(parseAuthLink('kairos://auth?code=abc123')).toEqual({
      code: 'abc123',
      errorMessage: null,
    });
  });

  it('lit le code depuis un fragment', () => {
    expect(parseAuthLink('kairos://x#code=xyz789').code).toBe('xyz789');
  });

  it('remonte une erreur (lien expiré)', () => {
    const result = parseAuthLink(
      'kairos://auth?error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    );
    expect(result.code).toBeNull();
    expect(result.errorMessage).toBe('Email link is invalid or has expired');
  });

  it('lien sans paramètres d’auth → rien', () => {
    expect(parseAuthLink('kairos://home')).toEqual({ code: null, errorMessage: null });
  });
});
