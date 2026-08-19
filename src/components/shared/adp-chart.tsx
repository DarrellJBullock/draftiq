"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ADPChartPoint {
  id: string;
  name: string;
  position: string;
  adp: number;
  expertRank: number | null;
  consensusRank: number | null;
}

/**
 * Grouped bar comparison of ADP vs. Expert Rank vs. Consensus Rank for the
 * top ~30 players by ADP. Lower values are "better" for all three series,
 * so bars that diverge sharply for one player are the visual tell for a
 * market inefficiency (reach or steal).
 */
export function ADPChart({ data }: { data: ADPChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          interval={0}
          angle={-45}
          textAnchor="end"
          height={70}
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          stroke="hsl(var(--border))"
        />
        <YAxis
          reversed
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          stroke="hsl(var(--border))"
          label={{ value: "Overall rank / ADP", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="adp" name="ADP" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
        <Bar dataKey="consensusRank" name="Consensus Rank" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
        <Bar dataKey="expertRank" name="Expert Rank" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
