/**
 * CSS for modals, wizard steps, and the interface editor (IFE) component.
 */
import { EXTENSION_COLORS } from "../../shared/colorScheme";

export function buildModalStyles(): string {
  return `
    /* Modal overlay */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    
    .modal-overlay.visible {
      display: flex;
    }
    
    .modal-content {
      background: ${EXTENSION_COLORS.PANEL_BG};
      width: 600px;
      max-width: 90%;
      max-height: 80vh;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      overflow: auto;
      display: flex;
      flex-direction: column;
    }

    /* Modal widths per wizard step */
    #newfb-modal .modal-content.wizard-step1 {
      width: 300px;
      max-width: 90%;
    }
    #newfb-modal .modal-content.wizard-step2 {
      width: 900px;
      max-height: 85vh;
    }
    #newfb-modal .modal-content.wizard-step3 {
      width: 900px;
      max-height: 85vh;
    }
    #newfb-modal .modal-content.wizard-step3.wizard-simple {
      width: 450px;
      max-width: 90%;
    }

    /* ====== Wizard step 2: split layout ====== */
    .wizard-step2-layout {
      display: flex;
      gap: 12px;
      flex: 1;
      min-height: 280px;
      max-height: 60vh;
      align-items: stretch;
    }
    .wizard-step2-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .wizard-step2-canvas canvas {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
    .wizard-step2-form {
      background: transparent;
    }
    .wizard-step2-editor {
      flex: 1;
      overflow-y: auto;
      padding-right: 4px;
    }
    .wizard-step2-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .wizard-step2-tab {
      padding: 4px 10px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 12px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 11px;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }
    .wizard-step2-tab.is-active {
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-weight: 700;
    }
    .wizard-step2-editor-pane {
      display: none;
    }
    .wizard-step2-editor-pane.is-active {
      display: block;
    }
    .wizard-step2-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 10px;
    }
    .wizard-step2-status {
      margin-top: 6px;
      text-align: center;
      font-size: 11px;
    }

    /* ====== Interface editor component ====== */
    .ife-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      align-items: start;
    }
    .ife-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ife-column-title {
      font-size: 11px;
      font-weight: 700;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: -2px;
    }
    .ife-panel {
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      background: transparent;
    }
    .ife-section {
      margin-bottom: 12px;
    }
    .ife-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .ife-section-title {
      font-weight: 600;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ife-add-btn {
      width: 22px;
      height: 22px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 14px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ife-add-btn:hover {
      background: ${EXTENSION_COLORS.BORDER_LIGHT};
    }
    .ife-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .ife-state-panel {
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 6px;
      background: transparent;
    }
    .ife-inline-label {
      font-size: 9px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .ife-block-label {
      display: block;
      margin: 4px 0 2px;
      font-size: 9px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .ife-field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }
    .ife-row {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .ife-row.ife-row-internal {
      flex-wrap: wrap;
      align-items: stretch;
    }
    .ife-row.ife-row-event {
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
    }
    .ife-row.ife-row-transition {
      align-items: flex-end;
      gap: 6px;
    }
    .ife-event-row {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .ife-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 2px;
    }
    .basic-ecc-layout {
      display: flex;
      gap: 12px;
    }
    .basic-ecc-panel {
      flex: 1;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      overflow: auto;
    }
    .basic-ecc-panel-states {
      flex: 4;
    }
    .basic-ecc-panel-right {
      flex: 3;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .basic-ecc-panel-transitions {
      flex: 3;
    }
    .basic-ecc-tabs {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .basic-ecc-tab {
      padding: 4px 10px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 12px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 11px;
      cursor: pointer;
    }
    .basic-ecc-tab.is-active {
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      font-weight: 700;
    }
    .basic-ecc-tabpane {
      display: none;
      overflow: auto;
      flex: 1;
    }
    .ife-empty-block {
      border: 1px dashed ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 4px;
      padding: 8px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
    }
    .ife-with {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
      margin-left: 2px;
    }
    .ife-with-label {
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      text-transform: lowercase;
    }
    .ife-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-height: 22px;
    }
    .ife-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 10px;
      font-size: 10px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-family: monospace;
    }
    .ife-chip-remove {
      border: none;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      cursor: pointer;
      padding: 0;
      font-size: 12px;
      line-height: 1;
    }
    .ife-chip-remove:hover {
      color: #e55;
    }
    .ife-chip-empty {
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      display: inline-flex;
      align-items: center;
      height: 22px;
      align-self: center;
    }
    .ife-with-add {
      min-width: 110px;
      padding: 2px 4px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
      font-family: monospace;
    }
    .ife-input {
      flex: 1;
      padding: 4px 6px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
      font-family: monospace;
    }
    .ife-input:focus {
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      outline: none;
    }
    .ife-textarea {
      width: 100%;
      padding: 6px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
      font-family: monospace;
      resize: vertical;
    }
    .ife-select {
      width: 90px;
      padding: 4px 4px;
      border: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 3px;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      background: transparent;
    }
    .ife-remove-btn {
      width: 20px;
      height: 20px;
      border: none;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
    }
    .ife-remove-btn:hover {
      color: #e55;
      background: rgba(255, 80, 80, 0.1);
    }
    .ife-add-alg-btn {
      padding: 4px 10px;
      border: 1px dashed ${EXTENSION_COLORS.BORDER_LIGHT};
      border-radius: 12px;
      background: transparent;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-size: 11px;
      cursor: pointer;
    }
    .ife-add-alg-btn:hover {
      border-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }
    
    #settings-modal-header,
    #newfb-modal-header {
      padding: 12px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      font-weight: 600;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    #settings-modal-body,
    #newfb-modal-body {
      flex: 1;
      padding: 12px;
      font-size: 12px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      overflow-y: auto;
    }

    /* When wizard is on step 2, body becomes flex-column so layout + buttons share space */
    #newfb-modal-body {
      display: flex;
      flex-direction: column;
    }`;
}
