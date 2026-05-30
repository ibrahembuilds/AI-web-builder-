// Vercel serverless function — kanyoai AI image generator
// Verifies Supabase JWT, calls OpenAI image generation, returns base64 PNG.
// POST /api/generate-image  { prompt, size?, quality? }

const { createClient } = require("@supabase/supabase-js");

// gpt-image-2 supported sizes
const ALLOWED_SIZES = ["1024x1024", "1536x1024", "1024x1536"];
const ALLOWED_QUALITIES = ["low", "medium", "high"];

function normalizeQuality(value) {
  if (value === "standard") return "medium";
  if (value === "hd") return "high";
  return ALLOWED_QUALITIES.includes(value) ? value : "medium";
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey)
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Sign in to generate images." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "A prompt is required." });

  const size = ALLOWED_SIZES.includes(body.size) ? body.size : "1024x1024";
  const quality = normalizeQuality(body.quality);

  // 55-second timeout — image generation can be slow
  const timeoutCtrl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtrl.abort(), 55000);

  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        n: 1,
        size,
        quality,
      }),
      signal: timeoutCtrl.signal,
    });
    clearTimeout(timeoutId);

    const raw = await r.text();
    if (!r.ok) {
      let msg = "Image generation failed.";
      try {
        const errData = JSON.parse(raw);
        const code = errData.error?.code || "";
        if (r.status === 429) msg = "Too many requests — please wait a moment and try again.";
        else if (code === "content_policy_violation")
          msg = "Image prompt was blocked by content policy. Try a different description.";
        else if (code === "billing_hard_limit_reached" || code === "insufficient_quota")
          msg = "API quota exceeded. Check your OpenAI billing.";
        else msg = errData.error?.message || msg;
      } catch {
        // Ignore non-JSON error bodies from the upstream API.
      }
      return res.status(r.status).json({ error: msg });
    }

    const data = JSON.parse(raw);
    // gpt-image-2 returns b64_json; fall back to url for older models
    const item = data.data?.[0];
    const b64 = item?.b64_json ?? null;
    const revisedPrompt = item?.revised_prompt || prompt;
    if (!b64) return res.status(500).json({ error: "No image data returned from OpenAI." });

    return res.status(200).json({ b64, revisedPrompt });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Image generation timed out. Try again." });
    }
    console.error("generate-image error", err);
    return res.status(500).json({ error: err?.message || "Image generation failed." });
  }
};
