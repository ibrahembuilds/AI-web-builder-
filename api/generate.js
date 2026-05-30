// Vercel serverless function — kanyoai AI site generator
// Verifies Supabase JWT, then calls OpenAI chat/completions.
// POST /api/generate — requires Authorization: Bearer <supabase_access_token>

const { createClient } = require("@supabase/supabase-js");

// ─── Style tokens per preset ──────────────────────────────────────────────────
const STYLE_TOKENS = {
  classic: {
    fonts: "Playfair Display (headings 700/800) + Inter (body 400/500/600)",
    heroBg: "#0f172a",
    primary: "#2563eb",
    primaryDark: "#1d4ed8",
    feel: "editorial, professional, trustworthy — navy + white + blue",
  },
  minimal: {
    fonts: "Inter (headings 800, body 400/500 — single font throughout)",
    heroBg: "#f8fafc",
    primary: "#18181b",
    primaryDark: "#09090b",
    feel: "quiet, content-first, focused — monochromatic with single accent, dark hero optional",
  },
  dark: {
    fonts: "Space Grotesk (headings 700/800) + Inter (body)",
    heroBg: "#050d1a",
    primary: "#3b82f6",
    primaryDark: "#2563eb",
    feel: "technical, futuristic, sharp — add glow box-shadow on primary elements, dark throughout",
  },
  saas: {
    fonts: "Plus Jakarta Sans (headings 700/800) + Inter (body)",
    heroBg: "#f0f4ff",
    primary: "#1d4ed8",
    primaryDark: "#1e40af",
    feel: "product-led, conversion-optimized, feature-rich — light hero with blue gradient blob",
  },
  bold: {
    fonts: "Syne (headings 800) + Inter (body)",
    heroBg: "#09090b",
    primary: "#f97316",
    primaryDark: "#ea580c",
    feel: "high-energy, vibrant, impactful — use oversized typography, orange accents on black",
  },
  luxury: {
    fonts: "Cormorant Garamond (headings 400/700) + EB Garamond (body 400)",
    heroBg: "#0c0a09",
    primary: "#d97706",
    primaryDark: "#b45309",
    feel: "exclusive, refined, premium — gold on near-black, generous whitespace, elegant serif",
  },
  nature: {
    fonts: "Nunito (headings 700/800) + Inter (body)",
    heroBg: "#052e16",
    primary: "#16a34a",
    primaryDark: "#15803d",
    feel: "organic, calm, sustainable — forest green hero, soft rounded shapes, earthy palette",
  },
  magazine: {
    fonts: "Playfair Display (headings 700/800) + Lora (body 400/500)",
    heroBg: "#fafaf9",
    primary: "#dc2626",
    primaryDark: "#b91c1c",
    feel: "editorial, authoritative, structured — dark serif text on off-white, red accent, news-layout",
  },
  funnel: {
    fonts: "Plus Jakarta Sans (headings 700/800) + Inter (body)",
    heroBg: "#1e0a3c",
    primary: "#7c3aed",
    primaryDark: "#6d28d9",
    feel: "conversion-focused, high-contrast purple gradient, urgency-driven CTAs, trust badges, countdown, social proof everywhere",
  },
  workshop: {
    fonts: "Plus Jakarta Sans (headings 700/800) + Inter (body)",
    heroBg: "#1e1b4b",
    primary: "#4f46e5",
    primaryDark: "#4338ca",
    feel: "educational, registration-focused, warm indigo — schedule timeline, speaker cards, what-you-learn list, sign-up form",
  },
  events: {
    fonts: "Syne (headings 800) + Inter (body)",
    heroBg: "#0a0a0a",
    primary: "#dc2626",
    primaryDark: "#b91c1c",
    feel: "high-energy events, bold date/venue display, speaker lineup grid, ticket CTA, countdown timer — dark with red accent",
  },
};

// ─── System prompts ───────────────────────────────────────────────────────────

