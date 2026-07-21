/**
 * Analyse un lien profond d'authentification (`kairos://…?code=…`) renvoyé par
 * Supabase après un clic sur un email de confirmation ou de réinitialisation.
 * Robuste aux variations de forme (query ou fragment) via une extraction directe.
 */
export interface AuthDeepLink {
  code: string | null;
  errorMessage: string | null;
}

function param(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&#]${key}=([^&]+)`));
  return match ? decodeURIComponent(match[1]!.replace(/\+/g, ' ')) : null;
}

export function parseAuthLink(url: string): AuthDeepLink {
  return {
    code: param(url, 'code'),
    errorMessage: param(url, 'error_description') ?? param(url, 'error'),
  };
}
