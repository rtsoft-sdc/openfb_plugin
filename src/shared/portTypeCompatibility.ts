/**
 * IEC 61499 / IEC 61131-3 port data type compatibility checker.
 *
 * Implements directional assignability rules (implicit widening conversions)
 * and generic type (ANY_*) hierarchy matching.
 *
 * Generic type hierarchy:
 *
 *  ANY
 *  ├── ANY_ELEMENTARY
 *  │   ├── ANY_MAGNITUDE
 *  │   │   ├── ANY_NUM
 *  │   │   │   ├── ANY_REAL     → REAL, LREAL
 *  │   │   │   └── ANY_INT
 *  │   │   │       ├── ANY_SIGNED   → SINT, INT, DINT, LINT
 *  │   │   │       └── ANY_UNSIGNED → USINT, UINT, UDINT, ULINT
 *  │   │   └── ANY_DURATION     → TIME, LTIME
 *  │   ├── ANY_BIT              → BOOL, BYTE, WORD, DWORD, LWORD
 *  │   ├── ANY_CHARS
 *  │   │   ├── ANY_STRING       → STRING, WSTRING
 *  │   │   └── ANY_CHAR         → CHAR, WCHAR
 *  │   └── ANY_DATE             → DATE, LDATE, TIME_OF_DAY, LTOD,
 *  │                               DATE_AND_TIME, LDT
 *  └── ANY_DERIVED
 *      └── ANY_STRUCT           → all StructuredType
 */

// ═══════════════════════════════════════════════════════════════════
//  1. Generic type hierarchy — sets of concrete types per category
// ═══════════════════════════════════════════════════════════════════

const ANY_REAL_TYPES     = new Set(["REAL", "LREAL"]);
const ANY_SIGNED_TYPES   = new Set(["SINT", "INT", "DINT", "LINT"]);
const ANY_UNSIGNED_TYPES = new Set(["USINT", "UINT", "UDINT", "ULINT"]);
const ANY_INT_TYPES      = new Set([...ANY_SIGNED_TYPES, ...ANY_UNSIGNED_TYPES]);
const ANY_NUM_TYPES      = new Set([...ANY_REAL_TYPES, ...ANY_INT_TYPES]);
const ANY_DURATION_TYPES = new Set(["TIME", "LTIME"]);
const ANY_MAGNITUDE_TYPES = new Set([...ANY_NUM_TYPES, ...ANY_DURATION_TYPES]);

const ANY_BIT_TYPES      = new Set(["BOOL", "BYTE", "WORD", "DWORD", "LWORD"]);

const ANY_STRING_TYPES   = new Set(["STRING", "WSTRING"]);
const ANY_CHAR_TYPES     = new Set(["CHAR", "WCHAR"]);
const ANY_CHARS_TYPES    = new Set([...ANY_STRING_TYPES, ...ANY_CHAR_TYPES]);

const ANY_DATE_TYPES     = new Set([
  "DATE", "LDATE", "TIME_OF_DAY", "LTOD",
  "DATE_AND_TIME", "LDT",
  // Aliases
  "TOD", "DT", "LDATE_AND_TIME", "LTIME_OF_DAY",
]);

const ANY_ELEMENTARY_TYPES = new Set([
  ...ANY_MAGNITUDE_TYPES,
  ...ANY_BIT_TYPES,
  ...ANY_CHARS_TYPES,
  ...ANY_DATE_TYPES,
]);

/** Generic type name → set of concrete types in its subtree */
const GENERIC_TYPE_MAP: Record<string, Set<string>> = {
  "ANY":            ANY_ELEMENTARY_TYPES,
  "ANY_ELEMENTARY": ANY_ELEMENTARY_TYPES,
  "ANY_MAGNITUDE":  ANY_MAGNITUDE_TYPES,
  "ANY_NUM":        ANY_NUM_TYPES,
  "ANY_REAL":       ANY_REAL_TYPES,
  "ANY_INT":        ANY_INT_TYPES,
  "ANY_SIGNED":     ANY_SIGNED_TYPES,
  "ANY_UNSIGNED":   ANY_UNSIGNED_TYPES,
  "ANY_DURATION":   ANY_DURATION_TYPES,
  "ANY_BIT":        ANY_BIT_TYPES,
  "ANY_CHARS":      ANY_CHARS_TYPES,
  "ANY_STRING":     ANY_STRING_TYPES,
  "ANY_CHAR":       ANY_CHAR_TYPES,
  "ANY_DATE":       ANY_DATE_TYPES,
  // ANY_DERIVED and ANY_STRUCT accept user-defined types — handled specially
};

// ═══════════════════════════════════════════════════════════════════
//  2. Implicit widening rules — isAssignable(target, source)
//     target ← source  (source value fits into target without loss)
// ═══════════════════════════════════════════════════════════════════

/**
 * For each concrete type, the set of concrete types it can accept
 * via implicit widening conversion (including itself).
 *
 * Rule: ASSIGNABLE_FROM[target] contains all source types that
 * can be implicitly assigned to target.
 */
