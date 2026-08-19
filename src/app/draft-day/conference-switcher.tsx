import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tabs for switching between a league's independently-drafted conferences
 * (e.g. NFC/AFC) -- each is its own live Draft Day session under one
 * shared league. Plain GET links/form, no client JS needed.
 */
export function ConferenceSwitcher({ conferences, active }: { conferences: string[]; active?: string }) {
  if (conferences.length === 0) {
    return (
      <form method="get" className="mb-4 flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Name this draft&apos;s conference/group (optional)</label>
          <input
            type="text"
            name="conference"
            placeholder="e.g. NFC"
            maxLength={40}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
        <button type="submit" className="flex h-8 items-center gap-1 rounded-md border border-dashed border-border px-2.5 text-xs text-muted-foreground hover:bg-muted/40">
          <Plus className="h-3 w-3" /> Start as a named conference
        </button>
      </form>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {conferences.map((c) => (
        <Link
          key={c}
          href={`/draft-day?conference=${encodeURIComponent(c)}`}
          className={cn(
            "rounded-md border px-2.5 py-1 text-xs font-semibold",
            c === active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/40"
          )}
        >
          {c}
        </Link>
      ))}
      <form method="get" className="flex items-center gap-1.5">
        <input
          type="text"
          name="conference"
          placeholder="New conference name"
          maxLength={40}
          className="h-7 w-36 rounded-md border border-input bg-background px-2 text-xs"
        />
        <button type="submit" className="flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:bg-muted/40">
          <Plus className="h-3 w-3" /> Add
        </button>
      </form>
    </div>
  );
}
