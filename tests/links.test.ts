import { describe, expect, it } from "vitest";
import { dirOf, isExternal, normalizeRepoPath, resolveHref, cdnFileUrl, rawFileUrl } from "../src/lib/links";

describe("isExternal", () => {
  it("reconhece URLs absolutas e esquemas", () => {
    expect(isExternal("https://exemplo.com")).toBe(true);
    expect(isExternal("http://exemplo.com")).toBe(true);
    expect(isExternal("//cdn.exemplo.com/x.png")).toBe(true);
    expect(isExternal("mailto:a@b.c")).toBe(true);
    expect(isExternal("data:image/png;base64,xx")).toBe(true);
  });
  it("não marca caminhos relativos", () => {
    expect(isExternal("cap.md")).toBe(false);
    expect(isExternal("../a/b.md")).toBe(false);
    expect(isExternal("#ancora")).toBe(false);
    expect(isExternal("imagem.png")).toBe(false);
  });
});

describe("dirOf", () => {
  it("retorna o diretório", () => {
    expect(dirOf("capitulos/cap-01.md")).toBe("capitulos");
    expect(dirOf("a/b/c.md")).toBe("a/b");
  });
  it("vazio na raiz", () => {
    expect(dirOf("README.md")).toBe("");
  });
});

describe("normalizeRepoPath", () => {
  it("resolve relativos simples", () => {
    expect(normalizeRepoPath("capitulos", "cap-02.md")).toBe("capitulos/cap-02.md");
    expect(normalizeRepoPath("", "README.md")).toBe("README.md");
    expect(normalizeRepoPath("a/b", "./c.md")).toBe("a/b/c.md");
  });
  it("sobe com ..", () => {
    expect(normalizeRepoPath("capitulos", "../README.md")).toBe("README.md");
    expect(normalizeRepoPath("a/b/c", "../../x.md")).toBe("a/x.md");
  });
  it("não escapa da raiz", () => {
    expect(normalizeRepoPath("", "../x.md")).toBe("x.md");
    expect(normalizeRepoPath("capitulos", "../../../x.md")).toBe("x.md");
  });
});

describe("resolveHref", () => {
  it("resolve link relativo a partir da página atual", () => {
    const r = resolveHref("capitulos/cap-01.md", "cap-02-rego-fundamentos.md");
    expect(r).toEqual({ kind: "internal", path: "capitulos/cap-02-rego-fundamentos.md", hash: "" });
  });
  it("resolve link para a raiz", () => {
    const r = resolveHref("capitulos/cap-01.md", "../README.md");
    expect(r).toEqual({ kind: "internal", path: "README.md", hash: "" });
  });
  it("preserva âncora", () => {
    const r = resolveHref("capitulos/cap-01.md", "cap-02.md#secao");
    expect(r).toEqual({ kind: "internal", path: "capitulos/cap-02.md", hash: "secao" });
  });
  it("âncora pura mantém a página atual", () => {
    const r = resolveHref("capitulos/cap-01.md", "#topo");
    expect(r).toEqual({ kind: "anchor", path: "capitulos/cap-01.md", hash: "topo" });
  });
  it("externos intocados", () => {
    expect(resolveHref("a.md", "https://github.com")).toEqual({ kind: "external", url: "https://github.com" });
  });
});

describe("URLs de CDN/raw", () => {
  const ref = { owner: "apavanello", repo: "curso-opa-eks", branch: "main" };
  it("monta URL do jsDelivr", () => {
    expect(cdnFileUrl(ref, "capitulos/cap-01.md")).toBe(
      "https://cdn.jsdelivr.net/gh/apavanello/curso-opa-eks@main/capitulos/cap-01.md",
    );
  });
  it("monta URL do raw", () => {
    expect(rawFileUrl(ref, "a b.md")).toBe(
      "https://raw.githubusercontent.com/apavanello/curso-opa-eks/main/a%20b.md",
    );
  });
});
