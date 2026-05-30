import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Keep a stable user reference — only replace when the user ID actually changes.
  // This prevents TOKEN_REFRESHED events from triggering useEffect([user]) re-runs
  // in components that only care about who is logged in, not the token value.
  const userIdRef = useRef<string | undefined>(undefined);

  function applySession(s: Session | null) {
    setSession(s);
    if (s?.user?.id !== userIdRef.current) {
      userIdRef.current = s?.user?.id;
      setUser(s?.user ?? null);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let settled = false;

    function settle(s: Session | null) {
      settled = true;
      clearTimeout(timeout);
      applySession(s);
    }

    // Failsafe: unblock the UI after 8 s even if Supabase never responds
    const timeout = window.setTimeout(() => {
      if (!settled) settle(null);
    }, 8000);

    // Subscribe first so we don't miss rapid sign-in events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!settled) settle(s);
      else applySession(s);
    });

    // Then read the persisted session
    supabase.auth.getSession().then(({ data }) => {
      if (!settled) settle(data.session);
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
  }

  return { session, user, loading, signOut, isSupabaseConfigured };
}
