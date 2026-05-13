import { useNavigate } from "@tanstack/react-router";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCode2,
  ImagePlus,
  Loader2,
  Monitor,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ─── types ────────────────────────────────────────────────────────────────────

type Phase = "build" | "workspace";
type DeviceMode = "desktop" | "tablet" | "mobile";
type SiteKind = "portfolio" | "landing" | "business" | "saas" | "commerce";
type ViewMode = "preview" | "html" | "css" | "js";

type MediaItem = { id: string; name: string; alt: string; dataUrl: string; size: number };
type SiteFiles = { html: string; css: string; js: string };
type BriefAnswers = { intent: string; identity: string; tagline: string; audience: string; offer: string; style: string; assets: string; tone: string };
type ChatMessage = { id: string; role: "assistant" | "user"; content: string };

// ─── constants ────────────────────────────────────────────────────────────────

const MEDIA_KEY = "kanyoai.ai.media.v3";
const EMPTY_FILES: SiteFiles = { html: "", css: "", js: "" };

const SITE_KINDS: Array<{ id: SiteKind; label: string }> = [
  { id: "portfolio", label: "Portfolio" },
  { id: "landing", label: "Landing page" },
  { id: "business", label: "Business" },
  { id: "saas", label: "SaaS" },
  { id: "commerce", label: "Commerce" },
];

const STYLE_PRESETS = [
  { id: "classic",  label: "Classic",  note: "Editorial whitespace, calm hierarchy, blue-accented.",   colors: ["#0f172a", "#f8fafc", "#2563eb"] },
  { id: "minimal",  label: "Minimal",  note: "Clean grid, quiet details, focused on the work.",         colors: ["#111827", "#ffffff", "#64748b"] },
  { id: "dark",     label: "Dark",     note: "Dark canvas, crisp contrast, precise highlights.",         colors: ["#0b1220", "#e5e7eb", "#3b82f6"] },
  { id: "saas",     label: "SaaS",     note: "Sharp, product-led, strong conversion rhythm.",            colors: ["#102a43", "#f8fafc", "#1d4ed8"] },
  { id: "bold",     label: "Bold",     note: "High-energy, expressive typography, vibrant accents.",     colors: ["#09090b", "#fafafa", "#f97316"] },
  { id: "luxury",   label: "Luxury",   note: "Refined, exclusive feel with gold and dark marble tones.", colors: ["#0c0a09", "#fafaf9", "#d97706"] },
  { id: "nature",   label: "Nature",   note: "Organic, calm, earthy greens with natural warmth.",        colors: ["#052e16", "#f0fdf4", "#16a34a"] },
  { id: "magazine", label: "Magazine", note: "Editorial layout, editorial serif type, bold contrast.",   colors: ["#fafaf9", "#0c0a09", "#dc2626"] },
];

const TONE_OPTIONS = [
  { id: "professional", label: "Professional" },
  { id: "bold",         label: "Bold & direct" },
  { id: "friendly",     label: "Friendly" },
  { id: "minimal",      label: "Minimal copy" },
  { id: "luxury",       label: "Luxury / exclusive" },
];

const MODEL_OPTIONS = [
  { id: "flagship", label: "GPT-5.5",      model: "gpt-5.5",      note: "Flagship · complex reasoning" },
  { id: "quality",  label: "GPT-5.4",      model: "gpt-5.4",      note: "Professional · great quality" },
  { id: "budget",   label: "GPT-5.4 Mini", model: "gpt-5.4-mini", note: "Balanced · default" },
  { id: "fast",     label: "GPT-5.4 Nano", model: "gpt-5.4-nano", note: "Fastest · lowest cost" },
];

const STEPS = [
  { num: 1, label: "Describe" },
  { num: 2, label: "Details" },
  { num: 3, label: "Launch" },
];

const GEN_STEPS = [
  "Designing layout structure",
  "Writing HTML markup",
  "Crafting CSS styles",
  "Adding responsiveness",
  "Wiring up interactions",
];

// ─── component ────────────────────────────────────────────────────────────────

