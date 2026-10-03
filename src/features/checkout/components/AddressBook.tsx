import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { AppText, Button, Card, Modal, TextInput } from '@/components/ui';
import { useAddressStore } from '@/stores/checkout';
import { addressSchema, formatAddress, type Address } from '../model';
import { spacing } from '@/theme/tokens';
let addressSequence = 0;
const fields = [
  ['label', 'Назва адреси'],
  ['city', 'Місто'],
  ['street', 'Вулиця'],
  ['building', 'Будинок'],
  ['apartment', 'Квартира'],
  ['entrance', 'Під’їзд'],
  ['floor', 'Поверх'],
  ['intercom', 'Домофон'],
  ['comment', 'Коментар кур’єру'],
] as const;
export function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Address;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Address>({
    defaultValues: initial ?? { city: 'Київ', street: '', building: '' },
  });
  const save = () =>
    handleSubmit((values) => {
      const result = addressSchema.safeParse({
        ...values,
        id: initial?.id ?? `address-${Date.now()}-${++addressSequence}`,
      });
      if (!result.success) {
        result.error.issues.forEach((issue) =>
          setError(issue.path[0] as keyof Address, { message: issue.message }),
        );
        return;
      }
      useAddressStore.getState().save(result.data);
      onSaved();
    })();
  return (
    <View style={styles.root} testID="address-form">
      {fields.map(([name, label]) => (
        <Controller
          key={name}
          control={control}
          name={name}
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              label={label}
              testID={`address-${name}`}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              errorText={errors[name]?.message}
              maxLength={
                name === 'comment'
                  ? 500
                  : name === 'building'
                    ? 20
                    : name === 'city'
                      ? 80
                      : name === 'street'
                        ? 120
                        : 200
              }
              multiline={name === 'comment'}
              autoCapitalize="sentences"
              returnKeyType={name === 'comment' ? 'default' : 'next'}
            />
          )}
        />
      ))}
      <Button
        label="Зберегти адресу"
        onPress={() => {
          void save();
        }}
      />
      <Button label="Скасувати" variant="outline" onPress={onCancel} />
    </View>
  );
}
export function AddressBook({
  disabled = false,
  error,
}: {
  disabled?: boolean;
  error?: string;
}) {
  const { addresses, selectedId, select, makeDefault, remove } =
    useAddressStore();
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [editor, setEditor] = useState<Address | 'new' | null>(null);
  const selected = addresses.find((a) => a.id === selectedId);
  return (
    <View style={styles.root}>
      {selected && (
        <AppText variant="bodySmall">
          Адреса доставки: {formatAddress(selected)}
        </AppText>
      )}
      {addresses.length === 0 && (
        <AppText variant="bodySmall" color="textSubtle">
          Додайте адресу, щоб оформити доставку.
        </AppText>
      )}
      {addresses.map((address) => (
        <Card key={address.id} testID={`saved-${address.id}`}>
          <AppText variant="label">
            {address.label || 'Адреса'}
            {address.isDefault ? ' · Основна' : ''}
          </AppText>
          <AppText variant="bodySmall">{formatAddress(address)}</AppText>
          {!!address.comment && (
            <AppText variant="caption" color="textSubtle">
              {address.comment}
            </AppText>
          )}
          <Button
            label={
              selectedId === address.id ? 'Обрана адреса' : 'Обрати адресу'
            }
            accessibilityLabel={`Обрати адресу: ${formatAddress(address)}`}
            accessibilityState={{ selected: selectedId === address.id }}
            variant={selectedId === address.id ? 'secondary' : 'outline'}
            disabled={disabled}
            onPress={() => select(address.id)}
          />
          <Button
            label="Редагувати"
            accessibilityLabel={`Редагувати адресу: ${formatAddress(address)}`}
            variant="ghost"
            size="compact"
            disabled={disabled}
            onPress={() => setEditor(address)}
          />
          {!address.isDefault && (
            <Button
              label="Зробити основною"
              accessibilityLabel={`Зробити основною адресу: ${formatAddress(address)}`}
              variant="ghost"
              size="compact"
              disabled={disabled}
              onPress={() => makeDefault(address.id)}
            />
          )}
          <Button
            label="Видалити адресу"
            variant="ghost"
            size="compact"
            disabled={disabled}
            accessibilityLabel={`Видалити адресу: ${formatAddress(address)}`}
            onPress={() => setDeleting(address)}
          />
        </Card>
      ))}
      {!!error && (
        <AppText color="error" accessibilityRole="alert">
          {error}
        </AppText>
      )}
      <Button
        label="Додати адресу"
        variant="outline"
        disabled={disabled}
        onPress={() => setEditor('new')}
      />
      <Modal
        visible={!!deleting}
        title="Видалити адресу?"
        description={deleting ? formatAddress(deleting) : undefined}
        onClose={() => setDeleting(null)}
      >
        <Button
          label="Скасувати"
          variant="outline"
          onPress={() => setDeleting(null)}
        />
        <Button
          label="Підтвердити видалення"
          onPress={() => {
            if (deleting) remove(deleting.id);
            setDeleting(null);
          }}
        />
      </Modal>
      <Modal
        visible={!!editor && !disabled}
        title={editor === 'new' ? 'Нова адреса' : 'Редагувати адресу'}
        onClose={() => setEditor(null)}
      >
        {editor && (
          <AddressForm
            key={editor === 'new' ? 'new' : editor.id}
            initial={editor === 'new' ? undefined : editor}
            onSaved={() => setEditor(null)}
            onCancel={() => setEditor(null)}
          />
        )}
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({ root: { gap: spacing.lg } });
