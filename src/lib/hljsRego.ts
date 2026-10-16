/**
 * Definição de linguagem Rego para o highlight.js (o upstream não a inclui).
 * Cobertura enxuta voltada ao conteúdo do curso: keywords do OPA v1,
 * builtins comuns, strings (com template backtick), números e operadores.
 */
import type { LanguageFn } from "highlight.js";

const KEYWORDS = [
  "package",
  "import",
  "as",
  "default",
  "else",
  "some",
  "every",
  "if",
  "contains",
  "in",
  "with",
  "not",
];

const BUILTINS = [
  "input",
  "data",
  "lower",
  "upper",
  "trim",
  "replace",
  "split",
  "join",
  "concat",
  "sprintf",
  "contains",
  "startswith",
  "endswith",
  "count",
  "sum",
  "max",
  "min",
  "sort",
  "abs",
  "round",
  "ceil",
  "floor",
  "print",
];

const rego: LanguageFn = (hljs) => ({
  name: "Rego",
  case_insensitive: false,
  keywords: {
    keyword: KEYWORDS.join(" "),
    literal: "true false null",
    built_in: BUILTINS.join(" "),
  },
  contains: [
    hljs.COMMENT("#", "$"),
    { className: "string", begin: '"', end: '"', contains: [{ begin: "\\\\." }] },
    { className: "string", begin: "`", end: "`", relevance: 10 },
    hljs.C_NUMBER_MODE,
    { className: "operator", begin: /:=|==|!=|<=|>=|[|&+\-*/%<>=]/ },
    { className: "punctuation", begin: /[{}[\](),.;]/ },
  ],
});

export default rego;
