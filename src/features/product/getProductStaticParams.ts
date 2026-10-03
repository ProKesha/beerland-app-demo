import { repositories } from '@/repositories';
// Build-time route discovery uses the same repository contract as runtime data.
export async function getProductStaticParams() {
  return [
    ...(await repositories.products.list()).map(({ id }) => ({ id })),
    { id: 'local' },
  ];
}
