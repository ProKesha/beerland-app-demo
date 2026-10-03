import { useState } from 'react';
import { Button, Icon, Modal } from '@/components/ui';
import { useCartStore } from '@/stores/cart';
import { sessionOwner, useSessionStore } from '@/stores/session';

export function ClearCartAction({
  owner,
  onCleared,
}: {
  owner: string;
  onCleared: () => void;
}) {
  const clearCart = useCartStore((state) => state.clear);
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <>
      <Button
        label="Очистити кошик"
        variant="outline"
        size="compact"
        testID="cart-clear"
        leftIcon={<Icon name="trash-2" size="sm" />}
        onPress={() => setConfirmClear(true)}
      />
      <Modal
        visible={confirmClear}
        title="Очистити кошик?"
        description="Усі товари буде видалено з кошика."
        onClose={() => setConfirmClear(false)}
        footer={
          <>
            <Button
              label="Залишити товари"
              variant="outline"
              testID="cart-clear-cancel"
              onPress={() => setConfirmClear(false)}
            />
            <Button
              label="Так, очистити"
              variant="danger"
              testID="cart-clear-confirm"
              onPress={() => {
                setConfirmClear(false);
                if (owner !== sessionOwner(useSessionStore.getState())) return;
                clearCart();
                onCleared();
              }}
            />
          </>
        }
      />
    </>
  );
}
