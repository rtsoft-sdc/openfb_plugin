/**
 * BASIC FB ECC + Algorithms editor (wizard step 3).
 *
 * Layout: left list of ECC states, right placeholder for transitions
 * with algorithm name/comment, language selector, and code text.
 */

import type { Algorithm, ECC, ECState } from "../../../shared/fbtypes";
import { escapeXml } from "../../../shared/utils/xmlEscape";
import type { NewFbDialogDraft } from "./newFbModel";
import { tr as tr2 } from "../../i18nService";
import {
  ALGORITHM_LANGUAGE_SPECS,
  DEFAULT_ALGORITHM_LANGUAGE,
  normalizeAlgorithmLanguage,
} from "../../../shared/fbtypes/algorithmLanguage";

export interface BasicEccCallbacks {
  onChange: (ecc: ECC, algorithms: Algorithm[]) => void;
  rerender: () => void;
}

const escapeAttr = escapeXml;

function getAlgorithmByName(list: Algorithm[], name: string): Algorithm | undefined {
  return list.find((a) => a.name === name);
}

function ensureAlgorithm(list: Algorithm[], name: string): Algorithm {
  let alg = getAlgorithmByName(list, name);
  if (!alg) {
    alg = { name, language: DEFAULT_ALGORITHM_LANGUAGE, body: "" };
    list.push(alg);
  }
  return alg;
}

function renderAlgorithmLanguageOptions(selected: unknown): string {
  const normalized = normalizeAlgorithmLanguage(selected);
  return ALGORITHM_LANGUAGE_SPECS
    .map((spec) => `<option value="${spec.value}" ${normalized === spec.value ? "selected" : ""}>${spec.label}</option>`)
    .join("");
}

function transitionStateOptions(states: ECState[], selected: string): string {
  return states.map((st) => {
    const safe = escapeAttr(st.name);
    const isSelected = st.name === selected ? "selected" : "";
    return `<option value="${safe}" ${isSelected}>${safe}</option>`;
  }).join("");
}

