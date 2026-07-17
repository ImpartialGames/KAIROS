# CLAUDE.md

Contexte projet pour Claude Code. À lire avant toute modification du repo.

## Le produit

App mobile de jeûne intermittent. Le différenciateur n'est pas le timer, c'est la **timeline biochimique** : ce qui se passe réellement dans le corps heure par heure (insuline, cétose, autophagie, mTOR, AMPK, FOXO, IGF-1). Le lexique scientifique et le journal complètent ces quatre piliers. Voir `/docs-source/` pour les specs fonctionnelles complètes et `cahier-des-charges-app-jeune.md` pour la vision produit long terme en phases.

**Règle de scope** : le repo actuel construit la Phase 0 (timer, timeline, lexique, journal) + Phase 1 (comptes/continuité). Ne pas anticiper les phases communautaires, gamification, wearables, coaching (Phases 3-7) sauf instruction explicite dans une tâche. Si une tâche semble impliquer ces features, s'arrêter et demander confirmation plutôt que de les construire par anticipation.

## Stack technique (verrouillée)

- **Framework** : React Native + Expo
- **Langage** : TypeScript strict — pas de `any` non justifié, pas de désactivation de règles strict sans commentaire expliquant pourquoi
- **Navigation** : Expo Router
- **State** : Zustand
- **Persistance locale** : SQLite via pattern Repository (voir ci-dessous)
- **Validation** : Zod — tout ce qui entre (formulaires, réponses API, lecture DB) passe par un schéma Zod
- **Styling** : NativeWind
- **i18n** : i18next — aucune chaîne de texte en dur dans les composants, tout passe par les clés de traduction
- **Notifications** : expo-notifications
- **Animations** : Reanimated v3

## Architecture

### Pattern Repository
Toute la persistance passe par des interfaces Repository, pas par des appels SQLite directs dans les composants ou le state. Objectif : pouvoir remplacer SQLite par Supabase (Phase 1) sans toucher à la logique métier ni aux composants UI. Avant d'écrire une requête DB, vérifier qu'elle passe par le repository correspondant — si le repository n'existe pas encore pour ce type de données, le créer d'abord.

### Auth & mode invité — point critique, ne pas casser
- L'app doit être **utilisable sans compte dès l'installation**. Ne jamais introduire un mur d'authentification à l'onboarding.
- Un utilisateur invité génère des données réelles (`FastSession`, `JournalEntry`, `PhaseReached`) rattachées à un enregistrement invité local.
- À l'inscription, cet enregistrement invité est **mis à jour en place**, jamais recréé — toute perte de `FastSession`/`JournalEntry`/`PhaseReached` lors de la conversion invité → inscrit est un bug bloquant, pas un détail.
- Toute modification touchant à ce flux (Étape 1bis) nécessite des tests d'intégration couvrant explicitement le scénario de migration, pas seulement les cas nominaux séparés (créer un compte à vide / utiliser en invité).
- Méthodes de connexion : Apple, Google, email. **Pas de Facebook** — décision produit, ne pas l'ajouter même si demandé dans une tâche isolée sans confirmation explicite que la décision a changé.

## Configuration & environnement

- **Backend cloud** : Supabase, projet lié via `supabase link --project-ref <project-ref>`. Repo : `https://github.com/ImpartialGames/KAIROS.git`.
- **Aucune clé ne doit être codée en dur dans le code source**, y compris la clé publishable (qui n'est pas secrète en soi, mais doit rester en variable d'environnement par cohérence — le jour où une `service_role key` entre dans le projet, elle doit suivre exactement le même circuit, pas un traitement différent inventé à la volée).
- Variables attendues, définies dans `.env.local` (non commité, listé dans `.gitignore`) :
  ```
  EXPO_PUBLIC_SUPABASE_URL=
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
  ```
- Un fichier `.env.example` doit exister à la racine avec les mêmes clés, valeurs vides, pour que quiconque clone le repo sache quoi renseigner sans avoir besoin de demander.
- Le client Supabase est initialisé une seule fois (singleton), lu uniquement depuis ces variables d'environnement — jamais de fallback en dur "au cas où la variable est absente".
- Rappel : SQLite reste la persistance locale de la Phase 0. La bascule Supabase correspond à la Phase 1 (comptes & continuité) — ne pas migrer de logique métier vers des appels Supabase directs avant que la Phase 1 soit officiellement engagée. En attendant, seules les interfaces Repository peuvent être préparées pour anticiper le swap, pas le contenu.

## Sources & données

- Les six documents sources (specs fonctionnelles, phases biochimiques, lexique scientifique) sont convertis en markdown propre dans `/docs-source/`.
- Deux d'entre eux proviennent de PDF : leur conversion contient des artefacts (espacements, puces mal formées, retours à la ligne parasites). Ces artefacts doivent être normalisés dans `generate-content.ts` avant d'être injectés dans le lexique ou la timeline in-app — ne pas copier le markdown brut tel quel dans le contenu affiché à l'utilisateur.

## Design

- Mode sombre par défaut, pas une option secondaire.
- Palette : noir/anthracite + crème, accent signature cuivre-ambré. **Ne pas utiliser bleu/vert comme couleurs de marque** — c'est la palette générique du wellness (Calm, Headspace, Fitbit) et le produit doit s'en démarquer visuellement dès le premier écran.
- Typographie : serif éditoriale pour le contenu pédagogique (lexique, explications biochimiques), sans-serif géométrique pour l'UI fonctionnelle (timer, navigation, chiffres).
- La génération de mockups passe par Stitch en amont ; le skill/agent frontend-design n'intervient qu'en polish final, pas en conception initiale.

## Ce qu'il ne faut pas faire sans confirmation explicite

- Ajouter une fonctionnalité sociale, de gamification, nutrition, wearables ou coaching non prévue dans la tâche en cours (Phases 3-7, hors scope actuel)
- Mettre du contenu gratuit du cœur de produit (timer, timeline simplifiée, lexique de base, 30 jours d'historique) derrière un paywall
- Casser le mode invité ou forcer une authentification précoce
- Committer des clés API, secrets, ou données de test réalistes

## Tests

- Tout changement au flux d'authentification/migration invité → inscrit requiert des tests d'intégration avant merge.
- Les schémas Zod doivent avoir des tests couvrant au moins un cas valide et un cas invalide par champ contraint.
