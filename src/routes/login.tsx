import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { KanyoLogo } from "@/components/kanyo-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

type Search = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in - kanyoai" },
      { name: "description", content: "Sign in to save and sync kanyoai projects." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: redirect ?? "/dashboard" });
    });
  }, [navigate, redirect]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      return;
    }
    toast.success("Welcome back");
    navigate({ to: redirect ?? "/dashboard" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setBusy(false);
    if (error) {
      toast.error("Sign up failed", { description: error.message });
      return;
    }
    toast.success("Account created", { description: "Check your inbox to confirm your email." });
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.92fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(37,99,235,.35),transparent_60%),linear-gradient(135deg,#0f172a_0%,#1e2a45_50%,#0f172a_100%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 font-display text-base font-semibold"
          >
            <KanyoLogo markClassName="bg-white text-primary shadow-none" />
          </Link>
          <div className="max-w-lg">
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">
              Project sync
            </p>
            <h1 className="mt-3 font-display text-5xl font-semibold leading-tight">
              Save your projects and keep building later.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/72">
              Sign in to store your AI-generated websites, images, and settings in your account.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to kanyoai
          </Link>

          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h1 className="font-display text-2xl font-semibold">Save and sync your work</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use an account to save AI projects, store images, and sync your settings. You can
              still use the Playground without signing in.
            </p>

            {!isSupabaseConfigured ? (
              <div className="mt-5 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                Supabase environment variables are missing. Public pages still work, but sign-in,
                project saving, and AI generation need the Vercel variables from `.env.example`.
              </div>
            ) : null}

            <Tabs defaultValue="signin" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-5">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <AuthFields
                    email={email}
                    password={password}
                    setEmail={setEmail}
                    setPassword={setPassword}
                    mode="signin"
                  />
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-5">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <AuthFields
                    email={email}
                    password={password}
                    setEmail={setEmail}
                    setPassword={setPassword}
                    mode="signup"
                  />
                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? "Creating..." : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthFields({
  email,
  password,
  setEmail,
  setPassword,
  mode,
}: {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  mode: "signin" | "signup";
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">Email</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@studio.com"
            autoComplete="email"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="password"
            required
            minLength={mode === "signup" ? 6 : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="pl-9"
          />
        </div>
        {mode === "signup" ? (
          <p className="text-[11px] text-muted-foreground">Use at least 6 characters.</p>
        ) : null}
      </div>
    </>
  );
}
