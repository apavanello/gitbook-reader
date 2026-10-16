/**
 * Pipeline de render: markdown-it (+ anchor, task-lists) → DOMPurify →
 * reescrita de links/imagens para rotas do app (hash) e URLs do CDN.
 * O HTML de terceiros nunca chega ao DOM sem sanitização.
 */
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import taskLists from "markdown-it-task-lists";
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdownLang from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import scss from "highlight.js/lib/languages/scss";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import DOMPurify from "dompurify";
import rego from "./hljsRego";
import { cdnFileUrl, resolveHref, type RepoRef } from "./links";

const languages: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  bash,
  css,
  diff,
  dockerfile,
  go,
  ini,
  java,
  javascript,
  json,
  markdown: markdownLang,
  python,
  rego,
  rust,
  scss,
  shell,
  sql,
  typescript,
  xml,
  yaml,
};
for (const [name, def] of Object.entries(languages)) hljs.registerLanguage(name, def);
hljs.registerAliases(["hcl", "terraform"], { languageName: "ini" });

/** Slug no estilo GitHub: minúsculo, sem pontuação, cada espaço vira hífen. */
export function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "");
}

let parser: MarkdownIt | null = null;

export function getMarkdownIt(): MarkdownIt {
  if (parser) return parser;
  parser = new MarkdownIt({
    html: true,
    linkify: true,
    highlight(code, lang) {
      if (lang === "mermaid") {
        // O texto original fica preservado para o mermaid processar depois da sanitização.
        return `<pre class="mermaid"><code class="mermaid-source">${parser!.utils.escapeHtml(code)}</code></pre>`;
      }
      const language = (lang || "").trim().toLowerCase();
      if (language && hljs.getLanguage(language)) {
        try {
          return hljs.highlight(code, { language, ignoreIllegals: true }).value;
        } catch {
          /* highlight falhou: cai para o escape simples */
        }
      }
      return ""; // markdown-it aplica o escape padrão
    },
  });
  parser.use(anchor, { slugify });
  parser.use(taskLists);
  return parser;
}

export interface RenderCtx {
  ref: RepoRef;
  /** caminho da página atual, relativo à raiz do repo */
  currentPath: string;
}

/** HTML sanitizado, sem reescrita de links (útil para testes do pipeline). */
export function renderToSanitizedHtml(markdownText: string): string {
  return DOMPurify.sanitize(getMarkdownIt().render(markdownText), {
    ADD_ATTR: ["target", "rel", "checked", "disabled", "align", "colspan", "rowspan", "start", "loading"],
  });
}

/** Reescreve links/imagens do HTML já sanitizado para rotas do app / URLs do CDN. */
export function rewriteDocument(html: string, ctx: RenderCtx): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const { ref, currentPath } = ctx;

  const routeHash = (path: string, hash: string) =>
    `#/${ref.owner}/${ref.repo}@${ref.branch}/${path}${hash ? `#${hash}` : ""}`;

  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") ?? "";
    const target = resolveHref(currentPath, href);
    if (target.kind === "external") {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      return;
    }
    if (target.kind === "internal" && !/\.md$/i.test(target.path)) {
      // link para arquivo não-markdown: aponta para o CDN em aba nova
      a.setAttribute("href", cdnFileUrl(ref, target.path));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      return;
    }
    a.setAttribute("href", routeHash(target.path, target.hash));
  });

  doc.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") ?? "";
    const target = resolveHref(currentPath, src);
    if (target.kind !== "internal") return; // externa/data URI: intocada
    img.setAttribute("src", cdnFileUrl(ref, target.path));
    img.setAttribute("loading", "lazy");
  });

  return doc.body.innerHTML;
}

/** Pipeline completo do markdown de uma página → HTML pronto para o React. */
export function renderPageHtml(markdownText: string, ctx: RenderCtx): string {
  return rewriteDocument(renderToSanitizedHtml(markdownText), ctx);
}

/** Extrai o texto do primeiro h1 (para document.title). */
export function firstHeadingText(html: string): string | null {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return null;
  const div = document.createElement("div");
  div.innerHTML = match[1];
  return div.textContent?.trim() || null;
}
