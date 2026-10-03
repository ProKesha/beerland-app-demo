const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['dist/*', 'coverage/*'] },
  {
    files: [
      'app/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/mock/*', '**/services/mock/*'],
              message:
                'Use repository-backed query hooks instead of importing mocks in UI.',
            },
          ],
        },
      ],
    },
  },
]);
