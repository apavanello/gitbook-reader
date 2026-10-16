#!/usr/bin/env bash
# Rebuilda e publica o dist/ no branch gh-pages (GitHub Pages).
# Fonte do Pages: branch gh-pages, diretório / (configurado uma vez via API).
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
cd dist
if [ ! -d .git ]; then git init -q -b gh-pages; fi
git add -A
git -c commit.gpgsign=false commit -qm "deploy: $(date -u +%Y-%m-%dT%H:%MZ)"
git remote add origin https://github.com/apavanello/gitbook-reader.git 2>/dev/null || true
git push -qf origin gh-pages
echo "✔ gh-pages atualizado — https://apavanello.github.io/gitbook-reader/"
