import type { Promotion } from '@/types/domain';
import { AppText, Button, Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
export function PromotionCard({
  promotion,
  onPress,
}: {
  promotion: Promotion;
  onPress: () => void;
}) {
  return (
    <Card style={{ backgroundColor: colors.wheatTint }}>
      <AppText variant="title">{promotion.title}</AppText>
      <AppText variant="bodySmall" color="textSubtle">
        {promotion.description}
      </AppText>
      <Button
        label="Переглянути"
        accessibilityLabel={`Переглянути добірку: ${promotion.title}`}
        variant="outline"
        onPress={onPress}
      />
    </Card>
  );
}
