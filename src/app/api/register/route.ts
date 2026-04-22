import { NextResponse } from "next/server";
import { register, registerSchema } from "@/services/authService";
import { handleApiError } from "@/lib/errors";
import { rateLimit, LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    rateLimit(`register:${req.headers.get("x-forwarded-for") ?? "anon"}`, LIMITS.register);
    const body = await req.json();
    const parsed = registerSchema.parse(body);
    const user = await register(parsed);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
