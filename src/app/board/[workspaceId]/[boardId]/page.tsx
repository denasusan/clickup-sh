import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import type { Board as BoardType, Profile, Task, Workspace, WorkspaceRole } from "@/types/database";

export default async function BoardPage({
  params,
}: {
  params: { workspaceId: string; boardId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: workspace }, { data: board }] = await Promise.all([
    supabase
      .from("workspaces")
      .select("*")
      .eq("id", params.workspaceId)
      .returns<Workspace[]>()
      .maybeSingle(),
    supabase
      .from("boards")
      .select("*")
      .eq("id", params.boardId)
      .eq("workspace_id", params.workspaceId)
      .returns<BoardType[]>()
      .maybeSingle(),
  ]);

  if (!workspace || !board) {
    notFound();
  }

  const [
    { data: myWorkspaces },
    { data: boards },
    { data: memberRows },
    { data: tasks },
    { data: myMembership },
  ] = await Promise.all([
    supabase
      .from("workspace_members")
      .select("workspace_id, workspaces(id, name, created_by, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { referencedTable: "workspaces", ascending: true })
      .returns<{ workspace_id: string; workspaces: Workspace | null }[]>(),
    supabase
      .from("boards")
      .select("*")
      .eq("workspace_id", params.workspaceId)
      .order("position", { ascending: true })
      .returns<BoardType[]>(),
    supabase
      .from("workspace_members")
      .select("workspace_id, role, profiles(id, email, full_name, avatar_url, created_at)")
      .eq("workspace_id", params.workspaceId)
      .returns<{ workspace_id: string; role: WorkspaceRole; profiles: Profile | null }[]>(),
    supabase
      .from("tasks")
      .select("*")
      .eq("board_id", params.boardId)
      .order("position", { ascending: true })
      .returns<Task[]>(),
    supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", params.workspaceId)
      .eq("user_id", user.id)
      .returns<{ role: WorkspaceRole }[]>()
      .maybeSingle(),
  ]);

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .returns<Profile[]>()
    .single();

  const workspaces = (myWorkspaces ?? [])
    .map((m) => m.workspaces)
    .filter((w): w is Workspace => Boolean(w));

  const members = (memberRows ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({ profile: m.profiles as Profile, role: m.role }));

  return (
    <Board
      workspace={workspace}
      workspaces={workspaces}
      board={board}
      boards={boards ?? []}
      members={members}
      myRole={myMembership?.role ?? "member"}
      initialTasks={tasks ?? []}
      currentUser={{
        id: user.id,
        email: user.email ?? "",
        full_name: currentProfile?.full_name ?? null,
        avatar_url: currentProfile?.avatar_url ?? null,
      }}
    />
  );
}
