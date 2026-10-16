import { describe, expect, it } from "vitest";
import { buildHash, parseHash, parsePrettyPath, sameBook } from "../src/lib/router";

describe("parseHash/buildHash", () => {
  it("round-trip básico com path e âncora", () => {
    const route = { owner: "o", repo: "r", branch: "main", path: "capitulos/cap-01.md", hash: "secao" };
    expect(parseHash(buildHash(route))).toEqual(route);
  });

  it("sem branch e sem path", () => {
    expect(parseHash("#/o/r")).toEqual({ owner: "o", repo: "r", branch: null, path: "", hash: "" });
    const built = buildHash({ owner: "o", repo: "r", branch: null, path: "", hash: "" });
    expect(built).toBe("#/o/r");
  });

  it("branch com barra é codificado e decodificado", () => {
    const route = { owner: "o", repo: "r", branch: "feature/opa", path: "README.md", hash: "" };
    const h = buildHash(route);
    expect(h).toBe("#/o/r@feature%2Fopa/README.md");
    expect(parseHash(h)).toEqual(route);
  });

  it("rejeita hashes inválidos", () => {
    expect(parseHash("")).toBeNull();
    expect(parseHash("#")).toBeNull();
    expect(parseHash("#/so-owner")).toBeNull();
    expect(parseHash("#qualquer-coisa")).toBeNull();
  });

  it("decodifica path com espaço", () => {
    expect(parseHash("#/o/r/cap%20itulo.md")).toMatchObject({ path: "cap itulo.md" });
  });
});

describe("parsePrettyPath — links diretos sem hash", () => {
  it("aceita formato com github.com", () => {
    expect(parsePrettyPath("/github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: null,
      path: "",
      hash: "",
    });
  });

  it("aceita owner/repo direto, com branch e path", () => {
    expect(parsePrettyPath("/owner/repo@main/capitulos/cap.md")).toEqual({
      owner: "owner",
      repo: "repo",
      branch: "main",
      path: "capitulos/cap.md",
      hash: "",
    });
  });

  it("respeita base customizada (ex.: /gitbook-reader)", () => {
    expect(parsePrettyPath("/gitbook-reader/owner/repo", "/gitbook-reader/")).toMatchObject({
      owner: "owner",
      repo: "repo",
    });
    expect(parsePrettyPath("/gitbook-reader/github.com/owner/repo", "/gitbook-reader/")).toMatchObject({
      owner: "owner",
      repo: "repo",
    });
  });

  it("ignora raiz, index.html e assets", () => {
    expect(parsePrettyPath("/")).toBeNull();
    expect(parsePrettyPath("/index.html")).toBeNull();
    expect(parsePrettyPath("/assets/index-abc123.js")).toBeNull();
    expect(parsePrettyPath("/logo.png")).toBeNull();
    expect(parsePrettyPath("/so-owner")).toBeNull();
  });
});

describe("sameBook", () => {
  const a = { owner: "o", repo: "r", branch: "main", path: "a.md", hash: "" };
  it("mesmo owner/repo/branch independe do path", () => {
    expect(sameBook(a, { ...a, path: "b.md" })).toBe(true);
    expect(sameBook(a, { ...a, branch: "dev" })).toBe(false);
    expect(sameBook(a, null)).toBe(false);
  });
});
