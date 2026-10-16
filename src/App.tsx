import { useEffect, useRef, useState } from "react";
import RepoInput, { parseRepoInput } from "./components/RepoInput";
import Sidebar from "./components/Sidebar";
import Page from "./components/Page";
import SearchBox from "./components/SearchBox";
import ThemeToggle from "./components/ThemeToggle";
import { navigate, useRoute } from "./lib/router";
import {
  RepoClient,
  RepoNotFoundError,
  fetchTree,
  resolveDefaultBranch,
} from "./lib/repoSource";
import {
  SummaryError,
  flattenPages,
  generateSummary,
  parseSummary,
  titleForPath,
  type Summary,
  type SummaryEntry,
} from "./lib/summary";
import { firstHeadingText, renderPageHtml } from "./lib/markdown";
import { BookIndex, type IndexProgress } from "./lib/search";
import { storage, type Theme } from "./lib/storage";
import type { RepoRef } from "./lib/links";

interface BookState {
  ref: RepoRef;
  repoKey: string;
  summary: Summary;
  pages: SummaryEntry[];
  client: RepoClient;
}

const EXAMPLES = ["apavanello/curso-opa-eks", "apavanello/curso-terraform", "apavanello/curso-eks-argocd"];

function describeError(e: unknown): string {
  if (e instanceof RepoNotFoundError) {
    return `${e.message} — verifique o nome em github.com. Repos privados não são suportados nesta versão.`;
  }
  if (e instanceof SummaryError) return e.message;
  if (e instanceof Error) return e.message;
  return "Erro inesperado ao carregar o livro.";
}

