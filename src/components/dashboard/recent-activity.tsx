import Link from "next/link";
import { MessageSquare, ClipboardCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { ProgressSummary } from "@/types";

export function RecentActivity({
  items,
}: {
  items: ProgressSummary["recentActivity"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-500" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Your latest chats and quiz attempts will appear here.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {items.map((item, i) => (
              <li key={`${item.kind}-${item.href}-${i}`}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-colors hover:text-foreground"
                >
                  <div
                    className={
                      item.kind === "chat"
                        ? "flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "flex h-9 w-9 items-center justify-center rounded-lg bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"
                    }
                  >
                    {item.kind === "chat" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <ClipboardCheck className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.kind === "chat" ? "Tutor session" : "Quiz"}
                      {item.detail && ` · ${item.detail}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(item.at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
