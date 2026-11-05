// Helpers for rendering user/AI-generated HTML safely.
//
// Generated sites run arbitrary JavaScript. If that code runs on the app's own
// origin (an iframe with `allow-same-origin`, or a `blob:` URL opened in a new
// tab), it can read the Supabase session from localStorage. Every preview is
// therefore rendered in an iframe sandboxed WITHOUT `allow-same-origin`, which
// gives it an opaque origin.

/** Sandbox flags for preview iframes. Never add `allow-same-origin` here. */
export const PREVIEW_SANDBOX = "allow-scripts allow-forms allow-modals allow-popups";

// An opaque-origin document throws on localStorage/sessionStorage access, which
// would break generated sites that, for example, remember a theme toggle. Give
// them an in-memory replacement instead.
export const PREVIEW_STORAGE_SHIM = `<script>
(function(){
  function mem(){var d={};return{
    getItem:function(k){return Object.prototype.hasOwnProperty.call(d,k)?d[k]:null},
    setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},
    clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},
    get length(){return Object.keys(d).length}}}
  ["localStorage","sessionStorage"].forEach(function(n){
    try{window[n].getItem("x")}catch(e){
      try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}
    }
  });
})();
</script>`;

/** Insert a snippet as the first thing inside <head> (or prepend it). */
export function injectIntoHead(html: string, snippet: string) {
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (tag) => `${tag}\n${snippet}`)
    : `${snippet}\n${html}`;
}

function escapeSrcdoc(html: string) {
  return html.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Open a document in a new tab inside a full-page sandboxed iframe.
 * Returns false when the browser blocked the pop-up.
 */
export function openSandboxedPreview(html: string, title = "Preview") {
  const safeTitle = title.replace(/[<>&"]/g, "");
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><style>html,body{margin:0;height:100%;background:#fff}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe sandbox="${PREVIEW_SANDBOX}" srcdoc="${escapeSrcdoc(
    injectIntoHead(html, PREVIEW_STORAGE_SHIM),
  )}"></iframe></body></html>`;
  const url = URL.createObjectURL(new Blob([page], { type: "text/html" }));
  const win = window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  return Boolean(win);
}
