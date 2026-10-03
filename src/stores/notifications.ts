import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { persistence } from './persistence';
export const notificationSchema = z.object({
  promotions: z.boolean(),
  orders: z.boolean(),
  loyalty: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationSchema>;
export const useNotificationPreferences = create<
  NotificationPreferences & {
    toggle: (key: keyof NotificationPreferences) => void;
  }
>()(
  persist(
    (set) => ({
      promotions: false,
      orders: true,
      loyalty: false,
      toggle: (key) => set((s) => ({ [key]: !s[key] })),
    }),
    persistence(
      'notification-preferences',
      notificationSchema,
      ({ promotions, orders, loyalty }) => ({ promotions, orders, loyalty }),
    ),
  ),
);
