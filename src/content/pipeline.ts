import {
  ContentBundleSchema,
  type ContentBundle,
  type LexiconEntry,
  type Synergy,
  type TimelinePhase,
} from './schema';

/**
 * Pipeline pur de contenu : transforme le markdown de /docs-source en contenu
 * structuré, normalisé et curé, validé par les schémas Zod. Aucune I/O ici —
 * scripts/generate-content.ts fournit les fichiers, ce module les transforme.
 *
 * Garde-fous appliqués (voir docs-source/README.md et CLAUDE.md) :
 *  - les statistiques chiffrées non sourcées ne sont jamais extraites ;
 *  - l'incohérence IGF-1 du lexique (« augmentation » → baisse) est corrigée ;
 *  - BDNF, absent du lexique, est ajouté depuis biochimie-approfondie.md ;
 *  - les applications thérapeutiques émergentes ne sont pas reprises (elles
 *    exigeraient un étiquetage « recherche en cours » et un écran dédié).
 */

/** Retire le balisage markdown et normalise les espaces. */
function clean(raw: string): string {
  return raw.replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
}

/** Coupe une note éditoriale en fin de ligne (« … — à ajouter si … »). */
function stripEditorialTail(raw: string): string {
  return raw.split(/\s+—\s+/)[0]!.trim();
}

/** Phrase propre : première lettre en capitale, ponctuation finale garantie. */
function sentence(raw: string): string {
  const c = clean(raw);
  if (c.length === 0) {
    return c;
  }
  const capitalized = c.charAt(0).toUpperCase() + c.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function slug(raw: string): string {
  return clean(raw)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Corps d'un document découpé par titres `## ` (le préambule est ignoré). */
interface Section {
  heading: string;
  body: string;
}

function sections(markdown: string): Section[] {
  return markdown
    .split(/\n## /)
    .slice(1)
    .map((chunk) => {
      const newline = chunk.indexOf('\n');
      return {
        heading: chunk.slice(0, newline === -1 ? undefined : newline).trim(),
        body: newline === -1 ? '' : chunk.slice(newline + 1),
      };
    });
}

/** Valeur d'un champ `**Label** : …` sur une ligne, ou null. */
function field(body: string, label: string): string | null {
  const match = body.match(new RegExp(`\\*\\*${label}\\*\\*\\s*:\\s*(.+)`));
  return match ? match[1]!.trim() : null;
}

const IGNORED_LEXICON_HEADINGS = /^Synthèse/;

/** Réécriture ciblée de la timeline IGF-1 : le lexique dit « augmentation »
 *  alors que le sens biologique (et biochimie-approfondie.md) est une baisse. */
const IGF1_TIMELINE_FIX =
  'Diminution notable de l’IGF-1 lors des jeûnes prolongés, autour de 56 h.';

export function parseLexicon(markdown: string): LexiconEntry[] {
  const entries: LexiconEntry[] = [];

  for (const { heading, body } of sections(markdown)) {
    if (IGNORED_LEXICON_HEADINGS.test(heading)) {
      continue;
    }
    const definition = field(body, 'Définition');
    if (!definition) {
      continue;
    }

    const id = slug(heading.replace(/\(.*?\)/g, ''));
    const corps = field(body, 'Corps');
    const esprit = field(body, 'Esprit');
    const timelineRaw = field(body, 'Timeline');

    entries.push({
      id,
      term: clean(heading),
      definition: sentence(definition),
      effetsCorps: corps ? sentence(corps) : null,
      effetsEsprit: esprit ? sentence(esprit) : null,
      timeline: id === 'igf-1' ? IGF1_TIMELINE_FIX : timelineRaw ? sentence(timelineRaw) : null,
      source: 'lexique',
    });
  }

  return entries;
}

export function parseTimeline(markdown: string): TimelinePhase[] {
  const phases: TimelinePhase[] = [];

  for (const { heading, body } of sections(markdown)) {
    const hours = Number.parseInt(heading, 10);
    if (Number.isNaN(hours)) {
      continue; // « Synthèse par palier » et autres sections non horaires
    }

    const whatHappens = field(body, 'Ce qui se passe');
    const mechanismsRaw = field(body, 'Mécanismes');
    const benefitsBody = field(body, 'Bienfaits corps');
    const benefitsMind = field(body, 'Bienfaits esprit');
    if (!whatHappens || !mechanismsRaw || !benefitsBody || !benefitsMind) {
      continue;
    }

    phases.push({
      hours,
      title: `${hours} heures`,
      whatHappens: sentence(whatHappens),
      mechanisms: mechanismsRaw
        .split('·')
        // Libellés courts et homogènes : pas de ponctuation finale.
        .map((item) => clean(item).replace(/[.;]$/, '').trim())
        .filter((item) => item.length > 0),
      benefitsBody: sentence(benefitsBody),
      benefitsMind: sentence(benefitsMind),
    });
  }

  return phases;
}

/** Extrait les synergies et l'entrée BDNF de biochimie-approfondie.md.
 *  Les sections de statistiques chiffrées non sourcées sont volontairement
 *  ignorées : seules ces deux sources ciblées sont lues. */
export function parseBiochemistry(markdown: string): {
  synergies: Synergy[];
  bdnf: LexiconEntry | null;
} {
  const synergies: Synergy[] = [];
  let bdnf: LexiconEntry | null = null;

  for (const { heading, body } of sections(markdown)) {
    if (heading.startsWith('Synergies entre mécanismes')) {
      for (const line of body.split('\n')) {
        const match = line.match(/^- \*\*(.+?)\*\*\s*:\s*(.+)$/);
        if (match) {
          synergies.push({
            id: slug(match[1]!),
            title: clean(match[1]!),
            description: sentence(stripEditorialTail(match[2]!)),
          });
        }
      }
    }

    if (heading.startsWith('Bénéfices cognitifs')) {
      const bdnfLine = body.split('\n').find((line) => /^- \*\*BDNF/.test(line));
      const match = bdnfLine?.match(/^- \*\*(.+?)\*\*\s*:\s*(.+)$/);
      if (match) {
        bdnf = {
          id: 'bdnf',
          term: clean(match[1]!),
          definition: sentence(stripEditorialTail(match[2]!)),
          effetsCorps: null,
          effetsEsprit: null,
          timeline: null,
          source: 'biochimie',
        };
      }
    }
  }

  return { synergies, bdnf };
}

export interface RawSources {
  lexique: string;
  phases: string;
  biochimie: string;
}

/** Assemble et valide le bundle de contenu complet. Lève si un schéma échoue. */
export function generateBundle(sources: RawSources): ContentBundle {
  const { synergies, bdnf } = parseBiochemistry(sources.biochimie);
  const lexicon = parseLexicon(sources.lexique);
  if (bdnf) {
    lexicon.push(bdnf);
  }

  return ContentBundleSchema.parse({
    lexicon,
    timeline: parseTimeline(sources.phases),
    synergies,
  });
}
