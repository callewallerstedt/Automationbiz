import { ReactNode } from "react";
import { CommandPalette } from "@/components/layout/command-palette";
import { GlobalSearch } from "@/components/layout/global-search";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,#1e293b_0%,#0b1220_38%,#04070d_100%)] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,#1f293799_1px,transparent_1px),linear-gradient(to_bottom,#1f293799_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative mx-auto flex max-w-[1500px]">
        <Sidebar />
        <div className="min-h-screen flex-1">
          <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/70 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <GlobalSearch />
              <CommandPalette />
            </div>
          </header>
          <main className="px-4 py-6 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

