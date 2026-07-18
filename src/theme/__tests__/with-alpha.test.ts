import { colors, withAlpha } from '@/theme/tokens';

describe('withAlpha', () => {
  it('convertit un hex du thème en rgba avec l’opacité donnée', () => {
    expect(withAlpha('#1A1712', 0.55)).toBe('rgba(26, 23, 18, 0.55)');
    expect(withAlpha(colors.content, 0.16)).toBe('rgba(242, 234, 217, 0.16)');
  });

  it('gère le noir et le blanc', () => {
    expect(withAlpha('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#FFFFFF', 0)).toBe('rgba(255, 255, 255, 0)');
  });
});
