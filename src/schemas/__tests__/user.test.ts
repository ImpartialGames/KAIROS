import { UserSchema } from '@/schemas/user';

const valid = () => ({
  id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  isGuest: true,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
});

describe('UserSchema', () => {
  it('accepte un utilisateur invité valide', () => {
    expect(UserSchema.safeParse(valid()).success).toBe(true);
  });

  it.each([
    ['id non uuid', { id: 'pas-un-uuid' }],
    ['isGuest non booléen', { isGuest: 'oui' }],
    ['createdAt nul', { createdAt: 0 }],
    ['createdAt non entier', { createdAt: 1.5 }],
    ['updatedAt négatif', { updatedAt: -1 }],
  ])('rejette : %s', (_label, override) => {
    expect(UserSchema.safeParse({ ...valid(), ...override }).success).toBe(false);
  });
});
