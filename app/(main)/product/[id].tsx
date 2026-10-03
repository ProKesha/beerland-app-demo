import { useLocalSearchParams } from 'expo-router';
import { ProductDetailScreen } from '@/features/product/ProductDetailScreen';
import { safeProductId } from '@/features/firstLaunch/navigation';
export { getProductStaticParams as generateStaticParams } from '@/features/product/getProductStaticParams';
export default function ProductRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductDetailScreen id={safeProductId(id) ?? ''} />;
}
