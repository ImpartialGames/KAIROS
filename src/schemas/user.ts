import { z } from 'zod';

/**
 * Enregistrement utilisateur local. En Phase 0 il n'existe qu'un invité
 * (isGuest = true), créé au premier lancement. À l'inscription (Phase 1),
 * ce MÊME enregistrement est mis à jour en place — jamais recréé (CLAUDE.md).
 */
export const UserSchema = z.object({
  id: z.uuid(),
  isGuest: z.boolean(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type User = z.infer<typeof UserSchema>;
