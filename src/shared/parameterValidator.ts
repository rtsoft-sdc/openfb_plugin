/**
 * IEC 61131-3 parameter value validator.
 *
 * Validates literal values against port data types.
 * Used before dispatching UPDATE_PARAMETER to ensure type safety.
 *
 * Supported types and accepted value formats:
 *
 *   BOOL          → TRUE / FALSE / 0 / 1 / BOOL#0 / BOOL#1
 *   SINT/INT/…    → integer in range, optional sign, optional type prefix (INT#42)
 *   USINT/UINT/…  → unsigned integer in range, optional type prefix
 *   REAL/LREAL    → floating-point number, optional type prefix
 *   BYTE/WORD/…   → unsigned integer / hex literal 16#FF
 *   STRING        → 'text' (single-quoted)
 *   WSTRING       → "text" (double-quoted)
 *   CHAR          → 'x' (single char)
 *   WCHAR         → "x" (single char)
 *   TIME/LTIME    → T#... / TIME#... / LTIME#...
 *   DATE/LDATE    → D#... / DATE#... / LDATE#...
 *   TIME_OF_DAY/TOD/LTOD → TOD#... / TIME_OF_DAY#...
 *   DATE_AND_TIME/DT/LDT → DT#... / DATE_AND_TIME#...
 */

import { t } from "./i18n";
import type { UiLanguage } from "./pluginSettings";

// ═══════════════════════════════════════════════════════════════════
//  Validation result
// ═══════════════════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

const OK: ValidationResult = { valid: true };

function fail(error: string): ValidationResult {
  return { valid: false, error };
}

// ═══════════════════════════════════════════════════════════════════
//  Integer range definitions
// ═══════════════════════════════════════════════════════════════════

interface IntRange {
  min: number | bigint;
  max: number | bigint;
  signed: boolean;
}

const INT_RANGES: Record<string, IntRange> = {
  SINT:  { min: -128,               max: 127,                signed: true },
  INT:   { min: -32768,             max: 32767,              signed: true },
  DINT:  { min: -2147483648,        max: 2147483647,         signed: true },
  LINT:  { min: BigInt("-9223372036854775808"), max: BigInt("9223372036854775807"), signed: true },
  USINT: { min: 0,                  max: 255,                signed: false },
  UINT:  { min: 0,                  max: 65535,              signed: false },
  UDINT: { min: 0,                  max: 4294967295,         signed: false },
  ULINT: { min: BigInt(0),          max: BigInt("18446744073709551615"), signed: false },
};

const BIT_RANGES: Record<string, IntRange> = {
  BYTE:  { min: 0, max: 255,                signed: false },
  WORD:  { min: 0, max: 65535,              signed: false },
  DWORD: { min: 0, max: 4294967295,         signed: false },
  LWORD: { min: BigInt(0), max: BigInt("18446744073709551615"), signed: false },
};

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

/** Strip optional IEC type prefix like "INT#", "REAL#", "T#" etc. */
function stripTypePrefix(value: string, ...prefixes: string[]): string {
  const upper = value.toUpperCase();
  for (const pfx of prefixes) {
    if (upper.startsWith(pfx + "#")) {
      return value.slice(pfx.length + 1);
    }
  }
  return value;
}

