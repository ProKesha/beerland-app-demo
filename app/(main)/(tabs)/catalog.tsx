import { useLocalSearchParams } from 'expo-router';
import { CatalogScreen } from '@/features/catalog/CatalogScreen';
import { readCatalogIntent } from '@/features/catalog/catalogIntent';
export default function CatalogRoute() {
  const params = useLocalSearchParams();
  return <CatalogScreen intent={readCatalogIntent(params)} />;
}
