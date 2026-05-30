import { Link, useNavigate } from "@tanstack/react-router";
import { Code2, LayoutDashboard, Loader2, LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { KanyoLogo } from "@/components/kanyo-logo";
import { useAuth } from "@/hooks/use-auth";

const publicNavItems = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

const authedNavItems = [
  { to: "/ai", label: "Generator", icon: Sparkles },
  { to: "/playground", label: "Playground", icon: Code2 },
] as const;

const linkBase =
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
      navigate({ to: "/" });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-md font-display text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="kanyoai home"
          onClick={() => setOpen(false)}
        >
          <KanyoLogo markClassName="transition-transform group-hover:-rotate-2" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          {publicNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-accent text-foreground" }}
              className={linkBase}
            >
              {item.label}
            </Link>
          ))}

          {user && (
            <>
              {authedNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    activeProps={{ className: "bg-accent text-foreground" }}
                    className={linkBase}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                to="/dashboard"
                activeProps={{ className: "bg-accent text-foreground" }}
                className={linkBase}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            </>
          )}
        </nav>

        {/* Desktop auth */}
        <div className="hidden items-center gap-2 md:flex">
          {loading ? (
            <div
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking session
            </div>
          ) : user ? (
            <>
              <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                {user.email}
              </span>
              <button
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                aria-label="Sign out"
              >
                {signingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                {signingOut ? "Signing out" : "Sign out"}
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Get started free
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto grid max-w-7xl gap-0.5 px-4 py-3" aria-label="Mobile">
            {publicNavItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}

            {user ? (
              <>
                {authedNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    void handleSignOut();
                  }}
                  disabled={signingOut}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-wait disabled:opacity-70"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {signingOut ? "Signing out" : "Sign out"}
                </button>
              </>
            ) : loading ? (
              <div className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking session
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-1 inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white"
              >
                Get started free
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <KanyoLogo markClassName="h-7 w-7" />
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            The AI website builder for agencies. Describe any client site, generate production-ready
            HTML, CSS, and JavaScript, and deliver results in minutes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground md:justify-end">
          <Link to="/about" className="transition-colors hover:text-foreground">
            About
          </Link>
          <Link to="/contact" className="transition-colors hover:text-foreground">
            Contact
          </Link>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <span className="font-mono text-xs">&copy; {new Date().getFullYear()} kanyoai</span>
        </div>
      </div>
    </footer>
  );
}
