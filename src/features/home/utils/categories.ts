import type { IconName } from '@/components/ui/Icon';
import { catalogCategories } from '@/features/catalog/model';
export const homeCategories: { id: string; label: string; icon: IconName }[] = [
  ...catalogCategories.filter(
    (c) => !['all', 'packaged', 'ale'].includes(c.id),
  ),
];
