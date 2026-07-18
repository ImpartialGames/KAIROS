import {
  FastSessionSchema,
  PROTOCOL_TARGET_HOURS,
  resolveTargetHours,
  StartFastSessionInputSchema,
} from '@/schemas/fast-session';

const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const SESSION_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const START = 1_700_000_000_000;
const END = START + 16 * 3_600_000;

const running = () => ({
  id: SESSION_ID,
  userId: USER_ID,
  protocol: '16:8' as const,
  targetHours: 16,
  status: 'running' as const,
  startedAt: START,
  endedAt: null,
  createdAt: START,
  updatedAt: START,
});

const completed = () => ({
  ...running(),
  status: 'completed' as const,
  endedAt: END,
});

describe('FastSessionSchema', () => {
  it('accepte une session en cours valide', () => {
    expect(FastSessionSchema.safeParse(running()).success).toBe(true);
  });

  it('accepte une session terminée valide', () => {
    expect(FastSessionSchema.safeParse(completed()).success).toBe(true);
  });

  it('accepte un protocole custom avec durée libre', () => {
    const custom = { ...running(), protocol: 'custom' as const, targetHours: 37 };
    expect(FastSessionSchema.safeParse(custom).success).toBe(true);
  });

  it.each([
    ['id non uuid', { id: 'x' }],
    ['userId non uuid', { userId: 'x' }],
    ['protocole inconnu', { protocol: '14:10' }],
    ['targetHours nul', { targetHours: 0 }],
    ['targetHours > 168', { targetHours: 169 }],
    ['targetHours non entier', { targetHours: 16.5 }],
    ['targetHours incohérent avec le protocole', { targetHours: 18 }],
    ['statut inconnu', { status: 'paused' }],
    ['startedAt nul', { startedAt: 0 }],
    ['endedAt renseigné sur une session en cours', { endedAt: END }],
    ['createdAt nul', { createdAt: 0 }],
    ['updatedAt négatif', { updatedAt: -1 }],
  ])('rejette (running) : %s', (_label, override) => {
    expect(FastSessionSchema.safeParse({ ...running(), ...override }).success).toBe(false);
  });

  it.each([
    ['endedAt antérieur à startedAt', { endedAt: START - 1 }],
    ['endedAt égal à startedAt', { endedAt: START }],
    ['endedAt manquant sur une session terminée', { endedAt: null }],
  ])('rejette (completed) : %s', (_label, override) => {
    expect(FastSessionSchema.safeParse({ ...completed(), ...override }).success).toBe(false);
  });
});

describe('StartFastSessionInputSchema', () => {
  it('accepte un protocole nommé sans targetHours', () => {
    const result = StartFastSessionInputSchema.safeParse({ userId: USER_ID, protocol: '18:6' });
    expect(result.success).toBe(true);
  });

  it('accepte un custom avec targetHours et startedAt rétroactif', () => {
    const result = StartFastSessionInputSchema.safeParse({
      userId: USER_ID,
      protocol: 'custom',
      targetHours: 42,
      startedAt: START,
    });
    expect(result.success).toBe(true);
  });

  it.each([
    ['custom sans targetHours', { userId: USER_ID, protocol: 'custom' }],
    ['targetHours > 168', { userId: USER_ID, protocol: 'custom', targetHours: 200 }],
    ['startedAt négatif', { userId: USER_ID, protocol: '16:8', startedAt: -1 }],
    ['userId non uuid', { userId: 'x', protocol: '16:8' }],
  ])('rejette : %s', (_label, input) => {
    expect(StartFastSessionInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('resolveTargetHours', () => {
  it('dérive la durée des protocoles nommés', () => {
    expect(resolveTargetHours({ protocol: '16:8' })).toBe(16);
    expect(resolveTargetHours({ protocol: 'OMAD' })).toBe(PROTOCOL_TARGET_HOURS.OMAD);
  });

  it('utilise la durée fournie pour custom', () => {
    expect(resolveTargetHours({ protocol: 'custom', targetHours: 37 })).toBe(37);
  });
});
