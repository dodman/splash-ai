import Link from "next/link";
import { ArrowRight, BookOpen, Brain, FileText, GraduationCap, MessagesSquare, Sparkles, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild variant="gradient" size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-brand opacity-20 blur-[120px]" />
        </div>
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            A tutor that reads your course, not the internet.
          </div>
          <h1 className="mt-6 font-serif text-5xl md:text-7xl leading-[1.05] tracking-tight">
            Learn what your lecturer <br />
            <span className="text-gradient">actually taught.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Upload your slides and notes. Splash tutors you from them — cited,
            step-by-step, across every subject. Practice, revise, quiz yourself,
            track what you've mastered.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="gradient" size="lg" className="min-w-[180px]">
              <Link href="/register">
                Start learning free
                <ArrowRight className="ml-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">I have an account</Link>
            </Button>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            No credit card. Works with PDFs, slides, and notes in English.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-4xl md:text-5xl tracking-tight">
            Four ways to learn, one tutor.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Switch modes mid-conversation to match how you're studying right now.
          </p>
        </div>
        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: GraduationCap,
              title: "Learn",
              desc: "One concept at a time. The tutor pauses to check you followed before moving on.",
            },
            {
              icon: Target,
              title: "Practice",
              desc: "Never gives the answer first. Hints ladder up from nudge to worked solution.",
            },
            {
              icon: Zap,
              title: "Revise",
              desc: "Rapid summaries and flashcards targeted at the topics you keep missing.",
            },
            {
              icon: MessagesSquare,
              title: "Direct",
              desc: "Need the answer now? You'll still get the reasoning behind it.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card/50 p-6 hover-lift"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-lg shadow-primary/20">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gradient-to-b from-muted/30 to-background py-20 md:py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center">
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight">
              How Splash grounds itself
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-muted-foreground">
              Most AI tutors invent facts. Splash refuses to answer beyond your own
              syllabus — and cites the page when it does.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: FileText,
                title: "Upload your materials",
                desc: "Slides, PDFs, readings — whatever your lecturer posted. Splash parses and indexes them.",
              },
              {
                step: "02",
                icon: Brain,
                title: "Ask anything",
                desc: "The tutor retrieves the most relevant passages and cites them inline as [1][2].",
              },
              {
                step: "03",
                icon: BookOpen,
                title: "Quiz & track",
                desc: "Generate exam-style quizzes from your materials. Weak topics surface automatically.",
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div
                key={step}
                className="relative rounded-2xl border border-border/60 bg-card p-6"
              >
                <div className="absolute right-6 top-6 font-serif text-4xl text-primary/15">
                  {step}
                </div>
                <Icon className="h-8 w-8 text-primary" />
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-24 text-center">
        <h2 className="font-serif text-4xl md:text-5xl tracking-tight">
          Your exam is coming. So is your tutor.
        </h2>
        <Button asChild variant="gradient" size="lg" className="mt-8">
          <Link href="/register">
            Start studying with Splash
            <ArrowRight className="ml-1" />
          </Link>
        </Button>
      </section>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-3 max-w-6xl px-6 py-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <p>© {new Date().getFullYear()} Splash AI — learning, done properly.</p>
        </div>
      </footer>
    </div>
  );
}
