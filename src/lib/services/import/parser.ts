import Papa from "papaparse";

export interface ParsedFile {
  rows: Record<string, unknown>[];
  format: "csv" | "json";
}

/** Parses an uploaded CSV or JSON string into an array of plain row objects. */
export function parseImportFile(content: string, filename: string): ParsedFile {
  const isJson = filename.toLowerCase().endsWith(".json") || content.trim().startsWith("[") || content.trim().startsWith("{");

  if (isJson) {
    const data = JSON.parse(content);
    const rows = Array.isArray(data) ? data : [data];
    return { rows, format: "json" };
  }

  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0]!.message} (row ${result.errors[0]!.row})`);
  }

  return { rows: result.data, format: "csv" };
}
