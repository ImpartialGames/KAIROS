# Cahier des charges — [Nom provisoire : KAIROS]

## 0. Pourquoi ce nom

**Kairos** (καιρός) : dans la pensée grecque, s'oppose à *chronos* (le temps qui s'écoule mécaniquement). Kairos est le moment juste, l'instant où agir change tout. C'est exactement le pari produit : l'app ne vend pas un chronomètre, elle vend la compréhension du moment précis où le corps bascule (cétose à 16h, autophagie à 18h, mTOR inhibé à 48h). Le nom porte la différenciation scientifique sans être un mot-clé générique ("Fast", "Zero", "Window" — déjà pris, déjà génériques).

Deux alternatives si Kairos ne convient pas ou pose un problème de disponibilité (App Store, trademark) :
- **Aetas** (latin, "l'âge, le moment de la vie") — sonorité proche, moins connue donc plus disponible.
- **Cétone** trop littéral / **Sōma** trop utilisé dans le wellness → écartés.

*Action requise avant de s'engager : vérifier la disponibilité du nom (App Store, Google Play, marque INPI/USPTO, nom de domaine). Je ne l'ai pas fait — c'est un prérequis légal, pas une option.*

---

## 1. Positionnement

**Ce que ce n'est pas** : un chronomètre de jeûne de plus avec un réseau social greffé dessus.

**Ce que c'est** : la seule app de jeûne qui montre, heure par heure, ce qui se passe réellement dans le corps — insuline, cétose, autophagie, mTOR, AMPK, FOXO, IGF-1 — avec un niveau de rigueur scientifique qu'aucun concurrent (Zero, Fastic, BodyFast, DoFasting) ne propose à ce degré de détail. C'est le différenciateur, il ne doit jamais être dilué par l'empilement de features.

**Diagnostic concurrentiel (vérifié, pas supposé) :**
- Zero domine en volume mais son tier gratuit est devenu un simple aperçu (historique 7 jours) — frustration documentée chez les utilisateurs.
- DoFasting est perçu comme cher et peu différenciant au-delà d'un catalogue de recettes.
- Fastic et LIFE Fasting Tracker misent sur le communautaire ("fasting circles") — c'est un terrain déjà occupé, on ne doit pas l'affronter frontalement sur ce seul axe.
- Aucun concurrent identifié ne pousse la pédagogie biochimique aussi loin que le lexique + timeline déjà construits. C'est là qu'est le fossé défendable.

---

## 2. Authentification

