import type { AuthClient, AuthEvent, AuthOutcome, AuthSession } from '@/auth/auth-client';

interface FakeUser {
  id: string;
  email: string;
  password: string;
  confirmed: boolean;
}

interface CodeInfo {
  kind: 'confirm' | 'recovery';
  email: string;
}

/**
 * Faux client d'auth en mémoire pour les tests — simule la confirmation email,
 * l'échange de code (liens profonds) et la récupération de mot de passe.
 * `confirmEmail()` / `confirmationCode()` / `recoveryCode()` reproduisent les
 * liens reçus par mail.
 */
export class FakeAuthClient implements AuthClient {
  private readonly users = new Map<string, FakeUser>();
  private readonly handlers = new Set<
    (session: AuthSession | null, event: AuthEvent) => void
  >();
  private readonly codes = new Map<string, CodeInfo>();
  private readonly codeByEmail = new Map<string, string>();
  private session: AuthSession | null = null;
  private seq = 0;

  constructor(private readonly opts: { requireConfirmation?: boolean } = {}) {}

  private notify(event: AuthEvent): void {
    for (const handler of this.handlers) {
      handler(this.session, event);
    }
  }

  private issueCode(kind: 'confirm' | 'recovery', email: string): string {
    const code = `code-${++this.seq}`;
    this.codes.set(code, { kind, email });
    this.codeByEmail.set(`${kind}:${email}`, code);
    return code;
  }

  async getSession(): Promise<AuthSession | null> {
    return this.session;
  }

  onAuthStateChange(handler: (session: AuthSession | null, event: AuthEvent) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  async signUp(email: string, password: string): Promise<AuthOutcome> {
    if (this.users.has(email)) {
      return { user: null, session: null, errorMessage: 'Cet email est déjà utilisé' };
    }
    const user: FakeUser = {
      id: `user-${++this.seq}`,
      email,
      password,
      confirmed: !this.opts.requireConfirmation,
    };
    this.users.set(email, user);
    const authUser = { id: user.id, email };

    if (user.confirmed) {
      this.session = { user: authUser };
      this.notify('signedIn');
      return { user: authUser, session: this.session, errorMessage: null };
    }
    this.issueCode('confirm', email);
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
    this.notify('signedIn');
    return { user: this.session.user, session: this.session, errorMessage: null };
  }

  async signOut(): Promise<{ errorMessage: string | null }> {
    this.session = null;
    this.notify('signedOut');
    return { errorMessage: null };
  }

  async requestPasswordReset(email: string): Promise<{ errorMessage: string | null }> {
    // Supabase ne révèle pas si l'email existe : toujours « ok ». Un code n'est
    // émis que si le compte existe.
    if (this.users.has(email)) {
      this.issueCode('recovery', email);
    }
    return { errorMessage: null };
  }

  async exchangeCodeForSession(code: string): Promise<AuthOutcome> {
    const info = this.codes.get(code);
    if (!info) {
      return { user: null, session: null, errorMessage: 'Lien invalide ou expiré' };
    }
    const user = this.users.get(info.email);
    if (!user) {
      return { user: null, session: null, errorMessage: 'Compte introuvable' };
    }
    if (info.kind === 'confirm') {
      user.confirmed = true;
    }
    this.session = { user: { id: user.id, email: user.email } };
    this.notify(info.kind === 'recovery' ? 'passwordRecovery' : 'signedIn');
    return { user: this.session.user, session: this.session, errorMessage: null };
  }

  async updatePassword(newPassword: string): Promise<{ errorMessage: string | null }> {
    if (!this.session) {
      return { errorMessage: 'Aucune session' };
    }
    const user = this.users.get(this.session.user.email ?? '');
    if (user) {
      user.password = newPassword;
    }
    return { errorMessage: null };
  }

  /** Helper de test : code du lien de confirmation reçu par mail. */
  confirmationCode(email: string): string {
    const code = this.codeByEmail.get(`confirm:${email}`);
    if (!code) throw new Error(`Aucun code de confirmation pour ${email}`);
    return code;
  }

  /** Helper de test : code du lien de réinitialisation reçu par mail. */
  recoveryCode(email: string): string {
    const code = this.codeByEmail.get(`recovery:${email}`);
    if (!code) throw new Error(`Aucun code de réinitialisation pour ${email}`);
    return code;
  }

  /** Helper de test : simule directement le clic sur le lien de confirmation. */
  confirmEmail(email: string): void {
    void this.exchangeCodeForSession(this.confirmationCode(email));
  }
}
