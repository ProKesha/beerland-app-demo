import { Redirect, Stack, usePathname, type Href } from 'expo-router';
import { StartupScreen } from '@/features/firstLaunch/StartupScreen';
import {
  firstLaunchDestination,
  productIntentFromPath,
} from '@/features/firstLaunch/navigation';
import { useFirstLaunchStore } from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import { useAuthFlow } from '@/features/auth/flow';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function MainLayout() {
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const hydrated = useSessionStore((state) => state.hydrated);
  const firstLaunch = useFirstLaunchStore();
  const mergePending = useAuthFlow((state) => !!state.pendingUser);
  if (!hydrated || !firstLaunch.loaded) return <StartupScreen />;
  if (
    firstLaunch.ageStatus !== 'confirmedAdult' ||
    !firstLaunch.onboardingCompleted ||
    !firstLaunch.guestEntered
  )
    return (
      <Redirect
        href={firstLaunchDestination(
          firstLaunch,
          productIntentFromPath(pathname),
        )}
      />
    );
  if (mergePending) return <Redirect href={'/auth/merge' as Href} />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'default',
      }}
    >
      <Stack.Screen name="product/[id]" dangerouslySingular />
      <Stack.Screen name="store/[id]" dangerouslySingular />
      <Stack.Screen name="order/[id]" dangerouslySingular />
      <Stack.Screen name="checkout" dangerouslySingular />
      <Stack.Screen name="orders" dangerouslySingular />
      <Stack.Screen name="favorites" dangerouslySingular />
      <Stack.Screen name="addresses" dangerouslySingular />
      <Stack.Screen name="profile/personal" dangerouslySingular />
      <Stack.Screen name="loyalty" dangerouslySingular />
      <Stack.Screen name="search" dangerouslySingular />
      <Stack.Screen name="settings/index" dangerouslySingular />
      <Stack.Screen name="settings/notifications" dangerouslySingular />
    </Stack>
  );
}
