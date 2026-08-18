"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import type { Board } from "@/types/database";

export default function BoardTabs({
  workspaceId,
  boards,
  activeBoardId,
}: {
  workspaceId: string;
  boards: Board[];
  activeBoardId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("boards")
      .insert({ name: name.trim(), workspace_id: workspaceId, created_by: user?.id })
      .select()
      .returns<Board[]>()
      .single();

    setSaving(false);
    if (!error && data) {
      setName("");
      setCreating(false);
      router.push(`/board/${workspaceId}/${data.id}`);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-6 py-2">
      {boards.map((b) => (
        <Link
          key={b.id}
          href={`/board/${workspaceId}/${b.id}`}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            b.id === activeBoardId
              ? "bg-brand-50 text-brand-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          )}
        >
          {b.name}
        </Link>
      ))}

      {creating ? (
        <form onSubmit={handleCreate} className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama board"
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            Simpan
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setName("");
            }}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
          >
            <X size={14} />
          </button>
        </form>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 transition hover:bg-gray-100 hover:text-brand-600"
        >
          <Plus size={13} />
          Board
        </button>
      )}
    </div>
  );
}
