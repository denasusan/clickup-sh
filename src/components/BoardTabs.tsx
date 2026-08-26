"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, X } from "lucide-react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import type { Board } from "@/types/database";

function SortableBoardTab({
  board,
  workspaceId,
  active,
  onRequestDelete,
}: {
  board: Board;
  workspaceId: string;
  active: boolean;
  onRequestDelete: (board: Board) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Link
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      href={`/board/${workspaceId}/${board.id}`}
      onClick={(e) => {
        if (isDragging) e.preventDefault();
      }}
      className={clsx(
        "group flex cursor-grab select-none items-center gap-1 rounded-lg pl-3 pr-1.5 py-1.5 text-xs font-medium transition active:cursor-grabbing",
        isDragging && "opacity-50",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      )}
    >
      {board.name}
      <button
        type="button"
        aria-label={`Hapus board ${board.name}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRequestDelete(board);
        }}
        className="rounded p-0.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={12} />
      </button>
    </Link>
  );
}

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
  const [orderedBoards, setOrderedBoards] = useState(boards);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setOrderedBoards(boards);
  }, [boards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedBoards.findIndex((b) => b.id === active.id);
    const newIndex = orderedBoards.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedBoards, oldIndex, newIndex).map((b, index) => ({
      ...b,
      position: index,
    }));
    setOrderedBoards(reordered);

    await Promise.all(
      reordered.map((b) => supabase.from("boards").update({ position: b.position }).eq("id", b.id))
    );
    router.refresh();
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const maxPosition = orderedBoards.reduce((max, b) => Math.max(max, b.position), -1);

    const { data, error } = await supabase
      .from("boards")
      .insert({ name: name.trim(), workspace_id: workspaceId, created_by: user?.id, position: maxPosition + 1 })
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

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase.from("boards").delete().eq("id", deleteTarget.id);

    setDeleting(false);
    if (error) return;

    const remaining = orderedBoards.filter((b) => b.id !== deleteTarget.id);
    setOrderedBoards(remaining);
    setDeleteTarget(null);

    if (deleteTarget.id === activeBoardId) {
      if (remaining.length > 0) {
        router.push(`/board/${workspaceId}/${remaining[0].id}`);
      } else {
        router.push(`/board/${workspaceId}`);
      }
    }
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-gray-200 bg-white px-6 py-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedBoards.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap items-center gap-1.5">
            {orderedBoards.map((b) => (
              <SortableBoardTab
                key={b.id}
                board={b}
                workspaceId={workspaceId}
                active={b.id === activeBoardId}
                onRequestDelete={setDeleteTarget}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100"
        >
          <Plus size={13} />
          Board
        </button>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-lg font-semibold text-gray-800">Hapus board?</h2>
            <p className="mb-4 text-sm text-gray-500">
              Board <span className="font-medium text-gray-700">&quot;{deleteTarget.name}&quot;</span>{" "}
              dan semua task di dalamnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Menghapus..." : "Hapus board"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
