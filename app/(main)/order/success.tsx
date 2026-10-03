import { useLocalSearchParams } from 'expo-router';
import { OrderSuccessScreen } from '@/features/orders/OrderSuccessScreen';
import { safeProductId } from '@/features/firstLaunch/navigation';
export default function OrderSuccessRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return <OrderSuccessScreen id={safeProductId(id) ?? undefined} />;
}
