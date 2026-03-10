import { stripNamespacePrefix } from "./utils/iecTypeUtils";

const IEC_DEFAULT_LITERAL_BY_TYPE: Record<string, string> = {
  BOOL: "FALSE",

  SINT: "0",
  INT: "0",
  DINT: "0",
  LINT: "0",

  USINT: "0",
  UINT: "0",
  UDINT: "0",
  ULINT: "0",

  BYTE: "0",
  WORD: "0",
  DWORD: "0",
  LWORD: "0",

  REAL: "0.0",
  LREAL: "0.0",

  TIME: "T#0s",
  LTIME: "LT#0ns",
  DATE: "D#1970-01-01",
  LDATE: "LD#1970-01-01",
  TOD: "TOD#00:00:00",
  LTOD: "LTOD#00:00:00",
  DT: "DT#1970-01-01-00:00:00",
  LDT: "LDT#1970-01-01-00:00:00",
  TIME_OF_DAY: "TOD#00:00:00",
  DATE_AND_TIME: "DT#1970-01-01-00:00:00",

  STRING: "''",
  WSTRING: "''",
  CHAR: "'\\0'",
  WCHAR: "'\\0'",
};

function normalizeIecTypeName(typeName: string): string {
  return stripNamespacePrefix(typeName.trim().toUpperCase());
}

export function getDefaultLiteralForIecType(typeName?: string): string | undefined {
  if (!typeName) {
    return undefined;
  }

  const normalized = normalizeIecTypeName(typeName);
  return IEC_DEFAULT_LITERAL_BY_TYPE[normalized];
}


