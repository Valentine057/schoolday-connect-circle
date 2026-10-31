import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, MailCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search["mode"] === "signup" ? ("signup" as const) : ("signin" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or register — Greenfield Academy" },
      {
        name: "description",
        content: "Sign in to your student account or register as a new student of Greenfield Academy.",
      },
      { property: "og:title", content: "Sign in or register — Greenfield Academy" },
      { property: "og:description", content: "Sign in to your student account or register as a new student." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type ClassRow = { id: string; name: string };

function AuthPage() {
  const navigate = useNavigate();
  const { mode } = Route.useSearch();
  const navigateTo = Route.useNavigate();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "lovable" | null>(null);
  const [confirmationSent, setConfirmationSent] = useState<string | null>(null);

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration fields
  const [fullName, setFullName] = useState("");
  const [classRequested, setClassRequested] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    supabase
      .from("classes")
      .select("id, name")
      .order("name")
      .then(({ data }) => setClasses((data as ClassRow[]) ?? []));
  }, [navigate]);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          class_requested: classRequested,
          date_of_birth: dateOfBirth,
          gender,
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setConfirmationSent(email);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSocial(provider: "google" | "lovable") {
    setSocialLoading(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    setSocialLoading(null);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (result.redirected) return; // browser is heading to the provider
    navigate({ to: "/dashboard", replace: true });
  }

  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">Greenfield Academy</span>
          </Link>
          <Button
            variant="ghost"
            onClick={() => navigateTo({ to: "/auth", search: { mode: isSignup ? "signin" : "signup" } })}
          >
            {isSignup ? "Already a student? Sign in" : "New here? Register"}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        {confirmationSent ? (
          <Card className="border-border/60 card-shadow">
            <CardHeader className="items-center text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <MailCheck className="size-6" />
              </span>
              <CardTitle className="mt-3">Check your email</CardTitle>
              <CardDescription>
                We sent a confirmation link to <strong>{confirmationSent}</strong>. Click it to
                activate your account, then sign in.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setConfirmationSent(null)}>
                Back to sign in
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60 card-shadow">
            <CardHeader>
              <CardTitle className="text-2xl">
                {isSignup ? "Register as a student" : "Welcome back"}
              </CardTitle>
              <CardDescription>
                {isSignup
                  ? "Fill in your details to create your student account."
                  : "Sign in to continue to your dashboard."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" onClick={() => handleSocial("google")} disabled={socialLoading !== null}>
                  {socialLoading === "google" ? <Loader2 className="size-4 animate-spin" /> : "Google"}
                </Button>
                <Button type="button" variant="outline" onClick={() => handleSocial("lovable")} disabled={socialLoading !== null}>
                  {socialLoading === "lovable" ? <Loader2 className="size-4 animate-spin" /> : "Lovable"}
                </Button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or with email
                <span className="h-px flex-1 bg-border" />
              </div>

              {isSignup ? (
                <form className="space-y-3" onSubmit={handleSignUp}>
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amara Okonkwo" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="class">Class</Label>
                      <Select value={classRequested} onValueChange={setClassRequested} required>
                        <SelectTrigger id="class" className="w-full">
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dob">Date of birth</Label>
                      <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender" className="w-full">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="guardianName">Guardian name</Label>
                      <Input id="guardianName" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} placeholder="Parent or guardian" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guardianPhone">Guardian phone</Label>
                      <Input id="guardianPhone" type="tel" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} placeholder="+233 55 123 4567" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />} Create account
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    A confirmation email will be sent before your account is activated.
                  </p>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={handleSignIn}>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />} Sign in
                  </Button>
                  <div className="text-center">
                    <Link to="/reset-password" className="text-sm text-primary underline-offset-4 hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Trouble registering? Contact the school office at{" "}
          <Badge variant="secondary" className="font-normal">admissions@greenfield.edu</Badge>
        </p>
      </main>
    </div>
  );
}