export default function App() {
  const route = useRoute();
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "dark" ? "dark" : "light",
  );
  const [book, setBook] = useState<BookState | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<{ path: string; html: string } | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [searchIndex, setSearchIndex] = useState<BookIndex | null>(null);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);
  const [indexVersion, setIndexVersion] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<HTMLElement>(null);
  const loadToken = useRef(0);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    storage.setTheme(next);
  };

  // Carregar o livro (owner/repo/branch da rota).
  useEffect(() => {
    const token = ++loadToken.current;
    setBook(null);
    setPage(null);
    setSearchIndex(null);
    setIndexProgress(null);

    if (!route) {
      setStatus("idle");
      document.title = "GitBook Reader";
      return;
    }
    const { owner, repo } = route;
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        const branch = route.branch ?? (await resolveDefaultBranch(owner, repo));
        const tree = await fetchTree(owner, repo, branch);
        const ref = { owner, repo, branch };
        const client = new RepoClient(ref, tree);
        const mdFiles = tree.map((f) => f.path).filter((p) => p.toLowerCase().endsWith(".md"));

        let summary: Summary;
        if (client.has("SUMMARY.md")) {
          try {
            summary = parseSummary(await client.getText("SUMMARY.md"));
          } catch (e) {
            if (e instanceof SummaryError) summary = generateSummary(mdFiles);
            else throw e;
          }
        } else {
          summary = generateSummary(mdFiles);
        }

        if (loadToken.current !== token) return;
        const repoKey = `${owner}/${repo}@${branch}`;
        setBook({ ref, repoKey, summary, pages: flattenPages(summary), client });
        setStatus("ready");
        storage.setLastRepo(`${owner}/${repo}`);

        if (!route.path) {
          const first = flattenPages(summary)[0]?.href?.split("#")[0];
          if (first) navigate({ owner, repo, branch, path: first, hash: "" });
        }

        // Indexação progressiva em background para a busca.
        const index = new BookIndex((p) => client.getText(p));
        setSearchIndex(index);
        index
          .indexAll(mdFiles, {
            titleOf: (p) => titleForPath(summary, p) ?? p.replace(/\.md$/i, ""),
            onProgress: (p) => {
              if (loadToken.current !== token) return;
              setIndexProgress(p);
              setIndexVersion((v) => v + 1);
            },
          })
          .catch((e) => console.warn("indexação falhou:", e));
      } catch (e) {
        if (loadToken.current !== token) return;
        setError(describeError(e));
        setStatus("error");
      }
    })();
  }, [route?.owner, route?.repo, route?.branch, reloadKey]);

  // Carregar/renderizar a página atual.
  useEffect(() => {
    if (!book || !route?.path) return;
    if (page?.path === route.path) return;
    const token = loadToken.current;
    setPageLoading(true);
    (async () => {
      try {
        const text = await book.client.getText(route.path);
        if (loadToken.current !== token) return;
        const html = renderPageHtml(text, { ref: book.ref, currentPath: route.path });
        setPage({ path: route.path, html });
        const title =
          titleForPath(book.summary, route.path) ?? firstHeadingText(html) ?? route.path;
        document.title = `${title} · ${book.ref.owner}/${book.ref.repo}`;
      } catch (e) {
        if (loadToken.current !== token) return;
        setPage(null);
        setError(describeError(e));
      } finally {
        if (loadToken.current === token) setPageLoading(false);
      }
    })();
  }, [book, route?.path, page?.path]);

  const openSpec = (specString: string) => {
    const parsed = parseRepoInput(specString);
    if (!("error" in parsed)) navigate({ ...parsed, path: "", hash: "" });
  };

  const currentPageIndex = book && route?.path ? book.pages.findIndex((p) => p.href?.split("#")[0] === route.path) : -1;
  const prev = book && currentPageIndex > 0 ? book.pages[currentPageIndex - 1] : null;
  const next = book && currentPageIndex >= 0 && currentPageIndex < book.pages.length - 1
    ? book.pages[currentPageIndex + 1]
    : null;

  return (
    <div className={`app ${sidebarOpen ? "sidebar-open" : ""}`}>
      <header className="topbar">
        <button
          className="icon-btn menu-btn"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label="Abrir/fechar índice"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <a className="brand" href="#/" onClick={() => setSidebarOpen(false)}>
          📚 <span>GitBook Reader</span>
        </a>
        {status === "ready" && book && (
          <RepoInput variant="compact" onSubmit={(s) => navigate({ ...s, path: "", hash: "" })} />
        )}
        <div className="topbar-spacer" />
        {status === "ready" && book && searchIndex && (
          <SearchBox
            index={searchIndex}
            hitsVersion={indexVersion}
            progress={indexProgress}
            onOpen={(path) => navigate({ ...book.ref, path, hash: "" })}
          />
        )}
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="layout">
        {sidebarOpen && <div className="backdrop" onClick={() => setSidebarOpen(false)} />}
        <aside className="sidebar">
          {book ? (
            <Sidebar
              bookRef={book.ref}
              summary={book.summary}
              currentPath={route?.path ?? ""}
              onNavigate={() => setSidebarOpen(false)}
            />
          ) : (
            <p className="sidebar-hint">Cole um repo na barra acima para começar a ler.</p>
          )}
        </aside>

        <main className="content" ref={scrollRef}>
          {status === "idle" && (
            <div className="hero">
              <h1>Leia qualquer repo como um livro</h1>
              <p>
                Cole <code>owner/repo</code> de um projeto no formato GitBook (README + SUMMARY + markdowns) e leia
                com índice lateral, highlight de código, diagramas mermaid, busca e temas claro/escuro — direto do
                branch, sem passo de publicação.
              </p>
              <RepoInput
                variant="hero"
                initialValue={storage.getLastRepo() ?? ""}
                onSubmit={(s) => navigate({ ...s, path: "", hash: "" })}
              />
              <div className="hero-examples">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => openSpec(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {status === "loading" && (
            <div className="state-box">
              <div className="spinner" aria-hidden="true" />
              {route ? (
                <p>
                  Carregando <strong>{route.owner}/{route.repo}{route.branch ? `@${route.branch}` : ""}</strong>…
                </p>
              ) : null}
            </div>
          )}

          {status === "error" && (
            <div className="state-box error" role="alert">
              <p>{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)}>Tentar de novo</button>
            </div>
          )}

          {status === "ready" && book && (
            <>
              {pageLoading && !page && (
                <div className="state-box">
                  <div className="spinner" aria-hidden="true" />
                  <p>Carregando capítulo…</p>
                </div>
              )}
              {!pageLoading && !page && error && (
                <div className="state-box error" role="alert">
                  <p>{error}</p>
                  <a href={`#/`} className="button-link">
                    Voltar ao início
                  </a>
                </div>
              )}
              {page && route && (
                <Page
                  html={page.html}
                  path={route.path}
                  hash={route.hash}
                  repoKey={book.repoKey}
                  bookRef={book.ref}
                  dark={theme === "dark"}
                  prev={prev}
                  next={next}
                  scrollRef={scrollRef}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
