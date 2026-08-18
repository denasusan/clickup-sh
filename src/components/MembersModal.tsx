"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X, UserMinus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, WorkspaceRole } from "@/types/database";

export default function MembersModal({
  workspaceId,
  members,
  myRole,
  currentUserId,
  onClose,
}: {
  workspaceId: string;
  members: { profile: Profile; role: WorkspaceRole }[];
  myRole: WorkspaceRole;
  currentUserId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError(null);

    const { data: profile, error: lookupError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email.trim())
      .returns<Profile[]>()
      .maybeSingle();

    if (lookupError || !profile) {
      setError("User dengan email itu belum terdaftar di Flowspace.");
      setSaving(false);
      return;
    }

    if (members.some((m) => m.profile.id === profile.id)) {
      setError("User itu sudah jadi anggota workspace ini.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: profile.id, role: "member" });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setEmail("");
    router.refresh();
  }

  async function handleRemove(userId: string) {
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Anggota workspace</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="mb-4 max-h-64 space-y-1 overflow-y-auto">
          {members.map((m) => (
            <li
              key={m.profile.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
                  {(m.profile.full_name ?? m.profile.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">
                    {m.profile.full_name ?? m.profile.email}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {m.role === "owner" ? "Owner" : "Anggota"}
                  </p>
                </div>
              </div>
              {myRole === "owner" && m.profile.id !== currentUserId && (
                <button
                  onClick={() => handleRemove(m.profile.id)}
                  className="rounded-md p-1 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Keluarkan anggota"
                >
                  <UserMinus size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {myRole === "owner" ? (
          <form onSubmit={handleInvite} className="space-y-2 border-t border-gray-100 pt-4">
            <label className="block text-xs font-medium text-gray-600">
              Undang anggota (email Flowspace yang sudah terdaftar)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teman@perusahaan.com"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                Undang
              </button>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        ) : (
          <p className="border-t border-gray-100 pt-4 text-xs text-gray-400">
            Hanya owner workspace yang bisa mengundang anggota baru.
          </p>
        )}
      </div>
    </div>
  );
}
