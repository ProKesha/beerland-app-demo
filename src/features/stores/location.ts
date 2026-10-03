import type { Store } from '@/types/domain';
export type Coordinates = Store['coordinates'];
export function distanceKm(from: Coordinates, to: Coordinates) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(radians(to.latitude - from.latitude) / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(radians(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
}
export const formatDistance = (km: number) =>
  `≈ ${km.toLocaleString('uk-UA', { maximumFractionDigits: 1 })} км`;
export function sortStores(
  stores: Store[],
  selectedId: string | null,
  location?: Coordinates,
) {
  return [...stores].sort(
    (a, b) =>
      Number(b.id === selectedId) - Number(a.id === selectedId) ||
      (location
        ? distanceKm(location, a.coordinates) -
          distanceKm(location, b.coordinates)
        : 0) ||
      a.name.localeCompare(b.name, 'uk'),
  );
}
export function phoneUrl(phone: string) {
  const normalized = phone.replace(/[\s().-]/g, '');
  return /^\+?\d{7,15}$/.test(normalized) ? `tel:${normalized}` : null;
}
export function directionsUrl(store: Store, platform: string) {
  const point = `${store.coordinates.latitude},${store.coordinates.longitude}`;
  return platform === 'ios'
    ? `https://maps.apple.com/?daddr=${point}`
    : platform === 'android'
      ? `geo:${point}?q=${point}(${encodeURIComponent(store.name)})`
      : `https://www.openstreetmap.org/directions?to=${encodeURIComponent(point)}`;
}