const EDIT_SYSTEM_PROMPT = `You are a precise code surgeon making targeted changes to an existing website.

CRITICAL RULES:
1. Read the existing HTML, CSS, and JS carefully before touching anything
2. Make ONLY the changes described in the edit request — nothing else
3. Preserve ALL existing code that is not mentioned: HTML structure, section order, CSS variables, class names, CDN links, JavaScript
4. Do NOT restructure, re-theme, or rewrite sections that were not explicitly requested
5. Do NOT add new sections or features unless directly asked
6. Do NOT change fonts, color palette, or style preset unless explicitly requested
7. Preserve every CDN link (Google Fonts, Font Awesome, AOS). Preserve CSS :root variables unless the edit asks for color, typography, spacing, or theme changes
8. The returned files must be complete (not partial diffs) — copy unchanged parts verbatim

OUTPUT: Return ONLY valid JSON: {"html":"...","css":"...","js":"..."}`;

const SYSTEM_PROMPT = `You are an elite frontend developer and award-winning web designer. Sites you build win Awwwards and CSS Design Awards. Every site must be genuinely stunning — not a template, not generic. Specific to the brief, agency-quality throughout.

The site must feel hand-directed by a senior designer, not AI-made. Avoid generic SaaS blocks, repetitive card grids, vague copy, stock phrases, fake overblown metrics, and one-size-fits-all section order. Let the brand, audience, user colors, logo, images, and site type drive the layout, icon choices, photography, spacing, and voice.

OUTPUT: Return ONLY valid JSON: {"html":"...","css":"...","js":"..."}. No markdown fences, no explanation text, no extra keys.

━━━ MUST-HAVE ON EVERY WEBSITE ━━━
1. HERO — full-viewport bold/dark bg; TWO radial gradient blob decorations (::before top-right, ::after bottom-left); child <div class="hero-grid"> for grid/dot overlay (opacity 0.035, 64px grid); eyebrow badge; h1 with .highlight class on key word (background-clip:text gradient — NEVER solid color); powerful sub-headline; 2 CTA buttons; social proof stats row below CTAs
2. GOOGLE FONTS — 2 fonts in <head>: display font for headings + Inter for body (per style directive in user message)
3. FONT AWESOME 6 — loaded from CDN; used on every feature card icon, nav CTA button, footer social links
4. AOS ANIMATIONS — data-aos on every heading/card/stat/image; stagger via data-aos-delay="0"/"100"/"200"/"300"
5. STICKY NAV — backdrop-blur:20px glass nav, logo + links + pill CTA button, animated hamburger mobile menu
6. FOOTER — dark (#0c1120) bg, 4-column grid, fa-brands social icons (fa-instagram fa-linkedin fa-x-twitter fa-facebook), newsletter input, copyright strip
7. CSS CUSTOM PROPERTIES — full :root block with all tokens (exact values given in user message)
8. REAL UNSPLASH PHOTOS — use realistic-looking photo IDs: https://images.unsplash.com/photo-{ID}?w=1200&q=85&auto=format&fit=crop
9. RESPONSIVE — 360px/768px/1280px breakpoints; 3-col grids → 2-col at 1024px → 1-col at 768px; mobile-first
10. MICRO-INTERACTIONS — buttons: translateY(-3px)+glow on hover; cards: translateY(-10px)+scale(1.02)+shadow; nav links: color+bg transition

━━━ STRUCTURE ━━━
After hero: build the sections that fit the brief and selected pages. Include features/services when useful, proof/testimonials only when they make sense, a strong CTA, and footer. Do not force a generic SaaS order onto portfolios, events, luxury brands, or local businesses.
Sections should have visual rhythm using --clr-bg and --clr-surface, but vary composition with editorial splits, media bands, timelines, galleries, process rows, comparison blocks, or pricing only when appropriate.
Minimum 6 total sections unless selected pages explicitly require fewer.

━━━ CONTENT RULES ━━━
• NEVER: Lorem Ipsum, "Your Company", "Coming Soon", "Click here", generic placeholder text
• Headlines: benefit-driven, punchy — "Build Wealth With Confidence" not "Welcome to Our Services"
• CTA labels: action + outcome — "Book Your Free Strategy Call", "Start Your Free Trial"
• Testimonials: 3 real-sounding people (full name, job title, company), 2-3 sentences with specific results
• Stats: credible, specific to the context — not "1M+ happy customers" for a local/small business
• All nav links: href="#section-id" pointing to real section IDs in the page — NEVER /about or relative paths
• Tone: professional=formal confident, bold=dynamic energetic, friendly=warm conversational, luxury=refined exclusive, minimal=understated precise

━━━ QUALITY CHECKLIST ━━━
✓ Hero: full-viewport, ::before+::after blobs, .hero-grid child div, .highlight background-clip:text gradient, eyebrow badge, 2 CTAs, proof stats row
✓ Google Fonts (2 families) + Font Awesome 6 + AOS — all loaded in <head>
✓ AOS data-aos on ALL headings, cards, stats, images — staggered delays
✓ All nav links href="#section-id" — zero /page paths or external links
✓ Feature cards: Font Awesome icons + ::before gradient overlay on hover
✓ Footer: 4 columns, newsletter input, fa-brands social, copyright strip
✓ Zero filler copy — every word specific to the brief`;

