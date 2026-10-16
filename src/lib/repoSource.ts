/**
 * Fonte de dados: GitHub API (branch padrão, árvore fallback) e jsDelivr
 * (árvore flat + arquivos via CDN), com fallback para raw.githubusercontent.
 * Todo fetch tem timeout (8s) e erros são classes acionáveis.
 */
import { cdnFileUrl, rawFileUrl, type RepoRef } from "./links";
import { storage } from "./storage";

export class RepoNotFoundError extends Error {
  constructor(public readonly spec: string) {
    super(`Repo não encontrado ou privado: ${spec}`);
    this.name = "RepoNotFoundError";
  }
}

export class TimeoutError extends Error {
  constructor(public readonly url: string) {
    super(`A resposta de ${url} demorou mais que o limite. Tente novamente.`);
    this.name = "TimeoutError";
  }
}

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceError";
  }
}

export class FileNotFoundError extends SourceError {
  constructor(public readonly path: string) {
    super(`Arquivo não encontrado no repo: ${path}`);
    this.name = "FileNotFoundError";
  }
}

export interface FileEntry {
  path: string;
  hash: string;
}

const DEFAULT_TIMEOUT_MS = 8_000;

export async function fetchWithTimeout(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new TimeoutError(url);
    throw new SourceError(
      `Falha de rede ao acessar ${url}. Verifique sua conexão e tente novamente. (${String(err)})`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Branch padrão via GitHub API; 404 → RepoNotFoundError (repo inexistente ou privado). */
export async function resolveDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`);
  if (res.status === 404) throw new RepoNotFoundError(`${owner}/${repo}`);
  if (!res.ok) throw new SourceError(`GitHub API respondeu ${res.status} ao buscar ${owner}/${repo}.`);
  const data = (await res.json()) as { default_branch?: string };
  if (!data.default_branch) throw new SourceError(`GitHub API não devolveu default_branch para ${owner}/${repo}.`);
  return data.default_branch;
}

/** Árvore de arquivos: jsDelivr flat; fallback GitHub git/trees. */
export async function fetchTree(owner: string, repo: string, branch: string): Promise<FileEntry[]> {
  try {
    const res = await fetchWithTimeout(
      `https://data.jsdelivr.com/v1/packages/gh/${owner}/${repo}@${branch}?structure=flat`,
    );
    if (res.ok) {
      const data = (await res.json()) as { files?: { name: string; hash?: string | number }[] };
      return (data.files ?? []).map((f) => ({
        path: f.name.replace(/^\//, ""),
        hash: String(f.hash ?? ""),
      }));
    }
    if (res.status === 404) throw new RepoNotFoundError(`${owner}/${repo}@${branch}`);
    throw new SourceError(`jsDelivr respondeu ${res.status} ao listar ${owner}/${repo}@${branch}.`);
  } catch (err) {
    if (err instanceof RepoNotFoundError) throw err;
    // jsDelivr fora do ar ou bloqueado: fallback GitHub Trees API.
    const res = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    );
    if (res.status === 404) throw new RepoNotFoundError(`${owner}/${repo}@${branch}`);
    if (!res.ok) throw new SourceError(`GitHub API respondeu ${res.status} ao listar a árvore de ${owner}/${repo}.`);
    const data = (await res.json()) as { tree?: { path: string; type: string; sha?: string }[] };
    return (data.tree ?? [])
      .filter((n) => n.type === "blob")
      .map((n) => ({ path: n.path, hash: String(n.sha ?? "") }));
  }
}

/** Conteúdo textual de um arquivo: CDN jsDelivr → fallback raw.githubusercontent. */
export async function fetchFileText(owner: string, repo: string, branch: string, path: string): Promise<string> {
  const ref: RepoRef = { owner, repo, branch };
  const cdn = await fetchWithTimeout(cdnFileUrl(ref, path));
  if (cdn.ok) return await cdn.text();
  if (cdn.status !== 404) {
    const raw = await fetchWithTimeout(rawFileUrl(ref, path));
    if (raw.ok) return await raw.text();
    if (raw.status === 404) throw new FileNotFoundError(path);
    throw new SourceError(`Falha ao baixar ${path} (CDN ${cdn.status}, raw ${raw.status}).`);
  }
  const raw = await fetchWithTimeout(rawFileUrl(ref, path));
  if (raw.ok) return await raw.text();
  if (raw.status === 404) throw new FileNotFoundError(path);
  throw new SourceError(`Falha ao baixar ${path} (raw ${raw.status}).`);
}

/**
 * Cliente por repo: combina árvore (hashes) + cache localStorage + fetch com fallback.
 */
export class RepoClient {
  readonly ref: RepoRef;
  private readonly hashes = new Map<string, string>();

  constructor(ref: RepoRef, entries: FileEntry[]) {
    this.ref = ref;
    for (const e of entries) this.hashes.set(e.path, e.hash);
  }

  has(path: string): boolean {
    return this.hashes.has(path);
  }

  hashOf(path: string): string {
    return this.hashes.get(path) ?? "";
  }

  async getText(path: string): Promise<string> {
    const { owner, repo, branch } = this.ref;
    const hash = this.hashOf(path);
    const cached = storage.getCachedFile(owner, repo, branch, path, hash);
    if (cached !== null) return cached;
    const content = await fetchFileText(owner, repo, branch, path);
    storage.putCachedFile(owner, repo, branch, path, hash, content);
    return content;
  }
}
