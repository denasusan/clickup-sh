"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X, Trash2 } from "lucide-react";
import type { Profile, Task, TaskPriority, TaskStatus, TaskTeam } from "@/types/database";
import TaskComments from "./TaskComments";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Belum Dikerjakan" },
  { value: "in_progress", label: "Sedang Dikerjakan" },
  { value: "done", label: "Selesai" },
];

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

export default function TaskModal({
  task,
  defaultStatus,
  profiles,
  currentUser,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  defaultStatus: TaskStatus;
  profiles: Profile[];
  currentUser: { id: string; email: string; full_name: string | null };
  onClose: () => void;
  onSave: (payload: Partial<Task> & { title: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState<string>(task?.assignee_id ?? "");
  const [dueDate, setDueDate] = useState<string>(task?.due_date ?? "");
  const [team, setTeam] = useState<TaskTeam | "">(task?.team ?? "");
  const [saving, setSaving] = useState(false);

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assignee_id: assigneeId || null,
      due_date: dueDate || null,
      team: team || null,
    });
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            {task ? "Edit Task" : "Task Baru"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Misal: Desain halaman landing"
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
              placeholder="Detail tambahan (opsional)"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Ditugaskan ke
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Belum ditugaskan</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
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

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            {task ? (
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 sm:justify-start"
              >
                <Trash2 size={14} />
                Hapus task
              </button>
            ) : (
              <span className="hidden sm:inline" />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 sm:flex-none"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:opacity-60 sm:flex-none"
              >
                {saving ? "Menyimpan..." : task ? "Simpan" : "Tambah Task"}
              </button>
            </div>
          </div>
        </form>

        {task && (
          <div className="mt-5">
            <TaskComments taskId={task.id} profilesById={profilesById} currentUser={currentUser} />
          </div>
        )}
      </div>
    </div>
  );
}
