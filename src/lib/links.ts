/**
 * Resolução de links/imagens relativos de um markdown do repo
 * para caminhos relativos à raiz do repo (ou URLs externas/CDN).
 */

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export type ResolvedLink =
  | { kind: "external"; url: string }
  | { kind: "anchor"; path: string; hash: string }
  | { kind: "internal"; path: string; hash: string };

/** hrefs que não devem ser resolvidos como caminho de repo. */
export function isExternal(href: string): boolean {
  return /^(https?:)?\/\//i.test(href) || /^(mailto|tel|data):/i.test(href);
}

/** Diretório de um caminho relativo à raiz ("a/b/c.md" → "a/b"). */
export function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

/** Normaliza `href` relativo ao diretório `fromDir` em caminho relativo à raiz do repo. */
export function normalizeRepoPath(fromDir: string, href: string): string {
  const combined = fromDir === "" ? href : `${fromDir}/${href}`;
  const out: string[] = [];
  for (const part of combined.split("/")) {
    if (part === "" || part === "." || part === "%20") continue;
    if (part === "..") {
      out.pop(); // subir acima da raiz fica preso na raiz
      continue;
    }
    out.push(part);
  }
  return out.join("/");
}

/**
 * Resolve um href encontrado no markdown de `fromPath` (caminho relativo à raiz).
 * âncoras puras ("#secao") mantêm a página atual.
 */
export function resolveHref(fromPath: string, href: string): ResolvedLink {
  const clean = href.trim();
  if (isExternal(clean)) return { kind: "external", url: clean };
  const hashIndex = clean.indexOf("#");
  const filePart = hashIndex === -1 ? clean : clean.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : clean.slice(hashIndex + 1);
  if (filePart === "") return { kind: "anchor", path: fromPath, hash };
  return {
    kind: "internal",
    path: normalizeRepoPath(dirOf(fromPath), decodeURI(filePart)),
    hash,
  };
}

export function cdnFileUrl(ref: RepoRef, path: string): string {
  return `https://cdn.jsdelivr.net/gh/${ref.owner}/${ref.repo}@${ref.branch}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function rawFileUrl(ref: RepoRef, path: string): string {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
