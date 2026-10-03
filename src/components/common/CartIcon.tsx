import { View, StyleSheet, type ColorValue } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { AppText } from '@/components/ui/AppText';
import { useCartStore } from '@/stores/cart';
import { formatCartBadge, selectCartLineCount } from '@/stores/cartSelectors';
import {
  layout,
  radius,
  shopPalette,
  spacing,
  typography,
} from '@/theme/tokens';

export const cartIconArea = layout.touchTarget - spacing.xs;
export const cartBadgeStyles = StyleSheet.create({
  root: {
    top: 0,
    end: 0,
    minWidth: spacing.xl,
    height: spacing.xl,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    textAlign: 'center',
    ...typography.caption,
    lineHeight: spacing.xl,
  },
  navigation: {
    backgroundColor: shopPalette.gold,
    color: shopPalette.navy,
  },
  header: {
    backgroundColor: shopPalette.navy,
    color: shopPalette.white,
  },
});

/** Tabs render two icon layers; their navigator owns the single visible badge. */
export function CartIcon({
  color = shopPalette.navy,
  showBadge = true,
}: {
  color?: ColorValue;
  showBadge?: boolean;
}) {
  const count = useCartStore(selectCartLineCount);
  return (
    <View
      style={styles.root}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      <View style={styles.icon}>
        <Icon name="shopping-bag" color={color} />
      </View>
      {count > 0 && (
        <View
          testID="cart-content-indicator"
          style={[styles.contents, { backgroundColor: color }]}
        />
      )}
      {showBadge && count > 0 && (
        <AppText
          testID="cart-icon-badge"
          maxFontSizeMultiplier={1}
          style={[styles.badge, cartBadgeStyles.root, cartBadgeStyles.header]}
        >
          {formatCartBadge(count)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: cartIconArea, height: cartIconArea },
  icon: { position: 'absolute', start: 0, bottom: 0 },
  contents: {
    position: 'absolute',
    start: spacing.sm,
    bottom: spacing.sm,
    width: spacing.sm,
    height: spacing.xs,
  },
  badge: { position: 'absolute' },
});
