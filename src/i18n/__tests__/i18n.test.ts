import i18n from '@/i18n';

describe('i18n', () => {
  it('démarre en français (langue source)', () => {
    expect(i18n.language).toBe('fr');
  });

  it('sert les chaînes du namespace common', () => {
    expect(i18n.t('appName')).toBe('KAIROS');
    expect(i18n.t('home.scaffoldTitle')).toBe('Fondations posées');
  });

  it('retombe sur le français pour une locale non traduite', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('appName')).toBe('KAIROS');
    await i18n.changeLanguage('fr');
  });
});
