import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  accent?: "indigo" | "violet" | "fuchsia" | "emerald";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  indigo: "from-indigo-500/20 to-indigo-500/0 text-indigo-600 dark:text-indigo-400",
  violet: "from-violet-500/20 to-violet-500/0 text-violet-600 dark:text-violet-400",
  fuchsia: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-600 dark:text-fuchsia-400",
  emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400",
};

export function StatCard({ label, value, hint, icon: Icon, accent = "indigo" }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={cn(
          "absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl opacity-70",
          accentMap[accent]
        )}
      />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="font-serif text-3xl leading-none tracking-tight">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("rounded-xl border bg-card/80 p-2.5", accentMap[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
