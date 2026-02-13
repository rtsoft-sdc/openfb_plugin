/**
 * Detect Function Block kind from parsed .fbt FBType XML structure
 */

import { FBKind } from "./FBKind";

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
