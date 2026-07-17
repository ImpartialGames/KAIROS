import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from '@/i18n/locales/fr/common.json';

/**
 * i18next — aucune chaîne en dur dans les composants (CLAUDE.md).
 * Français = langue source. L'anglais s'ajoutera en créant
 * `locales/en/` et en l'enregistrant ici ; le marché de lancement
 * n'est pas encore tranché (cahier des charges §6).
 */
export const resources = {
  fr: { common: fr },
} as const;

export const defaultNS = 'common';

// eslint-disable-next-line import/no-named-as-default-member -- API i18next canonique (méthode d'instance)
void i18n.use(initReactI18next).init({
  resources,
  lng: getLocales()[0]?.languageCode ?? 'fr',
  fallbackLng: 'fr',
  defaultNS,
  interpolation: {
    // React échappe déjà — double échappement inutile.
    escapeValue: false,
  },
});

export default i18n;
