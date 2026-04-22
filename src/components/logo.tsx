import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative h-9 w-9 shrink-0">
        <div className="absolute inset-0 rounded-xl bg-gradient-brand shadow-lg shadow-primary/30" />
        <div className="absolute inset-[3px] rounded-[9px] bg-background/20 backdrop-blur-sm" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="absolute inset-0 m-auto h-5 w-5 text-white"
          aria-hidden="true"
        >
          <path
            d="M12 2c-1 3-3 5-6 6 3 1 5 3 6 6 1-3 3-5 6-6-3-1-5-3-6-6z"
            fill="currentColor"
          />
          <path
            d="M18 14c-.5 1.5-1.5 2.5-3 3 1.5.5 2.5 1.5 3 3 .5-1.5 1.5-2.5 3-3-1.5-.5-2.5-1.5-3-3z"
            fill="currentColor"
            opacity="0.8"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className="font-serif text-xl font-normal tracking-tight">
          Splash<span className="text-gradient font-semibold"> AI</span>
        </span>
      )}
    </div>
  );
}
