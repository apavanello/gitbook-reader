import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storage } from "../src/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage — tema e preferências", () => {
  it("persiste e lê o tema", () => {
    expect(storage.getTheme()).toBeNull();
    storage.setTheme("dark");
    expect(storage.getTheme()).toBe("dark");
  });

  it("guarda o último repo", () => {
    storage.setLastRepo("apavanello/curso-opa-eks");
    expect(storage.getLastRepo()).toBe("apavanello/curso-opa-eks");
  });
});

describe("storage — posição de leitura", () => {
  it("salva e restaura por repo+path", () => {
    storage.setReadingPosition("o/r@main", "cap.md", 512.7);
    expect(storage.getReadingPosition("o/r@main", "cap.md")).toBe(513);
    expect(storage.getReadingPosition("o/r@main", "outro.md")).toBe(0);
    expect(storage.getReadingPosition("outro-book", "cap.md")).toBe(0);
  });
});

describe("storage — cache de arquivos com chave de versão", () => {
  it("retorna conteúdo quando o hash bate", () => {
    storage.putCachedFile("o", "r", "main", "cap.md", "abc123", "# Conteúdo");
    expect(storage.getCachedFile("o", "r", "main", "cap.md", "abc123")).toBe("# Conteúdo");
  });

  it("invalida quando o hash muda (novo commit)", () => {
    storage.putCachedFile("o", "r", "main", "cap.md", "abc123", "velho");
    expect(storage.getCachedFile("o", "r", "main", "cap.md", "def456")).toBeNull();
  });

  it("respeita branch diferente", () => {
    storage.putCachedFile("o", "r", "main", "cap.md", "abc", "x");
    expect(storage.getCachedFile("o", "r", "dev", "cap.md", "abc")).toBeNull();
  });

  it("limpa o cache do repo quando a quota estoura", () => {
    storage.putCachedFile("o", "r", "main", "a.md", "h1", "aaa");
    storage.putCachedFile("o", "r", "main", "b.md", "h2", "bbb");

    // localStorage falso: a 1ª escrita falha com quota, as seguintes passam.
    const store = new Map<string, string>(Object.entries({ ...localStorage }));
    let failNext = true;
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (failNext) {
          failNext = false;
          throw new DOMException("quota exceeded", "QuotaExceededError");
        }
        store.set(k, v);
      },
      removeItem: (k: string) => store.delete(k),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
    });

    storage.putCachedFile("o", "r", "main", "c.md", "h3", "ccc");
    expect(storage.getCachedFile("o", "r", "main", "c.md", "h3")).toBe("ccc");
    // a quota estourou: o cache do repo inteiro foi descartado antes da retry
    expect(storage.getCachedFile("o", "r", "main", "a.md", "h1")).toBeNull();
    expect(storage.getCachedFile("o", "r", "main", "b.md", "h2")).toBeNull();
  });
});