// ─── Build prompts ────────────────────────────────────────────────────────────

function normalizeHex(value, fallback) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function colorTokens(style, baseTokens) {
  const custom = style?.customColors || {};
  if (!custom.enabled) {
    return {
      ...baseTokens,
      text: "#0f172a",
      muted: "#64748b",
      bg: "#ffffff",
      surface: "#f8fafc",
      customPalette: "",
    };
  }

  const primary = normalizeHex(custom.primary, baseTokens.primary);
  const secondary = normalizeHex(custom.secondary, baseTokens.heroBg);
  const bg = normalizeHex(custom.background, "#ffffff");
  const surface = normalizeHex(custom.surface, "#f8fafc");
  const text = normalizeHex(custom.text, "#0f172a");

  return {
    ...baseTokens,
    primary,
    primaryDark: secondary,
    heroBg: secondary,
    text,
    muted: text,
    bg,
    surface,
    feel: `${baseTokens.feel}; exact user palette with ${primary} as the action color and ${secondary} as the deep brand color`,
    customPalette: `Primary ${primary}, secondary/hero ${secondary}, background ${bg}, surface ${surface}, text ${text}.`,
  };
}

function iconDirective(style) {
  const id = style?.iconStyle || "contextual-line";
  const labels = {
    "contextual-line": "clean line-style Font Awesome icons that are specific to each feature",
    "solid-badges": "solid filled icon badges with strong contrast and brand-colored surfaces",
    "minimal-symbols": "minimal symbols used sparingly, with more whitespace and less decoration",
    "premium-duotone": "premium two-tone icon badges with layered color and subtle depth",
  };
  return labels[id] || labels["contextual-line"];
}

