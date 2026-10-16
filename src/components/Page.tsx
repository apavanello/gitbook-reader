import { useEffect, useRef, type RefObject } from "react";
import { buildHash } from "../lib/router";
import { renderMermaidIn } from "../lib/mermaid";
import { storage } from "../lib/storage";
import type { SummaryEntry, RepoRef } from "../lib/types";

interface Props {
  html: string;
  path: string;
  hash: string;
  repoKey: string;
  bookRef: RepoRef;
  dark: boolean;
  prev: SummaryEntry | null;
  next: SummaryEntry | null;
  /** elemento que rola (o main do App) — Page anexa listeners nele */
  scrollRef: RefObject<HTMLElement | null>;
}

/** Área de leitura: HTML já sanitizado + mermaid + posição de leitura + prev/next. */
export default function Page({ html, path, hash, repoKey, bookRef, dark, prev, next, scrollRef }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const lastSave = useRef(0);

  // Render de diagramas mermaid (import dinâmico; re-render ao trocar o tema).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !html) return;
    renderMermaidIn(el, dark).catch((err) => console.warn("mermaid falhou:", err));
  }, [html, dark, scrollRef]);

  // Restaurar posição (ou pular para âncora) quando a página muda.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !html) return;
    const restore = () => {
      if (hash) {
        const target = el.querySelector(`#${CSS.escape(hash)}`);
        if (target) {
          target.scrollIntoView({ block: "start" });
          return true;
        }
      }
      el.scrollTop = storage.getReadingPosition(repoKey, path);
      return true;
    };
    restore();
    const retry = setTimeout(restore, 250); // imagens podem mudar a altura
    return () => clearTimeout(retry);
  }, [html, path, hash, repoKey, scrollRef]);

  // Progresso de leitura + salvar posição.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (barRef.current) barRef.current.style.width = max > 0 ? `${(el.scrollTop / max) * 100}%` : "0%";
      const now = Date.now();
      if (now - lastSave.current > 400) {
        lastSave.current = now;
        storage.setReadingPosition(repoKey, path, el.scrollTop);
      }
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      storage.setReadingPosition(repoKey, path, el.scrollTop);
    };
  }, [path, repoKey, scrollRef]);

  return (
    <>
      <div className="reading-progress-track" aria-hidden="true">
        <div className="reading-progress-bar" ref={barRef} />
      </div>
      <article className="page" dangerouslySetInnerHTML={{ __html: html }} />
      <nav className="page-footer" aria-label="Navegação do capítulo">
        {prev?.href ? (
          <a className="page-nav prev" href={buildHash({ ...bookRef, path: prev.href.split("#")[0], hash: prev.href.split("#")[1] ?? "" })}>
            <span className="page-nav-label">← Anterior</span>
            <span className="page-nav-title">{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next?.href ? (
          <a className="page-nav next" href={buildHash({ ...bookRef, path: next.href.split("#")[0], hash: next.href.split("#")[1] ?? "" })}>
            <span className="page-nav-label">Próximo →</span>
            <span className="page-nav-title">{next.title}</span>
          </a>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
