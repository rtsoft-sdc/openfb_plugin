/**
 * Safely coerce a value to an array.
 *
 * - `null` / `undefined` → `[]`
 * - already an array → returned as-is
 * - single value → wrapped in `[value]`
 *
 * Useful when parsing XML nodes that may be a single object or an array.
 */
export function asArray<T>(val: T | T[] | null | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}
