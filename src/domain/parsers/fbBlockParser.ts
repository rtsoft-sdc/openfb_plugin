import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { SysBlock } from "../sysModel";
import { detectFBKind, FBKind } from "../FBKind";
import { parseParameters } from "./parameterParser";
import { resolveTypeFilePath } from "../fileSearch";

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

  const parameters = parseParameters(fbName, fb);

  // Detect FB kind by searching for .fbt file
  let fbKind: FBKind | undefined;
  if (typeShort) {
    const foundPath = resolveTypeFilePath(typeShort, "fbt", [sysDir, ...searchPaths]);

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
