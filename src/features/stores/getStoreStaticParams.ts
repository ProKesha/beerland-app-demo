import { repositories } from '@/repositories';
/** Export every repository location for direct links on static web hosting. */
export async function getStoreStaticParams() {
  return [
    ...(await repositories.stores.list()).map((store) => ({ id: store.id })),
    { id: 'local' },
  ];
}
