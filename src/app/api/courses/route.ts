import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  createCourse,
  listCoursesForUser,
  courseSchema,
} from "@/services/courseService";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const userId = await requireUserId();
    const courses = await listCoursesForUser(userId);
    return NextResponse.json({ courses });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = courseSchema.parse(body);
    const course = await createCourse(userId, parsed);
    return NextResponse.json({ course }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
