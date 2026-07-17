# Backlog de fonctionnalités — scope complet (référence Phases 3-7)

> Source : `Développement de l'app.docx` et `Synthèse des principaux aspects.docx`. Ces deux documents décrivaient la vision produit complète d'origine (avant resserrement en 4 piliers). **Ils ne sont plus la spec active de la Phase 0/1.** Conservés ici comme backlog structuré pour les phases futures définies dans `cahier-des-charges-app-jeune.md`.
> Ne pas piocher dans ce document pour construire quoi que ce soit hors du scope de la phase en cours — voir CLAUDE.md, section "Ce qu'il ne faut pas faire sans confirmation explicite".

## Mapping vers les phases du cahier des charges

| Idée d'origine | Phase correspondante | Statut |
|---|---|---|
| Tableau de bord, jauge temps réel | Phase 0 (déjà couvert par le timer) | Actif |
| Réseau social intégré, fil d'actualité, likes/commentaires | Écarté — remplacé par cercles fermés (Phase 3) | Reformulé |
| Auth email + Facebook | Phase 1, sans Facebook (décision produit) | Modifié |
| Wearables / Apple Health / Google Fit | Phase 6 | En attente |
| Notifications et rappels intelligents | Phase 0 (notifications de base), Phase 7 (personnalisées) | Partiellement actif |
| Journal + suivi de l'humeur | Phase 0 (base), Phase 2 (enrichi) | Actif |
| Analyses avancées et recommandations personnalisées | Phase 7 (coaching/IA) | En attente |
| Gamification, badges, défis | Phase 4, reformulé autour des jalons biochimiques (pas de leaderboard public par défaut) | Reformulé |
| Contenu éducatif (articles, tutoriels, vidéos) | Couvert en partie par le Lexique (Phase 0) ; vidéos non prévues | Partiellement actif |
| Partage sur réseaux sociaux externes (Instagram, Twitter) | Non planifié | Backlog non priorisé |
| Support/chatbot/FAQ | Non planifié | Backlog non priorisé |
| Calendrier intégré, planification | Non explicitement dans les phases actuelles | À arbitrer |
| Suivi nutritionnel complet (calories, menus) | Explicitement écarté — voir cahier des charges Phase 5, volontairement limité au guide de rupture de jeûne pour ne pas dupliquer MyFitnessPal | Restreint volontairement |
| Hydratation | Phase 5 | En attente |
| Méditation/relaxation guidée | Non repris dans le cahier des charges actuel | Backlog non priorisé — à statuer : est-ce cohérent avec le positionnement scientifique ou dilue-t-il le focus ? |
| Coaching personnalisé (expert humain) | Non repris — la version retenue est un coaching algorithmique (Phase 7), pas humain | Reformulé, portée réduite |
| Défis/compétitions communautaires | Phase 4, sans leaderboard public par défaut | Reformulé |

## Éléments techniques d'origine, statut vs. stack verrouillée

Les documents sources proposaient React Native/Flutter, Node.js/Django/Rails, PostgreSQL/MongoDB, WebSockets — génériques et non tranchés. **Ne font plus foi.** La stack réelle est verrouillée dans CLAUDE.md (Expo, Zustand, SQLite/Supabase, etc.) et prévaut en cas de conflit.

## Ce qui n'a jamais été retenu et ne devrait pas l'être sans nouvelle justification
- Newsfeed public avec likes/abonnements — remplacé par le choix délibéré des cercles fermés (voir cahier des charges, rationale sur la rétention en petit groupe vs. feed public).
- Connexion Facebook — écartée pour raison de confiance sur une app de données de santé.
- Suivi calorique complet façon MyFitnessPal — écarté pour ne pas diluer le positionnement scientifique du produit.
