"use client";

import { useState } from "react";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IMPORT_TYPES, type ImportType } from "@/lib/validation/import";

interface ImportIssue {
  rowNumber: number;
  severity: "error" | "warning";
  field: string;
  message: string;
}

interface ImportResponse {
  validation: { rowCount: number; validRowCount: number; errorCount: number; warningCount: number; issues: ImportIssue[] };
  imported: { imported: number; skipped: { index: number; reason: string }[] } | null;
}

const TYPE_LABELS: Record<ImportType, string> = {
  teams: "NFL Teams",
  players: "Players",
  rookies: "Rookie Data",
  rankings: "Rankings",
  adp: "ADP",
  projections: "Projections",
};

export function ImportWorkbench({ defaultSeasonYear }: { defaultSeasonYear: number }) {
  const [type, setType] = useState<ImportType>("players");
  const [seasonYear, setSeasonYear] = useState(defaultSeasonYear);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(commit: boolean) {
    if (!file) {
      toast.error("Choose a CSV or JSON file first.");
      return;
    }
    setLoading(true);
    try {
      const fileContent = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, seasonYear, fileName: file.name, fileContent, commit }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Import failed");
        return;
      }
      setResult(data);
      if (commit) {
        toast.success(`Imported ${data.imported.imported} rows${data.imported.skipped.length ? `, skipped ${data.imported.skipped.length}` : ""}.`);
      } else {
        toast.success(`Validated ${data.validation.validRowCount} of ${data.validation.rowCount} rows.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Data type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ImportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMPORT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Season year</Label>
            <Input type="number" value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label>File (.csv or .json)</Label>
            <Input type="file" accept=".csv,.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">
              Example templates: <code>/data/templates/{type}.csv</code>
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={loading} onClick={() => run(false)}>
              <UploadCloud className="mr-1.5 h-4 w-4" /> Validate
            </Button>
            <Button className="flex-1" disabled={loading || !result} onClick={() => run(true)}>
              Confirm Import
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          {!result ? (
            <p className="text-sm text-muted-foreground">Validate a file to preview rows and issues before importing.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{result.validation.rowCount} rows</Badge>
                <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {result.validation.validRowCount} valid
                </Badge>
                {result.validation.warningCount > 0 ? (
                  <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-400">
                    <AlertTriangle className="mr-1 h-3 w-3" /> {result.validation.warningCount} warnings
                  </Badge>
                ) : null}
                {result.validation.errorCount > 0 ? (
                  <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" /> {result.validation.errorCount} errors
                  </Badge>
                ) : null}
                {result.imported ? (
                  <Badge className="border-primary/30 bg-primary/15 text-primary">{result.imported.imported} imported</Badge>
                ) : null}
              </div>

              {result.validation.issues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead className="w-20">Level</TableHead>
                      <TableHead className="w-32">Field</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.validation.issues.slice(0, 100).map((issue, i) => (
                      <TableRow key={i}>
                        <TableCell className="tabular-nums">{issue.rowNumber}</TableCell>
                        <TableCell>
                          <Badge variant={issue.severity === "error" ? "destructive" : "outline"} className="text-[10px]">
                            {issue.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{issue.field}</TableCell>
                        <TableCell className="text-sm">{issue.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No validation issues found.</p>
              )}

              {result.imported && result.imported.skipped.length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Skipped during import</p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.imported.skipped.slice(0, 20).map((s, i) => (
                      <li key={i}>
                        Row {s.index + 2}: {s.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