const ASSIGNABLE_FROM: Record<string, Set<string>> = {
  // Signed integers
  "SINT":  new Set(["SINT"]),
  "INT":   new Set(["INT",   "SINT", "USINT"]),
  "DINT":  new Set(["DINT",  "INT",  "SINT", "UINT",  "USINT"]),
  "LINT":  new Set(["LINT",  "DINT", "INT",  "SINT",  "UDINT", "UINT", "USINT"]),

  // Unsigned integers
  "USINT": new Set(["USINT"]),
  "UINT":  new Set(["UINT",  "USINT"]),
  "UDINT": new Set(["UDINT", "UINT", "USINT"]),
  "ULINT": new Set(["ULINT", "UDINT", "UINT", "USINT"]),

  // Real
  "REAL":  new Set(["REAL",  "INT",   "SINT",  "UINT",  "USINT"]),
  "LREAL": new Set(["LREAL", "REAL",  "DINT",  "INT",   "SINT", "UDINT", "UINT", "USINT"]),

  // Bit
  "BOOL":  new Set(["BOOL"]),
  "BYTE":  new Set(["BYTE",  "BOOL"]),
  "WORD":  new Set(["WORD",  "BYTE",  "BOOL"]),
  "DWORD": new Set(["DWORD", "WORD",  "BYTE",  "BOOL"]),
  "LWORD": new Set(["LWORD", "DWORD", "WORD",  "BYTE", "BOOL"]),

  // String
  "STRING":  new Set(["STRING",  "CHAR"]),
  "WSTRING": new Set(["WSTRING", "WCHAR"]),
  "CHAR":    new Set(["CHAR"]),
  "WCHAR":   new Set(["WCHAR"]),

  // Date & time
  "DATE":          new Set(["DATE"]),
  "LDATE":         new Set(["LDATE", "DATE"]),
  "TIME_OF_DAY":   new Set(["TIME_OF_DAY"]),
  "TOD":           new Set(["TOD","TIME_OF_DAY"]),
  "LTOD":          new Set(["LTOD",  "TIME_OF_DAY", "TOD"]),
  "LTIME_OF_DAY":  new Set(["LTIME_OF_DAY", "TIME_OF_DAY", "TOD"]),
  "DATE_AND_TIME": new Set(["DATE_AND_TIME"]),
  "DT":            new Set(["DT", "DATE_AND_TIME"]),
  "LDT":           new Set(["LDT", "DATE_AND_TIME", "DT"]),
  "LDATE_AND_TIME": new Set(["LDATE_AND_TIME", "DATE_AND_TIME", "DT"]),
  "TIME":          new Set(["TIME"]),
  "LTIME":         new Set(["LTIME", "TIME"]),
};

// ═══════════════════════════════════════════════════════════════════
//  3. Core functions
// ═══════════════════════════════════════════════════════════════════

/** Check if a type name is a generic (ANY_*) type in our hierarchy */
export function isGenericType(typeName: string): boolean {
  return typeName.toUpperCase() in GENERIC_TYPE_MAP;
}

/**
 * Check if `target` can accept a value from `source` (implicit widening).
 *
 * Handles:
 * - Exact match
 * - Generic target accepting concrete source from its subtree
 * - Generic source matching generic target with overlapping subtrees
 * - Concrete-to-concrete widening via ASSIGNABLE_FROM table
 */
export function isAssignable(target: string, source: string): boolean {
  const t = target.toUpperCase();
  const s = source.toUpperCase();

  if (t === s) return true;

  // target is generic → source must be in its subtree
  const genericSet = GENERIC_TYPE_MAP[t];
  if (genericSet) {
    // source is concrete → check membership
    if (genericSet.has(s)) return true;
    // source is also generic → check if source subtree overlaps target subtree
    const sourceSet = GENERIC_TYPE_MAP[s];
    if (sourceSet) {
      for (const concrete of sourceSet) {
        if (genericSet.has(concrete)) return true;
      }
    }
    return false;
  }

  // source is generic → target concrete must be in source subtree
  const sourceSet = GENERIC_TYPE_MAP[s];
  if (sourceSet) {
    return sourceSet.has(t);
  }

  // Both concrete → check widening table
  const acceptedBy = ASSIGNABLE_FROM[t];
  if (acceptedBy) {
    return acceptedBy.has(s);
  }

  // Unknown types → only exact match (already checked above)
  return false;
}

/**
 * Top-level compatibility check for DATA port connection.
 *
 * @param sourceType - data type of the output port
 * @param targetType - data type of the input port
 * @param sourceIsGeneric - true if source port type is ANY_*
 */
export function canConnectDataTypes(
  sourceType: string,
  targetType: string,
  sourceIsGeneric: boolean = false
): boolean {
  // If source is generic, also try reverse direction
  // (generic output adapts to what the input expects)
  if (sourceIsGeneric) {
    if (isAssignable(sourceType, targetType)) return true;
  }
  return isAssignable(targetType, sourceType);
}

/**
 * Public API — backward-compatible wrapper used by the reducer.
 *
 * Checks whether two port data types are compatible for connection.
 * Handles undefined types (event ports), generic types, and concrete widening.
 *
 * @param sourceType - type of the output (source) port
 * @param targetType - type of the input (target) port
 */
export function arePortTypesCompatible(sourceType?: string, targetType?: string): boolean {
  // Untyped ports (events, or missing type info) — always allow
  if (!sourceType || !targetType) return true;

  const s = sourceType.toUpperCase();
  const t = targetType.toUpperCase();

  if (s === t) return true;

  return canConnectDataTypes(s, t, isGenericType(s));
}
