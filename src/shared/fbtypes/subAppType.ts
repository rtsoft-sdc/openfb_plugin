/** SubApp type structures. */

import type { BaseFBType, FBNetwork, Service, SubAppInterfaceList } from "./fbCommon";

export interface SubAppType extends BaseFBType {
  category: "SUBAPP";
  interfaceList?: SubAppInterfaceList;
  subAppNetwork: FBNetwork;
  service?: Service;
}
