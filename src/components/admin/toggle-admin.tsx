"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function AdminToggleAdmin({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = () => {
    start(async () => {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: !isAdmin }),
      });
      router.refresh();
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="text-xs px-2.5 py-1 rounded-md border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-40"
    >
      {isAdmin ? "Revoke admin" : "Make admin"}
    </button>
  );
}
