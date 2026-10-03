import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { shopPalette, spacing } from '@/theme/tokens';

export function ShopPageBanner({
  title,
  subtitle,
  label = 'BEERLAND',
}: {
  title: string;
  subtitle?: string;
  label?: string;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.root} testID="shop-page-banner">
      <View style={styles.copy}>
        <AppText variant="caption" style={styles.eyebrow}>
          {label}
        </AppText>
        <AppText
          variant={width >= 740 ? 'displayLarge' : 'h1'}
          accessibilityRole="header"
          style={styles.heading}
        >
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="bodySmall" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      {width >= 380 && (
        <View style={styles.art} accessibilityElementsHidden>
          <View style={styles.bubbleLarge} />
          <View style={styles.bubbleSmall} />
          <AppText style={styles.star}>✳</AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 158,
    padding: spacing.xxl,
    backgroundColor: shopPalette.gold,
    borderRadius: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: { flex: 1, gap: spacing.xs, zIndex: 1 },
  eyebrow: { color: shopPalette.navy, letterSpacing: 1.5 },
  heading: { color: shopPalette.navy, textTransform: 'uppercase' },
  subtitle: { color: shopPalette.navy, maxWidth: 420 },
  art: {
    width: 72,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { color: shopPalette.navy, fontSize: 74, lineHeight: 100 },
  bubbleLarge: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderWidth: 2,
    borderColor: shopPalette.navy,
    backgroundColor: shopPalette.white,
    borderRadius: 7,
    top: 0,
    right: 8,
  },
  bubbleSmall: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: shopPalette.navy,
    backgroundColor: shopPalette.white,
    borderRadius: 4,
    bottom: 4,
    left: 0,
  },
});
