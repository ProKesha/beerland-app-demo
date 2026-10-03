import { Platform, StyleSheet, View } from 'react-native';
import type { PropsWithChildren } from 'react';
import { usePathname } from 'expo-router';
import { colors, layout } from '@/theme/tokens';
export function AppFrame({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const entryRoute =
    pathname.startsWith('/auth/') ||
    [
      '/age-verification',
      '/onboarding',
      '/guest-entry',
      '/restricted',
    ].includes(pathname);
  return (
    <View style={styles.outer}>
      <View
        testID="app-frame"
        style={[
          styles.inner,
          Platform.OS === 'web' && (entryRoute ? styles.web : styles.shopWeb),
        ]}
      >
        {children}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  outer: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: colors.background,
  },
  web: { maxWidth: layout.maxAppWidth },
  shopWeb: { maxWidth: layout.maxShopWidth },
});
