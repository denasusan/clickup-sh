"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Profile, Task, TaskStatus } from "@/types/database";
import TaskCard from "./TaskCard";

export default function Column({
  id,
  title,
  tasks,
  profilesById,
  commentCounts,
  onAddTask,
  onTaskClick,
  accentClassName,
}: {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  profilesById: Record<string, Profile>;
  commentCounts: Record<string, number>;
  onAddTask: () => void;
  onTaskClick: (task: Task) => void;
  accentClassName: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-80 shrink-0 flex-col rounded-2xl bg-gray-100/70 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${accentClassName}`} />
          <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
          <span className="rounded-full bg-white px-1.5 py-0.5 text-xs text-gray-400">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="rounded-md p-1 text-gray-400 transition hover:bg-white hover:text-brand-600"
          aria-label={`Tambah task di ${title}`}
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto rounded-xl p-1 transition scrollbar-thin ${
          isOver ? "bg-brand-50" : ""
        }`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assignee={task.assignee_id ? profilesById[task.assignee_id] ?? null : null}
              commentCount={commentCounts[task.id] ?? 0}
              onClick={() => onTaskClick(task)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <button
            onClick={onAddTask}
            className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-6 text-xs text-gray-400 transition hover:border-brand-300 hover:text-brand-500"
          >
            + Tambah task
          </button>
        )}
      </div>
    </div>
  );
}
