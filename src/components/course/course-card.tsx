import Link from "next/link";
import { BookOpen, FileText, MessagesSquare, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    code: string;
    degree: string;
    year: number;
    semester: number;
    lecturer?: string | null;
    updatedAt: Date | string;
    _count: { materials: number; chatSessions: number; quizzes: number };
  };
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Link href={`/courses/${course.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="relative h-20 overflow-hidden bg-gradient-brand">
          <div className="absolute -right-12 -top-6 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-3 left-5 text-white/90">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="absolute right-5 top-3 rounded-md bg-white/15 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {course.code}
          </div>
        </div>
        <CardContent className="space-y-3 p-5">
          <div>
            <h3 className="line-clamp-1 font-semibold tracking-tight group-hover:text-primary">
              {course.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {course.degree} · Year {course.year} · Semester {course.semester}
            </p>
            {course.lecturer && (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {course.lecturer}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {course._count.materials}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessagesSquare className="h-3 w-3" />
                {course._count.chatSessions}
              </span>
              <span className="inline-flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3" />
                {course._count.quizzes}
              </span>
            </div>
            <span>{formatRelativeTime(course.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
