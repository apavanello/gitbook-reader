import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { BookIndex, IndexProgress } from "../lib/search";

interface Props {
  index: BookIndex;
  /** incrementa quando o índice muda, para reconsultar */
  hitsVersion: number;
  progress: IndexProgress | null;
  onOpen: (path: string) => void;
}

export default function SearchBox({ index, hitsVersion, progress, onOpen }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const hits = query.trim() ? index.search(query) : [];
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => setSelected(0), [query, hitsVersion]);

  const openHit = (path: string) => {
    onOpen(path);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (hits.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      openHit(hits[selected].path);
    }
  };

  const indexing = progress !== null && progress.done < progress.total;

  return (
    <div className="search-box" ref={boxRef}>
      <input
        type="search"
        value={query}
        placeholder="Buscar no livro…"
        aria-label="Buscar no livro"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {indexing && progress && (
        <span className="search-progress" title="Indexando capítulos para a busca">
          {progress.done}/{progress.total}
        </span>
      )}
      {open && query.trim() !== "" && (
        <div className="search-results" role="listbox">
          {hits.length === 0 ? (
            <p className="search-empty">
              {indexing ? "Indexando… resultado ainda incompleto." : "Nenhum resultado."}
            </p>
          ) : (
            <ul>
              {hits.map((hit, i) => (
                <li key={hit.path}>
                  <button
                    className={i === selected ? "selected" : ""}
                    role="option"
                    aria-selected={i === selected}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => openHit(hit.path)}
                  >
                    <span className="search-hit-title">{hit.title}</span>
                    <span className="search-hit-snippet" dangerouslySetInnerHTML={{ __html: hit.snippet }} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
