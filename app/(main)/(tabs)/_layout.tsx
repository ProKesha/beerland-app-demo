import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui/Icon';
import { useCartStore } from '@/stores/cart';
import {
  componentHeights,
  layout,
  shopPalette,
  spacing,
  typography,
} from '@/theme/tokens';
export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const desktopShop = Platform.OS === 'web' && width >= 740;
  const insets = useSafeAreaInsets();
  const count = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: shopPalette.gold,
        tabBarInactiveTintColor: shopPalette.white,
        tabBarLabelPosition: 'below-icon',
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          display: desktopShop ? 'none' : 'flex',
          height: componentHeights.tabBar + insets.bottom,
          backgroundColor: shopPalette.navy,
          borderTopColor: shopPalette.navy,
        },
        tabBarItemStyle: {
          minHeight: layout.touchTarget,
          paddingVertical: spacing.xs,
        },
        tabBarLabelStyle: typography.navigation,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Головна',
          tabBarAccessibilityLabel: 'Головна',
          tabBarIcon: ({ color }) => <Icon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Каталог',
          tabBarAccessibilityLabel: 'Каталог',
          tabBarIcon: ({ color }) => <Icon name="grid" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: 'Магазини',
          tabBarAccessibilityLabel: 'Магазини',
          tabBarIcon: ({ color }) => <Icon name="map-pin" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Кошик',
          tabBarBadge: count > 0 ? (count > 99 ? '99+' : count) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: shopPalette.gold,
            color: shopPalette.navy,
            ...typography.caption,
          },
          tabBarAccessibilityLabel: 'Кошик',
          tabBarIcon: ({ color }) => <Icon name="shopping-bag" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarAccessibilityLabel: 'Профіль',
          tabBarIcon: ({ color }) => <Icon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
