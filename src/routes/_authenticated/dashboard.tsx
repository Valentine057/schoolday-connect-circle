import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap,
  BookOpen,
  ClipboardList,
  MonitorCheck,
  Award,
  Wallet,
  Bell,
  CalendarCheck,
  Library,
  Users,
  HeartHandshake,
  ShieldCheck,
  LogOut,
  IdCard,
  School,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard — Greenfield Academy" },
      { name: "description", content: "Your student dashboard at Greenfield Academy." },
      { property: "og:title", content: "My dashboard — Greenfield Academy" },
      { property: "og:description", content: "Your student dashboard at Greenfield Academy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const MODULES = [
  { icon: BookOpen, title: "Courses & Classes", phase: "Phase 2" },
  { icon: Users, title: "Staff Portal", phase: "Phase 2" },
  { icon: ShieldCheck, title: "Admin Portal", phase: "Phase 2" },
  { icon: ClipboardList, title: "Assignments", phase: "Phase 3" },
  { icon: CalendarCheck, title: "Attendance", phase: "Phase 3" },
  { icon: Library, title: "Library", phase: "Phase 3" },
  { icon: MonitorCheck, title: "Exams & CBT", phase: "Phase 4" },
  { icon: Award, title: "Results Portal", phase: "Phase 4" },
  { icon: Wallet, title: "School Fees", phase: "Phase 5" },
  { icon: Bell, title: "Notifications", phase: "Phase 5" },
  { icon: HeartHandshake, title: "Parent Portal", phase: "Phase 5" },
];

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not signed in");
      const [profileRes, studentRes, rolesRes, settingsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("students").select("*, classes(name)").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("school_settings").select("school_name, motto, current_session, current_term").eq("id", 1).maybeSingle(),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (studentRes.error) throw studentRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (settingsRes.error) throw settingsRes.error;
      return {
        email: user.email ?? "",
        profile: profileRes.data,
        student: studentRes.data,
        roles: (rolesRes.data ?? []).map((r) => r.role),
        settings: settingsRes.data,
      };
    },
  });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true, search: { mode: "signin" } });
  }

  const school = me.data?.settings;
  const student = me.data?.student;
  const profile = me.data?.profile;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <div>
              <p className="font-display font-semibold leading-tight">
                {school?.school_name ?? "Greenfield Academy"}
              </p>
              <p className="text-xs text-sidebar-foreground/70">
                {school?.current_session ?? ""} · {school?.current_term ?? ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {me.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full rounded-2xl" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          </div>
        ) : me.isError ? (
          <Card className="border-border/60 card-shadow">
            <CardHeader>
              <CardTitle>Couldn't load your dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => me.refetch()}>Try again</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <h1 className="text-3xl font-semibold">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {school?.motto ?? ""} — signed in as {me.data?.email}
            </p>

            <Card className="mt-6 border-border/60 card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IdCard className="size-5 text-primary" /> Student record
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Admission number</p>
                  <p className="font-medium">{student?.admission_no ?? "Pending — assigned by the school office"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="font-medium">
                    {student?.classes?.name ?? student?.class_requested ?? "—"}
                    {student?.classes?.name ? "" : " (requested)"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary" className="capitalize">{student?.status ?? "—"}</Badge>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <School className="size-3.5" /> Guardian
                  </p>
                  <p className="font-medium">{student?.guardian_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Guardian phone</p>
                  <p className="font-medium">{student?.guardian_phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Roles</p>
                  <div className="flex flex-wrap gap-1">
                    {(me.data?.roles.length ? me.data.roles : ["student"]).map((r) => (
                      <Badge key={r} variant="outline" className="capitalize">{r}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <h2 className="mt-10 text-xl font-semibold">School life</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These modules open as each phase ships.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map(({ icon: Icon, title, phase }) => (
                <Card key={title} className="border-border/60 card-shadow opacity-80 transition-opacity hover:opacity-100">
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{title}</p>
                      <Badge variant="secondary" className="mt-1.5">Coming — {phase}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
