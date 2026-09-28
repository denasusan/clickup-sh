"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, isPast, isToday } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import clsx from "clsx";
import { Calendar, MessageSquare } from "lucide-react";
import type { Profile, Task } from "@/types/database";

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "bg-slate-800 text-slate-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-orange-500/15 text-orange-300",
  urgent: "bg-red-500/15 text-red-300",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

const TEAM_LABEL: Record<NonNullable<Task["team"]>, string> = {
  product: "Product",
  marketing: "Marketing",
  operasional: "Operasional",
  it: "IT",
  program: "Program",
};

export default function TaskCard({
  task,
  assignees,
  commentCount = 0,
  onClick,
  dragging,
  draggable = true,
}: {
  task: Task;
  assignees: Profile[];
  commentCount?: number;
  onClick?: () => void;
  dragging?: boolean;
  draggable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue =
    task.due_date &&
    task.status !== "done" &&
    task.status !== "cancelled" &&
    task.status !== "request" &&
    isPast(new Date(task.due_date)) &&
    !isToday(new Date(task.due_date));

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={onClick}
      className={clsx(
        "select-none rounded-xl border border-slate-800 bg-slate-900 p-3 transition hover:border-slate-700",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        (isDragging || dragging) && "opacity-50"
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p
          className={clsx(
            "min-w-0 flex-1 break-words text-sm font-medium text-slate-100",
            task.status === "cancelled" && "text-slate-500 line-through"
          )}
        >
          {task.title}
        </p>
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
        <p className="mb-2 line-clamp-2 break-words text-xs text-slate-400">{task.description}</p>
      )}

      {task.team && (
        <span className="mb-2 inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
          {TEAM_LABEL[task.team]}
        </span>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span
              className={clsx(
                "flex items-center gap-1 text-[11px]",
                overdue ? "font-medium text-red-400" : "text-slate-500"
              )}
            >
              <Calendar size={12} />
              {format(new Date(task.due_date), "d MMM", { locale: idLocale })}
            </span>
          )}
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <MessageSquare size={12} />
              {commentCount}
            </span>
          )}
        </div>

        {assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {assignees.slice(0, 3).map((a) => (
              <div
                key={a.id}
                title={a.full_name ?? a.email ?? ""}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-900 bg-brand-500/20 text-[10px] font-semibold text-brand-300"
              >
                {initials(a.full_name ?? a.email ?? "?")}
              </div>
            ))}
            {assignees.length > 3 && (
              <div
                title={assignees
                  .slice(3)
                  .map((a) => a.full_name ?? a.email)
                  .join(", ")}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-900 bg-slate-800 text-[10px] font-semibold text-slate-400"
              >
                +{assignees.length - 3}
              </div>
            )}
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
