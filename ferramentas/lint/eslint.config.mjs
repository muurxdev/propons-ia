// Lint do JavaScript montado (node src/montar.js --bundle dist/bundle.js).
// Uso: npm i --no-save --prefix ferramentas/lint eslint@9 globals && npx --prefix ferramentas/lint eslint -c ferramentas/lint/eslint.config.mjs dist/bundle.js
import globals from "globals";
export default [{
  files: ["**/bundle.js"],
  languageOptions: { ecmaVersion: 2024, sourceType: "script",
    globals: { ...globals.browser, chrome: "readonly", webkit: "readonly", Android: "readonly" } },
  rules: { "no-undef": "error", "no-redeclare": "error", "no-dupe-keys": "error", "no-unreachable": "error",
    "no-dupe-else-if": "error", "no-self-assign": "error", "no-duplicate-case": "error",
    "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] }
}];
