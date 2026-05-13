// Vercel serverless function — kanyoai AI site generator
// Verifies Supabase JWT, then calls OpenAI chat/completions.
// POST /api/generate — requires Authorization: Bearer <supabase_access_token>

const { createClient } = require("@supabase/supabase-js");

// ─── Style tokens per preset ──────────────────────────────────────────────────
const STYLE_TOKENS = {
  classic:  { fonts: "Playfair Display (headings 700/800) + Inter (body 400/500/600)", heroBg: "#0f172a", primary: "#2563eb", primaryDark: "#1d4ed8", feel: "editorial, professional, trustworthy — navy + white + blue" },
  minimal:  { fonts: "Inter (headings 800, body 400/500 — single font throughout)", heroBg: "#f8fafc", primary: "#18181b", primaryDark: "#09090b", feel: "quiet, content-first, focused — monochromatic with single accent, dark hero optional" },
  dark:     { fonts: "Space Grotesk (headings 700/800) + Inter (body)", heroBg: "#050d1a", primary: "#3b82f6", primaryDark: "#2563eb", feel: "technical, futuristic, sharp — add glow box-shadow on primary elements, dark throughout" },
  saas:     { fonts: "Plus Jakarta Sans (headings 700/800) + Inter (body)", heroBg: "#f0f4ff", primary: "#1d4ed8", primaryDark: "#1e40af", feel: "product-led, conversion-optimized, feature-rich — light hero with blue gradient blob" },
  bold:     { fonts: "Syne (headings 800) + Inter (body)", heroBg: "#09090b", primary: "#f97316", primaryDark: "#ea580c", feel: "high-energy, vibrant, impactful — use oversized typography, orange accents on black" },
  luxury:   { fonts: "Cormorant Garamond (headings 400/700) + EB Garamond (body 400)", heroBg: "#0c0a09", primary: "#d97706", primaryDark: "#b45309", feel: "exclusive, refined, premium — gold on near-black, generous whitespace, elegant serif" },
  nature:   { fonts: "Nunito (headings 700/800) + Inter (body)", heroBg: "#052e16", primary: "#16a34a", primaryDark: "#15803d", feel: "organic, calm, sustainable — forest green hero, soft rounded shapes, earthy palette" },
  magazine: { fonts: "Playfair Display (headings 700/800) + Lora (body 400/500)", heroBg: "#fafaf9", primary: "#dc2626", primaryDark: "#b91c1c", feel: "editorial, authoritative, structured — dark serif text on off-white, red accent, news-layout" },
};

