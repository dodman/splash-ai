import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseCard } from "@/components/course/course-card";
import { listCoursesForUser } from "@/services/courseService";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const courses = await listCoursesForUser(session.user.id);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Courses</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Every course is its own tutor context — materials, chats, quizzes, and progress scoped to what you're actually studying.
          </p>
        </div>
        <Button asChild variant="gradient" size="lg">
          <Link href="/courses/new">
            <Plus className="h-4 w-4" />
            New course
          </Link>
        </Button>
      </header>

      {courses.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No courses yet"
          description="Add a course to upload your lecture notes and start learning from your own material."
          action={
            <Button asChild variant="gradient">
              <Link href="/courses/new">
                <Plus className="h-4 w-4" />
                Create your first course
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
