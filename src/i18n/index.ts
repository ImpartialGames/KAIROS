import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frCommon from '@/i18n/locales/fr/common.json';
import frErrors from '@/i18n/locales/fr/errors.json';
import frJournal from '@/i18n/locales/fr/journal.json';
import frLexicon from '@/i18n/locales/fr/lexicon.json';
import frPrecautions from '@/i18n/locales/fr/precautions.json';
import frTimeline from '@/i18n/locales/fr/timeline.json';

/**
 * i18next — aucune chaîne en dur dans les composants (CLAUDE.md).
 * Français = langue source. L'anglais s'ajoutera en créant
 * `locales/en/` et en l'enregistrant ici ; le marché de lancement
 * n'est pas encore tranché (cahier des charges §6).
 */
export const resources = {
  fr: {
    common: frCommon,
    precautions: frPrecautions,
    timeline: frTimeline,
    lexicon: frLexicon,
    journal: frJournal,
    errors: frErrors,
  },
} as const;

export const defaultNS = 'common';

// eslint-disable-next-line import/no-named-as-default-member -- API i18next canonique (méthode d'instance)
void i18n.use(initReactI18next).init({
  resources,
  lng: getLocales()[0]?.languageCode ?? 'fr',
  fallbackLng: 'fr',
  defaultNS,
  // Les clés peuvent contenir ':' (protocoles 16:8, 18:6…) — le namespace passe
  // toujours par l'option { ns } ou useTranslation(ns), jamais par 'ns:clé'.
  nsSeparator: false,
  interpolation: {
    // React échappe déjà — double échappement inutile.
    escapeValue: false,
  },
});

export default i18n;
