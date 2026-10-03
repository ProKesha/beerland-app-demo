import { View } from 'react-native';
import { AppText, Button, Card, Icon } from '@/components/ui';
import type { Store } from '@/types/domain';
import { colors, shopPalette, spacing } from '@/theme/tokens';
import { getStoreStatus } from '../hours';
import { distanceKm, formatDistance, type Coordinates } from '../location';
export function StoreCapabilities({ store }: { store: Store }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="bodySmall">
        <Icon name="shopping-bag" size="sm" />{' '}
        {store.pickupAvailable ? 'Самовивіз' : 'Самовивіз недоступний'}
      </AppText>
      <AppText variant="bodySmall">
        <Icon name="truck" size="sm" />{' '}
        {store.deliveryAvailable ? 'Доставка' : 'Доставка недоступна'}
      </AppText>
    </View>
  );
}
export function StoreCard({
  store,
  selected,
  now,
  location,
  onSelect,
  onOpen,
}: {
  store: Store;
  selected: boolean;
  now: Date;
  location?: Coordinates;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const status = getStoreStatus(store, now);
  return (
    <Card
      testID={`store-card-${store.id}`}
      style={
        selected ? { borderColor: colors.primary, borderWidth: 2 } : undefined
      }
    >
      <View
        accessible={false}
        style={{
          height: spacing.xs,
          backgroundColor: shopPalette.gold,
          borderRadius: spacing.xs,
        }}
      />
      {selected && (
        <AppText variant="caption" color="primary">
          ✓ Ваш магазин
        </AppText>
      )}
      <AppText variant="title">{store.name}</AppText>
      <AppText variant="bodySmall" color="textSubtle">
        {store.city} · {store.address}
      </AppText>
      <AppText
        variant="bodySmall"
        color={status.isOpen ? 'success' : 'textSubtle'}
      >
        {status.label}
      </AppText>
      <StoreCapabilities store={store} />
      {location && (
        <AppText testID="store-distance" variant="caption">
          {formatDistance(distanceKm(location, store.coordinates))}
        </AppText>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Button
          label={selected ? 'Обрано' : 'Обрати'}
          variant="accent"
          accessibilityLabel={`Обрати магазин: ${store.name}`}
          accessibilityState={{ selected }}
          onPress={onSelect}
          size="compact"
        />
        <Button
          label="Детальніше"
          accessibilityLabel={`Детальніше: ${store.name}`}
          variant="outline"
          onPress={onOpen}
          size="compact"
        />
      </View>
    </Card>
  );
}
