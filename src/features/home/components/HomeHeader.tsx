import { ShopChrome } from '@/components/common/ShopChrome';

export function HomeHeader({ home = true }: { home?: boolean }) {
  return <ShopChrome home={home} />;
}
