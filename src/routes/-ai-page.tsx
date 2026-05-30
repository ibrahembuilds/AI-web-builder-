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
  MessageSquare,
  Monitor,
  Palette,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ─── types ────────────────────────────────────────────────────────────────────

type Phase = "build" | "workspace";
type DeviceMode = "desktop" | "tablet" | "mobile";
type SiteKind =
  | "portfolio"
  | "landing"
  | "business"
  | "saas"
  | "commerce"
  | "funnel"
  | "workshop"
  | "events";
type ViewMode = "preview" | "html" | "css" | "js";
type PopupType = "newsletter" | "contact" | "announcement";
type PopupTrigger = "onload" | "scroll" | "exit";

type MediaItem = {
  id: string;
  name: string;
  alt: string;
  dataUrl: string;
  size: number;
  url?: string;
  savedToLibrary?: boolean;
};
type SiteFiles = { html: string; css: string; js: string };
type BriefAnswers = {
  intent: string;
  identity: string;
  tagline: string;
  audience: string;
  offer: string;
  style: string;
  assets: string;
  tone: string;
};
type ChatMessage = { id: string; role: "assistant" | "user"; content: string };
type PopupConfig = {
  enabled: boolean;
  type: PopupType;
  trigger: PopupTrigger;
  delay: number;
  title: string;
  message: string;
  buttonText: string;
  collectName: boolean;
  collectEmail: boolean;
  collectPhone: boolean;
};
type CustomColors = {
  enabled: boolean;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
};
type StylePreset = (typeof STYLE_PRESETS)[number] & {
  customColors?: CustomColors;
  iconStyle?: string;
  imageDirection?: string;
  logoPrompt?: string;
};

// ─── constants ────────────────────────────────────────────────────────────────

const MEDIA_KEY = "kanyoai.ai.media.v3";
const RESUME_KEY = "kanyoai.resume_project";
const EMPTY_FILES: SiteFiles = { html: "", css: "", js: "" };

const SITE_KINDS: Array<{ id: SiteKind; label: string }> = [
  { id: "portfolio", label: "Portfolio" },
  { id: "landing", label: "Landing page" },
  { id: "business", label: "Business" },
  { id: "saas", label: "SaaS" },
  { id: "commerce", label: "Commerce" },
  { id: "funnel", label: "Funnel" },
  { id: "workshop", label: "Workshop" },
  { id: "events", label: "Events" },
];

const OPTIONAL_PAGES = [
  "Home",
  "About",
  "Services",
  "Portfolio",
  "Pricing",
  "Blog",
  "Contact",
  "FAQ",
] as const;

const DEFAULT_POPUP: PopupConfig = {
  enabled: false,
  type: "newsletter",
  trigger: "scroll",
  delay: 3,
  title: "",
  message: "",
  buttonText: "Subscribe",
  collectName: false,
  collectEmail: true,
  collectPhone: false,
};

const DEFAULT_CUSTOM_COLORS: CustomColors = {
  enabled: false,
  primary: "#2563eb",
  secondary: "#0f172a",
  background: "#ffffff",
  surface: "#f8fafc",
  text: "#0f172a",
};

const STYLE_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    note: "Editorial whitespace, calm hierarchy, blue-accented.",
    colors: ["#0f172a", "#f8fafc", "#2563eb"],
  },
  {
    id: "minimal",
    label: "Minimal",
    note: "Clean grid, quiet details, focused on the work.",
    colors: ["#111827", "#ffffff", "#64748b"],
  },
  {
    id: "dark",
    label: "Dark",
    note: "Dark canvas, crisp contrast, precise highlights.",
    colors: ["#0b1220", "#e5e7eb", "#3b82f6"],
  },
  {
    id: "saas",
    label: "SaaS",
    note: "Sharp, product-led, strong conversion rhythm.",
    colors: ["#102a43", "#f8fafc", "#1d4ed8"],
  },
  {
    id: "bold",
    label: "Bold",
    note: "High-energy, expressive typography, vibrant accents.",
    colors: ["#09090b", "#fafafa", "#f97316"],
  },
  {
    id: "luxury",
    label: "Luxury",
    note: "Refined, exclusive feel with gold and dark marble tones.",
    colors: ["#0c0a09", "#fafaf9", "#d97706"],
  },
  {
    id: "nature",
    label: "Nature",
    note: "Organic, calm, earthy greens with natural warmth.",
    colors: ["#052e16", "#f0fdf4", "#16a34a"],
  },
  {
    id: "magazine",
    label: "Magazine",
    note: "Editorial layout, editorial serif type, bold contrast.",
    colors: ["#fafaf9", "#0c0a09", "#dc2626"],
  },
  {
    id: "funnel",
    label: "Funnel",
    note: "Conversion-focused, bold purple gradient, strong CTAs.",
    colors: ["#1e0a3c", "#f8fafc", "#7c3aed"],
  },
  {
    id: "workshop",
    label: "Workshop",
    note: "Educational, calm indigo, schedule and speakers.",
    colors: ["#1e1b4b", "#f8fafc", "#4f46e5"],
  },
  {
    id: "events",
    label: "Events",
    note: "High-energy, date-driven, dark with bold red accent.",
    colors: ["#0a0a0a", "#f8fafc", "#dc2626"],
  },
];

const TONE_OPTIONS = [
  { id: "professional", label: "Professional" },
  { id: "bold", label: "Bold & direct" },
  { id: "friendly", label: "Friendly" },
  { id: "minimal", label: "Minimal copy" },
  { id: "luxury", label: "Luxury / exclusive" },
];

