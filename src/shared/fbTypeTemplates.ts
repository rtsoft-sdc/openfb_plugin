import { FBKind } from "./models/FBKind";
import type {
  NewFBCategory,
  NewFBTypeDefinition,
  InterfaceList,
  SubAppInterfaceList,
} from "./fbtypes";
import { DEFAULT_ALGORITHM_LANGUAGE } from "./fbtypes/algorithmLanguage";

function createBasicInterfaceTemplate(): InterfaceList {
  return {
    eventInputs: [],
    eventOutputs: [],
    inputVars: [],
    outputVars: [],
  };
}

function createSimpleInterfaceTemplate(): InterfaceList {
  return {
    eventInputs: [
      { name: "REQ", type: "Event", comment: "Normal Execution Request" },
    ],
    eventOutputs: [
      { name: "CNF", type: "Event", comment: "Execution Confirmation" },
    ],
    inputVars: [],
    outputVars: [],
  };
}

function createCompositeInterfaceTemplate(): InterfaceList {
  return {
    eventInputs: [
      { name: "INIT", type: "EInit", comment: "Initialization Request", with: ["QI"] },
      { name: "REQ", type: "Event", comment: "Normal Execution Request", with: ["QI"] },
    ],
    eventOutputs: [
      { name: "INITO", type: "EInit", comment: "Initialization Confirm", with: ["QO"] },
      { name: "CNF", type: "Event", comment: "Execution Confirmation", with: ["QO"] },
    ],
    inputVars: [
      { name: "QI", type: "BOOL", comment: "Input event qualifier" },
    ],
    outputVars: [
      { name: "QO", type: "BOOL", comment: "Output event qualifier" },
    ],
  };
}

function createServiceInterfaceTemplate(): InterfaceList {
  return {
    eventInputs: [
      { name: "INIT", type: "EInit", comment: "Service Initialization", with: ["QI", "PARAMS"] },
      { name: "REQ", type: "Event", comment: "Service Request", with: ["QI", "SD"] },
      { name: "RSP", type: "Event", comment: "Application Response to IND", with: ["QI", "SD"] },
    ],
    eventOutputs: [
      { name: "INITO", type: "EInit", comment: "Initialization Confirm", with: ["QO", "STATUS"] },
      { name: "CNF", type: "Event", comment: "Confirmation of Requested Service", with: ["QO", "STATUS", "RD"] },
      { name: "IND", type: "Event", comment: "Indication from Resource", with: ["QO", "STATUS", "RD"] },
    ],
    inputVars: [
      { name: "QI", type: "BOOL", comment: "Event Input Qualifier" },
      { name: "PARAMS", type: "WSTRING", comment: "Service Parameters" },
      { name: "SD", type: "ANY", comment: "Output data to resource" },
    ],
    outputVars: [
      { name: "QO", type: "BOOL", comment: "Event Output Qualifier" },
      { name: "STATUS", type: "WSTRING", comment: "Service Status" },
      { name: "RD", type: "ANY", comment: "Input data from resource" },
    ],
  };
}

function createServiceSequencesTemplate() {
  return [
    {
      name: "normal_establishment",
      transactions: [
        {
          inputPrimitive: { interface: "APPLICATION", event: "INIT+", parameters: "PARAMS" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "initialize", parameters: "PARAMS" },
            { interface: "APPLICATION", event: "INITO+" },
          ],
        },
      ],
    },
    {
      name: "unsuccessful_establishment",
      transactions: [
        {
          inputPrimitive: { interface: "APPLICATION", event: "INIT+", parameters: "PARAMS" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "initialize", parameters: "PARAMS" },
            { interface: "APPLICATION", event: "INITO-", parameters: "STATUS" },
          ],
        },
      ],
    },
    {
      name: "request_confirm",
      transactions: [
        {
          inputPrimitive: { interface: "APPLICATION", event: "REQ+", parameters: "SD" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "request", parameters: "SD" },
            { interface: "APPLICATION", event: "CNF+", parameters: "RD" },
          ],
        },
      ],
    },
    {
      name: "request_inhibited",
      transactions: [
        {
          inputPrimitive: { interface: "APPLICATION", event: "REQ-", parameters: "SD" },
          outputPrimitives: [
            { interface: "APPLICATION", event: "CNF-", parameters: "STATUS" },
          ],
        },
      ],
    },
    {
      name: "request_error",
      transactions: [
        {
          inputPrimitive: { interface: "APPLICATION", event: "REQ+", parameters: "SD" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "request", parameters: "SD" },
            { interface: "APPLICATION", event: "CNF-", parameters: "STATUS" },
          ],
        },
      ],
    },
    {
      name: "indication_response",
      transactions: [
        {
          inputPrimitive: { interface: "RESOURCE", event: "indicate", parameters: "RD" },
          outputPrimitives: [
            { interface: "APPLICATION", event: "IND+", parameters: "RD" },
          ],
        },
        {
          inputPrimitive: { interface: "APPLICATION", event: "RSP", parameters: "QI,SD" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "response", parameters: "QI,SD" },
          ],
        },
      ],
    },
    {
      name: "indication_inhibited",
      transactions: [
        {
          inputPrimitive: { interface: "RESOURCE", event: "indicate", parameters: "RD,QI=FALSE" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "inhibited" },
          ],
        },
      ],
    },
    {
      name: "error_indication",
      transactions: [
        {
          inputPrimitive: { interface: "RESOURCE", event: "error", parameters: "STATUS" },
          outputPrimitives: [
            { interface: "APPLICATION", event: "IND-", parameters: "STATUS" },
          ],
        },
      ],
    },
    {
      name: "application_initiated_termination",
      transactions: [
        {
          inputPrimitive: { interface: "APPLICATION", event: "INIT-" },
          outputPrimitives: [
            { interface: "RESOURCE", event: "terminate" },
            { interface: "APPLICATION", event: "INITO-", parameters: "STATUS" },
          ],
        },
      ],
    },
    {
      name: "resource_initiated_termination",
      transactions: [
        {
          outputPrimitives: [
            { interface: "APPLICATION", event: "INITO-", parameters: "STATUS" },
          ],
        },
      ],
    },
  ];
}

