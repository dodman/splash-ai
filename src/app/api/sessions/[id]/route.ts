import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import {
  getSession,
  deleteSession,
  updateSessionMeta,
} from "@/services/tutorService";
import { handleApiError } from "@/lib/errors";

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  mode: z.enum(["LEARN", "PRACTICE", "REVISION", "DIRECT"]).optional(),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const session = await getSession(userId, id);
    return NextResponse.json({ session });
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
    const parsed = patchSchema.parse(body);
    const session = await updateSessionMeta({ userId, sessionId: id, ...parsed });
    return NextResponse.json({ session });
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
    await deleteSession(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
