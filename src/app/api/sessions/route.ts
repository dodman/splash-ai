import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createSession, listSessions } from "@/services/tutorService";
import { handleApiError } from "@/lib/errors";

const createSchema = z.object({
  courseId: z.string().cuid().optional().nullable(),
  mode: z.enum(["LEARN", "PRACTICE", "REVISION", "DIRECT"]).default("LEARN"),
  title: z.string().trim().min(1).max(120).optional(),
});

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const courseIdParam = url.searchParams.get("courseId");
    const courseId =
      courseIdParam === null ? undefined : courseIdParam === "" ? null : courseIdParam;
    const sessions = await listSessions(userId, courseId);
    return NextResponse.json({ sessions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const parsed = createSchema.parse(body);
    const session = await createSession({
      userId,
      courseId: parsed.courseId ?? null,
      mode: parsed.mode,
      title: parsed.title,
    });
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
