import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon } from '@/components/ui';
import { commerceGroups } from '@/features/catalog/model';
import { radius, shopPalette, spacing } from '@/theme/tokens';
import type { CommerceGroup } from '@/types/domain';

export function CommerceGroupEntries({
  onSelect,
}: {
  onSelect: (group: CommerceGroup) => void;
}) {
  return (
    <View style={styles.root} testID="home-commerce-groups">
      <AppText variant="title" accessibilityRole="header">
        Що шукаєте сьогодні?
      </AppText>
      <View style={styles.entries}>
        {commerceGroups.map(({ id, label, icon }) => (
          <Button
            key={id}
            label={label}
            accessibilityLabel={`Колекція: ${label}`}
            testID={`home-group-${id}`}
            variant="outline"
            leftIcon={<Icon name={icon} size="sm" />}
            rightIcon={<Icon name="arrow-right" size="sm" />}
            onPress={() => onSelect(id)}
            style={styles.entry}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: shopPalette.cream,
  },
  entries: { gap: spacing.sm },
  entry: { width: '100%', justifyContent: 'space-between' },
});
