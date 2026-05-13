import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashTab = "overview" | "projects" | "images" | "settings";
type SortKey = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";

type AiProject = {
  id: string;
  title: string;
  kind: string;
  model: string | null;
  updated_at: string;
  created_at: string;
  files: { html?: string; css?: string; js?: string } | null;
  style: { id?: string; label?: string } | null;
};

type StoredImage = {
  name: string;
  url: string;
  path: string;
  size: number;
  created_at: string;
};

type AppSettings = { preferredModel: string; displayName: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const SETTINGS_KEY = "kanyoai.settings.v1";
const STORAGE_BUCKET = "user-images";

const SETTINGS_MODELS = [
  { id: "flagship", label: "GPT-5.5",      badge: "Flagship",   note: "Complex reasoning · best output" },
  { id: "quality",  label: "GPT-5.4",      badge: "Pro",        note: "Professional work · great quality" },
  { id: "budget",   label: "GPT-5.4 Mini", badge: "Default",    note: "Balanced speed & quality" },
  { id: "fast",     label: "GPT-5.4 Nano", badge: "Fast",       note: "Lowest latency · most affordable" },
];

const TABS: Array<{ id: DashTab; label: string }> = [
  { id: "overview",  label: "Overview"  },
  { id: "projects",  label: "Projects"  },
  { id: "images",    label: "Images"    },
  { id: "settings",  label: "Settings"  },
];

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { preferredModel: "budget", displayName: "", ...JSON.parse(raw) };
  } catch {}
  return { preferredModel: "budget", displayName: "" };
}

// Returns true when Supabase has stored a session token in localStorage,
// even if the JS auth hook hasn't resolved yet (prevents premature redirect).
function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    );
  } catch { return false; }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard - kanyoai" },
      { name: "description", content: "Manage your kanyoai projects, images, and settings." },
    ],
  }),
  component: DashboardPage,
});

// ─── Main component ───────────────────────────────────────────────────────────

