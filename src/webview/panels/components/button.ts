/**
 * Reusable button component for consistent styling across panels.
 * Styling is driven by CSS classes .btn, .btn-primary, .btn-secondary,
 * .btn-fullwidth defined in webviewTemplate.ts.
 */

export type ButtonStyle = "primary" | "secondary";

export interface ButtonOptions {
  /** DOM id attribute */
  id: string;
  /** Button label text */
  label: string;
  /** Visual style variant */
  style?: ButtonStyle;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Minimum width override in px (use only when default class value doesn't fit) */
  minWidth?: number;
  /** Full width (adds .btn-fullwidth class) */
  fullWidth?: boolean;
  /** Extra inline CSS to append (for one-off tweaks only) */
  extraCss?: string;
}

/**
 * Render an HTML button string with consistent project-wide styling.
 *
 * @example
 * ```ts
 * renderButton({ id: "saveBtn", label: "Сохранить", style: "primary" })
 * renderButton({ id: "cancelBtn", label: "Отмена", style: "secondary", disabled: true })
 * ```
 */
export function renderButton(options: ButtonOptions): string {
  const {
    id,
    label,
    style = "secondary",
    disabled = false,
    minWidth,
    fullWidth = false,
    extraCss = "",
  } = options;

  const classes = ["btn", `btn-${style}`];
  if (fullWidth) classes.push("btn-fullwidth");

  const disabledAttr = disabled ? " disabled" : "";

  // Only emit inline style for non-default min-width overrides or extra CSS
  const inlineParts: string[] = [];
  if (minWidth !== undefined) {
    inlineParts.push(`min-width:${minWidth}px`);
  }
  if (extraCss) {
    inlineParts.push(extraCss.replace(/^\s+/, ""));
  }
  const styleAttr = inlineParts.length > 0
    ? ` style="${inlineParts.join("; ")}"`
    : "";

  return `<button id="${id}" class="${classes.join(" ")}"${disabledAttr}${styleAttr}>${label}</button>`;
}

/**
 * Render a row of buttons centered with gap, wrapped in a section div.
 */
export function renderButtonRow(buttons: ButtonOptions[]): string {
  const inner = buttons.map(renderButton).join("\n      ");
  return `\n    <div class="sidepanel-section btn-row">\n      ${inner}\n    </div>`;
}
