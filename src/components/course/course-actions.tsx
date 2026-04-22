"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export function CourseActions({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!confirm("Delete this course? All materials, chats, and quizzes will be removed.")) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        toast({ title: "Course deleted" });
        router.push("/courses");
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not delete",
          description: err instanceof Error ? err.message : "Try again.",
        });
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Course actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={remove} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete course
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
