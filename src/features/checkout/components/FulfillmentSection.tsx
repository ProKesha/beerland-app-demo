import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, ErrorState, LoadingIndicator } from '@/components/ui';
import {
  StoreSelectorCard,
  StorePicker,
} from '@/features/home/components/StoreSelectorCard';
import { FulfillmentSelector } from '@/features/home/components/FulfillmentSelector';
import { useStores } from '@/features/stores/useStores';
import { useSelectedStore } from '@/stores/selectedStore';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { spacing } from '@/theme/tokens';
export function FulfillmentSection({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const stores = useStores();
  const storeId = useSelectedStore((s) => s.storeId);
  const store = stores.data?.find((s) => s.id === storeId);
  const method = useFulfillmentStore((s) => s.method);
  const selectMethod = useFulfillmentStore((s) => s.select);
  const [open, setOpen] = useState(false);
  if (stores.isPending) return <LoadingIndicator />;
  if (stores.isError)
    return (
      <ErrorState
        onRetry={() => {
          void stores.refetch();
        }}
      />
    );
  return (
    <View
      style={[styles.root, { pointerEvents: disabled ? 'none' : 'auto' }]}
      accessibilityElementsHidden={disabled}
      importantForAccessibility={disabled ? 'no-hide-descendants' : 'auto'}
    >
      <StoreSelectorCard store={store} onChoose={() => setOpen(true)} />
      <FulfillmentSelector
        method={method}
        store={store}
        onChange={(next) => {
          if (!disabled) selectMethod(next);
        }}
      />
      {store && (
        <AppText variant="caption" color="textSubtle">
          {method === 'pickup'
            ? 'Час готовності уточнимо після підтвердження.'
            : 'Вартість доставки демонстраційна. Час уточнимо після підтвердження.'}
        </AppText>
      )}
      <StorePicker
        visible={open && !disabled}
        stores={stores.data ?? []}
        selectedId={storeId ?? undefined}
        onClose={() => setOpen(false)}
        onSelect={(next) => {
          useSelectedStore.getState().select(next.id);
          setOpen(false);
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({ root: { gap: spacing.lg } });
