import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { deleteMaterial, getMaterialForUser } from "@/services/uploadService";
import { handleApiError } from "@/lib/errors";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const material = await getMaterialForUser({ userId, materialId: id });
    return NextResponse.json({ material });
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
    await deleteMaterial({ userId, materialId: id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
