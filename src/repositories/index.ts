import { Platform } from 'react-native';
import { demoOrders } from '@/services/mock/accountOrders';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '@/config/env';
import { createMockRepositories } from '@/services/mock/repositories';
import { createSessionAwareRepositories } from './sessionAware';
import type { Repositories } from './contracts';
import { createUnavailableRepositories } from './unavailable';
// Replace this composition point with API adapters when backend contracts exist.
const storage =
  Platform.OS === 'web' && typeof window === 'undefined'
    ? undefined
    : AsyncStorage;
const base =
  config.dataSource === 'unavailable' || config.ready === false
    ? createUnavailableRepositories()
    : createMockRepositories({
        storage,
        demoAccount: true,
        authEnabled: config.demoAuthEnabled,
        seedOrders: demoOrders(),
      });
export const repositories: Repositories = createSessionAwareRepositories(
  base,
  storage,
);
export { base as baseRepositories, storage as repositoryStorage };
export const repositoryMode = config.dataSource;
