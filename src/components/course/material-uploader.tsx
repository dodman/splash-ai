"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { upload as blobUpload } from "@vercel/blob/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn, formatBytes, formatRelativeTime } from "@/lib/utils";

type MaterialStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

interface Material {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  status: MaterialStatus;
  error?: string | null;
  createdAt: string | Date;
}

// Accepted file types — includes .docx now
const ACCEPTED =
  ".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_MB = 25;
// Files larger than this go through Vercel Blob (bypasses 4.5 MB Hobby limit)
const BLOB_THRESHOLD_BYTES = 3.5 * 1024 * 1024;

export function MaterialUploader({
  courseId,
  initialMaterials,
}: {
  courseId: string;
  initialMaterials: Material[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const needsPolling = materials.some(
    (m) => m.status === "PENDING" || m.status === "PROCESSING"
  );

  useEffect(() => {
    if (!needsPolling) return;
    const interval = setInterval(async () => {
      const updated = await Promise.all(
        materials.map(async (m) => {
          if (m.status === "READY" || m.status === "FAILED") return m;
          try {
            const res = await fetch(`/api/materials/${m.id}`);
            if (!res.ok) return m;
            const { material } = await res.json();
            return material as Material;
          } catch {
            return m;
          }
        })
      );
      setMaterials(updated);
      if (
        updated.some((m) => m.status === "READY") &&
        updated.every((m) => m.status !== "PROCESSING" && m.status !== "PENDING")
      ) {
        router.refresh();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [materials, needsPolling, router]);

  const uploadSmall = useCallback(
    async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      body.append("courseId", courseId);

      const res = await fetch("/api/upload", { method: "POST", body });
      if (!res.ok) {
        const status = res.status;
        if (status === 413) {
          throw new Error(
            "File is too large for direct upload (Vercel 4.5 MB limit). " +
              "Try a smaller file or compress the PDF."
          );
        }
        if (status === 504 || status === 524) {
          throw new Error("Upload timed out. The file may be too large or complex — try a smaller one.");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Upload failed (HTTP ${status})`);
      }
      const { material } = await res.json();
      setMaterials((list) => [material, ...list]);
    },
    [courseId]
  );

  const uploadLarge = useCallback(
    async (file: File) => {
      // Step 1: Create a pending material record so polling can start
      const prepRes = await fetch("/api/upload/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          courseId,
        }),
      });
      if (!prepRes.ok) {
        const err = await prepRes.json().catch(() => ({}));
        throw new Error(err?.error || "Could not prepare upload.");
      }
      const { material } = await prepRes.json();

      // Show the pending material immediately so the user sees progress
      setMaterials((list) => [material as Material, ...list]);

      // Step 2: Upload directly to Vercel Blob (bypasses 4.5 MB body limit)
      const blob = await blobUpload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload/blob",
        clientPayload: JSON.stringify({
          materialId: material.id,
          courseId,
        }),
      });

      // Step 3: Trigger processing immediately — don't rely on Vercel's async webhook.
      // Fire-and-forget: if it times out on a huge file, polling will catch READY.
      fetch(`/api/materials/${material.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url }),
      }).then(async (res) => {
        if (res.ok) {
          const { material: updated } = await res.json().catch(() => ({}));
          if (updated) {
            setMaterials((list) =>
              list.map((m) => (m.id === updated.id ? (updated as Material) : m))
            );
          }
        }
      }).catch(() => {/* polling handles it */});
    },
    [courseId]
  );

  const upload = useCallback(
    async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `Maximum size is ${MAX_MB} MB.`,
        });
        return;
      }

      setUploading(true);
      try {
        if (file.size >= BLOB_THRESHOLD_BYTES) {
          await uploadLarge(file);
          toast({
            title: "Upload started",
            description: `${file.name} is uploading to cloud storage and will be processed shortly.`,
          });
        } else {
          await uploadSmall(file);
          toast({
            title: "Upload started",
            description: `${file.name} is being processed. We'll extract and embed the content.`,
          });
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: err instanceof Error ? err.message : "Try again.",
        });
      } finally {
        setUploading(false);
      }
    },
    [courseId, toast, uploadSmall, uploadLarge]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      for (const f of Array.from(files)) upload(f);
    },
    [upload]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeMaterial = async (id: string) => {
    if (!confirm("Remove this material? This also deletes its embeddings.")) return;
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setMaterials((list) => list.filter((m) => m.id !== id));
      toast({ title: "Removed", description: "Material deleted." });
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not remove",
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver
            ? "border-primary/60 bg-primary/5"
            : "border-border/60 bg-card/30 hover:border-primary/40"
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lg shadow-primary/20">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">Drop a PDF, Word doc, .md, or .txt here</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Up to {MAX_MB} MB. Large files are streamed to cloud storage automatically.
          </p>
        </div>
        <input
          type="file"
          accept={ACCEPTED}
          ref={fileInput}
          className="hidden"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          Choose file
        </Button>
      </div>

      {materials.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border bg-card">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {m.size > 0 ? formatBytes(m.size) + " · " : ""}uploaded {formatRelativeTime(m.createdAt)}
                </p>
                {m.status === "FAILED" && m.error && (
                  <p className="mt-1 text-xs text-destructive">{m.error}</p>
                )}
              </div>
              <StatusPill status={m.status} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeMaterial(m.id)}
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: MaterialStatus }) {
  switch (status) {
    case "READY":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3" />
          Ready
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge variant="info">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="secondary">
          <Loader2 className="h-3 w-3 animate-spin" />
          Pending
        </Badge>
      );
    case "FAILED":
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
  }
}
