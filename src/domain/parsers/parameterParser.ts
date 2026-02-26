import { SysParameter } from "../sysModel";

export function parseParameters(ownerName: string, element: any): SysParameter[] {
  const parameters: SysParameter[] = [];
  if (!element?.Parameter) {
    return parameters;
  }

  const paramList = Array.isArray(element.Parameter) ? element.Parameter : [element.Parameter];
  for (const param of paramList) {
    if (param?.Name === undefined) {
      continue;
    }

    const sysParam: SysParameter = {
      fbName: ownerName,
      name: param.Name,
      value: param.Value || "",
    };

    if (param.Attribute) {
      const attrList = Array.isArray(param.Attribute) ? param.Attribute : [param.Attribute];
      sysParam.attributes = attrList
        .filter((attr: any) => attr?.Name !== undefined)
        .map((attr: any) => ({
          name: attr.Name,
          value: attr.Value || "",
        }));
    }

    parameters.push(sysParam);
  }

  return parameters;
}
