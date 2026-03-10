import type {
  NewFBTypeDefinition,
  NewFBCategory,
  InterfaceList,
  SubAppInterfaceList,
  EventDeclaration,
  VarDeclaration,
  SubAppEventDeclaration,
  Algorithm,
  ECC,
  BasicFBType,
  SimpleFBType,
} from "../../../shared/fbtypes";
import type { EditorPort } from "../../editorState";
import { FBKind } from "../../../shared/models/FBKind";
import { createFbTypeTemplateDefinition, getTemplateInterfaceList } from "../../../shared/fbTypeTemplates";
import { DEFAULT_ALGORITHM_LANGUAGE } from "../../../shared/fbtypes/algorithmLanguage";

// ---------------------------------------------------------------------------
// Wizard step
// ---------------------------------------------------------------------------

export type WizardStep = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Type-specific draft data
// ---------------------------------------------------------------------------

export interface BasicTypeData {
  algorithms: Algorithm[];
  ecc: ECC;
  internalVars: VarDeclaration[];
}

export interface SimpleTypeData {
  internalVars: VarDeclaration[];
  algorithm: Algorithm;
}

export interface NewFbWizardTypeData {
  basic: BasicTypeData;
  simple: SimpleTypeData;
}

// ---------------------------------------------------------------------------
// Draft model
// ---------------------------------------------------------------------------

export interface NewFbDialogDraft {
  name: string;
  category: NewFBCategory;
  comment: string;
  /** Current wizard step (1 = basic info, 2 = interface editor + preview) */
  currentStep: WizardStep;
  /** Editable interface — initialised from template when category changes */
  interfaceList: InterfaceList;
  /** SubApp-specific interface (used when category === SUBAPP) */
  subAppInterfaceList?: SubAppInterfaceList;
  /** Type-specific data for later steps */
  typeData: NewFbWizardTypeData;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createBasicTypeDataFromTemplate(): BasicTypeData {
  const template = createFbTypeTemplateDefinition("NewFB", FBKind.BASIC) as BasicFBType;
  return {
    algorithms: template.basicFB.algorithms ?? [],
    ecc: template.basicFB.ecc,
    internalVars: template.basicFB.internalVars ?? [],
  };
}

function createSimpleTypeDataFromTemplate(): SimpleTypeData {
  const template = createFbTypeTemplateDefinition("NewFB", FBKind.SIMPLE) as SimpleFBType;
  return {
    internalVars: template.simpleFB.internalVars ?? [],
    algorithm: template.simpleFB.algorithm ?? { name: "ALG", language: DEFAULT_ALGORITHM_LANGUAGE, body: "" },
  };
}

export function createInitialNewFbDraft(): NewFbDialogDraft {
  const category = FBKind.BASIC;
  const tpl = getTemplateInterfaceList(category);
  return {
    name: "",
    category,
    comment: "",
    currentStep: 1,
    interfaceList: tpl.interfaceList ?? { eventInputs: [], eventOutputs: [], inputVars: [], outputVars: [] },
    subAppInterfaceList: tpl.subAppInterfaceList,
    typeData: {
      basic: createBasicTypeDataFromTemplate(),
      simple: createSimpleTypeDataFromTemplate(),
    },
  };
}

/**
 * Re-initialise the interface lists when the user changes category.
 * Resets ports to the template defaults for the new category.
 */
export function resetInterfaceForCategory(draft: NewFbDialogDraft): NewFbDialogDraft {
  const tpl = getTemplateInterfaceList(draft.category);
  return {
    ...draft,
    interfaceList: tpl.interfaceList ?? { eventInputs: [], eventOutputs: [], inputVars: [], outputVars: [] },
    subAppInterfaceList: tpl.subAppInterfaceList,
  };
}

/**
 * Re-initialise type-specific data for the selected category.
 */
export function resetTypeDataForCategory(draft: NewFbDialogDraft): NewFbDialogDraft {
  if (draft.category === FBKind.BASIC) {
    return {
      ...draft,
      typeData: {
        ...draft.typeData,
        basic: createBasicTypeDataFromTemplate(),
      },
    };
  }
  if (draft.category === FBKind.SIMPLE) {
    return {
      ...draft,
      typeData: {
        ...draft.typeData,
        simple: createSimpleTypeDataFromTemplate(),
      },
    };
  }
  return draft;
}

// ---------------------------------------------------------------------------
// Build final definition (uses edited interface + type-specific data)
// ---------------------------------------------------------------------------

export function buildNewFbDefinition(draft: NewFbDialogDraft): NewFBTypeDefinition {
  // Template provides all type-specific data: ECC for BASIC, algorithm for SIMPLE,
  // fbNetwork for COMPOSITE, service sequences for SERVICE, subAppNetwork for SUBAPP.
  // We override interfaceList and BASIC-specific sections when available.
  const def = createFbTypeTemplateDefinition(draft.name, draft.category, draft.comment);

  // Override the template interface with user-edited interface
  if (def.category === "SUBAPP" && draft.subAppInterfaceList) {
    (def as any).interfaceList = draft.subAppInterfaceList;
  } else {
    (def as any).interfaceList = draft.interfaceList;
  }

  if (def.category === "BASIC") {
    def.basicFB.algorithms = draft.typeData.basic.algorithms;
    def.basicFB.ecc = draft.typeData.basic.ecc;
    def.basicFB.internalVars = draft.typeData.basic.internalVars;
  }

  if (def.category === "SIMPLE") {
    def.simpleFB.internalVars = draft.typeData.simple.internalVars;
    def.simpleFB.algorithm = draft.typeData.simple.algorithm;
  }

  return def;
}

// ---------------------------------------------------------------------------
// Convert draft interface → EditorPort[] for canvas preview
// ---------------------------------------------------------------------------

function eventDeclsToPorts(
  decls: EventDeclaration[] | SubAppEventDeclaration[] | undefined,
  direction: "input" | "output",
  nodeId: string,
): EditorPort[] {
  if (!decls) return [];
  return decls.map((d) => ({
    id: `${nodeId}.${d.name}`,
    nodeId,
    name: d.name,
    kind: "event" as const,
    direction,
    x: 0,
    y: 0,
  }));
}

function varDeclsToPorts(
  decls: VarDeclaration[] | undefined,
  direction: "input" | "output",
  nodeId: string,
): EditorPort[] {
  if (!decls) return [];
  return decls.map((d) => ({
    id: `${nodeId}.${d.name}`,
    nodeId,
    name: d.name,
    kind: "data" as const,
    direction,
    type: d.type,
    x: 0,
    y: 0,
  }));
}

export function buildEditorPortsFromDraft(draft: NewFbDialogDraft): EditorPort[] {
  const nodeId = draft.name || "NewFB";

  if (draft.category === FBKind.SUBAPP && draft.subAppInterfaceList) {
    const iface = draft.subAppInterfaceList;
    return [
      ...eventDeclsToPorts(iface.subAppEventInputs, "input", nodeId),
      ...eventDeclsToPorts(iface.subAppEventOutputs, "output", nodeId),
      ...varDeclsToPorts(iface.inputVars, "input", nodeId),
      ...varDeclsToPorts(iface.outputVars, "output", nodeId),
    ];
  }

  const iface = draft.interfaceList;
  return [
    ...eventDeclsToPorts(iface.eventInputs, "input", nodeId),
    ...eventDeclsToPorts(iface.eventOutputs, "output", nodeId),
    ...varDeclsToPorts(iface.inputVars, "input", nodeId),
    ...varDeclsToPorts(iface.outputVars, "output", nodeId),
  ];
}
