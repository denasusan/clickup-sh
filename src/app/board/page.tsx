import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceOnboarding from "@/components/WorkspaceOnboarding";
import type { Workspace } from "@/types/database";

export default async function BoardIndexPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(id, name, created_by, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { referencedTable: "workspaces", ascending: true })
    .returns<{ workspace_id: string; workspaces: Workspace | null }[]>();

  const workspaces = (memberships ?? [])
    .map((m) => m.workspaces)
    .filter((w): w is Workspace => Boolean(w));

  if (workspaces.length > 0) {
    redirect(`/board/${workspaces[0].id}`);
  }

  return <WorkspaceOnboarding />;
}
