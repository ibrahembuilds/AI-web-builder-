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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

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

function kindBadge(kind: string) {
  const colors: Record<string, string> = {
    portfolio: "bg-sky-50 text-sky-700 ring-sky-200",
    landing: "bg-violet-50 text-violet-700 ring-violet-200",
    business: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    saas: "bg-blue-50 text-blue-700 ring-blue-200",
    commerce: "bg-amber-50 text-amber-700 ring-amber-200",
    funnel: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    workshop: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    events: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return colors[kind] ?? "bg-slate-100 text-slate-700 ring-slate-200";
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
      if (!user?.id || !isSupabaseConfigured) {
        setImages([]);
        setImagesLoaded(true);
        return;
      }
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
    if ((activeTab === "overview" || activeTab === "images") && !imagesLoaded && !imagesLoading) {
      void loadImages();
    }
  }, [activeTab, imagesLoaded, imagesLoading, loadImages]);

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
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(url, "_blank");
      window.setTimeout(() => URL.revokeObjectURL(url), 15000);
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1480px]">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white xl:flex xl:flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <Link to="/" className="inline-flex items-center gap-2 font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              kanyoai
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5" aria-label="Dashboard">
            {NAV_ITEMS.map((item) => (
              <DashboardTabButton
                key={item.id}
                item={item}
                active={activeTab === item.id}
                count={
                  item.id === "projects"
                    ? projects.length
                    : item.id === "images" && imagesLoaded
                      ? images.length
                      : undefined
                }
                onClick={() => goToTab(item.id)}
              />
            ))}

            <div className="my-4 border-t border-slate-200" />
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link to="/ai">
                <Wand2 className="h-4 w-4" />
                AI generator
              </Link>
            </Button>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-slate-600"
              onClick={() => void signOut().then(() => navigate({ to: "/" }))}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dashboard
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {tabTitle(activeTab)}
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/playground">Playground</Link>
                </Button>
                <Button asChild>
                  <Link to="/ai">
                    <Sparkles className="h-4 w-4" />
                    New project
                  </Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="border-b border-slate-200 bg-white px-3 py-2 xl:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {NAV_ITEMS.map((item) => (
                <DashboardTabButton
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  compact
                  onClick={() => goToTab(item.id)}
                />
              ))}
            </div>
          </div>

          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
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
                onSignOut={() => void signOut().then(() => navigate({ to: "/" }))}
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
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
      className={[
        "inline-flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
        compact ? "shrink-0 px-3 py-2" : "w-full px-3 py-2.5",
        active
          ? "bg-slate-950 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {item.label}
      {typeof count === "number" && !compact && (
        <span
          className={active ? "ml-auto text-xs text-white/70" : "ml-auto text-xs text-slate-400"}
        >
          {count}
        </span>
      )}
    </button>
  );
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
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Recent projects</h2>
              <p className="text-sm text-slate-500">
                Continue or export your latest generated sites.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onTab("projects")}>
              View all
            </Button>
          </div>

          {projectsLoading ? (
            <SkeletonRows />
          ) : recent.length === 0 ? (
            <EmptyState
              Icon={FolderOpen}
              title="No projects yet"
              body="Generate your first website and it will appear here."
              action={
                <Button asChild>
                  <Link to="/ai">Open generator</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
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
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-4 grid gap-3">
            <Button asChild className="justify-start">
              <Link to="/ai">
                <Sparkles className="h-4 w-4" />
                Create website
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => onTab("images")}
            >
              <ImageIcon className="h-4 w-4" />
              Open image library
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/playground">
                <Wand2 className="h-4 w-4" />
                Open playground
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
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
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          {value === null ? (
            <div className="mt-3 h-7 w-20 animate-pulse rounded bg-slate-100" />
          ) : (
            <p className="mt-2 truncate text-2xl font-semibold">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search projects"
              className="pl-9"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as SortKey)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="updated_desc">Recently updated</option>
            <option value="updated_asc">Oldest updated</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </section>

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
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
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
            <p className="text-sm text-slate-500">
              Showing the latest {visible.length} projects to keep the dashboard fast.
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
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{project.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`rounded px-2 py-1 text-xs font-medium capitalize ring-1 ${kindBadge(project.kind)}`}
            >
              {project.kind}
            </span>
            {project.model && (
              <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-500">
                {project.model}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          disabled={deleting}
          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-wait"
          aria-label="Delete project"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
      </p>

      <div className="mt-4 flex gap-2">
        <Button type="button" size="sm" className="flex-1" onClick={() => onEdit(project)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onPreview(project)}
          disabled={previewing}
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
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{project.title}</p>
        <p className="mt-1 text-xs capitalize text-slate-500">{project.kind}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => onEdit(project)}>
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void onDownload(project)}
          disabled={downloading}
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
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="font-semibold">Generate image</h2>
          <p className="mt-1 text-sm text-slate-500">
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
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="1024x1024">Square</option>
                <option value="1536x1024">Landscape</option>
                <option value="1024x1536">Portrait</option>
              </select>
              <select
                value={imageQuality}
                onChange={(event) => onQuality(event.target.value as ImageQuality)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400"
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

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Image library</h2>
              <p className="mt-1 text-sm text-slate-500">
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
          <p className="mt-3 text-xs text-slate-500">
            Files are loaded lazily and capped on screen so opening this tab does not freeze the
            dashboard.
          </p>
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
            <p className="text-sm text-slate-500">
              Showing the latest {visible.length} images. Use refresh after deleting or uploading.
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
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      style={{ contentVisibility: "auto" }}
    >
      <div className="aspect-square bg-slate-100">
        <img
          src={image.url}
          alt={image.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="space-y-2 p-2.5">
        <p className="truncate text-xs text-slate-500" title={image.name}>
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
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 flex items-center gap-3">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 font-semibold text-white">
              {avatarLetter}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">
              {settings.displayName || user?.email?.split("@")[0]}
            </p>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white hover:border-slate-400",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{model.label}</span>
                <span
                  className={
                    settings.preferredModel === model.id
                      ? "text-xs text-white/70"
                      : "text-xs text-slate-500"
                  }
                >
                  {model.badge}
                </span>
              </div>
              <p
                className={
                  settings.preferredModel === model.id
                    ? "mt-2 text-sm text-white/70"
                    : "mt-2 text-sm text-slate-500"
                }
              >
                {model.note}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-red-700">Sign out</h2>
        <p className="mt-1 text-sm text-slate-500">Sign out from this device.</p>
        <Button type="button" variant="destructive" className="mt-4" onClick={onSignOut}>
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <Icon className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{body}</p>
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-5">
      <h2 className="font-semibold text-red-700">{title}</h2>
      <p className="mt-1 text-sm text-red-700/80">{body}</p>
      <Button type="button" variant="outline" className="mt-4 bg-white" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-44 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}

function ImageSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="aspect-square animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}
