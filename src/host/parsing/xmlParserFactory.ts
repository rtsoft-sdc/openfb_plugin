import { XMLParser, X2jOptions } from "fast-xml-parser";
import * as fs from "fs";

/** Default options shared by all XML parsers in the project. */
const DEFAULT_OPTIONS: Partial<X2jOptions> = {
  ignoreAttributes: false,
  attributeNamePrefix: "",
};

/**
 * Create an XMLParser with the project-standard attribute settings.
 * Extra options are merged on top of the defaults.
 */
export function createXmlParser(extra?: Partial<X2jOptions>): XMLParser {
  return new XMLParser({ ...DEFAULT_OPTIONS, ...extra });
}

/**
 * Read a file and parse its XML content using the default parser options.
 */
export function readAndParseXml(filePath: string): any {
  const xml = fs.readFileSync(filePath, "utf8");
  return createXmlParser().parse(xml);
}