function buildCreatePrompt(payload) {
  const { kind, style, brief, media, aiImageUrls, logoDataUrl, selectedPages, popup } = payload;
  const styleId = (style?.id || "classic").toLowerCase();
  const tokens = colorTokens(style, STYLE_TOKENS[styleId] || STYLE_TOKENS.classic);
  const customPaletteBlock = tokens.customPalette
    ? `\n══ USER CUSTOM COLORS — NON-NEGOTIABLE ══\nUse these exact colors in :root and throughout the design:\n${tokens.customPalette}\nDo not substitute a preset palette. If contrast is needed, use transparent tints of these exact colors.`
    : "";
  const imageDirection =
    typeof style?.imageDirection === "string" ? style.imageDirection.trim() : "";
  const logoPrompt = typeof style?.logoPrompt === "string" ? style.logoPrompt.trim() : "";
  const iconsBlock = `\n══ ICON DIRECTION ══\nUse ${iconDirective(style)}. Pick icons semantically from the site's actual services, not generic magic/rocket icons. Every icon needs a matching aria-hidden="true" class and must align visually with the palette.`;

  // Build media/image block
  const customUrls = (aiImageUrls || []).filter(Boolean).slice(0, 3);
  const uploadedMedia = (media || []).slice(0, 4).filter((m) => m.name || m.url);

  let imagesBlock;
  if (customUrls.length > 0) {
    imagesBlock = `══ AI-GENERATED IMAGES — EMBED THESE EXACT URLs ══
${customUrls.map((u, i) => `  ${i + 1}. ${u}`).join("\n")}
• Image 1: hero section background + <img> in hero content. Others: use in relevant sections.
Do NOT use Unsplash for sections where these are available.
${imageDirection ? `User image direction: ${imageDirection}` : ""}`;
  } else if (uploadedMedia.some((m) => m.url)) {
    const withUrls = uploadedMedia.filter((m) => m.url);
    imagesBlock = `══ UPLOADED IMAGES (permanent URLs) ══
${withUrls.map((m, i) => `  ${i + 1}. ${m.name || "image"} — URL: ${m.url} (alt: ${m.alt || "—"})`).join("\n")}
Use these URLs in <img> tags. Fill remaining sections with Unsplash photos.
${imageDirection ? `User image direction for any generated/stock image choices: ${imageDirection}` : ""}`;
  } else {
    const mediaList =
      uploadedMedia
        .map((m, i) => `  ${i + 1}. ${m.name || "image"} (alt: ${m.alt || "—"})`)
        .join("\n") || "  None — use relevant Unsplash photos throughout.";
    imagesBlock = `══ UPLOADED IMAGES ══\n${mediaList}${imageDirection ? `\nUser image direction: ${imageDirection}` : ""}`;
  }

  // Logo block
  const logoBlock = logoDataUrl
    ? `\n══ LOGO ══\nThe user has uploaded a logo. Embed it in the nav and footer using this exact <img> tag:\n<img src="${logoDataUrl}" alt="${brief?.identity || "Logo"}" class="logo-img" style="height:44px;width:auto;display:block;" />\nNever use text-only logo — always use this <img> tag.`
    : logoPrompt
      ? `\n══ LOGO DIRECTION ══\nNo image logo was uploaded, but the user wants this logo feel: ${logoPrompt}. Build a polished text logo with a small CSS icon mark that matches this direction.`
      : "";

  // Pages / sections block
  const pages = Array.isArray(selectedPages) && selectedPages.length > 1 ? selectedPages : null;
  const pagesBlock = pages
    ? `\n══ REQUIRED SECTIONS ══\nBuild each of these as a distinct, fully-designed section with a matching nav link:\n${pages.map((p, i) => `${i + 1}. ${p}`).join("\n")}\nEvery section must have a unique id="" that its nav link uses as href="#id".`
    : "";

  // Popup block
  const popupBlock =
    popup && popup.enabled
      ? `\n══ POPUP ══\nAdd a working popup to the site.\nType: ${popup.type || "newsletter"}\nTrigger: ${popup.trigger === "onload" ? `on page load after ${popup.delay || 3}s` : popup.trigger === "scroll" ? "when user scrolls 40% down the page" : "on exit intent (mouseleave from top of viewport)"}\nTitle: "${popup.title || "Stay in the loop"}"\nMessage: "${popup.message || "Get the latest updates delivered to your inbox."}"\nButton label: "${popup.buttonText || "Subscribe"}"\nCollect fields: ${[popup.collectName && "name", popup.collectEmail !== false && "email", popup.collectPhone && "phone"].filter(Boolean).join(", ") || "email"}\nDesign: full-screen semi-transparent overlay (rgba(0,0,0,.65)), centered white card (max-w:460px, --r-lg, p:40px), close × button top-right, brand-colored submit button (--clr-primary), fade-in + scale animation (0.3s ease), close on overlay click or × click.\nJS: trigger logic + basic field validation + close handlers.`
      : "";

  // Compute primary-glow rgba approximation from hex primary
  const hexToGlow = (hex) => {
    const h = hex.replace("#", "");
    const r = parseInt(h.substr(0, 2), 16),
      g = parseInt(h.substr(2, 2), 16),
      b = parseInt(h.substr(4, 2), 16);
    return `rgba(${r},${g},${b},.25)`;
  };
  const primaryGlow = hexToGlow(tokens.primary);

  return `Build a complete, premium ${kind || "portfolio"} website.

══ STYLE DIRECTIVE ══
Preset: ${style?.label || "Classic"}
Font pairing: ${tokens.fonts}
Hero bg: ${tokens.heroBg} | Primary: ${tokens.primary} | Primary dark: ${tokens.primaryDark}
Design feel: ${tokens.feel}
Style note: ${style?.note || "—"}
${customPaletteBlock}

══ PROJECT BRIEF ══
1. What to build:   ${brief?.intent || "—"}
2. Brand name:      ${brief?.identity || "—"}
3. Tagline:         ${brief?.tagline || "—"}
4. Audience:        ${brief?.audience || "—"}
5. Sections:        ${brief?.offer || "Build the most relevant sections for this site type."}
6. Tone:            ${brief?.tone || "Professional"}
7. Notes:           ${brief?.assets || "—"}
${logoBlock}
${imagesBlock}${iconsBlock}${pagesBlock}${popupBlock}

══ CSS :root TOKENS ══
Start style.css with exactly this :root block (fill in font names from style directive):
:root {
  --font-heading: '[DisplayFont]', serif;
  --font-body: 'Inter', sans-serif;
  --clr-primary: ${tokens.primary};
  --clr-primary-dark: ${tokens.primaryDark};
  --clr-primary-glow: ${primaryGlow};
  --clr-hero: ${tokens.heroBg};
  --clr-text: ${tokens.text}; --clr-text-muted: ${tokens.muted};
  --clr-bg: ${tokens.bg}; --clr-surface: ${tokens.surface};
  --clr-border: rgba(15,23,42,.08);
  --r-sm:8px; --r-md:14px; --r-lg:22px; --r-full:9999px;
  --shadow-sm:0 1px 4px rgba(0,0,0,.07);
  --shadow-md:0 4px 20px rgba(0,0,0,.10),0 1px 4px rgba(0,0,0,.06);
  --shadow-lg:0 20px 60px rgba(0,0,0,.15),0 6px 20px rgba(0,0,0,.08);
  --shadow-glow:0 8px 32px var(--clr-primary-glow);
  --max-w:1200px; --section-py:clamp(72px,9vw,128px);
}

══ CLASS NAME GUIDE ══
Use these exact class names so styles stay consistent:
• Layout: .container (max-w centered clamp-padding), section { padding: var(--section-py) 0 }
• Nav: header (sticky top:0 z-100), nav (backdrop-blur bg-white/92 border-bottom), .nav-inner (flex justify-between h-72px), .nav-links (flex list-none), .btn-nav (pill CTA button)
• Hero: #hero (min-h-100vh flex align-center relative overflow-hidden), .hero-grid (absolute inset-0 grid-pattern child), .hero-content (relative z-1 max-w-820px), .hero-eyebrow (badge), .hero-title (.highlight uses background-clip:text gradient), .hero-subtitle, .hero-actions, .hero-social-proof, .proof-stat (.num big + .label small)
• Buttons: .btn (inline-flex align-center gap .5rem --r-full min-h-52px), .btn-primary (primary bg + glow shadow), .btn-ghost (white/8 bg border), .btn-light (white bg), .btn-outline (transparent + border)
• Sections: .section-header (.section-tag gradient-text uppercase label, .section-title display-font 800, .section-subtitle muted max-w-600px), .section-header.centered
• Cards: .features-grid (3-col desktop), .feature-card (surface bg border --r-lg hover:translateY+scale + ::before gradient overlay), .feature-icon (gradient square 58px)
• Testimonials: .testimonials-grid (3-col), .testimonial-card, .stars, .testimonial-text, .testimonial-author, .author-avatar (gradient circle), .author-name, .author-role
• Footer: footer (#0c1120), .footer-main, .footer-grid (1.8fr+3×1fr), .footer-brand-name, .footer-brand-desc, .footer-col-title, .footer-col-links, .footer-social (round icon buttons), .footer-bottom (flex justify-between)

══ JS ESSENTIALS ══
AOS.init({ duration:850, once:true, offset:64, easing:'ease-out-cubic' });
Mobile nav: toggle 'is-open' on nav element on hamburger click; animate hamburger spans (rotate/fade); close on any nav link click.
Smooth scroll: a[href^="#"] → e.preventDefault() → target.scrollIntoView({behavior:'smooth'}).
Header shadow: toggle 'scrolled' class on <header> when window.scrollY > 20.

══ FINAL REQUIREMENTS ══
• Apply style directive to every design decision (colors, fonts, shadows, hero bg, feel)
• Write copy specific to the brief — zero generic text, zero Lorem Ipsum
• Hero FIRST child: <div class="hero-grid"></div>
• All nav links: href="#section-id" — real IDs present in the page, NEVER /page paths
• Use real Unsplash photo IDs relevant to the brief topic (not generic placeholders)
• Return ONLY JSON: {"html":"...","css":"...","js":"..."}`;
}

