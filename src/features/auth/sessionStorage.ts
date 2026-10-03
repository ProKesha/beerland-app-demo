import { z } from 'zod';

export const DEMO_SESSION_KEY = 'beerland:demo-auth-session:v1';
export const demoSessionSchema = z.object({
  phone: z.string(),
  expiresAt: z.number(),
});
export type DemoSession = z.infer<typeof demoSessionSchema>;

/** Real token adapters must be platform-specific: SecureStore on native,
 * and a backend-managed session on Web. This adapter holds demo metadata only.
 */
export interface SessionPersistence<T> {
  read(): Promise<T | null>;
  write(value: T): Promise<void>;
  clear(): Promise<void>;
}
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem?(key: string): Promise<unknown>;
};
export function createDemoSessionPersistence(
  storage?: Storage,
): SessionPersistence<DemoSession> {
  return {
    read: async () => {
      const raw = await storage?.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      try {
        return demoSessionSchema.parse(JSON.parse(raw));
      } catch {
        if (storage?.removeItem) await storage.removeItem(DEMO_SESSION_KEY);
        else await storage?.setItem(DEMO_SESSION_KEY, '');
        return null;
      }
    },
    write: async (value) => {
      await storage?.setItem(
        DEMO_SESSION_KEY,
        JSON.stringify(demoSessionSchema.parse(value)),
      );
    },
    clear: async () => {
      if (storage?.removeItem) await storage.removeItem(DEMO_SESSION_KEY);
      else await storage?.setItem(DEMO_SESSION_KEY, '');
    },
  };
}
