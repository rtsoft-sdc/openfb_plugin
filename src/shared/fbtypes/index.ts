/** Barrel exports for FB type creation models. */

export * from "./fbCommon";
export * from "./basicFbType";
export * from "./simpleFbType";
export * from "./compositeFbType";
export * from "./serviceInterfaceFbType";
export * from "./subAppType";
export * from "./algorithmLanguage";

import type { BasicFBType } from "./basicFbType";
import type { SimpleFBType } from "./simpleFbType";
import type { CompositeFBType } from "./compositeFbType";
import type { ServiceInterfaceFBType } from "./serviceInterfaceFbType";
import type { SubAppType } from "./subAppType";

export type NewFBTypeDefinition =
  | BasicFBType
  | SimpleFBType
  | CompositeFBType
  | ServiceInterfaceFBType
  | SubAppType;
