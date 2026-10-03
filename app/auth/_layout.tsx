import { useEffect } from 'react';
import { Redirect, Stack, router, usePathname, type Href } from 'expo-router';
import { StartupScreen } from '@/features/firstLaunch/StartupScreen';
import { firstLaunchDestination } from '@/features/firstLaunch/navigation';
import { useAuthFlow } from '@/features/auth/flow';
import { useFirstLaunchStore } from '@/stores/firstLaunch';
import { useSessionStore } from '@/stores/session';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export default function AuthLayout() {
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const hydrated = useSessionStore((state) => state.hydrated);
  const user = useSessionStore((state) => state.user);
  const pendingMerge = useAuthFlow((state) => !!state.pendingUser);
  const returnTo = useAuthFlow((state) => state.returnTo);
  const firstLaunch = useFirstLaunchStore();
  const permitted =
    hydrated &&
    firstLaunch.loaded &&
    firstLaunch.ageStatus === 'confirmedAdult' &&
    firstLaunch.onboardingCompleted &&
    firstLaunch.guestEntered;
  useEffect(() => {
    if (!permitted) return;
    let destination: string | null = null;
    if (pendingMerge && pathname !== '/auth/merge') destination = '/auth/merge';
    else if (pathname === '/auth/merge' && !pendingMerge)
      destination = user ? '/profile' : '/auth/phone';
    else if (pathname === '/auth/complete-profile' && !user)
      destination = '/auth/phone';
    else if (pathname === '/auth/phone' && user) destination = '/profile';
    else if (pathname === '/auth/otp' && user && !pendingMerge)
      destination = user.needsProfile ? '/auth/complete-profile' : returnTo;
    if (destination) router.replace(destination as Href);
  }, [permitted, pendingMerge, pathname, user, returnTo]);
  if (!hydrated || !firstLaunch.loaded) return <StartupScreen />;
  if (
    firstLaunch.ageStatus !== 'confirmedAdult' ||
    !firstLaunch.onboardingCompleted ||
    !firstLaunch.guestEntered
  )
    return <Redirect href={firstLaunchDestination(firstLaunch)} />;
  // Keep this navigator mounted when replacing one of its own child routes.
  // Removing it for an internal redirect can lose or loop the pending navigation.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reducedMotion ? 'none' : 'default',
      }}
    />
  );
}
