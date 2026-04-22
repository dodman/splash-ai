"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

export function CourseForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    code: "",
    degree: "",
    year: "1",
    semester: "1",
    lecturer: "",
  });

  const update =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            year: Number(form.year),
            semester: Number(form.semester),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Could not create course");
        }
        const { course } = await res.json();
        toast({
          title: "Course created",
          description: `${course.title} is ready. Upload some materials to begin.`,
        });
        router.push(`/courses/${course.id}`);
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not create course",
          description:
            err instanceof Error ? err.message : "Check the fields and try again.",
        });
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Course title</Label>
        <Input
          id="title"
          value={form.title}
          onChange={update("title")}
          required
          placeholder="e.g. Introduction to Calculus"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Course code</Label>
          <Input
            id="code"
            value={form.code}
            onChange={update("code")}
            required
            placeholder="MATH101"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="degree">Degree / Programme</Label>
          <Input
            id="degree"
            value={form.degree}
            onChange={update("degree")}
            required
            placeholder="BSc Mathematics"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Select
            value={form.year}
            onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}
          >
            <SelectTrigger id="year">
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
          <Label htmlFor="semester">Semester</Label>
          <Select
            value={form.semester}
            onValueChange={(v) => setForm((f) => ({ ...f, semester: v }))}
          >
            <SelectTrigger id="semester">
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
        <Label htmlFor="lecturer">
          Lecturer <span className="text-xs text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="lecturer"
          value={form.lecturer}
          onChange={update("lecturer")}
          placeholder="Prof. Ada Lovelace"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="gradient" size="lg" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create course
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
