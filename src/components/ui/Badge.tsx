import { View, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { AppText } from './AppText';
const kinds = {
  new: { label: 'Новинка', tint: colors.wheatTint },
  popular: { label: 'Популярне', tint: colors.amberTint },
  ownBrewery: { label: 'Власна броварня', tint: colors.ipaTint },
  promotion: { label: 'Акція', tint: colors.errorTint },
  generic: { label: '', tint: colors.background },
};
export function Badge({
  label,
  kind = 'generic',
}: {
  label?: string;
  kind?: keyof typeof kinds;
}) {
  return (
    <View style={[styles.root, { backgroundColor: kinds[kind].tint }]}>
      <AppText variant="caption">{label ?? kinds[kind].label}</AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    alignSelf: 'flex-start',
    borderRadius: radius.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