export function renderBasicEcc(
  container: HTMLElement,
  draft: NewFbDialogDraft,
  callbacks: BasicEccCallbacks,
): void {
  const ecc = draft.typeData.basic.ecc;
  const algorithms = draft.typeData.basic.algorithms;
  const states = ecc.states;

  container.innerHTML = `
    <div class="basic-ecc-layout">
      <div class="basic-ecc-panel basic-ecc-panel-states">
        <div class="ife-section">
          <div class="ife-section-header">
            <span class="ife-section-title">ECC States</span>
            <button class="ife-add-btn" id="eccStateAddBtn" title="${tr2("common.add")}">+</button>
          </div>
          <div class="ife-list" id="eccStateList"></div>
        </div>
      </div>
      <div class="basic-ecc-panel basic-ecc-panel-transitions">
        <div class="ife-section">
          <div class="ife-section-header">
            <span class="ife-section-title">Transitions</span>
            <button class="ife-add-btn" id="eccTransitionAddBtn" title="${tr2("common.add")}">+</button>
          </div>
          <div class="ife-list" id="eccTransitionList"></div>
        </div>
      </div>
    </div>
  `;

  const stateList = container.querySelector<HTMLElement>("#eccStateList");
  if (!stateList) return;
  const transitionList = container.querySelector<HTMLElement>("#eccTransitionList");

  states.forEach((st, idx) => {
    const panel = document.createElement("div");
    panel.className = "ife-state-panel";
    const row = document.createElement("div");
    row.className = "ife-row ife-row-event";

    const algorithmName = st.actions?.[0]?.algorithm || "";
    const alg = algorithmName ? ensureAlgorithm(algorithms, algorithmName) : undefined;
    const language = normalizeAlgorithmLanguage(alg?.language || DEFAULT_ALGORITHM_LANGUAGE);
    const algorithmControls = algorithmName
      ? `
        <div class="ife-event-row">
          <div class="ife-field">
            <label class="ife-inline-label">Algorithm</label>
            <input class="ife-input" data-idx="${idx}" data-field="alg-name" value="${escapeAttr(algorithmName)}" placeholder="Name" />
          </div>
          <div class="ife-field">
            <label class="ife-inline-label">Lang</label>
            <select class="ife-select" data-idx="${idx}" data-field="alg-lang">
            ${renderAlgorithmLanguageOptions(language)}
            </select>
          </div>
        </div>
        <label class="ife-block-label">Algorithm body</label>
        <textarea class="ife-textarea" data-idx="${idx}" data-field="alg-text" rows="4" placeholder="Text">${escapeAttr(alg?.body || "")}</textarea>
      `
      : `
        <div class="ife-event-row">
          <button class="ife-add-alg-btn" data-idx="${idx}">${tr2("newFbDialog.addAlgorithm")}</button>
        </div>
      `;

    row.innerHTML = `
      <div class="ife-event-row">
        <div class="ife-field">
          <label class="ife-inline-label">State</label>
          <input class="ife-input" data-idx="${idx}" data-field="state-name" value="${escapeAttr(st.name)}" placeholder="Name" />
        </div>
        <div class="ife-field">
          <label class="ife-inline-label">Comment</label>
          <input class="ife-input" data-idx="${idx}" data-field="state-comment" value="${escapeAttr(st.comment || "")}" placeholder="Comment" />
        </div>
        <button class="ife-remove-btn" data-idx="${idx}" title="${tr2("common.delete")}">✕</button>
      </div>
      <div class="ife-alg-block">
        ${algorithmControls}
      </div>
    `;

    panel.appendChild(row);
    stateList.appendChild(panel);
  });

  if (transitionList) {
    ecc.transitions.forEach((tr, idx) => {
      const row = document.createElement("div");
      row.className = "ife-row ife-row-transition";
      row.innerHTML = `
        <div class="ife-field">
          <label class="ife-inline-label">Source</label>
          <select class="ife-select" data-idx="${idx}" data-field="tr-source">
            ${transitionStateOptions(states, tr.source)}
          </select>
        </div>
        <div class="ife-field">
          <label class="ife-inline-label">Destination</label>
          <select class="ife-select" data-idx="${idx}" data-field="tr-dest">
            ${transitionStateOptions(states, tr.destination)}
          </select>
        </div>
        <div class="ife-field">
          <label class="ife-inline-label">Condition</label>
          <input class="ife-input" data-idx="${idx}" data-field="tr-cond" value="${escapeAttr(tr.condition || "")}" placeholder="REQ / 1 / REQ[IN > 0]" />
        </div>
        <button class="ife-remove-btn" data-idx="${idx}" title="${tr2("common.delete")}">✕</button>
      `;
      transitionList.appendChild(row);
    });
  }

  // ---- Listeners ----
  stateList.querySelectorAll<HTMLInputElement>(".ife-input").forEach((inp) => {
    inp.addEventListener("input", () => {
      const idx = Number(inp.dataset.idx);
      const field = inp.dataset.field as "state-name" | "state-comment" | "alg-name";
      const state = ecc.states[idx];
      if (!state) return;

      if (field === "state-name") {
        state.name = inp.value;
      } else if (field === "state-comment") {
        state.comment = inp.value;
      } else if (field === "alg-name") {
        const name = inp.value.trim();
        if (!state.actions) state.actions = [];
        if (!state.actions[0]) state.actions[0] = { algorithm: name };
        state.actions[0].algorithm = name;
        if (name) ensureAlgorithm(algorithms, name);
      }

      callbacks.onChange(ecc, algorithms);
    });
  });

  stateList.querySelectorAll<HTMLSelectElement>(".ife-select").forEach((sel) => {
    sel.addEventListener("change", () => {
      const idx = Number(sel.dataset.idx);
      const state = ecc.states[idx];
      const algName = state?.actions?.[0]?.algorithm || "";
      if (algName) {
        const alg = ensureAlgorithm(algorithms, algName);
        alg.language = normalizeAlgorithmLanguage(sel.value);
      }
      callbacks.onChange(ecc, algorithms);
    });
  });

  stateList.querySelectorAll<HTMLTextAreaElement>(".ife-textarea").forEach((ta) => {
    ta.addEventListener("input", () => {
      const idx = Number(ta.dataset.idx);
      const state = ecc.states[idx];
      const algName = state?.actions?.[0]?.algorithm || "";
      if (algName) {
        const alg = ensureAlgorithm(algorithms, algName);
        alg.body = ta.value;
      }
      callbacks.onChange(ecc, algorithms);
    });
  });

  stateList.querySelectorAll<HTMLButtonElement>(".ife-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      ecc.states.splice(idx, 1);
      callbacks.onChange(ecc, algorithms);
      callbacks.rerender();
    });
  });

  if (transitionList) {
    transitionList.querySelectorAll<HTMLSelectElement>(".ife-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        const idx = Number(sel.dataset.idx);
        const field = sel.dataset.field as "tr-source" | "tr-dest";
        const tr = ecc.transitions[idx];
        if (!tr) return;
        if (field === "tr-source") tr.source = sel.value;
        if (field === "tr-dest") tr.destination = sel.value;
        callbacks.onChange(ecc, algorithms);
      });
    });

    transitionList.querySelectorAll<HTMLInputElement>(".ife-input").forEach((inp) => {
      inp.addEventListener("input", () => {
        const idx = Number(inp.dataset.idx);
        const tr = ecc.transitions[idx];
        if (!tr) return;
        tr.condition = inp.value;
        callbacks.onChange(ecc, algorithms);
      });
    });

    transitionList.querySelectorAll<HTMLButtonElement>(".ife-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.idx);
        ecc.transitions.splice(idx, 1);
        callbacks.onChange(ecc, algorithms);
        callbacks.rerender();
      });
    });
  }

  stateList.querySelectorAll<HTMLButtonElement>(".ife-add-alg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const state = ecc.states[idx];
      if (!state) return;
      if (!state.actions) state.actions = [];
      if (!state.actions[0]) state.actions[0] = { algorithm: "" };
      if (!state.actions[0].algorithm) {
        const name = `ALG${idx + 1}`;
        state.actions[0].algorithm = name;
        ensureAlgorithm(algorithms, name);
      }
      callbacks.onChange(ecc, algorithms);
      callbacks.rerender();
    });
  });

  const addStateBtn = container.querySelector<HTMLButtonElement>("#eccStateAddBtn");
  if (addStateBtn) {
    addStateBtn.addEventListener("click", () => {
      const nextIndex = ecc.states.length + 1;
      const newState: ECState = { name: `STATE${nextIndex}` };
      ecc.states.push(newState);
      callbacks.onChange(ecc, algorithms);
      callbacks.rerender();
    });
  }

  const addTransitionBtn = container.querySelector<HTMLButtonElement>("#eccTransitionAddBtn");
  if (addTransitionBtn) {
    addTransitionBtn.addEventListener("click", () => {
      if (states.length === 0) return;
      const defaultState = states[0].name;
      ecc.transitions.push({
        source: defaultState,
        destination: defaultState,
        condition: "1",
      });
      callbacks.onChange(ecc, algorithms);
      callbacks.rerender();
    });
  }
}
