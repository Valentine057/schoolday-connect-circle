import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowRight,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const getSchoolIdentity = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!; // read inside the handler, never at module scope
  const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    // Opaque sb_ keys aren't JWTs; send only apikey, not the default Authorization bearer.
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await supabasePublic
    .from("school_settings")
    .select("school_name, motto, current_session, current_term")
    .eq("id", 1)
    .maybeSingle();
  return data ?? { school_name: "Greenfield Academy", motto: "Knowledge · Character · Service", current_session: "2025/2026", current_term: "First Term" };
});

export const Route = createFileRoute("/")({
  loader: () => getSchoolIdentity(),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.school_name ?? "Greenfield Academy"} — Student Portal`,
      },
      {
        name: "description",
        content: `Register, learn and track results at ${loaderData?.school_name ?? "Greenfield Academy"}. Courses, assignments, exams, results and school fees in one portal.`,
      },
      { property: "og:title", content: `${loaderData?.school_name ?? "Greenfield Academy"} — Student Portal` },
      {
        property: "og:description",
        content: `Courses, assignments, exams, results and school fees in one portal.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { icon: GraduationCap, title: "Student Dashboard", phase: "Phase 1", ready: true },
  { icon: Users, title: "Staff Portal", phase: "Phase 2", ready: false },
  { icon: ShieldCheck, title: "Admin Portal", phase: "Phase 2", ready: false },
  { icon: BookOpen, title: "Courses & Classes", phase: "Phase 2", ready: false },
  { icon: ClipboardList, title: "Assignments", phase: "Phase 3", ready: false },
  { icon: CalendarCheck, title: "Attendance", phase: "Phase 3", ready: false },
  { icon: Library, title: "Library", phase: "Phase 3", ready: false },
  { icon: MonitorCheck, title: "Exams & CBT", phase: "Phase 4", ready: false },
  { icon: Award, title: "Results Portal", phase: "Phase 4", ready: false },
  { icon: Wallet, title: "School Fees Payment", phase: "Phase 5", ready: false },
  { icon: Bell, title: "Notifications", phase: "Phase 5", ready: false },
  { icon: HeartHandshake, title: "Parent Portal", phase: "Phase 5", ready: false },
];

function Landing() {
  const school = Route.useLoaderData();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSignedIn(!!session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">{school.school_name}</span>
          </Link>
          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth" search={{ mode: "signup" }}>Register</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <Badge variant="outline" className="mb-4 border-gold/60 text-gold-foreground">
              {school.current_session} · {school.current_term}
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              One portal for your whole school journey.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">
              Register as a student, sign in securely, and watch the campus grow — courses,
              assignments, exams, results, fees and more, built phase by phase.
            </p>
            <p className="mt-2 font-display text-base italic text-primary">{school.motto}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Apply as a student <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/60 card-shadow">
            <img
              src={heroImg}
              alt="Students walking toward the school building"
              width={1024}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section className="border-t border-border/60 bg-secondary/40 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold">What's inside</h2>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Fourteen modules, built in six phases so the platform stays fast and reliable as it scales.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {MODULES.map(({ icon: Icon, title, phase, ready }) => (
                <Card key={title} className="border-border/60 card-shadow">
                  <CardContent className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{title}</p>
                      <Badge
                        variant={ready ? "default" : "secondary"}
                        className="mt-1.5"
                      >
                        {ready ? "Live now" : `Coming — ${phase}`}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} {school.school_name}</p>
          <p className="font-display italic">{school.motto}</p>
        </div>
      </footer>
    </div>
  );
}
