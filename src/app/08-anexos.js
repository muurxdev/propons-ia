/* ---------------- anexos ---------------- */
function desenharChips() {
  const tutor = tutorLigado(atual) && modoAtivo !== 'tutor';
  const voz = typeof modoVoz !== 'undefined' && modoVoz;
  const c = $('#chips'); c.hidden = !anexos.length && !modoAtivo && !tutor && !voz;
  c.innerHTML = (voz ? `<div class="chip modo">${ICO.conversaVoz}<b>Conversa por voz</b><button class="chip-acao" data-voz-agora>Falar agora</button><button data-rm-voz aria-label="Desligar a conversa por voz">${ICO.fechar}</button></div>` : '') + (tutor ? `<div class="chip modo">${ICO.tutor}<b>Me ensina ligado</b><button data-rm-tutor aria-label="Desligar o Me ensina">${ICO.fechar}</button></div>` : '') + (modoAtivo ? `<div class="chip modo">${ICO[MODOS[modoAtivo].ico]}<b>Modo: ${esc(MODOS[modoAtivo].nome)}</b><button data-rm-modo aria-label="Sair do modo">${ICO.fechar}</button></div>` : '') + anexos.map(a => chipHTML(a, true)).join('');
  const rm = c.querySelector('[data-rm-modo]'); if (rm) rm.onclick = () => definirModo(null);
  const rt = c.querySelector('[data-rm-tutor]'); if (rt) rt.onclick = desligarTutor;
  const rv = c.querySelector('[data-rm-voz]'); if (rv) rv.onclick = () => ligarModoVoz(false);
  const va = c.querySelector('[data-voz-agora]'); if (va) va.onclick = interromperVoz;
  c.querySelectorAll('[data-rm]').forEach(b => b.onclick = e => { e.stopPropagation(); anexos = anexos.filter(a => a.nome !== b.dataset.rm); desenharChips(); ajustar(); });
  ligarVerAnexos(c, anexos, true);
  ajustar();
}
// foto → JPEG reduzido (lado maior até 1024 px) para a IA + miniatura para o histórico
async function prepararFoto(f) {
  const img = await createImageBitmap(f, { imageOrientation: 'from-image' });   // respeita a rotação do EXIF (foto do celular)
  const reduzir = (max, q) => {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  };
  const r = { dataUrl: reduzir(estreita() ? 896 : 1024, 0.85), miniatura: reduzir(240, 0.72) };
  img.close && img.close();
  return r;
}
/* ---------------- documentos: PDF e DOCX viram texto na própria página ----------------
   pdf.js e mammoth vêm dentro do index.html como texto (src/vendor) e só são carregados na primeira vez. */
