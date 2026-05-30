import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Code2,
  Download,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kanyoai - AI website builder for agencies" },
      {
        name: "description",
        content:
          "Generate responsive client websites, image assets, and clean HTML/CSS/JS exports from one simple workspace.",
      },
      { property: "og:title", content: "kanyoai - AI website builder for agencies" },
      {
        property: "og:description",
        content: "Build responsive client websites with AI, save images, and export clean code.",
      },
    ],
  }),
  component: Index,
});

const stats = [
  { value: "8", label: "Page types" },
  { value: "11", label: "Style presets" },
  { value: "3", label: "Image sizes" },
  { value: "ZIP", label: "Clean export" },
];

const workflow = [
  {
    Icon: Wand2,
    title: "Write the brief",
    body: "Add the client goal, audience, pages, tone, logo, and any images you already have.",
  },
  {
    Icon: Sparkles,
    title: "Generate the site",
    body: "kanyoai creates the HTML, CSS, JavaScript, page structure, copy, and optional AI image assets.",
  },
  {
    Icon: Download,
    title: "Export or keep editing",
    body: "Preview the result, revise by chat, save projects, copy image URLs, or download a ZIP.",
  },
];

const features = [
  {
    Icon: LayoutDashboard,
    title: "Project dashboard",
    body: "Saved websites, recent work, image assets, and settings stay in one workspace.",
  },
  {
    Icon: ImageIcon,
    title: "Image generation",
    body: "Create square, portrait, or landscape PNGs and store them in the image library.",
  },
  {
    Icon: Code2,
    title: "Clean code",
    body: "Export standard HTML, CSS, and JavaScript without a proprietary runtime.",
  },
  {
    Icon: Layers,
    title: "Multi-page builds",
    body: "Generate complete sites with pages like Home, About, Services, Pricing, Blog, and Contact.",
  },
  {
    Icon: Palette,
    title: "Style presets",
    body: "Choose layouts and visual direction for SaaS, landing, business, commerce, events, and more.",
  },
  {
    Icon: ShieldCheck,
    title: "Account storage",
    body: "Projects and generated image URLs are saved to your signed-in workspace.",
  },
];

const checklist = [
  "Responsive pages for mobile and desktop",
  "Project edit, preview, delete, and ZIP download",
  "Image upload, generation, copy URL, and delete",
  "Fast dashboard tabs with lazy image rendering",
  "No lock-in after export",
];

function Index() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <img
            src="/kanyoai-dashboard-preview.png"
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 -z-10 bg-slate-950/78" />
          <div className="mx-auto flex min-h-[76vh] max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                AI website builder
              </p>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-7xl">kanyoai</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                Generate responsive client websites, image assets, and clean code exports from one
                focused workspace.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  search={{ redirect: "/ai" }}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
                >
                  Start building
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See how it works
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5">
                <p className="text-3xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Workflow
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                From client brief to export-ready website
              </h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {workflow.map(({ Icon, title, body }, index) => (
                <article
                  key={title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-mono text-sm text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-6 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Workspace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Dashboard, projects, and image library redesigned for speed
              </h2>
              <p className="mt-4 text-slate-600">
                The dashboard keeps project and image loading separate, renders large libraries
                lazily, and uses simple tab navigation so Projects and Images open without locking
                the page.
              </p>
              <ul className="mt-6 space-y-3">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/80">
              <img
                src="/kanyoai-dashboard-preview.png"
                alt="kanyoai dashboard preview"
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything needed for fast client delivery
              </h2>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, title, body }) => (
                <article
                  key={title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Ready to build
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Create your next client site today
              </h2>
              <p className="mt-3 max-w-2xl text-slate-300">
                Sign in, describe the project, generate the site, then refine it from the dashboard.
              </p>
            </div>
            <Link
              to="/login"
              search={{ redirect: "/ai" }}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
            >
              Get started
              <Zap className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
