import { COLORS } from "../../../colorScheme";
import type { NewFBCategory, InterfaceList, SubAppInterfaceList, Algorithm, ECC, VarDeclaration } from "../../../shared/fbtypes";
import { FBKind } from "../../../domain/FBKind";
import type { NewFbDialogDraft, WizardStep } from "./newFbModel";
import { renderInterfaceEditor, renderInternalVarsEditor } from "./newFbInterfaceEditor";
import { renderFbPreview } from "./newFbPreviewRenderer";
import { renderBasicEcc } from "./newFbBasicEcc";
import { renderSimpleAlgorithm } from "./newFbSimpleAlgorithm";

export interface NewFbDialogState {
  draft: NewFbDialogDraft;
  nameError?: string;
  isSubmitting: boolean;
  statusText: string;
  statusColor: string;
}

export interface NewFbDialogCallbacks {
  onDraftChange: (nextDraft: NewFbDialogDraft) => void;
  onStepChange: (step: WizardStep) => void;
  onInterfaceChange: (iface: InterfaceList, subAppIface?: SubAppInterfaceList) => void;
  onBasicAlgorithmsChange: (algorithms: Algorithm[]) => void;
  onBasicEccChange: (ecc: ECC) => void;
  onBasicInternalVarsChange: (internalVars: VarDeclaration[]) => void;
  onSimpleInternalVarsChange: (internalVars: VarDeclaration[]) => void;
  onSimpleAlgorithmChange: (algorithm: Algorithm) => void;
  onCancel: () => void;
  onSubmit: () => void;
  rerender: () => void;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cloneDraft(draft: NewFbDialogDraft): NewFbDialogDraft {
  return {
    ...draft,
  };
}

function categoryOption(value: NewFBCategory, selected: NewFBCategory, label: string): string {
  return `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`;
}

function getMaxStepForCategory(category: NewFBCategory): WizardStep {
  return category === FBKind.BASIC || category === FBKind.SIMPLE ? 3 : 2;
}

export function renderNewFbDialog(
  modalHeader: HTMLElement | null,
  modalBody: HTMLElement,
  state: NewFbDialogState,
  callbacks: NewFbDialogCallbacks,
): void {
  try {
    const step = state.draft.currentStep;
    const maxStep = getMaxStepForCategory(state.draft.category);

    const modalContent = modalBody.closest<HTMLElement>(".modal-content");
    if (modalContent) {
      modalContent.classList.remove("wizard-step1", "wizard-step2", "wizard-step3");
      modalContent.classList.add(`wizard-step${step}`);
      modalContent.classList.toggle("wizard-simple", state.draft.category === FBKind.SIMPLE);
    }

    if (modalHeader) {
      const stepTitle = (state.draft.category === FBKind.BASIC || state.draft.category === FBKind.SIMPLE)
        ? `Создание нового типа FB — Шаг ${step}/${maxStep}`
        : "Создание нового типа FB";
      modalHeader.textContent = stepTitle;
    }

    if (step === 1) {
      renderStep1(modalBody, state, callbacks);
    } else if (step === 2) {
      renderStep2(modalBody, state, callbacks, maxStep);
    } else {
      renderStep3(modalBody, state, callbacks);
    }
  } catch (err) {
    console.error("renderNewFbDialog failed", err);
    modalBody.innerHTML = `
      <div class="sidepanel-section">
        <div class="sidepanel-section-title">Ошибка</div>
        <div class="sidepanel-label">Не удалось отрисовать диалог. Проверьте консоль.</div>
      </div>
    `;
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Basic info (name, category, comment)
// ---------------------------------------------------------------------------

function renderStep1(
  modalBody: HTMLElement,
  state: NewFbDialogState,
  callbacks: NewFbDialogCallbacks,
): void {
  modalBody.innerHTML = `
    <div class="sidepanel-section">
      <div class="sidepanel-section-title" style="color:${COLORS.TEXT_PRIMARY}; font-weight:700;">Основное</div>
      <div class="sidepanel-item" style="display:block; padding-top:0;">
        <div class="sidepanel-label" style="margin-bottom:4px; color:${COLORS.TEXT_MUTED};">Имя типа FB</div>
        <input id="newFbNameInput" value="${escapeHtml(state.draft.name)}" style="width:100%; padding:6px 8px; border:1px solid ${state.nameError ? COLORS.ERROR_TEXT : COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT};" />
        <div style="margin-top:4px; min-height:16px; font-size:11px; color:${COLORS.ERROR_TEXT};">${escapeHtml(state.nameError || "")}</div>
      </div>
      <div class="sidepanel-item" style="display:block;">
        <div class="sidepanel-label" style="margin-bottom:4px; color:${COLORS.TEXT_MUTED};">Категория</div>
        <select id="newFbCategorySelect" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT};">
          ${categoryOption(FBKind.BASIC, state.draft.category, "BASIC")}
          ${categoryOption(FBKind.SIMPLE, state.draft.category, "SIMPLE")}
          ${categoryOption(FBKind.COMPOSITE, state.draft.category, "COMPOSITE")}
          ${categoryOption(FBKind.SERVICE, state.draft.category, "SERVICE")}
          ${categoryOption(FBKind.SUBAPP, state.draft.category, "SUBAPP")}
        </select>
      </div>
      <div class="sidepanel-item" style="display:block;">
        <div class="sidepanel-label" style="margin-bottom:4px; color:${COLORS.TEXT_MUTED};">Комментарий (опционально)</div>
        <textarea id="newFbCommentInput" rows="3" style="width:100%; padding:6px 8px; border:1px solid ${COLORS.INPUT_BORDER}; border-radius:4px; font-size:12px; color:${COLORS.INPUT_TEXT}; resize:vertical;">${escapeHtml(state.draft.comment)}</textarea>
      </div>
    </div>

    <div class="sidepanel-section" style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
      <button id="newFbNextBtn" style="min-width:140px; padding:8px 16px; border:1px solid ${COLORS.SUCCESS_TEXT}; border-radius:4px; background:${COLORS.BUTTON_PRIMARY_BG}; color:${COLORS.BUTTON_TEXT_WHITE}; cursor:pointer; font-weight:500; font-size:13px;">Далее →</button>
      <button id="newFbCancelBtn" style="min-width:120px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:pointer; font-size:13px;">Отмена</button>
    </div>

    <div class="sidepanel-section">
      <div id="newFbStatus" class="sidepanel-label" style="margin-top:8px; color:${state.statusColor}; text-align:center;">${escapeHtml(state.statusText)}</div>
    </div>
  `;

  const nameInput = modalBody.querySelector<HTMLInputElement>("#newFbNameInput");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(state.draft);
      nextDraft.name = nameInput.value;
      callbacks.onDraftChange(nextDraft);
    });
  }

