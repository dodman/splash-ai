import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin ? session.user.id : null;
}

function randomPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setAdmin"),   isAdmin: z.boolean() }),
  z.object({ action: z.literal("ban") }),
  z.object({ action: z.literal("unban") }),
  z.object({ action: z.literal("resetPassword") }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  const body = patchSchema.parse(await req.json());

  if (body.action === "setAdmin") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: body.isAdmin },
      select: { id: true, isAdmin: true },
    });
    return NextResponse.json(updated);
  }

  if (body.action === "ban") {
    await prisma.user.update({ where: { id: userId }, data: { bannedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unban") {
    await prisma.user.update({ where: { id: userId }, data: { bannedAt: null } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "resetPassword") {
    const tempPassword = randomPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { hashedPassword } });
    return NextResponse.json({ tempPassword });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (userId === adminId) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
