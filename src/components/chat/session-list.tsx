"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MessagesSquare, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MODE_META, type TutorMode } from "@/lib/modes";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  title: string;
  mode: string;
  updatedAt: Date;
  course?: { id: string; title: string; code: string } | null;
  _count: { messages: number };
};

export function SessionList({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [clearing, setClearing] = useState(false);

  const filtered = query.trim()
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(query.toLowerCase()) ||
          (s.course?.title ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (s.course?.code ?? "").toLowerCase().includes(query.toLowerCase()) ||
          s.mode.toLowerCase().includes(query.toLowerCase())
      )
    : sessions;

  const clearAll = async () => {
    if (!confirm(`Delete all ${sessions.length} chats? This cannot be undone.`)) return;
    setClearing(true);
    try {
      const res = await fetch("/api/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear chats");
      toast({ title: "All chats cleared" });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not clear chats",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search + Clear all */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-2">
          {sessions.length > 4 && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={clearing}
            className="ml-auto shrink-0 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="h-6 w-6" />}
          title={query ? "No matching chats" : "No chats yet"}
          description={
            query
              ? "Try a different search term."
              : "Start one on the left — pick a mode and optionally a course."
          }
        />
      ) : (
        <ul className="divide-y divide-border/70">
          {filtered.map((s) => {
            const meta = MODE_META[s.mode as TutorMode];
            const Icon = meta?.icon;
            return (
              <li key={s.id}>
                <Link
                  href={`/chat/${s.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:text-primary group"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {Icon && (
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover:bg-primary/10",
                      )}>
                        <Icon className={cn("h-3.5 w-3.5", meta?.accent ?? "text-muted-foreground")} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{s.title}</p>
                        <Badge variant="muted" className="shrink-0 text-[10px]">
                          {meta?.label ?? s.mode.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.course
                          ? `${s.course.code} · ${s.course.title}`
                          : "General"}{" "}
                        · {s._count.messages} messages
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(s.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