  const categorySelect = modalBody.querySelector<HTMLSelectElement>("#newFbCategorySelect");
  if (categorySelect) {
    categorySelect.addEventListener("change", () => {
      const nextDraft = cloneDraft(state.draft);
      nextDraft.category = (categorySelect.value as NewFBCategory) || FBKind.BASIC;
      callbacks.onDraftChange(nextDraft);
      callbacks.rerender();
    });
  }

  const commentInput = modalBody.querySelector<HTMLTextAreaElement>("#newFbCommentInput");
  if (commentInput) {
    commentInput.addEventListener("input", () => {
      const nextDraft = cloneDraft(state.draft);
      nextDraft.comment = commentInput.value;
      callbacks.onDraftChange(nextDraft);
    });
  }

  const nextBtn = modalBody.querySelector<HTMLButtonElement>("#newFbNextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      callbacks.onStepChange(2);
    });
  }

  const cancelBtn = modalBody.querySelector<HTMLButtonElement>("#newFbCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => callbacks.onCancel());
  }
}

// ---------------------------------------------------------------------------
// Step 2 — Interface editor + canvas preview (split layout)
// ---------------------------------------------------------------------------

function renderStep2(
  modalBody: HTMLElement,
  state: NewFbDialogState,
  callbacks: NewFbDialogCallbacks,
  maxStep: WizardStep,
): void {
  const nextLabel = maxStep > 2 ? "Далее →" : "Создать";
  const isBasicOrSimple = state.draft.category === FBKind.BASIC || state.draft.category === FBKind.SIMPLE;
  const storedTab = modalBody.dataset.step2Tab;
  const activeTab = isBasicOrSimple && storedTab === "internal"
    ? "internal"
    : storedTab === "output"
      ? "output"
      : "input";

  modalBody.innerHTML = `
    <div class="wizard-step2-layout">
      <div class="wizard-step2-panel wizard-step2-canvas">
        <canvas id="wizardPreviewCanvas"></canvas>
      </div>
      <div class="wizard-step2-panel wizard-step2-form">
        <div class="wizard-step2-tabs">
          <button class="wizard-step2-tab ${activeTab === "input" ? "is-active" : ""}" data-tab="input">Input</button>
          <button class="wizard-step2-tab ${activeTab === "output" ? "is-active" : ""}" data-tab="output">Output</button>
          ${isBasicOrSimple ? `<button class="wizard-step2-tab ${activeTab === "internal" ? "is-active" : ""}" data-tab="internal">Internal Vars</button>` : ""}
        </div>
        <div class="wizard-step2-editor">
          <div id="wizardInterfaceEditorInput" class="wizard-step2-editor-pane ${activeTab === "input" ? "is-active" : ""}"></div>
          <div id="wizardInterfaceEditorOutput" class="wizard-step2-editor-pane ${activeTab === "output" ? "is-active" : ""}"></div>
          ${isBasicOrSimple ? `<div id="wizardInternalVarsEditor" class="wizard-step2-editor-pane ${activeTab === "internal" ? "is-active" : ""}"></div>` : ""}
        </div>
        <div class="wizard-step2-actions">
          <button id="newFbBackBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:120px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-size:13px;">← Назад</button>
          <button id="newFbNextBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:140px; padding:8px 16px; border:1px solid ${COLORS.SUCCESS_TEXT}; border-radius:4px; background:${state.isSubmitting ? COLORS.BUTTON_DISABLED_BG : COLORS.BUTTON_PRIMARY_BG}; color:${COLORS.BUTTON_TEXT_WHITE}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-weight:500; font-size:13px;">${nextLabel}</button>
          <button id="newFbCancelBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:100px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-size:13px;">Отмена</button>
        </div>
        <div id="newFbStatus" class="wizard-step2-status" style="color:${state.statusColor};">${escapeHtml(state.statusText)}</div>
      </div>
    </div>
  `;

  const onInterfaceChange = (iface: InterfaceList, subAppIface?: SubAppInterfaceList) => {
    callbacks.onInterfaceChange(iface, subAppIface);
    const previewCanvas = modalBody.querySelector<HTMLCanvasElement>("#wizardPreviewCanvas");
    if (previewCanvas) {
      renderFbPreview(previewCanvas, state.draft);
    }
  };

  const inputEditor = modalBody.querySelector<HTMLElement>("#wizardInterfaceEditorInput");
  if (inputEditor) {
    renderInterfaceEditor(inputEditor, state.draft, {
      onInterfaceChange,
      rerender: callbacks.rerender,
    }, "input");
  }

  const outputEditor = modalBody.querySelector<HTMLElement>("#wizardInterfaceEditorOutput");
  if (outputEditor) {
    renderInterfaceEditor(outputEditor, state.draft, {
      onInterfaceChange,
      rerender: callbacks.rerender,
    }, "output");
  }

  const internalEditor = modalBody.querySelector<HTMLElement>("#wizardInternalVarsEditor");
  if (internalEditor) {
    const basicInternal = state.draft.typeData.basic?.internalVars ?? [];
    const simpleInternal = state.draft.typeData.simple?.internalVars ?? [];
    const internalVars = state.draft.category === FBKind.SIMPLE ? simpleInternal : basicInternal;
    const onInternalVarsChange = state.draft.category === FBKind.SIMPLE
      ? callbacks.onSimpleInternalVarsChange
      : callbacks.onBasicInternalVarsChange;
    renderInternalVarsEditor(internalEditor, internalVars, {
      onInternalVarsChange,
      rerender: callbacks.rerender,
    });
  }

  const tabs = modalBody.querySelectorAll<HTMLButtonElement>(".wizard-step2-tab");
  const panes = modalBody.querySelectorAll<HTMLElement>(".wizard-step2-editor-pane");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      modalBody.dataset.step2Tab = name === "internal" ? "internal" : (name === "output" ? "output" : "input");
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      panes.forEach((p) => {
        const isInternal = name === "internal";
        const targetId = isInternal
          ? "wizardInternalVarsEditor"
          : `wizardInterfaceEditor${name === "input" ? "Input" : "Output"}`;
        p.classList.toggle("is-active", p.id === targetId);
      });
    });
  });

  const previewCanvas = modalBody.querySelector<HTMLCanvasElement>("#wizardPreviewCanvas");
  if (previewCanvas) {
    requestAnimationFrame(() => {
      renderFbPreview(previewCanvas, state.draft);
    });
  }

  const backBtn = modalBody.querySelector<HTMLButtonElement>("#newFbBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onStepChange(1);
    });
  }

  const nextBtn = modalBody.querySelector<HTMLButtonElement>("#newFbNextBtn");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (state.isSubmitting) return;
      if (maxStep > 2) {
        callbacks.onStepChange(3);
      } else {
        callbacks.onSubmit();
      }
    });
  }

  const cancelBtn = modalBody.querySelector<HTMLButtonElement>("#newFbCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onCancel();
    });
  }
}

