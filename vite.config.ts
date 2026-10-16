/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Base do GitHub Pages (project site). Ajuste se renomear o repo.
// O Docker não usa este arquivo: o nginx faz try_files → index.html.
const PAGES_BASE = "/gitbook-reader/";

/**
 * Gera 404.html no build: GitHub Pages serve essa página para paths "bonitos"
 * (ex.: /gitbook-reader/github.com/owner/repo) — o script redireciona para a
 * rota hash equivalente.
 */
function pages404(): Plugin {
  return {
    name: "gbr-pages-404",
    apply: "build",
    generateBundle() {
      const source = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>GitBook Reader</title>
    <script>
      (function () {
        var base = "${PAGES_BASE}";
        var p = location.pathname;
        var rest = p.indexOf(base) === 0 ? p.slice(base.length) : p.replace(/^\\/+/, "");
        rest = rest.replace(/^\\/+|\\/+$/g, "");
        var m = rest.match(/^github\\.com\\/(.+)$/i);
        if (m) rest = m[1];
        if (!rest || rest.indexOf("/") === -1 ||
            /\\.(js|css|map|png|jpe?g|gif|svg|webp|ico|txt|xml|json|woff2?)$/i.test(rest)) {
          location.replace(base);
          return;
        }
        location.replace(base + "#/" + rest + location.hash);
      })();
    </script>
  </head>
  <body></body>
</html>
`;
      this.emitFile({ type: "asset", fileName: "404.html", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), pages404()],
  base: "./",
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      include: ["src/lib/**"],
      reporter: ["text", "html"],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mermaid: ["mermaid"],
        },
      },
    },
  },
});
