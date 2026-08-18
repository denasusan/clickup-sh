"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Board } from "@/types/database";

export default function CreateBoardPrompt({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
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

    const { data, error: insertError } = await supabase
      .from("boards")
      .insert({ name: name.trim(), workspace_id: workspaceId, created_by: user?.id })
      .select()
      .returns<Board[]>()
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Gagal membuat board.");
      setLoading(false);
      return;
    }

    router.push(`/board/${workspaceId}/${data.id}`);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f5fb] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-8 shadow-xl shadow-brand-900/5">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Buat board pertama</h1>
          <p className="mt-1 text-sm text-gray-500">
            Workspace <span className="font-medium text-gray-700">{workspaceName}</span> belum
            punya board. Board adalah papan kanban untuk mengatur task.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Nama board</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Misal: Sprint Agustus"
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
            {loading ? "Membuat..." : "Buat board"}
          </button>
        </form>
      </div>
    </main>
  );
}
