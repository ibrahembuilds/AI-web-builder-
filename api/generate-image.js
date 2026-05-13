// Vercel serverless function — kanyoai AI image generator
// Verifies Supabase JWT, calls OpenAI DALL-E 3, returns base64 PNG.
// POST /api/generate-image  { prompt, size?, quality? }

const { createClient } = require("@supabase/supabase-js");

// gpt-image-2 supported sizes
const ALLOWED_SIZES = ["1024x1024", "1536x1024", "1024x1536"];

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return res.status(500).json({ error: "OPENAI_API_KEY is not configured on the server." });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return res.status(401).json({ error: "Sign in to generate images." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "A prompt is required." });

  const size = ALLOWED_SIZES.includes(body.size) ? body.size : "1024x1024";
  const quality = body.quality === "hd" ? "hd" : "standard";

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
        output_format: "png",
      }),
    });

    const raw = await r.text();
    if (!r.ok) {
      let msg = "Image generation failed.";
      try { msg = JSON.parse(raw).error?.message || msg; } catch {}
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
    console.error("generate-image error", err);
    return res.status(500).json({ error: err?.message || "Image generation failed." });
  }
};
