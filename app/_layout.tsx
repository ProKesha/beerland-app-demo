import {
  Stack,
  DefaultTheme,
  ThemeProvider,
  ErrorBoundary as ExpoErrorBoundary,
  type ErrorBoundaryProps,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Head from 'expo-router/head';
import { AppProviders } from '@/components/common/AppProviders';
import { AppFrame } from '@/components/common/AppFrame';
import { FontProvider } from '@/theme/FontProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { colors } from '@/theme/tokens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RecoveryScreen } from '@/components/common/RecoveryScreen';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { config } from '@/config/env';

export function ErrorBoundary(props: ErrorBoundaryProps) {
  if (config.developmentToolsEnabled) return <ExpoErrorBoundary {...props} />;
  return (
    <SafeAreaProvider>
      <AppFrame>
        <RecoveryScreen onRetry={props.retry} />
      </AppFrame>
    </SafeAreaProvider>
  );
}
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.amber,
  },
};
export default function RootLayout() {
  const reducedMotion = useReducedMotion();
  return (
    <FontProvider>
      <AppProviders>
        <Head>
          <title>Beerland</title>
        </Head>
        <ThemeProvider value={navigationTheme}>
          <AppFrame>
            <ToastProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: reducedMotion ? 'none' : 'default',
                }}
              >
                <Stack.Screen name="(main)" />
                <Stack.Screen name="age-verification" />
                <Stack.Screen name="restricted" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="guest-entry" />
                <Stack.Screen name="auth" />
              </Stack>
            </ToastProvider>
          </AppFrame>
        </ThemeProvider>
      </AppProviders>
    </FontProvider>
  );
}
