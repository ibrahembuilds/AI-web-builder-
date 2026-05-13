import JSZip from "jszip";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "application/octet-stream";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

function extFromMime(mime: string) {
  const sub = mime.split("/")[1] ?? "png";
  return sub.replace("jpeg", "jpg").replace("svg+xml", "svg").split(";")[0];
}

async function tryFetchAsBlob(
  url: string,
): Promise<{ blob: Blob; ext: string } | { error: string }> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const blob = await res.blob();
    return { blob, ext: extFromMime(blob.type || "image/jpeg") };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "network error" };
  }
}

export type AssetReport = {
  succeeded: { url: string; path: string; bytes: number }[];
  failed: { url: string; reason: string }[];
};

export type ExportProgress = {
  phase: "preparing" | "fetching" | "bundling" | "compressing" | "done";
  current: number;
  total: number;
  label?: string;
  percent: number; // 0-100 overall
  succeeded: number;
  failed: number;
  lastFailedUrl?: string;
  report?: AssetReport;
};

export type ProgressFn = (p: ExportProgress) => void;

function calcPercent(phase: ExportProgress["phase"], current: number, total: number): number {
  // Phase weights: prepare 5, fetch 55, bundle 10, compress 30
  const fetchPct = total > 0 ? current / total : 1;
  switch (phase) {
    case "preparing":
      return 2;
    case "fetching":
      return Math.round(5 + fetchPct * 55);
    case "bundling":
      return 65;
    case "compressing":
      return Math.round(70 + (current / Math.max(1, total)) * 30);
    case "done":
      return 100;
  }
}

/** Detect a sensible folder for a fetched asset based on mime/extension. */
function folderFor(
  ext: string,
  mime: string,
): "images" | "fonts" | "styles" | "scripts" | "assets" {
  if (/^image\//.test(mime) || /^(png|jpe?g|gif|webp|svg|avif|ico)$/i.test(ext)) return "images";
  if (/font/.test(mime) || /^(woff2?|ttf|otf|eot)$/i.test(ext)) return "fonts";
  if (mime === "text/css" || ext === "css") return "styles";
  if (/javascript/.test(mime) || ext === "js" || ext === "mjs") return "scripts";
  return "assets";
}

function safeName(url: string, fallbackExt: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "asset";
    const cleaned = last.replace(/[^a-zA-Z0-9._-]/g, "-");
    return cleaned.includes(".") ? cleaned : `${cleaned}.${fallbackExt}`;
  } catch {
    return `asset-${Math.random().toString(36).slice(2, 8)}.${fallbackExt}`;
  }
}

