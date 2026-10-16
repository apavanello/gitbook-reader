/**
 * Render de diagramas mermaid com import dinâmico: o bundle (~1MB) só é
 * baixado quando a página tem blocos ```mermaid. Re-renderiza ao trocar o tema
 * preservando o source original em data-src.
 */
import type { Mermaid } from "mermaid";

let mermaidModule: Mermaid | null = null;

async function loadMermaid(): Promise<Mermaid> {
  if (!mermaidModule) {
    mermaidModule = (await import("mermaid")).default;
  }
  return mermaidModule;
}

export async function renderMermaidIn(container: HTMLElement, dark: boolean): Promise<void> {
  const nodes = Array.from(container.querySelectorAll<HTMLPreElement>("pre.mermaid"));
  if (nodes.length === 0) return;

  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: dark ? "dark" : "default",
  });

  for (const node of nodes) {
    if (!node.dataset.src) {
      node.dataset.src = node.textContent ?? "";
    } else {
      node.textContent = node.dataset.src; // restaura para re-render (troca de tema)
    }
    node.removeAttribute("data-processed");
  }
  await mermaid.run({ nodes, suppressErrors: true });
}

export function hasMermaid(container: HTMLElement): boolean {
  return container.querySelector("pre.mermaid") !== null;
}
