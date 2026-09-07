"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Board, Task, TaskPriority, TaskTeam } from "@/types/database";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Rendah" },
  { value: "medium", label: "Sedang" },
  { value: "high", label: "Tinggi" },
  { value: "urgent", label: "Mendesak" },
];

const TEAM_OPTIONS: { value: TaskTeam; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "operasional", label: "Operasional" },
  { value: "it", label: "IT" },
  { value: "program", label: "Program" },
];

export default function RequestTaskModal({
  boards,
  defaultBoardId,
  currentUserId,
  onClose,
  onCreated,
}: {
  boards: Board[];
  defaultBoardId: string;
  currentUserId: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const supabase = createClient();
  const [boardId, setBoardId] = useState(defaultBoardId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [team, setTeam] = useState<TaskTeam | "">("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    // Task baru ditaruh di paling atas kolom "todo" (position terkecil).
    const { data: firstTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("board_id", boardId)
      .eq("status", "todo")
      .order("position", { ascending: true })
      .limit(1)
      .returns<{ position: number }[]>()
      .maybeSingle();

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        board_id: boardId,
        title: title.trim(),
        description: description.trim() || null,
        status: "todo",
        priority,
        team: team || null,
        due_date: dueDate || null,
        position: (firstTask?.position ?? 1) - 1,
        created_by: currentUserId,
      })
      .select()
      .returns<Task[]>()
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError("Gagal mengirim request. Coba lagi.");
      return;
    }
    onCreated(data);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Request Task</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-gray-500">
          Ajukan task baru ke board tujuan. Task akan langsung masuk ke kolom
          &quot;Belum Dikerjakan&quot; di board tersebut.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Board tujuan
            </label>
            <select
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Judul task
            </label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Misal: Butuh materi promosi event"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Deskripsi
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              placeholder="Jelaskan kebutuhannya (opsional)"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Prioritas
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tenggat waktu
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Request dari tim
            </label>
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value as TaskTeam | "")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Pilih tim</option>
              {TEAM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
              {saving ? "Mengirim..." : "Kirim Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
