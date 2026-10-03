import { DiscoveryScreen } from './DiscoveryScreen';
export function SearchScreen() {
  return (
    <DiscoveryScreen
      searchMode
      initial={{ query: '', category: 'all', sort: 'popular', filters: {} }}
    />
  );
}
