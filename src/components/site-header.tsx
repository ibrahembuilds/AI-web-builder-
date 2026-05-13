import { Link, useNavigate } from "@tanstack/react-router";
import { Code2, LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { KanyoLogo } from "@/components/kanyo-logo";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { to: "/playground", label: "Playground", icon: Code2 },
  { to: "/ai", label: "Generator", icon: Sparkles },
] as const;

const navLink =
  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl supports-[backdrop-filter]:bg-background/78">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/"
          className="group inline-flex items-center gap-2 rounded-md font-display text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="kanyoai home"
          onClick={() => setOpen(false)}
        >
          <KanyoLogo markClassName="transition-transform group-hover:-rotate-2" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-accent text-foreground" }}
                className={navLink}
              >
                {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                {item.label}
              </Link>
            );
          })}
          {user && (
            <Link
              to="/dashboard"
              activeProps={{ className: "bg-accent text-foreground" }}
              className={navLink}
            >
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="max-w-[180px] truncate text-xs text-muted-foreground hover:text-foreground"
              >
                {user.email}
              </Link>
              <button
                onClick={() => void handleSignOut()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </div>

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

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3" aria-label="Mobile">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => { setOpen(false); void handleSignOut(); }}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Sign in
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
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-sm font-semibold">
            <KanyoLogo markClassName="h-7 w-7" />
          </div>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            AI website builder. Describe it, generate it, download the clean HTML, CSS, and JavaScript.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground md:justify-end">
          <Link to="/playground" className="transition-colors hover:text-foreground">
            Playground
          </Link>
          <Link to="/ai" className="transition-colors hover:text-foreground">
            Generator
          </Link>
          <span className="font-mono text-xs">&copy; {new Date().getFullYear()} kanyoai</span>
        </div>
      </div>
    </footer>
  );
}
