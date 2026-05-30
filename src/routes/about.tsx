import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Code2,
  Globe,
  Image,
  Layers,
  Layout,
  MousePointer2,
  Palette,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — kanyoai" },
      {
        name: "description",
        content:
          "kanyoai is an AI website builder built for agencies. Describe any client site, generate production-ready HTML, CSS, and JavaScript in minutes.",
      },
    ],
  }),
  component: AboutPage,
});

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const capabilities = [
  {
    icon: Users,
    label: "Client branding",
    desc: "Upload a logo — it's automatically embedded in the nav and footer of every generated site.",
  },
  {
    icon: Layers,
    label: "Multi-page sites",
    desc: "Generate up to 8 sections: Home, About, Services, Pricing, Blog, Contact, FAQ, and more.",
  },
  {
    icon: Palette,
    label: "11 style presets",
    desc: "SaaS, landing page, funnel, workshop, events, portfolio, commerce, and more — each with unique fonts and palettes.",
  },
  {
    icon: Image,
    label: "AI hero images",
    desc: "Each site gets an AI-generated editorial hero image matched to the brand's tone and style.",
  },
  {
    icon: MousePointer2,
    label: "Custom pop-ups",
    desc: "Newsletter sign-ups, contact forms, or announcement banners — configurable trigger, delay, and copy.",
  },
  {
    icon: Layout,
    label: "Edit by chat",
    desc: "Refine any section of a generated site with a follow-up message. No starting over.",
  },
  {
    icon: Globe,
    label: "Real copy",
    desc: "Every site is written from your brief — no Lorem Ipsum, no filler. Actual headlines, actual CTAs.",
  },
  {
    icon: Code2,
    label: "Clean HTML/CSS/JS",
    desc: "Standard web code with no proprietary runtime. Host on Vercel, Netlify, GitHub Pages, or anywhere.",
  },
];

const models = [
  { id: "gpt-5.5", desc: "Highest quality — best for complex, multi-page client sites" },
  { id: "gpt-5.4-mini", desc: "Balanced speed and quality — the default for most projects" },
  { id: "grok-4.3", desc: "xAI Grok 4.3 — fast reasoning, great for rapid generation" },
  { id: "deepseek-v4-pro", desc: "DeepSeek v4 Pro — strong at detailed layouts and real copy" },
  { id: "deepseek-v4-flash", desc: "DeepSeek v4 Flash — ultra-fast model, ideal for quick drafts" },
];

