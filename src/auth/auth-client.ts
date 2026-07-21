/**
 * Contrat d'authentification minimal dont dépend l'app — satisfait par
 * Supabase Auth (runtime) et par un faux client en mémoire (tests). Isole la
 * logique métier de l'API Supabase, exactement comme DbClient pour SQLite.
 */
export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthSession {
  user: AuthUser;
}

/** Nature d'un changement d'état d'auth (connexion, déconnexion, récupération de mot de passe). */
export type AuthEvent = 'signedIn' | 'signedOut' | 'passwordRecovery';

/** Issue d'une inscription/connexion : session présente = connecté ;
 *  user sans session = en attente de confirmation email ; message = erreur. */
export interface AuthOutcome {
  user: AuthUser | null;
  session: AuthSession | null;
  errorMessage: string | null;
}

export interface AuthClient {
  getSession(): Promise<AuthSession | null>;
  /** S'abonne aux changements de session (confirmation email, refresh, déco,
   *  récupération). Retourne une fonction de désabonnement. */
  onAuthStateChange(handler: (session: AuthSession | null, event: AuthEvent) => void): () => void;
  signUp(email: string, password: string): Promise<AuthOutcome>;
  signIn(email: string, password: string): Promise<AuthOutcome>;
  signOut(): Promise<{ errorMessage: string | null }>;
  requestPasswordReset(email: string): Promise<{ errorMessage: string | null }>;
  /** Échange le code d'un lien email (confirmation / reset) contre une session (PKCE). */
  exchangeCodeForSession(code: string): Promise<AuthOutcome>;
  /** Définit un nouveau mot de passe pour la session courante (fin du reset). */
  updatePassword(newPassword: string): Promise<{ errorMessage: string | null }>;
}
