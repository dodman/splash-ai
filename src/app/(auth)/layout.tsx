import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-brand text-white overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        </div>
        <Link href="/" className="relative flex items-center gap-2 text-white">
          <span className="font-serif text-2xl">Splash <span className="font-semibold">AI</span></span>
        </Link>

        <div className="relative space-y-6">
          <blockquote className="font-serif text-3xl leading-tight">
            "It taught me derivatives by asking me questions until I actually understood —
            not by dumping a wall of text."
          </blockquote>
          <p className="text-sm opacity-80">— Early student beta</p>
        </div>

        <div className="relative text-xs opacity-75">
          Grounded in your syllabus. Cited on every claim. Never hallucinated.
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
