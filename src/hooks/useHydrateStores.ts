import type { Repositories } from '@/repositories/contracts';
import { reconcileCartStore } from '@/stores/cartTransfer';
import { hydrateFirstLaunch, useFirstLaunchStore } from '@/stores/firstLaunch';
import { useNotificationPreferences } from '@/stores/notifications';
import { useStoreDiscovery } from '@/stores/storeDiscovery';
import { useAddressStore, useCheckoutStore } from '@/stores/checkout';
import { useEffect } from 'react';
import { useCartStore } from '@/stores/cart';
import { useFavoritesStore } from '@/stores/favorites';
import { useSelectedStore } from '@/stores/selectedStore';
import { useSessionStore } from '@/stores/session';
import { useFulfillmentStore } from '@/stores/fulfillment';
import { useDiscoveryPreferences } from '@/stores/discoveryPreferences';
import {
  activateDemoWorkspace,
  recoverGuestWorkspace,
} from '@/features/auth/workspace';
import { useAuthFlow } from '@/features/auth/flow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { claimGuestOrders } from '@/repositories/sessionAware';
import { hasPersistenceFailure } from '@/stores/persistence';
export function useHydrateStores(repositories: Repositories) {
  const retry = useSessionStore((state) => state.hydrationRetry);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active && !useSessionStore.getState().hydrated)
        useSessionStore.getState().setHydrationError(true);
    }, 8000);
    void Promise.allSettled([
      hydrateFirstLaunch(),
      useNotificationPreferences.persist.rehydrate(),
      useStoreDiscovery.persist.rehydrate(),
      useCartStore.persist.rehydrate(),
      useAddressStore.persist.rehydrate(),
      useCheckoutStore.persist.rehydrate(),
      useFavoritesStore.persist.rehydrate(),
      useSelectedStore.persist.rehydrate(),
      useFulfillmentStore.persist.rehydrate(),
      useDiscoveryPreferences.persist.rehydrate(),
    ]).then(async () => {
      if (!active) return;
      if (hasPersistenceFailure()) {
        clearTimeout(timer);
        useSessionStore.getState().setHydrationError(true);
        return;
      }
      let restoredUser = null;
      let mergePending = false;
      let authFailed = false;
      let guestRecovered = true;
      try {
        if (active) reconcileCartStore();
        const firstLaunch = useFirstLaunchStore.getState();
        if (active) {
          try {
            if (
              firstLaunch.ageStatus === 'confirmedAdult' &&
              firstLaunch.onboardingCompleted &&
              firstLaunch.guestEntered
            )
              restoredUser = await repositories.auth.restoreSession();
            // A retry or unmount can supersede an uncancellable repository read.
            // It must never publish an old account into the new startup attempt.
            if (!active) return;
            // The age gate can be reset or corrupt independently of a saved
            // session. Never let its later guest entry expose an account workspace.
            if (restoredUser) {
              mergePending =
                (await activateDemoWorkspace(restoredUser.id, repositories)) ===
                'conflict';
              if (!active) return;
              if (mergePending)
                useAuthFlow.getState().setPendingUser(restoredUser);
              else
                await claimGuestOrders(
                  repositories,
                  restoredUser.id,
                  AsyncStorage,
                );
            } else await recoverGuestWorkspace();
          } catch {
            if (!active) return;
            authFailed = true;
            restoredUser = null;
            mergePending = false;
            useAuthFlow.getState().setPendingUser(null);
            try {
              await recoverGuestWorkspace();
            } catch {
              // Account-owned data must not be shown as guest data.
              guestRecovered = false;
            }
          }
        }
        if (!active) return;
        if (active && !useAddressStore.getState().seeded) {
          const user = await repositories.users.getCurrent();
          if (active) useAddressStore.getState().seed(user?.addresses ?? []);
        }
      } catch {
        // Existing local data remains usable; repository-backed screens expose retry.
      } finally {
        clearTimeout(timer);
        if (active) {
          if (!guestRecovered) {
            useSessionStore.getState().setHydrationError(true);
            return;
          }
          const firstLaunch = useFirstLaunchStore.getState();
          const session = useSessionStore.getState();
          if (mergePending) session.setStatus('authenticating');
          else if (
            restoredUser &&
            firstLaunch.ageStatus === 'confirmedAdult' &&
            firstLaunch.guestEntered
          )
            session.setAuthenticated(restoredUser);
          else if (authFailed)
            session.setAuthError(
              'Не вдалося відновити демосесію. Гостьові дані збережено.',
            );
          else {
            session.clearAuth();
            session.setStatus(
              firstLaunch.ageStatus === 'confirmedAdult' &&
                firstLaunch.guestEntered
                ? 'guest'
                : 'visitor',
            );
          }
          useSessionStore.getState().setHydrated(true);
          useSessionStore.getState().setHydrationError(false);
        }
      }
    });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [repositories, retry]);
}
