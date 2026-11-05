import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  Code2,
  ArrowRight,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  LogOut,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { toast } from "sonner";

import { KanyoLogo } from "@/components/kanyo-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { openSandboxedPreview } from "@/lib/preview";

type DashTab = "overview" | "projects" | "images" | "settings";
type SortKey = "updated_desc" | "updated_asc" | "name_asc" | "name_desc";
type DashboardSearch = { tab?: DashTab };
type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";
type ImageQuality = "low" | "medium" | "high";

type AiProject = {
  id: string;
  title: string;
  kind: string;
  model: string | null;
  updated_at: string;
  created_at: string;
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
type ProjectAction =
  | { type: "delete"; id: string }
  | { type: "download"; id: string }
  | { type: "preview"; id: string };

const SETTINGS_KEY = "kanyoai.settings.v1";
const STORAGE_BUCKET = "user-images";
const MAX_IMAGES = 80;
const MAX_RENDERED_IMAGES = 48;
const MAX_RENDERED_PROJECTS = 120;

const NAV_ITEMS: Array<{ id: DashTab; label: string; Icon: ElementType }> = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "projects", label: "Projects", Icon: FolderOpen },
  { id: "images", label: "Images", Icon: ImageIcon },
  { id: "settings", label: "Settings", Icon: Settings },
];

const SETTINGS_MODELS = [
  { id: "flagship", label: "GPT-5.5", badge: "Flagship", note: "Best for complex sites" },
  { id: "budget", label: "GPT-5.4 Mini", badge: "Default", note: "Balanced speed and quality" },
  { id: "grok", label: "Grok 4.3", badge: "xAI", note: "Fast reasoning model" },
  {
    id: "deepseek-pro",
    label: "DeepSeek v4 Pro",
    badge: "DeepSeek",
    note: "High quality generation",
  },
  {
    id: "deepseek-flash",
    label: "DeepSeek v4 Flash",
    badge: "Fast",
    note: "Fastest DeepSeek option",
  },
];

function isDashTab(value: unknown): value is DashTab {
  return value === "overview" || value === "projects" || value === "images" || value === "settings";
}

function dashboardTabSearch(tab: DashTab): DashboardSearch {
  return tab === "overview" ? {} : { tab };
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { preferredModel: "budget", displayName: "", ...JSON.parse(raw) };
  } catch {
    // Ignore malformed local settings.
  }
  return { preferredModel: "budget", displayName: "" };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function safeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kanyoai-site"
  );
}

const KIND_LABELS: Record<string, string> = {
  portfolio: "Portfolio",
  landing: "Landing page",
  business: "Business",
  saas: "SaaS",
  commerce: "Commerce",
  funnel: "Funnel",
  workshop: "Workshop",
  events: "Events",
};

function kindLabel(kind: string) {
  return KIND_LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);
}

