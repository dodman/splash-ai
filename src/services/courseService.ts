import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export const courseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  code: z.string().trim().min(1).max(20),
  degree: z.string().trim().min(1).max(80),
  year: z.coerce.number().int().min(1).max(10),
  semester: z.coerce.number().int().min(1).max(4),
  lecturer: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
});

export type CourseInput = z.infer<typeof courseSchema>;

export async function createCourse(userId: string, input: CourseInput) {
  const course = await prisma.course.create({
    data: {
      ...input,
      ownerId: userId,
      enrollments: { create: { userId } },
    },
  });
  return course;
}

export async function listCoursesForUser(userId: string) {
  const courses = await prisma.course.findMany({
    where: { OR: [{ ownerId: userId }, { enrollments: { some: { userId } } }] },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { materials: true, chatSessions: true, quizzes: true } },
    },
  });
  return courses;
}

export async function getCourseForUser(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      _count: { select: { materials: true, chatSessions: true, quizzes: true } },
      materials: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!course) throw new NotFoundError("Course not found");
  const hasAccess =
    course.ownerId === userId ||
    !!(await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    }));
  if (!hasAccess) throw new ForbiddenError();
  return course;
}

export async function updateCourse(userId: string, courseId: string, input: Partial<CourseInput>) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError();
  if (course.ownerId !== userId) throw new ForbiddenError();
  return prisma.course.update({
    where: { id: courseId },
    data: input,
  });
}

export async function deleteCourse(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new NotFoundError();
  if (course.ownerId !== userId) throw new ForbiddenError();
  await prisma.course.delete({ where: { id: courseId } });
}
