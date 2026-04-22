import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CourseForm } from "@/components/course/course-form";

export default function NewCoursePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Courses
        </Link>
        <h1 className="mt-3 font-serif text-3xl tracking-tight">Create a new course.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Give the tutor a container for your lecture notes, syllabi, and past papers.
          Each course stays isolated — no cross-contamination between subjects.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CourseForm />
        </CardContent>
      </Card>
    </div>
  );
}
