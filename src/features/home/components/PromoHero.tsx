import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { Promotion } from '@/types/domain';
import { AppText, Button } from '@/components/ui';
import { shopPalette, spacing } from '@/theme/tokens';
const campaign = require('../../../assets/beerland-campaign.png');
export function PromoHero({
  promotion,
  onPress,
}: {
  promotion?: Promotion;
  onPress: () => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 740;
  return (
    <View style={[styles.root, wide && styles.wide]} testID="home-hero">
      <View style={[styles.copy, wide && styles.wideCopy]}>
        <AppText variant="label" style={styles.kicker}>
          ВІДКРИВАЙТЕ BEERLAND
        </AppText>
        <AppText
          variant={wide ? 'displayLarge' : 'display'}
          accessibilityRole="header"
          style={styles.heading}
        >
          {promotion?.title ?? 'ПИВО ДЛЯ ВАШОГО НАСТРОЮ'}
        </AppText>
        <AppText variant="bodySmall" style={styles.description}>
          {promotion?.description ??
            'Яскраві смаки, які хочеться відкривати разом.'}
        </AppText>
        <Button
          label={promotion ? 'Дивитися добірку' : 'До каталогу'}
          variant="accent"
          onPress={onPress}
          style={styles.action}
        />
      </View>
      <Image
        source={campaign}
        accessibilityLabel="Крафтове пиво та цитрусові на червоному тлі"
        style={[styles.image, wide && styles.wideImage]}
        resizeMode="cover"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    backgroundColor: shopPalette.red,
    borderRadius: spacing.md,
    overflow: 'hidden',
  },
  wide: { flexDirection: 'row', minHeight: 420 },
  copy: { padding: spacing.xxl, gap: spacing.md, justifyContent: 'center' },
  wideCopy: { width: '42%', padding: spacing.huge },
  kicker: { color: shopPalette.gold, letterSpacing: 1.5 },
  heading: { color: shopPalette.white, textTransform: 'uppercase' },
  description: { color: shopPalette.white, maxWidth: 340 },
  action: { alignSelf: 'flex-start', marginTop: spacing.sm },
  image: { width: '100%', height: 230, zIndex: 1 },
  wideImage: { flex: 1, width: undefined, height: '100%' },
});
