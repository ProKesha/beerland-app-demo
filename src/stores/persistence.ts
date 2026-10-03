import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type PersistOptions } from 'zustand/middleware';
import type { ZodType } from 'zod';
const hydrationFailures = new Set<string>();
export const hasPersistenceFailure = () => hydrationFailures.size > 0;
// Lazy storage access plus skipHydration keeps static rendering browser-independent.
export function persistence<T, P>(
  name: string,
  schema: ZodType<P>,
  partialize: (state: T) => P,
): PersistOptions<T, P> {
  return {
    name: `beerland:${name}`,
    version: 1,
    storage: createJSONStorage(() => ({
      ...AsyncStorage,
      getItem: async (key: string) => {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return raw;
        let usable = false;
        try {
          const record: unknown = JSON.parse(raw);
          usable =
            !!record &&
            typeof record === 'object' &&
            'version' in record &&
            record.version === 1 &&
            'state' in record &&
            schema.safeParse(record.state).success;
        } catch {
          /* Preserve malformed records and restore safe defaults. */
        }
        if (usable) return raw;
        const recoveryKey = `${key}:recovery:v1`;
        if (!(await AsyncStorage.getItem(recoveryKey)))
          await AsyncStorage.setItem(recoveryKey, raw);
        return null;
      },
    })),
    skipHydration: true,
    partialize,
    // Unsupported versions are retained in recovery storage. Version 1 needs
    // no migration; any future version must add an explicit, tested migration.
    onRehydrateStorage: () => {
      hydrationFailures.delete(name);
      return (_state, error) => {
        if (error) hydrationFailures.add(name);
      };
    },
    merge: (persisted, current) => {
      const result = schema.safeParse(persisted);
      return result.success ? { ...current, ...result.data } : current;
    },
  };
}
