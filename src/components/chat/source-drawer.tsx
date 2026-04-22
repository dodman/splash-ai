"use client";

import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Citation } from "@/types";
import { cn } from "@/lib/utils";

export function SourceDrawer({
  citation,
  onClose,
}: {
  citation: Citation | null;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity",
          citation ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md border-l bg-background shadow-2xl transition-transform duration-300",
          citation ? "translate-x-0" : "translate-x-full"
        )}
      >
        {citation && (
          <div className="flex h-full flex-col">
            <header className="flex items-start justify-between gap-3 border-b p-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
                    {citation.index}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Source
                  </span>
                </div>
                <h3 className="mt-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{citation.filename}</span>
                </h3>
                {citation.page != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Page {citation.page} · chunk {citation.chunkIndex + 1}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed">
                <p className="whitespace-pre-wrap">{citation.excerpt}</p>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                This is an excerpt the tutor pulled from your uploaded material. The full
                file is saved against the course.
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
