import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Bootstrap: the very first signed-in user can claim the admin role while the
// school has no admin yet. Afterwards only an existing admin can promote users.
export const adminExists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error("Could not check admin status");
    return { exists: (count ?? 0) > 0 };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error("Could not verify admin status");
    if ((count ?? 0) > 0) {
      throw new Error("An admin account already exists. Ask the current admin to promote you.");
    }
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (insertError) throw new Error(insertError.message);
    return { ok: true };
  });
