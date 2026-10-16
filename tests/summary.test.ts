import { describe, expect, it } from "vitest";
import { generateSummary, parseSummary, flattenPages, SummaryError } from "../src/lib/summary";
import completo from "../fixtures/summary-completo.md?raw";
import minimo from "../fixtures/summary-minimo.md?raw";

describe("parseSummary — fixture real do curso-opa-eks", () => {
  const summary = parseSummary(completo);

  it("gera as 6 partes na ordem", () => {
    const parts = summary.entries.filter((e) => e.kind === "part");
    expect(parts.map((p) => p.title)).toEqual([
      "Parte I — Fundamentos (laboratório local)",
      "Parte II — Servindo decisões",
      "Parte III — A missão",
      "Parte IV — Extensões",
      "Apêndices",
      "Exemplos executáveis",
    ]);
  });

  it("gera 16 páginas com hrefs resolvidos a partir da raiz", () => {
    const pages = flattenPages(summary);
    expect(pages).toHaveLength(16);
    expect(pages[0]).toMatchObject({ title: "Curso: OPA para Autorização de MCPs no EKS", href: "README.md" });
    expect(pages[1]).toMatchObject({ title: "Plano do curso", href: "PLANO.md" });
    expect(pages[2]).toMatchObject({ href: "capitulos/cap-01-opa-fundamentos.md" });
    expect(pages.at(-1)).toMatchObject({ title: "Como rodar os exemplos", href: "exemplos/README.md" });
  });

  it("ordem de leitura segue o arquivo, não a ordem alfabética", () => {
    const hrefs = flattenPages(summary).map((p) => p.href);
    expect(hrefs.indexOf("capitulos/cap-02-rego-fundamentos.md")).toBe(
      hrefs.indexOf("capitulos/cap-01-opa-fundamentos.md") + 1,
    );
  });
});

describe("parseSummary — casos sintéticos", () => {
  it("fixture mínimo: duas páginas", () => {
    const pages = flattenPages(parseSummary(minimo));
    expect(pages.map((p) => p.href)).toEqual(["README.md", "docs/ref.md"]);
  });

  it("sublistas aninhadas ganham level", () => {
    const md = [
      "# Summary",
      "",
      "* [A](a.md)",
      "  * [A.1](a1.md)",
      "    * [A.1.a](a1a.md)",
      "* [B](b.md)",
    ].join("\n");
    const pages = flattenPages(parseSummary(md));
    expect(pages.map((p) => p.level)).toEqual([1, 2, 3, 1]);
  });

  it("preserva âncora no href", () => {
    const md = "# Summary\n\n* [X](x.md#secao)";
    expect(parseSummary(md).entries[0]).toMatchObject({ kind: "page", href: "x.md#secao" });
  });

  it("resolve hrefs relativos ao repoRoot", () => {
    const md = "# Summary\n\n* [X](guia/x.md)";
    expect(parseSummary(md, "docs").entries[0].href).toBe("docs/guia/x.md");
  });

  it("ignora links externos e itens sem link viram páginas sem href", () => {
    const md = ["# Summary", "", "* Somente um rótulo", "* [Google](https://google.com)", "* [Ok](ok.md)"].join("\n");
    const s = parseSummary(md);
    expect(s.entries[0].kind).toBe("page");
    expect(s.entries[0].title).toBe("Somente um rótulo");
    expect(s.entries[0].href).toBeUndefined();
    expect(s.entries.some((e) => e.href === "https://google.com")).toBe(false);
    expect(s.entries[1]).toMatchObject({ href: "ok.md" });
  });

  it("lança SummaryError quando não há lista com link", () => {
    expect(() => parseSummary("# Summary\n\nTexto solto sem lista.")).toThrow(SummaryError);
  });
});

describe("generateSummary — fallback da árvore", () => {
  it("README primeiro, diretórios como partes, arquivos ordenados", () => {
    const s = generateSummary([
      "SUMMARY.md",
      "capitulos/b.md",
      "capitulos/a.md",
      "docs/x.md",
      "README.md",
      "solto.md",
    ]);
    const parts = s.entries.filter((e) => e.kind === "part").map((p) => p.title);
    expect(parts).toEqual(["Arquivos", "Capitulos", "Docs"]);
    const pages = flattenPages(s);
    expect(pages.map((p) => p.href)).toEqual([
      "README.md",
      "solto.md",
      "capitulos/a.md",
      "capitulos/b.md",
      "docs/x.md",
    ]);
    expect(pages[0].title).toBe("Início");
  });

  it("sem README e sem .md lança SummaryError", () => {
    expect(() => generateSummary([])).toThrow(SummaryError);
    expect(() => generateSummary(["src/code.ts"])).toThrow(SummaryError);
  });
});
