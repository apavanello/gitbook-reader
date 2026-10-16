# Prompt para sessão limpa — GitBook Reader

Copie tudo abaixo para a nova sessão (abra o ZCode no workspace `default`, mesmo diretório de sempre).

---

Vou construir um webapp descrito por uma spec que já existe. Faça o seguinte:

1. Leia o arquivo `gitbook-reader/SPEC.md` — é a especificação completa (fase SPECIFY do spec-driven-development), incluindo assunções explícitas, critérios de sucesso testáveis e boundaries.
2. Antes de qualquer código: revise a spec comigo. Aponte as 3 assunções mais arriscadas e as open questions — quero decidir as 3 respostas com você antes de avançar (são: indexação da busca, subpath de monorepo, PWA). Se eu aprovar sem mudanças, a spec está validada.
3. Depois da validação, siga o workflow gated do spec-driven-development: fase PLAN (salve em `tasks/plan.md` e `tasks/todo.md`) para minha revisão, depois TASKS, depois IMPLEMENT — criando o projeto no diretório `gitbook-reader/` (a spec vive lá; o código em `gitbook-reader/` mesmo, spec versionada junto).
4. Regras de execução: tarefas uma a uma, `npx tsc --noEmit` + `npm test` verdes antes de cada commit; commit sem assinar (`git -c commit.gpgsign=false commit`). Ao final de cada fase, um checkpoint de verificação para eu validar manualmente contra o repo real `apavanello/curso-opa-eks` rodando `npm run dev`.
5. Contexto útil: o repo-alvo de teste (`apavanello/curso-opa-eks`) usa os blocos de código `rego`, `bash`, `yaml`, `json`, `python` e diagramas mermaid; o `SUMMARY.md` dele tem headings como separadores de partes (`## Parte I — ...`) e listas de links — use como fixture real (o arquivo está em `curso-opa-eks/SUMMARY.md` neste workspace).

Comece pelo passo 1 e 2 agora: leia a spec e me traga a revisão antes de escrever qualquer linha de código.