function createSubAppInterfaceTemplate(): SubAppInterfaceList {
  return {
    subAppEventInputs: [
      { name: "INIT", type: "EInit", comment: "Initialization Request" },
      { name: "REQ", type: "Event", comment: "Normal Execution Request" },
    ],
    subAppEventOutputs: [
      { name: "INITO", type: "EInit", comment: "Initialization Confirm" },
      { name: "CNF", type: "Event", comment: "Execution Confirmation" },
    ],
    inputVars: [
      { name: "QI", type: "BOOL", comment: "Input event qualifier" },
    ],
    outputVars: [
      { name: "QO", type: "BOOL", comment: "Output event qualifier" },
    ],
  };
}

/**
 * Returns only the interface portion for a given category (no full definition).
 * Used by the wizard to initialise ports when the user switches category.
 */
export function getTemplateInterfaceList(
  category: NewFBCategory,
): { interfaceList?: InterfaceList; subAppInterfaceList?: SubAppInterfaceList } {
  if (category === FBKind.SUBAPP) {
    return { subAppInterfaceList: createSubAppInterfaceTemplate() };
  }
  switch (category) {
    case FBKind.BASIC:
      return { interfaceList: createBasicInterfaceTemplate() };
    case FBKind.SIMPLE:
      return { interfaceList: createSimpleInterfaceTemplate() };
    case FBKind.COMPOSITE:
      return { interfaceList: createCompositeInterfaceTemplate() };
    case FBKind.SERVICE:
      return { interfaceList: createServiceInterfaceTemplate() };
    default:
      return { interfaceList: createBasicInterfaceTemplate() };
  }
}

export function createFbTypeTemplateDefinition(
  name: string,
  category: NewFBCategory,
  comment?: string,
): NewFBTypeDefinition {
  const createdDate = new Date().toISOString().slice(0, 10);
  const trimmedComment = comment?.trim();
  const base = {
    name: name.trim(),
    comment: trimmedComment ? trimmedComment : undefined,
    identification: {
      standard: category === FBKind.SIMPLE ? "61499-1" : "61499-2",
    },
    compilerInfo: {},
    versionInfo: [
      {
        version: "1.0",
        date: createdDate,
      },
    ],
  };

  switch (category) {
    case FBKind.BASIC:
      return {
        ...base,
        category: "BASIC",
        interfaceList: createBasicInterfaceTemplate(),
        basicFB: {
          ecc: {
            states: [{ name: "START", comment: "Initial State" }],
            transitions: [],
          },
        },
      };
    case FBKind.SIMPLE:
      return {
        ...base,
        category: "SIMPLE",
        interfaceList: createSimpleInterfaceTemplate(),
        simpleFB: {
          internalVars: [],
            algorithm: { name: "ALG", language: DEFAULT_ALGORITHM_LANGUAGE, body: "" },
        },
      };
    case FBKind.COMPOSITE:
      return {
        ...base,
        category: "COMPOSITE",
        interfaceList: createCompositeInterfaceTemplate(),
        fbNetwork: {},
      };
    case FBKind.SERVICE:
      return {
        ...base,
        category: "SERVICE",
        interfaceList: createServiceInterfaceTemplate(),
        service: {
          leftInterface: "APPLICATION",
          rightInterface: "RESOURCE",
          sequences: createServiceSequencesTemplate(),
        },
      };
    case FBKind.SUBAPP:
      return {
        ...base,
        category: "SUBAPP",
        interfaceList: createSubAppInterfaceTemplate(),
        subAppNetwork: {},
      };
    default:
      throw new Error(`Unsupported FB category: ${String(category)}`);
  }
}
