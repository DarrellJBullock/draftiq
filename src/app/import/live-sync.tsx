"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface SyncResult {
  provider: string;
  created: number;
  updated: number;
  skipped: { externalId: string; reason: string }[];
}

const PROVIDER_LABELS: Record<string, string> = {
  sleeper: "Sleeper (live, free, no key -- real player bios/rosters/status)",
};

export function LiveSync({ providers, defaultSeasonYear }: { providers: string[]; defaultSeasonYear: number }) {
  const [provider, setProvider] = useState(providers[0] ?? "sleeper");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/sync/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, seasonYear: defaultSeasonYear }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }
      setResult(data);
      toast.success(`Synced ${data.created + data.updated} players from ${data.provider} (${data.created} new, ${data.updated} updated).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Wifi className="h-4 w-4 text-primary" /> Live Data Sync
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pull real, current NFL player rosters directly from a live provider -- no file needed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 space-y-1.5">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PROVIDER_LABELS[p] ?? p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {loading ? "Syncing..." : "Sync Players"}
          </Button>
        </div>

        {result ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400">{result.created} created</Badge>
              <Badge className="border-primary/30 bg-primary/15 text-primary">{result.updated} updated</Badge>
              {result.skipped.length > 0 ? <Badge variant="destructive">{result.skipped.length} skipped</Badge> : null}
            </div>
            {result.skipped.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {result.skipped.slice(0, 10).map((s, i) => (
                  <li key={i}>
                    {s.externalId}: {s.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Note: live providers cover player bios/rosters/status only. ADP, expert rankings, and fantasy projections are
            proprietary data -- use the CSV/JSON import below (or a paid vendor via <code>NFLDataProvider</code>) for those.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
