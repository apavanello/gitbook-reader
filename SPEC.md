# Spec: GitBook Reader — leia qualquer repo GitHub em formato de livro

> **Status:** Fase 1 (SPECIFY) preenchida. Aguardando revisão humana antes de avançar para PLAN.

## Assunções explícitas (corrija antes de prosseguir)

1. Web app **sem backend** — site estático (Vite build), todo o fetch acontece do navegador para GitHub/jsDelivr;
2. **Escopo do MVP: repos públicos** apenas (privados ficam para v2, via token PAT opcional);
3. O formato de entrada é o "GitBook clássico": `README.md` + `SUMMARY.md` + markdowns linkados. Repos **sem** `SUMMARY.md` recebem um índice gerado da árvore de `.md` (fallback), não erro;
4. Single-user app (sem contas, sem servidor de estado). Preferências (tema, posição de leitura, cache) em `localStorage`;
5. Navegação por **hash routing** (`#/owner/repo@branch/capitulo.md`) — funciona em qualquer host estático sem regras de rewrite;
6. Fonte primária de arquivos: **jsDelivr** (sem rate-limit, CDN global); fallback: `raw.githubusercontent.com`;
7. Deploy alvo: qualquer host estático (GitHub Pages/Cloudflare Pages) — fora do escopo da implementação, apenas o `npm run build` precisa gerar o site pronto.

## Objective

**O que:** um webapp onde o usuário cola `owner/repo` de qualquer repo público no formato GitBook e lê o conteúdo como um livro: sidebar de navegação gerada do `SUMMARY.md`, tipografia de leitura confortável, highlight de código, diagramas mermaid renderizados, tema claro/escuro, busca full-text e progresso de leitura.

**Por quê:** o GitBook.com é proprietário e sem self-host; honkit/mdBook exigem build/deploy por livro. Um reader que aponta para o repo elimina o passo de publicação: o livro está sempre na versão do branch.

**Usuário:** desenvolvedor/estudante que mantém ou consome cursos e documentação em repos no formato GitBook (ex.: `apavanello/curso-opa-eks`).

**User stories:**

1. Como leitor, cole `owner/repo` e vejo o livro renderizado em < 3s, começando pelo `README.md`;
2. Como leitor, navego pela sidebar (partes e capítulos do `SUMMARY.md`) e por prev/next no fim de cada página;
3. Como leitor, clico em links internos do texto e caio na página/âncora correta (links relativos resolvidos);
4. Como leitor, busco um termo e recebo páginas + trechos com o termo destacado;
5. Como leitor, recarrego a página dias depois e continuo de onde parei (posição + cache de capítulos), com conteúdo atualizado se o repo fez novo commit;
6. Como leitor em mobile, tenho sidebar colapsável e tipografia legível.

