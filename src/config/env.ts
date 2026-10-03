import { resolveConfig } from './environment';

// Expo only inlines direct accesses to EXPO_PUBLIC_* properties.
export const config = resolveConfig(
  {
    environment: process.env.EXPO_PUBLIC_APP_ENV,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    demoAuth: process.env.EXPO_PUBLIC_DEMO_AUTH,
    designSystem: process.env.EXPO_PUBLIC_DESIGN_SYSTEM,
  },
  __DEV__,
);
