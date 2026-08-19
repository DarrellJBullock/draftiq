import type { NextRequest } from "next/server";
import { z } from "zod";
import { withValidation } from "@/lib/api-helpers";
import { IMPORT_TYPES } from "@/lib/validation/import";
import { parseImportFile } from "@/lib/services/import/parser";
import { validateImportRows } from "@/lib/services/import/validator";
import { importRows } from "@/lib/services/import/importer";

const bodySchema = z.object({
  type: z.enum(IMPORT_TYPES as [string, ...string[]]),
  seasonYear: z.number().int(),
  fileName: z.string(),
  fileContent: z.string(),
  /** When false, only validate + preview -- don't write to the database. */
  commit: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  return withValidation(async () => {
    const body = bodySchema.parse(await req.json());
    const type = body.type as (typeof IMPORT_TYPES)[number];

    const { rows } = parseImportFile(body.fileContent, body.fileName);
    const validation = validateImportRows(type, rows);

    if (!body.commit) {
      return { validation, imported: null };
    }

    const outcome = await importRows(type, body.seasonYear, validation.validRows as never);
    return { validation, imported: outcome };
  });
}
