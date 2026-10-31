import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Greenfield Academy" },
      { name: "description", content: "Choose a new password for your Greenfield Academy account." },
      { property: "og:title", content: "Set a new password — Greenfield Academy" },
      { property: "og:description", content: "Choose a new password for your Greenfield Academy account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isRecovery, setIsRecovery] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    setIsRecovery(hash.get("type") === "recovery");
    setChecked(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated — you're signed in.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">Greenfield Academy</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Card className="border-border/60 card-shadow">
          <CardHeader>
            <CardTitle className="text-2xl">Set a new password</CardTitle>
            {!checked ? null : isRecovery ? (
              <CardDescription>Choose a new password for your account.</CardDescription>
            ) : (
              <CardDescription>
                This link isn't a password-reset link. Request a new one from the sign-in page.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {checked && isRecovery ? (
              <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} Update password
                </Button>
              </form>
            ) : (
              checked && (
                <Button asChild className="w-full">
                  <Link to="/auth" search={{ mode: "signin" }}>Back to sign in</Link>
                </Button>
              )
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