function buildEditPrompt(payload) {
  const { kind, style, brief, media, files, instruction, logoDataUrl } = payload;
  const styleId = (style?.id || "classic").toLowerCase();
  const tokens = colorTokens(style, STYLE_TOKENS[styleId] || STYLE_TOKENS.classic);
  const mediaList =
    (media || [])
      .slice(0, 4)
      .map(
        (m, i) =>
          `  ${i + 1}. ${m.name || "image"}${m.url ? ` — URL: ${m.url}` : ""} (alt: ${m.alt || "—"})`,
      )
      .join("\n") || "  None.";
  const logoBlock = logoDataUrl
    ? `\nUploaded/generated logo available for edits:\n<img src="${logoDataUrl}" alt="${brief?.identity || "Logo"}" class="logo-img" />`
    : "";
  const customPalette = tokens.customPalette
    ? `\nCustom palette currently preferred: ${tokens.customPalette}`
    : "";

  return `Apply this targeted change to the existing website. Only modify what is asked. Copy all other code exactly.

══ EDIT REQUEST (the ONLY thing to change) ══
${instruction}

══ SITE CONTEXT (do not change unless the edit requires it) ══
Site type: ${kind || "portfolio"}
Brand: ${brief?.identity || "—"} — ${brief?.tagline || ""}
Style preset: ${style?.label || "Classic"} | Primary: ${tokens.primary} | Fonts: ${tokens.fonts}
Tone: ${brief?.tone || "Professional"}
Icon direction: ${iconDirective(style)}
Image direction: ${style?.imageDirection || "—"}${customPalette}${logoBlock}

══ IMAGES ══
${mediaList}

══ EXISTING HTML (copy verbatim — modify ONLY what the edit requires) ══
${files?.html || "—"}

══ EXISTING CSS (copy verbatim — modify ONLY what the edit requires) ══
${files?.css || "—"}

══ EXISTING JS (copy verbatim — modify ONLY what the edit requires) ══
${files?.js || "—"}

══ INSTRUCTIONS ══
- Touch ONLY the elements mentioned in the edit request
- Understand natural language edits. If the user says "make it warmer", "use my color", "add my logo", "make the icons premium", or "make this less AI", translate that into focused updates to CSS variables, the relevant section, icons, imagery, and copy.
- If the edit is about colors, update :root variables first and then any hard-coded color leftovers.
- If the edit is about logo/image/icon work, use the supplied logo/image assets and the existing Font Awesome system instead of inventing unrelated placeholders.
- Copy every unchanged line exactly — do not re-indent or restructure
- Preserve all CDN links, :root variables, section IDs, class names
- Return the complete updated files as JSON: {"html":"...","css":"...","js":"..."}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseOutputText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const choices = Array.isArray(data.choices) ? data.choices : [];
  if (choices[0]?.message?.content) return choices[0].message.content;
  return "";
}

function stripFences(text) {
  return text
    .replace(/^```(?:json|html)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseJson(text) {
  const clean = stripFences(text);
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
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
  // Fallback: extract inline styles/scripts from raw HTML
  let html = stripFences(text);
  let css = "";
  let js = "";
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, inner) => {
    css += inner.trim() + "\n";
    return "";
  });
  html = html.replace(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi, (_, inner) => {
    js += inner.trim() + "\n";
    return "";
  });
  return { html: ensureHtml(html), css: css.trim(), js: js.trim() };
}

