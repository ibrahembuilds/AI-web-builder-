import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "react-simple-code-editor";
import {
  Download,
  FileCode2,
  Maximize,
  Maximize2,
  Minimize,
  Monitor,
  Play,
  RotateCcw,
  Smartphone,
  Sparkles,
  Tablet,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { exportPlaygroundZip, type ExportProgress } from "@/lib/export-zip";
import { ExportProgressBar, ExportProgressOverlay } from "@/components/export-progress";
import { highlight, type Lang } from "@/lib/highlight";
import { STARTERS, DEFAULT_STARTER } from "@/lib/playground-starters";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/playground")({
  head: () => ({
    meta: [
      { title: "Code playground - kanyoai" },
      {
        name: "description",
        content:
          "Write HTML, CSS and JavaScript with a live preview. Upload your own files or export the result as a clean ZIP.",
      },
      { property: "og:title", content: "Code playground - kanyoai" },
      {
        property: "og:description",
        content: "A lightweight HTML/CSS/JS playground with live preview and ZIP export.",
      },
    ],
  }),
  component: PlaygroundPage,
});

const STARTER_HTML = DEFAULT_STARTER.html;
const STARTER_CSS = DEFAULT_STARTER.css;
const STARTER_JS = DEFAULT_STARTER.js;

const STORAGE_KEY = "kanyoai:playground:v1";
type Device = "fit" | "desktop" | "tablet" | "mobile";
const widths: Record<Device, number> = { fit: 0, desktop: 1280, tablet: 768, mobile: 390 };

