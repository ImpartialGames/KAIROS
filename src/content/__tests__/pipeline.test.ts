import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import generatedContent from '@/content/generated/content.json';
import { generateBundle, type RawSources } from '@/content/pipeline';
import { ContentBundleSchema } from '@/content/schema';
import { PHASE_MILESTONE_HOURS } from '@/domain/fasting';

const DOCS = join(process.cwd(), 'docs-source');
const read = (name: string) => readFileSync(join(DOCS, name), 'utf8');

const sources: RawSources = {
  lexique: read('lexique.md'),
  phases: read('phases-jeune.md'),
  biochimie: read('biochimie-approfondie.md'),
};

const bundle = generateBundle(sources);

describe('pipeline de contenu', () => {
  it('produit un bundle conforme au schéma Zod', () => {
    expect(() => ContentBundleSchema.parse(bundle)).not.toThrow();
  });

  describe('lexique', () => {
    it('extrait les 11 entrées du lexique + BDNF', () => {
      const ids = bundle.lexicon.map((entry) => entry.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'cetose',
          'autophagie',
          'mitophagie',
          'beta-hydroxybutyrate',
          'mtor',
          'glucagon',
          'insuline',
          'sirtuines',
          'ampk',
          'foxo',
          'igf-1',
          'bdnf',
        ]),
      );
      expect(ids).toHaveLength(12);
    });

    it('n’inclut jamais la section « Synthèse » comme entrée', () => {
      expect(bundle.lexicon.some((entry) => /synth/i.test(entry.term))).toBe(false);
    });

    it('corrige l’incohérence IGF-1 (baisse, pas augmentation)', () => {
      const igf = bundle.lexicon.find((entry) => entry.id === 'igf-1');
      expect(igf?.timeline).toMatch(/[Dd]iminution/);
      expect(igf?.timeline).not.toMatch(/augmentation/i);
    });

    it('ajoute BDNF, absent du lexique source, depuis biochimie-approfondie.md', () => {
      const bdnf = bundle.lexicon.find((entry) => entry.id === 'bdnf');
      expect(bdnf?.source).toBe('biochimie');
      expect(bdnf?.definition).toMatch(/neurones/);
    });

    it('normalise le contenu (pas de balisage markdown résiduel)', () => {
      for (const entry of bundle.lexicon) {
        expect(entry.definition).not.toMatch(/[*`]/);
        expect(entry.definition).toMatch(/[.!?…]$/);
      }
    });
  });

  describe('timeline', () => {
    it('couvre exactement les 9 paliers biochimiques', () => {
      expect(bundle.timeline.map((phase) => phase.hours)).toEqual([...PHASE_MILESTONE_HOURS]);
    });

    it('découpe les mécanismes en libellés non vides et sans ponctuation finale', () => {
      for (const phase of bundle.timeline) {
        expect(phase.mechanisms.length).toBeGreaterThan(0);
        for (const mechanism of phase.mechanisms) {
          expect(mechanism.length).toBeGreaterThan(0);
          expect(mechanism).not.toMatch(/[.;]$/);
        }
      }
    });
  });

  describe('synergies', () => {
    it('extrait les 5 synergies entre mécanismes', () => {
      expect(bundle.synergies.map((synergy) => synergy.id)).toEqual([
        'cetose-autophagie',
        'mtor-ampk',
        'sirtuines-foxo',
        'insuline-glucagon',
        'autophagie-mitophagie',
      ]);
    });
  });

  describe('garde-fous de contenu (CLAUDE.md, docs-source/README.md)', () => {
    const serialized = JSON.stringify(bundle);

    it('n’affiche aucune statistique chiffrée non sourcée (pas de %)', () => {
      expect(serialized).not.toMatch(/%/);
    });

    it('n’inclut pas le resvératrol (niveau de preuve à vérifier)', () => {
      expect(serialized).not.toMatch(/resv[eé]ratrol/i);
    });

    it('n’inclut pas la section applications thérapeutiques émergentes (expérimentales)', () => {
      // Termes propres à cette section seule ; « neurodégénératives »/« cancer »
      // apparaissent légitimement dans les effets du lexique et restent autorisés.
      expect(serialized).not.toMatch(/oncologie|auto-immun/i);
    });
  });

  describe('anti-dérive source ↔ contenu généré', () => {
    it('content.json est synchrone avec /docs-source (relancer npm run generate:content sinon)', () => {
      expect(generatedContent).toEqual(bundle);
    });
  });
});
