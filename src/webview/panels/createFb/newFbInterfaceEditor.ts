/**
 * Interface editor component for the New FB wizard (step 2).
 *
 * Renders four editable port tables (Event Inputs, Event Outputs,
 * Input Vars, Output Vars) and notifies the parent on every change.
 */


import { escapeXml } from "../../../shared/utils/xmlEscape";
import { IEC_DATA_TYPES } from "../../../shared/iecConstants";
import { FBKind } from "../../../shared/models/FBKind";
import type {
  EventDeclaration,
  VarDeclaration,
  InterfaceList,
  SubAppInterfaceList,
  SubAppEventDeclaration,
} from "../../../shared/fbtypes";
import type { NewFbDialogDraft } from "./newFbModel";

// ---------------------------------------------------------------------------
// Callbacks interface
// ---------------------------------------------------------------------------

export interface InterfaceEditorCallbacks {
  /** Called when any port property changes (name, type, etc.) */
  onInterfaceChange: (
    interfaceList: InterfaceList,
    subAppInterfaceList?: SubAppInterfaceList,
  ) => void;
  /** Request full rerender (e.g. after add/remove port) */
  rerender: () => void;
}

export interface InternalVarsCallbacks {
  onInternalVarsChange: (internalVars: VarDeclaration[]) => void;
  rerender: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const escapeAttr = escapeXml;

/** Generate `<option>` list for IEC data types, with the given value selected. */
function dataTypeOptions(selected: string): string {
  return IEC_DATA_TYPES.map(
    (t) => `<option value="${t}" ${t === selected ? "selected" : ""}>${t}</option>`,
  ).join("");
}

function chipListMarkup(selected: string[]): string {
  if (selected.length === 0) {
    return "<span class=\"ife-chip-empty\">(не выбраны)</span>";
  }
  return selected.map((name) => {
    const safe = escapeAttr(name);
    return `
      <span class="ife-chip" data-name="${safe}">
        ${safe}<button class="ife-chip-remove" data-name="${safe}" title="Удалить">×</button>
      </span>
    `;
  }).join("");
}

function addSelectMarkup(available: string[]): string {
  if (available.length === 0) {
    return "<span class=\"ife-chip-empty\"></span>";
  }
  const opts = available.map((name) => {
    const safe = escapeAttr(name);
    return `<option value="${safe}">${safe}</option>`;
  }).join("");
  return `
    <select class="ife-with-add" title="Добавить">
      <option value="" selected>+ добавить</option>
      ${opts}
    </select>
  `;
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function renderEventSection(
  container: HTMLElement,
  title: string,
  events: EventDeclaration[] | SubAppEventDeclaration[],
  onUpdate: (index: number, name: string) => void,
  onUpdateType: ((index: number, type: EventDeclaration["type"] | string) => void) | undefined,
  onRemove: (index: number) => void,
  onAdd: () => void,
  withOptions?: string[],
  getWithValues?: (index: number) => string[],
  onWithChange?: (index: number, nextWith: string[]) => void,
  rerender?: () => void,
): void {
  const section = document.createElement("div");
  section.className = "ife-section";
  section.innerHTML = `
    <div class="ife-section-header">
      <span class="ife-section-title">${title}</span>
      <button class="ife-add-btn" title="Добавить">+</button>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "ife-list";

  events.forEach((ev, i) => {
    const row = document.createElement("div");
    const isWithEnabled = Boolean(withOptions && onWithChange);
    row.className = isWithEnabled ? "ife-row ife-row-event" : "ife-row";
    const withValues = getWithValues ? getWithValues(i) : [];
    const available = withOptions
      ? withOptions.filter((name) => !withValues.includes(name))
      : [];
    const typeSelect = onUpdateType
      ? `
        <select class="ife-select ife-event-type" data-idx="${i}">
          <option value="Event" ${ev.type === "EInit" ? "" : "selected"}>Event</option>
          <option value="EInit" ${ev.type === "EInit" ? "selected" : ""}>EInit</option>
        </select>
      `
      : "";
    const withSelect = (withOptions && onWithChange)
      ? `
        <div class="ife-with">
          <span class="ife-with-label">with</span>
          <div class="ife-chip-list" data-idx="${i}">
            ${chipListMarkup(withValues)}
          </div>
          ${addSelectMarkup(available)}
        </div>
      `
      : "";

    row.innerHTML = `
      <div class="ife-event-row">
        <input class="ife-input" value="${escapeAttr(ev.name)}" placeholder="Имя" data-idx="${i}" />
        ${typeSelect}
        <button class="ife-remove-btn" data-idx="${i}" title="Удалить">✕</button>
      </div>
      ${withSelect}
    `;
    list.appendChild(row);
  });

  section.appendChild(list);
  container.appendChild(section);

  // --- attach listeners ---
  const addBtn = section.querySelector<HTMLButtonElement>(".ife-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => onAdd());
  }

  list.querySelectorAll<HTMLInputElement>(".ife-input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      onUpdate(idx, inp.value);
    });
  });

  list.querySelectorAll<HTMLButtonElement>(".ife-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      onRemove(idx);
    });
  });

  if (onUpdateType) {
    list.querySelectorAll<HTMLSelectElement>(".ife-event-type").forEach((sel) => {
      sel.addEventListener("change", () => {
        const idx = Number(sel.dataset.idx);
        onUpdateType(idx, sel.value);
      });
    });
  }

  if (withOptions && onWithChange) {
    list.querySelectorAll<HTMLSelectElement>(".ife-with-add").forEach((sel) => {
      sel.addEventListener("change", () => {
        const row = sel.closest<HTMLElement>(".ife-row");
        const idxAttr = row?.querySelector<HTMLElement>(".ife-chip-list")?.dataset.idx;
        const idx = idxAttr ? Number(idxAttr) : -1;
        const value = sel.value;
        if (idx >= 0 && value) {
          const nextWith = [...(getWithValues ? getWithValues(idx) : []), value];
          onWithChange(idx, nextWith);
          rerender?.();
        }
      });
    });

    list.querySelectorAll<HTMLButtonElement>(".ife-chip-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const row = btn.closest<HTMLElement>(".ife-row");
        const idxAttr = row?.querySelector<HTMLElement>(".ife-chip-list")?.dataset.idx;
        const idx = idxAttr ? Number(idxAttr) : -1;
        const name = btn.dataset.name || "";
        if (idx >= 0 && name) {
          const nextWith = (getWithValues ? getWithValues(idx) : []).filter((n) => n !== name);
          onWithChange(idx, nextWith);
          rerender?.();
        }
      });
    });
  }
}

function renderVarSection(
  container: HTMLElement,
  title: string,
  vars: VarDeclaration[],
  onUpdateName: (index: number, name: string) => void,
  onUpdateType: (index: number, type: string) => void,
  onRemove: (index: number) => void,
  onAdd: () => void,
): void {
  const section = document.createElement("div");
  section.className = "ife-section";
  section.innerHTML = `
    <div class="ife-section-header">
      <span class="ife-section-title">${title}</span>
      <button class="ife-add-btn" title="Добавить">+</button>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "ife-list";

  vars.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "ife-row";
    row.innerHTML = `
      <input class="ife-input ife-name" value="${escapeAttr(v.name)}" placeholder="Имя" data-idx="${i}" />
      <select class="ife-select" data-idx="${i}">
        ${dataTypeOptions(v.type)}
      </select>
      <button class="ife-remove-btn" data-idx="${i}" title="Удалить">✕</button>
    `;
    list.appendChild(row);
  });

