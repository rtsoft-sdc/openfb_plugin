/** Service Interface FB type structures. */

import type { BaseFBType, InterfaceList, Service } from "./fbCommon";

export interface ServiceInterfaceFBType extends BaseFBType {
  category: "SERVICE";
  interfaceList?: InterfaceList;
  service: Service;
}
