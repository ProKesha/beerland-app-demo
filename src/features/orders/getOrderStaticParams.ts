import { repositories } from '@/repositories';
export async function getOrderStaticParams() {
  return [
    ...(await repositories.orders.list()).map(({ id }) => ({ id })),
    { id: 'local' },
  ];
}
