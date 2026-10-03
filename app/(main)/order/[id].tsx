import { useLocalSearchParams } from 'expo-router';
import { OrderDetailScreen } from '@/features/orders/OrderDetailScreen';
import { safeProductId } from '@/features/firstLaunch/navigation';
export default function OrderRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailScreen id={safeProductId(id) ?? ''} />;
}

export { getOrderStaticParams as generateStaticParams } from '@/features/orders/getOrderStaticParams';