const SYSTEM_PROMPT = `You are an elite frontend developer and award-winning web designer. Your websites get featured on Awwwards and Behance. Every site you produce must genuinely impress — not look like a template.

OUTPUT: Return ONLY valid JSON: {"html":"...","css":"...","js":"..."}. No markdown fences, no explanation text, no extra keys.

━━━ MUST-HAVE ON EVERY WEBSITE ━━━
1. Full-viewport HERO — dark or bold background, radial gradient blob decoration, eyebrow label, h1 with <span class="highlight"> on key word, sub-headline, 2 CTAs (primary + outline)
2. GOOGLE FONTS — always 2 fonts loaded in <head>: display font for headings + Inter for body (based on style tokens)
3. FONT AWESOME 6 — loaded from CDN, used on all feature cards, nav CTA icon, footer social links
4. AOS SCROLL ANIMATIONS — data-aos on every heading, card, stat, image (stagger cards with data-aos-delay="0/100/200")
5. STICKY NAV — backdrop-blur, logo left + links + CTA button right, working hamburger for mobile
6. PROFESSIONAL FOOTER — dark background, 3-4 columns (brand/about, links, services/products, contact), Font Awesome social icons, copyright
7. CSS CUSTOM PROPERTIES — every color, font, shadow, radius defined as a CSS variable at :root
8. REAL UNSPLASH PHOTOS — when no images provided, always use: https://images.unsplash.com/photo-{REAL_ID}?w=1200&q=85&auto=format&fit=crop — use actual relevant Unsplash photo IDs
9. RESPONSIVE — mobile (360px) → tablet (768px) → desktop (1280px), mobile-first CSS
10. MICRO-INTERACTIONS — button hover: translateY(-2px) + stronger shadow; card hover: translateY(-6px) + shadow; nav links: color + underline transition

━━━ HTML TEMPLATE ━━━
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>[Specific Title from Brief]</title>
  <meta name="description" content="[SEO description]">
  <link href="https://fonts.googleapis.com/css2?family=[DisplayFont]:ital,wght@0,400;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
  <link rel="stylesheet" href="https://unpkg.com/aos@2.3.4/dist/aos.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <nav>
      <div class="container nav-inner">
        <a href="#" class="nav-logo">[BrandName]</a>
        <ul class="nav-links">
          <li><a href="#about">About</a></li>
          <li><a href="#services">Services</a></li>
          [etc based on sections]
          <li><a href="#contact" class="btn btn-nav"><i class="fa-solid fa-arrow-right"></i> [CTA]</a></li>
        </ul>
        <button id="menu-toggle" aria-label="Toggle menu">
          <div class="hamburger"><span></span><span></span><span></span></div>
        </button>
      </div>
    </nav>
  </header>
  <main>
    <section id="hero"> ... </section>
    [sections based on brief]
  </main>
  <footer> ... </footer>
  <script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>
  <script src="script.js"></script>
</body>
</html>

━━━ CSS ARCHITECTURE ━━━
ALWAYS start css with:
:root {
  --font-heading: '[DisplayFont]', serif;
  --font-body: 'Inter', sans-serif;
  --clr-primary: [from style tokens];
  --clr-primary-dark: [darker shade];
  --clr-primary-glow: [rgba of primary at 0.25];
  --clr-text: #0f172a;
  --clr-text-muted: #64748b;
  --clr-bg: #ffffff;
  --clr-surface: #f8fafc;
  --clr-border: rgba(15,23,42,.08);
  --clr-hero: [from style tokens];
  --r-sm: 8px; --r-md: 14px; --r-lg: 22px; --r-full: 9999px;
  --shadow-sm: 0 1px 4px rgba(0,0,0,.07);
  --shadow-md: 0 4px 20px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06);
  --shadow-lg: 0 20px 60px rgba(0,0,0,.15), 0 6px 20px rgba(0,0,0,.08);
  --shadow-glow: 0 8px 32px var(--clr-primary-glow);
  --max-w: 1200px;
  --section-py: clamp(72px, 9vw, 128px);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; font-size: 16px; }
body { font-family: var(--font-body); background: var(--clr-bg); color: var(--clr-text); line-height: 1.75; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
img, video { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; color: inherit; }
.container { max-width: var(--max-w); margin: 0 auto; padding: 0 clamp(1.25rem, 5vw, 2.5rem); }
section { padding: var(--section-py) 0; }

NAVIGATION:
header { position: sticky; top: 0; z-index: 100; }
nav { background: rgba(255,255,255,.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--clr-border); }
.nav-inner { display: flex; align-items: center; justify-content: space-between; height: 72px; gap: 2rem; }
.nav-logo { font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; color: var(--clr-primary); letter-spacing: -.02em; }
.nav-links { display: flex; align-items: center; gap: 0.25rem; list-style: none; }
.nav-links a { padding: .45rem .9rem; border-radius: var(--r-sm); font-size: .9rem; font-weight: 500; color: var(--clr-text-muted); transition: color 180ms, background 180ms; }
.nav-links a:hover { color: var(--clr-text); background: var(--clr-surface); }
.btn-nav { background: var(--clr-primary) !important; color: #fff !important; padding: .5rem 1.25rem !important; border-radius: var(--r-full) !important; font-weight: 600 !important; display: inline-flex !important; align-items: center !important; gap: .4rem !important; transition: all 180ms !important; }
.btn-nav:hover { background: var(--clr-primary-dark) !important; transform: translateY(-1px) !important; box-shadow: var(--shadow-glow) !important; }
#menu-toggle { display: none; background: none; border: 1px solid var(--clr-border); border-radius: var(--r-sm); padding: .5rem; cursor: pointer; }
.hamburger { width: 20px; display: flex; flex-direction: column; gap: 4px; }
.hamburger span { height: 2px; background: var(--clr-text); border-radius: 2px; transition: all 280ms cubic-bezier(.4,0,.2,1); display: block; }

HERO:
#hero { min-height: 100vh; background: var(--clr-hero); display: flex; align-items: center; position: relative; overflow: hidden; padding: calc(var(--section-py) + 72px) 0 var(--section-py); }
#hero::before { content: ''; position: absolute; width: 70vw; height: 70vw; max-width: 900px; max-height: 900px; background: radial-gradient(circle, var(--clr-primary-glow) 0%, transparent 65%); top: -25%; right: -15%; border-radius: 50%; pointer-events: none; }
#hero::after { content: ''; position: absolute; width: 40vw; height: 40vw; max-width: 500px; background: radial-gradient(circle, var(--clr-primary-glow) 0%, transparent 65%); bottom: -10%; left: -5%; border-radius: 50%; opacity: .5; pointer-events: none; }
.hero-content { position: relative; z-index: 1; max-width: 780px; }
.hero-eyebrow { display: inline-flex; align-items: center; gap: .5rem; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15); border-radius: var(--r-full); padding: .35rem 1rem; font-size: .78rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--clr-primary); margin-bottom: 1.5rem; }
.hero-title { font-family: var(--font-heading); font-size: clamp(3rem, 6.5vw, 5.5rem); font-weight: 800; line-height: 1.08; letter-spacing: -.03em; color: #fff; margin-bottom: 1.5rem; }
.hero-title .highlight { color: var(--clr-primary); }
.hero-subtitle { font-size: clamp(1.05rem, 1.8vw, 1.25rem); color: rgba(255,255,255,.7); line-height: 1.85; margin-bottom: 2.5rem; max-width: 580px; }
.hero-actions { display: flex; flex-wrap: wrap; gap: .875rem; align-items: center; }
.hero-social-proof { margin-top: 3.5rem; padding-top: 2.5rem; border-top: 1px solid rgba(255,255,255,.1); display: flex; gap: 2.5rem; }
.proof-stat .num { font-family: var(--font-heading); font-size: 2rem; font-weight: 800; color: #fff; }
.proof-stat .label { font-size: .8rem; color: rgba(255,255,255,.55); margin-top: .2rem; }

BUTTONS:
.btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .9rem 2rem; border-radius: var(--r-full); font-weight: 600; font-size: .95rem; cursor: pointer; transition: all 200ms cubic-bezier(.4,0,.2,1); border: none; min-height: 52px; white-space: nowrap; }
.btn-primary { background: var(--clr-primary); color: #fff; box-shadow: var(--shadow-glow); }
.btn-primary:hover { background: var(--clr-primary-dark); transform: translateY(-2px); box-shadow: 0 12px 40px var(--clr-primary-glow); }
.btn-ghost { background: rgba(255,255,255,.08); color: #fff; border: 1.5px solid rgba(255,255,255,.25); }
.btn-ghost:hover { background: rgba(255,255,255,.15); border-color: rgba(255,255,255,.5); transform: translateY(-2px); }
.btn-light { background: #fff; color: var(--clr-text); box-shadow: var(--shadow-md); }
.btn-light:hover { background: var(--clr-surface); transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.btn-outline { background: transparent; color: var(--clr-primary); border: 2px solid var(--clr-primary); }
.btn-outline:hover { background: var(--clr-primary); color: #fff; transform: translateY(-2px); }

SECTION HEADERS (always use this pattern):
.section-tag { display: inline-block; font-size: .73rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--clr-primary); margin-bottom: .9rem; }
.section-title { font-family: var(--font-heading); font-size: clamp(1.9rem, 4vw, 3.2rem); font-weight: 800; letter-spacing: -.025em; line-height: 1.15; color: var(--clr-text); margin-bottom: 1.1rem; }
.section-subtitle { font-size: 1.05rem; color: var(--clr-text-muted); max-width: 600px; line-height: 1.8; }
.section-header { margin-bottom: clamp(3rem, 5vw, 5rem); }
.section-header.centered { text-align: center; }
.section-header.centered .section-subtitle { margin: 0 auto; }

FEATURE CARDS (always 3-col desktop, 1-col mobile):
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.feature-card { background: var(--clr-surface); border: 1px solid var(--clr-border); border-radius: var(--r-lg); padding: 2rem 1.75rem; transition: all 300ms cubic-bezier(.4,0,.2,1); }
.feature-card:hover { transform: translateY(-8px); box-shadow: var(--shadow-lg); border-color: rgba(var(--clr-primary),.2); }
.feature-icon { width: 54px; height: 54px; border-radius: var(--r-md); background: linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark)); display: flex; align-items: center; justify-content: center; margin-bottom: 1.4rem; font-size: 1.35rem; color: #fff; box-shadow: var(--shadow-glow); }
.feature-title { font-family: var(--font-heading); font-size: 1.12rem; font-weight: 700; margin-bottom: .6rem; letter-spacing: -.01em; }
.feature-body { font-size: .92rem; color: var(--clr-text-muted); line-height: 1.75; }

TESTIMONIALS:
.testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.testimonial-card { background: var(--clr-bg); border: 1px solid var(--clr-border); border-radius: var(--r-lg); padding: 1.75rem; transition: all 300ms; }
.testimonial-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-md); }
.stars { color: #f59e0b; font-size: .9rem; margin-bottom: 1rem; letter-spacing: .1em; }
.testimonial-text { font-size: .95rem; line-height: 1.8; color: var(--clr-text); margin-bottom: 1.5rem; font-style: italic; }
.testimonial-author { display: flex; align-items: center; gap: .75rem; }
.author-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: var(--clr-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: .85rem; flex-shrink: 0; }
.author-name { font-weight: 600; font-size: .9rem; color: var(--clr-text); }
.author-role { font-size: .78rem; color: var(--clr-text-muted); }

ALTERNATING SECTIONS: odd sections use --clr-bg, even sections use --clr-surface for rhythm
DARK CTA SECTION: background: var(--clr-hero); color: white; text-align: center; padding: var(--section-py) 0;

FOOTER (always dark, always multi-column):
footer { background: #0c1120; color: rgba(255,255,255,.65); }
.footer-main { padding: clamp(3.5rem, 7vw, 6rem) 0 3rem; }
.footer-grid { display: grid; grid-template-columns: 1.8fr repeat(3, 1fr); gap: 2.5rem; }
.footer-brand-name { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 800; color: #fff; }
.footer-brand-desc { font-size: .875rem; line-height: 1.8; margin-top: .75rem; max-width: 240px; }
.footer-col-title { font-size: .78rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #fff; margin-bottom: 1.25rem; }
.footer-col-links { list-style: none; display: flex; flex-direction: column; gap: .6rem; }
.footer-col-links a { font-size: .875rem; transition: color 180ms; }
.footer-col-links a:hover { color: #fff; }
.footer-social { display: flex; gap: .625rem; margin-top: 1.5rem; }
.footer-social a { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(255,255,255,.12); display: flex; align-items: center; justify-content: center; font-size: .875rem; transition: all 200ms; }
.footer-social a:hover { background: var(--clr-primary); border-color: var(--clr-primary); color: #fff; transform: translateY(-2px); }
.footer-bottom { border-top: 1px solid rgba(255,255,255,.07); padding: 1.5rem 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; font-size: .8rem; }

RESPONSIVE:
@media (max-width: 1024px) {
  .features-grid, .testimonials-grid { grid-template-columns: repeat(2,1fr); }
  .footer-grid { grid-template-columns: 1fr 1fr; gap: 2rem; }
}
@media (max-width: 768px) {
  .features-grid, .testimonials-grid { grid-template-columns: 1fr; }
  .nav-links { display: none; flex-direction: column; position: absolute; top: 72px; left: 0; right: 0; background: rgba(255,255,255,.98); border-bottom: 1px solid var(--clr-border); padding: 1rem 1.25rem; gap: .25rem; z-index: 99; }
  nav.is-open .nav-links { display: flex; }
  #menu-toggle { display: flex; }
  .footer-grid { grid-template-columns: 1fr; }
  .footer-bottom { flex-direction: column; text-align: center; }
}
@media (max-width: 480px) {
  .hero-title { font-size: 2.4rem; }
  .hero-actions { flex-direction: column; align-items: flex-start; }
  .hero-social-proof { flex-direction: column; gap: 1.25rem; }
}

━━━ JAVASCRIPT ━━━
AOS.init({ duration: 850, once: true, offset: 64, easing: 'ease-out-cubic' });

// Mobile nav with hamburger animation
const toggle = document.getElementById('menu-toggle');
const nav = document.querySelector('nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    const [s1, , s3] = toggle.querySelectorAll('span');
    toggle.querySelectorAll('span')[1].style.opacity = open ? '0' : '';
    toggle.querySelectorAll('span')[1].style.transform = open ? 'scaleX(0)' : '';
    s1.style.transform = open ? 'rotate(45deg) translate(4px, 5px)' : '';
    s3.style.transform = open ? 'rotate(-45deg) translate(4px, -5px)' : '';
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    toggle.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }));
}

// Smooth scroll for anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// Optional: header shadow on scroll
window.addEventListener('scroll', () => {
  document.querySelector('header')?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

━━━ CONTENT RULES ━━━
• NEVER: Lorem Ipsum, "Your Company", "Coming Soon", "Click here", generic placeholder text
• Headlines: specific, benefit-driven, max 8 words — e.g. "Build Wealth With Confidence" not "Welcome to Our Services"
• Sub-copy: one specific sentence about real value — e.g. "We help first-time homebuyers in Austin close with confidence, from offer to keys."
• CTA labels: action + outcome — "Book Your Free Strategy Call", "View Our Portfolio", "Start Your Free Trial"
• Testimonials: 3 real-sounding people (full name, job title, company), 2-3 sentence quotes about specific results
• Stats: credible, specific — "94% client retention" not "1M+ happy customers" for a small business
• Use real Unsplash photo IDs (search for relevant images mentally and use plausible IDs)
• Footer social icons: always include fa-brands icons (fa-instagram, fa-linkedin, fa-twitter/fa-x-twitter, fa-facebook)
• Tone should match: "${'"'}professional${'"'}" = formal confident, "${'"'}bold${'"'}" = dynamic energetic, "${'"'}friendly${'"'}" = warm conversational, "${'"'}luxury${'"'}" = refined exclusive, "${'"'}minimal${'"'}" = understated precise

━━━ QUALITY CHECKLIST ━━━
Before finalizing, verify:
✓ Hero is full-viewport, has both radial gradient decorations, eyebrow + headline + sub + 2 CTAs + social proof stats
✓ Google Fonts actually loaded (href in <head>) — correct font names matching style tokens
✓ Font Awesome loaded, icons used on all feature cards and footer social links
✓ AOS data attributes on ALL headings, cards, stats, images with delay stagger
✓ Navigation is sticky, hamburger works on mobile
✓ At least 5 sections after hero (features/services, about/story, testimonials, CTA strip, footer)
✓ CSS :root has all variables
✓ Footer has 4 columns and social links
✓ All copy is specific to the brief, zero filler`;


