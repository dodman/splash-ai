import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-serif text-3xl">Welcome back.</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue where you left off.
      </p>

      <div className="mt-8">
        <Suspense fallback={<div className="h-[280px]" />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
