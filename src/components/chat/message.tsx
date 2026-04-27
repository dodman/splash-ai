"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Sparkles } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Citation } from "@/types";
import { CitationChip } from "./citation-chip";
import type { Components } from "react-markdown";

interface MessageProps {
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  onCitationClick?: (c: Citation) => void;
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [text]);

  return (
    <button
      onClick={copy}
      title={copied ? "Copied!" : "Copy"}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium transition-colors",
        copied
          ? "text-emerald-400"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        className
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      <span className="sr-only sm:not-sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ── Code block with copy button ───────────────────────────────────────────────

function CodeBlock({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const raw = extractText(children);
  const language = (className ?? "").replace("language-", "") || "text";

  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/60 px-3 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{language}</span>
        <CopyButton text={raw} />
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-[13px] leading-relaxed">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in (node as object)) {
    return extractText((node as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

// ── Markdown components ───────────────────────────────────────────────────────

const MARKDOWN_COMPONENTS: Components = {
  // Code blocks get the custom copy-enabled renderer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code({ className, children, ...props }: any) {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return (
      <code
        className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  // Remove the default pre wrapper since CodeBlock handles it
  pre({ children }) {
    return <>{children}</>;
  },
  // Better table styling
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-border/60 bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border-b border-border/20 px-3 py-2 text-sm">{children}</td>;
  },
  // Better blockquote
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-2 border-primary/50 pl-4 text-muted-foreground italic">
        {children}
      </blockquote>
    );
  },
};

// ── Main Message component ────────────────────────────────────────────────────

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
        "group flex w-full gap-3 px-4 py-4 sm:gap-4 sm:px-0",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-md shadow-primary/20">
          <Sparkles className="h-4 w-4" />
        </div>
      )}

      <div className={cn("min-w-0 max-w-[92%] sm:max-w-[82%]", isUser && "text-right")}>
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
                components={MARKDOWN_COMPONENTS}
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

        {/* Citations */}
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

        {/* Copy message button — appears on hover for assistant messages */}
        {!isUser && !streaming && content && (
          <div className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
            <CopyButton text={content} className="text-[11px]" />
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
