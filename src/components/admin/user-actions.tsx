"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Ban, ShieldCheck, ShieldOff, KeyRound, X } from "lucide-react";

function ActionBtn({
  onClick, disabled, title, className, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function TempPasswordModal({ password, email, onClose }: { password: string; email: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-100">Password reset</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Share this temporary password with <span className="text-gray-200">{email}</span>. They should change it after logging in.
        </p>
        <div className="bg-gray-800 rounded-lg px-4 py-3 font-mono text-lg text-violet-300 text-center tracking-widest select-all border border-gray-700">
          {password}
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(password); }}
          className="mt-3 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Click to copy
        </button>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function UserActions({
  userId,
  email,
  isAdmin,
  isBanned,
  isSelf,
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
  isBanned: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const patch = (body: object) =>
    fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const toggleAdmin = () => start(async () => {
    await patch({ action: "setAdmin", isAdmin: !isAdmin });
    router.refresh();
  });

  const toggleBan = () => start(async () => {
    await patch({ action: isBanned ? "unban" : "ban" });
    router.refresh();
  });

  const resetPassword = () => start(async () => {
    const res = await patch({ action: "resetPassword" });
    const data = await res.json();
    setTempPassword(data.tempPassword);
  });

  const deleteUser = () => {
    if (!confirm(`Permanently delete ${email} and all their data? This cannot be undone.`)) return;
    start(async () => {
      await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      router.refresh();
    });
  };

  return (
    <>
      {tempPassword && (
        <TempPasswordModal
          password={tempPassword}
          email={email}
          onClose={() => setTempPassword(null)}
        />
      )}

      <div className="flex items-center justify-end gap-1">
        {/* Toggle admin */}
        <ActionBtn
          onClick={toggleAdmin}
          disabled={pending || isSelf}
          title={isAdmin ? "Revoke admin" : "Make admin"}
          className="text-gray-600 hover:text-violet-400 hover:bg-violet-500/10"
        >
          {isAdmin ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
        </ActionBtn>

        {/* Reset password */}
        <ActionBtn
          onClick={resetPassword}
          disabled={pending}
          title="Reset password"
          className="text-gray-600 hover:text-amber-400 hover:bg-amber-500/10"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </ActionBtn>

        {/* Ban / unban */}
        <ActionBtn
          onClick={toggleBan}
          disabled={pending || isSelf}
          title={isBanned ? "Unban user" : "Ban user"}
          className={isBanned
            ? "text-red-400 hover:text-gray-400 hover:bg-gray-500/10"
            : "text-gray-600 hover:text-red-400 hover:bg-red-500/10"}
        >
          <Ban className="h-3.5 w-3.5" />
        </ActionBtn>

        {/* Delete */}
        <ActionBtn
          onClick={deleteUser}
          disabled={pending || isSelf}
          title="Delete user"
          className="text-gray-600 hover:text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </ActionBtn>
      </div>
    </>
  );
}
