"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Workspace } from "@/types/database";

export default function WorkspaceOnboarding() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: insertError } = await supabase
      .from("workspaces")
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .returns<Workspace[]>()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Gagal membuat workspace.");
      setLoading(false);
      return;
    }

    router.push(`/board/${data.id}`);
    router.refresh();
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-xl shadow-brand-900/5">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            FS
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Buat workspace tim</h1>
          <p className="mt-1 text-sm text-gray-500">
            Workspace adalah ruang kerja tim kamu. Setiap workspace bisa punya
            beberapa board dan anggotanya sendiri.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nama workspace
            </label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Misal: Tim Produk"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Membuat..." : "Buat workspace"}
          </button>
        </form>

        <button
          onClick={handleSignOut}
          className="mx-auto mt-5 flex items-center gap-1.5 text-xs font-medium text-gray-400 transition hover:text-gray-600"
        >
          <LogOut size={13} />
          Keluar
        </button>
      </div>
    </main>
  );
}
