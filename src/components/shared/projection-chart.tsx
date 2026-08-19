"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Lightweight floor/median/ceiling bar chart for a player's fantasy points
 * projection. Client Component because Recharts needs the browser (ResizeObserver).
 */
export function ProjectionChart({ floor, median, ceiling }: { floor: number | null; median: number | null; ceiling: number | null }) {
  const data = [
    { label: "Floor", points: floor ?? 0 },
    { label: "Median", points: median ?? 0 },
    { label: "Ceiling", points: ceiling ?? 0 },
  ];

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              borderColor: "hsl(var(--border))",
              borderRadius: 8,
              color: "hsl(var(--popover-foreground))",
              fontSize: 12,
            }}
            cursor={{ fill: "hsl(var(--muted))" }}
          />
          <Bar dataKey="points" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
