import { buildHash } from "../lib/router";
import { isExternal } from "../lib/links";
import type { RepoRef } from "../lib/links";
import type { Summary, SummaryEntry } from "../lib/summary";

interface Props {
  bookRef: RepoRef;
  summary: Summary;
  currentPath: string;
  onNavigate?: () => void;
}

function hrefFor(bookRef: RepoRef, entry: SummaryEntry): string {
  const [path, hash = ""] = (entry.href ?? "").split("#");
  return buildHash({ ...bookRef, branch: bookRef.branch, path, hash });
}

/** Árvore de navegação: partes como cabeçalhos, páginas como links na ordem de leitura. */
export default function Sidebar({ bookRef, summary, currentPath, onNavigate }: Props) {
  return (
    <nav className="sidebar-nav" aria-label="Índice do livro">
      {summary.entries.map((entry, i) => {
        if (entry.kind === "part") {
          return (
            <div className="sidebar-part" key={`part-${i}`}>
              {entry.title}
            </div>
          );
        }
        const href = entry.href ?? "";
        if (!href || isExternal(href)) {
          return (
            <span className="sidebar-item sidebar-label" style={{ paddingLeft: 12 * (entry.level ?? 1) }} key={`p-${i}`}>
              {entry.title}
            </span>
          );
        }
        const pagePath = href.split("#")[0];
        const active = pagePath === currentPath;
        return (
          <a
            className={`sidebar-item${active ? " active" : ""}`}
            style={{ paddingLeft: 10 + 14 * ((entry.level ?? 1) - 1) }}
            href={hrefFor(bookRef, entry)}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            key={`p-${i}`}
          >
            {entry.title}
          </a>
        );
      })}
    </nav>
  );
}
