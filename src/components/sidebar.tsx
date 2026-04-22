"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  MessagesSquare,
  ListChecks,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { Button } from "./ui/button";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/chat", label: "Tutor", icon: MessagesSquare },
  { href: "/quiz", label: "Quizzes", icon: ListChecks },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "flex h-full flex-col gap-6 border-r border-border bg-card/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="px-6 pt-6">
        <Link href="/dashboard" className="block" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <div className="px-4">
        <Button asChild variant="gradient" className="w-full" onClick={onNavigate}>
          <Link href="/chat?new=1">
            <Plus className="mr-1" />
            New tutor chat
          </Link>
        </Button>
      </div>

      <nav className="flex-1 px-2">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 pb-6">
        <div className="rounded-xl bg-gradient-brand/10 border border-primary/20 p-3">
          <p className="text-xs font-medium text-foreground">Grounded in your notes</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Splash cites the specific pages of your uploaded materials. Never hallucinated.
          </p>
        </div>
      </div>
    </aside>
  );
}
