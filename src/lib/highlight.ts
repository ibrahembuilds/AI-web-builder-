/**
 * Tiny zero-dependency syntax highlighter for HTML / CSS / JS.
 * Returns HTML string with <span class="tok-*"> tokens.
 *
 * Not a parser - uses ordered regex passes on a plain-escaped source.
 * Good enough for a read-only preview pane.
 */

export type Lang = "html" | "css" | "js";

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Rule = { name: string; re: RegExp };

// We replace via a single combined regex per language so tokens cannot nest.
function highlightWith(rules: Rule[], src: string): string {
  const escaped = escape(src);
  const re = new RegExp(rules.map((r, i) => `(?<g${i}>${r.re.source})`).join("|"), "g");
  return escaped.replace(re, (match, ..._args) => {
    const groups = _args[_args.length - 1] as Record<string, string> | undefined;
    if (!groups) return match;
    for (let i = 0; i < rules.length; i++) {
      if (groups[`g${i}`] !== undefined) {
        return `<span class="tok-${rules[i].name}">${match}</span>`;
      }
    }
    return match;
  });
}

const htmlRules: Rule[] = [
  { name: "comment", re: /&lt;!--[\s\S]*?--&gt;/ },
  { name: "doctype", re: /&lt;!DOCTYPE[^&]*&gt;/i },
  // Tag with optional attributes
  { name: "tag", re: /&lt;\/?[a-zA-Z][\w-]*/ },
  { name: "tagclose", re: /\/?&gt;/ },
  { name: "attr", re: /\b[a-zA-Z_:][\w:.-]*(?==)/ },
  { name: "string", re: /"[^"]*"|'[^']*'/ },
];

const cssRules: Rule[] = [
  { name: "comment", re: /\/\*[\s\S]*?\*\// },
  { name: "string", re: /"[^"]*"|'[^']*'/ },
  { name: "atrule", re: /@[a-zA-Z-]+/ },
  { name: "selector", re: /[.#]?[a-zA-Z_][\w-]*(?=\s*{)/ },
  { name: "property", re: /(?<=[{;\s])[a-zA-Z-]+(?=\s*:)/ },
  { name: "number", re: /\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg)?\b|#[0-9a-fA-F]{3,8}/ },
  { name: "punct", re: /[{};:,]/ },
];

const JS_KW =
  "var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|super|import|export|from|as|default|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|async|await|yield|void|delete|static|get|set";

const jsRules: Rule[] = [
  { name: "comment", re: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
  { name: "string", re: /`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/ },
  { name: "keyword", re: new RegExp(`\\b(?:${JS_KW})\\b`) },
  { name: "boolean", re: /\b(?:true|false|null|undefined)\b/ },
  { name: "number", re: /\b\d+(?:\.\d+)?\b/ },
  { name: "fn", re: /\b[A-Za-z_$][\w$]*(?=\s*\()/ },
  { name: "punct", re: /[{}();,]/ },
];

export function highlight(code: string, lang: Lang): string {
  switch (lang) {
    case "html":
      return highlightWith(htmlRules, code);
    case "css":
      return highlightWith(cssRules, code);
    case "js":
      return highlightWith(jsRules, code);
  }
}
