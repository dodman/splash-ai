"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({
  user,
  children,
  fullBleed = false,
}: {
  user: { email?: string | null; name?: string | null; image?: string | null };
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <div className="hidden lg:flex lg:w-64 lg:shrink-0">
        <Sidebar className="w-full" />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-72 transition-transform",
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <Sidebar className="w-full" onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onOpenSidebar={() => setMobileOpen(true)} />
        {fullBleed ? (
          <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        ) : (
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto min-h-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
