import type { TextStyle } from 'react-native';

export const colors = {
  background: '#FFF9EE',
  surface: '#FFFFFF',
  border: '#E6E0D4',
  textPrimary: '#101A3F',
  textSecondary: '#52607A',
  textMuted: '#8991A5',
  textSubtle: '#556079',
  primary: '#101A3F',
  brandBlack: '#111111',
  amber: '#FFB525',
  amberTint: '#FFF0CC',
  ipa: '#6B8E4E',
  ipaTint: '#EAF1E2',
  stout: '#3D2B1F',
  stoutTint: '#EFE6DC',
  wheat: '#E8C547',
  wheatTint: '#FBF6E3',
  success: '#46613A',
  warning: '#865115',
  error: '#A43F35',
  info: '#526557',
  disabled: '#EEEAE4',
  disabledText: '#786F64',
  secondaryBorder: '#C39B70',
  controlBorder: '#AC9C87',
  successTint: '#EAF1E2',
  warningTint: '#FBF6E3',
  infoTint: '#EEF1ED',
  overlay: 'rgba(16,26,63,0.55)',
  focus: '#865115',
  errorTint: '#F9EAE5',
  skeleton: '#E8DFD3',
} as const;
export const shopPalette = {
  navy: '#101A3F',
  gold: '#FFB525',
  goldSoft: '#FFF0CC',
  cream: '#FFF5E1',
  red: '#B70818',
  blue: '#2278C4',
  white: '#FFFFFF',
} as const;
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
} as const;
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
  small: 8,
  card: 12,
} as const;
export const iconSizes = { sm: 16, md: 20, lg: 24, xl: 28 } as const;
export const componentHeights = {
  compact: 48,
  button: 52,
  input: 56,
  tabBar: 64,
} as const;
export const layout = {
  maxAppWidth: 430,
  maxShopWidth: 1200,
  maxDetailWidth: 840,
  touchTarget: 48,
  borderWidth: 1,
  focusWidth: 2,
  focusOffset: 2,
  productAspectRatio: 1.15,
  compactImageWidth: 88,
  productCardMinWidth: 172,
  homeCardWidth: 244,
  homeCompactCardWidth: 328,
  modalMaxHeight: '90%' as const,
};
export const layers = { feedback: 20, modal: 30 } as const;
export const motion = {
  pressedOpacity: 0.76,
  disabledOpacity: 0.5,
  toastDuration: 2000,
} as const;
export const fontFamilies = {
  heading: 'Lora_600SemiBold',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;
const sans = (
  fontSize: number,
  lineHeight: number,
  fontFamily: string = fontFamilies.body,
): TextStyle => ({ fontSize, lineHeight, fontFamily });
const serif = (fontSize: number, lineHeight: number): TextStyle => ({
  fontSize,
  lineHeight,
  fontFamily: fontFamilies.heading,
});
export const typography = {
  displayLarge: serif(40, 48),
  display: serif(34, 42),
  h1: serif(28, 36),
  h2: serif(24, 32),
  h3: serif(20, 28),
  title: sans(18, 26, fontFamilies.bold),
  body: sans(16, 24),
  bodyMedium: sans(16, 24, fontFamilies.medium),
  bodySmall: sans(14, 22),
  label: sans(14, 20, fontFamilies.semibold),
  caption: sans(12, 18, fontFamilies.medium),
  navigation: sans(11, 16, fontFamilies.medium),
  priceLarge: {
    ...sans(28, 36, fontFamilies.bold),
    fontVariant: ['tabular-nums'],
  },
  price: { ...sans(20, 28, fontFamilies.bold), fontVariant: ['tabular-nums'] },
  button: sans(15, 22, fontFamilies.bold),
} satisfies Record<string, TextStyle>;
