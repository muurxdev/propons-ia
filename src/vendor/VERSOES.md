# Bibliotecas de terceiros embutidas na interface (inline, como texto; carregadas só quando precisa)

| Arquivo | Projeto | Versão | Licença | Uso |
|---|---|---|---|---|
| `pdf.min.mjs`, `pdf.worker.min.mjs` | [pdf.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) | 6.3.289 | Apache-2.0 | extrair o texto de PDFs anexados |
| `mammoth.browser.min.js` | [mammoth.js](https://github.com/mwilliamson/mammoth.js) | 1.12.3 | BSD-2-Clause | extrair o texto de .docx anexados |

Atualizar: `npm pack pdfjs-dist@X` / `npm pack mammoth@X`, copiar `build/pdf.min.mjs`, `build/pdf.worker.min.mjs` e
`mammoth.browser.min.js` para cá e anotar a versão. SHA-256 (para conferir): veja `git log` deste diretório.
