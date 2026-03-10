import type { Algorithm } from "../../../shared/fbtypes";
import { escapeXml } from "../../../shared/utils/xmlEscape";
import type { NewFbDialogDraft } from "./newFbModel";
import { ALGORITHM_LANGUAGE_SPECS, normalizeAlgorithmLanguage } from "../../../shared/fbtypes/algorithmLanguage";

export interface SimpleAlgorithmCallbacks {
  onChange: (algorithm: Algorithm) => void;
}

const escapeAttr = escapeXml;

function renderAlgorithmLanguageOptions(selected: unknown): string {
  const normalized = normalizeAlgorithmLanguage(selected);
  return ALGORITHM_LANGUAGE_SPECS
    .map((spec) => `<option value="${spec.value}" ${normalized === spec.value ? "selected" : ""}>${spec.label}</option>`)
    .join("");
}

export function renderSimpleAlgorithm(
  container: HTMLElement,
  draft: NewFbDialogDraft,
  callbacks: SimpleAlgorithmCallbacks,
): void {
  const algorithm = draft.typeData.simple.algorithm;

  container.innerHTML = `
    <div class="ife-section">
      <div class="ife-section-header">
        <span class="ife-section-title">Algorithm</span>
      </div>
      <div class="ife-row">
        <div class="ife-field">
          <label class="ife-inline-label">Name</label>
          <input class="ife-input" data-field="name" value="${escapeAttr(algorithm.name)}" placeholder="Name" />
        </div>
        <div class="ife-field">
          <label class="ife-inline-label">Lang</label>
          <select class="ife-select" data-field="lang">
            ${renderAlgorithmLanguageOptions(algorithm.language)}
          </select>
        </div>
        <div class="ife-field">
          <label class="ife-inline-label">Comment</label>
          <input class="ife-input" data-field="comment" value="${escapeAttr(algorithm.comment || "")}" placeholder="Comment" />
        </div>
      </div>
      <label class="ife-block-label">Algorithm body</label>
      <textarea class="ife-textarea" data-field="body" rows="8" placeholder="Text">${escapeAttr(algorithm.body || "")}</textarea>
    </div>
  `;

  const nameInput = container.querySelector<HTMLInputElement>(".ife-input[data-field='name']");
  if (nameInput) {
    nameInput.addEventListener("input", () => {
      algorithm.name = nameInput.value;
      callbacks.onChange(algorithm);
    });
  }

  const langSelect = container.querySelector<HTMLSelectElement>(".ife-select[data-field='lang']");
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      algorithm.language = normalizeAlgorithmLanguage(langSelect.value);
      callbacks.onChange(algorithm);
    });
  }

  const commentInput = container.querySelector<HTMLInputElement>(".ife-input[data-field='comment']");
  if (commentInput) {
    commentInput.addEventListener("input", () => {
      algorithm.comment = commentInput.value || undefined;
      callbacks.onChange(algorithm);
    });
  }

  const bodyInput = container.querySelector<HTMLTextAreaElement>(".ife-textarea[data-field='body']");
  if (bodyInput) {
    bodyInput.addEventListener("input", () => {
      algorithm.body = bodyInput.value;
      callbacks.onChange(algorithm);
    });
  }
}
