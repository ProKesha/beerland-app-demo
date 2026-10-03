import { z } from 'zod';

const schema = z.object({
  environment: z.enum(['development', 'demo', 'production']).optional(),
  apiUrl: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.url().optional(),
  ),
  demoAuth: z.enum(['0', '1']).default('0'),
  designSystem: z.enum(['0', '1']).default('0'),
});
export type AppEnvironment = 'development' | 'demo' | 'production';

/** Public build values only. An API URL does not install a real repository. */
export function resolveConfig(input: unknown, development: boolean) {
  const parsed = schema.safeParse(input);
  const environment: AppEnvironment = parsed.success
    ? (parsed.data.environment ?? (development ? 'development' : 'demo'))
    : 'production';
  const apiUrl = parsed.success ? parsed.data.apiUrl : undefined;
  const production = environment === 'production';
  const developmentToolsEnabled = parsed.success && development && !production;
  return {
    environment,
    apiUrl,
    dataSource: production ? ('unavailable' as const) : ('mock' as const),
    ready: parsed.success && !production,
    // Keep Phase 9B's strict guarantee, including optimized demo exports.
    demoAuthEnabled:
      developmentToolsEnabled && parsed.success && parsed.data.demoAuth === '1',
    developmentToolsEnabled,
    designSystemEnabled:
      developmentToolsEnabled &&
      parsed.success &&
      parsed.data.designSystem === '1',
    configurationIssue: !parsed.success
      ? 'invalid-public-configuration'
      : production
        ? 'production-adapters-required'
        : null,
  };
}