function kindBadge(kind: string) {
  const colors: Record<string, string> = {
    portfolio: "bg-sky-500/10 text-sky-700 ring-sky-500/20",
    landing: "bg-violet-500/10 text-violet-700 ring-violet-500/20",
    business: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20",
    saas: "bg-blue-500/10 text-blue-700 ring-blue-500/20",
    commerce: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
    funnel: "bg-fuchsia-500/10 text-fuchsia-700 ring-fuchsia-500/20",
    workshop: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/20",
    events: "bg-rose-500/10 text-rose-700 ring-rose-500/20",
  };
  return colors[kind] ?? "bg-muted text-muted-foreground ring-border";
}

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    tab: isDashTab(search.tab) ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Dashboard - kanyoai" },
      { name: "description", content: "Manage your kanyoai projects, images, and settings." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activeTab = search.tab ?? "overview";

  const [projects, setProjects] = useState<AiProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [images, setImages] = useState<StoredImage[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated_desc");
  const [projectAction, setProjectAction] = useState<ProjectAction | null>(null);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("1024x1024");
  const [imageQuality, setImageQuality] = useState<ImageQuality>("medium");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImagePath, setDeletingImagePath] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const uploadRef = useRef<HTMLInputElement | null>(null);

  const loadProjects = useCallback(async () => {
    if (!user?.id || !isSupabaseConfigured) {
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const { data, error } = await supabase
        .from("ai_projects")
        .select("id,title,kind,model,updated_at,created_at,style")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setProjects((data as AiProject[]) ?? []);
    } catch (err) {
      setProjects([]);
      setProjectsError(err instanceof Error ? err.message : "Could not load projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, [user?.id]);

  const loadImages = useCallback(
    async (force = false) => {
      // Auth may still be resolving on first render. Do not mark the library as
      // loaded until we have actually queried it for a signed-in user.
      if (!user?.id || !isSupabaseConfigured) return;
      if (imagesLoading && !force) return;

      setImagesLoading(true);
      setImagesError(null);
      try {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .list(user.id, { limit: MAX_IMAGES, sortBy: { column: "created_at", order: "desc" } });

        if (error) throw error;
        const items = (data ?? [])
          .filter((file) => file.name !== ".emptyFolderPlaceholder")
          .map((file) => {
            const path = `${user.id}/${file.name}`;
            return {
              name: file.name,
              path,
              url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl,
              size: (file.metadata as { size?: number } | null)?.size ?? 0,
              created_at: file.created_at || new Date().toISOString(),
            };
          });
        setImages(items);
        setImagesLoaded(true);
      } catch (err) {
        setImages([]);
        setImagesLoaded(true);
        setImagesError(err instanceof Error ? err.message : "Could not load image library.");
      } finally {
        setImagesLoading(false);
      }
    },
    [imagesLoading, user?.id],
  );

  useEffect(() => {
    if (!authLoading && !user?.id) {
      void navigate({ to: "/login", search: { redirect: "/dashboard" }, replace: true });
    }
  }, [authLoading, navigate, user?.id]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!user?.id) return;
    if ((activeTab === "overview" || activeTab === "images") && !imagesLoaded && !imagesLoading) {
      void loadImages();
    }
  }, [activeTab, imagesLoaded, imagesLoading, loadImages, user?.id]);

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const nextProfile = data as { full_name: string | null; avatar_url: string | null };
        setProfile(nextProfile);
        if (nextProfile.full_name) {
          setSettings((current) => {
            if (current.displayName) return current;
            const next = { ...current, displayName: nextProfile.full_name ?? "" };
            saveSettings(next);
            return next;
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  function goToTab(tab: DashTab) {
    void navigate({ to: "/dashboard", search: dashboardTabSearch(tab), replace: true });
  }

  function handleEditProject(project: AiProject) {
    sessionStorage.setItem(
      "kanyoai.resume_project",
      JSON.stringify({
        id: project.id,
        kind: project.kind,
        model: project.model,
        style: project.style,
        title: project.title,
      }),
    );
    void navigate({ to: "/ai" });
  }

  async function fetchProjectFiles(
    id: string,
  ): Promise<{ html: string; css: string; js: string } | null> {
    const { data, error } = await supabase
      .from("ai_projects")
      .select("files")
      .eq("id", id)
      .single();
    if (error || !data?.files) return null;
    const files = data.files as { html?: string; css?: string; js?: string };
    return { html: files.html ?? "", css: files.css ?? "", js: files.js ?? "" };
  }

  async function downloadProject(project: AiProject) {
    setProjectAction({ type: "download", id: project.id });
    const toastId = toast.loading("Preparing download...");
    try {
      const files = await fetchProjectFiles(project.id);
      if (!files) {
        toast.error("No files to download", { id: toastId });
        return;
      }
      const { exportPlaygroundZip } = await import("@/lib/export-zip");
      await exportPlaygroundZip(safeSlug(project.title), files.html, files.css, files.js);
      toast.success("ZIP downloaded", { id: toastId });
    } catch {
      toast.error("Download failed", { id: toastId });
    } finally {
      setProjectAction(null);
    }
  }

  async function previewProject(project: AiProject) {
    setProjectAction({ type: "preview", id: project.id });
    const toastId = toast.loading("Opening preview...");
    try {
      const files = await fetchProjectFiles(project.id);
      if (!files?.html) {
        toast.error("No preview available", { id: toastId });
        return;
      }
      const html =
        files.html +
        (files.css ? `<style>${files.css}</style>` : "") +
        (files.js ? `<script>${files.js}</script>` : "");
      if (!openSandboxedPreview(html, project.title)) {
        toast.error("Pop-up blocked — allow pop-ups and try again.", { id: toastId });
        return;
      }
      toast.success("Preview opened", { id: toastId });
    } catch {
      toast.error("Preview failed", { id: toastId });
    } finally {
      setProjectAction(null);
    }
  }

  function confirmDeleteProject(id: string) {
    toast("Delete this project?", {
      description: "This cannot be undone.",
      action: { label: "Delete", onClick: () => void deleteProject(id) },
      duration: 8000,
    });
  }

  async function deleteProject(id: string) {
    setProjectAction({ type: "delete", id });
    try {
      const { error } = await supabase.from("ai_projects").delete().eq("id", id);
      if (error) throw error;
      setProjects((current) => current.filter((project) => project.id !== id));
      toast.success("Project deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setProjectAction(null);
    }
  }

  async function uploadImage(fileList: FileList | null) {
    if (!fileList?.length || !user?.id) return;
    const file = Array.from(fileList).find((item) => item.type.startsWith("image/"));
    if (!file) {
      toast.error("Upload image files only");
      return;
    }

    setUploadingImage(true);
    try {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      toast.success("Image uploaded");
      await loadImages(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  async function generateImage() {
    if (!imagePrompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }
    if (!user?.id) {
      toast.error("Sign in to generate images");
      return;
    }

    setGeneratingImage(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in to generate images.");

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: imagePrompt, size: imageSize, quality: imageQuality }),
      });
      const json = (await response.json()) as {
        b64?: string;
        revisedPrompt?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(json.error || "Generation failed");
      if (!json.b64) throw new Error("No image data returned.");

      const binary = atob(json.b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

      const path = `${user.id}/ai-${Date.now()}.png`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, new Blob([bytes], { type: "image/png" }), { contentType: "image/png" });
      if (error) throw error;

      toast.success("Image generated and saved");
      setImagePrompt("");
      await loadImages(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setGeneratingImage(false);
    }
  }

  function confirmDeleteImage(image: StoredImage) {
    toast(`Delete "${image.name}"?`, {
      action: { label: "Delete", onClick: () => void deleteImage(image) },
      duration: 8000,
    });
  }

  async function deleteImage(image: StoredImage) {
    setDeletingImagePath(image.path);
    try {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([image.path]);
      if (error) throw error;
      setImages((current) => current.filter((item) => item.path !== image.path));
      toast.success("Image deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingImagePath(null);
    }
  }

  async function copyImageUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("URL copied");
      window.setTimeout(() => setCopiedUrl(null), 1800);
    } catch {
      toast.error("Could not copy URL");
    }
  }

  async function updateSettings(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    if ("displayName" in patch && user?.id && isSupabaseConfigured) {
      await supabase
        .from("profiles")
        .update({ full_name: patch.displayName ?? "" })
        .eq("id", user.id);
    }
    toast.success("Settings saved");
  }

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? projects.filter(
          (project) =>
            project.title.toLowerCase().includes(term) || project.kind.toLowerCase().includes(term),
        )
      : [...projects];

    list.sort((a, b) => {
      switch (sort) {
        case "updated_asc":
          return +new Date(a.updated_at) - +new Date(b.updated_at);
        case "name_asc":
          return a.title.localeCompare(b.title);
        case "name_desc":
          return b.title.localeCompare(a.title);
        default:
          return +new Date(b.updated_at) - +new Date(a.updated_at);
      }
    });

    return list;
  }, [projects, query, sort]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return projects.filter((project) => {
      const created = new Date(project.created_at);
      return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
    }).length;
  }, [projects]);

  const displayName = settings.displayName || user?.email?.split("@")[0] || "Workspace";
  const preferredModel =
    SETTINGS_MODELS.find((model) => model.id === settings.preferredModel)?.label ?? "GPT-5.4 Mini";

  if (authLoading && !user) {
    return <DashboardLoading title="Loading dashboard" />;
  }

  const firstName = displayName.split(" ")[0];
  const handleSignOut = () => void signOut().then(() => navigate({ to: "/" }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
          <div className="flex h-16 items-center px-5">
            <Link to="/" aria-label="kanyoai home" className="rounded-md">
              <KanyoLogo />
            </Link>
          </div>

          <div className="px-3">
            <Button asChild className="w-full">
              <Link to="/ai">
                <Sparkles className="h-4 w-4" />
                New project
              </Link>
            </Button>
          </div>

          <nav className="flex-1 space-y-0.5 px-3 py-5" aria-label="Dashboard">
            <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">Workspace</p>
            {NAV_ITEMS.map((item) => (
              <DashboardTabButton
                key={item.id}
                item={item}
                active={activeTab === item.id}
                count={
                  item.id === "projects"
                    ? projectsLoading
                      ? undefined
                      : projects.length
                    : item.id === "images" && imagesLoaded
                      ? images.length
                      : undefined
                }
                onClick={() => goToTab(item.id)}
              />
            ))}

            <p className="px-3 pb-2 pt-6 text-xs font-medium text-muted-foreground">Tools</p>
            <Link
              to="/ai"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Wand2 className="h-4 w-4" />
              AI generator
            </Link>
            <Link
              to="/playground"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Code2 className="h-4 w-4" />
              Playground
            </Link>
          </nav>

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-lg p-2">
              <Avatar url={profile?.avatar_url} letter={displayName.charAt(0)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Mobile / tablet top bar */}
          <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between gap-3 px-4">
              <Link to="/" aria-label="kanyoai home">
                <KanyoLogo markClassName="h-7 w-7" />
              </Link>
              <div className="flex items-center gap-2">
                <Button asChild size="sm">
                  <Link to="/ai">
                    <Sparkles className="h-4 w-4" />
                    New
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md border border-border p-2 text-muted-foreground"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Dashboard">
              {NAV_ITEMS.map((item) => (
                <DashboardTabButton
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  compact
                  onClick={() => goToTab(item.id)}
                />
              ))}
            </nav>
          </div>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">
                  {activeTab === "overview" ? `Welcome back, ${firstName}` : tabTitle(activeTab)}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{tabSubtitle(activeTab)}</p>
              </div>
              {activeTab !== "settings" && (
                <div className="hidden gap-2 sm:flex">
                  <Button asChild variant="outline">
                    <Link to="/playground">
                      <Code2 className="h-4 w-4" />
                      Playground
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to="/ai">
                      <Sparkles className="h-4 w-4" />
                      New project
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {activeTab === "overview" && (
              <OverviewTab
                projects={projects}
                projectsLoading={projectsLoading}
                images={images}
                imagesLoaded={imagesLoaded}
                thisMonth={thisMonth}
                preferredModel={preferredModel}
                onTab={goToTab}
                onEdit={handleEditProject}
                onDownload={downloadProject}
                projectAction={projectAction}
              />
            )}

            {activeTab === "projects" && (
              <ProjectsTab
                projects={projects}
                filteredProjects={filteredProjects}
                loading={projectsLoading}
                error={projectsError}
                query={query}
                sort={sort}
                onQuery={setQuery}
                onSort={setSort}
                onRetry={loadProjects}
                onEdit={handleEditProject}
                onPreview={previewProject}
                onDownload={downloadProject}
                onDelete={confirmDeleteProject}
                projectAction={projectAction}
              />
            )}

            {activeTab === "images" && (
              <ImagesTab
                images={images}
                loaded={imagesLoaded}
                loading={imagesLoading}
                error={imagesError}
                imagePrompt={imagePrompt}
                imageSize={imageSize}
                imageQuality={imageQuality}
                generatingImage={generatingImage}
                uploadingImage={uploadingImage}
                deletingImagePath={deletingImagePath}
                copiedUrl={copiedUrl}
                onPrompt={setImagePrompt}
                onSize={setImageSize}
                onQuality={setImageQuality}
                onUploadClick={() => uploadRef.current?.click()}
                onGenerate={generateImage}
                onRetry={() => void loadImages(true)}
                onDelete={confirmDeleteImage}
                onCopy={copyImageUrl}
              />
            )}

            {activeTab === "settings" && (
              <SettingsTab
                user={user}
                profile={profile}
                settings={settings}
                onSave={updateSettings}
                onSignOut={handleSignOut}
              />
            )}
          </main>
        </section>
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => void uploadImage(event.target.files)}
      />
    </div>
  );
}

function DashboardLoading({ title }: { title: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {title}
      </div>
    </div>
  );
}

function DashboardTabButton({
  item,
  active,
  count,
  compact = false,
  onClick,
}: {
  item: { id: DashTab; label: string; Icon: ElementType };
  active: boolean;
  count?: number;
  compact?: boolean;
  onClick: () => void;
}) {
  const Icon = item.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "inline-flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
        compact
          ? "flex-1 justify-center gap-1.5 px-2 py-1.5 sm:flex-none sm:px-3"
          : "w-full px-3 py-2",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      ].join(" ")}
    >
      <Icon className={compact ? "hidden h-4 w-4 sm:block" : "h-4 w-4"} />
      {item.label}
      {typeof count === "number" && !compact && (
        <span
          className={[
            "ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums",
            active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function Avatar({
  url,
  letter,
  size = "sm",
}: {
  url?: string | null;
  letter: string;
  size?: "sm" | "lg";
}) {
  const dims = size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-sm";
  return url ? (
    <img src={url} alt="" className={`${dims} shrink-0 rounded-full object-cover`} />
  ) : (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}
    >
      {letter.toUpperCase()}
    </div>
  );
}

function tabSubtitle(tab: DashTab) {
  switch (tab) {
    case "projects":
      return "Every website you have generated. Open one to keep editing.";
    case "images":
      return "Generate images or upload your own, then use their URLs in any site.";
    case "settings":
      return "Manage your profile, password, and default AI model.";
    default:
      return "Pick up where you left off, or start something new.";
  }
}

function tabTitle(tab: DashTab) {
  switch (tab) {
    case "projects":
      return "Projects";
    case "images":
      return "Images";
    case "settings":
      return "Settings";
    default:
      return "Workspace overview";
  }
}

function OverviewTab({
  projects,
  projectsLoading,
  images,
  imagesLoaded,
  thisMonth,
  preferredModel,
  onTab,
  onEdit,
  onDownload,
  projectAction,
}: {
  projects: AiProject[];
  projectsLoading: boolean;
  images: StoredImage[];
  imagesLoaded: boolean;
  thisMonth: number;
  preferredModel: string;
  onTab: (tab: DashTab) => void;
  onEdit: (project: AiProject) => void;
  onDownload: (project: AiProject) => void;
  projectAction: ProjectAction | null;
}) {
  const recent = projects.slice(0, 5);
  const recentImages = images.slice(0, 6);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Projects"
          value={projectsLoading ? null : projects.length}
          Icon={FolderOpen}
        />
        <StatCard
          label="Saved images"
          value={imagesLoaded ? images.length : null}
          Icon={ImageIcon}
        />
        <StatCard label="This month" value={projectsLoading ? null : thisMonth} Icon={Clock} />
        <StatCard label="Default model" value={preferredModel} Icon={Sparkles} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <Panel
          title="Recent projects"
          action={
            projects.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onTab("projects")}>
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : null
          }
        >
          {projectsLoading ? (
            <SkeletonRows />
          ) : recent.length === 0 ? (
            <EmptyState
              Icon={FolderOpen}
              title="No projects yet"
              body="Generate your first website and it will appear here."
              action={
                <Button asChild>
                  <Link to="/ai">
                    <Sparkles className="h-4 w-4" />
                    Create a website
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="-mx-1 divide-y divide-border">
              {recent.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onEdit={onEdit}
                  onDownload={onDownload}
                  action={projectAction}
                />
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Start something new">
            <div className="grid gap-2">
              <QuickAction
                to="/ai"
                Icon={Sparkles}
                title="Generate a website"
                body="Describe it and let AI build it"
                primary
              />
              <QuickAction
                onClick={() => onTab("images")}
                Icon={ImageIcon}
                title="Create an image"
                body="Generate or upload assets"
              />
              <QuickAction
                to="/playground"
                Icon={Code2}
                title="Open the playground"
                body="Write HTML, CSS, and JS by hand"
              />
            </div>
          </Panel>

          {recentImages.length > 0 && (
            <Panel
              title="Latest images"
              action={
                <Button type="button" variant="ghost" size="sm" onClick={() => onTab("images")}>
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              <div className="grid grid-cols-3 gap-2">
                {recentImages.map((image) => (
                  <img
                    key={image.path}
                    src={image.url}
                    alt={image.name}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full rounded-md border border-border bg-muted object-cover"
                  />
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex min-h-8 items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickAction({
  to,
  onClick,
  Icon,
  title,
  body,
  primary = false,
}: {
  to?: "/ai" | "/playground";
  onClick?: () => void;
  Icon: ElementType;
  title: string;
  body: string;
  primary?: boolean;
}) {
  const inner = (
    <>
      <span
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{body}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </>
  );
  const cls =
    "group flex w-full items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/50";
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number | null;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </div>
      {value === null ? (
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p
          className={[
            "mt-2 truncate font-display font-semibold tabular-nums",
            typeof value === "number" ? "text-3xl" : "text-xl leading-9",
          ].join(" ")}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function ProjectsTab({
  projects,
  filteredProjects,
  loading,
  error,
  query,
  sort,
  onQuery,
  onSort,
  onRetry,
  onEdit,
  onPreview,
  onDownload,
  onDelete,
  projectAction,
}: {
  projects: AiProject[];
  filteredProjects: AiProject[];
  loading: boolean;
  error: string | null;
  query: string;
  sort: SortKey;
  onQuery: (value: string) => void;
  onSort: (value: SortKey) => void;
  onRetry: () => void;
  onEdit: (project: AiProject) => void;
  onPreview: (project: AiProject) => void;
  onDownload: (project: AiProject) => void;
  onDelete: (id: string) => void;
  projectAction: ProjectAction | null;
}) {
  const visible = filteredProjects.slice(0, MAX_RENDERED_PROJECTS);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            className="bg-card pl-9"
          />
        </div>
        <select
          value={sort}
          onChange={(event) => onSort(event.target.value as SortKey)}
          aria-label="Sort projects"
          className="h-9 rounded-md border border-input bg-card px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="updated_desc">Recently updated</option>
          <option value="updated_asc">Oldest updated</option>
          <option value="name_asc">Name A-Z</option>
          <option value="name_desc">Name Z-A</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="bg-card"
          onClick={onRetry}
          disabled={loading}
          aria-label="Refresh projects"
          title="Refresh"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error ? (
        <ErrorState title="Projects could not load" body={error} onRetry={onRetry} />
      ) : loading ? (
        <SkeletonCards />
      ) : projects.length === 0 ? (
        <EmptyState
          Icon={FolderOpen}
          title="No projects yet"
          body="Generate a website and save it to your account."
          action={
            <Button asChild>
              <Link to="/ai">Open AI generator</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState Icon={Search} title="No matches" body={`No projects match "${query}".`} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {visible.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                action={projectAction}
                onEdit={onEdit}
                onPreview={onPreview}
                onDownload={onDownload}
                onDelete={onDelete}
              />
            ))}
          </div>
          {filteredProjects.length > visible.length && (
            <p className="text-sm text-muted-foreground">
              Showing your {visible.length} most relevant projects. Use search to find older ones.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  action,
  onEdit,
  onPreview,
  onDownload,
  onDelete,
}: {
  project: AiProject;
  action: ProjectAction | null;
  onEdit: (project: AiProject) => void;
  onPreview: (project: AiProject) => void;
  onDownload: (project: AiProject) => void;
  onDelete: (id: string) => void;
}) {
  const deleting = action?.type === "delete" && action.id === project.id;
  const downloading = action?.type === "download" && action.id === project.id;
  const previewing = action?.type === "preview" && action.id === project.id;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <ProjectMonogram project={project} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold" title={project.title}>
            {project.title}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          disabled={deleting}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-wait"
          aria-label={`Delete ${project.title}`}
          title="Delete project"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${kindBadge(project.kind)}`}
        >
          {kindLabel(project.kind)}
        </span>
        {project.style?.label && project.style.label !== kindLabel(project.kind) && (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {project.style.label}
          </span>
        )}
        {project.model && (
          <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {project.model}
          </span>
        )}
      </div>

      <div className="mt-5 flex gap-2 border-t border-border pt-4">
        <Button type="button" size="sm" className="flex-1" onClick={() => onEdit(project)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onPreview(project)}
          disabled={previewing}
          aria-label={`Preview ${project.title}`}
          title="Preview in new tab"
        >
          {previewing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onDownload(project)}
          disabled={downloading}
          aria-label={`Download ${project.title}`}
          title="Download ZIP"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    </article>
  );
}

function ProjectRow({
  project,
  action,
  onEdit,
  onDownload,
}: {
  project: AiProject;
  action: ProjectAction | null;
  onEdit: (project: AiProject) => void;
  onDownload: (project: AiProject) => void;
}) {
  const downloading = action?.type === "download" && action.id === project.id;
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <ProjectMonogram project={project} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{project.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {kindLabel(project.kind)} · Updated{" "}
          {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button type="button" size="sm" variant="outline" onClick={() => onEdit(project)}>
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void onDownload(project)}
          disabled={downloading}
          aria-label={`Download ${project.title}`}
          title="Download ZIP"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function ProjectMonogram({ project, size = "sm" }: { project: AiProject; size?: "sm" | "lg" }) {
  const letter = (project.title.trim().charAt(0) || "?").toUpperCase();
  return (
    <span
      className={[
        "flex shrink-0 items-center justify-center rounded-lg font-display font-semibold ring-1",
        size === "lg" ? "h-11 w-11 text-lg" : "h-9 w-9 text-sm",
        kindBadge(project.kind),
      ].join(" ")}
      aria-hidden="true"
    >
      {letter}
    </span>
  );
}

function ImagesTab({
  images,
  loaded,
  loading,
  error,
  imagePrompt,
  imageSize,
  imageQuality,
  generatingImage,
  uploadingImage,
  deletingImagePath,
  copiedUrl,
  onPrompt,
  onSize,
  onQuality,
  onUploadClick,
  onGenerate,
  onRetry,
  onDelete,
  onCopy,
}: {
  images: StoredImage[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  imagePrompt: string;
  imageSize: ImageSize;
  imageQuality: ImageQuality;
  generatingImage: boolean;
  uploadingImage: boolean;
  deletingImagePath: string | null;
  copiedUrl: string | null;
  onPrompt: (value: string) => void;
  onSize: (value: ImageSize) => void;
  onQuality: (value: ImageQuality) => void;
  onUploadClick: () => void;
  onGenerate: () => void;
  onRetry: () => void;
  onDelete: (image: StoredImage) => void;
  onCopy: (url: string) => void;
}) {
  const visible = images.slice(0, MAX_RENDERED_IMAGES);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold">Generate image</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creates a PNG with gpt-image-2 and saves it to your library.
          </p>
          <div className="mt-4 space-y-3">
            <Textarea
              value={imagePrompt}
              onChange={(event) => onPrompt(event.target.value)}
              placeholder="Minimal product photo on white marble, soft light"
              rows={4}
              disabled={generatingImage}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={imageSize}
                onChange={(event) => onSize(event.target.value as ImageSize)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="1024x1024">Square</option>
                <option value="1536x1024">Landscape</option>
                <option value="1024x1536">Portrait</option>
              </select>
              <select
                value={imageQuality}
                onChange={(event) => onQuality(event.target.value as ImageQuality)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="low">Low quality</option>
                <option value="medium">Medium quality</option>
                <option value="high">High quality</option>
              </select>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={onGenerate}
              disabled={generatingImage || !imagePrompt.trim()}
            >
              {generatingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generatingImage ? "Generating..." : "Generate image"}
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Image library</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {loaded ? `${images.length} saved images` : "Loading your saved images"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onUploadClick}
                disabled={uploadingImage}
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </Button>
              <Button type="button" variant="outline" onClick={onRetry} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </div>
        </section>
      </div>

      {error ? (
        <ErrorState title="Image library could not load" body={error} onRetry={onRetry} />
      ) : loading && !loaded ? (
        <ImageSkeleton />
      ) : images.length === 0 ? (
        <EmptyState
          Icon={ImageIcon}
          title="No images yet"
          body="Upload or generate your first image above."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {visible.map((image) => (
              <ImageTile
                key={image.path}
                image={image}
                deleting={deletingImagePath === image.path}
                copied={copiedUrl === image.url}
                onDelete={onDelete}
                onCopy={onCopy}
              />
            ))}
          </div>
          {images.length > visible.length && (
            <p className="text-sm text-muted-foreground">
              Showing your latest {visible.length} images.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ImageTile({
  image,
  deleting,
  copied,
  onDelete,
  onCopy,
}: {
  image: StoredImage;
  deleting: boolean;
  copied: boolean;
  onDelete: (image: StoredImage) => void;
  onCopy: (url: string) => void;
}) {
  return (
    <article
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      style={{ contentVisibility: "auto" }}
    >
      <div className="aspect-square bg-muted">
        <img
          src={image.url}
          alt={image.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="space-y-2 p-2.5">
        <p className="truncate text-xs text-muted-foreground" title={image.name}>
          {image.name}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => void onCopy(image.url)}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onDelete(image)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}

function SettingsTab({
  user,
  profile,
  settings,
  onSave,
  onSignOut,
}: {
  user: ReturnType<typeof useAuth>["user"];
  profile: { full_name: string | null; avatar_url: string | null } | null;
  settings: AppSettings;
  onSave: (patch: Partial<AppSettings>) => Promise<void>;
  onSignOut: () => void;
}) {
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setDisplayName(settings.displayName);
  }, [settings.displayName]);

  async function saveName() {
    setSavingName(true);
    try {
      await onSave({ displayName });
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setChangingPassword(false);
    }
  }

  const avatarLetter = (settings.displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl space-y-5">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-3">
          <Avatar url={profile?.avatar_url} letter={avatarLetter} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {settings.displayName || user?.email?.split("@")[0]}
            </p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Display name"
          />
          <Button
            type="button"
            onClick={() => void saveName()}
            disabled={savingName || displayName === settings.displayName}
          >
            {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save name"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Change password</h2>
        <div className="mt-4 grid gap-3">
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => void changePassword()}
            disabled={changingPassword || !newPassword || !confirmPassword}
          >
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">AI model preference</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SETTINGS_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => void onSave({ preferredModel: model.id })}
              className={[
                "rounded-lg border p-4 text-left transition-colors",
                settings.preferredModel === model.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{model.label}</span>
                <span
                  className={
                    settings.preferredModel === model.id
                      ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  }
                >
                  {model.badge}
                </span>
              </div>
              <p className={"mt-2 text-sm text-muted-foreground"}>{model.note}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">Sign out</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign out from this device.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </section>
    </div>
  );
}

function EmptyState({
  Icon,
  title,
  body,
  action,
}: {
  Icon: ElementType;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function ErrorState({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <h2 className="font-semibold text-destructive">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function ImageSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="aspect-square animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
