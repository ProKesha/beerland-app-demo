import { colors } from './tokens';
const themes = {
  ipa: { accent: colors.ipa, tint: colors.ipaTint, label: 'IPA' },
  amber: {
    accent: colors.amber,
    tint: colors.amberTint,
    label: 'Бурштиновий ель',
  },
  stout: {
    accent: colors.stout,
    tint: colors.stoutTint,
    label: 'Стаут / портер',
  },
  wheat: { accent: colors.wheat, tint: colors.wheatTint, label: 'Пшеничне' },
  lager: { accent: colors.wheat, tint: colors.wheatTint, label: 'Лагер' },
  cider: { accent: colors.ipa, tint: colors.ipaTint, label: 'Сидр' },
  snacks: { accent: colors.amber, tint: colors.amberTint, label: 'Закуски' },
  unknown: {
    accent: colors.primary,
    tint: colors.background,
    label: 'Інший стиль',
  },
} as const;
const aliases: Record<string, keyof typeof themes> = {
  ipa: 'ipa',
  hoppy: 'ipa',
  'india pale ale': 'ipa',
  amber: 'amber',
  ale: 'amber',
  'amber ale': 'amber',
  stout: 'stout',
  porter: 'stout',
  wheat: 'wheat',
  'wheat beer': 'wheat',
  lager: 'lager',
  cider: 'cider',
  snacks: 'snacks',
};
export function getBeerStyleTheme(style?: string) {
  const key = style?.trim().toLowerCase() ?? '';
  return themes[Object.hasOwn(aliases, key) ? aliases[key] : 'unknown'];
}