function PlaygroundPage() {
  const [html, setHtml] = useState(STARTER_HTML);
  const [css, setCss] = useState(STARTER_CSS);
  const [js, setJs] = useState(STARTER_JS);
  const [device, setDevice] = useState<Device>("fit");
  const [autoRun, setAutoRun] = useState(true);
  const [version, setVersion] = useState(0); // forced refresh
  const previewWrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [previewHeight, setPreviewHeight] = useState(720);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exporting, setExporting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) setFullscreen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j" && e.shiftKey) {
        e.preventDefault();
        setFullscreen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Lock background scroll + trap focus while fullscreen is active
  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = fullscreenRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Move focus into the fullscreen container
    const initial = container?.querySelector<HTMLElement>(focusableSelector);
    initial?.focus();

    function onTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (active && !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onTrap, true);
    return () => {
      document.removeEventListener("keydown", onTrap, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [fullscreen]);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        if (typeof v.html === "string") setHtml(v.html);
        if (typeof v.css === "string") setCss(v.css);
        if (typeof v.js === "string") setJs(v.js);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ html, css, js }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [html, css, js]);

  const srcDoc = useMemo(() => {
    // Inline css/js refs into the html for the iframe
    let doc = html;
    const styleTag = `<style>${css}</style>`;
    const scriptTag = `<script>${js}</script>`;
    if (/<\/head>/i.test(doc)) doc = doc.replace(/<\/head>/i, `${styleTag}\n</head>`);
    else doc = styleTag + doc;
    // Strip the file <link rel="stylesheet" href="style.css"> to avoid 404 noise
    doc = doc.replace(/<link[^>]+href=["']style\.css["'][^>]*>/gi, "");
    if (/<\/body>/i.test(doc)) doc = doc.replace(/<\/body>/i, `${scriptTag}\n</body>`);
    else doc = doc + scriptTag;
    doc = doc.replace(/<script[^>]+src=["']script\.js["'][^>]*><\/script>/gi, "");
    return doc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, css, js, version]);

  useEffect(() => {
    function update() {
      const el = previewWrap.current;
      if (!el) return;
      const padding = window.innerWidth < 640 ? 16 : 32;
      const availableHeight = Math.max(
        420,
        fullscreen ? el.clientHeight - padding : window.innerHeight - 180,
      );
      if (device === "fit") {
        setScale(1);
        setPreviewHeight(availableHeight);
        return;
      }
      const available = Math.max(260, el.clientWidth - padding);
      const desired = widths[device];
      const nextScale = Math.min(1, available / desired);
      setScale(nextScale);
      setPreviewHeight(Math.round(Math.max(420, availableHeight / nextScale)));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [device, fullscreen]);

  function loadStarter(id: string) {
    const s = STARTERS.find((x) => x.id === id);
    if (!s) return;
    setHtml(s.html);
    setCss(s.css);
    setJs(s.js);
    setVersion((v) => v + 1);
    toast.success("Loaded starter", { description: s.name });
  }

  function uploadFile(kind: "html" | "css" | "js", file: File) {
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large", { description: "Please upload a file under 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (kind === "html") setHtml(text);
      else if (kind === "css") setCss(text);
      else setJs(text);
      toast.success(`${kind.toUpperCase()} loaded`, { description: file.name });
    };
    reader.readAsText(file);
  }

  function reset() {
    setHtml(STARTER_HTML);
    setCss(STARTER_CSS);
    setJs(STARTER_JS);
    toast.success("Playground reset");
  }

  async function onExport() {
    setExporting(true);
    setExportProgress({
      phase: "preparing",
      current: 0,
      total: 1,
      percent: 0,
      label: "Starting...",
      succeeded: 0,
      failed: 0,
    });
    try {
      const result = await exportPlaygroundZip(
        "kanyoai-playground",
        html,
        css,
        js,
        setExportProgress,
      );
      const ok = result?.report.succeeded.length ?? 0;
      const ko = result?.report.failed.length ?? 0;
      const parts = [`kanyoai-playground.zip downloaded`];
      if (ok) parts.push(`${ok} asset${ok === 1 ? "" : "s"} bundled`);
      if (ko) parts.push(`${ko} failed`);
      toast[ko ? "warning" : "success"]("Project exported", { description: parts.join(" / ") });
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setExporting(false);
      setTimeout(() => setExportProgress(null), 400);
    }
  }


  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <section className="border-b border-border bg-muted/25">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Playground
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold md:text-5xl">
              Code it. See it. Ship it.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              A simple in-browser editor for HTML, CSS, and JavaScript. Type or upload your files,
              watch the preview update live, then download a ZIP whenever you&apos;re happy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="accent-foreground"
              />
              Live preview
            </label>
            {!autoRun && (
              <Button size="sm" variant="outline" onClick={() => setVersion((v) => v + 1)}>
                <Play className="mr-1.5 h-3.5 w-3.5" /> Run
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Starters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Load a starter</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {STARTERS.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => loadStarter(s.id)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFullscreen((v) => !v)}
              title="Toggle fullscreen (Ctrl/Cmd+Shift+J)"
            >
              {fullscreen ? (
                <Minimize className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Maximize className="mr-1.5 h-3.5 w-3.5" />
              )}
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </Button>
            <Button size="sm" onClick={onExport} disabled={exporting}>
              <Download className="mr-1.5 h-3.5 w-3.5" />{" "}
              {exporting ? "Exporting..." : "Export ZIP"}
            </Button>
          </div>
        </div>
        {exportProgress && exportProgress.phase !== "done" && (
          <div className="mx-auto max-w-7xl px-6 pb-4">
            <ExportProgressBar progress={exportProgress} />
          </div>
        )}
      </section>

      <div
        ref={fullscreenRef}
        role={fullscreen ? "dialog" : undefined}
        aria-modal={fullscreen ? true : undefined}
        aria-label={fullscreen ? "Code editor focus mode" : undefined}
        className={
          fullscreen
            ? "fixed inset-0 z-50 flex flex-col bg-background"
            : "flex flex-1 flex-col md:flex-row"
        }
      >
        {fullscreen && (
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Focus mode
            </span>
            <Button size="sm" variant="outline" onClick={() => setFullscreen(false)}>
              <Minimize className="mr-1.5 h-3.5 w-3.5" /> Exit fullscreen
            </Button>
          </div>
        )}
        <div className={fullscreen ? "flex min-h-0 flex-1 flex-col md:flex-row" : "contents"}>
          {/* Editor pane */}
          <aside
            className={
              fullscreen
                ? "flex w-full shrink-0 flex-col border-b border-border md:w-1/2 md:border-b-0 md:border-r"
                : "flex w-full shrink-0 flex-col border-b border-border md:w-[44%] md:border-b-0 md:border-r lg:w-[460px]"
            }
            style={fullscreen ? undefined : { height: "calc(100vh - 180px)" }}
          >
            <Tabs defaultValue="html" className="flex h-full min-h-0 flex-col">
              <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-border bg-background">
                <TabsTrigger value="html">
                  <FileCode2 className="mr-1.5 h-3.5 w-3.5" />
                  HTML
                </TabsTrigger>
                <TabsTrigger value="css">
                  <FileCode2 className="mr-1.5 h-3.5 w-3.5" />
                  CSS
                </TabsTrigger>
                <TabsTrigger value="js">
                  <FileCode2 className="mr-1.5 h-3.5 w-3.5" />
                  JS
                </TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="m-0 flex min-h-0 flex-1 flex-col p-3">
                <UploadRow
                  onPick={(f) => uploadFile("html", f)}
                  accept=".html,.htm,text/html"
                  hint="Upload .html"
                />
                <CodeArea value={html} onChange={setHtml} placeholder="HTML markup" lang="html" />
              </TabsContent>
              <TabsContent value="css" className="m-0 flex min-h-0 flex-1 flex-col p-3">
                <UploadRow
                  onPick={(f) => uploadFile("css", f)}
                  accept=".css,text/css"
                  hint="Upload .css"
                />
                <CodeArea value={css} onChange={setCss} placeholder="Stylesheet" lang="css" />
              </TabsContent>
              <TabsContent value="js" className="m-0 flex min-h-0 flex-1 flex-col p-3">
                <UploadRow
                  onPick={(f) => uploadFile("js", f)}
                  accept=".js,text/javascript,application/javascript"
                  hint="Upload .js"
                />
                <CodeArea value={js} onChange={setJs} placeholder="JavaScript" lang="js" />
              </TabsContent>
            </Tabs>
          </aside>

          {/* Preview pane */}
          <main ref={previewWrap} className="flex flex-1 flex-col bg-muted/30">
            <div className="flex items-center justify-between border-b border-border bg-background px-3 py-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Preview
              </span>
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                {(["fit", "desktop", "tablet", "mobile"] as Device[]).map((d) => {
                  const Icon =
                    d === "fit"
                      ? Maximize2
                      : d === "desktop"
                        ? Monitor
                        : d === "tablet"
                          ? Tablet
                          : Smartphone;
                  return (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      title={d === "fit" ? "Fit to window" : `${d} / ${widths[d]}px`}
                      className={`flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors ${
                        device === d
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden capitalize sm:inline">{d}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-1 items-start justify-center overflow-auto p-4">
              <div
                className="relative origin-top overflow-hidden rounded-lg border border-border bg-background shadow-sm"
                style={
                  device === "fit"
                    ? { width: "100%", height: fullscreen ? "100%" : "calc(100vh - 180px)" }
                    : {
                        width: Math.round(widths[device] * scale),
                        height: Math.round(previewHeight * scale),
                      }
                }
              >
                <iframe
                  title="playground-preview"
                  srcDoc={autoRun ? srcDoc : srcDoc}
                  key={autoRun ? "auto" : version}
                  className={
                    device === "fit" ? "h-full w-full border-0" : "absolute left-0 top-0 border-0"
                  }
                  style={
                    device === "fit"
                      ? undefined
                      : {
                          width: widths[device],
                          height: previewHeight,
                          transform: `scale(${scale})`,
                          transformOrigin: "top left",
                        }
                  }
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
      <ExportProgressOverlay progress={exportProgress} />
    </div>
  );
}

function CodeArea({
  value,
  onChange,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  lang: Lang;
}) {
  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col">
      <div
        className="code-block code-block-scroll relative min-h-0 flex-1 overflow-auto !rounded-md !p-0 focus-within:ring-2 focus-within:ring-ring"
        data-placeholder={value ? undefined : placeholder}
      >
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={(code) => highlight(code + "\n ", lang)}
          padding={16}
          tabSize={2}
          insertSpaces
          textareaClassName="focus:outline-none"
          aria-label={`${lang.toUpperCase()} editor`}
          placeholder={placeholder}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            lineHeight: 1.65,
            minHeight: "100%",
          }}
        />
      </div>
    </div>
  );
}

function UploadRow({
  onPick,
  accept,
  hint,
}: {
  onPick: (f: File) => void;
  accept: string;
  hint: string;
}) {
  return (
    <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted">
      <Upload className="h-3.5 w-3.5" /> {hint}
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.currentTarget.value = "";
        }}
      />
    </label>
  );
}
