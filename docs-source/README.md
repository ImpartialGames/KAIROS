# /docs-source/ — provenance et notes de normalisation

Quatre fichiers, issus des six documents sources d'origine :

| Fichier | Source(s) | Rôle |
|---|---|---|
| `lexique.md` | `Lexique.docx` | Définitions scientifiques canoniques — alimente l'écran Lexique |
| `phases-jeune.md` | `Phases_de_jeunes.docx` (+ doublon `LeJeuneGuideCompletdesMecanismesetBienfaits.pdf`, non repris séparément) | Mapping heure → phase → mécanismes — alimente la timeline biochimique |
| `biochimie-approfondie.md` | `LeJeuneetlaBiochimieduCorps.pdf` | Contenu unique non couvert ailleurs : BDNF, précautions/contre-indications, applications thérapeutiques émergentes, synergies entre mécanismes |
| `backlog-fonctionnalites-legacy.md` | `Développement de l'app.docx` + `Synthèse des principaux aspects.docx` | Backlog des phases 3-7 — **pas une spec active pour la Phase 0/1** |

## Notes de normalisation

- Les deux fichiers `.pdf` sources n'étaient pas des PDF texte standards mais des bundles zip (image par page + fichier `.txt` par page + `manifest.json`). Le texte a été extrait des `.txt` embarqués, pas d'OCR sur les images.
- `LeJeuneGuideCompletdesMecanismesetBienfaits.pdf` est un doublon quasi intégral de `Phases_de_jeunes.docx` (même contenu, redécoupé en slides). Volontairement non dupliqué dans `/docs-source/` pour éviter d'injecter deux fois le même contenu dans `generate-content.ts`.
- `LeJeuneetlaBiochimieduCorps.pdf` recoupe largement `Lexique.docx` sur les définitions de base — seul son contenu réellement nouveau a été extrait dans `biochimie-approfondie.md`.
- **Point de vigilance signalé, pas résolu** : `biochimie-approfondie.md` contient plusieurs statistiques chiffrées (20% de réduction d'inflammation, etc.) sans source citée dans le document d'origine. Ne pas les afficher dans l'app comme faits établis sans vérification — incohérent avec le positionnement scientifique du produit sinon.
- Les contre-indications et précautions d'usage (grossesse, troubles alimentaires, supervision médicale) n'existaient dans aucun autre document que le second PDF. C'est un contenu produit important, probablement à afficher avant le premier jeûne — à statuer avec le reste du produit, pas juste enfoui dans le lexique.
