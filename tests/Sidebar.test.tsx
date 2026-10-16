import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Sidebar from "../src/components/Sidebar";
import { parseSummary } from "../src/lib/summary";
import completo from "../fixtures/summary-completo.md?raw";

afterEach(() => cleanup());

const bookRef = { owner: "apavanello", repo: "curso-opa-eks", branch: "main" };

describe("Sidebar", () => {
  it("renderiza partes e capítulos na ordem do SUMMARY real", () => {
    const summary = parseSummary(completo);
    render(<Sidebar bookRef={bookRef} summary={summary} currentPath="" />);
    expect(screen.getByText("Parte I — Fundamentos (laboratório local)")).toBeInTheDocument();
    expect(screen.getByText("Capítulo 1 — OPA: o modelo de decisão e o caso dos MCPs")).toBeInTheDocument();
    expect(screen.getByText("A — Cheatsheet de Rego")).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(16);
  });

  it("links apontam para rotas hash resolvidas", () => {
    const summary = parseSummary(completo);
    render(<Sidebar bookRef={bookRef} summary={summary} currentPath="" />);
    const cap2 = screen.getByText("Capítulo 2 — Rego do zero").closest("a");
    expect(cap2?.getAttribute("href")).toBe("#/apavanello/curso-opa-eks@main/capitulos/cap-02-rego-fundamentos.md");
  });

  it("marca a página atual como ativa", () => {
    const summary = parseSummary(completo);
    render(
      <Sidebar bookRef={bookRef} summary={summary} currentPath="capitulos/cap-01-opa-fundamentos.md" />,
    );
    const active = screen.getByRole("link", { current: "page" });
    expect(active.textContent).toContain("Capítulo 1");
  });

  it("clique em capítulo dispara onNavigate", () => {
    const summary = parseSummary(completo);
    const onNavigate = vi.fn();
    render(<Sidebar bookRef={bookRef} summary={summary} currentPath="" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText("Capítulo 3 — Rego para autorização de API"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
