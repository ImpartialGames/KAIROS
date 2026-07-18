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

/** Issue d'une inscription/connexion : session présente = connecté ;
 *  user sans session = en attente de confirmation email ; message = erreur. */
export interface AuthOutcome {
  user: AuthUser | null;
  session: AuthSession | null;
  errorMessage: string | null;
}

export interface AuthClient {
  getSession(): Promise<AuthSession | null>;
  /** S'abonne aux changements de session (confirmation email, refresh, déco).
   *  Retourne une fonction de désabonnement. */
  onAuthStateChange(handler: (session: AuthSession | null) => void): () => void;
  signUp(email: string, password: string): Promise<AuthOutcome>;
  signIn(email: string, password: string): Promise<AuthOutcome>;
  signOut(): Promise<{ errorMessage: string | null }>;
  requestPasswordReset(email: string): Promise<{ errorMessage: string | null }>;
}
