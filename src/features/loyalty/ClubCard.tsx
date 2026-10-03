import { View, StyleSheet } from 'react-native';
import { AppText, Button, Card } from '@/components/ui';
import type { LoyaltyAccount } from '@/types/domain';
import { colors, radius, spacing } from '@/theme/tokens';
import { loyaltyProgress } from './rules';
export function ClubCard({
  account,
  onOpen,
}: {
  account: LoyaltyAccount;
  onOpen?: () => void;
}) {
  const progress = loyaltyProgress(account);
  return (
    <Card style={styles.card} accessibilityLabel="Картка Beerland Club">
      <AppText variant="label" color="background">
        BEERLAND CLUB · ДЕМО
      </AppText>
      <AppText variant="display" color="background">
        {account.pointsBalance.toLocaleString('uk-UA')} бонусів
      </AppText>
      <AppText variant="title" color="background">
        {account.tier}
      </AppText>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="До наступного рівня"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(progress.progress * 100),
        }}
        style={styles.track}
      >
        <View style={[styles.fill, { width: `${progress.progress * 100}%` }]} />
      </View>
      <AppText variant="bodySmall" color="background">
        {progress.next
          ? `${account.pointsToNextTier.toLocaleString('uk-UA')} бонусів до ${progress.next}`
          : 'Найвищий рівень'}
      </AppText>
      {onOpen && (
        <Button
          label="Відкрити клубну картку"
          variant="accent"
          onPress={onOpen}
        />
      )}
    </Card>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.primary, gap: spacing.lg },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.textSubtle,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.amber },
});
