import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Code2,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { KanyoLogo } from "@/components/kanyo-logo";
import { PageLoadingState } from "@/components/loading-state";
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

  // Sign-in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Sign-up only fields
  const [name, setName] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setCheckingSession(false);
      return;
    }
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) void navigate({ to: redirect ?? "/dashboard" });
      })
      .finally(() => {
        if (!cancelled) setCheckingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, redirect]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error("Sign in failed", { description: error.message });
        return;
      }
      toast.success("Welcome back!");
      void navigate({ to: redirect ?? "/dashboard" });
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured");
      return;
    }
    if (!name.trim()) {
      toast.error("Enter your name");
      return;
    }
    if (password !== confirmPw) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        toast.error(json.error || "Sign up failed");
        return;
      }
      // Auto sign-in after account creation
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        toast.success("Account created — please sign in.");
        return;
      }
      toast.success(`Welcome, ${name.trim().split(" ")[0]}!`);
      void navigate({ to: redirect ?? "/dashboard" });
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return (
      <PageLoadingState
        title="Checking your session"
        body="Loading your account before opening kanyoai."
      />
    );
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1fr_0.9fr]">
      {/* Left panel */}
      <section className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(37,99,235,.4),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(29,78,216,.25),transparent_50%),linear-gradient(135deg,#060d1f_0%,#0f1f3d_60%,#060d1f_100%)]" />

        {/* Grid decoration */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 font-display text-base font-semibold"
          >
            <KanyoLogo markClassName="bg-white/10 text-white border border-white/20 shadow-none" />
          </Link>

          <div className="max-w-lg">
            <p className="font-mono text-xs uppercase tracking-widest text-blue-400/80">
              Your creative workspace
            </p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-tight">
              Build websites.
              <br />
              Save everything.
              <br />
              <span className="text-blue-400">Ship fast.</span>
            </h1>
            <p className="mt-5 text-base leading-7 text-white/60">
              Sign in to save AI-generated websites, manage your image library, and pick up any
              project right where you left off.
            </p>

            <div className="mt-9 space-y-3">
              {[
                { icon: Sparkles, text: "AI website generator with 8 visual styles" },
                { icon: Code2, text: "Live code playground — HTML, CSS, JS" },
                { icon: Download, text: "Export clean ZIP — no proprietary runtime" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/20 ring-1 ring-blue-500/30">
                    <Icon className="h-3.5 w-3.5 text-blue-400" />
                  </span>
                  <span className="text-sm text-white/70">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/25 font-mono">
            &copy; {new Date().getFullYear()} kanyoai
          </p>
        </div>
      </section>

      {/* Right panel */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to kanyoai
          </Link>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Welcome to kanyoai
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Sign in or create an account to save and sync your projects.
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
                Supabase env vars missing — sign-in is disabled. Add the variables from{" "}
                <code className="rounded bg-muted px-1 font-mono text-xs">.env.example</code> to
                enable auth.
              </div>
            )}

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              {/* ── Sign in ── */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@studio.com"
                      autoComplete="email"
                      className="pl-9"
                      disabled={busy || !isSupabaseConfigured}
                    />
                  </Field>

                  <Field
                    label="Password"
                    icon={<Lock className="h-4 w-4" />}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="text-muted-foreground transition-colors hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  >
                    <Input
                      type={showPw ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pl-9 pr-9"
                      disabled={busy || !isSupabaseConfigured}
                    />
                  </Field>

                  <Button type="submit" disabled={busy || !isSupabaseConfigured} className="w-full">
                    {busy ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Create account ── */}
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Field label="Full name" icon={<User className="h-4 w-4" />}>
                    <Input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      className="pl-9"
                      disabled={busy || !isSupabaseConfigured}
                    />
                  </Field>

                  <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@studio.com"
                      autoComplete="email"
                      className="pl-9"
                      disabled={busy || !isSupabaseConfigured}
                    />
                  </Field>

                  <Field
                    label="Password"
                    icon={<Lock className="h-4 w-4" />}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="text-muted-foreground transition-colors hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  >
                    <Input
                      type={showPw ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pl-9 pr-9"
                      disabled={busy || !isSupabaseConfigured}
                    />
                  </Field>
                  <p className="flex items-center gap-1 -mt-2 text-[11px] text-muted-foreground">
                    <Check className="h-3 w-3 text-green-500" /> Minimum 6 characters
                  </p>

                  <Field
                    label="Confirm password"
                    icon={<Lock className="h-4 w-4" />}
                    action={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="text-muted-foreground transition-colors hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showConfirmPw ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                  >
                    <Input
                      type={showConfirmPw ? "text" : "password"}
                      required
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      autoComplete="new-password"
                      className="pl-9 pr-9"
                      disabled={busy || !isSupabaseConfigured}
                    />
                  </Field>
                  {confirmPw && password !== confirmPw && (
                    <p className="text-[11px] text-destructive -mt-2">Passwords do not match</p>
                  )}
                  {confirmPw && password === confirmPw && password.length >= 6 && (
                    <p className="flex items-center gap-1 -mt-2 text-[11px] text-green-500">
                      <Check className="h-3 w-3" /> Passwords match
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      busy || !isSupabaseConfigured || (!!confirmPw && password !== confirmPw)
                    }
                    className="w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-5 text-center text-xs text-muted-foreground">
              Sign in to use the{" "}
              <Link to="/playground" className="text-primary hover:underline">
                Playground
              </Link>{" "}
              and keep your work synced.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  icon,
  children,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        {children}
        {action}
      </div>
    </div>
  );
}
