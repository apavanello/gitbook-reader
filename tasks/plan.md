# Plano de implementação — GitBook Reader

> Derivado de `SPEC.md`. Decisões das open questions adotadas (sugestões da própria spec):
> 1. **Busca:** indexação progressiva em background após carregar a árvore, com indicador de progresso na SearchBox.
> 2. **Subpath de monorepo:** v2. MVP aceita `owner/repo[@branch]` na raiz.
> 3. **PWA/offline:** v2. MVP cacheia em `localStorage` (chave por hash de arquivo) o que foi lido.

## Ordem de execução (cada fase = 1 commit, `tsc --noEmit` + `vitest` verdes)

1. **Scaffold** — package.json, tsconfig, vite.config, index.html, fixtures (`summary-completo.md` copiado do repo real `curso-opa-eks`, `summary-minimo.md`), `.gitignore`.
2. **Núcleo puro** — `lib/links.ts` (resolução de caminhos relativos/âncoras/externos) + `lib/summary.ts` (parser do SUMMARY + fallback gerado da árvore) + testes com fixtures.
3. **Dados** — `lib/storage.ts` (localStorage com chave por hash de arquivo, posições de leitura, tema, último repo) + `lib/repoSource.ts` (default branch via GitHub API, árvore via jsDelivr com fallback GitHub Trees, arquivos via cdn.jsdelivr com fallback raw.githubusercontent, timeout 8s, erros tipados) + testes com fetch mockado.
4. **Render + busca** — `lib/markdown.ts` (markdown-it + anchor + task-lists, highlight.js core com linguagens registradas — incl. `rego`, import dinâmico do mermaid, DOMPurify, reescrita de links/imagens para URLs de rota/CDN) + `lib/mermaid.ts` + `lib/search.ts` (MiniSearch, snippet com `<mark>`, indexação com concorrência limitada) + testes.
5. **UI** — `lib/router.ts` (hash `#/owner/repo@branch/caminho.md#âncora`), componentes (`RepoInput`, `Sidebar`, `Page`, `SearchBox`, `ThemeToggle`), `App.tsx` (máquina de estados: idle/loading/ready/error), estilos (temas claro/escuro, sidebar colapsável ≤900px, tipografia ~72ch).
6. **Validação** — coverage ≥80% `src/lib`, `npm run build` + `npm run preview`, smoke test manual contra `apavanello/curso-opa-eks`.

## Riscos monitorados

- **Mermaid + sanitização:** diagramas são renderizados *após* DOMPurify, a partir do source preservado em `data-src`; `securityLevel: strict`.
- **Branch com `/`:** codificado como `%2F` no hash para não colidir com o path.
- **Cache sem limite:** ao estourar quota, limpamos as chaves do repo e repetimos a escrita uma vez.
- **Links de âncora vs hash routing:** toda âncora interna é reescrita para o hash completo `#/owner/repo@branch/path#âncora`; o app faz scroll programático.