## Tech Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Build | Vite 7 + TypeScript 5 | dev server rápido, build estático |
| UI | React 19 | padrão do autor; componentes pequenos |
| Roteamento | hash router próprio (~50 linhas) ou `react-router` com `HashRouter` | sem dependência de servidor |
| Markdown | `markdown-it` + `markdown-it-anchor` + `markdown-it-task-lists` | extensível, maduro |
| Código | `highlight.js` (tema github + github-dark) | leve, suficiente |
| Diagramas | `mermaid` (import dinâmico, só quando a página tem ` ```mermaid `) | o conteúdo alvo usa mermaid |
| Segurança | `DOMPurify` no HTML resultante | conteúdo é de terceiros — nunca renderizar sem sanitizar |
| Busca | `minisearch` | full-text client-side, ~10kB |
| Fonte de dados | jsDelivr: `https://data.jsdelivr.com/v1/packages/gh/{owner}/{repo}@{branch}?structure=flat` (árvore) e `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}` (arquivos) | sem rate-limit, CORS ok, CDN; fallback `raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}` |
| Testes | Vitest + Testing Library | coerente com Vite |

## Commands

```bash
npm create vite@latest gitbook-reader -- --template react-ts   # scaffolding inicial (uma vez)
npm install                                                    # dependências
npm run dev                                                    # dev server (http://localhost:5173)
npm run build                                                  # build de produção em dist/
npm run preview                                                # servir o build localmente
npm test -- --coverage                                         # testes unitários + cobertura
npm run lint --fix                                             # lint (eslint do template Vite)
npx tsc --noEmit                                               # typecheck
```

## Project Structure

```
gitbook-reader/
├── src/
│   ├── main.tsx               # bootstrap
│   ├── App.tsx                # layout: sidebar + conteúdo + topbar
│   ├── components/
│   │   ├── RepoInput.tsx      # input owner/repo (+@branch opcional) na topbar
│   │   ├── Sidebar.tsx        # árvore de navegação do SUMMARY
│   │   ├── Page.tsx           # área de leitura (markdown renderizado)
│   │   ├── SearchBox.tsx      # busca full-text com resultados em dropdown
│   │   └── ThemeToggle.tsx    # claro/escuro (persiste em localStorage)
│   ├── lib/
│   │   ├── repoSource.ts      # carrega árvore + arquivos (jsDelivr, fallback raw)
│   │   ├── summary.ts         # parseia SUMMARY.md → estrutura {partes, páginas}
│   │   ├── markdown.ts        # markdown-it configurado + mermaid + sanitização
│   │   ├── links.ts           # resolve links/imagens relativos → URLs do CDN
│   │   ├── search.ts          # índice minisearch, indexa sob demanda
│   │   └── storage.ts         # cache localStorage (chave: repo@SHA)
│   └── styles/                # tipografia de leitura, temas
├── tests/
│   ├── summary.test.ts        # parser do SUMMARY (fixtures reais)
│   ├── links.test.ts          # resolução de caminhos relativos
│   └── repoSource.test.ts     # mocks de fetch
├── fixtures/
│   ├── summary-completo.md    # o SUMMARY do curso-opa-eks (partes + sublistas)
│   └── summary-minimo.md      # README + lista simples
└── index.html
```

## Code Style

TypeScript estrito, componentes funcionais com hooks, funções puras em `lib/` (fáceis de testar). Um exemplo do nível esperado — o parser do SUMMARY como função pura:

```typescript
// lib/summary.ts
export interface SummaryEntry {
  kind: "part" | "page";
  title: string;
  href?: string; // caminho relativo ao root do repo, ex.: "capitulos/cap-01-opa-fundamentos.md"
}
export interface Summary {
  entries: SummaryEntry[]; // ordem = ordem de leitura (prev/next derivam daqui)
}

export function parseSummary(markdown: string, repoRoot: string): Summary {
  // headings (## Parte) viram {kind: "part"}; itens de lista com link viram {kind: "page"}
  // links com âncora (#...) são preservados no href
  // lança SummaryError se o markdown não contém nenhuma lista com link
}
```

Convenções: nomes em português nos comentários/domínio do problema, identificadores em inglês; sem `any`; erros como classes (`SummaryError`, `RepoNotFoundError`) — nada de string solta.

## Testing Strategy

- **Unitários** (`tests/*.test.ts`, Vitest): `parseSummary` (fixtures: completo com partes aninhadas, mínimo, sem SUMMARY → gera da árvore, com âncoras), `resolveLinks` (relativos, `../`, imagens, âncoras), `storage` (chave por SHA, invalidação);
- **Componente** (Testing Library): Sidebar renderiza árvore do fixture; RepoInput aceita `owner/repo`, `owner/repo@branch`, rejeita lixo com mensagem;
- **Integração manual com caso real**: rodar `npm run dev` contra `apavanello/curso-opa-eks` (checkout dos critérios de sucesso abaixo);
- **Cobertura:** ≥ 80% em `src/lib/` (o coração é código puro — não há desculpa).

## Boundaries

- **Always:** rodar `npx tsc --noEmit` e `npm test` antes de cada commit; sanitizar TODO HTML renderizado com DOMPurify; tratar fetch com timeout (8s) e mensagem de erro acionável; import dinâmico do mermaid (não pagar ~1MB em páginas sem diagramas);
- **Ask first:** trocar a stack (ex.: sair do React), adicionar backend/proxy, adicionar nova dependência grande (>50kB gzip), suporte a repos privados (token PAT em localStorage — implicação de segurança);
- **Never:** executar HTML/JS do repo lido sem sanitização; commitar tokens; guardar cache sem chave de versão (SHA/branch); desativar testes para "arrumar o build".

## Success Criteria

Verificados manualmente contra `apavanello/curso-opa-eks` (main) + fixtures:

1. Colar `apavanello/curso-opa-eks` → home = `README.md` renderizado, sidebar com as 4 partes + apêndices na ordem do `SUMMARY.md`;
2. Prev/next no fim da página seguem a ordem da sidebar, não a alfabética;
3. Link interno `[Capítulo 2](cap-02-rego-fundamentos.md)` dentro de `capitulos/cap-01-*.md` navega para a página certa (resolução de caminho relativo a partir do diretório da página atual);
4. Blocos `rego`, `bash`, `yaml`, `json`, `python` com syntax highlight; blocos ` ```mermaid ` renderizam o diagrama;
5. Imagens relativas (se houver) carregam via CDN; links externos abrem em nova aba com `rel="noopener"`;
6. Busca por "partial evaluation" encontra o capítulo 8 com trecho destacado;
7. Tema claro/escuro persiste entre reloads; posição de leitura (scroll) restaurada ao voltar a uma página visitada;
8. Novo commit no repo → conteúdo atualiza (cache invalidado por SHA/branch), sem precisar limpar storage manualmente;
9. Repo inexistente → mensagem clara ("repo não encontrado ou privado"); repo sem `SUMMARY.md` → índice gerado da árvore de `.md`;
10. Layout utilizável em 375px de largura (sidebar colapsável);
11. Lighthouse (desktop): Performance ≥ 90, A11y ≥ 90;
12. `npm run build` gera `dist/` servível em qualquer host estático (testado com `npm run preview`).

## Open Questions

1. Busca: indexar o livro inteiro no primeiro load (mais requisições) ou sob demanda página a página (primeira busca incompleta)? *Sugestão: prefetch da árvore + indexação progressiva com indicador de progresso.*
2. Suportar `?subpath=/docs` para monorepos desde o MVP ou deixar para v2? *Sugestão: MVP aceita `owner/repo@branch` na raiz; subpath v2.*
3. PWA/offline completo (service worker) — v2? *Sugestão: sim, v2; MVP só cachea em localStorage o que foi lido.*