  section.appendChild(list);
  container.appendChild(section);

  // --- attach listeners ---
  const addBtn = section.querySelector<HTMLButtonElement>(".ife-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => onAdd());
  }

  list.querySelectorAll<HTMLInputElement>(".ife-name").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      onUpdateName(idx, inp.value);
    });
  });

  list.querySelectorAll<HTMLSelectElement>(".ife-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const idx = Number(sel.dataset.idx);
      onUpdateType(idx, sel.value);
    });
  });

  list.querySelectorAll<HTMLButtonElement>(".ife-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      onRemove(idx);
    });
  });
}

export function renderInternalVarsEditor(
  container: HTMLElement,
  internalVars: VarDeclaration[],
  callbacks: InternalVarsCallbacks,
): void {
  container.innerHTML = "";

  const section = document.createElement("div");
  section.className = "ife-section";
  section.innerHTML = `
    <div class="ife-section-header">
      <span class="ife-section-title">Internal Vars</span>
      <button class="ife-add-btn" title="Добавить">+</button>
    </div>
  `;

  const list = document.createElement("div");
  list.className = "ife-list";

  internalVars.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "ife-row ife-row-internal";
    row.innerHTML = `
      <input class="ife-input ife-name" value="${escapeAttr(v.name)}" placeholder="Имя" data-idx="${i}" />
      <select class="ife-select" data-idx="${i}">
        ${dataTypeOptions(v.type)}
      </select>
      <input class="ife-input ife-initial" value="${escapeAttr(v.initialValue ?? "")}" placeholder="Initial value" data-idx="${i}" />
      <input class="ife-input ife-array" value="${escapeAttr(v.arraySize ?? "")}" placeholder="Array size" data-idx="${i}" />
      <input class="ife-input ife-comment" value="${escapeAttr(v.comment ?? "")}" placeholder="Comment" data-idx="${i}" />
      <button class="ife-remove-btn" data-idx="${i}" title="Удалить">✕</button>
    `;
    list.appendChild(row);
  });

  section.appendChild(list);
  container.appendChild(section);

  const addBtn = section.querySelector<HTMLButtonElement>(".ife-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      internalVars.push({ name: `IV${internalVars.length + 1}`, type: "BOOL" });
      callbacks.onInternalVarsChange(internalVars);
      callbacks.rerender();
    });
  }

  list.querySelectorAll<HTMLInputElement>(".ife-name").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      internalVars[idx].name = inp.value;
      callbacks.onInternalVarsChange(internalVars);
    });
  });

  list.querySelectorAll<HTMLSelectElement>(".ife-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const idx = Number(sel.dataset.idx);
      internalVars[idx].type = sel.value;
      callbacks.onInternalVarsChange(internalVars);
    });
  });

  list.querySelectorAll<HTMLInputElement>(".ife-initial").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      internalVars[idx].initialValue = inp.value || undefined;
      callbacks.onInternalVarsChange(internalVars);
    });
  });

  list.querySelectorAll<HTMLInputElement>(".ife-array").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      internalVars[idx].arraySize = inp.value || undefined;
      callbacks.onInternalVarsChange(internalVars);
    });
  });

  list.querySelectorAll<HTMLInputElement>(".ife-comment").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      internalVars[idx].comment = inp.value || undefined;
      callbacks.onInternalVarsChange(internalVars);
    });
  });

  list.querySelectorAll<HTMLButtonElement>(".ife-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      internalVars.splice(idx, 1);
      callbacks.onInternalVarsChange(internalVars);
      callbacks.rerender();
    });
  });
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

