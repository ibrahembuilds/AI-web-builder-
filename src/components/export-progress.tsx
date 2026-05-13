import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import type { ExportProgress } from "@/lib/export-zip";

type Props = {
  progress: ExportProgress | null;
};

function Counts({ progress }: { progress: ExportProgress }) {
  const { succeeded, failed } = progress;
  if (!succeeded && !failed) return null;
  return (
    <div className="flex items-center gap-3 font-mono text-[10px] tabular-nums">
      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        {succeeded} ok
      </span>
      {failed > 0 && (
        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          {failed} failed
        </span>
      )}
    </div>
  );
}

/**
 * Compact, inline export-progress indicator.
 * Renders nothing when there is no active export.
 */
export function ExportProgressBar({ progress }: Props) {
  if (!progress || progress.phase === "done") return null;
  const pct = Math.max(0, Math.min(100, progress.percent));
  return (
    <div className="w-full max-w-sm">
      <div className="mb-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="truncate">{progress.label ?? "Exporting"}</span>
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {(progress.succeeded > 0 || progress.failed > 0) && (
        <div className="mt-1.5">
          <Counts progress={progress} />
        </div>
      )}
    </div>
  );
}

/**
 * Full-screen overlay variant - used during long exports when we want to
 * gently block interaction with the rest of the UI.
 */
export function ExportProgressOverlay({ progress }: Props) {
  if (!progress || progress.phase === "done") return null;
  const pct = Math.max(0, Math.min(100, progress.percent));
  const recentFailed = progress.report?.failed.slice(-3) ?? [];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm">
      <div className="w-[min(460px,90vw)] rounded-lg border border-border bg-card p-5 shadow-lg">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
          <h3 className="font-display text-sm font-semibold">Exporting your project</h3>
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {pct}%
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progress.label ?? "Working"}</p>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Phase: {progress.phase}
            {progress.total > 0 &&
              progress.phase === "fetching" &&
              ` - ${progress.current}/${progress.total}`}
          </p>
          <Counts progress={progress} />
        </div>

        {recentFailed.length > 0 && (
          <div className="mt-3 rounded border border-red-500/20 bg-red-500/5 p-2">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400">
              Recent failures
            </p>
            <ul className="space-y-0.5">
              {recentFailed.map((f) => (
                <li
                  key={f.url}
                  className="truncate font-mono text-[10px] text-muted-foreground"
                  title={`${f.url} - ${f.reason}`}
                >
                  <span className="text-red-600 dark:text-red-400">{f.reason}</span> - {f.url}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
