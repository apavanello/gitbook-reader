# GitBook Reader

Leia **qualquer repo público do GitHub em formato GitBook** (README + SUMMARY + markdowns) como um livro — sem build, sem deploy por livro: o conteúdo vem direto do branch via CDN.

Cole `owner/repo` e receba: sidebar de navegação gerada do `SUMMARY.md`, tipografia de leitura, highlight de código (incluindo **Rego**), diagramas **mermaid**, busca full-text com indexação progressiva, temas claro/escuro, restauração de posição de leitura e cache com invalidação por commit.

## Uso

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes unitários + componentes (Vitest)
npm run coverage   # cobertura (meta: ≥80% em src/lib)
npm run typecheck  # tsc --noEmit
npm run build      # build estático em dist/ (qualquer host estático serve)
npm run preview    # serve o dist/ localmente
```

Na tela inicial, cole `owner/repo`, `owner/repo@branch` ou uma URL do GitHub
(`https://github.com/owner/repo/blob/branch/arquivo.md`). Repos sem `SUMMARY.md`
recebem um índice gerado da árvore de `.md`.

## Como funciona

- **Fonte de dados:** jsDelivr (árvore flat + arquivos por CDN, sem rate-limit) com fallback para GitHub API / `raw.githubusercontent.com`. Todo fetch tem timeout de 8s.
- **Segurança:** o markdown é renderizado com `markdown-it`, sanitizado com `DOMPurify` e só então tem links/imagens reescritos para rotas internas ou URLs do CDN. Mermaid roda com `securityLevel: strict`, após a sanitização, via import dinâmico.
- **Cache:** capítulos lidos ficam em `localStorage` com chave de versão (hash do arquivo) — novo commit no repo ⇒ conteúdo atualiza, sem limpar storage manualmente.
- **Roteamento:** hash puro (`#/owner/repo@branch/caminho.md#âncora`) — funciona em GitHub Pages/Cloudflare Pages sem regras de rewrite.
- **Busca:** MiniSearch indexado em background após carregar a árvore, com indicador de progresso (`n/total` na caixa de busca).

## Estrutura

Código em `src/` (`lib/` = funções puras testáveis, `components/` = UI), testes em `tests/`, fixtures reais do `apavanello/curso-opa-eks` em `fixtures/`. A especificação completa vive em [`SPEC.md`](./SPEC.md); o plano de implementação em [`tasks/plan.md`](./tasks/plan.md).

## Links diretos (compartilháveis)

Qualquer um destes formatos abre o livro direto (no Pages o formato sem `#` passa por um redirect automático via `404.html`; no Docker o nginx entrega o app direto):

```
https://apavanello.github.io/gitbook-reader/github.com/owner/repo
https://apavanello.github.io/gitbook-reader/owner/repo@branch
https://apavanello.github.io/gitbook-reader/owner/repo@branch/capitulos/cap-01.md
https://apavanello.github.io/gitbook-reader/#/owner/repo@branch/capitulos/cap-01.md#âncora
```

## Deploy

### GitHub Pages (automático via script)

O app é 100% estático com hash routing — funciona no Pages sem regras de rewrite.

```bash
./scripts/deploy-gh-pages.sh   # build + push do dist/ para o branch gh-pages
```

Fonte do Pages: branch `gh-pages`, diretório `/`. Se quiser deploy por Actions a cada push, adicione um workflow `.github/workflows/deploy.yml` pela UI do GitHub (exige token com escopo `workflow`).

### Servidor próprio (Docker)

```bash
docker compose up -d --build   # sobe em http://seu-servidor:8080
```

Troque a porta no `docker-compose.yml` se necessário. A imagem é multi-stage: build com Node 22 e serve com nginx.

## Limitações (v2)

Repos privados (PAT), subpath de monorepo (`?subpath=/docs`) e PWA/offline completo ficaram para a v2 — ver Open Questions da spec.
