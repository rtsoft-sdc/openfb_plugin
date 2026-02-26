/**
 * Store middleware helpers
 * Side-effect utilities around dispatch lifecycle
 */

import type { EditorAction } from "./actions";
import { getWebviewLogger } from "../logging";

const logger = getWebviewLogger();

const noisyActions = new Set<string>([
  "MOVE_NODE",
  "PAN",
  "ZOOM",
]);

/**
 * Log actions for debugging state transitions.
 * High-frequency actions are logged at debug level.
 */
export function logEditorAction(action: EditorAction): void {
  if (noisyActions.has(action.type)) {
    logger.debug(`Action: ${action.type}`);
    return;
  }

  logger.info(`Action: ${action.type}`);
}