// ---------------------------------------------------------------------------
// Step 3 — BASIC ECC + Algorithms
// ---------------------------------------------------------------------------

function renderStep3(
  modalBody: HTMLElement,
  state: NewFbDialogState,
  callbacks: NewFbDialogCallbacks,
): void {
  if (state.draft.category === FBKind.SIMPLE) {
    renderSimpleStep3(modalBody, state, callbacks);
    return;
  }

  modalBody.innerHTML = `
    <div class="sidepanel-section">
      <div id="basicEccEditor"></div>
    </div>

    <div class="sidepanel-section" style="display:flex; justify-content:center; gap:12px; margin-top:12px;">
      <button id="basicEccBackBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:120px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-size:13px;">← Назад</button>
      <button id="basicEccCreateBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:140px; padding:8px 16px; border:1px solid ${COLORS.SUCCESS_TEXT}; border-radius:4px; background:${state.isSubmitting ? COLORS.BUTTON_DISABLED_BG : COLORS.BUTTON_PRIMARY_BG}; color:${COLORS.BUTTON_TEXT_WHITE}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-weight:500; font-size:13px;">${state.isSubmitting ? "Создание..." : "Создать"}</button>
      <button id="basicEccCancelBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:100px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-size:13px;">Отмена</button>
    </div>
  `;

  const eccContainer = modalBody.querySelector<HTMLElement>("#basicEccEditor");
  if (eccContainer) {
    renderBasicEcc(eccContainer, state.draft, {
      onChange: (ecc, algorithms) => {
        callbacks.onBasicEccChange(ecc);
        callbacks.onBasicAlgorithmsChange(algorithms);
      },
      rerender: callbacks.rerender,
    });
  }

  const backBtn = modalBody.querySelector<HTMLButtonElement>("#basicEccBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onStepChange(2);
    });
  }

  const createBtn = modalBody.querySelector<HTMLButtonElement>("#basicEccCreateBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onSubmit();
    });
  }

  const cancelBtn = modalBody.querySelector<HTMLButtonElement>("#basicEccCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onCancel();
    });
  }
}

