import * as fs from "fs";
import * as path from "path";
import { XMLParser } from "fast-xml-parser";
import { SysBlock, SysParameter } from "../sysModel";
import { detectFBKind, FBKind } from "../FBKind";

export function parseFBBlock(
  fb: any,
  fbName: string,
  sysDir: string,
  searchPaths: string[],
  logger: any,
): SysBlock {
  const typeLong = fb.Type || "";
  const typeShort = typeLong.includes("::")
    ? typeLong.split("::").pop() || typeLong
    : typeLong;

  // Parse parameters
  const parameters: SysParameter[] = [];
  if (fb.Parameter) {
    const paramList = Array.isArray(fb.Parameter) ? fb.Parameter : [fb.Parameter];
    for (const param of paramList) {
      if (param?.Name !== undefined) {
        const sysParam: SysParameter = {
          fbName: fbName,
          name: param.Name,
          value: param.Value || "",
        };

        // Parse parameter attributes
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
    }
  }

  // Detect FB kind by searching for .fbt file
  let fbKind: FBKind | undefined;
  if (typeShort) {
    const pathsToSearch = [sysDir, ...searchPaths];
    let foundPath: string | null = null;

    for (const sp of pathsToSearch) {
      if (!sp) continue;
      const candidate = path.join(sp, `${typeShort}.fbt`);
      if (fs.existsSync(candidate)) {
        foundPath = candidate;
        break;
      }
      const candidateUpper = path.join(sp, `${typeShort.toUpperCase()}.fbt`);
      if (fs.existsSync(candidateUpper)) {
        foundPath = candidateUpper;
        break;
      }
    }

    if (foundPath) {
      try {
        const fbtContent = fs.readFileSync(foundPath, "utf8");
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "",
        });
        const fbtDoc = parser.parse(fbtContent);
        if (fbtDoc?.FBType) {
          fbKind = detectFBKind(fbtDoc.FBType);
          logger.debug(`Resolved fbKind for ${typeShort}: ${FBKind[fbKind]} from ${foundPath}`);
        }
      } catch (err) {
        logger.warn(`Failed to parse .fbt file for ${typeShort}:`, err);
      }
    } else {
      logger.debug(`No .fbt file found for type ${typeShort}`);
    }
  }

  return {
    id: fbName,
    typeShort,
    typeLong,
    x: Number(fb.x ?? 0),
    y: Number(fb.y ?? 0),
    fbKind,
    parameters: parameters.length > 0 ? parameters : undefined,
  };
}
