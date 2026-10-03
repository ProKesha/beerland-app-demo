export function normalizeFlavorValue(value?: number): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(5, Math.max(0, Math.round(value)))
    : null;
}