- **Mode invité par défaut.** Toutes les fonctionnalités core sont utilisables sans compte.
- Proposition de compte déclenchée par un moment de valeur perçue (fin du premier jeûne complet, tentative d'accès à un historique > 30 jours, ou volonté de rejoindre un groupe communautaire).
- Migration transparente invité → inscrit (déjà spécifiée : mise à jour de l'enregistrement existant, pas de recréation).
- Méthodes : **Apple, Google, email.** Facebook explicitement écarté — mauvais signal de confiance sur une app de données de santé.

---

## 3. Direction design

- **Palette** : noir profond / anthracite comme fond dominant, crème/blanc cassé pour le texte et les surfaces, **accent cuivre-ambré** comme signature (symbolise la combustion métabolique, la chaleur, l'énergie — pas la sérénité générique bleu-vert du wellness).
- Un second accent froid (bleu glacier très désaturé, quasi gris) peut apparaître ponctuellement pour distinguer les états "avant cétose" vs "après cétose" dans la timeline — mais jamais comme couleur de marque.
- Typographie : une serif éditoriale pour les moments "pédagogiques" (lexique, explications biochimiques) qui donne un ton revue scientifique/magazine plutôt qu'app fitness générique ; une sans-serif géométrique pour l'UI fonctionnelle (timer, chiffres, navigation).
- Dark mode = mode par défaut, pas une option secondaire. Le light mode existe mais le noir/cuivre est l'identité.
- *Le prompt Stitch existant devra être révisé pour intégrer cette direction avant de relancer la génération des mockups — le prompt actuel visait probablement une palette différente.*

---

## 4. Architecture des fonctionnalités — par phases

Le scope est complet, mais il n'est pas livré d'un bloc. Chaque phase doit être stable et testée avant d'ouvrir la suivante.

### Phase 0 — déjà spécifiée, ne pas rouvrir
Timer de jeûne · Timeline biochimique heure par heure · Lexique scientifique · Journal/historique.
Stack verrouillée : React Native + Expo, TypeScript strict, Expo Router, Zustand, SQLite (pattern Repository), Zod, NativeWind, i18next, expo-notifications, Reanimated v3.

### Phase 1 — Comptes & continuité
- SSO Apple/Google/email
- Migration invité → inscrit avec tests d'intégration obligatoires
- Bascule vers Supabase pour la persistance cloud (le pattern Repository a été conçu pour ça)
- Synchronisation multi-appareil

### Phase 2 — Bien-être approfondi
- Suivi de l'humeur à chaque session (déjà esquissé dans le journal, à enrichir)
- Corrélation visuelle humeur ↔ phase biochimique atteinte (ex : "vous notez plus de clarté mentale en moyenne à partir de 18h de jeûne")
- Notes libres horodatées

### Phase 3 — Communauté (angle différenciant, pas un fil d'actualité générique)
- Pas de newsfeed façon Instagram. À la place : **petits cercles fermés** (5-15 personnes, type "accountability group") — parce que Fastic/LIFE occupent déjà le terrain du réseau social large, et que la littérature sur l'engagement montre que les petits groupes retiennent mieux que les feeds publics.
- Encouragements ciblés (pas de likes/compteurs publics — cohérent avec le positionnement "bien-être", pas "vanity metrics")
- Partage optionnel de jalons biochimiques atteints (ex: "premier jeûne en autophagie profonde"), jamais de comparaison de poids ou de calories

### Phase 4 — Gamification (sobre, alignée science)
- Badges liés aux **jalons biochimiques réels** (première cétose atteinte, première autophagie, premier jeûne en mitophagie à 96h) plutôt qu'à des séries arbitraires — cohérent avec le positionnement scientifique, différenciant vs. les badges génériques des concurrents.
- Pas de leaderboard public par défaut (option à activer uniquement dans les cercles Phase 3).

### Phase 5 — Nutrition & hydratation
- Suivi d'hydratation avec rappels
- Guide de rupture de jeûne (quoi manger en sortie de jeûne long, ce n'est PAS un tracker calorique généraliste — ça éviterait de transformer l'app en MyFitnessPal, ce qui diluerait le positionnement)

### Phase 6 — Wearables
- Apple Health / Google Fit : fréquence cardiaque, sommeil
- Usage : enrichir la timeline biochimique avec des données réelles (ex: corréler variabilité de fréquence cardiaque et phase de jeûne), pas juste afficher des stats à côté

### Phase 7 — Coaching / recommandations personnalisées
- Volontairement en dernier. Nécessite un volume de données utilisateur suffisant (Phase 0 à 6) pour être fiable. Un système de recommandation lancé sans données réelles produirait des conseils génériques — contre-productif pour la crédibilité scientifique de l'app.

---

## 5. Répartition Gratuit / Payant

Principe : **le cœur du produit (timer + timeline + lexique de base) reste gratuit.** Le concurrent principal (Zero) a dégradé son tier gratuit à un simple aperçu et ça génère de la frustration documentée — c'est une faille à exploiter, pas à reproduire.

**Gratuit :**
- Timer de jeûne, tous protocoles (16:8, 18:6, 20:4, OMAD...)
- Timeline biochimique simplifiée (les grands paliers : cétose, autophagie)
- Lexique de base
- Journal avec historique limité (30 jours, contre 7 chez Zero — argument marketing direct)
- Cercles communautaires (Phase 3) — **gratuit**, pour maximiser l'effet réseau ; ce n'est pas là qu'on monétise

**Payant (abonnement, ~49,99 $/an — positionné entre le tier bas des concurrents et Zero, cohérent avec un positionnement premium mais pas hors marché) :**
- Timeline biochimique complète et détaillée (tous les marqueurs : mTOR, AMPK, FOXO, IGF-1, sirtuines, avec explications approfondies)
- Historique illimité + analytics de tendances
- Corrélation humeur/biochimie (Phase 2)
- Intégration wearables (Phase 6)
- Coaching et recommandations personnalisées (Phase 7)
- Guide nutrition/hydratation avancé (Phase 5)

*Point de vigilance : ne pas mettre la gamification (Phase 4) derrière le paywall — les badges/jalons sont un levier de rétention, ils doivent rester gratuits pour que la rétention profite à tout le monde, y compris aux utilisateurs gratuits qu'on veut convertir plus tard.*

---

## 6. Ce qui reste non tranché — à ta charge

- Nom définitif (vérification de disponibilité légale non faite)
- Prix exact (49,99 $/an est une proposition ancrée sur la concurrence, pas un test utilisateur)
- Marché de lancement (France seule, ou anglophone dès le départ ? impacte le naming et le ton du lexique)
- Est-ce que les cercles communautaires (Phase 3) sont vraiment un besoin validé chez tes utilisateurs cibles, ou une hypothèse ? Je te conseille un test qualitatif avant d'investir dessus — c'est la phase la plus coûteuse à construire (modération, abus, backend temps réel) pour un bénéfice non encore prouvé sur ce produit précis.
