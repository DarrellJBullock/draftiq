import type { ReactNode } from "react";
import { getActiveSeason } from "@/lib/season";
import { SidebarNav } from "./sidebar-nav";
import { Navbar } from "./navbar";

export async function AppShell({ children }: { children: ReactNode }) {
  const season = await getActiveSeason();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar seasonLabel={season.label} />
        <main className="min-w-0 flex-1 bg-field-lines">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
