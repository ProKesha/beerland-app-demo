import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/ui';
import { CraftAccent } from '@/components/common/CraftAccent';
import { colors, radius, spacing } from '@/theme/tokens';
import { ProductSection, type ProductSectionProps } from './ProductSection';
export function BreweryFeature(props: ProductSectionProps) {
  if (!props.products.length) return null;
  return (
    <View style={styles.root}>
      <View style={styles.note}>
        <CraftAccent size={spacing.xxxl} />
        <AppText variant="bodySmall" color="textSubtle" style={styles.copy}>
          Зварено з увагою до деталей.
        </AppText>
      </View>
      <ProductSection {...props} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.ipaTint,
    borderRadius: radius.md,
  },
  copy: { flex: 1 },
});
