"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import clsx from "clsx";
import { Calendar } from "lucide-react";
import type { Profile, Task } from "@/types/database";

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

export default function TaskCard({
  task,
  assignee,
  onClick,
  dragging,
}: {
  task: Task;
  assignee: Profile | null;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { type: "task", status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue =
    task.due_date && task.status !== "done" && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={clsx(
        "cursor-grab select-none rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing",
        (isDragging || dragging) && "opacity-50"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">{task.title}</p>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            PRIORITY_STYLES[task.priority]
          )}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>
      </div>

      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs text-gray-500">{task.description}</p>
      )}

      <div className="flex items-center justify-between">
        {task.due_date ? (
          <span
            className={clsx(
              "flex items-center gap-1 text-[11px]",
              overdue ? "font-medium text-red-600" : "text-gray-400"
            )}
          >
            <Calendar size={12} />
            {format(new Date(task.due_date), "d MMM", { locale: idLocale })}
          </span>
        ) : (
          <span />
        )}

        {assignee && (
          <div
            title={assignee.full_name ?? assignee.email ?? ""}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700"
          >
            {initials(assignee.full_name ?? assignee.email ?? "?")}
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
