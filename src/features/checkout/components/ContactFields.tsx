import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { TextInput } from '@/components/ui';
import { useCheckoutStore } from '@/stores/checkout';
import type { CheckoutDetails } from '../model';
export function ContactFields({
  control,
  errors,
  disabled,
}: {
  control: Control<CheckoutDetails>;
  errors: FieldErrors<CheckoutDetails>;
  disabled: boolean;
}) {
  return (
    <>
      {(['name', 'phone', 'email'] as const).map((name) => (
        <Controller
          key={name}
          control={control}
          name={`customer.${name}`}
          render={({ field }) => (
            <TextInput
              ref={field.ref}
              label={
                name === 'name'
                  ? 'Ім’я'
                  : name === 'phone'
                    ? 'Телефон'
                    : 'Електронна пошта (необов’язково)'
              }
              testID={`customer-${name}`}
              value={field.value ?? ''}
              onBlur={field.onBlur}
              disabled={disabled}
              onChangeText={(value) => {
                field.onChange(value);
                useCheckoutStore.getState().update({
                  customer: {
                    ...useCheckoutStore.getState().customer,
                    [name]: value,
                  },
                });
              }}
              errorText={errors.customer?.[name]?.message}
              keyboardType={
                name === 'phone'
                  ? 'phone-pad'
                  : name === 'email'
                    ? 'email-address'
                    : 'default'
              }
              autoComplete={
                name === 'phone' ? 'tel' : name === 'email' ? 'email' : 'name'
              }
              autoCapitalize={name === 'name' ? 'words' : 'none'}
              maxLength={name === 'phone' ? 30 : name === 'name' ? 80 : 160}
              placeholder={name === 'phone' ? '+380XXXXXXXXX' : undefined}
            />
          )}
        />
      ))}
    </>
  );
}