function resolveModel(raw) {
  const name = typeof raw === "string" ? raw.trim() : "";
  const allowed = [
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    "grok-4.3",
    "deepseek-v4-pro",
    "deepseek-v4-flash",
  ];
  return allowed.includes(name) ? name : "gpt-5.4-mini";
}

// DeepSeek models reject temperature values other than 1 — omit it entirely
function supportsTemperature(model) {
  return !model.startsWith("deepseek-");
}

function getProviderConfig(model, env) {
  if (model.startsWith("grok-")) {
    return {
      url: "https://api.x.ai/v1/chat/completions",
      key: env.XAI_API_KEY,
      keyName: "XAI_API_KEY",
    };
  }
  if (model.startsWith("deepseek-")) {
    return {
      url: "https://api.deepseek.com/v1/chat/completions",
      key: env.DEEPSEEK_API_KEY,
      keyName: "DEEPSEEK_API_KEY",
    };
  }
  return {
    url: "https://api.openai.com/v1/chat/completions",
    key: env.OPENAI_API_KEY,
    keyName: "OPENAI_API_KEY",
  };
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

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Sign in to use the AI builder." });

  if (supabaseUrl && serviceKey) {
    try {
      const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const {
        data: { user },
        error,
      } = await sb.auth.getUser(token);
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
  const provider = getProviderConfig(model, process.env);

  if (!provider.key) {
    return res.status(500).json({ error: `${provider.keyName} is not configured on the server.` });
  }

  const isEdit = mode === "edit";
  const systemPrompt = isEdit ? EDIT_SYSTEM_PROMPT : SYSTEM_PROMPT;
  const userText = isEdit ? buildEditPrompt(body) : buildCreatePrompt(body);
  const temperature = isEdit ? 0.1 : 0.65;

  // 50-second timeout — Vercel function limit is 60s
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), 50000);

  try {
    const openaiRes = await fetch(provider.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userText },
        ],
        max_completion_tokens: isEdit ? 8000 : 16000,
        ...(supportsTemperature(model) ? { temperature } : {}),
      }),
      signal: timeoutCtrl.signal,
    });
    clearTimeout(timeoutId);

    const raw = await openaiRes.text();

    if (!openaiRes.ok) {
      let msg = "AI generation failed.";
      try {
        const errData = JSON.parse(raw);
        const code = errData.error?.code || "";
        if (openaiRes.status === 429)
          msg = "Too many requests — please wait a moment and try again.";
        else if (code === "context_length_exceeded")
          msg = "Your description is too long. Shorten it and try again.";
        else if (code === "model_not_found")
          msg = "AI model is currently unavailable. Try a different model.";
        else if (code === "insufficient_quota")
          msg = "API quota exceeded. Check your OpenAI billing.";
        else msg = errData.error?.message || msg;
      } catch {}
      return res.status(openaiRes.status).json({ error: msg });
    }

    const data = JSON.parse(raw);
    const outputText = parseOutputText(data);
    if (!outputText) return res.status(500).json({ error: "OpenAI returned no content." });

    const files = normalizeOutput(outputText);

    // Guard against truncated output (output cut off at token limit)
    if (!isEdit && (!files.html || !/<\/html>/i.test(files.html))) {
      return res.status(500).json({
        error: "Output was cut off — try a simpler description, or switch to a faster model.",
      });
    }

    return res.status(200).json({ ...files, model });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return res
        .status(504)
        .json({ error: "Generation timed out. Try a shorter description or a faster model." });
    }
    console.error("generate error", err);
    return res.status(500).json({ error: err.message || "Generation failed." });
  }
};
