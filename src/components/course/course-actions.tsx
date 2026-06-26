"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface CourseData {
  title: string;
  code: string;
  degree: string;
  year: number;
  semester: number;
  lecturer?: string | null;
}

export function CourseActions({
  courseId,
  course,
}: {
  courseId: string;
  course?: CourseData;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({
    title: course?.title ?? "",
    code: course?.code ?? "",
    degree: course?.degree ?? "",
    year: String(course?.year ?? 1),
    semester: String(course?.semester ?? 1),
    lecturer: course?.lecturer ?? "",
  });

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

  const updateField =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveEdit = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            year: Number(form.year),
            semester: Number(form.semester),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Update failed");
        }
        toast({ title: "Course updated" });
        setEditOpen(false);
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not update",
          description: err instanceof Error ? err.message : "Try again.",
        });
      }
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label="Course actions">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {course && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit course
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={remove} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete course
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Course title</Label>
              <Input id="edit-title" value={form.title} onChange={updateField("title")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Course code</Label>
                <Input id="edit-code" value={form.code} onChange={updateField("code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-degree">Degree / Programme</Label>
                <Input id="edit-degree" value={form.degree} onChange={updateField("degree")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-year">Year</Label>
                <Select
                  value={form.year}
                  onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}
                >
                  <SelectTrigger id="edit-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Year {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-semester">Semester</Label>
                <Select
                  value={form.semester}
                  onValueChange={(v) => setForm((f) => ({ ...f, semester: v }))}
                >
                  <SelectTrigger id="edit-semester">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Semester {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lecturer">
                Lecturer <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input id="edit-lecturer" value={form.lecturer} onChange={updateField("lecturer")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={saveEdit} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
