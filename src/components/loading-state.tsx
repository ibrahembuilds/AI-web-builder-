import { Loader2 } from "lucide-react";

type PageLoadingStateProps = {
  title: string;
  body?: string;
  spinning?: boolean;
};

export function PageLoadingState({ title, body, spinning = true }: PageLoadingStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center" aria-live="polite" aria-busy={spinning}>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
          {spinning ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" />
          )}
        </div>
        <p className="mt-4 font-display text-lg font-semibold">{title}</p>
        {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
      </div>
    </main>
  );
}
