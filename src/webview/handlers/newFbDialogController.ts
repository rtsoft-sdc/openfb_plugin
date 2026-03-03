import { COLORS } from "../../colorScheme";
import type { InterfaceList, SubAppInterfaceList, Algorithm, ECC, NewFBCategory, VarDeclaration } from "../../shared/fbtypes";
import { FBKind } from "../../domain/FBKind";
import type { WebviewLogger } from "../logging";
import {
  buildNewFbDefinition,
  createInitialNewFbDraft,
  resetInterfaceForCategory,
  resetTypeDataForCategory,
  type NewFbDialogDraft,
  type WizardStep,
} from "../panels/createFb/newFbModel";
import { renderNewFbDialog } from "../panels/createFb/newFbDialog";
import { validateNewFbDraft } from "../panels/createFb/newFbValidation";

interface HostApi {
  postMessage(message: unknown): void;
}

interface NewFbDialogControllerOptions {
  logger: WebviewLogger;
  vscode?: HostApi;
}

interface CreateFbTypeResultPayload {
  success?: boolean;
  filePath?: string;
  error?: string;
}

export interface NewFbDialogController {
  openNewFbDialog: () => void;
  closeNewFbDialog: () => void;
  updateNewFbDialog: () => void;
  handleCreateFbTypeResult: (payload?: CreateFbTypeResultPayload) => void;
}

export function createNewFbDialogController(options: NewFbDialogControllerOptions): NewFbDialogController {
  const { logger, vscode } = options;

  const modalOverlay = document.getElementById("newfb-modal");
  const modalHeader = document.getElementById("newfb-modal-header");
  const modalBody = document.getElementById("newfb-modal-body");

  let draft: NewFbDialogDraft = createInitialNewFbDraft();
  let nameError: string | undefined;
  let isSubmitting = false;
  let statusText = "";
  let statusColor: string = COLORS.TEXT_MUTED;

  function handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === "Escape" && modalOverlay?.classList.contains("visible") && !isSubmitting) {
      closeNewFbDialog();
    }
  }

  function getMaxStepForCategory(category: NewFBCategory): WizardStep {
    return category === FBKind.BASIC || category === FBKind.SIMPLE ? 3 : 2;
  }

  function updateNewFbDialog(): void {
    if (!modalBody) {
      return;
    }

    renderNewFbDialog(modalHeader, modalBody, {
      draft,
      nameError,
      isSubmitting,
      statusText,
      statusColor,
    }, {
      onDraftChange: (nextDraft) => {
        // Detect category change → reset interface to template defaults
        const categoryChanged = nextDraft.category !== draft.category;
        draft = nextDraft;
        if (categoryChanged) {
          draft = resetInterfaceForCategory(draft);
          draft = resetTypeDataForCategory(draft);
          draft.currentStep = 1;
        }
        nameError = undefined;
        statusText = "";
        statusColor = COLORS.TEXT_MUTED;
      },
      onStepChange: (step: WizardStep) => {
        const maxStep = getMaxStepForCategory(draft.category);
        if (step > maxStep) step = maxStep;
        if (step === 2) {
          // Validate before moving to step 2
          const validation = validateNewFbDraft(draft);
          if (!validation.valid) {
            nameError = validation.nameError;
            statusText = validation.nameError || "Проверьте введённые данные";
            statusColor = COLORS.ERROR_TEXT;
            updateNewFbDialog();
            return;
          }
        }
        draft.currentStep = step;
        nameError = undefined;
        statusText = "";
        statusColor = COLORS.TEXT_MUTED;
        updateNewFbDialog();
      },
      onInterfaceChange: (iface: InterfaceList, subAppIface?: SubAppInterfaceList) => {
        draft.interfaceList = iface;
        draft.subAppInterfaceList = subAppIface;
      },
      onBasicAlgorithmsChange: (algorithms: Algorithm[]) => {
        draft.typeData.basic.algorithms = algorithms;
      },
      onBasicEccChange: (ecc: ECC) => {
        draft.typeData.basic.ecc = ecc;
      },
      onBasicInternalVarsChange: (internalVars: VarDeclaration[]) => {
        draft.typeData.basic.internalVars = internalVars;
      },
      onSimpleInternalVarsChange: (internalVars: VarDeclaration[]) => {
        draft.typeData.simple.internalVars = internalVars;
      },
      onSimpleAlgorithmChange: (algorithm) => {
        draft.typeData.simple.algorithm = algorithm;
      },
      onCancel: closeNewFbDialog,
      onSubmit: submit,
      rerender: updateNewFbDialog,
    });
  }

  function openNewFbDialog(): void {
    draft = createInitialNewFbDraft();
    nameError = undefined;
    isSubmitting = false;
    statusText = "";
    statusColor = COLORS.TEXT_MUTED;

    if (modalOverlay) {
      modalOverlay.classList.add("visible");
      document.addEventListener("keydown", handleEscapeKey);
    }

    updateNewFbDialog();
  }

  function closeNewFbDialog(): void {
    if (modalOverlay) {
      modalOverlay.classList.remove("visible");
      document.removeEventListener("keydown", handleEscapeKey);
    }
  }

  function submit(): void {
    if (!vscode || isSubmitting) {
      if (!vscode) {
        statusText = "Host API недоступен";
        statusColor = COLORS.ERROR_TEXT;
        updateNewFbDialog();
      }
      return;
    }

    const validation = validateNewFbDraft(draft);
    if (!validation.valid) {
      nameError = validation.nameError;
      statusText = validation.nameError || "Проверьте введённые данные";
      statusColor = COLORS.ERROR_TEXT;
      updateNewFbDialog();
      return;
    }

    isSubmitting = true;
    statusText = "Создание типа...";
    statusColor = COLORS.STATUS_SAVING;
    updateNewFbDialog();

    const payload = buildNewFbDefinition(draft);
    logger.info("Sending create-fb-type request", { name: draft.name, category: draft.category });
    vscode.postMessage({ type: "create-fb-type", payload });
  }

  function handleCreateFbTypeResult(payload?: CreateFbTypeResultPayload): void {
    if (!payload) {
      return;
    }

    isSubmitting = false;

    if (payload.success) {
      statusText = payload.filePath ? `Тип создан: ${payload.filePath}` : "Тип FB создан";
      statusColor = COLORS.SUCCESS_TEXT;
      updateNewFbDialog();
      closeNewFbDialog();
      return;
    }

    statusText = payload.error || "Не удалось создать тип FB";
    statusColor = COLORS.ERROR_TEXT;
    updateNewFbDialog();
  }

  return {
    openNewFbDialog,
    closeNewFbDialog,
    updateNewFbDialog,
    handleCreateFbTypeResult,
  };
}
