"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { Board, Profile, Task, TaskPriority, TaskStatus, TaskTeam } from "@/types/database";
import TaskComments from "./TaskComments";

function formatTimestamp(value: string) {
  return format(new Date(value), "d MMM yyyy, HH:mm", { locale: idLocale });
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Belum Dikerjakan" },
  { value: "in_progress", label: "Sedang Dikerjakan" },
  { value: "done", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
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
  boards,
  currentBoardId,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
}: {
  task: Task | null;
  defaultStatus: TaskStatus;
  profiles: Profile[];
  currentUser: { id: string; email: string; full_name: string | null };
  boards: Board[];
  currentBoardId: string;
  onClose: () => void;
  onSave: (payload: Partial<Task> & { title: string; assignee_ids: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assignee_ids ?? (task?.assignee_id ? [task.assignee_id] : [])
  );
  const [dueDate, setDueDate] = useState<string>(task?.due_date ?? "");
  const [team, setTeam] = useState<TaskTeam | "">(task?.team ?? "");
  const [boardId, setBoardId] = useState<string>(task?.board_id ?? currentBoardId);
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
    if (readOnly || !title.trim()) return;
    setSaving(true);
    await onSave({
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      assignee_ids: assigneeIds,
      due_date: dueDate || null,
      team: team || null,
      ...(task ? { board_id: boardId } : {}),
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
              disabled={readOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Misal: Desain halaman landing"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Deskripsi
            </label>
            <textarea
              rows={3}
              disabled={readOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
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
                disabled={readOnly}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
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
                disabled={readOnly}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {task && (task.started_at || task.completed_at) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
              {task.started_at && <span>Mulai dikerjakan: {formatTimestamp(task.started_at)}</span>}
              {task.completed_at && <span>Selesai: {formatTimestamp(task.completed_at)}</span>}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Ditugaskan ke
              {assigneeIds.length > 0 && (
                <span className="ml-1 font-normal text-gray-400">({assigneeIds.length})</span>
              )}
            </label>
            <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-gray-300 p-1">
              {profiles.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-gray-400">Belum ada anggota.</p>
              )}
              {profiles.map((p) => {
                const checked = assigneeIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      readOnly ? "cursor-default" : "hover:bg-gray-50"
                    } ${checked ? "text-gray-800" : "text-gray-600"}`}
                  >
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={checked}
                      onChange={(e) =>
                        setAssigneeIds((current) =>
                          e.target.checked
                            ? [...current, p.id]
                            : current.filter((id) => id !== p.id)
                        )
                      }
                      className="rounded border-gray-300"
                    />
                    {p.full_name ?? p.email}
                  </label>
                );
              })}
            </div>
            {assigneeIds.length === 0 && (
              <p className="mt-1 text-[11px] text-gray-400">Belum ditugaskan ke siapa pun.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tenggat waktu
              </label>
              <input
                type="date"
                value={dueDate}
                disabled={readOnly}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Request dari tim
              </label>
              <select
                value={team}
                disabled={readOnly}
                onChange={(e) => setTeam(e.target.value as TaskTeam | "")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Pilih tim</option>
                {TEAM_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {task && boards.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Board
              </label>
              <select
                value={boardId}
                disabled={readOnly}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              {!readOnly && boardId !== task.board_id && (
                <p className="mt-1 text-[11px] text-amber-600">
                  Task akan dipindahkan ke board ini setelah disimpan.
                </p>
              )}
            </div>
          )}

          {readOnly ? (
            <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-400">
              Kamu cuma bisa lihat & komentar di task ini. Untuk mengubahnya, minta
              anggota tim yang mengerjakan.
            </p>
          ) : (
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
          )}
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
