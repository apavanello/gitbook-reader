import { useState, type FormEvent } from "react";

export interface ParsedRepoSpec {
  owner: string;
  repo: string;
  branch: string | null;
}

const SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;

/**
 * Aceita: "owner/repo", "owner/repo@branch", URLs do GitHub
 * ("https://github.com/owner/repo[/blob|tree/branch/...]" e forma "git@").
 */
export function parseRepoInput(raw: string): ParsedRepoSpec | { error: string } {
  let value = raw.trim().replace(/\/+$/, "");
  if (!value) return { error: "Informe owner/repo (ex.: usuario/projeto)." };

  if (/^git@github\.com:/.test(value)) value = value.replace("git@github.com:", "");
  if (/^https?:\/\/github\.com\//i.test(value)) value = value.replace(/^https?:\/\/github\.com\//i, "");

  const segments = value.split("/").filter(Boolean);
  let owner = "";
  let repo = "";
  let branch: string | null = null;

  if (segments.length >= 4 && (segments[2] === "blob" || segments[2] === "tree")) {
    // URL do GitHub apontando para arquivo/diretório: extrai o branch
    owner = segments[0];
    repo = segments[1];
    branch = segments[3];
  } else if (segments.length === 3 && (segments[2] === "blob" || segments[2] === "tree")) {
    owner = segments[0];
    repo = segments[1];
  } else if (segments.length === 2) {
    owner = segments[0];
    repo = segments[1];
    const at = repo.indexOf("@");
    if (at > 0) {
      branch = repo.slice(at + 1);
      repo = repo.slice(0, at);
    }
  }

  repo = repo.replace(/\.git$/, "");

  if (!owner || !repo) return { error: "Informe owner/repo (ex.: usuario/projeto)." };
  if (!SEGMENT_RE.test(owner) || !SEGMENT_RE.test(repo)) {
    return { error: "owner e repo aceitam apenas letras, números, ponto, hífen e underline." };
  }
  if (branch !== null) {
    branch = branch.trim();
    if (branch === "") branch = null;
    else if (!/^[A-Za-z0-9_.\-/]+$/.test(branch)) {
      return { error: "Branch inválido (use owner/repo@branch)." };
    }
  }
  return { owner, repo, branch };
}

interface Props {
  onSubmit: (spec: ParsedRepoSpec) => void;
  initialValue?: string;
  variant?: "hero" | "compact";
}

export default function RepoInput({ onSubmit, initialValue = "", variant = "hero" }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseRepoInput(value);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onSubmit(parsed);
  };

  return (
    <form className={`repo-input ${variant}`} onSubmit={handleSubmit} role="search">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        placeholder="owner/repo  ·  owner/repo@branch  ·  URL do GitHub"
        aria-label="Repositório no formato owner/repo"
        aria-invalid={error ? "true" : undefined}
        spellCheck={false}
        autoComplete="off"
      />
      <button type="submit">Ler</button>
      {error && (
        <p className="repo-input-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
