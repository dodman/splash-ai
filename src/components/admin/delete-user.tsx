"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function AdminDeleteUser({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const del = () => {
    if (!confirm(`Delete ${email} and all their data? This cannot be undone.`)) return;
    start(async () => {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      router.refresh();
    });
  };

  return (
    <button
      onClick={del}
      disabled={pending}
      className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
      title="Delete user"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
