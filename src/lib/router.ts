/**
 * Hash router próprio: #/owner/repo@branch/caminho/da/pagina.md#âncora
 * Funciona em qualquer host estático, sem regras de rewrite.
 */
import { useEffect, useState } from "react";

export interface Route {
  owner: string;
  repo: string;
  branch: string | null;
  path: string;
  hash: string;
}

/** "/" no branch vira "%2F" para não colidir com o separador de path. */
export function buildHash(route: Route): string {
  const branch = route.branch ? `@${route.branch.replace(/\//g, "%2F")}` : "";
  const path = route.path ? `/${route.path}` : "";
  const hash = route.hash ? `#${route.hash}` : "";
  return `#/${route.owner}/${route.repo}${branch}${path}${hash}`;
}

export function parseHash(hash: string): Route | null {
  const withoutHashMark = hash.replace(/^#/, "");
  if (!withoutHashMark.startsWith("/")) return null;
  const hashIndex = withoutHashMark.indexOf("#");
  const beforeAnchor = hashIndex === -1 ? withoutHashMark : withoutHashMark.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? "" : withoutHashMark.slice(hashIndex + 1);

  const segments = beforeAnchor.replace(/^\/+/, "").split("/");
  if (segments.length < 2 || !segments[0] || !segments[1]) return null;
  const owner = segments[0];
  let repo = segments[1];
  let branch: string | null = null;
  const at = repo.indexOf("@");
  if (at > 0) {
    branch = repo.slice(at + 1) || null;
    repo = repo.slice(0, at);
  }
  const path = segments.slice(2).join("/");
  return {
    owner,
    repo,
    branch: branch === null ? null : decodeURIComponent(branch),
    path: decodeURIComponent(path),
    hash: anchor,
  };
}

export function navigate(route: Route): void {
  window.location.hash = buildHash(route);
}

export function sameBook(a: Route | null, b: Route | null): boolean {
  return a !== null && b !== null && a.owner === b.owner && a.repo === b.repo && a.branch === b.branch;
}

export function useRoute(): Route | null {
  const [route, setRoute] = useState<Route | null>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
