import { ScrollView, View, StyleSheet } from 'react-native';
import { AppText, FilterChip, Icon } from '@/components/ui';
import { shopPalette, spacing } from '@/theme/tokens';
import { homeCategories } from '../utils/categories';
export function CategoryRow({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <View style={styles.root}>
      <AppText variant="h1" accessibilityRole="header" style={styles.heading}>
        ОБИРАЙТЕ ЗА НАСТРОЄМ
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {homeCategories.map(({ id, label, icon }) => (
          <FilterChip
            key={id}
            label={label}
            accessibilityLabel={`Категорія: ${label}`}
            leftIcon={<Icon name={icon} size="sm" />}
            onPress={() => onSelect(id)}
            style={styles.chip}
          />
        ))}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: shopPalette.cream,
    borderRadius: spacing.md,
  },
  heading: { color: shopPalette.navy },
  row: { gap: spacing.sm, padding: spacing.xs },
  chip: { backgroundColor: shopPalette.white },
});
