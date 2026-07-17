# KAIROS

App mobile de jeûne intermittent. Le différenciateur : la **timeline biochimique** — ce qui se passe réellement dans le corps heure par heure (insuline, cétose, autophagie, mTOR, AMPK, FOXO, IGF-1).

Contexte projet : [CLAUDE.md](CLAUDE.md) · Vision produit : [cahier-des-charges-app-jeune.md](cahier-des-charges-app-jeune.md) · Contenu scientifique source : [docs-source/](docs-source/)

## Stack

Expo SDK 57 · React Native 0.86 · TypeScript strict · Expo Router · Zustand · SQLite (pattern Repository) · Zod · NativeWind (Tailwind v4) · i18next · expo-notifications · Reanimated.

## Démarrer

```bash
npm install
cp .env.example .env.local   # renseigner les valeurs (Supabase — Phase 1)
npm start                    # puis i (iOS) ou a (Android)
```

## Scripts

- `npm run typecheck` — TypeScript strict, aucune erreur tolérée
- `npm test` — Jest (jest-expo)
- `npm run lint` — ESLint (config Expo)
- `npm run format` / `format:fix` — Prettier

## Architecture

```
src/
  app/           Écrans (Expo Router)
  tw/            Primitives stylables className (NativeWind v5)
  theme/         Tokens de design — source de vérité unique (couleurs, typo)
  i18n/          i18next, fr = langue source
  stores/        État Zustand
  repositories/  Interfaces Repository — seule voie d'accès à la persistance
  schemas/       Schémas Zod (tout ce qui entre est validé)
  db/            SQLite (migrations, client) — jamais appelé hors repositories
```

Règles non négociables : pas de couleur/police en dur (tokens du thème uniquement), pas de chaîne en dur (i18next), pas d'accès SQLite hors repositories, pas de clé committée (`.env.local`).
