import { router } from 'expo-router';
import { useStoreSelection } from '@/features/stores/useStoreSelection';
import { getStoreStatus } from '@/features/stores/hours';
import { useStoreClock } from '@/features/stores/useStoreClock';
import { View, StyleSheet } from 'react-native';
import type { Store } from '@/types/domain';
import { AppText, Button, Card, Icon, Modal } from '@/components/ui';
import { spacing, colors } from '@/theme/tokens';
export function StoreSelectorCard({
  store,
  onChoose,
}: {
  store?: Store;
  onChoose: () => void;
}) {
  const now = useStoreClock();
  return (
    <Card testID="home-selected-store" style={styles.card}>
      <View style={styles.row}>
        <Icon name="map-pin" size="md" />
        <AppText variant="caption" color="textSubtle">
          Ваш магазин
        </AppText>
      </View>
      {store ? (
        <>
          <AppText variant="title">{store.name}</AppText>
          <Button
            label="Детальніше про магазин"
            variant="ghost"
            size="compact"
            onPress={() =>
              router.push({ pathname: '/store/[id]', params: { id: store.id } })
            }
          />
          <AppText variant="bodySmall" color="textSubtle">
            {store.address}
          </AppText>
          <View style={styles.row}>
            <AppText
              variant="caption"
              color={
                getStoreStatus(store, now).isOpen ? 'success' : 'textSubtle'
              }
              style={styles.grow}
            >
              {getStoreStatus(store, now).label}
            </AppText>
            <Button
              label="Змінити"
              accessibilityLabel="Змінити магазин"
              variant="ghost"
              size="compact"
              onPress={onChoose}
            />
          </View>
        </>
      ) : (
        <>
          <AppText variant="bodySmall" color="textSubtle">
            Покажемо актуальний асортимент і ціни.
          </AppText>
          <Button
            label="Оберіть магазин"
            onPress={onChoose}
            variant="secondary"
          />
        </>
      )}
    </Card>
  );
}
export function StorePicker({
  visible,
  stores,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  stores: Store[];
  selectedId?: string;
  onSelect: (store: Store) => void;
  onClose: () => void;
}) {
  const now = useStoreClock();
  const { choose, confirmation, pending } = useStoreSelection(stores, onSelect);
  return (
    <>
      {confirmation}
      <Modal
        visible={visible && !pending}
        title="Оберіть магазин"
        onClose={onClose}
        description="Асортимент залежить від вибраного магазину."
      >
        {stores.length === 0 && (
          <AppText color="textSubtle">
            Магазинів поки немає. Спробуйте пізніше.
          </AppText>
        )}
        {stores.map((store) => (
          <Card key={store.id}>
            <AppText variant="title">{store.name}</AppText>
            <AppText variant="bodySmall" color="textSubtle">
              {store.city} · {store.address}
            </AppText>
            <AppText
              variant="caption"
              color={
                getStoreStatus(store, now).isOpen ? 'success' : 'textSubtle'
              }
            >
              {getStoreStatus(store, now).label}
            </AppText>
            <Button
              label={selectedId === store.id ? 'Обрано' : 'Обрати'}
              accessibilityLabel={`Обрати магазин: ${store.name}`}
              accessibilityState={{ selected: selectedId === store.id }}
              variant={selectedId === store.id ? 'primary' : 'outline'}
              onPress={() => choose(store, onClose)}
            />
          </Card>
        ))}
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  card: { borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grow: { flex: 1 },
});
