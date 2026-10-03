import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { normalizeFlavorValue } from '@/utils/scales';
import { AppText } from '@/components/ui/AppText';
export interface FlavorValues {
  bitterness?: number;
  sweetness?: number;
  acidity?: number;
  fullness?: number;
}
const labels = {
  bitterness: 'Гіркота',
  sweetness: 'Солодкість',
  acidity: 'Кислинка',
  fullness: 'Насиченість',
} as const;
export function FlavorProfile({ values }: { values: FlavorValues }) {
  return (
    <View style={styles.root}>
      {(Object.keys(labels) as (keyof FlavorValues)[]).map((key) => {
        const value = normalizeFlavorValue(values[key]);
        return (
          <View
            key={key}
            accessible
            accessibilityLabel={`${labels[key]}: ${value === null ? 'Немає даних' : `${value} з 5`}`}
            style={styles.row}
          >
            <AppText variant="bodySmall" style={styles.label}>
              {labels[key]}
            </AppText>
            {value === null ? (
              <AppText variant="caption" color="textSubtle">
                Немає даних
              </AppText>
            ) : (
              <View
                style={styles.scale}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <View
                    key={n}
                    style={[
                      styles.mark,
                      {
                        backgroundColor:
                          n <= value ? colors.primary : colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  root: { gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  label: { flexGrow: 1 },
  scale: { flexDirection: 'row', gap: spacing.xs },
  mark: { height: spacing.sm, width: spacing.xl, borderRadius: radius.pill },
});
