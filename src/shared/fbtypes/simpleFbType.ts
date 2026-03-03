/** Simple FB type structures. */

import type { BaseFBType, VarDeclaration, Algorithm, InterfaceList } from "./fbCommon";

export interface SimpleFBContent {
  internalVars?: VarDeclaration[];
  algorithm?: Algorithm;
}

export interface SimpleFBType extends BaseFBType {
  category: "SIMPLE";
  interfaceList?: InterfaceList;
  simpleFB: SimpleFBContent;
}
