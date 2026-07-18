import { z } from 'zod';

/** Protocoles supportés (cahier des charges §5) — `custom` couvre toute durée libre. */
export const FASTING_PROTOCOLS = ['16:8', '18:6', '20:4', 'OMAD', 'custom'] as const;
export type FastingProtocol = (typeof FASTING_PROTOCOLS)[number];

/** Durée cible (heures de jeûne) imposée par chaque protocole nommé. */
export const PROTOCOL_TARGET_HOURS: Record<Exclude<FastingProtocol, 'custom'>, number> = {
  '16:8': 16,
  '18:6': 18,
  '20:4': 20,
  OMAD: 23,
};

export const FAST_SESSION_STATUSES = ['running', 'completed', 'cancelled'] as const;
export type FastSessionStatus = (typeof FAST_SESSION_STATUSES)[number];

/** Durée cible maximale : 168h (7 jours), au-delà du dernier palier documenté (96h). */
export const MAX_TARGET_HOURS = 168;

const fastSessionShape = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  protocol: z.enum(FASTING_PROTOCOLS),
  targetHours: z.number().int().min(1).max(MAX_TARGET_HOURS),
  status: z.enum(FAST_SESSION_STATUSES),
  /** Timestamps en millisecondes epoch (UTC). */
  startedAt: z.number().int().positive(),
  endedAt: z.number().int().positive().nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const FastSessionSchema = fastSessionShape
  // >= et non > : une session de durée nulle (horloge recalée à la clôture) reste
  // valide ; elle ne doit jamais précéder son début.
  .refine((s) => s.endedAt === null || s.endedAt >= s.startedAt, {
    message: 'endedAt ne peut pas précéder startedAt',
    path: ['endedAt'],
  })
  .refine((s) => (s.status === 'running' ? s.endedAt === null : s.endedAt !== null), {
    message: 'endedAt est null si et seulement si la session est en cours',
    path: ['endedAt'],
  })
  .refine((s) => s.protocol === 'custom' || s.targetHours === PROTOCOL_TARGET_HOURS[s.protocol], {
    message: 'targetHours ne correspond pas au protocole choisi',
    path: ['targetHours'],
  });

export type FastSession = z.infer<typeof FastSessionSchema>;

export const StartFastSessionInputSchema = z
  .object({
    userId: z.uuid(),
    protocol: z.enum(FASTING_PROTOCOLS),
    /** Requis pour `custom`, ignoré sinon (dérivé de PROTOCOL_TARGET_HOURS). */
    targetHours: z.number().int().min(1).max(MAX_TARGET_HOURS).optional(),
    /** Par défaut : maintenant. Permet un démarrage rétroactif ("j'ai commencé hier soir"). */
    startedAt: z.number().int().positive().optional(),
  })
  .refine((i) => i.protocol !== 'custom' || i.targetHours !== undefined, {
    message: 'targetHours est requis pour un protocole custom',
    path: ['targetHours'],
  });

export type StartFastSessionInput = z.infer<typeof StartFastSessionInputSchema>;

/** Durée cible effective d'un démarrage de session. */
export function resolveTargetHours(input: Pick<StartFastSessionInput, 'protocol' | 'targetHours'>) {
  return input.protocol === 'custom'
    ? // le schéma d'entrée garantit la présence pour custom
      (input.targetHours as number)
    : PROTOCOL_TARGET_HOURS[input.protocol];
}
