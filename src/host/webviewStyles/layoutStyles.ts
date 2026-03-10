/**
 * CSS for base layout, toolbar, canvas, left panel, and right panel.
 */
import { EXTENSION_COLORS } from "../../shared/colorScheme";

export function buildLayoutStyles(): string {
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    
    /* Top full-width toolbar */
    #toolbar {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 48px;
      z-index: 1000;
      display: flex;
      align-items: center;
      background: ${EXTENSION_COLORS.TOOLBAR_BG};
      padding: 0 12px;
      border-top: 1px solid ${EXTENSION_COLORS.TOOLBAR_BORDER};
      border-bottom: 1px solid ${EXTENSION_COLORS.TOOLBAR_BORDER};
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .toolbar-left {
      position: absolute;
      left: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-center {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #toolbar button {
      padding: 8px 12px;
      border: 1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BORDER};
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG};
      color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_TEXT};
      cursor: pointer;
      border-radius: 4px;
      font-family: Roboto, sans-serif;
    }
    #toolbar button:hover { background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_HOVER}; }
    #toolbar #settingsBtn, #toolbar #saveAsBtn {
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_BG};
      color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_TEXT};
      border: 1px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_BORDER};
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
    }
    #toolbar #settingsBtn:hover, #toolbar #saveAsBtn:hover {
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_HOVER};
    }
    
    /* Canvas - adjusted for left and right panels */
    #canvas {
      display: block;
      background: ${EXTENSION_COLORS.PANEL_BG};
      position: absolute;
      left: 0;
      top: 48px;
      right: 300px;
      bottom: 0;
    }
    
    /* Left sidepanel for devices */
    #left-sidepanel {
      position: fixed;
      left: 0;
      top: 48px;
      width: 250px;
      height: calc(100vh - 48px);
      background: ${EXTENSION_COLORS.PANEL_BG};
      border-right: 1px solid ${EXTENSION_COLORS.BORDER_DEFAULT};
      overflow-y: auto;
      z-index: 500;
      display: none;
      flex-direction: column;
    }
    
    #left-sidepanel-header {
      padding: 10px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      font-weight: 600;
      font-size: 14px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      position: sticky;
      top: 0;
    }
    
    #left-sidepanel-content {
      flex: 1;
      padding: 8px;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
    }
    
    .device-section {
      margin-bottom: 12px;
      padding: 8px;
      background: ${EXTENSION_COLORS.DEVICE_SECTION_BG};
      border-radius: 4px;
      border-left: 3px solid ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG};
    }
    
    .device-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    
    .device-name {
      font-weight: 600;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      word-break: break-word;
      flex: 1;
    }
    
    .device-info-container {
      margin-bottom: 8px;
    }
    
    .device-subsection {
      margin-top: 8px;
    }
    
    .device-section-title {
      font-weight: 600;
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
    }
    
    .device-section-title-collapsible {
      font-weight: 600;
      font-size: 10px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .device-item {
      padding: 2px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    
    .device-conns-container .device-item {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .device-label {
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      font-size: 10px;
      min-width: 70px;
    }
    
    .device-conns-container .device-label {
      min-width: auto;
      word-break: break-word;
      font-size: 9px;
    }
    
    .device-value {
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      font-weight: 500;
      text-align: right;
      word-break: break-word;
      flex: 1;
      margin-left: 8px;
    }
    
    .device-toggle {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      width: 12px;
      height: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      flex-shrink: 0;
    }
    
    .device-toggle:hover {
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }
    
    .device-fbs-container {
      padding: 4px 0;
    }
    
    .device-conns-container {
      padding: 4px 0;
    }
    
    .resource-item {
      padding: 1px 0 1px 8px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
      font-size: 12px;
    }
    
    /* Right sidepanel */
    #sidepanel {
      position: fixed;
      right: 0;
      top: 48px;
      width: 300px;
      height: calc(100vh - 48px);
      background: ${EXTENSION_COLORS.PANEL_BG};
      border-left: 1px solid ${EXTENSION_COLORS.BORDER_DEFAULT};
      overflow-y: auto;
      z-index: 500;
      display: flex;
      flex-direction: column;
    }
    
    #sidepanel-tabs {
      display: flex;
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_DEFAULT};
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .sidepanel-tab {
      flex: 1;
      padding: 8px 12px;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }
    
    .sidepanel-tab:hover {
      background: ${EXTENSION_COLORS.TOOLBAR_BUTTON_SECONDARY_HOVER};
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
    }
    
    .sidepanel-tab.active {
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      border-bottom-color: ${EXTENSION_COLORS.TOOLBAR_BUTTON_PRIMARY_BG};
      font-weight: 600;
    }
    
    #sidepanel-header {
      padding: 12px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
      background: ${EXTENSION_COLORS.PANEL_HEADER_BG};
      font-weight: 600;
      font-size: 13px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      position: sticky;
      top: 38px;
    }
    
    #sidepanel-content {
      flex: 1;
      padding: 12px;
      font-size: 12px;
      color: ${EXTENSION_COLORS.TEXT_SECONDARY};
    }
    
    .sidepanel-section {
      margin-bottom: 16px;
    }
    
    .sidepanel-section-title {
      font-weight: 600;
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid ${EXTENSION_COLORS.BORDER_LIGHT};
    }

    .sidepanel-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .sidepanel-label {
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
    }

    .sidepanel-value {
      font-size: 11px;
      color: ${EXTENSION_COLORS.TEXT_PRIMARY};
      flex: 1;
      text-align: center;
    }

    .sidepanel-empty {
      padding: 8px 0;
      text-align: center;
      color: ${EXTENSION_COLORS.TEXT_MUTED};
      font-size: 12px;
    }

    .sidepanel-ports-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .port-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      margin-right: 6px;
      vertical-align: middle;
    }`;
}
