import { describe, expect, it } from "vitest";
import { renderPageHtml, renderToSanitizedHtml, rewriteDocument, slugify, firstHeadingText } from "../src/lib/markdown";

const ctx = { ref: { owner: "apavanello", repo: "curso-opa-eks", branch: "main" }, currentPath: "capitulos/cap-01.md" };

describe("slugify", () => {
  it("estilo GitHub: minúsculo, sem pontuação, espaços → hífen", () => {
    expect(slugify("Fundamentos do Rego")).toBe("fundamentos-do-rego");
    expect(slugify("Capítulo 2: Rego!")).toBe("capítulo-2-rego");
    expect(slugify("  OPA & EKS  ")).toBe("opa--eks");
  });
});

describe("sanitize (DOMPurify)", () => {
  it("remove script e onclick", () => {
    const html = renderToSanitizedHtml('# T\n\n<script>alert("x")</script>\n\n<p onclick="alert(1)">oi</p>\n');
    expect(html).not.toContain("script");
    expect(html).not.toContain("onclick");
    expect(html).toContain("oi");
  });

  it("mantém checkboxes de task list", () => {
    const html = renderToSanitizedHtml("- [x] feito\n- [ ] a fazer\n");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("disabled");
  });
});

describe("highlight de código", () => {
  it("rego com syntax highlight", () => {
    const html = renderToSanitizedHtml('```rego\npackage exemplo\nallow := true\n```');
    expect(html).toContain("hljs");
    expect(html.toLowerCase()).toContain("package");
  });

  it("bloco mermaid vira pre.mermaid com source escapado", () => {
    const html = renderToSanitizedHtml("```mermaid\ngraph TD\n  A-->B\n```");
    expect(html).toContain('class="mermaid"');
    expect(html).toContain("graph TD");
  });

  it("linguagem desconhecida renderiza como texto", () => {
    const html = renderToSanitizedHtml('```xyz\nfoo < bar\n```');
    expect(html).toContain("foo &lt; bar");
  });
});

describe("rewriteDocument — links e imagens", () => {
  it("link relativo vira rota do app resolvida a partir do diretório atual", () => {
    const html = rewriteDocument('<p><a href="cap-02-rego-fundamentos.md">Cap 2</a></p>', ctx);
    expect(html).toContain('href="#/apavanello/curso-opa-eks@main/capitulos/cap-02-rego-fundamentos.md"');
  });

  it("link com ../ resolve para a raiz e preserva âncora", () => {
    const html = rewriteDocument('<p><a href="../README.md#intro">home</a></p>', ctx);
    expect(html).toContain('href="#/apavanello/curso-opa-eks@main/README.md#intro"');
  });

  it("âncora pura vira rota da própria página", () => {
    const html = rewriteDocument('<p><a href="#topo">topo</a></p>', ctx);
    expect(html).toContain('href="#/apavanello/curso-opa-eks@main/capitulos/cap-01.md#topo"');
  });

  it("link externo ganha target=_blank + noopener", () => {
    const html = rewriteDocument('<p><a href="https://openpolicyagent.org">OPA</a></p>', ctx);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("link para arquivo não-.md aponta para o CDN", () => {
    const html = rewriteDocument('<p><a href="exemplo.rego">policy</a></p>', ctx);
    expect(html).toContain("https://cdn.jsdelivr.net/gh/apavanello/curso-opa-eks@main/capitulos/exemplo.rego");
    expect(html).toContain('target="_blank"');
  });

  it("imagem relativa vira URL do CDN com loading=lazy", () => {
    const html = rewriteDocument('<p><img src="../img/arq.png" alt="arquitetura"></p>', ctx);
    expect(html).toContain("https://cdn.jsdelivr.net/gh/apavanello/curso-opa-eks@main/img/arq.png");
    expect(html).toContain('loading="lazy"');
  });

  it("imagem externa fica intocada", () => {
    const html = rewriteDocument('<p><img src="https://img.dev/x.png" alt="x"></p>', ctx);
    expect(html).toContain('src="https://img.dev/x.png"');
  });
});

describe("renderPageHtml — pipeline completo", () => {
  it("headings ganham ids para âncoras", () => {
    const html = renderPageHtml("## Fundamentos do Rego\n\ntexto", ctx);
    expect(html).toMatch(/<h2 id="fundamentos-do-rego"/);
  });

  it("código bash highlight + link interno reescrito juntos", () => {
    const md = '```bash\nkubectl get pods # lista os pods\n```\n\n[Próximo](cap-02.md)';
    const html = renderPageHtml(md, ctx);
    expect(html).toContain("hljs-comment");
    expect(html).toContain("#/apavanello/curso-opa-eks@main/capitulos/cap-02.md");
  });
});

describe("firstHeadingText", () => {
  it("extrai texto do primeiro h1", () => {
    expect(firstHeadingText("<h1 id='x'>Curso <em>OPA</em></h1><h1>Outro</h1>")).toBe("Curso OPA");
  });
  it("null sem h1", () => {
    expect(firstHeadingText("<h2>sem h1</h2>")).toBeNull();
  });
});
