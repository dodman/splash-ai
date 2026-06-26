"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function ProgressActions() {
  const router = useRouter();
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);

  const reset = async () => {
    if (!confirm("Reset all topic progress? Your quiz and chat history will stay, but mastery scores will be cleared.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/progress", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to reset progress");
      toast({ title: "Progress reset" });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not reset",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={reset}
      disabled={resetting}
      className="shrink-0 text-xs"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Reset progress
    </Button>
  );
}
