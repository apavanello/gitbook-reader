import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RepoInput, { parseRepoInput } from "../src/components/RepoInput";

afterEach(() => cleanup());

describe("parseRepoInput (função pura)", () => {
  it("aceita owner/repo", () => {
    expect(parseRepoInput("apavanello/curso-opa-eks")).toEqual({
      owner: "apavanello",
      repo: "curso-opa-eks",
      branch: null,
    });
  });

  it("aceita owner/repo@branch", () => {
    expect(parseRepoInput("o/r@dev")).toEqual({ owner: "o", repo: "r", branch: "dev" });
  });

  it("aceita URL do GitHub com blob e extrai o branch", () => {
    expect(parseRepoInput("https://github.com/o/r/blob/main/README.md")).toEqual({
      owner: "o",
      repo: "r",
      branch: "main",
    });
  });

  it("aceita URL com tree", () => {
    expect(parseRepoInput("https://github.com/o/r/tree/develop/docs/")).toEqual({
      owner: "o",
      repo: "r",
      branch: "develop",
    });
  });

  it("tolera .git e barra final", () => {
    expect(parseRepoInput("https://github.com/o/r.git/")).toEqual({ owner: "o", repo: "r", branch: null });
  });

  it("rejeita lixo com mensagem", () => {
    expect("error" in parseRepoInput("sem-barra")).toBe(true);
    expect("error" in parseRepoInput("")).toBe(true);
    expect("error" in parseRepoInput("a/b/c/d")).toBe(true);
    expect("error" in parseRepoInput("o r")).toBe(true);
  });
});

describe("RepoInput (componente)", () => {
  function setup() {
    const onSubmit = vi.fn();
    render(<RepoInput onSubmit={onSubmit} />);
    return { onSubmit };
  }

  it("submete owner/repo válido", () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "apavanello/curso-opa-eks" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith({ owner: "apavanello", repo: "curso-opa-eks", branch: null });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submete owner/repo@branch", () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "o/r@dev" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(onSubmit).toHaveBeenCalledWith({ owner: "o", repo: "r", branch: "dev" });
  });

  it("mostra erro e não submete entrada inválida", () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "git@github.com" } });
    fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
