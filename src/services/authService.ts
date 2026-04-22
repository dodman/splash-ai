import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/errors";

export const registerSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  name: z.string().trim().min(1).max(80).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ValidationError("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name,
      hashedPassword,
      settings: {
        create: {
          level: "INTERMEDIATE",
          preferredLength: "NORMAL",
          darkMode: false,
        },
      },
    },
    select: { id: true, email: true, name: true },
  });

  return user;
}
