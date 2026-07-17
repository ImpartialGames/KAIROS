import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colors, fonts } from '@/theme/tokens';

/**
 * global.css (@theme, classes NativeWind) et tokens.ts (consommateurs
 * programmatiques) doivent décrire exactement les mêmes tokens.
 * Ce test échoue si l'un est modifié sans l'autre.
 */
const css = readFileSync(join(__dirname, '..', '..', 'global.css'), 'utf8');

const kebab = (name: string) => name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

describe('synchronisation tokens.ts ↔ global.css', () => {
  it.each(Object.entries(colors))(
    'la couleur "%s" existe dans global.css avec la même valeur',
    (name, value) => {
      const declaration = new RegExp(`--color-${kebab(name)}:\\s*${value.toLowerCase()}\\s*;`);
      expect(css).toMatch(declaration);
    },
  );

  it.each(Object.entries(fonts))(
    'la police "%s" existe dans global.css avec le même nom',
    (name, value) => {
      const declaration = new RegExp(`--font-${kebab(name)}:\\s*${value}\\s*;`);
      expect(css).toMatch(declaration);
    },
  );

  it('global.css ne déclare aucun token couleur absent de tokens.ts', () => {
    const declared = css.match(/--color-[a-z-]+(?=:)/g) ?? [];
    expect(declared).toHaveLength(Object.keys(colors).length);
  });

  it('global.css ne déclare aucun token police absent de tokens.ts', () => {
    const declared = css.match(/--font-[a-z-]+(?=:)/g) ?? [];
    expect(declared).toHaveLength(Object.keys(fonts).length);
  });

  it('toutes les couleurs sont des hex valides', () => {
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
