/**
 * Busca full-text client-side (MiniSearch) com indexação progressiva:
 * o App alimenta o índice em background conforme baixa os capítulos.
 */
import MiniSearch from "minisearch";

export interface SearchHit {
  path: string;
  title: string;
  snippet: string;
}

/** Remove a sintaxe markdown mantendo o texto (código incluso) pesquisável. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~`>#|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Trecho em torno do primeiro termo encontrado, com <mark> nos termos (HTML já escapado). */
export function makeSnippet(body: string, terms: string[], width = 120): string {
  const escaped = escapeHtml(body);
  if (terms.length === 0) return escaped.slice(0, width * 2);
  const pattern = new RegExp(
    terms.filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "iu",
  );
  const match = escaped.match(pattern);
  let start = 0;
  if (match && match.index !== undefined) {
    start = Math.max(0, match.index - width);
  }
  const windowText = (start > 0 ? "…" : "") + escaped.slice(start, start + width * 2) + (start + width * 2 < escaped.length ? "…" : "");
  const globalPattern = new RegExp(
    terms.filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "giu",
  );
  return windowText.replace(globalPattern, (m) => `<mark>${m}</mark>`);
}

export interface IndexProgress {
  done: number;
  total: number;
}

export class BookIndex {
  readonly mini = new MiniSearch({
    fields: ["title", "body"],
    storeFields: ["title"],
  });
  private readonly bodies = new Map<string, string>();
  /** incrementa a cada documento — UI usa para reconsultar */
  version = 0;

  constructor(private readonly fetchText: (path: string) => Promise<string>) {}

  get size(): number {
    return this.bodies.size;
  }

  has(path: string): boolean {
    return this.bodies.has(path);
  }

  addDocument(path: string, title: string, markdownText: string): void {
    const body = stripMarkdown(markdownText);
    const isNew = !this.bodies.has(path);
    this.bodies.set(path, body);
    const doc = { id: path, title, body };
    // MiniSearch.replace só aceita documentos já indexados.
    if (isNew) this.mini.add(doc);
    else this.mini.replace(doc);
    this.version++;
  }

  /** Indexa uma lista de caminhos com concorrência limitada; falhas individuais são ignoradas. */
  async indexAll(
    paths: string[],
    opts: { titleOf: (path: string) => string; onProgress?: (p: IndexProgress) => void },
  ): Promise<void> {
    const pending = paths.filter((p) => !this.has(p));
    const total = this.size + pending.length;
    let done = this.size;
    const queue = [...pending];
    const worker = async (): Promise<void> => {
      for (;;) {
        const path = queue.shift();
        if (path === undefined) return;
        try {
          const text = await this.fetchText(path);
          this.addDocument(path, opts.titleOf(path), text);
        } catch {
          /* capítulo que falhou não entra no índice */
        }
        done++;
        opts.onProgress?.({ done, total });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  search(query: string, limit = 8): SearchHit[] {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const results = this.mini.search(trimmed, { prefix: true, fuzzy: 0.2 });
    const hits: SearchHit[] = [];
    for (const r of results.slice(0, limit)) {
      const body = this.bodies.get(String(r.id)) ?? "";
      hits.push({
        path: String(r.id),
        title: (r.title as string) ?? String(r.id),
        snippet: makeSnippet(body, r.terms ?? trimmed.split(/\s+/)),
      });
    }
    return hits;
  }
}
