import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateBoardPrompt from "@/components/CreateBoardPrompt";
import type { Board, Workspace } from "@/types/database";

export default async function WorkspaceBoardsPage({
  params,
}: {
  params: { workspaceId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", params.workspaceId)
    .returns<Workspace[]>()
    .maybeSingle();

  if (!workspace) {
    notFound();
  }

  const { data: boards } = await supabase
    .from("boards")
    .select("*")
    .eq("workspace_id", params.workspaceId)
    .order("position", { ascending: true })
    .returns<Board[]>();

  if (boards && boards.length > 0) {
    redirect(`/board/${params.workspaceId}/${boards[0].id}`);
  }

  return <CreateBoardPrompt workspaceId={params.workspaceId} workspaceName={workspace.name} />;
}
