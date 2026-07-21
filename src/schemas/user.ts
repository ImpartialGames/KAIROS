import { z } from 'zod';

/**
 * Enregistrement utilisateur local. En Phase 0 il n'existe qu'un invité
 * (isGuest = true), créé au premier lancement. À l'inscription (Phase 1),
 * ce MÊME enregistrement est mis à jour en place — jamais recréé (CLAUDE.md).
 */
export const UserSchema = z.object({
  id: z.uuid(),
  isGuest: z.boolean(),
  /**
   * Compte Supabase lié à l'inscription (Phase 1). Null en mode invité ;
   * renseigné à la conversion invité → inscrit, sur le MÊME enregistrement.
   * `nullish` : le mapper DB fournit toujours la valeur ; l'optionnalité évite
   * d'imposer le champ aux fixtures de test antérieures.
   */
  authUserId: z.uuid().nullish(),
  /**
   * Moment où l'utilisateur a lu et accepté l'écran précautions/contre-indications
   * (affiché une seule fois avant son tout premier jeûne). Null tant que non vu.
   */
  precautionsAcknowledgedAt: z.number().int().positive().nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type User = z.infer<typeof UserSchema>;
