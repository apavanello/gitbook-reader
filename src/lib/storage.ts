/**
 * Persistência em localStorage: tema, último repo, posições de leitura e
 * cache de capítulos com chave de versão (hash do arquivo na árvore atual).
 *
 * Nunca lança: qualquer falha (quota, storage desabilitado) degrada silenciosamente.
 */

const PREFIX = "gbr";

interface FileCacheRecord {
  hash: string;
  content: string;
  fetchedAt: number;
}

function key(...parts: (string | number)[]): string {
  return [PREFIX, ...parts].join(":");
}

function readJSON<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function writeJSON(k: string, value: unknown): boolean {
  try {
    localStorage.setItem(k, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export type Theme = "light" | "dark";

export const storage = {
  getTheme(): Theme | null {
    try {
      const raw = localStorage.getItem(key("theme"));
      return raw === "light" || raw === "dark" ? raw : null;
    } catch {
      return null;
    }
  },
  setTheme(theme: Theme): void {
    try {
      localStorage.setItem(key("theme"), theme);
    } catch {
      /* sem storage, sem persistência */
    }
  },

  getLastRepo(): string | null {
    return readJSON<string>(key("lastRepo"));
  },
  setLastRepo(spec: string): void {
    writeJSON(key("lastRepo"), spec);
  },

  getReadingPosition(repoKey: string, path: string): number {
    const pos = readJSON<Record<string, number>>(key("pos", repoKey));
    return pos?.[path] ?? 0;
  },
  setReadingPosition(repoKey: string, path: string, scrollTop: number): void {
    const k = key("pos", repoKey);
    const pos = readJSON<Record<string, number>>(k) ?? {};
    pos[path] = Math.round(scrollTop);
    writeJSON(k, pos);
  },

  /** Conteúdo cacheado, válido apenas se o hash bater com o da árvore atual. */
  getCachedFile(owner: string, repo: string, branch: string, path: string, hash: string): string | null {
    const record = readJSON<FileCacheRecord>(key("file", owner, repo, branch, path));
    return record !== null && record.hash === hash ? record.content : null;
  },
  putCachedFile(owner: string, repo: string, branch: string, path: string, hash: string, content: string): void {
    const k = key("file", owner, repo, branch, path);
    if (!writeJSON(k, { hash, content, fetchedAt: Date.now() } satisfies FileCacheRecord)) {
      // Quota estourou: descarta o cache deste repo e tenta uma vez mais.
      this.clearRepoCache(owner, repo, branch);
      writeJSON(k, { hash, content, fetchedAt: Date.now() } satisfies FileCacheRecord);
    }
  },
  clearRepoCache(owner: string, repo: string, branch: string): void {
    const prefix = `${key("file", owner, repo, branch)}:`;
    this.clearKeysWithPrefix(prefix);
  },
  clearKeysWithPrefix(prefix: string): void {
    try {
      const doomed: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) doomed.push(k);
      }
      for (const k of doomed) localStorage.removeItem(k);
    } catch {
      /* nada a fazer */
    }
  },
};
