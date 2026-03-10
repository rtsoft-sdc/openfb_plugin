/**
 * Qualifies a local name with a namespace prefix.
 *
 * - If namespace is empty, returns localName as-is.
 * - If localName already contains a dot (already qualified), returns as-is.
 * - Otherwise returns `namespace.localName`.
 */
export function qualifyName(namespace: string, localName: string): string {
  if (!namespace) {
    return localName;
  }
  if (localName.includes(".")) {
    return localName;
  }
  return `${namespace}.${localName}`;
}
