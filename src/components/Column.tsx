"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Profile, Task, TaskStatus } from "@/types/database";
import TaskCard from "./TaskCard";

const PAGE_SIZE = 30;

export default function Column({
  id,
  title,
  tasks,
  profilesById,
  commentCounts,
  onAddTask,
  onTaskClick,
  accentClassName,
  canEdit,
  canAddTask = true,
}: {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  profilesById: Record<string, Profile>;
  commentCounts: Record<string, number>;
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
  accentClassName: string;
  canEdit: boolean;
  canAddTask?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Kalau user sudah lihat semua task yang ada, task baru (mis. hasil Request Task)
  // tetap langsung kelihatan tanpa perlu klik "Muat lainnya".
  useEffect(() => {
    setVisibleCount((v) => (v >= tasks.length - 1 ? tasks.length : v));
  }, [tasks.length]);

  const visibleTasks = tasks.slice(0, visibleCount);
  const remaining = tasks.length - visibleTasks.length;

  return (
    <div className="flex w-[85vw] max-w-80 shrink-0 flex-col rounded-2xl bg-gray-100/70 p-3 sm:w-80">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accentClassName}`} />
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-xs text-gray-400">
            {tasks.length}
          </span>
        </div>
        {canAddTask && (
          <button
            onClick={onAddTask}
            className="rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-brand-600"
            aria-label={`Tambah task di ${title}`}
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-1 transition scrollbar-thin ${
          isOver ? "bg-brand-50" : ""
        }`}
      >
        <SortableContext items={visibleTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assignees={(task.assignee_ids ?? (task.assignee_id ? [task.assignee_id] : []))
                .map((assigneeId) => profilesById[assigneeId])
                .filter((p): p is Profile => Boolean(p))}
              commentCount={commentCounts[task.id] ?? 0}
              onClick={() => onTaskClick(task)}
              draggable={canEdit}
            />
          ))}
        </SortableContext>

        {remaining > 0 && (
          <button
            onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
            className="rounded-lg py-2 text-xs font-medium text-gray-500 transition hover:bg-white hover:text-brand-600"
          >
            Muat {Math.min(remaining, PAGE_SIZE)} task lainnya ({remaining} tersisa)
          </button>
        )}

        {tasks.length === 0 &&
          (canAddTask ? (
            <button
              onClick={onAddTask}
              className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-6 text-xs text-gray-400 transition hover:border-brand-300 hover:text-brand-500"
            >
              + Tambah task
            </button>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-6 text-xs text-gray-300">
              Belum ada task
            </div>
          ))}
      </div>
    </div>
  );
}
