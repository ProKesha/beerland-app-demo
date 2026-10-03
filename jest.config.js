const common = {
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFiles: ['<rootDir>/jest.setup.js'],
};
module.exports = {
  projects: [
    { ...common, displayName: 'ios', preset: 'jest-expo/ios' },
    { ...common, displayName: 'android', preset: 'jest-expo/android' },
  ],
};
