/**
 * Algorithm language model and XML mapping.
 * Used by New FB wizard and FBT serialization.
 */

export type AlgorithmLanguage = "ST" | "Python";

export interface AlgorithmLanguageSpec {
  value: AlgorithmLanguage;
  label: string;
  bodyTag: "ST" | "PY";
}

export const DEFAULT_ALGORITHM_LANGUAGE: AlgorithmLanguage = "ST";

export const ALGORITHM_LANGUAGE_SPECS: readonly AlgorithmLanguageSpec[] = [
  { value: "ST", label: "ST", bodyTag: "ST" },
  { value: "Python", label: "Python", bodyTag: "PY" },
] as const;

const LANGUAGE_SPEC_MAP: Record<AlgorithmLanguage, AlgorithmLanguageSpec> = {
  ST: ALGORITHM_LANGUAGE_SPECS[0],
  Python: ALGORITHM_LANGUAGE_SPECS[1],
};

export function isAlgorithmLanguage(value: unknown): value is AlgorithmLanguage {
  return value === "ST" || value === "Python";
}

export function normalizeAlgorithmLanguage(value: unknown): AlgorithmLanguage {
  return isAlgorithmLanguage(value) ? value : DEFAULT_ALGORITHM_LANGUAGE;
}

export function getAlgorithmLanguageSpec(value: unknown): AlgorithmLanguageSpec {
  return LANGUAGE_SPEC_MAP[normalizeAlgorithmLanguage(value)];
}

export function getAlgorithmBodyTag(value: unknown): "ST" | "PY" {
  return getAlgorithmLanguageSpec(value).bodyTag;
}
