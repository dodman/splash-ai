"use client";

import { FileText } from "lucide-react";
import { truncate } from "@/lib/utils";
import type { Citation } from "@/types";

export function CitationChip({
  citation,
  onClick,
}: {
  citation: Citation;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground"
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-brand text-[10px] font-semibold text-white">
        {citation.index}
      </span>
      <FileText className="h-3 w-3" />
      <span>
        {truncate(citation.filename, 28)}
        {citation.page ? ` · p.${citation.page}` : ""}
      </span>
    </button>
  );
}
