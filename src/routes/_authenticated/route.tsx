import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Integration-managed auth gate: the whole _authenticated subtree is signed-in
// only. Client-only (ssr: false) because the session lives in localStorage.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: () => <Outlet />,
});
