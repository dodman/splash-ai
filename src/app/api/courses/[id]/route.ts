import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  getCourseForUser,
  updateCourse,
  deleteCourse,
  courseSchema,
} from "@/services/courseService";
import { handleApiError } from "@/lib/errors";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const course = await getCourseForUser(userId, id);
    return NextResponse.json({ course });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await req.json();
    const parsed = courseSchema.partial().parse(body);
    const course = await updateCourse(userId, id, parsed);
    return NextResponse.json({ course });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    await deleteCourse(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
