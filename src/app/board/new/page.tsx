import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WorkspaceOnboarding from "@/components/WorkspaceOnboarding";

export default async function NewWorkspacePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <WorkspaceOnboarding />;
}
