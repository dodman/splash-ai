"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function QuizListActions() {
  const router = useRouter();
  const { toast } = useToast();
  const [clearing, setClearing] = useState(false);

  const clearAll = async () => {
    if (!confirm("Delete all quizzes and attempts? This cannot be undone.")) return;
    setClearing(true);
    try {
      const res = await fetch("/api/quiz/list", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear quizzes");
      toast({ title: "All quizzes cleared" });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not clear quizzes",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={clearAll}
      disabled={clearing}
      className="text-xs text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5" />
      Clear all
    </Button>
  );
}
