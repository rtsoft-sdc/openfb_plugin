/**
 * Validates FB type, port, and algorithm names according to IEC 61499 / 61131-3 rules
 * (mirrors 4diac IdentifierVerifier constraints).
 */

import { ST_RESERVED_KEYWORDS } from "./iecConstants";
import { t } from "./i18n";
import type { UiLanguage } from "./pluginSettings";

interface NameValidationResult {
  valid: boolean;
  error?: string;
}

// Identifier: starts with letter or underscore, then letters/digits/underscore
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Generic identifier validation used for FB type names, port names, algorithms, etc.
 */
function validateIdentifier(name: string, language: UiLanguage, label?: string): NameValidationResult {
  const displayLabel = label ?? t(language, "validation.fbName.label");

  if (!name || name.trim().length === 0) {
    return { valid: false, error: t(language, "validation.fbName.empty", { label: displayLabel }) };
  }

  const trimmed = name.trim();

  if (!IDENTIFIER_RE.test(trimmed)) {
    return {
      valid: false,
      error: t(language, "validation.fbName.invalidChars", { label: displayLabel }),
    };
  }

  if (trimmed.includes("__")) {
    return {
      valid: false,
      error: t(language, "validation.fbName.noDoubleUnderscore", { label: displayLabel }),
    };
  }

  if (trimmed.endsWith("_")) {
    return {
      valid: false,
      error: t(language, "validation.fbName.noTrailingUnderscore", { label: displayLabel }),
    };
  }

  if (ST_RESERVED_KEYWORDS.has(trimmed.toUpperCase())) {
    return {
      valid: false,
      error: t(language, "validation.fbName.reservedKeyword", { label: displayLabel }),
    };
  }

  return { valid: true };
}

/** Validate FB type name. */
export function validateFBName(name: string, language: UiLanguage): NameValidationResult {
  return validateIdentifier(name, language);
}
