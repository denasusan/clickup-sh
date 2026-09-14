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
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import type {
  Board as BoardType,
  Profile,
  Task,
  TaskPriority,
  TaskStatus,
  Workspace,
  WorkspaceRole,
} from "@/types/database";
import Header from "./Header";
import BoardTabs from "./BoardTabs";
import Column from "./Column";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import RequestTaskModal from "./RequestTaskModal";
import TeamDashboard from "./TeamDashboard";
import ImportTasksModal from "./ImportTasksModal";
import TeamSummarySidebar from "./TeamSummarySidebar";
import CalendarView from "./CalendarView";

const COLUMNS: { id: TaskStatus; title: string; accent: string }[] = [
  { id: "todo", title: "Belum Dikerjakan", accent: "bg-gray-400" },
  { id: "in_progress", title: "Sedang Dikerjakan", accent: "bg-amber-400" },
  { id: "done", title: "Selesai", accent: "bg-emerald-500" },
  { id: "cancelled", title: "Dibatalkan", accent: "bg-red-400" },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Rendah",
  medium: "Sedang",
  high: "Tinggi",
  urgent: "Mendesak",
};

interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function Board({
  workspace,
  workspaces,
  board,
  boards,
  members,
  myRole,
  initialTasks,
  currentUser,
}: {
  workspace: Workspace;
  workspaces: Workspace[];
  board: BoardType;
  boards: BoardType[];
  members: { profile: Profile; role: WorkspaceRole }[];
  myRole: WorkspaceRole;
  initialTasks: Task[];
  currentUser: CurrentUser;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [showDashboard, setShowDashboard] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRequestTask, setShowRequestTask] = useState(false);
  const [modalState, setModalState] = useState<{
    open: boolean;
    task: Task | null;
    defaultStatus: TaskStatus;
  }>({ open: false, task: null, defaultStatus: "todo" });

  const profiles = useMemo(() => members.map((m) => m.profile), [members]);
  const canEdit = myRole !== "requester";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const profilesById = useMemo(() => {
    const map: Record<string, Profile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks, board.id]);

  // --- Realtime: dengar perubahan task di board ini dari anggota tim lain ---
  useEffect(() => {
    const channel = supabase
      .channel(`tasks-realtime-${board.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `board_id=eq.${board.id}` },
        (payload) => {
          setTasks((current) => {
            if (payload.eventType === "INSERT") {
              const newTask = payload.new as Task;
              if (current.some((t) => t.id === newTask.id)) return current;
              // Payload realtime tabel tasks tidak bawa daftar assignee;
              // seed dari assignee utama, sisanya menyusul dari channel
              // task_assignees.
              return [
                ...current,
                { ...newTask, assignee_ids: newTask.assignee_id ? [newTask.assignee_id] : [] },
              ];
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Task;
              return current.map((t) =>
                t.id === updated.id
                  ? { ...updated, assignee_ids: t.assignee_ids ?? (updated.assignee_id ? [updated.assignee_id] : []) }
                  : t
              );
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
  }, [supabase, board.id]);

  // --- Realtime: perubahan daftar assignee (many-to-many) ---
  useEffect(() => {
    const channel = supabase
      .channel(`task-assignees-realtime-${board.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_assignees" },
        (payload) => {
          const row = payload.new as { task_id: string; user_id: string };
          setTasks((current) =>
            current.map((t) => {
              if (t.id !== row.task_id) return t;
              const ids = t.assignee_ids ?? (t.assignee_id ? [t.assignee_id] : []);
              if (ids.includes(row.user_id)) return t;
              const next = [...ids, row.user_id];
              return { ...t, assignee_ids: next, assignee_id: t.assignee_id ?? next[0] };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "task_assignees" },
        (payload) => {
          const row = payload.old as { task_id: string; user_id: string };
          setTasks((current) =>
            current.map((t) => {
              if (t.id !== row.task_id) return t;
              const next = (t.assignee_ids ?? (t.assignee_id ? [t.assignee_id] : [])).filter(
                (id) => id !== row.user_id
              );
              return { ...t, assignee_ids: next, assignee_id: next[0] ?? null };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, board.id]);

  // --- Jumlah komentar per task, dipakai untuk badge di kartu ---
  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length === 0) {
        if (!cancelled) setCommentCounts({});
        return;
      }
      const { data } = await supabase
        .from("task_comments")
        .select("task_id")
        .in("task_id", taskIds)
        .returns<{ task_id: string }[]>();
      if (cancelled || !data) return;
      const counts: Record<string, number> = {};
      for (const row of data) counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
      setCommentCounts(counts);
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [supabase, tasks.map((t) => t.id).join(",")]);

  useEffect(() => {
    const taskIds = new Set(tasks.map((t) => t.id));
    const channel = supabase
      .channel(`task-comments-counts-${board.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "task_comments" },
        (payload) => {
          const row = payload.new as { task_id: string };
          if (!taskIds.has(row.task_id)) return;
          setCommentCounts((current) => ({
            ...current,
            [row.task_id]: (current[row.task_id] ?? 0) + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "task_comments" },
        (payload) => {
          const row = payload.old as { task_id: string };
          if (!taskIds.has(row.task_id)) return;
          setCommentCounts((current) => ({
            ...current,
            [row.task_id]: Math.max(0, (current[row.task_id] ?? 1) - 1),
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, board.id, tasks.map((t) => t.id).join(",")]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks.filter((t) => {
      const matchSearch = !query || t.title.toLowerCase().includes(query);
      const ids = t.assignee_ids ?? (t.assignee_id ? [t.assignee_id] : []);
      const matchAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" ? ids.length === 0 : ids.includes(assigneeFilter));
      return matchSearch && matchAssignee;
    });
  }, [tasks, search, assigneeFilter]);

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [], cancelled: [] };
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
    if (!canEdit) {
      setShowRequestTask(true);
      return;
    }
    setModalState({ open: true, task: null, defaultStatus: status });
  }

  function openEditModal(task: Task) {
    setModalState({ open: true, task, defaultStatus: task.status });
  }

  function closeModal() {
    setModalState({ open: false, task: null, defaultStatus: "todo" });
  }

  // Selaraskan baris di task_assignees dengan daftar assignee terpilih.
  async function syncAssignees(taskId: string, prevIds: string[], nextIds: string[]) {
    const toAdd = nextIds.filter((id) => !prevIds.includes(id));
    const toRemove = prevIds.filter((id) => !nextIds.includes(id));
    await Promise.all([
      toAdd.length > 0
        ? supabase
            .from("task_assignees")
            .insert(toAdd.map((user_id) => ({ task_id: taskId, user_id })))
        : Promise.resolve(),
      toRemove.length > 0
        ? supabase
            .from("task_assignees")
            .delete()
            .eq("task_id", taskId)
            .in("user_id", toRemove)
        : Promise.resolve(),
    ]);
  }

  async function handleSaveTask(
    payload: Partial<Task> & { title: string; assignee_ids: string[] }
  ) {
    const { assignee_ids: nextAssigneeIds, ...taskFields } = payload;
    const primaryAssignee = nextAssigneeIds[0] ?? null;

    if (modalState.task) {
      const prevIds =
        modalState.task.assignee_ids ??
        (modalState.task.assignee_id ? [modalState.task.assignee_id] : []);
      const { data, error } = await supabase
        .from("tasks")
        .update({ ...taskFields, assignee_id: primaryAssignee })
        .eq("id", modalState.task.id)
        .select()
        .returns<Task[]>()
        .single();
      if (!error && data) {
        await syncAssignees(data.id, prevIds, nextAssigneeIds);
        const enriched = { ...data, assignee_ids: nextAssigneeIds };
        setTasks((current) =>
          data.board_id !== board.id
            ? current.filter((t) => t.id !== data.id)
            : current.map((t) => (t.id === data.id ? enriched : t))
        );
      }
    } else {
      const status = (taskFields.status as TaskStatus) ?? modalState.defaultStatus;
      const columnItems = tasks.filter((t) => t.status === status);
      // Task baru ditaruh di paling atas kolom (position terkecil).
      const minPosition = columnItems.reduce((min, t) => Math.min(min, t.position), 1);
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          ...taskFields,
          assignee_id: primaryAssignee,
          status,
          board_id: board.id,
          position: minPosition - 1,
          created_by: currentUser.id,
        })
        .select()
        .returns<Task[]>()
        .single();
      if (!error && data) {
        await syncAssignees(data.id, [], nextAssigneeIds);
        setTasks((current) => [...current, { ...data, assignee_ids: nextAssigneeIds }]);
      }
    }
    closeModal();
  }

  async function handleDeleteTask(id: string) {
    setTasks((current) => current.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
    closeModal();
  }

  function handleExportCsv() {
    const statusLabelByKey = Object.fromEntries(
      COLUMNS.map((c) => [c.id, c.title])
    ) as Record<TaskStatus, string>;

    const rows = tasks
      .slice()
      .sort((a, b) => {
        const statusDiff = COLUMNS.findIndex((c) => c.id === a.status) - COLUMNS.findIndex((c) => c.id === b.status);
        return statusDiff !== 0 ? statusDiff : a.position - b.position;
      })
      .map((t) => {
        const assignees = (t.assignee_ids ?? (t.assignee_id ? [t.assignee_id] : []))
          .map((id) => profilesById[id])
          .filter((p): p is Profile => Boolean(p));
        const creator = t.created_by ? profilesById[t.created_by] : null;
        return {
          judul: t.title,
          deskripsi: t.description ?? "",
          status: statusLabelByKey[t.status],
          prioritas: PRIORITY_LABEL[t.priority],
          ditugaskan_ke: assignees.map((a) => a.full_name ?? a.email ?? "").join(", "),
          email_assignee: assignees.map((a) => a.email).filter(Boolean).join(", "),
          tenggat: t.due_date ?? "",
          dibuat_oleh: creator?.full_name ?? creator?.email ?? "",
          dibuat_pada: new Date(t.created_at).toLocaleString("id-ID"),
          diperbarui_pada: new Date(t.updated_at).toLocaleString("id-ID"),
        };
      });

    // Titik-koma, bukan koma - default pemisah CSV di Excel lokal Indonesia/Eropa,
    // supaya kolom kebaca kesebar (bukan numpuk jadi satu) waktu file dibuka.
    const csv = Papa.unparse(rows, { delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.download = `${board.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tasks-${dateStamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen flex-col bg-[#f4f5fb]">
      <Header
        currentUser={currentUser}
        workspace={workspace}
        workspaces={workspaces}
        members={members}
        myRole={myRole}
        search={search}
        onSearchChange={setSearch}
        assigneeFilter={assigneeFilter}
        onAssigneeFilterChange={setAssigneeFilter}
        onOpenDashboard={() => setShowDashboard(true)}
        onOpenImport={() => setShowImport(true)}
        onExport={handleExportCsv}
        onOpenCalendar={() => setShowCalendar(true)}
        onOpenRequestTask={() => setShowRequestTask(true)}
        canEdit={canEdit}
      />

      <BoardTabs workspaceId={workspace.id} boards={boards} activeBoardId={board.id} canEdit={canEdit} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={canEdit ? handleDragStart : undefined}
        onDragOver={canEdit ? handleDragOver : undefined}
        onDragEnd={canEdit ? handleDragEnd : undefined}
      >
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 gap-3 overflow-x-auto p-3 sm:gap-4 sm:p-6">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                id={col.id}
                title={col.title}
                tasks={grouped[col.id]}
                profilesById={profilesById}
                commentCounts={commentCounts}
                onAddTask={() => openCreateModal(col.id)}
                onTaskClick={openEditModal}
                accentClassName={col.accent}
                canEdit={canEdit}
                canAddTask={col.id !== "cancelled"}
              />
            ))}
          </div>

          <TeamSummarySidebar
            tasks={tasks}
            members={members}
            assigneeFilter={assigneeFilter}
            onSelectAssignee={setAssigneeFilter}
          />
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-80 rotate-2">
              <TaskCard
                task={activeTask}
                assignees={(activeTask.assignee_ids ?? (activeTask.assignee_id ? [activeTask.assignee_id] : []))
                  .map((id) => profilesById[id])
                  .filter((p): p is Profile => Boolean(p))}
                commentCount={commentCounts[activeTask.id] ?? 0}
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
          currentUser={currentUser}
          boards={boards}
          currentBoardId={board.id}
          onClose={closeModal}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
          readOnly={!canEdit}
        />
      )}

      {showDashboard && (
        <TeamDashboard
          board={board}
          tasks={tasks}
          members={members}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {showImport && (
        <ImportTasksModal
          boardId={board.id}
          tasks={tasks}
          members={members}
          onClose={() => setShowImport(false)}
          onImported={(imported, replacedExisting) => {
            setTasks((current) => {
              if (replacedExisting) return imported;
              const existingIds = new Set(current.map((t) => t.id));
              const merged = [...current];
              for (const t of imported) if (!existingIds.has(t.id)) merged.push(t);
              return merged;
            });
          }}
        />
      )}

      {showRequestTask && (
        <RequestTaskModal
          boards={boards}
          defaultBoardId={board.id}
          currentUserId={currentUser.id}
          onClose={() => setShowRequestTask(false)}
          onCreated={(created) => {
            if (created.board_id === board.id) {
              setTasks((current) => [...current, { ...created, assignee_ids: [] }]);
            }
          }}
        />
      )}

      {showCalendar && (
        <CalendarView
          tasks={tasks}
          profilesById={profilesById}
          onTaskClick={(task) => {
            setShowCalendar(false);
            openEditModal(task);
          }}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
