import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Dev-only middleware that mirrors api/generate.js and api/generate-image.js
function devApiPlugin(env: Record<string, string>): Plugin {
  return {
    name: "dev-api-generate",
    apply: "serve",
    configureServer(server) {
      // Image generation endpoint (must be registered before /api/generate to avoid prefix overlap)
      server.middlewares.use("/api/generate-image", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!openaiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "OPENAI_API_KEY not set in .env.local" }));
          return;
        }

        const chunks: Buffer[] = [];
        await new Promise<void>((resolve) => {
          req.on("data", (c: Buffer) => chunks.push(c));
          req.on("end", resolve);
        });
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        } catch {
          /* ignore invalid JSON */
        }

        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        if (!prompt) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "A prompt is required." }));
          return;
        }
        const size = ["1024x1024", "1536x1024", "1024x1536"].includes(body.size as string)
          ? (body.size as string)
          : "1024x1024";
        const qualityRaw = typeof body.quality === "string" ? body.quality : "";
        const quality =
          qualityRaw === "standard"
            ? "medium"
            : qualityRaw === "hd"
              ? "high"
              : ["low", "medium", "high"].includes(qualityRaw)
                ? qualityRaw
                : "medium";

        try {
          const r = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-image-2", prompt, n: 1, size, quality }),
          });
          const raw = await r.text();
          if (!r.ok) {
            let msg = "Image generation failed.";
            try {
              msg = JSON.parse(raw).error?.message || msg;
            } catch {
              /* ignore non-JSON error bodies */
            }
            res.statusCode = r.status;
            res.end(JSON.stringify({ error: msg }));
            return;
          }
          const data = JSON.parse(raw);
          const item = data.data?.[0];
          const b64 = item?.b64_json ?? null;
          const revisedPrompt = item?.revised_prompt || prompt;
          if (!b64) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "No image returned." }));
            return;
          }
          res.statusCode = 200;
          res.end(JSON.stringify({ b64, revisedPrompt }));
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : "Image generation failed.",
            }),
          );
        }
      });

      server.middlewares.use("/api/generate", async (req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/json");

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        // Read body
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve) => {
          req.on("data", (c: Buffer) => chunks.push(c));
          req.on("end", resolve);
        });
        let body: Record<string, unknown> = {};
        try {
          body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        } catch {
          /* ignore invalid JSON */
        }

        const mode = body.mode === "edit" ? "edit" : "create";
        const modelRaw = typeof body.model === "string" ? body.model : "gpt-5.4-mini";
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
        const model = allowed.includes(modelRaw) ? modelRaw : "gpt-5.4-mini";

        // Route to the correct provider based on model name — mirrors api/generate.js
        type ProviderCfg = { url: string; key: string; keyName: string };
        function getProvider(m: string): ProviderCfg {
          if (m.startsWith("grok-"))
            return {
              url: "https://api.x.ai/v1/chat/completions",
              key: env.XAI_API_KEY || process.env.XAI_API_KEY || "",
              keyName: "XAI_API_KEY",
            };
          if (m.startsWith("deepseek-"))
            return {
              url: "https://api.deepseek.com/v1/chat/completions",
              key: env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || "",
              keyName: "DEEPSEEK_API_KEY",
            };
          return {
            url: "https://api.openai.com/v1/chat/completions",
            key: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
            keyName: "OPENAI_API_KEY",
          };
        }
        const provider = getProvider(model);
        if (!provider.key) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: `${provider.keyName} is not set in .env.local` }));
          return;
        }

        // Build prompt
        const b = (body.brief || {}) as Record<string, string>;
        const style = (body.style || {}) as Record<string, unknown>;
        const files = (body.files || {}) as Record<string, string>;
        const media = Array.isArray(body.media)
          ? (body.media as Array<{ name?: string; alt?: string }>)
          : [];
        const mediaList =
          media
            .slice(0, 4)
            .map((m, i) => `${i + 1}. ${m.name || "image"} — ${m.alt || ""}`)
            .join("\n") || "No uploaded images.";
        const styleLabel = typeof style.label === "string" ? style.label : "Classic premium";
        const styleNote = typeof style.note === "string" ? style.note : "";
        const logoDataUrl = typeof body.logoDataUrl === "string" ? body.logoDataUrl : "";
        const logoBlock = logoDataUrl
          ? `\nLogo: use this exact image in the nav and footer: <img src="${logoDataUrl}" alt="${b.identity || "Logo"}" class="logo-img" />`
          : "";
        const qualityNotes =
          "Use the user's custom colors, logo direction, image direction, and icon direction from the visual notes exactly. Make it feel hand-designed, not AI-made: no generic filler copy, no placeholder brands, no repetitive template sections, and choose icons that match each real service.";

        let userText: string;
        if (mode === "edit") {
          userText = `Revise this existing static website.\n\nEdit request: ${body.instruction}\n\nOriginal site type: ${body.kind || "portfolio"}\nVisual preset: ${styleLabel}\nVisual notes: ${styleNote}\n${qualityNotes}${logoBlock}\n\nOriginal brief:\n1. Goal: ${b.intent || ""}\n2. Name: ${b.identity || ""}\n3. Tagline: ${b.tagline || ""}\n4. Audience: ${b.audience || ""}\n5. Sections: ${b.offer || ""}\n6. Tone: ${b.tone || "professional"}\n7. Notes: ${b.assets || ""}\n\nImages:\n${mediaList}\n\nCurrent HTML:\n${files.html || ""}\n\nCurrent CSS:\n${files.css || ""}\n\nCurrent JS:\n${files.js || ""}\n\nReturn only JSON with keys "html", "css", "js".`;
        } else {
          userText = `Build this website as separate static files.\n\nSite type: ${body.kind || "portfolio"}\nVisual preset: ${styleLabel}\nVisual notes: ${styleNote}\n${qualityNotes}${logoBlock}\n\nBrief:\n1. Goal: ${b.intent || ""}\n2. Name: ${b.identity || ""}\n3. Tagline: ${b.tagline || ""}\n4. Audience: ${b.audience || ""}\n5. Sections: ${b.offer || ""}\n6. Tone: ${b.tone || "professional"}\n7. Notes: ${b.assets || ""}\n\nImages:\n${mediaList}\n\nReturn only JSON with keys "html", "css", "js".`;
        }

        const SYSTEM = `You are a senior frontend developer. Return ONLY valid JSON with keys "html", "css", "js". Write complete, real, human-feeling websites. Allow CDN libraries (Bootstrap 5, Google Fonts, Font Awesome, AOS, GSAP). No React/Vue/build tools. Use concrete copy, strong hierarchy, good spacing. No AI-slop filler text.`;

        // DeepSeek models reject temperature values other than 1 — omit it entirely
        const supportsTemp = !model.startsWith("deepseek-");

        try {
          const r = await fetch(provider.url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${provider.key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: SYSTEM },
                { role: "user", content: userText },
              ],
              max_completion_tokens: 8000,
              ...(supportsTemp ? { temperature: 0.7 } : {}),
            }),
          });
          const raw = await r.text();
          if (!r.ok) {
            let msg = "AI request failed.";
            try {
              const errData = JSON.parse(raw);
              const code = errData.error?.code || "";
              if (r.status === 429) msg = "Too many requests — wait a moment and try again.";
              else if (code === "model_not_found")
                msg = "AI model unavailable. Try a different model.";
              else msg = errData.error?.message || msg;
            } catch {
              /* ignore non-JSON error bodies */
            }
            res.statusCode = r.status;
            res.end(JSON.stringify({ error: msg }));
            return;
          }
          const data = JSON.parse(raw);
          const text: string = data.choices?.[0]?.message?.content || "";
          const clean = text
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          let parsed: Record<string, string> | null = null;
          try {
            parsed = JSON.parse(clean);
          } catch {
            const m = clean.match(/\{[\s\S]*\}/);
            if (m)
              try {
                parsed = JSON.parse(m[0]);
              } catch {
                /* ignore parse fallback failure */
              }
          }
          if (!parsed) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Could not parse AI output." }));
            return;
          }
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              html: parsed.html || "",
              css: parsed.css || "",
              js: parsed.js || "",
              model,
            }),
          );
        } catch (err: unknown) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({ error: err instanceof Error ? err.message : "Generation failed." }),
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load ALL .env/.env.local vars (empty string prefix = no filter)
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      tanstackRouter({ target: "react" }),
      react(),
      tailwindcss(),
      tsConfigPaths(),
      devApiPlugin(env),
    ],
    build: {
      outDir: "dist/static",
      emptyOutDir: true,
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        input: {
          index: path.resolve(dirname, "index.html"),
        },
        output: {
          manualChunks(id) {
            if (id.includes("/framer-motion/")) return "vendor-framer";
            if (id.includes("/@supabase/")) return "vendor-supabase";
            if (id.includes("/react-dom/")) return "vendor-react";
            if (id.includes("/node_modules/react/")) return "vendor-react";
            if (id.includes("/date-fns/")) return "vendor-date";
            if (id.includes("/lucide-react/")) return "vendor-icons";
            if (id.includes("/@tanstack/")) return "vendor-tanstack";
            if (id.includes("/@radix-ui/")) return "vendor-radix";
            if (
              id.includes("/class-variance-authority/") ||
              id.includes("/clsx/") ||
              id.includes("/tailwind-merge/")
            )
              return "vendor-utils";
          },
        },
      },
    },
  };
});
