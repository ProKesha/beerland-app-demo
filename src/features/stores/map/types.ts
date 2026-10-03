import type { Store } from '@/types/domain';
export interface StoreMapProps {
  stores: Store[];
  selectedStoreId?: string | null;
  highlightedStoreId?: string | null;
  onSelectStore: (id: string) => void;
  onError: () => void;
}
