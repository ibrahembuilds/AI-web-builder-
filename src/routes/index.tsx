import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Download,
  Sparkles,
  Zap,
  FileCode2,
  Eye,
  Check,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kanyoai — AI website builder" },
      {
        name: "description",
        content:
          "Describe any website. kanyoai builds it in clean HTML, CSS, and JavaScript — ready to download and ship.",
      },
      { property: "og:title", content: "kanyoai — AI website builder" },
      {
        property: "og:description",
        content: "Describe any website. kanyoai builds it in clean HTML, CSS, and JavaScript.",
      },
    ],
  }),
  component: Index,
});

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const steps = [
  {
    icon: FileCode2,
    title: "Describe what you need",
    body: "Write a short brief — who it is for, what it should say, and how it should look. The more specific, the better the output.",
  },
  {
    icon: Sparkles,
    title: "AI builds the site",
    body: "kanyoai generates a complete website — real copy, real layout, real code. Not a wireframe, not a placeholder.",
  },
  {
    icon: Download,
    title: "Download clean code",
    body: "You get HTML, CSS, and JavaScript files. No lock-in, no runtime, no subscription needed to host them.",
  },
];

const features = [
  "Plain HTML, CSS, and JavaScript — no framework required",
  "Bootstrap, Google Fonts, and other CDN libraries when they fit",
  "Real copy written from your brief — no filler text",
  "Edit by chat — refine the design without starting over",
  "Export as a ZIP and host anywhere",
  "Code playground for writing and testing your own HTML",
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border/60 bg-slate-950 px-4 py-24 text-white sm:px-6 md:py-36">
          {/* subtle blue grid overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.18) 0%, transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mb-4 font-mono text-xs uppercase tracking-widest text-blue-400"
              >
                kanyoai — AI website builder
              </motion.p>

              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl"
              >
                Describe a website.
                <br />
                <span className="text-blue-400">Get the code.</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg"
              >
                kanyoai turns a plain-language brief into a complete, production-ready
                website — real HTML, CSS, and JavaScript you can download and host anywhere.
              </motion.p>

              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <Link
                  to="/ai"
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                  <Sparkles className="h-4 w-4" />
                  Open AI Generator
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/playground"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <Code2 className="h-4 w-4" />
                  Code Playground
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section className="border-b border-border/60 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-12 text-center"
            >
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                How it works
              </p>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                From brief to code in seconds
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid gap-6 sm:grid-cols-3"
            >
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    variants={fadeUp}
                    transition={{ duration: 0.5 }}
                    className="rounded-xl border border-border bg-card p-6"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Step {i + 1}
                    </p>
                    <h3 className="mb-2 font-semibold">{step.title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ── Two tools ────────────────────────────────────────────── */}
        <section className="border-b border-border/60 bg-muted/20 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-12 text-center"
            >
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Two tools
              </p>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                Build with AI. Or write it yourself.
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
              className="grid gap-6 md:grid-cols-2"
            >
              {/* AI Generator card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="group relative overflow-hidden rounded-xl border border-blue-600/20 bg-card p-8"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">AI Generator</h3>
                <p className="mb-6 text-sm leading-6 text-muted-foreground">
                  Fill in a short brief about your website — the type, the audience, the offer,
                  and the style. kanyoai generates a complete site with real copy and clean code.
                  Edit by chat until it is exactly right.
                </p>
                <Link
                  to="/ai"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-500"
                >
                  Open AI Generator <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              {/* Playground card */}
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-8"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-800 text-white">
                  <Code2 className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold">Code Playground</h3>
                <p className="mb-6 text-sm leading-6 text-muted-foreground">
                  A simple in-browser editor with separate HTML, CSS, and JavaScript tabs.
                  Live preview updates as you type. Upload your own files and export the
                  finished project as a ZIP whenever you are done.
                </p>
                <Link
                  to="/playground"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-blue-600"
                >
                  Open Playground <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Features list ────────────────────────────────────────── */}
        <section className="border-b border-border/60 px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-12 md:grid-cols-[1fr_1fr]">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
              >
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  What you get
                </p>
                <h2 className="mb-4 font-display text-2xl font-semibold sm:text-3xl">
                  Clean code you can keep
                </h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  Every site kanyoai builds is a standard HTML, CSS, and JavaScript project.
                  No proprietary runtime, no hidden dependency, no platform lock-in.
                  Download it and host it anywhere — Vercel, Netlify, GitHub Pages, your own server.
                </p>
              </motion.div>

              <motion.ul
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={stagger}
                className="flex flex-col justify-center gap-3"
              >
                {features.map((feature) => (
                  <motion.li
                    key={feature}
                    variants={fadeUp}
                    transition={{ duration: 0.4 }}
                    className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                      <Check className="h-3 w-3" />
                    </span>
                    {feature}
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────── */}
        <section className="bg-slate-950 px-4 py-24 text-white sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="mx-auto max-w-2xl text-center"
          >
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-4 flex items-center justify-center gap-2 text-blue-400"
            >
              <Zap className="h-4 w-4" />
              <span className="font-mono text-xs uppercase tracking-widest">Start now</span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-4 font-display text-3xl font-semibold sm:text-4xl"
            >
              Build your first website today
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-8 text-base leading-7 text-slate-300"
            >
              Sign in and describe what you want to build. The AI Generator is free to use
              with your own OpenAI account. The Playground requires no account at all.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                to="/ai"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-blue-600 px-8 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <Sparkles className="h-4 w-4" />
                AI Generator
              </Link>
              <Link
                to="/playground"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/20 px-8 text-sm font-semibold text-white transition-all hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                <Eye className="h-4 w-4" />
                Try Playground free
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