export type InterfaceEditorMode = "input" | "output" | "both";

export function renderInterfaceEditor(
  container: HTMLElement,
  draft: NewFbDialogDraft,
  callbacks: InterfaceEditorCallbacks,
  mode: InterfaceEditorMode = "both",
): void {
  container.innerHTML = "";

  const makePanel = (col: HTMLElement): HTMLElement => {
    const panel = document.createElement("div");
    panel.className = "ife-panel";
    col.appendChild(panel);
    return panel;
  };

  const ensureColumn = (root: HTMLElement): HTMLElement => {
    const col = document.createElement("div");
    col.className = "ife-column";
    root.appendChild(col);
    return col;
  };

  let inputCol: HTMLElement | null = null;
  let outputCol: HTMLElement | null = null;

  if (mode === "both") {
    container.innerHTML = `
      <div class="ife-split">
        <div class="ife-column" data-side="input"></div>
        <div class="ife-column" data-side="output"></div>
      </div>
    `;
    inputCol = container.querySelector<HTMLElement>(".ife-column[data-side='input']");
    outputCol = container.querySelector<HTMLElement>(".ife-column[data-side='output']");
    if (!inputCol || !outputCol) {
      return;
    }
  } else {
    inputCol = mode === "input" ? ensureColumn(container) : null;
    outputCol = mode === "output" ? ensureColumn(container) : null;
  }

  const isSubApp = draft.category === FBKind.SUBAPP;

  // ===== Helper: notify parent of interface change (no rerender) =====
  function notifyChange(): void {
    callbacks.onInterfaceChange(
      draft.interfaceList,
      draft.subAppInterfaceList,
    );
  }

  // ===== Helper: notify + rerender (for add/remove) =====
  function notifyAndRerender(): void {
    notifyChange();
    callbacks.rerender();
  }

  // --------------- Events ---------------

  if (isSubApp && draft.subAppInterfaceList) {
    const saIface = draft.subAppInterfaceList;

    // SubApp Event Inputs
    const saeInputs = saIface.subAppEventInputs ?? [];
    if (inputCol) {
      renderEventSection(
        makePanel(inputCol),
        "Event Inputs",
        saeInputs,
        (idx, name) => { saeInputs[idx].name = name; notifyChange(); },
        (idx, type) => { saeInputs[idx].type = type; notifyChange(); },
        (idx) => { saeInputs.splice(idx, 1); saIface.subAppEventInputs = saeInputs; notifyAndRerender(); },
        () => { saeInputs.push({ name: `EI${saeInputs.length}` }); saIface.subAppEventInputs = saeInputs; notifyAndRerender(); },
      );
    }

    // SubApp Event Outputs
    const saeOutputs = saIface.subAppEventOutputs ?? [];
    if (outputCol) {
      renderEventSection(
        makePanel(outputCol),
        "Event Outputs",
        saeOutputs,
        (idx, name) => { saeOutputs[idx].name = name; notifyChange(); },
        (idx, type) => { saeOutputs[idx].type = type; notifyChange(); },
        (idx) => { saeOutputs.splice(idx, 1); saIface.subAppEventOutputs = saeOutputs; notifyAndRerender(); },
        () => { saeOutputs.push({ name: `EO${saeOutputs.length}` }); saIface.subAppEventOutputs = saeOutputs; notifyAndRerender(); },
      );
    }

    // SubApp Input Vars
    const saInputVars = saIface.inputVars ?? [];
    if (inputCol) {
      renderVarSection(
        makePanel(inputCol),
        "Input Variables",
        saInputVars,
        (idx, name) => { saInputVars[idx].name = name; notifyChange(); },
        (idx, type) => { saInputVars[idx].type = type; notifyChange(); },
        (idx) => { saInputVars.splice(idx, 1); saIface.inputVars = saInputVars; notifyAndRerender(); },
        () => { saInputVars.push({ name: `DI${saInputVars.length}`, type: "BOOL" }); saIface.inputVars = saInputVars; notifyAndRerender(); },
      );
    }

    // SubApp Output Vars
    const saOutputVars = saIface.outputVars ?? [];
    if (outputCol) {
      renderVarSection(
        makePanel(outputCol),
        "Output Variables",
        saOutputVars,
        (idx, name) => { saOutputVars[idx].name = name; notifyChange(); },
        (idx, type) => { saOutputVars[idx].type = type; notifyChange(); },
        (idx) => { saOutputVars.splice(idx, 1); saIface.outputVars = saOutputVars; notifyAndRerender(); },
        () => { saOutputVars.push({ name: `DO${saOutputVars.length}`, type: "BOOL" }); saIface.outputVars = saOutputVars; notifyAndRerender(); },
      );
    }
  } else {
    const iface = draft.interfaceList;

    // Event Inputs
    const eInputs = iface.eventInputs ?? [];
    if (inputCol) {
      renderEventSection(
        makePanel(inputCol),
        "Event Inputs",
        eInputs,
        (idx, name) => { eInputs[idx].name = name; notifyChange(); },
        (idx, type) => { eInputs[idx].type = type as EventDeclaration["type"]; notifyChange(); },
        (idx) => { eInputs.splice(idx, 1); iface.eventInputs = eInputs; notifyAndRerender(); },
        () => { eInputs.push({ name: `EI${eInputs.length}`, type: "Event" }); iface.eventInputs = eInputs; notifyAndRerender(); },
        (iface.inputVars ?? []).map((v) => v.name),
        (idx) => eInputs[idx].with ?? [],
        (idx, nextWith) => { eInputs[idx].with = nextWith; notifyChange(); },
        callbacks.rerender,
      );
    }

    // Event Outputs
    const eOutputs = iface.eventOutputs ?? [];
    if (outputCol) {
      renderEventSection(
        makePanel(outputCol),
        "Event Outputs",
        eOutputs,
        (idx, name) => { eOutputs[idx].name = name; notifyChange(); },
        (idx, type) => { eOutputs[idx].type = type as EventDeclaration["type"]; notifyChange(); },
        (idx) => { eOutputs.splice(idx, 1); iface.eventOutputs = eOutputs; notifyAndRerender(); },
        () => { eOutputs.push({ name: `EO${eOutputs.length}`, type: "Event" }); iface.eventOutputs = eOutputs; notifyAndRerender(); },
        (iface.outputVars ?? []).map((v) => v.name),
        (idx) => eOutputs[idx].with ?? [],
        (idx, nextWith) => { eOutputs[idx].with = nextWith; notifyChange(); },
        callbacks.rerender,
      );
    }

    // Input Vars
    const inputVars = iface.inputVars ?? [];
    if (inputCol) {
      renderVarSection(
        makePanel(inputCol),
        "Input Variables",
        inputVars,
        (idx, name) => { inputVars[idx].name = name; notifyChange(); },
        (idx, type) => { inputVars[idx].type = type; notifyChange(); },
        (idx) => { inputVars.splice(idx, 1); iface.inputVars = inputVars; notifyAndRerender(); },
        () => { inputVars.push({ name: `DI${inputVars.length}`, type: "BOOL" }); iface.inputVars = inputVars; notifyAndRerender(); },
      );
    }

    // Output Vars
    const outputVars = iface.outputVars ?? [];
    if (outputCol) {
      renderVarSection(
        makePanel(outputCol),
        "Output Variables",
        outputVars,
        (idx, name) => { outputVars[idx].name = name; notifyChange(); },
        (idx, type) => { outputVars[idx].type = type; notifyChange(); },
        (idx) => { outputVars.splice(idx, 1); iface.outputVars = outputVars; notifyAndRerender(); },
        () => { outputVars.push({ name: `DO${outputVars.length}`, type: "BOOL" }); iface.outputVars = outputVars; notifyAndRerender(); },
      );
    }
  }
}