const LIMITE_DOC = 40 * 1048576, MAX_PAGINAS = 300, MAX_TEXTO_DOC = 200000;
// o pdf.js 6 usa Promise.try, que o WebView do Android (Chrome < 128) não tem: sem isto o getDocument ficava pendurado
if (typeof Promise.try !== 'function') Promise.try = function (f, ...a) { return new Promise(r => r(f(...a))); };
// idem para os métodos novos de Uint8Array (Chrome 134+)
if (!Uint8Array.prototype.toHex) Uint8Array.prototype.toHex = function () { let s = ''; for (const b of this) s += b.toString(16).padStart(2, '0'); return s; };
if (!Uint8Array.fromHex) Uint8Array.fromHex = function (h) { const a = new Uint8Array(h.length >> 1); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; };
if (!Uint8Array.prototype.toBase64) Uint8Array.prototype.toBase64 = function () { let s = ''; for (let i = 0; i < this.length; i += 0x8000) s += String.fromCharCode.apply(null, this.subarray(i, i + 0x8000)); return btoa(s); };
if (!Uint8Array.fromBase64) Uint8Array.fromBase64 = function (b) { return Uint8Array.from(atob(b), c => c.charCodeAt(0)); };
const scriptDe = id => { const el = document.getElementById(id); if (!el || !el.textContent) throw new Error('biblioteca não embutida'); return URL.createObjectURL(new Blob([el.textContent], { type: 'text/javascript' })); };
let pdfjs = null, mammothLib = null;
const comLimite = (p, ms, oque) => Promise.race([p, new Promise((_, f) => setTimeout(() => f(new Error(oque + ' demorou demais')), ms))]);   // nunca fica esperando para sempre
// as bibliotecas vêm de dois lugares: embutidas no HTML (por blob — serve na página local do iPhone) e como arquivos
// ao lado do index.html, servidos pelo motor (o WebView do Android não importa módulos por blob)
async function carregarPdfjs() {
  if (pdfjs) return pdfjs;
  let mod, worker;
  try { mod = await comLimite(import(scriptDe('vendor-pdf')), 8000, 'a leitura de PDF'); worker = scriptDe('vendor-pdf-worker'); }
  catch (e) { mod = await comLimite(import(await urlServida('pdf.min.mjs')), 20000, 'a leitura de PDF'); worker = await urlServida('pdf.worker.min.mjs'); }
  // no WebView do Android o Worker de módulo por blob não sobe (e não avisa): o pdf.js fica esperando. Lá o módulo do
  // worker é carregado na própria página (globalThis.pdfjsWorker) e o pdf.js trabalha sem Worker.
  if (PLATAFORMA.tipo === 'android' || window.__pdfSemWorker) globalThis.pdfjsWorker = await comLimite(import(worker), 20000, 'a leitura de PDF');
  else mod.GlobalWorkerOptions.workerSrc = worker;
  return pdfjs = mod;
}
// arquivo ao lado do index.html, servido pelo motor (que exige a chave): baixa com a chave e vira URL de blob
async function urlServida(nome) {
  const r = await fetch('./' + nome, { headers: { Authorization: 'Bearer ' + PLATAFORMA.chave } });
  if (!r.ok) throw new Error(nome + ': HTTP ' + r.status);
  return URL.createObjectURL(new Blob([await r.text()], { type: 'text/javascript' }));
}
const carregarScript = src => new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('não carregou')); document.head.appendChild(s); });
async function carregarMammoth() {
  if (mammothLib) return mammothLib;
  try { await comLimite(carregarScript(scriptDe('vendor-mammoth')), 8000, 'a leitura do documento'); }
  catch (e) { await comLimite(carregarScript(await urlServida('mammoth.browser.min.js')), 20000, 'a leitura do documento'); }
  if (!window.mammoth) throw new Error('biblioteca do DOCX não carregou');
  return mammothLib = window.mammoth;
}
// → { texto, paginas, cortado }: texto por página ("— página N —"), até MAX_PAGINAS páginas e MAX_TEXTO_DOC caracteres
async function extrairPdf(f) {
  const lib = await carregarPdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false, useSystemFonts: true }).promise;
  const partes = []; let total = 0, cortado = false;
  const n = Math.min(doc.numPages, MAX_PAGINAS);
  for (let p = 1; p <= n; p++) {
    const pg = await doc.getPage(p); const tc = await pg.getTextContent();
    let t = ''; for (const it of tc.items) { if (it.str) t += it.str; if (it.hasEOL) t += '\n'; else if (it.str && !/\s$/.test(it.str)) t += ' '; }
    t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ ]{2,}/g, ' ').trim();
    if (t) partes.push(`— página ${p} —\n${t}`);
    total += t.length; if (total > MAX_TEXTO_DOC) { cortado = true; break; }
  }
  if (doc.numPages > n) cortado = true;
  try { await doc.destroy(); } catch (e) {}
  return { texto: partes.join('\n\n'), paginas: doc.numPages, cortado };
}
async function extrairDocx(f) {
  const lib = await carregarMammoth();
  const r = await lib.extractRawText({ arrayBuffer: await f.arrayBuffer() });
  const t = String(r.value || '').replace(/\n{3,}/g, '\n\n').trim();
  return { texto: t.slice(0, MAX_TEXTO_DOC), paginas: 0, cortado: t.length > MAX_TEXTO_DOC };
}
const eAudio = f => /^audio\//.test(f.type || '') || /\.(mp3|m4a|wav|ogg|opus|webm|aac|flac)$/i.test(f.name || '');
async function adicionarArquivos(lista) {
  for (const f of lista) {
    // áudio pelo "Arquivos": vira texto na caixa (a transcrição do próprio aparelho)
    if (eAudio(f)) { if (PLATAFORMA.temTranscricao) { if (await garantirVoz()) transcreverAudio(f); } else toast('Neste aparelho a transcrição de áudio ainda não está disponível.', 3500); continue; }
    if (eFoto(f)) {
      if (!PLATAFORMA.temVisao) { toast('Neste aparelho a IA ainda não lê fotos.', 3500); continue; }
      if (anexos.filter(a => a.tipo === 'imagem').length >= MAX_FOTOS) { toast(`Até ${MAX_FOTOS} fotos por mensagem.`); continue; }
      if (f.size > 40 * 1048576) { toast(`"${f.name}" é grande demais.`); continue; }
      try {
        const { dataUrl, miniatura } = await prepararFoto(f);
        let nome = f.name || 'foto.jpg'; if (anexos.some(a => a.nome === nome)) nome = nome.replace(/(\.\w+)?$/, '-' + (anexos.length + 1) + '$1');
        anexos.push({ tipo: 'imagem', nome, tam: f.size, dataUrl, miniatura });
        guardarNaBiblioteca({ tipo: 'imagem', nome, tam: f.size, dataUrl, miniatura });
      } catch (e) { toast(`Não consegui abrir "${f.name}"${/heic|heif/i.test(f.name) ? ' (formato HEIC: tire a foto em JPEG ou use "Mais compatível" na câmera)' : ''}.`, 4500); }
      continue;
    }
    if (anexos.filter(a => a.tipo !== 'imagem').length >= MAX_ANEXOS) { toast(`Até ${MAX_ANEXOS} arquivos por mensagem.`); break; }
    if (/\.(pdf|docx)$/i.test(f.name)) {
      const ePdf = /\.pdf$/i.test(f.name);
      if (f.size > LIMITE_DOC) { toast(`"${f.name}" é grande demais (${tamanhoBonito(f.size)}). Limite: 40 MB.`, 3500); continue; }
      if (anexos.some(a => a.nome === f.name)) continue;
      if (ESCOLHER) { toast('Mande a primeira mensagem para ligar a IA; depois anexe o documento.', 4000); continue; }
      toast(ePdf ? 'Lendo o PDF…' : 'Lendo o documento…', 2500);
      let d;
      try { d = ePdf ? await comLimite(extrairPdf(f), 120000, 'a leitura do PDF') : await comLimite(extrairDocx(f), 60000, 'a leitura do documento'); }
      catch (e) { toast(`Não consegui ler "${f.name}"${/password|senha|encrypt/i.test(e.message || '') ? ' (tem senha)' : ''}.`, 4000); continue; }
      if (!d.texto.trim()) { toast(ePdf ? `"${f.name}" não tem texto (pode ser só imagem — mande as páginas como fotos).` : `"${f.name}" está vazio.`, 4500); continue; }
      // arquivo maior que a memória da IA: vai por trechos ligados a cada pergunta (src/busca.js), não só o começo
      const cabe = Math.max(1200, nCtx - tokens(SYSTEM) - Math.min(3000, Math.floor(nCtx * 0.45)) - 300);
      if (tokens(d.texto) > cabe) toast(`"${f.name}"${d.paginas ? ` (${d.paginas} páginas)` : ''} é maior que a memória da IA: a cada pergunta ela lê os trechos ligados ao que você perguntou. Para uma visão geral, peça "resuma o arquivo".${d.cortado ? ` (Usei as primeiras ${MAX_PAGINAS} páginas.)` : ''}`, 7000);
      else if (d.cortado) toast(`"${f.name}": usei as primeiras ${MAX_PAGINAS} páginas.`, 4000);
      anexos.push({ nome: f.name, tam: f.size, lang: 'texto', conteudo: d.texto, paginas: d.paginas });
      guardarNaBiblioteca({ tipo: 'arquivo', nome: f.name, tam: f.size, lang: 'texto', conteudo: d.texto, paginas: d.paginas });
      continue;
    }
    if (/\.(docx?|pptx?|xlsx?|zip|rar|7z|exe|mp[34])$/i.test(f.name) || (f.type && /^(video|audio)\//.test(f.type))) {
      toast(`"${f.name}": por enquanto fotos, PDF, DOCX, textos e códigos.`, 3500); continue;
    }
    if (f.size > LIMITE_ANEXO) { toast(`"${f.name}" é grande demais (${tamanhoBonito(f.size)}). Limite: 40 KB.`, 3500); continue; }
    let texto = '';
    try { texto = await f.text(); } catch (e) { toast(`Não consegui ler "${f.name}": o arquivo pode estar aberto em outro programa ou corrompido. Feche-o e tente de novo.`, 5000); continue; }
    if (/\u0000/.test(texto) || (!TEXTO_OK.test(f.name) && /[\u0001-\u0008\u000e-\u001f]/.test(texto.slice(0, 2000)))) { toast(`"${f.name}" não parece ser um arquivo de texto.`); continue; }
    if (anexos.some(a => a.nome === f.name)) continue;
    anexos.push({ nome: f.name, tam: f.size, lang: langDoArquivo(f.name), conteudo: texto });
    guardarNaBiblioteca({ tipo: 'arquivo', nome: f.name, tam: f.size, lang: langDoArquivo(f.name), conteudo: texto });
  }
  desenharChips();
}
$('#anexar').onclick = () => abrirMais();
/* "Explicar com Própons" (compartilhar do Android): a foto entra como anexo e o texto vai para a caixa, já com
   "Explique isto" quando vier só a foto — a pessoa confere e envia */
async function receberCompartilhado() {
  let c = null; try { c = await PLATAFORMA.pegarCompartilhado(); } catch (e) { return; }
  if (!c || (!c.texto && !c.imagem)) return;
  fecharTela(); fecharDialogo();
  if (c.imagem) { try { const b = await (await fetch(c.imagem)).blob(); adicionarArquivos([new File([b], c.nome || 'compartilhada.jpg', { type: b.type || 'image/jpeg' })]); } catch (e) { toast('Não deu para abrir a imagem compartilhada.'); } }
  const e = $('#entrada');
  e.value = c.texto ? (e.value ? e.value + '\n\n' : '') + c.texto : e.value || 'Explique isto';
  ajustar(); e.focus(); try { e.setSelectionRange(e.value.length, e.value.length); } catch (er) {}
  toast(c.imagem ? 'Foto recebida. Escreva a pergunta e envie.' : 'Texto recebido. Confira e envie.');
}
PLATAFORMA.ao('compartilhado', () => receberCompartilhado());
['arquivo', 'fotos', 'camera'].forEach(id => $('#' + id).onchange = e => { adicionarArquivos([...e.target.files]); e.target.value = ''; });

