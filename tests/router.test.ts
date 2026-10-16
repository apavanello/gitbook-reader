import { describe, expect, it } from "vitest";
import { buildHash, parseHash, sameBook } from "../src/lib/router";

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

describe("sameBook", () => {
  const a = { owner: "o", repo: "r", branch: "main", path: "a.md", hash: "" };
  it("mesmo owner/repo/branch independe do path", () => {
    expect(sameBook(a, { ...a, path: "b.md" })).toBe(true);
    expect(sameBook(a, { ...a, branch: "dev" })).toBe(false);
    expect(sameBook(a, null)).toBe(false);
  });
});
