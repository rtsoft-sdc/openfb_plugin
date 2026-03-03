/** Composite FB type structures. */

import type { BaseFBType, FBNetwork, InterfaceList } from "./fbCommon";

export interface CompositeFBType extends BaseFBType {
  category: "COMPOSITE";
  interfaceList?: InterfaceList;
  fbNetwork: FBNetwork;
}
