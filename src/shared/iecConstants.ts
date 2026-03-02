/**
 * IEC 61499 / IEC 61131-3 constants used for FB type creation and validation.
 */

/** Standard IEC 61131-3 elementary data types */
export const IEC_DATA_TYPES = [
  "BOOL",
  "SINT", "INT", "DINT", "LINT",
  "USINT", "UINT", "UDINT", "ULINT",
  "REAL", "LREAL",
  "BYTE", "WORD", "DWORD", "LWORD",
  "STRING", "WSTRING",
  "CHAR", "WCHAR",
  "TIME", "LTIME",
  "DATE", "LDATE",
  "DT", "LDT",
  "TOD", "LTOD",
  "ANY",
  "ANY_ELEMENTARY",
  "ANY_NUM",
  "ANY_REAL",
  "ANY_INT",
  "ANY_BIT",
  "ANY_STRING",
  "ANY_MAGNITUDE",
  "ANY_DURATION",
  "ANY_DATE",
] as const;

export type IecDataType = (typeof IEC_DATA_TYPES)[number];

/**
 * Reserved keywords from IEC 61131-3 Structured Text (4diac IdentifierVerifier).
 * FB names and identifiers must not collide with these (case-insensitive).
 */
export const ST_RESERVED_KEYWORDS = new Set<string>([
  // Control flow
  "IF", "THEN", "ELSE", "ELSIF", "END_IF",
  "FOR", "TO", "BY", "DO", "END_FOR",
  "WHILE", "END_WHILE",
  "REPEAT", "UNTIL", "END_REPEAT",
  "CASE", "OF", "END_CASE",
  "RETURN", "EXIT",
  // Declarations
  "VAR", "VAR_INPUT", "VAR_OUTPUT", "VAR_IN_OUT", "VAR_TEMP", "VAR_EXTERNAL",
  "END_VAR",
  "FUNCTION", "END_FUNCTION",
  "FUNCTION_BLOCK", "END_FUNCTION_BLOCK",
  "PROGRAM", "END_PROGRAM",
  "TYPE", "END_TYPE",
  "STRUCT", "END_STRUCT",
  // Operators & literals
  "AND", "OR", "NOT", "XOR", "MOD",
  "TRUE", "FALSE",
  // Data types (also reserved as identifiers)
  ...IEC_DATA_TYPES,
]);
