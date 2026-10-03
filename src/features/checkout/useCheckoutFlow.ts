import { useState } from 'react';
import { Platform } from 'react-native';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { router } from 'expo-router';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { useCartStore } from '@/stores/cart';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useCartQuote } from '@/features/cart/useCartQuote';
import {
  CheckoutReviewError,
  useCreateOrder,
} from '@/features/orders/useCreateOrder';
import { checkoutSchema, paymentMethods, type CheckoutDetails } from './model';

export function useCheckoutFlow() {
  const draft = useCheckoutStore.getState();
  const submitting = useCheckoutStore((s) => s.submitting);
  const items = useCartStore((s) => s.items);
  const method = useFulfillmentStore((s) => s.method);
  const { addresses, selectedId } = useAddressStore();
  const address =
    addresses.find((a) => a.id === selectedId) ??
    addresses.find((a) => a.isDefault);
  const quote = useCartQuote();
  const createOrder = useCreateOrder();
  const [addressError, setAddressError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CheckoutDetails>({
    defaultValues: {
      customer: draft.customer,
      comment: draft.comment,
      ageConfirmed: false,
      paymentMethod: paymentMethods(Platform.OS).includes(draft.paymentMethod)
        ? draft.paymentMethod
        : 'card',
      fulfillmentType: method,
    },
  });
  const selectedPayment = useWatch({ control, name: 'paymentMethod' });
  const submit = handleSubmit(async (values) => {
    if (submitting || !quote.data?.canCheckout) return;
    clearErrors();
    setAddressError('');
    setSubmitError('');
    const parsed = checkoutSchema.safeParse({
      ...values,
      fulfillmentType: method,
      address: method === 'delivery' ? address : undefined,
    });
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        if (issue.path[0] === 'address') setAddressError(issue.message);
        else
          setError(
            issue.path.join('.') as FieldPath<CheckoutDetails>,
            { message: issue.message },
            { shouldFocus: true },
          );
      });
      return;
    }
    try {
      const order = await createOrder.submit(parsed.data, quote.data);
      if (order)
        router.replace({
          pathname: '/order/success',
          params: { id: order.id },
        });
    } catch (error) {
      setSubmitError(
        error instanceof CheckoutReviewError
          ? error.message
          : 'Спробуйте ще раз.',
      );
    }
  });
  return {
    submitting,
    items,
    method,
    address,
    quote,
    addressError,
    submitError,
    control,
    errors,
    selectedPayment,
    submit,
  };
}
