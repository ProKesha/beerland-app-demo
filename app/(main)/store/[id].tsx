import { useLocalSearchParams } from 'expo-router';
import { StoreDetailScreen } from '@/features/stores/StoreDetailScreen';
import { safeProductId } from '@/features/firstLaunch/navigation';
export { getStoreStaticParams as generateStaticParams } from '@/features/stores/getStoreStaticParams';
export default function StoreRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StoreDetailScreen id={safeProductId(id) ?? ''} />;
}
