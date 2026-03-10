/**
 * CSS for reusable components: buttons, palette/tree, forms, ports, and settings panel.
 */
import { COLORS } from "../../shared/colorScheme";

export function buildComponentStyles(): string {
  return `
    /* ====== Reusable button component ====== */
    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
    }
    .btn-primary {
      border: 1px solid ${COLORS.SUCCESS_TEXT};
      background: ${COLORS.BUTTON_PRIMARY_BG};
      color: ${COLORS.BUTTON_TEXT_WHITE};
      font-weight: 500;
      cursor: pointer;
      min-width: 140px;
    }
    .btn-primary:disabled {
      background: ${COLORS.BUTTON_DISABLED_BG};
      cursor: not-allowed;
    }
    .btn-secondary {
      border: 1px solid ${COLORS.UI_BORDER};
      background: ${COLORS.BUTTON_SECONDARY_BG};
      cursor: pointer;
      min-width: 120px;
    }
    .btn-secondary:disabled {
      cursor: not-allowed;
    }
    .btn-fullwidth {
      width: 100%;
      min-width: 0;
    }
    .btn-row {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
    }

    /* ====== Palette / Tree view ====== */
    .palette-tree-container {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 4px 0;
    }
    .palette-block-item {
      padding: 4px 6px;
      border: none;
      background: ${COLORS.PALETTE_BLOCK_BG_TRANSPARENT};
      cursor: grab;
      user-select: none;
      font-size: 12px;
      color: ${COLORS.TEXT_PRIMARY};
      display: flex;
      align-items: center;
      gap: 6px;
      border-radius: 3px;
      transition: background-color 0.15s ease;
    }
    .palette-block-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .palette-folder-header {
      cursor: pointer;
      user-select: none;
      font-size: 12px;
      font-weight: bold;
      color: ${COLORS.TEXT_PRIMARY};
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .palette-folder-header--root {
      padding: 8px;
      background: ${COLORS.PALETTE_LIB_HEADER_BG};
      border: 1px solid ${COLORS.PALETTE_LIB_HEADER_BORDER};
      border-radius: 3px;
    }
    .palette-folder-header--nested {
      padding: 4px 0;
      background: none;
      border: none;
    }
    .folder-arrow {
      display: inline-block;
      width: 12px;
      text-align: center;
    }

    /* ====== FBT tree panel states ====== */
    .fbt-loading {
      padding: 12px;
      text-align: center;
      color: ${COLORS.TEXT_LIGHT};
      font-size: 12px;
    }
    .fbt-error {
      padding: 12px;
      color: ${COLORS.ERROR_TEXT};
      font-size: 12px;
    }
    .fbt-tree-footer {
      padding: 8px 0;
      border-top: 1px solid ${COLORS.BORDER_COLOR};
      margin-top: 8px;
    }

    /* ====== Form elements (shared by wizard + settings) ====== */
    .form-input {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid ${COLORS.INPUT_BORDER};
      border-radius: 4px;
      font-size: 12px;
      color: ${COLORS.INPUT_TEXT};
    }
    .form-input--error {
      border-color: ${COLORS.ERROR_TEXT};
    }
    .form-textarea {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid ${COLORS.INPUT_BORDER};
      border-radius: 4px;
      font-size: 12px;
      color: ${COLORS.INPUT_TEXT};
      resize: vertical;
    }
    .form-label {
      margin-bottom: 4px;
      color: ${COLORS.TEXT_MUTED};
    }
    .form-section-title {
      color: ${COLORS.TEXT_PRIMARY};
      font-weight: 700;
    }
    .form-error-hint {
      margin-top: 4px;
      min-height: 16px;
      font-size: 11px;
      color: ${COLORS.ERROR_TEXT};
    }
    .form-status {
      margin-top: 8px;
      text-align: center;
    }
    .form-field-block {
      display: block;
    }
    .form-field-block--flush {
      display: block;
      padding-top: 0;
    }

    /* ====== Port / parameter rendering ====== */
    .port-type-annotation {
      font-size: 11px;
    }
    .param-value-input {
      font-size: 11px;
      flex: 1;
      text-align: center;
      margin: 0 4px;
      min-width: 40px;
      max-width: 100px;
      padding: 1px 4px;
      border: 1px solid rgba(128,128,128,0.3);
      border-radius: 3px;
      background: rgba(255,255,255,0.05);
      color: inherit;
    }
    .opc-mapping-label {
      margin-left: auto;
      white-space: nowrap;
    }

    /* ====== Settings panel ====== */
    .settings-paths-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .settings-fbpath-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .settings-fbpath-label {
      flex: 1;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      font-size: 12px;
      color: ${COLORS.INPUT_TEXT};
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .settings-remove-path-btn {
      width: 24px;
      min-width: 24px;
      padding: 4px 0;
      border: 1px solid ${COLORS.UI_BORDER};
      background: ${COLORS.BUTTON_REMOVE_BG};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    }
    .settings-remove-path-btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .settings-deploy-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .settings-field {
      display: flex;
      flex-direction: column;
    }
    .settings-field--flex1 { flex: 1; }
    .settings-field--flex06 { flex: 0.6; }
    .settings-field--flex08 { flex: 0.8; }
    .settings-add-path-btn {
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      color: ${COLORS.LINK_TEXT};
      cursor: pointer;
      text-decoration: underline;
      font-size: 12px;
      font-family: inherit;
    }`;
}