export default function AIPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // phase
  const [phase, setPhase] = useState<Phase>("build");

  // build form
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<SiteKind>("portfolio");
  const [brief, setBrief] = useState<BriefAnswers>(emptyBrief);
  const [stylePreset, setStylePreset] = useState("classic");
  const [modelOption, setModelOption] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("kanyoai.settings.v1") || "{}");
      const valid = MODEL_OPTIONS.map((m) => m.id);
      return valid.includes(s.preferredModel) ? (s.preferredModel as string) : "budget";
    } catch { return "budget"; }
  });
  const [media, setMedia] = useState<MediaItem[]>([]);

  // output
  const [files, setFiles] = useState<SiteFiles>(EMPTY_FILES);
  const [view, setView] = useState<ViewMode>("preview");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [busy, setBusy] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    { id: createId(), role: "assistant", content: "After generation, describe any changes here — layout, colors, copy, new sections — and I'll update the site instantly." },
  ]);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlSelectionRef = useRef({ start: 0, end: 0 });
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedStyle = STYLE_PRESETS.find((s) => s.id === stylePreset) ?? STYLE_PRESETS[0];
  const selectedModel = MODEL_OPTIONS.find((m) => m.id === modelOption) ?? MODEL_OPTIONS[0];
  const previewSrcDoc = useMemo(() => composePreview(files), [files]);
  const hasCode = Boolean(files.html.trim() || files.css.trim() || files.js.trim());
  const canGenerate = Boolean(brief.intent.trim());
  const title = projectTitle(brief, kind);

  // gen-step animation
  useEffect(() => {
    if (!busy) { setGenStep(0); return; }
    const timers = GEN_STEPS.map((_, i) => window.setTimeout(() => setGenStep(i), i * 3200));
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  // auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, busy]);

  useEffect(() => {
    const t = window.setTimeout(() => setMedia(loadMedia()), 250);
    return () => window.clearTimeout(t);
  }, []);

  // ── auth ─────────────────────────────────────────────────────────────────────

  function requireSignIn(action: string) {
    toast.info(`Sign in to ${action}`, { description: "A kanyoai account is required." });
    navigate({ to: "/login", search: { redirect: window.location.pathname } });
  }

  // ── media ────────────────────────────────────────────────────────────────────

  async function onUploadImages(files: FileList | null) {
    if (!files?.length) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!images.length) { toast.error("Upload image files only"); return; }
    try {
      const items = await Promise.all(images.map(fileToMedia));
      const next = [...items, ...media].slice(0, 12);
      setMedia(next);
      localStorage.setItem(MEDIA_KEY, JSON.stringify(next));
      toast.success(`Added ${items.length} image${items.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not read one of the images");
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function removeMedia(id: string) {
    const next = media.filter((m) => m.id !== id);
    setMedia(next);
    localStorage.setItem(MEDIA_KEY, JSON.stringify(next));
  }

  function rememberHtmlSelection() {
    const el = htmlRef.current;
    if (!el) return;
    htmlSelectionRef.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
  }

  function insertImage(item: MediaItem) {
    const snippet = `<img src="${item.dataUrl}" alt="${escapeAttr(item.alt)}" />`;
    setFiles((cur) => {
      const html = cur.html || starterHtml();
      const { start, end } = htmlSelectionRef.current;
      const s = Math.min(start, html.length);
      const e = Math.min(end, html.length);
      const next = html.slice(0, s) + snippet + html.slice(e);
      htmlSelectionRef.current = { start: s + snippet.length, end: s + snippet.length };
      return { ...cur, html: next };
    });
    setView("html");
  }

  // ── generation ───────────────────────────────────────────────────────────────

  async function generateSite() {
    if (!brief.intent.trim()) { toast.error("Describe what you want to build first"); return; }
    if (authLoading) { toast.info("Checking your session..."); return; }
    if (!user) { requireSignIn("generate websites"); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("workspace");
    setBusy(true);
    setView("preview");

    try {
      const result = await callGenerator(
        { mode: "create", model: selectedModel.model, modelPreset: modelOption, kind, style: selectedStyle, brief, media: media.slice(0, 4) },
        ctrl.signal,
      );
      setFiles(normalizeGeneratedFiles(result));
      setChat((c) => [...c, { id: createId(), role: "assistant", content: "Done! Your website is ready. Tell me anything you'd like to change." }]);
      toast.success("Website generated");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(err instanceof Error ? err.message : "Generation failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function editDesign() {
    const instruction = editInput.trim();
    if (!instruction) return;
    if (!hasCode) { toast.error("Generate a website first"); return; }
    if (!user) { requireSignIn("edit with AI"); return; }

    setChat((c) => [...c, { id: createId(), role: "user", content: instruction }]);
    setEditInput("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);

    try {
      const result = await callGenerator(
        { mode: "edit", model: selectedModel.model, modelPreset: modelOption, kind, style: selectedStyle, brief, media: media.slice(0, 4), files, instruction },
        ctrl.signal,
      );
      setFiles(normalizeGeneratedFiles(result));
      setChat((c) => [...c, { id: createId(), role: "assistant", content: "Updated. How does that look?" }]);
      setView("preview");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const msg = err instanceof Error ? err.message : "Edit failed";
        setChat((c) => [...c, { id: createId(), role: "assistant", content: `Sorry, something went wrong: ${msg}` }]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyFile(value: string, label: string) {
    if (!value.trim()) return;
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  async function copyCurrentFile() {
    const content = view === "html" ? files.html : view === "css" ? files.css : files.js;
    const label = view === "html" ? "HTML" : view === "css" ? "CSS" : "JS";
    if (!content.trim()) return;
    await navigator.clipboard.writeText(content);
    toast.success(`${label} copied`);
  }

  async function downloadZip() {
    if (!hasCode) return;
    setDownloading(true);
    try {
      const { exportPlaygroundZip } = await import("@/lib/export-zip");
      await exportPlaygroundZip(safeSlug(title), files.html, files.css, files.js);
      toast.success("ZIP downloaded");
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  async function saveProject() {
    if (!hasCode) { toast.error("Generate a website first"); return; }
    if (!user) { requireSignIn("save projects"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("ai_projects").insert({
        user_id: user.id,
        title,
        kind,
        brief: brief as unknown as Json,
        files: files as unknown as Json,
        model: selectedModel.model,
        style: selectedStyle as unknown as Json,
      });
      if (error) throw error;
      toast.success("Project saved to dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function openInNewTab() {
    const html = composePreview(files);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) toast.error("Pop-up blocked — allow pop-ups and try again.");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function backToBuild() {
    if (busy) { abortRef.current?.abort(); setBusy(false); }
    if (hasCode && !window.confirm("Return to the brief? Your generated site stays in memory until you regenerate.")) return;
    setPhase("build");
  }

  // ── step nav ──────────────────────────────────────────────────────────────────

  function goNext() {
    if (step === 0 && !brief.intent.trim()) { toast.error("Describe your website first"); return; }
    setStep((s) => Math.min(2, s + 1));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Workspace render
  // ─────────────────────────────────────────────────────────────────────────────

  if (phase === "workspace") {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <SiteHeader />

        {/* Project bar */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={backToBuild}
              className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Brief</span>
            </button>
            <span className="shrink-0 text-border/60">|</span>
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
              {selectedModel.model}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" disabled={!hasCode || saving} onClick={() => void saveProject()}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Save</span>
            </Button>
            <Button size="sm" variant="outline" disabled={!hasCode || downloading} onClick={() => void downloadZip()}>
              {downloading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Export ZIP</span>
            </Button>
          </div>
        </div>

        {/* Main workspace */}
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* Preview + code area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Toolbar */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/10 px-3 py-1.5">
              {/* View tabs */}
              <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
                {(["preview", "html", "css", "js"] as ViewMode[]).map((v) => {
                  const Icon = v === "preview" ? Eye : v === "html" ? FileCode2 : Code2;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                        view === v ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{v}</span>
                    </button>
                  );
                })}
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1.5">
                {view === "preview" ? (
                  <>
                    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
                      {([
                        { id: "desktop" as DeviceMode, Icon: Monitor, label: "Desktop" },
                        { id: "tablet" as DeviceMode, Icon: Tablet, label: "Tablet" },
                        { id: "mobile" as DeviceMode, Icon: Smartphone, label: "Mobile" },
                      ]).map(({ id, Icon, label }) => (
                        <button
                          key={id}
                          type="button"
                          title={label}
                          onClick={() => setDevice(id)}
                          className={[
                            "rounded-md p-1.5 transition-colors",
                            device === id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
                          ].join(" ")}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      title="Open in new tab"
                      disabled={!hasCode}
                      onClick={openInNewTab}
                      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={!hasCode}
                    onClick={() => void copyCurrentFile()}
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy
                  </Button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="relative min-h-0 flex-1 bg-slate-100">
              {busy && (
                <GeneratingOverlay
                  step={genStep}
                  onCancel={() => { abortRef.current?.abort(); setBusy(false); }}
                />
              )}

              {view === "preview" && device === "desktop" && (
                <iframe
                  title="preview"
                  srcDoc={previewSrcDoc}
                  sandbox="allow-scripts allow-same-origin"
                  className="absolute inset-0 h-full w-full border-0 bg-white"
                />
              )}

              {view === "preview" && device !== "desktop" && (
                <div className="absolute inset-0 overflow-auto p-6 flex justify-center">
                  <div
                    className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300"
                    style={{ width: device === "tablet" ? 768 : 390, minWidth: device === "tablet" ? 768 : 390 }}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="rounded-md bg-white border border-slate-200 py-1 px-3 text-center text-[11px] text-slate-400 font-mono">
                          {title.toLowerCase().replace(/\s+/g, "")} .html
                        </div>
                      </div>
                      <div className="w-16" />
                    </div>
                    <iframe
                      title="preview"
                      srcDoc={previewSrcDoc}
                      sandbox="allow-scripts allow-same-origin"
                      className="w-full border-0 bg-white"
                      style={{ height: device === "tablet" ? 900 : 844 }}
                    />
                  </div>
                </div>
              )}

              {view === "html" && (
                <div className="absolute inset-0">
                  <CodeEditor
                    label="index.html"
                    value={files.html}
                    onChange={(v) => setFiles((f) => ({ ...f, html: v }))}
                    onCopy={() => void copyFile(files.html, "HTML")}
                    placeholder="HTML will appear here after generation."
                    textareaRef={htmlRef}
                    onSelection={rememberHtmlSelection}
                  />
                </div>
              )}
              {view === "css" && (
                <div className="absolute inset-0">
                  <CodeEditor
                    label="style.css"
                    value={files.css}
                    onChange={(v) => setFiles((f) => ({ ...f, css: v }))}
                    onCopy={() => void copyFile(files.css, "CSS")}
                    placeholder="CSS will appear here after generation."
                  />
                </div>
              )}
              {view === "js" && (
                <div className="absolute inset-0">
                  <CodeEditor
                    label="script.js"
                    value={files.js}
                    onChange={(v) => setFiles((f) => ({ ...f, js: v }))}
                    onCopy={() => void copyFile(files.js, "JS")}
                    placeholder="JavaScript will appear here after generation."
                  />
                </div>
              )}
            </div>
          </div>

          {/* AI chat sidebar */}
          <div className="flex w-[300px] shrink-0 flex-col border-l border-border bg-card xl:w-[340px]">
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">AI Editor</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Describe a change and I'll update the site.</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3 space-y-3">
              {chat.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "rounded-br-sm bg-primary text-white"
                        : "rounded-bl-sm border border-border bg-background text-foreground",
                    ].join(" ")}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2.5">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="shrink-0 border-t border-border p-3">
              <div className="flex gap-2">
                <Textarea
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void editDesign(); }
                  }}
                  rows={3}
                  placeholder="Make the hero darker, add a pricing table…"
                  className="resize-none text-sm"
                  disabled={busy}
                />
                <Button
                  type="button"
                  className="h-auto self-end px-3"
                  disabled={busy || !editInput.trim()}
                  onClick={() => void editDesign()}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => void onUploadImages(e.target.files)}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Build render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">

        {/* Back to workspace banner */}
        {hasCode && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <p className="flex-1 text-sm text-muted-foreground">You have a generated website.</p>
            <Button size="sm" variant="outline" onClick={() => setPhase("workspace")}>
              View project
            </Button>
          </div>
        )}

        {/* Form card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">

          {/* Step indicator */}
          <div className="flex border-b border-border">
            {STEPS.map((s, i) => {
              const done = step > i;
              const active = step === i;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(i)}
                  className={[
                    "flex flex-1 items-center justify-center gap-2.5 py-4 text-sm font-medium transition-colors",
                    "border-r border-border last:border-r-0",
                    active ? "bg-primary/5 text-primary" : done ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      active ? "bg-primary text-white" : done ? "bg-green-500 text-white" : "bg-border text-muted-foreground",
                    ].join(" ")}
                  >
                    {done ? "✓" : s.num}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Step 0: Describe */}
          {step === 0 && (
            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">What do you want to build?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Describe your website in plain language. The more specific, the better.
                </p>
              </div>

              <Textarea
                value={brief.intent}
                onChange={(e) => setBrief((b) => ({ ...b, intent: e.target.value }))}
                placeholder={`Try something like:\n• "A portfolio for an architectural photographer in Chicago. Minimalist, blue-and-white — hero, projects gallery, services, contact form."\n• "SaaS landing page for a project management tool. Dark tech feel, feature grid, pricing table, CTA to sign up."\n• "Luxury skincare brand homepage. Dark marble aesthetic, gold accents, hero with tagline, product showcase, testimonials."`}
                rows={6}
                className="resize-none text-sm"
                autoFocus
              />

              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">Site type</p>
                <div className="flex flex-wrap gap-2">
                  {SITE_KINDS.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setKind(k.id)}
                      className={[
                        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                        kind === k.id ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50 hover:text-primary",
                      ].join(" ")}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Images <span className="text-xs">(optional — up to 4)</span>
                  </p>
                  {media.length > 0 && (
                    <button type="button" className="text-xs text-primary hover:underline" onClick={() => imageInputRef.current?.click()}>
                      + Add more
                    </button>
                  )}
                </div>
                {media.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload brand images or photos
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {media.map((item) => (
                      <div key={item.id} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                        <img src={item.dataUrl} alt={item.alt} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeMedia(item.id)}
                          className="absolute inset-0 hidden items-center justify-center bg-black/60 text-white group-hover:flex"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">Add more details</h2>
                <p className="mt-1 text-sm text-muted-foreground">All fields are optional — but specifics lead to better results.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Name or brand</label>
                  <Input value={brief.identity} onChange={(e) => setBrief((b) => ({ ...b, identity: e.target.value }))} placeholder="e.g. Nora Vale, Studio Norte, Arca Design" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Tagline <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input value={brief.tagline} onChange={(e) => setBrief((b) => ({ ...b, tagline: e.target.value }))} placeholder="e.g. Architecture through a human lens. · Build faster, ship smarter." />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Who is it for?</label>
                  <Input value={brief.audience} onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))} placeholder="e.g. Interior designers looking to book a photographer" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Sections and content</label>
                  <Textarea value={brief.offer} onChange={(e) => setBrief((b) => ({ ...b, offer: e.target.value }))} placeholder="e.g. Hero, selected projects gallery, services, testimonials, pricing, contact form" rows={3} className="resize-none text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Tone of voice</label>
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBrief((b) => ({ ...b, tone: t.id }))}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                          brief.tone === t.id ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50 hover:text-primary",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Contact info or notes</label>
                  <Input value={brief.assets} onChange={(e) => setBrief((b) => ({ ...b, assets: e.target.value }))} placeholder="e.g. hello@example.com, Instagram: @noravale, CTA: Book a shoot" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Launch */}
          {step === 2 && (
            <div className="space-y-7 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">Choose a style and generate</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick a visual direction. You can always change it after by chat.</p>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Visual style</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
                  {STYLE_PRESETS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStylePreset(s.id)}
                      className={[
                        "rounded-xl border p-3 text-left transition-all",
                        stylePreset === s.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-muted-foreground/40",
                      ].join(" ")}
                    >
                      <div className="mb-2 flex gap-1.5">
                        {s.colors.map((c) => (
                          <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{s.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Output quality</p>
                <div className="flex gap-2">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModelOption(m.id)}
                      className={[
                        "flex-1 rounded-xl border px-3 py-2.5 text-center text-sm transition-all",
                        modelOption === m.id ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40",
                      ].join(" ")}
                    >
                      <div className="font-semibold">{m.label}</div>
                      <div className="mt-0.5 text-[11px] opacity-70">{m.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                className="w-full gap-2 text-base"
                disabled={busy || authLoading || !canGenerate}
                onClick={() => void generateSite()}
              >
                {busy ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Generating…</>
                ) : (
                  <><Wand2 className="h-5 w-5" /> Generate website</>
                )}
              </Button>

              {!user && !authLoading && (
                <p className="text-center text-xs text-muted-foreground">You will be asked to sign in before generating.</p>
              )}
            </div>
          )}

          {/* Footer nav */}
          <div className="flex items-center justify-between border-t border-border px-6 py-3 sm:px-8">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              Back
            </button>
            {step < 2 && (
              <Button type="button" onClick={goNext} size="sm">Next</Button>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void onUploadImages(e.target.files)}
      />
    </div>
  );
}

// ─── generating overlay ───────────────────────────────────────────────────────

function GeneratingOverlay({ step, onCancel }: { step: number; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 bg-background/95 backdrop-blur-sm">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-primary" />
        <Sparkles className="h-6 w-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold">Building your website</p>
        <p className="mt-1 text-sm text-muted-foreground">{GEN_STEPS[step] ?? GEN_STEPS[GEN_STEPS.length - 1]}</p>
      </div>
      <div className="w-56 space-y-2">
        {GEN_STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 text-xs">
            {i < step ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            ) : i === step ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            ) : (
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
            )}
            <span className={i <= step ? "text-foreground" : "text-muted-foreground/40"}>{s}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onCancel} className="text-xs text-muted-foreground transition-colors hover:text-foreground">
        Cancel
      </button>
    </div>
  );
}

// ─── code editor ─────────────────────────────────────────────────────────────

function CodeEditor({
  label, value, onChange, onCopy, placeholder, textareaRef, onSelection,
}: {
  label: string; value: string; onChange: (v: string) => void; onCopy: () => void;
  placeholder: string; textareaRef?: RefObject<HTMLTextAreaElement | null>; onSelection?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-zinc-900/90 px-3 py-2 text-xs">
        <span className="font-mono text-zinc-400">{label}</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-zinc-500">{value.length.toLocaleString()} chars</span>
          <button
            type="button"
            onClick={onCopy}
            disabled={!value}
            className="flex items-center gap-1 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); onSelection?.(); }}
        onSelect={onSelection}
        onKeyUp={onSelection}
        onMouseUp={onSelection}
        onBlur={onSelection}
        spellCheck={false}
        placeholder={placeholder}
        className="flex-1 resize-none bg-zinc-950 p-4 font-mono text-[12.5px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
      />
    </div>
  );
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function callGenerator(
  payload: {
    mode: "create" | "edit"; model: string; modelPreset: string; kind: SiteKind;
    style: typeof STYLE_PRESETS[0]; brief: BriefAnswers; media: MediaItem[];
    files?: SiteFiles; instruction?: string;
  },
  signal: AbortSignal,
) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to use the AI builder.");

  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    signal,
    body: JSON.stringify({
      mode: payload.mode,
      model: payload.model,
      modelPreset: payload.modelPreset,
      kind: payload.kind,
      style: payload.style,
      brief: payload.brief,
      media: payload.media.map((m) => ({ name: m.name, alt: m.alt })),
      files: payload.files,
      instruction: payload.instruction,
    }),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(parseErrorMessage(text) || `Generation failed (${res.status})`);
  return text;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function normalizeGeneratedFiles(value: string): SiteFiles {
  const text = stripFences(value.trim());
  const parsed = parseMaybeJson(text);
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const src = (obj.site as Record<string, unknown>) ?? (obj.files as Record<string, unknown>) ?? obj;
    const html = str(src.html ?? src.indexHtml ?? src["index.html"]);
    const css = str(src.css ?? src.styles ?? src["style.css"]);
    const js = str(src.js ?? src.javascript ?? src["script.js"]);
    if (html || css || js) return normalizeShape({ html, css, js });
    const out = str(obj.output ?? obj.text ?? obj.content);
    if (out) return splitSingleHtml(out);
  }
  return splitSingleHtml(text);
}

function normalizeShape(files: SiteFiles): SiteFiles {
  let html = files.html.trim() || starterHtml();
  const css = files.css.trim();
  const js = files.js.trim();
  if (!/<link[^>]+href=["']style\.css["']/i.test(html) && css)
    html = html.replace(/<\/head>/i, `  <link rel="stylesheet" href="style.css">\n</head>`);
  if (!/<script[^>]+src=["']script\.js["']/i.test(html) && js)
    html = html.replace(/<\/body>/i, `  <script src="script.js"></script>\n</body>`);
  return { html, css, js };
}

function splitSingleHtml(raw: string): SiteFiles {
  let html = stripFences(raw.trim());
  let css = "";
  let js = "";
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, inner) => { css += `${String(inner).trim()}\n`; return ""; });
  html = html.replace(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi, (_, inner) => { js += `${String(inner).trim()}\n`; return ""; });
  if (!/<!doctype html>/i.test(html))
    html = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>kanyoai site</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
  return normalizeShape({ html, css, js });
}

function composePreview(files: SiteFiles) {
  if (!files.html.trim() && !files.css.trim() && !files.js.trim()) return EMPTY_PREVIEW;
  let html = files.html.trim() || starterHtml();
  const cssTag = files.css.trim() ? `<style>\n${files.css}\n</style>` : "";
  const jsTag = files.js.trim() ? `<script>\n${files.js}\n</script>` : "";
  html = html.replace(/<link[^>]+href=["']style\.css["'][^>]*>/gi, "");
  html = html.replace(/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/gi, "");
  if (cssTag) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${cssTag}\n</head>`) : `${cssTag}\n${html}`;
  if (jsTag) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${jsTag}\n</body>`) : `${html}\n${jsTag}`;
  return html;
}

function parseMaybeJson(text: string) {
  try { return JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } }
}

function parseErrorMessage(text: string) {
  const p = parseMaybeJson(text);
  if (p && typeof p === "object") { const o = p as Record<string, unknown>; return str(o.error) || str(o.message); }
  return text.trim().slice(0, 240);
}

function stripFences(v: string) { return v.replace(/^```(?:json|html|css|javascript|js)?\s*/i, "").replace(/```\s*$/i, "").trim(); }
function str(v: unknown) { return typeof v === "string" ? v : ""; }
function emptyBrief(): BriefAnswers { return { intent: "", identity: "", tagline: "", audience: "", offer: "", style: "", assets: "", tone: "professional" }; }
function kindLabel(k: SiteKind) { return SITE_KINDS.find((s) => s.id === k)?.label ?? "Website"; }
function projectTitle(brief: BriefAnswers, kind: SiteKind) { return brief.identity.trim() || `${kindLabel(kind)} website`; }
function safeSlug(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "kanyoai-site"; }
function starterHtml() { return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>kanyoai site</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main></main>\n  <script src="script.js"></script>\n</body>\n</html>`; }
function createId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function loadMedia(): MediaItem[] { try { const r = localStorage.getItem(MEDIA_KEY); if (!r) return []; const p = JSON.parse(r); return Array.isArray(p) ? p : []; } catch { return []; } }
function fileToMedia(file: File): Promise<MediaItem> { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ id: createId(), name: file.name, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), dataUrl: String(r.result), size: file.size }); r.onerror = () => rej(r.error); r.readAsDataURL(file); }); }
function escapeAttr(v: string) { return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

const EMPTY_PREVIEW = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#64748b;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.box{max-width:32rem;padding:2.5rem;text-align:center}.icon{width:52px;height:52px;margin:0 auto 1.5rem;border-radius:16px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;display:grid;place-items:center;font-size:1.3rem;font-weight:700;box-shadow:0 8px 24px -8px rgba(37,99,235,.6)}h1{margin:0 0 .75rem;color:#0f172a;font-size:1.5rem;font-weight:600;letter-spacing:-.02em}p{margin:0;line-height:1.7;font-size:.9rem;color:#64748b}</style></head><body><div class="box"><div class="icon">AI</div><h1>Your preview will appear here</h1><p>Complete the steps above and click <strong>Generate website</strong> to build your site.</p></div></body></html>`;
