"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PositionBadge } from "@/components/shared/position-badge";
import { TierCard, type TierCardTier } from "@/components/shared/tier-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Layers } from "lucide-react";
import type { Position } from "@/types";

export interface TierBoardGroup {
  position: Position;
  tiers: TierCardTier[];
}

/** Client component: position tabs need local UI state to switch sections without a round trip. */
export function TiersBoard({ board }: { board: TierBoardGroup[] }) {
  const groupsWithTiers = board.filter((g) => g.tiers.length > 0);
  const [position, setPosition] = useState<Position | undefined>(groupsWithTiers[0]?.position);

  if (groupsWithTiers.length === 0) {
    return <EmptyState icon={Layers} title="No tiers configured yet" description="Tiers will appear here once they're generated for this season." />;
  }

  const active = groupsWithTiers.find((g) => g.position === position) ?? groupsWithTiers[0]!;

  return (
    <div>
      <Tabs value={active.position} onValueChange={(v) => setPosition(v as Position)}>
        <TabsList className="flex-wrap">
          {groupsWithTiers.map((g) => (
            <TabsTrigger key={g.position} value={g.position} className="gap-1.5">
              <PositionBadge position={g.position} className="h-4 min-w-6 px-1 text-[10px]" />
              {g.tiers.length}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.tiers.map((tier) => (
          <TierCard key={tier.id} tier={tier} position={active.position} />
        ))}
      </div>
    </div>
  );
}
