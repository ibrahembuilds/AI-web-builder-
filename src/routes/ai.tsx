import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";

import { PageLoadingState } from "@/components/loading-state";
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
      <PageLoadingState
        title="Checking your session"
        body="Loading your account before opening the AI builder."
      />
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <PageLoadingState
        title="Authentication is not configured"
        body="Add the Supabase environment variables before using the AI builder."
        spinning={false}
      />
    );
  }

  if (!user) {
    return (
      <PageLoadingState
        title="Redirecting to sign in"
        body="Sign in is required to use the AI builder."
      />
    );
  }

  return (
    <Suspense
      fallback={
        <PageLoadingState title="Loading AI builder" body="Preparing the workspace and tools." />
      }
    >
      <AIPage />
    </Suspense>
  );
}
