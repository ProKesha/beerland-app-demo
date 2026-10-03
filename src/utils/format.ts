import type { Money, Product } from '@/types/domain';
export function formatMoney(money: Money) {
  // ICU versions disagree on the Ukrainian UAH symbol (₴ versus грн).
  // Keep server-rendered prices identical to the first browser render.
  if (money.currency === 'UAH') {
    const amount = new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: money.amount % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(money.amount / 100);
    return `${amount}\u00a0₴`;
  }
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: money.currency,
  }).format(money.amount / 100);
}
export function formatVolume(volume: Product['volume']) {
  return `${new Intl.NumberFormat('uk-UA').format(volume.value)} ${volume.unit === 'ml' ? 'мл' : 'г'}`;
}
