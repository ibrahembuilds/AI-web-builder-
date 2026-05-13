import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

const AIPage = lazy(() => import("./-ai-page"));

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI website builder - kanyoai" },
      {
        name: "description",
        content:
          "A prompt-first AI website builder with guided steps, static HTML/CSS/JS output, edit chat, preview, save, and ZIP download.",
      },
    ],
  }),
  component: AIRoute,
});

function AIRoute() {
  const navigate = useNavigate();
  const { user, loading, isSupabaseConfigured } = useAuth();

  useEffect(() => {
    if (loading || user || !isSupabaseConfigured) return;
    navigate({
      to: "/login",
      search: { redirect: window.location.pathname + window.location.search },
      replace: true,
    });
  }, [isSupabaseConfigured, loading, navigate, user]);

  if (loading) {
    return (
      <AILoading
        title="Checking your session"
        body="Loading your account before opening the AI builder."
      />
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AILoading
        title="Authentication is not configured"
        body="Add the Supabase environment variables before using the AI builder."
        spinning={false}
      />
    );
  }

  if (!user) {
    return (
      <AILoading title="Redirecting to sign in" body="Sign in is required to use the AI builder." />
    );
  }

  return (
    <Suspense
      fallback={<AILoading title="Loading AI builder" body="Preparing the workspace and tools." />}
    >
      <AIPage />
    </Suspense>
  );
}

function AILoading({
  title,
  body,
  spinning = true,
}: {
  title: string;
  body: string;
  spinning?: boolean;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
          {spinning ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" />
          )}
        </div>
        <p className="mt-4 font-display text-lg font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </main>
  );
}
