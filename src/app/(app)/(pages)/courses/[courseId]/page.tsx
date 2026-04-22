import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  MessagesSquare,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { getCourseForUser } from "@/services/courseService";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MaterialUploader } from "@/components/course/material-uploader";
import { CourseActions } from "@/components/course/course-actions";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { courseId } = await params;

  let course;
  try {
    course = await getCourseForUser(session.user.id, courseId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ForbiddenError) notFound();
    throw err;
  }

  const [chatSessions, quizzes] = await Promise.all([
    prisma.chatSession.findMany({
      where: { userId: session.user.id, courseId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.quiz.findMany({
      where: { userId: session.user.id, courseId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { _count: { select: { questions: true, attempts: true } } },
    }),
  ]);

  const readyMaterials = course.materials.filter((m) => m.status === "READY").length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Courses
        </Link>
      </div>

      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">{course.code}</Badge>
            <span className="text-xs text-muted-foreground">
              {course.degree} · Year {course.year} · Semester {course.semester}
            </span>
          </div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{course.title}</h1>
          {course.lecturer && (
            <p className="text-sm text-muted-foreground">Lecturer: {course.lecturer}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="gradient" size="lg">
            <Link href={`/chat?courseId=${course.id}`}>
              <Sparkles className="h-4 w-4" />
              New tutor chat
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={`/quiz?courseId=${course.id}`}>
              <ClipboardCheck className="h-4 w-4" />
              Generate quiz
            </Link>
          </Button>
          <CourseActions courseId={course.id} />
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="font-serif text-2xl leading-none">{course._count.materials}</p>
              <p className="text-xs text-muted-foreground">
                Materials ({readyMaterials} ready)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500">
              <MessagesSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="font-serif text-2xl leading-none">
                {course._count.chatSessions}
              </p>
              <p className="text-xs text-muted-foreground">Tutor sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-serif text-2xl leading-none">{course._count.quizzes}</p>
              <p className="text-xs text-muted-foreground">Quizzes</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Materials
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload lecture PDFs, notes, or past papers. The tutor will cite them.
              </p>
            </CardHeader>
            <CardContent>
              <MaterialUploader
                courseId={course.id}
                initialMaterials={course.materials.map((m) => ({
                  id: m.id,
                  filename: m.filename,
                  mimeType: m.mimeType,
                  size: m.size,
                  status: m.status,
                  error: m.error,
                  createdAt: m.createdAt,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <MessagesSquare className="h-4 w-4 text-violet-500" />
                Recent chats
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/chat?courseId=${course.id}`}>New</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {chatSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No chats yet. Ask the tutor to walk you through a lecture.
                </p>
              ) : (
                <ul className="space-y-2">
                  {chatSessions.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/chat/${s.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <span className="truncate">{s.title}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(s.updatedAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-fuchsia-500" />
                Quizzes
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/quiz?courseId=${course.id}`}>Generate</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Generate a quiz once you have ready materials.
                </p>
              ) : (
                <ul className="space-y-2">
                  {quizzes.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/quiz/${q.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{q.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {q._count.questions} questions · {q._count.attempts} attempts
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
