"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";

export function AdminToggleAdmin({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = () => {
    start(async () => {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setAdmin", isAdmin: !isAdmin }),
      });
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={isAdmin ? "Revoke admin" : "Make admin"}
      className="p-1.5 rounded-md text-gray-600 hover:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-40"
    >
      {isAdmin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
    </button>
  );
}
