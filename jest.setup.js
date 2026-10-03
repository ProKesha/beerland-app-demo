jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Font loading is verified in browser/native export; keep navigation tests deterministic.
jest.mock('@/theme/FontProvider', () => ({
  FontProvider: ({ children }) => children,
}));

// Icon glyph assets are ready in component tests; exercise interactions without async font I/O.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  isLoaded: jest.fn(() => true),
}));

// Native WebView is a platform boundary; map behavior is tested via bridge events.
jest.mock('react-native-webview', () => ({
  WebView: require('react-native').View,
}));