/** Parse an integer (decimal or hex 16#..., 2#..., 8#...) */
function parseIecInteger(raw: string): bigint | null {
  const s = raw.trim();
  const upper = s.toUpperCase();

  // IEC base prefix: 16#FF, 2#1010, 8#77
  const baseMatch = upper.match(/^(\d+)#(.+)$/);
  if (baseMatch) {
    const base = parseInt(baseMatch[1], 10);
    if (![2, 8, 16].includes(base)) return null;
    const digits = baseMatch[2].replace(/_/g, "");
    try {
      return BigInt(base === 16 ? "0x" + digits : base === 8 ? "0o" + digits : "0b" + digits);
    } catch {
      return null;
    }
  }

  // Plain decimal (may have sign and underscores)
  const cleaned = s.replace(/_/g, "");
  if (!/^[+-]?\d+$/.test(cleaned)) return null;
  try {
    return BigInt(cleaned);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Type-specific validators
// ═══════════════════════════════════════════════════════════════════

function validateBool(value: string, lang: UiLanguage): ValidationResult {
  const v = stripTypePrefix(value, "BOOL").toUpperCase().trim();
  if (["TRUE", "FALSE", "0", "1"].includes(v)) return OK;
  return fail(t(lang, "validation.param.boolExpected"));
}

function validateSignedInt(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  const range = INT_RANGES[typeName];
  if (!range) return fail(t(lang, "validation.param.unknownType", { typeName }));

  const raw = stripTypePrefix(value, typeName);
  const n = parseIecInteger(raw);
  if (n === null) return fail(t(lang, "validation.param.intExpected", { typeName }));

  if (n < BigInt(range.min) || n > BigInt(range.max)) {
    return fail(t(lang, "validation.param.outOfRange", { typeName, min: String(range.min), max: String(range.max) }));
  }
  return OK;
}

function validateUnsignedInt(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  const range = INT_RANGES[typeName];
  if (!range) return fail(t(lang, "validation.param.unknownType", { typeName }));

  const raw = stripTypePrefix(value, typeName);
  const n = parseIecInteger(raw);
  if (n === null) return fail(t(lang, "validation.param.uintExpected", { typeName }));

  if (n < BigInt(range.min) || n > BigInt(range.max)) {
    return fail(t(lang, "validation.param.outOfRange", { typeName, min: String(range.min), max: String(range.max) }));
  }
  return OK;
}

function validateReal(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  const raw = stripTypePrefix(value, typeName).replace(/_/g, "").trim();
  // Allow scientific notation: 1.5E+10, -3.14, etc.
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(raw)) {
    return fail(t(lang, "validation.param.floatExpected", { typeName }));
  }
  const n = parseFloat(raw);
  if (!isFinite(n)) {
    return fail(t(lang, "validation.param.floatOutOfRange", { typeName }));
  }
  // REAL is 32-bit IEEE 754: ±3.4028235E+38
  if (typeName === "REAL" && Math.abs(n) > 3.4028235e38) {
    return fail(t(lang, "validation.param.realOutOfRange"));
  }
  return OK;
}

function validateBitType(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  if (typeName === "BOOL") return validateBool(value, lang);

  const range = BIT_RANGES[typeName];
  if (!range) return fail(t(lang, "validation.param.unknownType", { typeName }));

  const raw = stripTypePrefix(value, typeName);
  const n = parseIecInteger(raw);
  if (n === null) return fail(t(lang, "validation.param.hexExpected", { typeName }));

  if (n < BigInt(range.min) || n > BigInt(range.max)) {
    return fail(t(lang, "validation.param.outOfRange", { typeName, min: String(range.min), max: String(range.max) }));
  }
  return OK;
}

function validateString(value: string, lang: UiLanguage): ValidationResult {
  const trimmed = value.trim();
  // IEC 61131-3 STRING literals are single-quoted: 'Hello'
  // Also accept unquoted for convenience in parameter assignment
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) return OK;
  // Accept unquoted strings (common in 4diac FORTE parameter values)
  if (trimmed.length > 0) return OK;
  return fail(t(lang, "validation.param.stringExpected"));
}

function validateWString(value: string, lang: UiLanguage): ValidationResult {
  const trimmed = value.trim();
  // IEC WSTRING literals use double quotes: "Hello"
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) return OK;
  // Accept unquoted
  if (trimmed.length > 0) return OK;
  return fail(t(lang, "validation.param.wstringExpected"));
}

function validateChar(value: string, lang: UiLanguage): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length === 3) return OK;
  if (trimmed.length === 1) return OK;
  return fail(t(lang, "validation.param.charExpected"));
}

function validateWChar(value: string, lang: UiLanguage): ValidationResult {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length === 3) return OK;
  if (trimmed.length === 1) return OK;
  return fail(t(lang, "validation.param.wcharExpected"));
}

