import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Code2,
  Download,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Palette,
  Sparkles,
  Wand2,
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kanyoai - AI website builder for agencies" },
      {
        name: "description",
        content:
          "Describe a client website and get clean, responsive HTML, CSS, and JavaScript. Refine it by chat, then export a ZIP.",
      },
      { property: "og:title", content: "kanyoai - AI website builder for agencies" },
      {
        property: "og:description",
        content: "Describe a client website and get clean, responsive code you own.",
      },
    ],
  }),
  component: Index,
});

const steps = [
  {
    Icon: Wand2,
    title: "Describe the site",
    body: "Write a short brief: the client, the audience, the pages, the tone. Add a logo and images if you have them.",
  },
  {
    Icon: Sparkles,
    title: "Generate and preview",
    body: "kanyoai writes the layout, copy, and code. Check it on desktop, tablet, and mobile right away.",
  },
  {
    Icon: MessageSquare,
    title: "Refine by chat, then export",
    body: "Ask for changes in plain language. When it looks right, download a ZIP of plain HTML, CSS, and JS.",
  },
];

const features = [
  {
    Icon: Code2,
    title: "Code you own",
    body: "Standard HTML, CSS, and JavaScript. No proprietary runtime, no lock-in, host it anywhere.",
  },
  {
    Icon: Layers,
    title: "Multi-page sites",
    body: "Home, About, Services, Pricing, Blog, Contact, FAQ, all generated from one brief.",
  },
  {
    Icon: Palette,
    title: "Your brand, exactly",
    body: "Pick one of 11 style presets or enter exact hex colors. Upload a logo or generate one.",
  },
  {
    Icon: ImageIcon,
    title: "AI images",
    body: "Generate hero images and assets, and keep them in a reusable image library.",
  },
  {
    Icon: MessageSquare,
    title: "Edit by chat",
    body: "“Make the hero darker” or “add a pricing table”. Changes apply to the existing site.",
  },
  {
    Icon: Download,
    title: "One-click export",
    body: "Download a ready-to-host ZIP, or keep editing the code in the built-in playground.",
  },
];

const included = [
  "Responsive layouts for desktop, tablet, and mobile",
  "Real copy written from your brief, no lorem ipsum",
  "Projects saved to your account automatically",
  "Optional pop-ups for newsletters and contact forms",
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div className="grid-bg absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                AI website builder for agencies
              </p>
              <h1 className="mt-6 text-balance font-display text-4xl font-semibold leading-[1.1] sm:text-6xl">
                Describe a website.
                <br className="hidden sm:block" /> Get clean code you own.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">
                kanyoai turns a short client brief into a responsive, multi-page site in HTML, CSS,
                and JavaScript. Refine it by chat, then export and host it anywhere.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link to="/login" search={{ redirect: "/ai" }}>
                    Start building
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
            </div>

            <div className="relative mx-auto mt-14 max-w-5xl">
              <div className="absolute -inset-x-8 -bottom-8 top-12 -z-10 rounded-[2rem] bg-primary/10 blur-3xl" />
              <div className="overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-2xl shadow-primary/10">
                <img
                  src="/assets/kanyoai-builder-hero.webp"
                  alt="The kanyoai builder showing a generated architecture website with its code"
                  className="aspect-[16/9] w-full rounded-xl object-cover"
                  width={1672}
                  height={941}
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-border bg-card px-4 py-20 sm:px-6"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="How it works"
              title="From brief to export-ready site in three steps"
            />
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {steps.map(({ Icon, title, body }, index) => (
                <li
                  key={title}
                  className="relative rounded-xl border border-border bg-background p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Features"
              title="Everything you need to deliver client sites faster"
            />
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workspace */}
        <section className="border-t border-border bg-card px-4 py-20 sm:px-6">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                align="left"
                eyebrow="Your workspace"
                title="Every project, image, and setting in one place"
              />
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                Generated sites save to your dashboard automatically. Reopen any project to keep
                editing, preview it in a new tab, or download it again.
              </p>
              <ul className="mt-8 space-y-3">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-background p-1.5 shadow-xl shadow-foreground/5">
              <img
                src="/kanyoai-dashboard-preview.png"
                alt="kanyoai dashboard with recent projects and the image library"
                className="w-full rounded-xl"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
            <h2 className="text-balance font-display text-3xl font-semibold sm:text-4xl">
              Build your next client site today
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
              Create an account, write a brief, and have a working site to show your client in
              minutes.
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="mt-8 bg-background text-foreground hover:bg-background/90"
            >
              <Link to="/login" search={{ redirect: "/ai" }}>
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-balance font-display text-3xl font-semibold sm:text-4xl">{title}</h2>
    </div>
  );
}