/** Extract every http(s) URL referenced by HTML and CSS. */
function extractRefs(html: string, css: string): string[] {
  const urls = new Set<string>();
  const push = (u?: string | null) => {
    if (!u) return;
    const trimmed = u.trim().replace(/^['"]|['"]$/g, "");
    if (/^https?:\/\//i.test(trimmed)) urls.add(trimmed);
  };
  // HTML attributes: src, href, poster, data-src
  const attrRe = /\b(?:src|href|poster|data-src)\s*=\s*("([^"]+)"|'([^']+)')/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(html))) push(m[2] ?? m[3]);
  // srcset (first URL of each candidate)
  const srcsetRe = /\bsrcset\s*=\s*("([^"]+)"|'([^']+)')/gi;
  while ((m = srcsetRe.exec(html))) {
    const list = (m[2] ?? m[3] ?? "").split(",");
    for (const c of list) push(c.trim().split(/\s+/)[0]);
  }
  // CSS url(...) and @import
  const cssUrlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  while ((m = cssUrlRe.exec(css))) push(m[2]);
  const importRe = /@import\s+(?:url\()?\s*(['"])([^'"]+)\1\s*\)?/gi;
  while ((m = importRe.exec(css))) push(m[2]);
  // CSS embedded inside <style> tags
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRe.exec(html))) {
    const block = m[1];
    let mm: RegExpExecArray | null;
    const u = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
    while ((mm = u.exec(block))) push(mm[2]);
    const i = /@import\s+(?:url\()?\s*(['"])([^'"]+)\1\s*\)?/gi;
    while ((mm = i.exec(block))) push(mm[2]);
  }
  return [...urls];
}

async function rewriteCssReferences(
  css: string,
  map: Map<string, string>,
  fetchAndAdd: (url: string) => Promise<string | null>,
): Promise<string> {
  // Replace url(...) and @import with bundled paths
  const replaceUrl = async (match: string, _q: string, raw: string) => {
    if (!/^https?:\/\//i.test(raw)) return match;
    const local = map.get(raw) ?? (await fetchAndAdd(raw));
    if (!local) return match;
    return match.replace(raw, local);
  };
  // Sequentially handle async replaces
  const tasks: Array<{ from: string; to: string }> = [];
  const collect = async (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(css))) {
      const raw = m[2];
      if (!/^https?:\/\//i.test(raw)) continue;
      const local = map.get(raw) ?? (await fetchAndAdd(raw));
      if (local) tasks.push({ from: raw, to: local });
    }
  };
  await collect(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi);
  await collect(/@import\s+(?:url\()?\s*(['"])([^'"]+)\1\s*\)?/gi);
  let out = css;
  for (const { from, to } of tasks) out = out.split(from).join(to);
  return out;
  // (replaceUrl unused - kept for future style if needed)
  void replaceUrl;
}

/** Export raw HTML/CSS/JS from the playground as a ZIP, bundling external assets. */
export async function exportPlaygroundZip(
  name: string,
  html: string,
  css: string,
  js: string,
  onProgress?: ProgressFn,
) {
  const report: AssetReport = { succeeded: [], failed: [] };
  const emit = (p: Omit<ExportProgress, "percent" | "succeeded" | "failed" | "report">) =>
    onProgress?.({
      ...p,
      percent: calcPercent(p.phase, p.current, p.total),
      succeeded: report.succeeded.length,
      failed: report.failed.length,
      lastFailedUrl: report.failed[report.failed.length - 1]?.url,
      report,
    });
  emit({ phase: "preparing", current: 0, total: 1, label: "Scanning HTML & CSS" });

  const zip = new JSZip();
  const root = zip.folder(name)!;

  // 1) Collect referenced http(s) URLs
  const urls = extractRefs(html, css);
  const urlToLocal = new Map<string, string>();
  const filesToWrite = new Map<string, Blob>();
  const usedNames = new Set<string>();
  const failedSet = new Set<string>();

  async function fetchAndAdd(url: string): Promise<string | null> {
    if (urlToLocal.has(url)) return urlToLocal.get(url)!;
    if (failedSet.has(url)) return null;
    const fetched = await tryFetchAsBlob(url);
    if ("error" in fetched) {
      failedSet.add(url);
      report.failed.push({ url, reason: fetched.error });
      return null;
    }
    const proposed = safeName(url, fetched.ext);
    const folder = folderFor(fetched.ext, fetched.blob.type || "");
    let filename = proposed;
    let counter = 2;
    while (usedNames.has(`${folder}/${filename}`)) {
      const dot = proposed.lastIndexOf(".");
      filename =
        dot > 0
          ? `${proposed.slice(0, dot)}-${counter}${proposed.slice(dot)}`
          : `${proposed}-${counter}`;
      counter++;
    }
    const localPath = `${folder}/${filename}`;
    usedNames.add(localPath);
    urlToLocal.set(url, localPath);
    filesToWrite.set(localPath, fetched.blob);
    report.succeeded.push({ url, path: localPath, bytes: fetched.blob.size });
    return localPath;
  }

  let i = 0;
  for (const u of urls) {
    i++;
    emit({
      phase: "fetching",
      current: i - 1,
      total: urls.length,
      label: `Fetching asset (${i}/${urls.length})`,
    });
    await fetchAndAdd(u);
  }
  emit({
    phase: "fetching",
    current: urls.length,
    total: Math.max(1, urls.length),
    label: "Assets ready",
  });

  // 2) Rewrite CSS (top-level + any embedded <style> in HTML)
  const finalCss = await rewriteCssReferences(css, urlToLocal, fetchAndAdd);
  let finalHtml = html;
  const styleBlocks: Array<{ start: number; end: number; replaced: string }> = [];
  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = styleRe.exec(html))) {
    const inner = sm[1];
    const replaced = await rewriteCssReferences(inner, urlToLocal, fetchAndAdd);
    if (replaced !== inner) {
      styleBlocks.push({
        start: sm.index + sm[0].indexOf(inner),
        end: sm.index + sm[0].indexOf(inner) + inner.length,
        replaced,
      });
    }
  }
  for (let k = styleBlocks.length - 1; k >= 0; k--) {
    const b = styleBlocks[k];
    finalHtml = finalHtml.slice(0, b.start) + b.replaced + finalHtml.slice(b.end);
  }
  for (const [url, local] of urlToLocal) {
    finalHtml = finalHtml.split(url).join(local);
  }

  // 3) Ensure stylesheet/script links exist
  if (!/<link[^>]+href=["']style\.css["']/i.test(finalHtml)) {
    if (/<\/head>/i.test(finalHtml)) {
      finalHtml = finalHtml.replace(
        /<\/head>/i,
        `  <link rel="stylesheet" href="style.css">\n</head>`,
      );
    } else {
      finalHtml = `<link rel="stylesheet" href="style.css">\n` + finalHtml;
    }
  }
  if (!/<script[^>]+src=["']script\.js["']/i.test(finalHtml)) {
    if (/<\/body>/i.test(finalHtml)) {
      finalHtml = finalHtml.replace(/<\/body>/i, `  <script src="script.js"></script>\n</body>`);
    } else {
      finalHtml += `\n<script src="script.js"></script>`;
    }
  }

  root.file("index.html", finalHtml);
  root.file("style.css", finalCss);
  root.file("script.js", js);

  for (const [path, blob] of filesToWrite) {
    root.file(path, blob);
  }

  const bundledList = [...filesToWrite.keys()].sort();
  const readme = [
    `# ${name}`,
    "",
    "Exported from the kanyoai Playground.",
    "",
    "## Files",
    "- index.html",
    "- style.css",
    "- script.js",
    bundledList.length ? `- ${bundledList.length} bundled asset(s):` : "",
    ...bundledList.map((p) => `  - ${p}`),
    report.failed.length ? `\n## Failed (${report.failed.length})` : "",
    ...report.failed.map((f) => `- ${f.url} - ${f.reason}`),
  ]
    .filter(Boolean)
    .join("\n");
  root.file("README.md", readme);
  if (report.succeeded.length || report.failed.length) {
    root.file("export-report.json", JSON.stringify(report, null, 2));
  }

  emit({ phase: "bundling", current: 0, total: 1, label: "Writing files" });
  const blob = await zip.generateAsync({ type: "blob" }, (meta) => {
    emit({
      phase: "compressing",
      current: Math.round(meta.percent),
      total: 100,
      label: `Compressing ${Math.round(meta.percent)}%`,
    });
  });
  downloadBlob(blob, `${name}.zip`);
  emit({ phase: "done", current: 1, total: 1, label: "Done" });
  return { bundled: bundledList.length, report };
}
