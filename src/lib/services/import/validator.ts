import { z } from "zod";
import { IMPORT_ROW_SCHEMAS, type ImportType } from "@/lib/validation/import";

export interface ImportIssue {
  rowNumber: number;
  severity: "error" | "warning";
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  validRows: T[];
  issues: ImportIssue[];
  rowCount: number;
  validRowCount: number;
  errorCount: number;
  warningCount: number;
}

export function validateImportRows<K extends ImportType>(
  type: K,
  rows: Record<string, unknown>[]
): ValidationResult<z.infer<(typeof IMPORT_ROW_SCHEMAS)[K]>> {
  const schema = IMPORT_ROW_SCHEMAS[type];
  const validRows: z.infer<(typeof IMPORT_ROW_SCHEMAS)[K]>[] = [];
  const issues: ImportIssue[] = [];

  rows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // header is row 1 in a CSV
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== "" && v !== undefined));
    const result = schema.safeParse(cleaned);

    if (result.success) {
      // TS can't correlate the generic `K` with the indexed schema's inferred output here
      // (a known limitation with Record<K, ZodSchema> lookups), hence the assertion.
      validRows.push(result.data as z.infer<(typeof IMPORT_ROW_SCHEMAS)[K]>);
      if (type === "players") {
        const row = result.data as z.infer<typeof IMPORT_ROW_SCHEMAS.players>;
        if (!row.nflTeamAbbreviation && !row.isFreeAgent) {
          issues.push({ rowNumber, severity: "warning", field: "nflTeamAbbreviation", message: "No team given and not marked a free agent." });
        }
      }
    } else {
      for (const issue of result.error.issues) {
        issues.push({ rowNumber, severity: "error", field: issue.path.join(".") || "(row)", message: issue.message });
      }
    }
  });

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return { validRows, issues, rowCount: rows.length, validRowCount: validRows.length, errorCount, warningCount };
}
