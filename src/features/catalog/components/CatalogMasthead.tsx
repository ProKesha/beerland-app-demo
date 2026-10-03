import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { AppText } from '@/components/ui';
import { shopPalette, spacing } from '@/theme/tokens';

export function CatalogMasthead() {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.root} testID="catalog-masthead">
      <View style={styles.copy}>
        <AppText variant="caption" style={styles.eyebrow}>
          BEERLAND / КАТАЛОГ
        </AppText>
        <AppText
          variant={width >= 740 ? 'displayLarge' : 'display'}
          accessibilityRole="header"
          accessibilityLabel="Каталог"
          style={[
            styles.heading,
            width < 740 && styles.mobileHeading,
            width < 360 && styles.smallHeading,
          ]}
        >
          ПИВО
        </AppText>
        <AppText variant="bodySmall" style={styles.description}>
          Знайдіть смак, який вам до душі
        </AppText>
      </View>
      <Svg
        viewBox="0 0 280 220"
        width={width >= 740 ? 290 : width >= 360 ? 132 : 100}
        height={width >= 740 ? 220 : 160}
        accessibilityElementsHidden
      >
        <Circle
          cx="32"
          cy="50"
          r="5"
          fill={shopPalette.white}
          stroke={shopPalette.navy}
          strokeWidth="2"
        />
        <Circle
          cx="252"
          cy="95"
          r="4"
          fill={shopPalette.white}
          stroke={shopPalette.navy}
          strokeWidth="2"
        />
        <Circle
          cx="240"
          cy="170"
          r="3"
          fill={shopPalette.white}
          stroke={shopPalette.navy}
          strokeWidth="2"
        />
        <Ellipse
          cx="146"
          cy="203"
          rx="74"
          ry="10"
          fill={shopPalette.navy}
          opacity="0.16"
        />
        <Path
          d="M79 64h129l-15 134H94L79 64Z"
          fill={shopPalette.white}
          stroke={shopPalette.navy}
          strokeWidth="4"
        />
        <Path
          d="M90 85h107l-13 104h-81L90 85Z"
          fill="#E69400"
          stroke={shopPalette.navy}
          strokeWidth="2"
        />
        <Path
          d="M82 65c-1-17 8-24 20-25 8-17 30-18 42-8 17-11 39-4 44 11 16 0 25 10 21 24-9 7-15 5-21 1-2 18-9 24-17 12-8 11-18 9-20-3-7 12-16 10-20-1-6 11-15 10-19-2-9 9-23 8-30-9Z"
          fill={shopPalette.white}
          stroke={shopPalette.navy}
          strokeWidth="4"
        />
        <Path
          d="M109 101v72M137 95v81M165 101v73"
          stroke={shopPalette.white}
          strokeWidth="5"
          strokeLinecap="round"
          opacity="0.6"
        />
        <Circle
          cx="122"
          cy="135"
          r="5"
          fill={shopPalette.white}
          opacity="0.8"
        />
        <Circle
          cx="164"
          cy="153"
          r="4"
          fill={shopPalette.white}
          opacity="0.8"
        />
        <Rect
          x="107"
          y="187"
          width="75"
          height="9"
          fill={shopPalette.white}
          opacity="0.7"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: shopPalette.gold,
    minHeight: 178,
    padding: spacing.xxl,
    borderRadius: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  copy: { flex: 1, gap: spacing.xs, zIndex: 1 },
  eyebrow: { color: shopPalette.navy, letterSpacing: 1 },
  heading: { color: shopPalette.navy, fontSize: 52, lineHeight: 60 },
  mobileHeading: { fontSize: 42, lineHeight: 50 },
  smallHeading: { fontSize: 34, lineHeight: 42 },
  description: { color: shopPalette.navy, maxWidth: 240 },
});
