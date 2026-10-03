import { DiscoveryScreen } from './DiscoveryScreen';
import { requestFromIntent, type CatalogIntent } from './catalogIntent';
export function CatalogScreen({ intent = {} }: { intent?: CatalogIntent }) {
  const initial = requestFromIntent(intent);
  return <DiscoveryScreen key={JSON.stringify(initial)} initial={initial} />;
}
