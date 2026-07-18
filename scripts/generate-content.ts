import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateBundle } from '../src/content/pipeline';

/**
 * Génère src/content/generated/content.json depuis /docs-source.
 * À relancer après toute modification des documents sources :
 *   npm run generate:content
 * Le test src/content/__tests__/content.test.ts échoue si la sortie committée
 * n'est plus synchrone avec les sources (garde anti-dérive).
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (name: string) => readFileSync(join(root, 'docs-source', name), 'utf8');

const bundle = generateBundle({
  lexique: read('lexique.md'),
  phases: read('phases-jeune.md'),
  biochimie: read('biochimie-approfondie.md'),
});

const outputPath = join(root, 'src', 'content', 'generated', 'content.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

console.log(
  `Contenu généré : ${bundle.lexicon.length} entrées de lexique, ` +
    `${bundle.timeline.length} paliers, ${bundle.synergies.length} synergies.`,
);
