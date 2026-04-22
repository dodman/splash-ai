import Link from "next/link";
import { Target, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProgressSummary } from "@/types";

export function WeakTopics({
  topics,
}: {
  topics: ProgressSummary["weakTopics"];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-fuchsia-500" />
            Focus areas
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Topics the tutor thinks need more work.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Take a quiz or chat through a few topics — weak areas will surface here.
          </p>
        ) : (
          <ul className="space-y-4">
            {topics.map((t) => (
              <li key={t.topic} className="space-y-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{t.topic}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(t.mastery * 100)}% mastery
                  </span>
                </div>
                <Progress value={t.mastery * 100} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6">
          <Link
            href="/progress"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open progress report
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