function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashTab>("overview");

  // Data
  const [projects, setProjects]     = useState<AiProject[] | null>(null);
  const [images,   setImages]       = useState<StoredImage[] | null>(null);
  const [settings, setSettings]     = useState<AppSettings>(loadSettings);

  // Projects UI
  const [query, setQuery] = useState("");
  const [sort,  setSort]  = useState<SortKey>("updated_desc");

  // Images UI
  const [imagePrompt,      setImagePrompt]      = useState("");
  const [imageSize,        setImageSize]        = useState<"1024x1024" | "1536x1024" | "1024x1536">("1024x1024");
  const [genQuality,       setGenQuality]       = useState<"standard" | "hd">("standard");
  const [generatingImage,  setGeneratingImage]  = useState(false);
  const [uploadingImage,   setUploadingImage]   = useState(false);
  const [deletingImagePath, setDeletingImagePath] = useState<string | null>(null);
  const [copied,           setCopied]           = useState<string | null>(null);

  const uploadRef = useRef<HTMLInputElement | null>(null);

  // Redirect only when auth is fully settled AND there is no stored session —
  // prevents a premature redirect if Supabase responds after the safety timeout.
  useEffect(() => {
    if (!authLoading && !user?.id && !hasStoredSession()) {
      navigate({ to: "/login", search: { redirect: "/dashboard" } });
    }
  }, [user?.id, authLoading, navigate]);

  // Load projects once user is available
  // user?.id (string) — avoids re-running on TOKEN_REFRESHED where object ref changes but ID doesn't
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("ai_projects")
      .select("id,title,kind,model,updated_at,created_at,files,style")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { toast.error("Could not load projects", { description: error.message }); setProjects([]); return; }
        setProjects((data as AiProject[]) ?? []);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load images when images tab first opens — images excluded from deps to avoid double-loads
  useEffect(() => {
    if (tab !== "images" || !user?.id || !isSupabaseConfigured || images !== null) return;
    void loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user?.id]);

  async function loadImages() {
    if (!user) return;
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(user.id, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const items: StoredImage[] = (data ?? [])
        .filter((f) => f.name !== ".emptyFolderPlaceholder")
        .map((f) => ({
          name: f.name,
          path: `${user.id}/${f.name}`,
          url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(`${user.id}/${f.name}`).data.publicUrl,
          size: (f.metadata as { size?: number } | null)?.size ?? 0,
          created_at: f.created_at || new Date().toISOString(),
        }));
      setImages(items);
    } catch {
      setImages([]);
    }
  }

  // ── Project actions ──────────────────────────────────────────────────────────

  async function handleDeleteProject(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    const { error } = await supabase.from("ai_projects").delete().eq("id", id);
    if (error) { toast.error("Delete failed", { description: error.message }); return; }
    setProjects((p) => p?.filter((x) => x.id !== id) ?? []);
    toast.success("Project deleted");
  }

  async function handleDownloadProject(project: AiProject) {
    if (!project.files) { toast.error("No files to download"); return; }
    try {
      const { exportPlaygroundZip } = await import("@/lib/export-zip");
      const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "kanyoai-site";
      await exportPlaygroundZip(slug, project.files.html ?? "", project.files.css ?? "", project.files.js ?? "");
      toast.success("ZIP downloaded");
    } catch { toast.error("Download failed"); }
  }

  // ── Image actions ────────────────────────────────────────────────────────────

  async function handleUploadImage(fileList: FileList | null) {
    if (!fileList?.length || !user) return;
    const file = Array.from(fileList).find((f) => f.type.startsWith("image/"));
    if (!file) { toast.error("Upload image files only"); return; }
    setUploadingImage(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type });
      if (error) throw error;
      toast.success("Image uploaded");
      await loadImages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed",
        { description: "Make sure the 'user-images' Supabase Storage bucket exists and is set to public." },
      );
    } finally {
      setUploadingImage(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function handleGenerateImage() {
    if (!imagePrompt.trim()) { toast.error("Enter a prompt first"); return; }
    if (!user) { toast.error("Sign in to generate images"); return; }
    setGeneratingImage(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in to generate images.");

      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: imagePrompt, size: imageSize, quality: genQuality }),
      });
      const json = await res.json() as { b64?: string; revisedPrompt?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "Generation failed");

      // Convert base64 → Blob → upload to Supabase Storage
      const binary = atob(json.b64!);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/png" });

      const path = `${user.id}/ai-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: "image/png" });
      if (uploadError) throw uploadError;

      toast.success("Image generated and saved to library");
      if (json.revisedPrompt && json.revisedPrompt !== imagePrompt) {
        toast.info("Prompt refined by AI", { description: json.revisedPrompt });
      }
      setImagePrompt("");
      await loadImages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  async function handleDeleteImage(img: StoredImage) {
    if (!confirm(`Delete "${img.name}"? This cannot be undone.`)) return;
    setDeletingImagePath(img.path);
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([img.path]);
      if (error) throw error;
      setImages((prev) => prev?.filter((x) => x.path !== img.path) ?? []);
      toast.success("Image deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingImagePath(null);
    }
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    toast.success("URL copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    toast.success("Settings saved");
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const now = new Date();
  const thisMonth = (projects ?? []).filter((p) => {
    const d = new Date(p.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const modelUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects ?? []) { const m = p.model || "unknown"; counts[m] = (counts[m] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [projects]);

  const kindUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of projects ?? []) { const k = p.kind || "other"; counts[k] = (counts[k] || 0) + 1; }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [projects]);

  const filtered = useMemo(() => {
    if (!projects) return null;
    const q = query.trim().toLowerCase();
    const list = q ? projects.filter((p) => p.title.toLowerCase().includes(q) || p.kind.toLowerCase().includes(q)) : [...projects];
    list.sort((a, b) => {
      switch (sort) {
        case "updated_asc": return +new Date(a.updated_at) - +new Date(b.updated_at);
        case "name_asc":    return a.title.localeCompare(b.title);
        case "name_desc":   return b.title.localeCompare(a.title);
        default:            return +new Date(b.updated_at) - +new Date(a.updated_at);
      }
    });
    return list;
  }, [projects, query, sort]);

  const isLoading = authLoading && !user;
  const preferredModelLabel = SETTINGS_MODELS.find((m) => m.id === settings.preferredModel)?.label ?? "GPT-5.4 Mini";

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Dashboard</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold md:text-4xl">
                {isLoading ? (
                  <span className="inline-block h-9 w-48 animate-pulse rounded-lg bg-muted" />
                ) : (
                  settings.displayName || user?.email?.split("@")[0] || "My workspace"
                )}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Link to="/ai">
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" /> New project
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab nav */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="flex gap-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t.label}
                {t.id === "projects" && projects !== null && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {projects.length}
                  </span>
                )}
                {t.id === "images" && images !== null && images.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {images.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">

        {tab === "overview" && (
          <OverviewTab
            loading={isLoading}
            projects={projects}
            images={images}
            thisMonth={thisMonth}
            preferredModelLabel={preferredModelLabel}
            modelUsage={modelUsage}
            kindUsage={kindUsage}
            onTabChange={setTab}
            onDownload={handleDownloadProject}
          />
        )}

        {tab === "projects" && (
          <ProjectsTab
            projects={projects}
            filtered={filtered}
            query={query}
            sort={sort}
            onQuery={setQuery}
            onSort={setSort}
            onDelete={handleDeleteProject}
            onDownload={handleDownloadProject}
          />
        )}

        {tab === "images" && (
          <ImagesTab
            images={images}
            uploadRef={uploadRef}
            imagePrompt={imagePrompt}
            imageSize={imageSize}
            genQuality={genQuality}
            generatingImage={generatingImage}
            uploadingImage={uploadingImage}
            deletingImagePath={deletingImagePath}
            copied={copied}
            onPromptChange={setImagePrompt}
            onSizeChange={setImageSize}
            onQualityChange={setGenQuality}
            onGenerate={handleGenerateImage}
            onUpload={handleUploadImage}
            onDelete={handleDeleteImage}
            onCopyUrl={copyUrl}
          />
        )}

        {tab === "settings" && (
          <SettingsTab
            user={user}
            settings={settings}
            onSave={updateSettings}
            onSignOut={() => void signOut().then(() => navigate({ to: "/" }))}
          />
        )}
      </main>

      <input
        ref={uploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleUploadImage(e.target.files)}
      />
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  loading, projects, images, thisMonth, preferredModelLabel, modelUsage, kindUsage, onTabChange, onDownload,
}: {
  loading: boolean;
  projects: AiProject[] | null;
  images: StoredImage[] | null;
  thisMonth: number;
  preferredModelLabel: string;
  modelUsage: [string, number][];
  kindUsage: [string, number][];
  onTabChange: (t: DashTab) => void;
  onDownload: (p: AiProject) => void;
}) {
  const total = projects?.length ?? 0;
  const maxKind = kindUsage[0]?.[1] ?? 1;

  const STATS = [
    { label: "Total projects", value: loading ? null : total,                         icon: FolderOpen, color: "text-blue-500",   bg: "bg-blue-500/10" },
    { label: "Saved images",   value: loading ? null : images?.length ?? "—",          icon: ImageIcon,  color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "This month",     value: loading ? null : thisMonth,                      icon: Zap,        color: "text-green-500",  bg: "bg-green-500/10" },
    { label: "Preferred model",value: loading ? null : preferredModelLabel,            icon: Star,       color: "text-amber-500",  bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            {s.value === null ? (
              <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold">{s.value}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link to="/ai" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Sparkles className="h-5 w-5 text-primary" /></span>
            <div>
              <p className="font-medium text-sm">New AI project</p>
              <p className="text-xs text-muted-foreground">Generate a website</p>
            </div>
          </Link>
          <Link to="/playground" className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500/10"><Wand2 className="h-5 w-5 text-green-500" /></span>
            <div>
              <p className="font-medium text-sm">Playground</p>
              <p className="text-xs text-muted-foreground">Edit code directly</p>
            </div>
          </Link>
          <button type="button" onClick={() => onTabChange("images")} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10"><ImagePlus className="h-5 w-5 text-violet-500" /></span>
            <div>
              <p className="font-medium text-sm">Image library</p>
              <p className="text-xs text-muted-foreground">Upload or generate images</p>
            </div>
          </button>
        </div>
      </div>

      {/* Analytics row */}
      {(kindUsage.length > 0 || modelUsage.length > 0) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Projects by type */}
          {kindUsage.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">Projects by type</h3>
              <div className="space-y-2.5">
                {kindUsage.map(([kind, count]) => (
                  <div key={kind}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize font-medium">{kind}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round((count / maxKind) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Models used */}
          {modelUsage.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">Models used</h3>
              <div className="space-y-2.5">
                {modelUsage.map(([model, count], i) => (
                  <div key={model} className="flex items-center gap-3">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs">{model}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent projects */}
      {projects && projects.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent projects</h2>
            <button type="button" onClick={() => onTabChange("projects")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {projects.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.kind} · {p.model || "—"}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true })}
                  </span>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={!p.files} onClick={() => void onDownload(p)}>
                    <Download className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Download</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features strip */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
        <h3 className="mb-1 font-semibold">What you can do with kanyoai</h3>
        <p className="mb-5 text-sm text-muted-foreground">Everything you need to build and ship websites fast.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Sparkles, title: "AI Generator",  desc: "Full site from a brief in seconds" },
            { icon: Wand2,     title: "Playground",    desc: "Edit HTML, CSS, JS live" },
            { icon: ImageIcon, title: "Image Library", desc: "Generate & host images with URLs" },
            { icon: Download,  title: "Clean Exports", desc: "ZIP with HTML, CSS, JS — yours to keep" },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
              <f.icon className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold">{f.title}</p>
              <p className="text-[11px] text-muted-foreground leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Projects tab ─────────────────────────────────────────────────────────────

function ProjectsTab({
  projects, filtered, query, sort, onQuery, onSort, onDelete, onDownload,
}: {
  projects: AiProject[] | null;
  filtered: AiProject[] | null;
  query: string;
  sort: SortKey;
  onQuery: (v: string) => void;
  onSort: (v: SortKey) => void;
  onDelete: (id: string) => void;
  onDownload: (p: AiProject) => void;
}) {
  if (projects === null) {
    return <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading projects…</div>;
  }
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-14 text-center">
        <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-4 font-display text-xl font-semibold">No projects yet</p>
        <p className="mt-2 text-sm text-muted-foreground">Generate a website with AI and save it to your account.</p>
        <Link to="/ai"><Button className="mt-5 gap-2"><Sparkles className="h-4 w-4" /> Open AI Generator</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search projects…" className="pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort</span>
          <Select value={sort} onValueChange={(v) => onSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="updated_desc">Recently updated</SelectItem>
              <SelectItem value="updated_asc">Oldest updated</SelectItem>
              <SelectItem value="name_asc">Name A–Z</SelectItem>
              <SelectItem value="name_desc">Name Z–A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered && filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No projects match &ldquo;{query}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(filtered ?? []).map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={onDelete} onDownload={onDownload} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project, onDelete, onDownload,
}: {
  project: AiProject;
  onDelete: (id: string) => void;
  onDownload: (p: AiProject) => void;
}) {
  function openPreview() {
    const f = project.files;
    if (!f?.html) return;
    const html = (f.html || "") + (f.css ? `<style>${f.css}</style>` : "") + (f.js ? `<script>${f.js}<\/script>` : "");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const styleLabel = (project.style as { label?: string } | null)?.label;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-semibold">{project.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium capitalize text-primary">{project.kind}</span>
            {styleLabel && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{styleLabel}</span>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onDelete(project.id)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete project"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 font-mono text-[11px] text-muted-foreground">{project.model || "—"}</p>

      <p className="mt-auto inline-flex items-center gap-1 pt-4 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
      </p>

      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => void onDownload(project)} disabled={!project.files}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> ZIP
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={openPreview} disabled={!project.files?.html}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview
        </Button>
      </div>
    </article>
  );
}

// ─── Images tab ───────────────────────────────────────────────────────────────

function ImagesTab({
  images, uploadRef, imagePrompt, imageSize, genQuality,
  generatingImage, uploadingImage, deletingImagePath, copied,
  onPromptChange, onSizeChange, onQualityChange,
  onGenerate, onUpload, onDelete, onCopyUrl,
}: {
  images: StoredImage[] | null;
  uploadRef: React.RefObject<HTMLInputElement | null>;
  imagePrompt: string;
  imageSize: "1024x1024" | "1536x1024" | "1024x1536";
  genQuality: "standard" | "hd";
  generatingImage: boolean;
  uploadingImage: boolean;
  deletingImagePath: string | null;
  copied: string | null;
  onPromptChange: (v: string) => void;
  onSizeChange: (v: "1024x1024" | "1536x1024" | "1024x1536") => void;
  onQualityChange: (v: "standard" | "hd") => void;
  onGenerate: () => void;
  onUpload: (files: FileList | null) => void;
  onDelete: (img: StoredImage) => void;
  onCopyUrl: (url: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Images saved here get a permanent public URL you can paste into any website or give to the AI generator — they'll keep working in your exported code.
        <br />
        <span className="mt-1 block text-xs opacity-70">Requires a public Supabase Storage bucket named <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">user-images</code> in your project.</span>
      </div>

      {/* Upload + Generate */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

        {/* Upload */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-1 font-semibold">Upload image</h3>
          <p className="mb-4 text-sm text-muted-foreground">PNG, JPG, WebP or GIF · Saved to your library with a permanent URL.</p>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            disabled={uploadingImage}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border py-10 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
          >
            {uploadingImage ? (
              <><Loader2 className="h-7 w-7 animate-spin text-primary" /><span className="text-sm">Uploading…</span></>
            ) : (
              <><Upload className="h-7 w-7" /><span className="text-sm font-medium">Click to upload</span></>
            )}
          </button>
        </div>

        {/* AI Generate */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-1 font-semibold">Generate with AI</h3>
          <p className="mb-4 text-sm text-muted-foreground">Describe an image and the AI will create it using gpt-image-2. It's automatically saved to your library.</p>
          <div className="space-y-3">
            <Textarea
              value={imagePrompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="e.g. Minimalist product photo of a glass perfume bottle on white marble, soft lighting, high-end editorial style"
              rows={3}
              className="resize-none text-sm"
              disabled={generatingImage}
            />
            <div className="flex gap-2">
              <Select value={imageSize} onValueChange={(v) => onSizeChange(v as typeof imageSize)}>
                <SelectTrigger className="h-9 flex-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024x1024">Square (1:1)</SelectItem>
                  <SelectItem value="1536x1024">Landscape (3:2)</SelectItem>
                  <SelectItem value="1024x1536">Portrait (2:3)</SelectItem>
                </SelectContent>
              </Select>
              <Select value={genQuality} onValueChange={(v) => onQualityChange(v as typeof genQuality)}>
                <SelectTrigger className="h-9 w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="hd">HD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="w-full gap-2"
              disabled={generatingImage || !imagePrompt.trim()}
              onClick={onGenerate}
            >
              {generatingImage ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate image</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Image gallery */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your image library</h3>
        {images === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">No images yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Upload or generate your first image above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <div key={img.path} className="group relative overflow-hidden rounded-xl border border-border bg-muted aspect-square">
                <img src={img.url} alt={img.name} className="h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex flex-col justify-between bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/60 group-hover:opacity-100">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void onDelete(img)}
                      disabled={deletingImagePath === img.path}
                      className="rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-red-500/80"
                    >
                      {deletingImagePath === img.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <p className="truncate text-[11px] text-white/80">{img.name}</p>
                    <button
                      type="button"
                      onClick={() => void onCopyUrl(img.url)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/20 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                    >
                      {copied === img.url ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy URL</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  user, settings, onSave, onSignOut,
}: {
  user: ReturnType<typeof useAuth>["user"];
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings>) => void;
  onSignOut: () => void;
}) {
  const [displayName, setDisplayName] = useState(settings.displayName);

  return (
    <div className="max-w-2xl space-y-8">

      {/* Account */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">Account</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Email</label>
            <Input value={user?.email ?? "—"} disabled className="bg-muted/40" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted-foreground">Display name</label>
            <div className="flex gap-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or workspace name"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => onSave({ displayName })}
                disabled={displayName === settings.displayName}
              >
                Save
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Shown at the top of your dashboard.</p>
          </div>
        </div>
      </section>

      {/* AI model preference */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 font-semibold">AI model preference</h2>
        <p className="mb-5 text-sm text-muted-foreground">This sets the default model in the AI Generator. You can still change it per project.</p>
        <div className="grid grid-cols-2 gap-3">
          {SETTINGS_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSave({ preferredModel: m.id })}
              className={[
                "rounded-xl border p-4 text-left transition-all",
                settings.preferredModel === m.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-muted-foreground/40",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{m.label}</span>
                <span className={[
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  m.badge === "Latest" ? "bg-blue-500/15 text-blue-600" :
                  m.badge === "Popular" ? "bg-green-500/15 text-green-600" :
                  m.badge === "Default" ? "bg-primary/15 text-primary" :
                  "bg-muted text-muted-foreground",
                ].join(" ")}>{m.badge}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
              {settings.preferredModel === m.id && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-primary font-medium">
                  <Check className="h-3 w-3" /> Selected
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Models are powered by OpenAI. GPT-5.5 gives the best output for complex sites. GPT-5.4 Mini is the balanced default. GPT-5.4 Nano is the fastest and most affordable.
        </p>
      </section>

      {/* Danger zone */}
      <section className="rounded-xl border border-destructive/30 bg-card p-6">
        <h2 className="mb-1 font-semibold text-destructive">Sign out</h2>
        <p className="mb-4 text-sm text-muted-foreground">Your projects and images stay saved in your account.</p>
        <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={onSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </section>
    </div>
  );
}
