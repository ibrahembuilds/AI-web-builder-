import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MessageSquare, Sparkles, Send, Globe } from "lucide-react";
import { useState, type FormEvent } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — kanyoai" },
      {
        name: "description",
        content:
          "Get in touch with the kanyoai team. Questions, feedback, or partnership inquiries — we're here.",
      },
    ],
  }),
  component: ContactPage,
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

const CONTACT_EMAIL = "hello@kanyoai.com";

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    const sub = encodeURIComponent(subject || "kanyoai enquiry");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${sub}&body=${body}`;
    setSent(true);
  }

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
            className="relative mx-auto max-w-2xl text-center"
          >
            <motion.div variants={fadeUp} className="mb-6 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs font-semibold text-violet-300">
                <MessageSquare className="h-3 w-3" />
                Get in touch
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display text-4xl font-bold leading-tight sm:text-5xl md:text-6xl"
            >
              We'd love to
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                hear from you
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-300/90"
            >
              Questions, feedback, feature requests, or partnership ideas — reach out and we'll get
              back to you as soon as possible.
            </motion.p>
          </motion.div>
        </section>

        {/* ── Contact grid ────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-12 md:grid-cols-[1fr_1.6fr]">
              {/* Left: contact info */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={stagger}
                className="space-y-8"
              >
                <motion.div variants={fadeUp}>
                  <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Email us directly
                  </p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="group inline-flex items-center gap-2 text-lg font-semibold transition-colors hover:text-violet-600"
                  >
                    <Mail className="h-5 w-5 text-violet-500" />
                    {CONTACT_EMAIL}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
                  </a>
                </motion.div>

                <motion.div variants={fadeUp} className="h-px bg-border" />

                <motion.div variants={fadeUp}>
                  <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Common topics
                  </p>
                  <ul className="space-y-3">
                    {[
                      {
                        icon: Sparkles,
                        label: "Feature requests",
                        note: "Suggest capabilities you need for client work",
                      },
                      {
                        icon: Globe,
                        label: "Partnership",
                        note: "Agency partnerships and reseller programs",
                      },
                      {
                        icon: Mail,
                        label: "Billing & account",
                        note: "Help with your account or subscription",
                      },
                    ].map(({ icon: Icon, label, note }) => (
                      <li key={label} className="flex items-start gap-3 text-sm">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="font-medium">{label}</span>
                          <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div variants={fadeUp} className="h-px bg-border" />

                <motion.div variants={fadeUp}>
                  <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Not yet signed up?
                  </p>
                  <Link
                    to="/login"
                    search={{ redirect: "/ai" }}
                    className="group inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition-colors hover:text-violet-500"
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Right: contact form */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
              >
                {sent ? (
                  <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5 p-10 text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600/20 text-violet-500">
                      <Send className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 font-display text-xl font-bold">
                      Your email client should have opened
                    </h3>
                    <p className="max-w-xs text-sm text-muted-foreground">
                      If it didn't, you can email us directly at{" "}
                      <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="text-violet-600 hover:underline"
                      >
                        {CONTACT_EMAIL}
                      </a>
                    </p>
                    <button
                      onClick={() => setSent(false)}
                      className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="rounded-2xl border border-border bg-card p-8 space-y-5"
                  >
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="contact-name" className="block text-sm font-medium">
                          Name
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-0"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="contact-email" className="block text-sm font-medium">
                          Email
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@agency.com"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="contact-subject" className="block text-sm font-medium">
                        Subject
                      </label>
                      <input
                        id="contact-subject"
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="What's this about?"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="contact-message" className="block text-sm font-medium">
                        Message <span className="text-destructive">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        required
                        rows={6}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what you're working on, what you need, or what could be better…"
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-0"
                      />
                    </div>

                    <button
                      type="submit"
                      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    >
                      <Send className="h-4 w-4" />
                      Send message
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    <p className="text-center text-xs text-muted-foreground">
                      This opens your email client with the message pre-filled.
                    </p>
                  </form>
                )}
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
