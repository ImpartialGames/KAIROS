import i18n from '@/i18n';

describe('i18n', () => {
  it('démarre en français (langue source)', () => {
    expect(i18n.language).toBe('fr');
  });

  it('sert les chaînes du namespace common', () => {
    expect(i18n.t('appName')).toBe('KAIROS');
    expect(i18n.t('home.startFast')).toBe('Commencer un jeûne');
  });

  it('sert le namespace precautions (contenu santé critique)', () => {
    expect(i18n.t('title', { ns: 'precautions' })).toBe('Avant votre premier jeûne');
    const sections = i18n.t('sections', { ns: 'precautions', returnObjects: true });
    expect(Array.isArray(sections)).toBe(true);
    expect(sections).toHaveLength(4);
  });

  it('retombe sur le français pour une locale non traduite', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('appName')).toBe('KAIROS');
    await i18n.changeLanguage('fr');
  });
});
