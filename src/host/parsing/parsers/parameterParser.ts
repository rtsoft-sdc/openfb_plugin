import { SysParameter } from "../../../shared/models/sysModel";
import { asArray } from "../../../shared/utils/arrayUtils";

export function parseParameters(ownerName: string, element: any): SysParameter[] {
  const parameters: SysParameter[] = [];
  if (!element?.Parameter) {
    return parameters;
  }

  const paramList = asArray(element.Parameter);
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
      const attrList = asArray(param.Attribute);
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
