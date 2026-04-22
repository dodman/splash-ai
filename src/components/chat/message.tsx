"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Sparkles } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Citation } from "@/types";
import { CitationChip } from "./citation-chip";

interface MessageProps {
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  onCitationClick?: (c: Citation) => void;
}

export function Message({
  role,
  content,
  citations,
  streaming,
  userName,
  userEmail,
  onCitationClick,
}: MessageProps) {
  const isUser = role === "USER";
  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-4 sm:gap-4 sm:px-0",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md shadow-primary/20">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div className={cn("min-w-0 max-w-[92%] sm:max-w-[78%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-2xl px-4 py-3 text-[15px] leading-relaxed break-words text-left",
            isUser
              ? "bg-gradient-brand text-white shadow-md shadow-primary/20"
              : "bg-card border border-border/70"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content || (streaming ? "…" : "")}
              </ReactMarkdown>
              {streaming && (
                <span
                  aria-hidden
                  className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle"
                />
              )}
            </div>
          )}
        </div>

        {!isUser && citations && citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {citations.map((c) => (
              <CitationChip
                key={`${c.materialId}-${c.chunkIndex}`}
                citation={c}
                onClick={() => onCitationClick?.(c)}
              />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-card text-xs font-semibold">
          {initials(userName ?? null, userEmail ?? "")}
        </div>
      )}
    </div>
  );
}
