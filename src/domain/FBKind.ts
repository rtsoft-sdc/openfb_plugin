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
