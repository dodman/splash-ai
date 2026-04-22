import { z } from "zod";
import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/errors";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  preferredLength: z.enum(["CONCISE", "NORMAL", "DETAILED"]).optional(),
  darkMode: z.boolean().optional(),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const [user, settings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, image: true, createdAt: true },
      }),
      prisma.userSettings.upsert({
        where: { userId },
        update: {},
        create: { userId },
      }),
    ]);
    return NextResponse.json({ user, settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = patchSchema.parse(body);

    if (parsed.name !== undefined) {
      await prisma.user.update({ where: { id: userId }, data: { name: parsed.name } });
    }

    const settingsPatch: Omit<typeof parsed, "name"> = { ...parsed };
    delete (settingsPatch as Record<string, unknown>).name;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...settingsPatch },
      update: settingsPatch,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, image: true, createdAt: true },
    });

    return NextResponse.json({ user, settings });
  } catch (err) {
    return handleApiError(err);
  }
}
