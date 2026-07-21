import { UserSchema } from '@/schemas/user';

const valid = () => ({
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  isGuest: true,
  precautionsAcknowledgedAt: null,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
});

describe('UserSchema', () => {
  it('accepte un utilisateur invité valide (précautions non vues)', () => {
    expect(UserSchema.safeParse(valid()).success).toBe(true);
  });

  it('accepte un utilisateur ayant accepté les précautions', () => {
    const acked = { ...valid(), precautionsAcknowledgedAt: 1_700_000_100_000 };
    expect(UserSchema.safeParse(acked).success).toBe(true);
  });

  it('accepte un inscrit lié à un compte (authUserId uuid) ou un invité (null/absent)', () => {
    const registered = {
      ...valid(),
      isGuest: false,
      authUserId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    };
    expect(UserSchema.safeParse(registered).success).toBe(true);
    expect(UserSchema.safeParse({ ...valid(), authUserId: null }).success).toBe(true);
  });

  it.each([
    ['id non uuid', { id: 'pas-un-uuid' }],
    ['isGuest non booléen', { isGuest: 'oui' }],
    ['authUserId non uuid', { authUserId: 'pas-un-uuid' }],
    ['precautionsAcknowledgedAt nul (0)', { precautionsAcknowledgedAt: 0 }],
    ['precautionsAcknowledgedAt non entier', { precautionsAcknowledgedAt: 1.5 }],
    ['createdAt nul', { createdAt: 0 }],
    ['createdAt non entier', { createdAt: 1.5 }],
    ['updatedAt négatif', { updatedAt: -1 }],
  ])('rejette : %s', (_label, override) => {
    expect(UserSchema.safeParse({ ...valid(), ...override }).success).toBe(false);
  });
});