// ─── Build prompts ────────────────────────────────────────────────────────────

function buildCreatePrompt(payload) {
  const { kind, style, brief, media } = payload;
  const styleId = (style?.id || "classic").toLowerCase();
  const tokens = STYLE_TOKENS[styleId] || STYLE_TOKENS.classic;
  const mediaList = (media || []).slice(0, 4)
    .map((m, i) => `  ${i + 1}. ${m.name || "image"} (alt: ${m.alt || "—"})`)
    .join("\n") || "  None — use relevant Unsplash photos throughout.";

  return `Build a complete, premium ${kind || "portfolio"} website.

══ STYLE DIRECTIVE ══
Preset: ${style?.label || "Classic"}
Font pairing: ${tokens.fonts}
Hero background color: ${tokens.heroBg}
Primary color: ${tokens.primary}  |  Primary dark: ${tokens.primaryDark}
Design feel: ${tokens.feel}
User's style note: ${style?.note || "—"}

══ PROJECT BRIEF ══
1. What to build:     ${brief?.intent || "—"}
2. Brand name:        ${brief?.identity || "—"}
3. Tagline/slogan:    ${brief?.tagline || "—"}
4. Target audience:   ${brief?.audience || "—"}
5. Sections needed:   ${brief?.offer || "Build the most relevant sections for this type of site."}
6. Tone of voice:     ${brief?.tone || "Professional"}
7. Contact / notes:   ${brief?.assets || "—"}

══ UPLOADED IMAGES ══
${mediaList}

══ REQUIREMENTS ══
- Follow ALL rules in the system prompt exactly
- Apply the style directive above to every design decision (colors, fonts, shadows, hero bg)
- Write every word of copy to match the brief above — specific, real, relevant
- If sections are specified above, include all of them in order
- Hero must have an eyebrow line, large headline (with .highlight span on the key phrase), sub-copy, and 2 CTAs
- Include a stats/social-proof row in or below the hero (3 credible numbers relevant to the brief)
- After hero: features/services section (3 cards minimum with Font Awesome icons), then content sections from brief, then testimonials (3 cards), then dark CTA section, then footer
- Footer: 4 columns — brand + tagline + social icons | nav links | services/work | contact info
- Return only JSON: {"html":"...","css":"...","js":"..."}`;
}