function renderSimpleStep3(
  modalBody: HTMLElement,
  state: NewFbDialogState,
  callbacks: NewFbDialogCallbacks,
): void {
  modalBody.innerHTML = `
    <div class="sidepanel-section">
      <div id="simpleAlgorithmEditor"></div>
    </div>

    <div class="sidepanel-section" style="display:flex; justify-content:center; gap:12px; margin-top:12px;">
      <button id="simpleAlgBackBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:120px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-size:13px;">← Назад</button>
      <button id="simpleAlgCreateBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:140px; padding:8px 16px; border:1px solid ${COLORS.SUCCESS_TEXT}; border-radius:4px; background:${state.isSubmitting ? COLORS.BUTTON_DISABLED_BG : COLORS.BUTTON_PRIMARY_BG}; color:${COLORS.BUTTON_TEXT_WHITE}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-weight:500; font-size:13px;">${state.isSubmitting ? "Создание..." : "Создать"}</button>
      <button id="simpleAlgCancelBtn" ${state.isSubmitting ? "disabled" : ""} style="min-width:100px; padding:8px 16px; border:1px solid ${COLORS.UI_BORDER}; border-radius:4px; background:${COLORS.BUTTON_SECONDARY_BG}; cursor:${state.isSubmitting ? "not-allowed" : "pointer"}; font-size:13px;">Отмена</button>
    </div>
  `;

  const algContainer = modalBody.querySelector<HTMLElement>("#simpleAlgorithmEditor");
  if (algContainer) {
    renderSimpleAlgorithm(algContainer, state.draft, {
      onChange: (algorithm) => callbacks.onSimpleAlgorithmChange(algorithm),
    });
  }

  const backBtn = modalBody.querySelector<HTMLButtonElement>("#simpleAlgBackBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onStepChange(2);
    });
  }

  const createBtn = modalBody.querySelector<HTMLButtonElement>("#simpleAlgCreateBtn");
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onSubmit();
    });
  }

  const cancelBtn = modalBody.querySelector<HTMLButtonElement>("#simpleAlgCancelBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (!state.isSubmitting) callbacks.onCancel();
    });
  }
}
