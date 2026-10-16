# TODO — execução

- [x] 1. Scaffold (configs + fixtures)
- [x] 2. lib/links + lib/summary + testes
- [x] 3. lib/storage + lib/repoSource + testes
- [x] 4. lib/markdown + lib/mermaid + lib/search + testes
- [x] 5. UI completa (router, componentes, App, estilos)
- [x] 6. tsc + vitest verdes, coverage ≥80% src/lib (92% statements)
- [x] 7. build + preview + smoke vs `apavanello/curso-opa-eks` (critérios 1–10 e 12 verificados; Lighthouse A11y 100)

## Smoke test executado (2026-10-16)

1. ✅ `apavanello/curso-opa-eks` → README como home, sidebar com 6 partes/16 capítulos na ordem do SUMMARY
2. ✅ Prev/next seguem a sidebar (Cap1 ← Cap2 → Cap3)
3. ✅ Link relativo `apendices/…` resolvido a partir de `capitulos/…`
4. ✅ Highlight rego/bash (+ yaml/json/python registrados); 2 blocos mermaid renderizados em SVG
5. ✅ Arquivo não-.md → CDN em nova aba; links externos `target=_blank rel=noopener`
6. ✅ Busca "partial evaluation" → capítulo 8 primeiro, com trecho destacado
7. ✅ Tema persiste entre reloads; posição de leitura restaurada (3000px → volta exata)
8. ✅ Cache invalidado por hash (unit test: hash muda ⇒ refetch)
9. ✅ Repo inexistente → mensagem clara; `expressjs/express` (sem SUMMARY) → índice gerado da árvore
10. ✅ 375px: sidebar colapsável com backdrop
11. ✅ Lighthouse desktop: A11y 100, Best Practices 100 (score de Performance não exposto pela ferramenta usada; bundle inicial 167KB gzip, mermaid lazy)
12. ✅ `npm run build` + `npm run preview` servindo dist/ (200)
