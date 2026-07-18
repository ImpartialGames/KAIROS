import type { AuthClient, AuthOutcome, AuthSession } from '@/auth/auth-client';

interface FakeUser {
  id: string;
  email: string;
  password: string;
  confirmed: boolean;
}

/**
 * Faux client d'auth en mémoire pour les tests — simule la confirmation email.
 * `confirmEmail()` reproduit le clic sur le lien reçu par mail.
 */
export class FakeAuthClient implements AuthClient {
  private readonly users = new Map<string, FakeUser>();
  private readonly handlers = new Set<(session: AuthSession | null) => void>();
  private session: AuthSession | null = null;
  private idSeq = 0;

  constructor(private readonly opts: { requireConfirmation?: boolean } = {}) {}

  private notify(): void {
    for (const handler of this.handlers) {
      handler(this.session);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }

  onAuthStateChange(handler: (session: AuthSession | null) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async signUp(email: string, password: string): Promise<AuthOutcome> {
    if (this.users.has(email)) {
      return { user: null, session: null, errorMessage: 'Cet email est déjà utilisé' };
    }
    const user: FakeUser = {
      id: `user-${++this.idSeq}`,
      email,
      password,
      confirmed: !this.opts.requireConfirmation,
    };
    this.users.set(email, user);
    const authUser = { id: user.id, email };

    if (user.confirmed) {
      this.session = { user: authUser };
      this.notify();
      return { user: authUser, session: this.session, errorMessage: null };
    }
    // En attente de confirmation email : user créé, pas de session.
    return { user: authUser, session: null, errorMessage: null };
  }

  async signIn(email: string, password: string): Promise<AuthOutcome> {
    const user = this.users.get(email);
    if (!user || user.password !== password) {
      return { user: null, session: null, errorMessage: 'Identifiants invalides' };
    }
    if (!user.confirmed) {
      return { user: null, session: null, errorMessage: 'Email non confirmé' };
    }
    this.session = { user: { id: user.id, email } };
    this.notify();
    return { user: this.session.user, session: this.session, errorMessage: null };
  }

  async signOut(): Promise<{ errorMessage: string | null }> {
    this.session = null;
    this.notify();
    return { errorMessage: null };
  }

  async requestPasswordReset(_email: string): Promise<{ errorMessage: string | null }> {
    // Supabase ne révèle pas si l'email existe : toujours « ok ».
    return { errorMessage: null };
  }

  /** Helper de test : simule le clic sur le lien de confirmation reçu par mail. */
  confirmEmail(email: string): void {
    const user = this.users.get(email);
    if (!user) {
      throw new Error(`Email inconnu : ${email}`);
    }
    user.confirmed = true;
    this.session = { user: { id: user.id, email } };
    this.notify();
  }
}
