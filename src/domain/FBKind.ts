/**
 * Classification of Function Block types based on IEC 61499 structure
 */
export enum FBKind {
  BASIC = "BASIC",           // Contains <BasicFB> with ECC/algorithms
  COMPOSITE = "COMPOSITE",   // Contains <FBNetwork> with internal blocks
  ADAPTER = "ADAPTER",       // Contains <AdapterType> for protocol adaptation
  SUBAPP = "SUBAPP",         // Contains <SubAppNetwork> for hierarchical apps
  SERVICE = "SERVICE",       // No specific marker (99% runtime blocks like PUBLISH, OUT_ANY)
  UNKNOWN = "UNKNOWN"        // Missing or invalid FBType
}

/**
 * Detect FB kind from parsed XML FBType object
 *
 * @param fbType - Parsed FBType from xmlParser.parse(fbtContent).FBType
 * @returns FBKind enum value
 */
export function detectFBKind(fbType: any): FBKind {
  // Safety: null, undefined, or invalid input
  if (!fbType || typeof fbType !== "object") {
    return FBKind.UNKNOWN;
  }

  if (exists(fbType.AdapterType)) return FBKind.ADAPTER;
  if (exists(fbType.SubAppNetwork)) return FBKind.SUBAPP;
  if (exists(fbType.FBNetwork)) return FBKind.COMPOSITE;
  if (exists(fbType.BasicFB)) return FBKind.BASIC;

  return FBKind.SERVICE;
}

function exists(node: any) {
  return node !== undefined && node !== null;
}
