/**
 * Common data structures for FB type definitions (shared across Basic, Simple, Composite, ServiceInterface, SubApp).
 */

import type { IecDataType } from "../iecConstants";

// -----------------------------------------------------------------------------
// Shared interface elements
// -----------------------------------------------------------------------------

export interface EventDeclaration {
  name: string;
  type?: "Event" | "EInit"; // default Event
  comment?: string;
  with?: string[]; // names of associated vars
}

export interface VarDeclaration {
  name: string;
  type: IecDataType | string;
  comment?: string;
  arraySize?: string;
  initialValue?: string;
}

export interface AdapterDeclaration {
  name: string;
  type: string; // fully qualified adapter type name
  comment?: string;
}

export interface InterfaceList {
  eventInputs?: EventDeclaration[];
  eventOutputs?: EventDeclaration[];
  inputVars?: VarDeclaration[];
  outputVars?: VarDeclaration[];
  inOutVars?: VarDeclaration[];
  sockets?: AdapterDeclaration[];
  plugs?: AdapterDeclaration[];
}

export interface SubAppEventDeclaration {
  name: string;
  type?: string;
  comment?: string;
}

export interface SubAppInterfaceList {
  subAppEventInputs?: SubAppEventDeclaration[];
  subAppEventOutputs?: SubAppEventDeclaration[];
  inputVars?: VarDeclaration[];
  outputVars?: VarDeclaration[];
  sockets?: AdapterDeclaration[];
  plugs?: AdapterDeclaration[];
}

// -----------------------------------------------------------------------------
// Algorithms, ECC (simplified state/action)
// -----------------------------------------------------------------------------

export interface Algorithm {
  name: string;
  comment?: string;
  language: "ST" | "C";
  body: string;
}

export interface ECAction {
  algorithm?: string; // Algorithm name
  output?: string; // Event output name
}

export interface ECState {
  name: string;
  comment?: string;
  x?: number;
  y?: number;
  actions?: ECAction[];
}

export interface ECTransition {
  source: string;
  destination: string;
  condition: string; // "1", "EV", "EV[cond]"
  comment?: string;
  x?: number;
  y?: number;
}

export interface ECC {
  states: ECState[];
  transitions: ECTransition[];
}

// -----------------------------------------------------------------------------
// FBNetwork / Service / Attributes
// -----------------------------------------------------------------------------

export interface Attribute {
  name: string;
  value: string;
}

export interface FBInstance {
  name: string;
  type: string; // FB type name
  x?: number;
  y?: number;
  attributes?: Attribute[];
}

export interface Connection {
  source: string; // "FB.Pin" or interface pin name
  destination: string;
  dx1?: number;
  dx2?: number;
  dy?: number;
}

export interface FBNetwork {
  fbInstances?: FBInstance[];
  subApps?: SubAppInstance[];
  eventConnections?: Connection[];
  dataConnections?: Connection[];
  adapterConnections?: Connection[];
}

export interface SubAppInstance {
  name: string;
  type: string; // SubApp type name
  x?: number;
  y?: number;
  fbNetwork?: FBNetwork;
}

export interface Primitive {
  interface: string; // "APPLICATION" | "RESOURCE"
  event: string;
  parameters?: string;
}

export interface ServiceTransaction {
  inputPrimitive?: Primitive;
  outputPrimitives?: Primitive[];
}

export interface ServiceSequence {
  name: string;
  comment?: string;
  transactions?: ServiceTransaction[];
}

export interface Service {
  leftInterface?: string; // default APPLICATION
  rightInterface?: string; // default RESOURCE
  sequences?: ServiceSequence[];
}

// -----------------------------------------------------------------------------
// Common metadata
// -----------------------------------------------------------------------------

import { FBKind } from "../models/FBKind";

export type NewFBCategory = FBKind.BASIC | FBKind.SIMPLE | FBKind.COMPOSITE | FBKind.SERVICE | FBKind.SUBAPP;

export interface Identification {
  standard?: string; // "61499-2"
  classification?: string;
  applicationDomain?: string;
  function?: string;
  description?: string;
}

export interface VersionInfo {
  version: string;
  author?: string;
  date?: string; // YYYY-MM-DD
  organization?: string;
  remarks?: string;
}

export interface CompilerInfo {
  header?: string;
  classdef?: string;
  packageName?: string;
}

export interface BaseFBType {
  name: string;
  comment?: string;
  identification?: Identification;
  versionInfo?: VersionInfo[];
  compilerInfo?: CompilerInfo;
}
