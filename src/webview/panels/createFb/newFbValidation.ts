import { validateFBName } from "../../../shared/fbNameValidator";
import { getLanguage } from "../../i18nService";
import type { NewFbDialogDraft } from "./newFbModel";

export interface NewFbValidationResult {
  valid: boolean;
  nameError?: string;
}

export function validateNewFbDraft(draft: NewFbDialogDraft): NewFbValidationResult {
  const nameCheck = validateFBName(draft.name, getLanguage());
  if (!nameCheck.valid) {
    return {
      valid: false,
      nameError: nameCheck.error,
    };
  }

  return { valid: true };
}
