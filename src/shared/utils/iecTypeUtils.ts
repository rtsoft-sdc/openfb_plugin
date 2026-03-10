/**
 * Strip IEC 61499 namespace prefix (e.g. "IEC61499::LINT" → "LINT").
 * Returns the original string when no "::" separator is present.
 */
export function stripNamespacePrefix(typeName: string): string {
  if (!typeName.includes("::")) return typeName;
  return typeName.split("::").pop() || typeName;
}