function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border/60 bg-slate-950 px-4 py-24 text-white sm:px-6 md:py-32">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 70% 60% at 50% -10%, rgba(139,92,246,0.22) 0%, transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 0%, black 0%, transparent 100%)",
            }}
          />

          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp} className="mb-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300">
                <Sparkles className="h-3 w-3" />
                About kanyoai
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl"
            >
              Built so agencies can
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                move faster than ever
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300/90"
            >
              kanyoai is an AI website builder built specifically for agencies and freelancers who
              need to deliver production-quality websites quickly, consistently, and without
              starting from scratch every time.
            </motion.p>
          </motion.div>
        </section>

        {/* ── Mission ─────────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
              >
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Why we built this
                </p>
                <h2 className="mb-5 font-display text-2xl font-bold sm:text-3xl">
                  Agencies spend too much time building sites that should take hours
                </h2>
                <p className="leading-7 text-muted-foreground">
                  Client websites follow recognizable patterns — hero, features, about, contact,
                  pricing. The hard part isn't the structure; it's writing real copy, creating
                  coherent design, and producing clean, handover-ready code fast enough to stay
                  profitable.
                </p>
                <p className="mt-4 leading-7 text-muted-foreground">
                  kanyoai closes that gap. Describe the client, their audience, and their goals —
                  and the AI handles the rest: layout, copy, images, branding, and code. You stay in
                  control; the AI does the repetitive work.
                </p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={stagger}
                className="rounded-2xl border border-border bg-card p-7"
              >
                <p className="mb-4 text-sm font-semibold">What kanyoai replaces</p>
                {[
                  "Hours of template customization",
                  "Writing and rewriting placeholder copy",
                  "Sourcing or commissioning hero images",
                  "Building pop-up and modal scripts",
                  "Assembling multi-page navigation",
                  "Cleaning up code before handover",
                ].map((item) => (
                  <motion.div
                    key={item}
                    variants={fadeUp}
                    className="flex items-start gap-3 py-2 text-sm text-muted-foreground"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                    {item}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Capabilities ────────────────────────────────────────── */}
        <section className="border-t border-border/60 bg-muted/20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="mb-14 text-center"
            >
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Capabilities
              </p>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                What kanyoai generates
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {capabilities.map(({ icon: Icon, label, desc }) => (
                <motion.div
                  key={label}
                  variants={fadeUp}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold">{label}</h3>
                  <p className="text-xs leading-5 text-muted-foreground">{desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── AI models ───────────────────────────────────────────── */}
        <section className="border-t border-border/60 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="mb-12 text-center"
            >
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Powered by OpenAI · xAI · DeepSeek
              </p>
              <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl">
                Five models, three providers
              </h2>
              <p className="mx-auto max-w-xl text-muted-foreground">
                kanyoai supports GPT, Grok, and DeepSeek. Pick the right balance of quality and
                speed for each client project.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid gap-4 sm:grid-cols-2"
            >
              {models.map(({ id, desc }, i) => (
                <motion.div
                  key={id}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{id}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── Tech ────────────────────────────────────────────────── */}
        <section className="border-t border-border/60 bg-muted/20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-12 md:grid-cols-2 md:items-center">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
              >
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  The technology
                </p>
                <h2 className="mb-5 font-display text-2xl font-bold sm:text-3xl">
                  Built on proven, production-grade tools
                </h2>
                <p className="leading-7 text-muted-foreground">
                  kanyoai runs on React, Vite, and Supabase — with Vercel serverless functions
                  handling OpenAI API calls. Sites are generated as standard HTML, CSS, and
                  JavaScript: no framework, no build step, no runtime required on the client's
                  hosting provider.
                </p>
                <p className="mt-4 leading-7 text-muted-foreground">
                  Images are generated with OpenAI's gpt-image-2 model and served from Supabase
                  Storage. The code playground uses a live iframe preview that updates as you type.
                </p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={stagger}
                className="space-y-3"
              >
                {[
                  { label: "React 19 + Vite 7", note: "Frontend framework and build tool" },
                  { label: "TanStack Router", note: "File-based routing" },
                  { label: "Supabase", note: "Auth, database, and image storage" },
                  { label: "Vercel serverless functions", note: "API calls to OpenAI" },
                  { label: "OpenAI GPT-5.x models", note: "Site generation and editing" },
                  { label: "gpt-image-2", note: "Hero image generation" },
                  { label: "Tailwind CSS 4 + shadcn/ui", note: "Design system" },
                  { label: "Framer Motion v12", note: "Animations and transitions" },
                ].map(({ label, note }) => (
                  <motion.div
                    key={label}
                    variants={fadeUp}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm"
                  >
                    <span className="font-mono font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground">{note}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-slate-950 px-4 py-24 text-white sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 top-0 h-[440px] w-[440px] rounded-full bg-violet-600/18 blur-[130px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 bottom-0 h-[360px] w-[360px] rounded-full bg-blue-500/18 blur-[110px]"
          />

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="relative mx-auto max-w-xl text-center"
          >
            <motion.div variants={fadeUp} className="mb-5 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300">
                <Zap className="h-3 w-3" />
                Free to start
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="mb-4 font-display text-3xl font-bold sm:text-4xl"
            >
              Ready to build faster?
            </motion.h2>
            <motion.p variants={fadeUp} className="mb-8 text-slate-300">
              Sign up and generate your first client site in under 5 minutes.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Link
                to="/login"
                search={{ redirect: "/ai" }}
                className="group inline-flex h-13 items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.03] hover:shadow-violet-500/40"
              >
                <Sparkles className="h-4 w-4" />
                Get started free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex h-13 items-center gap-2 rounded-xl border border-white/20 px-8 text-sm font-semibold text-white transition-all hover:bg-white/10"
              >
                Contact us
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
