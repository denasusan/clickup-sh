"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EditProfileModal({
  userId,
  currentName,
  onClose,
}: {
  userId: string;
  currentName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState(currentName);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setError("Password baru minimal 6 karakter.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Konfirmasi password tidak cocok.");
        return;
      }
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", userId);

    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    if (newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (passwordError) {
        setSaving(false);
        setError(passwordError.message);
        return;
      }
    }

    setSaving(false);
    onClose();
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
          <h2 className="text-lg font-semibold text-gray-800">Edit profil</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nama</label>
            <input
              autoFocus
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Nama lengkap kamu"
            />
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-600">
              Ganti password (opsional)
            </p>
            <div className="space-y-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Password baru (minimal 6 karakter)"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder="Konfirmasi password baru"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
