import { describe, expect, it } from "vitest";
import { BookIndex, makeSnippet, stripMarkdown } from "../src/lib/search";

describe("stripMarkdown", () => {
  it("remove sintaxe mantendo texto e código", () => {
    const out = stripMarkdown("# Título\n\nTexto com **negrito** e [link](https://x.com).\n\n```rego\nallow := true\n```");
    expect(out).toContain("Título");
    expect(out).toContain("negrito");
    expect(out).toContain("link");
    expect(out).toContain("allow := true");
    expect(out).not.toContain("**");
    expect(out).not.toContain("```");
    expect(out).not.toContain("https://x.com");
  });
});

describe("makeSnippet", () => {
  it("envolve o termo com <mark> e reticências nas bordas", () => {
    const body = "x".repeat(200) + " partial evaluation no OPA " + "y".repeat(200);
    const snip = makeSnippet(body, ["partial"]);
    expect(snip).toContain("<mark>partial</mark>");
    expect(snip.startsWith("…")).toBe(true);
    expect(snip.endsWith("…")).toBe(true);
  });
  it("escapa HTML do corpo", () => {
    const snip = makeSnippet("termo <script>x</script> final", ["termo"]);
    expect(snip).toContain("&lt;script&gt;");
    expect(snip).not.toContain("<script>");
  });
});

describe("BookIndex", () => {
  it("indexa e busca com snippet destacado", async () => {
    const idx = new BookIndex(async () => "placeholder");
    idx.addDocument("cap-08.md", "Capítulo 8 — bancos", "A técnica de partial evaluation permite otimizar políticas.");
    const hits = idx.search("partial evaluation");
    expect(hits).toHaveLength(1);
    expect(hits[0].path).toBe("cap-08.md");
    expect(hits[0].title).toBe("Capítulo 8 — bancos");
    expect(hits[0].snippet).toContain("<mark>");
  });

  it("busca vazia não retorna nada", () => {
    const idx = new BookIndex(async () => "");
    expect(idx.search("")).toEqual([]);
    expect(idx.search("   ")).toEqual([]);
  });

  it("indexAll baixa via fetcher com progresso e ignora falhas", async () => {
    const fetcher = async (path: string) => {
      if (path === " ruim.md") throw new Error("x");
      if (path === "a.md") return "# A conteúdo alpha";
      return "# B conteúdo beta";
    };
    const idx = new BookIndex(fetcher);
    const progress: number[] = [];
    await idx.indexAll(["a.md", "b.md", " ruim.md"], {
      titleOf: (p) => `Título ${p}`,
      onProgress: (p) => progress.push(p.done),
    });
    expect(idx.size).toBe(2);
    expect(idx.has("a.md")).toBe(true);
    expect(progress.at(-1)).toBe(3);
    const hits = idx.search("alpha");
    expect(hits[0].path).toBe("a.md");
  });

  it("re-indexar substitui o documento (sem duplicar)", () => {
    const idx = new BookIndex(async () => "");
    idx.addDocument("a.md", "A", "conteúdo antigo zeta");
    idx.addDocument("a.md", "A", "conteúdo novo omega");
    expect(idx.size).toBe(1);
    expect(idx.search("omega")).toHaveLength(1);
    expect(idx.search("zeta")).toHaveLength(0);
  });
});
