"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UserRole } from "@/types";
import { sendAdminRequest } from "./AdminAction";

export function RoleSelect({ userId, role, disabled }: { userId: string; role: UserRole; disabled?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(next: UserRole) {
    if (!window.confirm(`Change this member's role to ${next}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await sendAdminRequest(`/api/admin/users/${userId}`, "POST", { action: "role", role: next });
      setValue(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role
      </label>
      <select id={`role-${userId}`} value={value} disabled={disabled || busy} onChange={(e) => change(e.target.value as UserRole)} className="field-input w-auto py-1 text-xs">
        <option value="member">Member</option>
        <option value="moderator">Moderator</option>
        <option value="admin">Admin</option>
      </select>
      {error && <span className="mt-1 max-w-[14rem] text-2xs text-bad">{error}</span>}
    </span>
  );
}