const ICON_STYLE_OPTIONS = [
  {
    id: "contextual-line",
    label: "Line",
    note: "Clean Font Awesome line-style icons matched to each section.",
  },
  {
    id: "solid-badges",
    label: "Solid badges",
    note: "Filled icon tiles with stronger contrast and depth.",
  },
  {
    id: "minimal-symbols",
    label: "Minimal",
    note: "Restrained symbols, fewer decorative icons, more whitespace.",
  },
  {
    id: "premium-duotone",
    label: "Premium",
    note: "Layered two-tone icon badges for a more custom feel.",
  },
];

const MODEL_OPTIONS = [
  { id: "flagship", label: "GPT-5.5", model: "gpt-5.5", note: "Flagship · complex reasoning" },
  { id: "budget", label: "GPT-5.4 Mini", model: "gpt-5.4-mini", note: "Balanced · default" },
  { id: "grok", label: "Grok 4.3", model: "grok-4.3", note: "xAI · fast reasoning" },
  {
    id: "deepseek-pro",
    label: "DeepSeek v4 Pro",
    model: "deepseek-v4-pro",
    note: "DeepSeek · high quality",
  },
  {
    id: "deepseek-flash",
    label: "DeepSeek v4 Flash",
    model: "deepseek-v4-flash",
    note: "DeepSeek · ultra fast",
  },
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
    } catch {
      return "budget";
    }
  });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [customColors, setCustomColors] = useState<CustomColors>(DEFAULT_CUSTOM_COLORS);
  const [iconStyle, setIconStyle] = useState(ICON_STYLE_OPTIONS[0].id);
  const [imageDirection, setImageDirection] = useState("");
  const [logoPrompt, setLogoPrompt] = useState("");
  const [generatingLogo, setGeneratingLogo] = useState(false);

  // output
  const [files, setFiles] = useState<SiteFiles>(EMPTY_FILES);
  const [previewFiles, setPreviewFiles] = useState<SiteFiles>(EMPTY_FILES);
  const [view, setView] = useState<ViewMode>("preview");
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [busy, setBusy] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "After generation, describe any changes here — layout, colors, copy, new sections — and I'll update the site instantly.",
    },
  ]);

  const [generateAiImages, setGenerateAiImages] = useState(false);
  const [savingToLibrary, setSavingToLibrary] = useState<string | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>(["Home"]);
  const [popup, setPopup] = useState<PopupConfig>(DEFAULT_POPUP);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);
  const htmlSelectionRef = useRef({ start: 0, end: 0 });
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const selectedStyle = useMemo((): StylePreset => {
    const base = STYLE_PRESETS.find((s) => s.id === stylePreset) ?? STYLE_PRESETS[0];
    const selectedIcon = ICON_STYLE_OPTIONS.find((item) => item.id === iconStyle);
    const paletteNote = customColors.enabled
      ? ` Custom palette: primary ${customColors.primary}, secondary ${customColors.secondary}, background ${customColors.background}, surface ${customColors.surface}, text ${customColors.text}.`
      : "";
    const iconNote = selectedIcon ? ` Icon direction: ${selectedIcon.note}` : "";
    const imageNote = imageDirection.trim() ? ` Image direction: ${imageDirection.trim()}` : "";

    return {
      ...base,
      note: `${base.note}${paletteNote}${iconNote}${imageNote}`,
      colors: customColors.enabled
        ? [customColors.primary, customColors.background, customColors.secondary]
        : base.colors,
      customColors,
      iconStyle,
      imageDirection: imageDirection.trim(),
      logoPrompt: logoPrompt.trim(),
    };
  }, [customColors, iconStyle, imageDirection, logoPrompt, stylePreset]);
  const selectedModel = useMemo(
    () => MODEL_OPTIONS.find((m) => m.id === modelOption) ?? MODEL_OPTIONS[0],
    [modelOption],
  );
  const previewSrcDoc = useMemo(() => composePreview(previewFiles), [previewFiles]);
  const hasCode = Boolean(files.html.trim() || files.css.trim() || files.js.trim());
  const canGenerate = Boolean(brief.intent.trim());
  const title = projectTitle(brief, kind);

  // gen-step animation
  useEffect(() => {
    if (!busy) {
      setGenStep(0);
      return;
    }
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

  // Debounce preview iframe refresh — prevents reload on every keystroke in code editor
  useEffect(() => {
    const t = window.setTimeout(() => setPreviewFiles(files), 600);
    return () => window.clearTimeout(t);
  }, [files]);

  // Restore a project opened from the dashboard "Edit" button.
  // Only lightweight metadata is in sessionStorage — files are fetched lazily from Supabase.
  useEffect(() => {
    const raw = sessionStorage.getItem(RESUME_KEY);
    if (!raw) return;
    sessionStorage.removeItem(RESUME_KEY);
    let saved: {
      id?: string;
      kind?: string;
      model?: string | null;
      style?: {
        id?: string;
        customColors?: CustomColors;
        iconStyle?: string;
        imageDirection?: string;
        logoPrompt?: string;
      } | null;
      title?: string;
    } = {};
    try {
      saved = JSON.parse(raw);
    } catch {
      return;
    }
    if (!saved.id) return;

    // Apply lightweight metadata immediately (no files yet)
    if (saved.kind && SITE_KINDS.some((k) => k.id === saved.kind)) setKind(saved.kind as SiteKind);
    if (saved.style?.id && STYLE_PRESETS.some((s) => s.id === saved.style!.id))
      setStylePreset(saved.style!.id!);
    if (saved.style?.customColors) setCustomColors(saved.style.customColors);
    if (
      saved.style?.iconStyle &&
      ICON_STYLE_OPTIONS.some((item) => item.id === saved.style!.iconStyle)
    )
      setIconStyle(saved.style.iconStyle);
    if (saved.style?.imageDirection) setImageDirection(saved.style.imageDirection);
    if (saved.style?.logoPrompt) setLogoPrompt(saved.style.logoPrompt);
    if (saved.model) {
      const match = MODEL_OPTIONS.find((m) => m.model === saved.model || m.id === saved.model);
      if (match) setModelOption(match.id);
    }
    setLoadedProjectId(saved.id);

    // Fetch files + brief from Supabase asynchronously — no freeze
    if (!isSupabaseConfigured) return;
    const projectTitle = saved.title ?? "your site";
    setLoadingProject(true);
    supabase
      .from("ai_projects")
      .select("files,brief")
      .eq("id", saved.id)
      .single()
      .then(({ data, error }) => {
        setLoadingProject(false);
        if (error || !data) {
          toast.error("Could not load project files.");
          return;
        }
        if (data.brief) {
          setBrief((prev) => ({ ...prev, ...(data.brief as Partial<BriefAnswers>) }));
        }
        const f = data.files as { html?: string; css?: string; js?: string } | null;
        if (f?.html || f?.css || f?.js) {
          const loadedFiles = { html: f?.html ?? "", css: f?.css ?? "", js: f?.js ?? "" };
          setFiles(loadedFiles);
          setPreviewFiles(loadedFiles); // update immediately on project load
          setPhase("workspace");
          setChat([
            {
              id: createId(),
              role: "assistant",
              content: `Project "${projectTitle}" loaded. Describe any changes you want and I'll update it instantly.`,
            },
          ]);
        }
      });
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
    if (!images.length) {
      toast.error("Upload image files only");
      return;
    }
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

  async function saveImageToLibrary(item: MediaItem) {
    if (!user) {
      toast.info("Sign in to save images to your library");
      return;
    }
    if (!isSupabaseConfigured) return;
    setSavingToLibrary(item.id);
    try {
      const res = await fetch(item.dataUrl);
      const blob = await res.blob();
      const safeName = item.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("user-images")
        .upload(path, blob, { contentType: blob.type || "image/png" });
      if (error) throw error;
      const { data } = supabase.storage.from("user-images").getPublicUrl(path);
      const next = media.map((m) =>
        m.id === item.id ? { ...m, url: data.publicUrl, savedToLibrary: true } : m,
      );
      setMedia(next);
      localStorage.setItem(MEDIA_KEY, JSON.stringify(next));
      toast.success("Saved to image library", {
        description: "This URL works permanently in your exported site.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save to library");
    } finally {
      setSavingToLibrary(null);
    }
  }

  async function onUploadLogo(file: File | null) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const item = await fileToMedia(file);
      // SVGs stay as-is; raster logos are compressed to ≤400×160 to keep prompt token cost small
      if (item.dataUrl.startsWith("data:image/svg")) {
        setLogoDataUrl(item.dataUrl);
        return;
      }
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = item.dataUrl;
      });
      const scale = Math.min(1, 400 / img.naturalWidth, 160 / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      setLogoDataUrl(canvas.toDataURL("image/png"));
    } catch {
      toast.error("Could not read logo");
    }
  }

  function updateCustomColor(key: keyof Omit<CustomColors, "enabled">, value: string) {
    setCustomColors((current) => ({ ...current, [key]: value }));
  }

  function paletteSummary() {
    if (!customColors.enabled) {
      return `Use the ${selectedStyle.label} preset palette.`;
    }
    return `Use this exact palette: primary ${customColors.primary}, secondary ${customColors.secondary}, background ${customColors.background}, surface ${customColors.surface}, text ${customColors.text}.`;
  }

  async function generateLogo() {
    if (authLoading) {
      toast.info("Checking your session...");
      return;
    }
    if (!user) {
      requireSignIn("generate logos");
      return;
    }
    if (!brief.identity.trim()) {
      toast.error("Add a brand name before generating a logo");
      return;
    }
    if (
      customColors.enabled &&
      ![
        customColors.primary,
        customColors.secondary,
        customColors.background,
        customColors.surface,
        customColors.text,
      ].every(isHexColor)
    ) {
      toast.error("Use valid 6-digit hex colors before generating a logo");
      return;
    }

    setGeneratingLogo(true);
    try {
      const { data: sd } = await supabase.auth.getSession();
      const token = sd.session?.access_token;
      if (!token) throw new Error("Sign in again to generate a logo.");

      const prompt = [
        `Create a polished logo mark for "${brief.identity.trim()}".`,
        brief.tagline.trim() ? `Brand tagline: ${brief.tagline.trim()}.` : "",
        logoPrompt.trim()
          ? `Logo direction from the user: ${logoPrompt.trim()}.`
          : "Make a simple, memorable symbol plus clean wordmark direction.",
        paletteSummary(),
        "Premium vector-style brand identity, balanced geometry, crisp edges, centered composition.",
        "No mockup, no 3D scene, no photograph, no watermark, no tiny unreadable text.",
      ]
        .filter(Boolean)
        .join(" ");

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, size: "1024x1024", quality: "high" }),
      });
      const raw = await response.text();
      const json = parseMaybeJson(raw) as { b64?: string; error?: string } | null;
      if (!response.ok || !json?.b64) {
        throw new Error(json?.error || "Logo generation failed.");
      }

      setLogoDataUrl(`data:image/png;base64,${json.b64}`);
      toast.success("Logo generated", { description: "It will be used in the nav and footer." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Logo generation failed");
    } finally {
      setGeneratingLogo(false);
    }
  }

  function togglePage(page: string) {
    if (page === "Home") return; // Home is always selected
    setSelectedPages((prev) =>
      prev.includes(page)
        ? prev.filter((p) => p !== page)
        : prev.length < 8
          ? [...prev, page]
          : prev,
    );
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

  // ── auto-persist ─────────────────────────────────────────────────────────────
  // Called after generate/edit with the fresh files so we don't depend on state timing.

  async function persistProject(
    freshFiles: SiteFiles,
    currentLoadedId: string | null,
  ): Promise<string | null> {
    if (!user || !isSupabaseConfigured) return null;
    const payload = {
      title: projectTitle(brief, kind),
      kind,
      brief: brief as unknown as Json,
      files: freshFiles as unknown as Json,
      model: selectedModel.model,
      style: selectedStyle as unknown as Json,
    };
    try {
      if (currentLoadedId) {
        await supabase
          .from("ai_projects")
          .update(payload)
          .eq("id", currentLoadedId)
          .eq("user_id", user.id);
        return currentLoadedId;
      } else {
        const { data, error } = await supabase
          .from("ai_projects")
          .insert({ user_id: user.id, ...payload })
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) setLoadedProjectId(data.id);
        return data?.id ?? null;
      }
    } catch {
      return null;
    }
  }

  // ── generation ───────────────────────────────────────────────────────────────

  async function generateSite() {
    if (!brief.intent.trim()) {
      toast.error("Describe what you want to build first");
      return;
    }
    if (
      customColors.enabled &&
      ![
        customColors.primary,
        customColors.secondary,
        customColors.background,
        customColors.surface,
        customColors.text,
      ].every(isHexColor)
    ) {
      setStep(2);
      toast.error("Use valid 6-digit hex colors before generating");
      return;
    }
    if (authLoading) {
      toast.info("Checking your session...");
      return;
    }
    if (!user) {
      requireSignIn("generate websites");
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("workspace");
    setBusy(true);
    setView("preview");

    // Optionally generate AI hero image first, upload to Supabase, then pass URL
    const aiImageUrls: string[] = [];
    if (generateAiImages && isSupabaseConfigured && user) {
      try {
        const { data: sd } = await supabase.auth.getSession();
        const token = sd.session?.access_token;
        if (token) {
          toast.info("Generating AI images for your website…", { duration: 5000 });
          const brandName = brief.identity.trim() ? `"${brief.identity}" — ` : "";
          const heroPrompt = [
            `${selectedStyle.label} style hero image for ${brandName}a ${kind} website: ${brief.intent.slice(0, 160)}.`,
            `Tone: ${brief.tone || "professional"}.`,
            imageDirection.trim() ? `User image direction: ${imageDirection.trim()}.` : "",
            paletteSummary(),
            "High-end editorial photography or product art, cinematic but natural lighting, premium composition, no text overlays, no watermark, no generic AI artifacts.",
          ]
            .filter(Boolean)
            .join(" ");
          const imgRes = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ prompt: heroPrompt, size: "1536x1024", quality: "high" }),
            signal: ctrl.signal,
          });
          if (imgRes.ok) {
            const imgData = (await imgRes.json()) as { b64?: string };
            if (imgData.b64) {
              const binary = atob(imgData.b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const blob = new Blob([bytes], { type: "image/png" });
              const path = `${user.id}/ai-hero-${Date.now()}.png`;
              const { error: upErr } = await supabase.storage
                .from("user-images")
                .upload(path, blob, { contentType: "image/png" });
              if (!upErr) {
                const { data: urlData } = supabase.storage.from("user-images").getPublicUrl(path);
                aiImageUrls.push(urlData.publicUrl);
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Image generation skipped — continuing with website build.");
        }
      }
    }

    // capture current loaded ID before the async boundary so we use the right value
    const currentLoadedId = loadedProjectId;

    try {
      const result = await callGenerator(
        {
          mode: "create",
          model: selectedModel.model,
          modelPreset: modelOption,
          kind,
          style: selectedStyle,
          brief,
          media: media.slice(0, 4),
          aiImageUrls,
          logoDataUrl,
          selectedPages,
          popup,
        },
        ctrl.signal,
      );
      const generatedFiles = normalizeGeneratedFiles(result);
      setFiles(generatedFiles);
      setPreviewFiles(generatedFiles); // update immediately, skip debounce
      setChat((c) => [
        ...c,
        {
          id: createId(),
          role: "assistant",
          content: "Done! Your website is ready. Tell me anything you'd like to change.",
        },
      ]);
      toast.success("Website generated");
      // Auto-save to dashboard in background — silent fail
      void persistProject(generatedFiles, currentLoadedId).then((savedId) => {
        if (savedId)
          toast.success("Saved to dashboard", {
            description: "Find it under Projects anytime.",
            duration: 3000,
          });
      });
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
    if (!hasCode) {
      toast.error("Generate a website first");
      return;
    }
    if (!user) {
      requireSignIn("edit with AI");
      return;
    }

    setChat((c) => [...c, { id: createId(), role: "user", content: instruction }]);
    setEditInput("");
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);

    const currentLoadedId = loadedProjectId;

    try {
      const result = await callGenerator(
        {
          mode: "edit",
          model: selectedModel.model,
          modelPreset: modelOption,
          kind,
          style: selectedStyle,
          brief,
          media: media.slice(0, 4),
          files,
          instruction,
          logoDataUrl,
          selectedPages,
          popup,
        },
        ctrl.signal,
      );
      const editedFiles = normalizeGeneratedFiles(result);
      setFiles(editedFiles);
      setPreviewFiles(editedFiles); // update immediately, skip debounce
      setChat((c) => [
        ...c,
        { id: createId(), role: "assistant", content: "Updated. How does that look?" },
      ]);
      setView("preview");
      // Auto-save after each edit — silent fail
      void persistProject(editedFiles, currentLoadedId);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const msg = err instanceof Error ? err.message : "Edit failed";
        setChat((c) => [
          ...c,
          { id: createId(), role: "assistant", content: `Sorry, something went wrong: ${msg}` },
        ]);
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
    if (!hasCode) {
      toast.error("Generate a website first");
      return;
    }
    if (!user) {
      requireSignIn("save projects");
      return;
    }
    setSaving(true);
    try {
      if (loadedProjectId) {
        const { error } = await supabase
          .from("ai_projects")
          .update({
            title,
            kind,
            brief: brief as unknown as Json,
            files: files as unknown as Json,
            model: selectedModel.model,
            style: selectedStyle as unknown as Json,
          })
          .eq("id", loadedProjectId)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success("Project updated");
      } else {
        const { data, error } = await supabase
          .from("ai_projects")
          .insert({
            user_id: user.id,
            title,
            kind,
            brief: brief as unknown as Json,
            files: files as unknown as Json,
            model: selectedModel.model,
            style: selectedStyle as unknown as Json,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) setLoadedProjectId(data.id);
        toast.success("Project saved to dashboard");
      }
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
    if (busy) {
      abortRef.current?.abort();
      setBusy(false);
    }
    if (!hasCode) {
      setPhase("build");
      return;
    }
    toast("Return to the brief?", {
      description: "Your generated site stays in memory until you regenerate.",
      action: { label: "Go back", onClick: () => setPhase("build") },
      duration: 8000,
    });
  }

  // ── step nav ──────────────────────────────────────────────────────────────────

  function goNext() {
    if (step === 0 && !brief.intent.trim()) {
      toast.error("Describe your website first");
      return;
    }
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
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 py-2 sm:gap-4 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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
            <span className="hidden shrink-0 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary sm:inline-block">
              {selectedModel.model}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasCode || saving}
              onClick={() => void saveProject()}
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{loadedProjectId ? "Update" : "Save"}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasCode || downloading}
              onClick={() => void downloadZip()}
            >
              {downloading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
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
                        view === v
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
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
                      {[
                        { id: "desktop" as DeviceMode, Icon: Monitor, label: "Desktop" },
                        { id: "tablet" as DeviceMode, Icon: Tablet, label: "Tablet" },
                        { id: "mobile" as DeviceMode, Icon: Smartphone, label: "Mobile" },
                      ].map(({ id, Icon, label }) => (
                        <button
                          key={id}
                          type="button"
                          title={label}
                          onClick={() => setDevice(id)}
                          className={[
                            "rounded-md p-1.5 transition-colors",
                            device === id
                              ? "bg-primary text-white"
                              : "text-muted-foreground hover:text-foreground",
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
                {/* AI chat toggle — mobile only */}
                <button
                  type="button"
                  title={sidebarOpen ? "Close AI editor" : "Open AI editor"}
                  onClick={() => setSidebarOpen((v) => !v)}
                  className="ml-1 rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
                >
                  {sidebarOpen ? (
                    <X className="h-3.5 w-3.5" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="relative min-h-0 flex-1 bg-slate-100">
              {loadingProject && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                    <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-primary" />
                    <Wand2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-base font-semibold">Loading your project</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Fetching your saved website…
                    </p>
                  </div>
                </div>
              )}
              {busy && (
                <GeneratingOverlay
                  step={genStep}
                  onCancel={() => {
                    abortRef.current?.abort();
                    setBusy(false);
                  }}
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
                <div className="absolute inset-0 flex justify-center overflow-auto p-3 sm:p-6">
                  <div
                    className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 transition-all duration-300"
                    style={{ width: device === "tablet" ? "min(768px, 100%)" : "min(390px, 100%)" }}
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
          <div
            className={[
              "flex flex-col border-l border-border bg-card",
              "lg:relative lg:flex lg:w-[300px] lg:shrink-0 xl:w-[340px]",
              sidebarOpen ? "absolute inset-0 z-10 w-full" : "hidden lg:flex",
            ].join(" ")}
          >
            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold leading-none">AI Editor</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Describe a change and I'll update the site.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
                  aria-label="Close AI editor"
                >
                  <X className="h-4 w-4" />
                </button>
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
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void editDesign();
                    }
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
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
                    active
                      ? "bg-primary/5 text-primary"
                      : done
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/50",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      active
                        ? "bg-primary text-white"
                        : done
                          ? "bg-green-500 text-white"
                          : "bg-border text-muted-foreground",
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
                        kind === k.id
                          ? "border-primary bg-primary text-white"
                          : "border-border hover:border-primary/50 hover:text-primary",
                      ].join(" ")}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo upload */}
              <div>
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Logo <span className="text-xs">(optional)</span>
                </p>
                {logoDataUrl ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-28 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30 p-1.5">
                      <img
                        src={logoDataUrl}
                        alt="Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs text-primary hover:underline"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoDataUrl(null)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload logo (PNG, SVG, WEBP)
                  </button>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={logoPrompt}
                    onChange={(e) => setLogoPrompt(e.target.value)}
                    placeholder="Logo direction, e.g. clean blue K mark, no mascot"
                    disabled={generatingLogo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void generateLogo()}
                    disabled={generatingLogo || authLoading || !brief.identity.trim()}
                    className="gap-2"
                  >
                    {generatingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Generate logo
                  </Button>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Images <span className="text-xs">(optional — up to 4)</span>
                  </p>
                  {media.length > 0 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      + Add more
                    </button>
                  )}
                </div>

                {/* AI Images toggle */}
                <button
                  type="button"
                  onClick={() => setGenerateAiImages((v) => !v)}
                  className={[
                    "mb-3 flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors text-left",
                    generateAiImages
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-9 shrink-0 items-center rounded-full transition-all",
                      generateAiImages ? "bg-primary" : "bg-muted-foreground/30",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-4 w-4 rounded-full bg-white shadow transition-transform",
                        generateAiImages ? "translate-x-4" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">Generate AI images</span>
                    <span className="ml-1.5 text-xs opacity-70">
                      using gpt-image-2 (1 image credit)
                    </span>
                  </span>
                  {generateAiImages && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      ON
                    </span>
                  )}
                </button>
                {generateAiImages && (
                  <div className="mb-3 space-y-2 rounded-lg border border-primary/10 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">
                      AI will create a custom high-quality hero image before building and save it to
                      your image library.
                    </p>
                    <Textarea
                      value={imageDirection}
                      onChange={(e) => setImageDirection(e.target.value)}
                      placeholder="Image direction, e.g. real studio workspace, no people, soft daylight, premium product closeups"
                      rows={2}
                      className="resize-none bg-background text-xs"
                    />
                  </div>
                )}

                {/* Upload area */}
                {media.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Upload your own images
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {media.map((item) => (
                      <div
                        key={item.id}
                        className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border"
                      >
                        <img
                          src={item.dataUrl}
                          alt={item.alt}
                          className="h-full w-full object-cover"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 hidden flex-col items-center justify-center gap-1 bg-black/65 group-hover:flex">
                          <button
                            type="button"
                            onClick={() => removeMedia(item.id)}
                            className="text-white/80 hover:text-red-300 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {user && isSupabaseConfigured && !item.savedToLibrary && (
                            <button
                              type="button"
                              onClick={() => void saveImageToLibrary(item)}
                              disabled={savingToLibrary === item.id}
                              title="Save to library (permanent URL)"
                              className="text-white/80 hover:text-green-300 transition-colors disabled:opacity-40"
                            >
                              {savingToLibrary === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {item.savedToLibrary && (
                          <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 py-0.5 text-center text-[9px] font-bold text-white">
                            SAVED
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {user && isSupabaseConfigured && media.some((m) => !m.savedToLibrary) && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Hover over images to save them to your library — saved images get a permanent
                    URL that works in your exported site.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-6 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">Add more details</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  All fields are optional — but specifics lead to better results.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Name or brand</label>
                  <Input
                    value={brief.identity}
                    onChange={(e) => setBrief((b) => ({ ...b, identity: e.target.value }))}
                    placeholder="e.g. Nora Vale, Studio Norte, Arca Design"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Tagline <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <Input
                    value={brief.tagline}
                    onChange={(e) => setBrief((b) => ({ ...b, tagline: e.target.value }))}
                    placeholder="e.g. Architecture through a human lens. · Build faster, ship smarter."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Who is it for?</label>
                  <Input
                    value={brief.audience}
                    onChange={(e) => setBrief((b) => ({ ...b, audience: e.target.value }))}
                    placeholder="e.g. Interior designers looking to book a photographer"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Sections and content</label>
                  <Textarea
                    value={brief.offer}
                    onChange={(e) => setBrief((b) => ({ ...b, offer: e.target.value }))}
                    placeholder="e.g. Hero, selected projects gallery, services, testimonials, pricing, contact form"
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                {/* Pages selector */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Pages{" "}
                      <span className="font-normal text-muted-foreground">(select up to 8)</span>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {selectedPages.length}/8 selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {OPTIONAL_PAGES.map((page) => {
                      const isHome = page === "Home";
                      const active = selectedPages.includes(page);
                      return (
                        <button
                          key={page}
                          type="button"
                          disabled={isHome}
                          onClick={() => togglePage(page)}
                          className={[
                            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-white"
                              : "border-border hover:border-primary/50 hover:text-primary",
                            isHome ? "cursor-default opacity-70" : "",
                          ].join(" ")}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Popup config */}
                <div>
                  <button
                    type="button"
                    onClick={() => setPopup((p) => ({ ...p, enabled: !p.enabled }))}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors text-left",
                      popup.enabled
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "flex h-5 w-9 shrink-0 items-center rounded-full transition-all",
                        popup.enabled ? "bg-primary" : "bg-muted-foreground/30",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "h-4 w-4 rounded-full bg-white shadow transition-transform",
                          popup.enabled ? "translate-x-4" : "translate-x-0.5",
                        ].join(" ")}
                      />
                    </span>
                    <span className="flex-1">
                      <span className="font-medium">Add a popup</span>
                      <span className="ml-1.5 text-xs opacity-70">
                        newsletter, contact, or announcement
                      </span>
                    </span>
                    {popup.enabled && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        ON
                      </span>
                    )}
                  </button>

                  {popup.enabled && (
                    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium">Type</label>
                          <select
                            value={popup.type}
                            onChange={(e) =>
                              setPopup((p) => ({ ...p, type: e.target.value as PopupType }))
                            }
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                          >
                            <option value="newsletter">Newsletter</option>
                            <option value="contact">Contact form</option>
                            <option value="announcement">Announcement</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium">Trigger</label>
                          <select
                            value={popup.trigger}
                            onChange={(e) =>
                              setPopup((p) => ({ ...p, trigger: e.target.value as PopupTrigger }))
                            }
                            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                          >
                            <option value="scroll">On scroll (40%)</option>
                            <option value="onload">On page load</option>
                            <option value="exit">On exit intent</option>
                          </select>
                        </div>
                      </div>
                      {popup.trigger === "onload" && (
                        <div>
                          <label className="mb-1 block text-xs font-medium">Delay (seconds)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={popup.delay}
                            onChange={(e) =>
                              setPopup((p) => ({ ...p, delay: Number(e.target.value) }))
                            }
                            className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-medium">Title</label>
                        <Input
                          value={popup.title}
                          onChange={(e) => setPopup((p) => ({ ...p, title: e.target.value }))}
                          placeholder='e.g. "Stay in the loop"'
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Message</label>
                        <Input
                          value={popup.message}
                          onChange={(e) => setPopup((p) => ({ ...p, message: e.target.value }))}
                          placeholder='e.g. "Get updates and exclusive deals."'
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium">Button label</label>
                        <Input
                          value={popup.buttonText}
                          onChange={(e) => setPopup((p) => ({ ...p, buttonText: e.target.value }))}
                          placeholder='e.g. "Subscribe", "Register", "Get access"'
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium">Collect fields</label>
                        <div className="flex gap-3">
                          {(
                            [
                              { key: "collectName" as const, label: "Name" },
                              { key: "collectEmail" as const, label: "Email" },
                              { key: "collectPhone" as const, label: "Phone" },
                            ] as const
                          ).map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex cursor-pointer items-center gap-1.5 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={popup[key]}
                                onChange={(e) =>
                                  setPopup((p) => ({ ...p, [key]: e.target.checked }))
                                }
                                className="h-3.5 w-3.5 accent-primary"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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
                          brief.tone === t.id
                            ? "border-primary bg-primary text-white"
                            : "border-border hover:border-primary/50 hover:text-primary",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Contact info or notes</label>
                  <Input
                    value={brief.assets}
                    onChange={(e) => setBrief((b) => ({ ...b, assets: e.target.value }))}
                    placeholder="e.g. hello@example.com, Instagram: @noravale, CTA: Book a shoot"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Launch */}
          {step === 2 && (
            <div className="space-y-7 p-6 sm:p-8">
              <div>
                <h2 className="text-lg font-semibold">Choose a style and generate</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a visual direction. You can always change it after by chat.
                </p>
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
                        stylePreset === s.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/40",
                      ].join(" ")}
                    >
                      <div className="mb-2 flex gap-1.5">
                        {s.colors.map((c) => (
                          <span
                            key={c}
                            className="h-4 w-4 rounded-full border border-black/10"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="text-xs font-semibold">{s.label}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">
                        {s.note}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <Palette className="h-4 w-4 text-primary" />
                      Custom brand colors
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Turn this on to force the generated site to use your exact palette.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCustomColors((current) => ({ ...current, enabled: !current.enabled }))
                    }
                    className={[
                      "flex h-6 w-11 shrink-0 items-center rounded-full transition-all",
                      customColors.enabled ? "bg-primary" : "bg-muted-foreground/30",
                    ].join(" ")}
                    aria-label="Toggle custom brand colors"
                  >
                    <span
                      className={[
                        "h-5 w-5 rounded-full bg-white shadow transition-transform",
                        customColors.enabled ? "translate-x-5" : "translate-x-0.5",
                      ].join(" ")}
                    />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["primary", "Primary"],
                      ["secondary", "Secondary / hero"],
                      ["background", "Background"],
                      ["surface", "Section surface"],
                      ["text", "Text"],
                    ] as Array<[keyof Omit<CustomColors, "enabled">, string]>
                  ).map(([key, label]) => (
                    <label key={key} className="space-y-1.5 text-xs font-medium">
                      <span>{label}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorInputValue(customColors[key])}
                          onChange={(e) => updateCustomColor(key, e.target.value)}
                          disabled={!customColors.enabled}
                          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                        <Input
                          value={customColors[key]}
                          onChange={(e) => updateCustomColor(key, e.target.value)}
                          disabled={!customColors.enabled}
                          className="h-9 font-mono text-xs uppercase"
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Icon direction</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ICON_STYLE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setIconStyle(option.id)}
                      className={[
                        "rounded-xl border p-3 text-left transition-all",
                        iconStyle === option.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
                      ].join(" ")}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className="mt-1 text-[11px] leading-4 opacity-75">{option.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">Output quality</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {MODEL_OPTIONS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModelOption(m.id)}
                      className={[
                        "rounded-xl border px-3 py-2.5 text-center text-sm transition-all",
                        modelOption === m.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-muted-foreground hover:border-muted-foreground/40",
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
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-5 w-5" /> Generate website
                  </>
                )}
              </Button>

              {!user && !authLoading && (
                <p className="text-center text-xs text-muted-foreground">
                  You will be asked to sign in before generating.
                </p>
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
              <Button type="button" onClick={goNext} size="sm">
                Next
              </Button>
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
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => void onUploadLogo(e.target.files?.[0] ?? null)}
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
        <p className="mt-1 text-sm text-muted-foreground">
          {GEN_STEPS[step] ?? GEN_STEPS[GEN_STEPS.length - 1]}
        </p>
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
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

// ─── code editor ─────────────────────────────────────────────────────────────

function CodeEditor({
  label,
  value,
  onChange,
  onCopy,
  placeholder,
  textareaRef,
  onSelection,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCopy: () => void;
  placeholder: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onSelection?: () => void;
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
        onChange={(e) => {
          onChange(e.target.value);
          onSelection?.();
        }}
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
    mode: "create" | "edit";
    model: string;
    modelPreset: string;
    kind: SiteKind;
    style: StylePreset;
    brief: BriefAnswers;
    media: MediaItem[];
    files?: SiteFiles;
    instruction?: string;
    aiImageUrls?: string[];
    logoDataUrl?: string | null;
    selectedPages?: string[];
    popup?: PopupConfig;
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
      media: payload.media.map((m) => ({ name: m.name, alt: m.alt, url: m.url })),
      aiImageUrls: payload.aiImageUrls ?? [],
      logoDataUrl: payload.logoDataUrl ?? null,
      selectedPages: payload.selectedPages ?? ["Home"],
      popup: payload.popup ?? null,
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
    const src =
      (obj.site as Record<string, unknown>) ?? (obj.files as Record<string, unknown>) ?? obj;
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
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, inner) => {
    css += `${String(inner).trim()}\n`;
    return "";
  });
  html = html.replace(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi, (_, inner) => {
    js += `${String(inner).trim()}\n`;
    return "";
  });
  if (!/<!doctype html>/i.test(html))
    html = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>kanyoai site</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
  return normalizeShape({ html, css, js });
}

// Injected first in <head> — blocks any link navigation out of the preview iframe
// so anchor links (#section) scroll normally but hrefs like "/about" or "http://..." are swallowed.
const PREVIEW_NAV_GUARD = `<script>
(function(){
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');
    if(!a)return;
    var href=(a.getAttribute('href')||'').trim();
    if(href===''||href==='#'){e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(href.startsWith('#'))return; // anchor link — let it scroll normally
    e.preventDefault();e.stopPropagation(); // block all real navigation
  },true);
})();
</script>`;

function composePreview(files: SiteFiles) {
  if (!files.html.trim() && !files.css.trim() && !files.js.trim()) return EMPTY_PREVIEW;
  let html = files.html.trim() || starterHtml();
  const cssTag = files.css.trim() ? `<style>\n${files.css}\n</style>` : "";
  const jsTag = files.js.trim() ? `<script>\n${files.js}\n</script>` : "";
  html = html.replace(/<link[^>]+href=["']style\.css["'][^>]*>/gi, "");
  html = html.replace(/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/gi, "");
  // Inject nav guard as the very first script in <head>
  html = /<head>/i.test(html)
    ? html.replace(/<head>/i, `<head>\n${PREVIEW_NAV_GUARD}`)
    : `${PREVIEW_NAV_GUARD}\n${html}`;
  if (cssTag)
    html = /<\/head>/i.test(html)
      ? html.replace(/<\/head>/i, `${cssTag}\n</head>`)
      : `${cssTag}\n${html}`;
  if (jsTag)
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${jsTag}\n</body>`)
      : `${html}\n${jsTag}`;
  return html;
}

function parseMaybeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

function parseErrorMessage(text: string) {
  const p = parseMaybeJson(text);
  if (p && typeof p === "object") {
    const o = p as Record<string, unknown>;
    return str(o.error) || str(o.message);
  }
  return text.trim().slice(0, 240);
}

function stripFences(v: string) {
  return v
    .replace(/^```(?:json|html|css|javascript|js)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}
function str(v: unknown) {
  return typeof v === "string" ? v : "";
}
function emptyBrief(): BriefAnswers {
  return {
    intent: "",
    identity: "",
    tagline: "",
    audience: "",
    offer: "",
    style: "",
    assets: "",
    tone: "professional",
  };
}
function kindLabel(k: SiteKind) {
  return SITE_KINDS.find((s) => s.id === k)?.label ?? "Website";
}
function projectTitle(brief: BriefAnswers, kind: SiteKind) {
  return brief.identity.trim() || `${kindLabel(kind)} website`;
}
function safeSlug(v: string) {
  return (
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "kanyoai-site"
  );
}
function starterHtml() {
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>kanyoai site</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main></main>\n  <script src="script.js"></script>\n</body>\n</html>`;
}
function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function loadMedia(): MediaItem[] {
  try {
    const r = localStorage.getItem(MEDIA_KEY);
    if (!r) return [];
    const p = JSON.parse(r);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}
function fileToMedia(file: File): Promise<MediaItem> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () =>
      res({
        id: createId(),
        name: file.name,
        alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
        dataUrl: String(r.result),
        size: file.size,
      });
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function escapeAttr(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function colorInputValue(value: string) {
  return isHexColor(value) ? value : "#000000";
}
function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

const EMPTY_PREVIEW = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0}body{min-height:100vh;display:grid;place-items:center;background:#f8fafc;color:#64748b;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.box{max-width:32rem;padding:2.5rem;text-align:center}.icon{width:52px;height:52px;margin:0 auto 1.5rem;border-radius:16px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;display:grid;place-items:center;font-size:1.3rem;font-weight:700;box-shadow:0 8px 24px -8px rgba(37,99,235,.6)}h1{margin:0 0 .75rem;color:#0f172a;font-size:1.5rem;font-weight:600;letter-spacing:-.02em}p{margin:0;line-height:1.7;font-size:.9rem;color:#64748b}</style></head><body><div class="box"><div class="icon">AI</div><h1>Your preview will appear here</h1><p>Complete the steps above and click <strong>Generate website</strong> to build your site.</p></div></body></html>`;