function buildEditPrompt(payload) {
  const { kind, style, brief, media, files, instruction } = payload;
  const styleId = (style?.id || "classic").toLowerCase();
  const tokens = STYLE_TOKENS[styleId] || STYLE_TOKENS.classic;
  const mediaList = (media || []).slice(0, 4)
    .map((m, i) => `  ${i + 1}. ${m.name || "image"} (alt: ${m.alt || "—"})`)
    .join("\n") || "  None.";

  return `Revise this existing static website.

══ EDIT REQUEST ══
${instruction}

══ ORIGINAL BRIEF ══
Site type: ${kind || "portfolio"}
Brand: ${brief?.identity || "—"} — ${brief?.tagline || ""}
Style preset: ${style?.label || "Classic"} | Primary: ${tokens.primary} | Fonts: ${tokens.fonts}
Tone: ${brief?.tone || "Professional"}
Sections: ${brief?.offer || "—"}
Contact: ${brief?.assets || "—"}

══ UPLOADED IMAGES ══
${mediaList}

══ CURRENT FILES ══
HTML:
${files?.html || "—"}

CSS:
${files?.css || "—"}

JS:
${files?.js || "—"}

══ RULES ══
- Apply the edit request precisely without destroying the existing design
- Keep all CDN links, CSS variables, and layout structure unless the edit requires changing them
- Match the original style preset and font pairing
- Return only the full updated JSON: {"html":"...","css":"...","js":"..."}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const choices = Array.isArray(data.choices) ? data.choices : [];
  if (choices[0]?.message?.content) return choices[0].message.content;
  return "";
}

function stripFences(text) {
  return text.replace(/^```(?:json|html)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parseJson(text) {
  const clean = stripFences(text);
  try { return JSON.parse(clean); } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }
}

