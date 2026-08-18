"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Task, TaskStatus } from "@/types/database";
import Header from "./Header";
import Column from "./Column";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";

const COLUMNS: { id: TaskStatus; title: string; accent: string }[] = [
  { id: "todo", title: "Belum Dikerjakan", accent: "bg-gray-400" },
  { id: "in_progress", title: "Sedang Dikerjakan", accent: "bg-amber-400" },
  { id: "done", title: "Selesai", accent: "bg-emerald-500" },
];

interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Board({
  initialTasks,
  profiles,
  currentUser,
}: {
  initialTasks: Task[];
  profiles: Profile[];
  currentUser: CurrentUser;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [modalState, setModalState] = useState<{
    open: boolean;
    task: Task | null;
    defaultStatus: TaskStatus;
  }>({ open: false, task: null, defaultStatus: "todo" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  // --- Realtime: dengar perubahan task dari anggota tim lain ---
  useEffect(() => {
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((current) => {
            if (payload.eventType === "INSERT") {
              const newTask = payload.new as Task;
              if (current.some((t) => t.id === newTask.id)) return current;
              return [...current, newTask];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Task;
              return current.map((t) => (t.id === updated.id ? updated : t));
            }
            if (payload.eventType === "DELETE") {
              const oldTask = payload.old as { id: string };
              return current.filter((t) => t.id !== oldTask.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchSearch = !query || t.title.toLowerCase().includes(query);
      const matchAssignee = assigneeFilter === "all" || t.assignee_id === assigneeFilter;
      return matchSearch && matchAssignee;
    });
  }, [tasks, search, assigneeFilter]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of filteredTasks) map[t.status].push(t);
    (Object.keys(map) as TaskStatus[]).forEach((key) => {
      map[key].sort((a, b) => a.position - b.position);
    });
    return map;
  }, [filteredTasks]);

  function findContainer(id: string): TaskStatus | undefined {
    const task = tasks.find((t) => t.id === id);
    if (task) return task.status;
    if (COLUMNS.some((c) => c.id === id)) return id as TaskStatus;
    return undefined;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setTasks((current) =>
      current.map((t) => (t.id === activeId ? { ...t, status: overContainer } : t))
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(overId);
    if (!container) return;

    const columnItems = tasks
      .filter((t) => t.status === container)
      .sort((a, b) => a.position - b.position);
    const otherItems = tasks.filter((t) => t.status !== container);

    const oldIndex = columnItems.findIndex((t) => t.id === activeId);
    if (oldIndex === -1) return;
    let newIndex = columnItems.findIndex((t) => t.id === overId);
    if (newIndex === -1) newIndex = columnItems.length - 1;

    const reordered = arrayMove(columnItems, oldIndex, newIndex).map((t, index) => ({
      ...t,
      position: index,
    }));

    setTasks([...otherItems, ...reordered]);

    await Promise.all(
      reordered.map((t) =>
        supabase.from("tasks").update({ status: t.status, position: t.position }).eq("id", t.id)
      )
    );
  }

  function openCreateModal(status: TaskStatus) {
    setModalState({ open: true, task: null, defaultStatus: status });
  }

  function openEditModal(task: Task) {
    setModalState({ open: true, task, defaultStatus: task.status });
  }

  function closeModal() {
    setModalState({ open: false, task: null, defaultStatus: "todo" });
  }

  async function handleSaveTask(payload: Partial<Task> & { title: string }) {
    if (modalState.task) {
      const { data, error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", modalState.task.id)
        .select()
        .single()
        .returns<Task>();
      if (!error && data) {
        setTasks((current) => current.map((t) => (t.id === data.id ? data : t)));
      }
    } else {
      const status = (payload.status as TaskStatus) ?? modalState.defaultStatus;
      const columnItems = tasks.filter((t) => t.status === status);
      const maxPosition = columnItems.reduce((max, t) => Math.max(max, t.position), -1);
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...payload,
          status,
          position: maxPosition + 1,
          created_by: currentUser.id,
        })
        .select()
        .single()
        .returns<Task>();
      if (!error && data) {
        setTasks((current) => [...current, data]);
      }
    }
    closeModal();
  }

  async function handleDeleteTask(id: string) {
    setTasks((current) => current.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
    closeModal();
  }

  return (
    <div className="flex h-screen flex-col bg-[#f4f5fb]">
      <Header
        currentUser={currentUser}
        profiles={profiles}
        search={search}
        onSearchChange={setSearch}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={grouped[col.id]}
              profilesById={profilesById}
              onAddTask={() => openCreateModal(col.id)}
              onTaskClick={openEditModal}
              accentClassName={col.accent}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-80 rotate-2">
              <TaskCard
                task={activeTask}
                assignee={activeTask.assignee_id ? profilesById[activeTask.assignee_id] ?? null : null}
                dragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalState.open && (
        <TaskModal
          task={modalState.task}
          defaultStatus={modalState.defaultStatus}
          profiles={profiles}
          onClose={closeModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
