import type { Store } from '@/types/domain';
export const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
export function storeLocalTime(store: Store, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: store.timezone ?? 'Europe/Kyiv',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return {
    day:
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(
        value('weekday'),
      ) + 1,
    minute: Number(value('hour')) * 60 + Number(value('minute')),
  };
}
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function getStoreStatus(store: Store, now = new Date()) {
  if (store.temporarilyClosed)
    return { isOpen: false, label: 'Тимчасово зачинено' };
  const { day, minute } = storeLocalTime(store, now);
  const today = store.openingHours
    .filter((hours) => hours.day === day)
    .sort((a, b) => a.opens.localeCompare(b.opens));
  const overnight = store.openingHours.find(
    (h) =>
      h.day === (day === 1 ? 7 : day - 1) &&
      minutes(h.closes) < minutes(h.opens) &&
      minute < minutes(h.closes),
  );
  const active =
    overnight ??
    today.find(
      (h) =>
        minute >= minutes(h.opens) &&
        (minutes(h.closes) < minutes(h.opens) || minute < minutes(h.closes)),
    );
  if (active) return { isOpen: true, label: `Відчинено до ${active.closes}` };
  const next = today.find((h) => minutes(h.opens) > minute);
  return {
    isOpen: false,
    label: next
      ? `Зачинено · відкриється о ${next.opens}`
      : 'Зачинено сьогодні',
  };
}
export const isStoreOpenNow = (store: Store, now = new Date()) =>
  getStoreStatus(store, now).isOpen;