function ensureHtml(html) {
  let out = (html || "").trim();
  if (!/<!doctype html>/i.test(out)) {
    out = `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>kanyoai site</title>\n</head>\n<body>\n${out}\n</body>\n</html>`;
  }
  if (!/<link[^>]+href=["']style\.css["']/i.test(out))
    out = out.replace(/<\/head>/i, `  <link rel="stylesheet" href="style.css">\n</head>`);
  if (!/<script[^>]+src=["']script\.js["']/i.test(out))
    out = out.replace(/<\/body>/i, `  <script src="script.js"></script>\n</body>`);
  return out;
}

function normalizeOutput(text) {
  const parsed = parseJson(text);
  if (parsed && typeof parsed === "object") {
    const html = String(parsed.html || parsed["index.html"] || "");
    const css = String(parsed.css || parsed["style.css"] || "");
    const js = String(parsed.js || parsed.javascript || parsed["script.js"] || "");
    if (html || css || js) return { html: ensureHtml(html), css, js };
  }
  let html = stripFences(text);
  let css = "";
  let js = "";
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, inner) => { css += inner.trim() + "\n"; return ""; });
  html = html.replace(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi, (_, inner) => { js += inner.trim() + "\n"; return ""; });
  return { html: ensureHtml(html), css: css.trim(), js: js.trim() };
}

function resolveModel(raw) {
  const name = typeof raw === "string" ? raw.trim() : "";
  const allowed = [
    "gpt-5.5", "gpt-5.4", "gpt-5.4-mini", "gpt-5.4-nano",
    "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini",
  ];
  return allowed.includes(name) ? name : "gpt-5.4-mini";
}

// ─── Handler ──────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Sign in to use the AI builder." });

  if (supabaseUrl && serviceKey) {
    try {
      const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data: { user }, error } = await sb.auth.getUser(token);
      if (error || !user) return res.status(401).json({ error: "Session expired. Sign in again." });
    } catch {
      return res.status(401).json({ error: "Could not verify session." });
    }
  }

  const body = req.body || {};
  const mode = body.mode === "edit" ? "edit" : "create";

  if (mode === "create" && !body.brief?.intent?.trim())
    return res.status(400).json({ error: "A website description is required." });
  if (mode === "edit" && !body.instruction?.trim())
    return res.status(400).json({ error: "An edit instruction is required." });

  const model = resolveModel(body.model);
  const userText = mode === "edit" ? buildEditPrompt(body) : buildCreatePrompt(body);

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText },
        ],
        max_completion_tokens: 12000,
        temperature: 0.65,
      }),
    });

    const raw = await openaiRes.text();
    if (!openaiRes.ok) {
      let msg = "OpenAI request failed.";
      try { msg = JSON.parse(raw).error?.message || msg; } catch {}
      return res.status(openaiRes.status).json({ error: msg });
    }

    const data = JSON.parse(raw);
    const outputText = parseOutputText(data);
    if (!outputText) return res.status(500).json({ error: "OpenAI returned no content." });

    const files = normalizeOutput(outputText);
    return res.status(200).json({ ...files, model });
  } catch (err) {
    console.error("generate error", err);
    return res.status(500).json({ error: err.message || "Generation failed." });
  }
};
