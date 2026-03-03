/**
 * Validates FB type, port, and algorithm names according to IEC 61499 / 61131-3 rules
 * (mirrors 4diac IdentifierVerifier constraints).
 */

import { ST_RESERVED_KEYWORDS } from "./iecConstants";

export interface NameValidationResult {
  valid: boolean;
  error?: string;
}

// Identifier: starts with letter or underscore, then letters/digits/underscore
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Generic identifier validation used for FB type names, port names, algorithms, etc.
 */
export function validateIdentifier(name: string, label = "Имя"): NameValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: `${label} не может быть пустым` };
  }

  const trimmed = name.trim();

  if (!IDENTIFIER_RE.test(trimmed)) {
    return {
      valid: false,
      error: `${label} "${trimmed}" содержит недопустимые символы. Допускаются буквы, цифры, подчёркивание; первый символ — буква или _`,
    };
  }

  if (trimmed.includes("__")) {
    return {
      valid: false,
      error: `${label} "${trimmed}" не должно содержать двойное подчёркивание (__)`,
    };
  }

  if (trimmed.endsWith("_")) {
    return {
      valid: false,
      error: `${label} "${trimmed}" не должно заканчиваться подчёркиванием`,
    };
  }

  if (ST_RESERVED_KEYWORDS.has(trimmed.toUpperCase())) {
    return {
      valid: false,
      error: `${label} "${trimmed}" является зарезервированным ключевым словом`,
    };
  }

  return { valid: true };
}

/** Validate FB type name. */
export function validateFBName(name: string): NameValidationResult {
  return validateIdentifier(name, "Имя типа FB");
}

/** Validate event/variable/algorithm names (IEC identifiers). */
export function validatePortName(name: string): NameValidationResult {
  return validateIdentifier(name, "Имя порта");
}
