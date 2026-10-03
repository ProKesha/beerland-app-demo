import { View, StyleSheet, useWindowDimensions, Pressable } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ToastRegion } from '@/components/ui/Toast';
import { layout, shopPalette, spacing } from '@/theme/tokens';

export function ShopChrome({
  home = false,
  minimal = false,
}: {
  home?: boolean;
  minimal?: boolean;
}) {
  const { width } = useWindowDimensions();
  return (
    <View testID="shop-chrome">
      {!minimal && (
        <View style={styles.notice}>
          <AppText variant="caption" style={styles.noticeText}>
            Нові смаки вже в Beerland · Обирайте своє
          </AppText>
        </View>
      )}
      <View style={styles.header}>
        <View style={styles.inner}>
          {home || minimal ? (
            <AppText
              variant="title"
              accessibilityRole="header"
              accessibilityLabel={home ? 'Головна' : 'Beerland'}
              style={styles.brandText}
            >
              ✳ BEERLAND
            </AppText>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="На головну"
              onPress={() => router.push('/')}
              style={styles.brandButton}
            >
              <AppText variant="title" style={styles.brandText}>
                ✳ BEERLAND
              </AppText>
            </Pressable>
          )}
          {!minimal && width >= 740 && (
            <View style={styles.links}>
              <Button
                label="ПИВО"
                variant="ghost"
                size="compact"
                onPress={() => router.push('/catalog')}
              />
              <Button
                label="МАГАЗИНИ"
                variant="ghost"
                size="compact"
                onPress={() => router.push('/stores')}
              />
              <Button
                label="ОБРАНЕ"
                variant="ghost"
                size="compact"
                onPress={() => router.push('/favorites')}
              />
            </View>
          )}
          {!minimal && (
            <View style={styles.actions}>
              <IconButton
                accessibilityLabel="Відкрити пошук"
                icon={<Icon name="search" />}
                onPress={() => router.push('/search')}
                style={styles.icon}
              />
              <IconButton
                accessibilityLabel="Відкрити профіль"
                icon={<Icon name="user" />}
                onPress={() => router.push('/profile')}
                style={styles.icon}
              />
              {width >= 740 && (
                <IconButton
                  accessibilityLabel="Відкрити кошик"
                  icon={<Icon name="shopping-bag" />}
                  onPress={() => router.push('/cart')}
                  style={styles.icon}
                />
              )}
            </View>
          )}
        </View>
      </View>
      <ToastRegion />
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: shopPalette.navy,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  noticeText: { color: shopPalette.white, textAlign: 'center' },
  header: { backgroundColor: shopPalette.gold },
  inner: {
    minHeight: 64,
    width: '100%',
    maxWidth: layout.maxShopWidth,
    paddingHorizontal: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  brandText: {
    color: shopPalette.navy,
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Manrope_700Bold',
    flexShrink: 1,
  },
  brandButton: { minHeight: layout.touchTarget, justifyContent: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center' },
  icon: { backgroundColor: 'transparent' },
});
