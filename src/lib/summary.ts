/**
 * Parser do SUMMARY.md (formato GitBook clássico) e fallback gerado da árvore de arquivos.
 *
 * Estrutura de saída é uma lista plana em ordem de leitura: prev/next derivam dela.
 */
import { isExternal, normalizeRepoPath } from "./links";

export interface SummaryEntry {
  kind: "part" | "page";
  title: string;
  /** Caminho relativo à raiz do repo, com âncora preservada ("a.md#secao"). Só em páginas internas. */
  href?: string;
  /** Profundidade na lista (1 = topo). Só em páginas. */
  level?: number;
}

export interface Summary {
  entries: SummaryEntry[];
}

export class SummaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryError";
  }
}

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const LIST_ITEM_RE = /^(\s*)(?:[-*+]|\d+\.)\s+(.*)$/;
const LINK_RE = /^\[(.*)\]\(\s*([^)\s]*)\s*\)$/;

function cleanTitle(title: string): string {
  return title
    .trim()
    .replace(/^(\*\*|__)|(?:\*\*|__)$/g, "")
    .trim();
}

/**
 * Parseia o SUMMARY.md. `repoRoot` é o diretório onde o SUMMARY vive (normalmente "").
 * Lança `SummaryError` se não houver nenhum item de lista com link interno.
 */
export function parseSummary(markdown: string, repoRoot = ""): Summary {
  const entries: SummaryEntry[] = [];

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(HEADING_RE);
    if (heading) {
      const text = heading[2].trim();
      if (!/^summary$/i.test(text)) entries.push({ kind: "part", title: text });
      continue;
    }
    const item = line.match(LIST_ITEM_RE);
    if (!item) continue;
    const level = Math.max(1, Math.floor(item[1].replace(/\t/g, "  ").length / 2) + 1);
    const content = item[2].trim();
    const link = content.match(LINK_RE);
    if (!link) {
      if (content) entries.push({ kind: "page", title: cleanTitle(content), level });
      continue;
    }
    const title = cleanTitle(link[1]) || link[2];
    const href = link[2].trim();
    if (!href || isExternal(href)) continue;
    const resolved = resolveSummaryHref(repoRoot, href);
    entries.push({ kind: "page", title, href: resolved, level });
  }

  if (!entries.some((e) => e.kind === "page" && e.href)) {
    throw new SummaryError("SUMMARY.md não contém nenhum capítulo com link interno.");
  }
  return { entries };
}

function resolveSummaryHref(baseDir: string, href: string): string {
  const hashIndex = href.indexOf("#");
  const file = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  return normalizeRepoPath(baseDir, file) + hash;
}

/** Páginas navegáveis, em ordem de leitura (base de prev/next). */
export function flattenPages(summary: Summary): SummaryEntry[] {
  return summary.entries.filter((e) => e.kind === "page" && !!e.href);
}

function prettify(path: string): string {
  const base = path.split("/").pop() ?? path;
  const noExt = base.replace(/\.md$/i, "");
  const spaced = noExt.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Fallback: gera um Summary da árvore de arquivos quando o repo não tem SUMMARY.md.
 * README.md primeiro; depois arquivos soltos da raiz; depois um "parte" por diretório.
 */
export function generateSummary(files: string[]): Summary {
  const mdFiles = files
    .filter((f) => f.toLowerCase().endsWith(".md") && !f.endsWith("SUMMARY.md"))
    .sort();

  const entries: SummaryEntry[] = [];
  const readme = mdFiles.find((f) => /^readme\.md$/i.test(f));
  if (readme) entries.push({ kind: "page", title: "Início", href: readme, level: 1 });

  const rootLoose = mdFiles.filter((f) => !f.includes("/") && f !== readme);
  if (rootLoose.length > 0) {
    entries.push({ kind: "part", title: "Arquivos" });
    for (const f of rootLoose) entries.push({ kind: "page", title: prettify(f), href: f, level: 1 });
  }

  const dirs = [...new Set(mdFiles.filter((f) => f.includes("/")).map((f) => f.split("/")[0]))].sort();
  for (const dir of dirs) {
    entries.push({ kind: "part", title: prettify(dir) });
    for (const f of mdFiles.filter((x) => x.startsWith(`${dir}/`))) {
      entries.push({ kind: "page", title: prettify(f), href: f, level: 1 });
    }
  }

  if (entries.length === 0) {
    throw new SummaryError("Nenhum arquivo .md encontrado no repo para gerar o índice.");
  }
  return { entries };
}

/** Título de uma página pelo path (para busca e document.title). */
export function titleForPath(summary: Summary, path: string): string | undefined {
  return flattenPages(summary).find((p) => p.href === path)?.title;
}