function validateTime(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  // Accept: T#5s, T#100ms, TIME#1h2m3s, LTIME#500us, t#1s500ms, etc.
  const prefixes = typeName === "LTIME"
    ? ["LTIME", "LT", "T", "TIME"]
    : ["TIME", "T"];
  const raw = stripTypePrefix(value, ...prefixes).trim();
  // Simplified: allow digits with time unit suffixes (d, h, m, s, ms, us, ns)
  if (/^-?(\d+(\.\d+)?\s*(d|h|m(?!s)|s|ms|us|ns|μs)_?\s*)+$/i.test(raw)) return OK;
  // Also accept plain numeric (milliseconds)
  if (/^-?\d+(\.\d+)?$/.test(raw)) return OK;
  return fail(t(lang, "validation.param.timeExpected", { typeName }));
}

function validateDate(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  const prefixes = typeName === "LDATE"
    ? ["LDATE", "LD", "D", "DATE"]
    : ["DATE", "D"];
  const raw = stripTypePrefix(value, ...prefixes).trim();
  // Accept: YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(raw)) return OK;
  return fail(t(lang, "validation.param.dateExpected", { typeName }));
}

function validateTimeOfDay(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  const prefixes = ["LTOD", "LTIME_OF_DAY", "TOD", "TIME_OF_DAY"];
  const raw = stripTypePrefix(value, ...prefixes).trim();
  // Accept: HH:MM:SS or HH:MM:SS.ms
  if (/^\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw)) return OK;
  return fail(t(lang, "validation.param.todExpected", { typeName }));
}

function validateDateAndTime(value: string, typeName: string, lang: UiLanguage): ValidationResult {
  const prefixes = ["LDT", "LDATE_AND_TIME", "DT", "DATE_AND_TIME"];
  const raw = stripTypePrefix(value, ...prefixes).trim();
  // Accept: YYYY-MM-DD-HH:MM:SS
  if (/^\d{4}-\d{1,2}-\d{1,2}-\d{1,2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(raw)) return OK;
  return fail(t(lang, "validation.param.dtExpected", { typeName }));
}

// ═══════════════════════════════════════════════════════════════════
//  Main validation function
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate a parameter value against its IEC 61131-3 data type.
 *
 * @param value    - literal value to validate
 * @param dataType - IEC type name (e.g. "INT", "BOOL", "TIME", "STRING")
 * @param language - UI language for error messages (defaults to "en")
 * @returns { valid: true } or { valid: false, error: "..." }
 */
export function validateParameterValue(value: string, dataType?: string, language: UiLanguage = "en"): ValidationResult {
  // Empty value is always valid (clears the parameter)
  if (value.trim() === "") return OK;

  // No type info — cannot validate, accept anything
  if (!dataType) return OK;

  const type = dataType.toUpperCase();

  // Boolean
  if (type === "BOOL") return validateBool(value, language);

  // Signed integers
  if (type === "SINT" || type === "INT" || type === "DINT" || type === "LINT") {
    return validateSignedInt(value, type, language);
  }

  // Unsigned integers
  if (type === "USINT" || type === "UINT" || type === "UDINT" || type === "ULINT") {
    return validateUnsignedInt(value, type, language);
  }

  // Real
  if (type === "REAL" || type === "LREAL") return validateReal(value, type, language);

  // Bit types
  if (type === "BYTE" || type === "WORD" || type === "DWORD" || type === "LWORD") {
    return validateBitType(value, type, language);
  }

  // Strings
  if (type === "STRING") return validateString(value, language);
  if (type === "WSTRING") return validateWString(value, language);
  if (type === "CHAR") return validateChar(value, language);
  if (type === "WCHAR") return validateWChar(value, language);

  // Time
  if (type === "TIME" || type === "LTIME") return validateTime(value, type, language);

  // Date
  if (type === "DATE" || type === "LDATE") return validateDate(value, type, language);

  // Time of day
  if (type === "TIME_OF_DAY" || type === "TOD" || type === "LTOD" || type === "LTIME_OF_DAY") {
    return validateTimeOfDay(value, type, language);
  }

  // Date and time
  if (type === "DATE_AND_TIME" || type === "DT" || type === "LDT" || type === "LDATE_AND_TIME") {
    return validateDateAndTime(value, type, language);
  }

  // Generic types (ANY, ANY_INT, etc.) — accept any non-empty value
  if (type.startsWith("ANY")) return OK;

  // Unknown type — accept without validation
  return OK;
}
