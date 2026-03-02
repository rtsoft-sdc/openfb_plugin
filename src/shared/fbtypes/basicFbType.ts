/** Basic FB type structures. */

import type { BaseFBType, ECC, VarDeclaration, Algorithm, InterfaceList } from "./fbCommon";

export interface BasicFBContent {
  internalVars?: VarDeclaration[];
  ecc: ECC;
  algorithms?: Algorithm[];
}

export interface BasicFBType extends BaseFBType {
  category: "BASIC";
  interfaceList?: InterfaceList;
  basicFB: BasicFBContent;
}
