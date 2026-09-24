/* ---------------- biblioteca da sessão ----------------
   Tudo o que você manda para a IA (fotos, arquivos e áudios transcritos) fica aqui para ver, usar de novo, baixar,
   copiar ou apagar. Fica só na memória: ao fechar a Própons IA, some (ainda não há banco de dados). */
let biblioteca = [], filtroBib = 'todos';
function guardarNaBiblioteca(item) {
  if (biblioteca.some(x => x.tipo === item.tipo && x.nome === item.nome && x.tam === item.tam)) return;
  biblioteca.unshift(Object.assign({ id: novoId(), quando: Date.now() }, item));
  if (biblioteca.length > 60) biblioteca.length = 60;       // limite para não pesar na memória
  atualizarTela('biblioteca');
}
const iconeBib = i => i.tipo === 'imagem' ? ICO.foto : i.tipo === 'audio' ? ICO.microfone : ICO.arquivo;
const FORMATOS = { jpg: 'JPEG', jpeg: 'JPEG', jfif: 'JPEG', png: 'PNG', webp: 'WEBP', gif: 'GIF', avif: 'AVIF', bmp: 'BMP', svg: 'SVG', 'svg+xml': 'SVG', heic: 'HEIC', heif: 'HEIF',
  pdf: 'PDF', doc: 'DOC', docx: 'DOCX', txt: 'Texto', plain: 'Texto', md: 'Markdown', markdown: 'Markdown', csv: 'CSV', json: 'JSON', xml: 'XML',
  wav: 'WAV', 'x-wav': 'WAV', wave: 'WAV', mp3: 'MP3', mpeg: 'MP3', m4a: 'M4A', mp4: 'M4A', 'x-m4a': 'M4A', webm: 'WebM', ogg: 'OGG', aac: 'AAC', opus: 'Opus' };
// o formato vem do próprio arquivo (data:image/png…, tipo do blob) e só no fim das contas do nome
function formatoDe(i) {
  const url = i.dataUrl || i.miniatura || '';
  const mime = (/^data:[a-z]+\/([a-z0-9.+-]+)/i.exec(url) || [])[1]
    || (/^[a-z]+\/([a-z0-9.+-]+)/i.exec((i.audio && i.audio.type) || i.mime || '') || [])[1];
  if (mime) return FORMATOS[mime.toLowerCase()] || mime.toUpperCase();
  const ext = (String(i.nome || '').match(/\.([a-z0-9]+)$/i) || [])[1];
  if (ext) return FORMATOS[ext.toLowerCase()] || ext.toUpperCase();
  return '';
}
const tipoBib = i => { const f = formatoDe(i);
  if (i.tipo === 'audio') return f ? 'Áudio ' + f : 'Áudio';
  return f || (i.tipo === 'imagem' ? 'Imagem' : 'Arquivo'); };
const duracaoBonita = s => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s % 60).padStart(2, '0'); };
// o "detalhe" de cada tipo: duração do áudio, tamanho da imagem, páginas/linhas do arquivo
const detalheBib = i => i.tipo === 'audio' ? (i.segundos ? duracaoBonita(i.segundos) : '')
  : i.tipo === 'imagem' ? (i.w ? i.w + '×' + i.h : '')
  : i.paginas ? i.paginas + (i.paginas === 1 ? ' página' : ' páginas') : i.conteudo ? String(i.conteudo).split('\n').length + ' linhas' : '';
const descBib = i => [tipoBib(i), tamanhoBonito(i.tam || 0), detalheBib(i), new Date(i.quando).toTimeString().slice(0, 5)].filter(Boolean).join(' · ');
const abrirBiblioteca = () => abrirTela('biblioteca');
function telaBiblioteca(alvoTela) { alvoTela.innerHTML = '<div class="bib-corpo"></div>'; desenharBiblioteca(alvoTela); }
function desenharBiblioteca(folha) {
  const c = folha.querySelector('.bib-corpo'); if (!c) return;
  const n = t => biblioteca.filter(i => t === 'todos' || i.tipo === t).length;
  const lista = biblioteca.filter(i => filtroBib === 'todos' || i.tipo === filtroBib);
  const fotos = lista.filter(i => i.tipo === 'imagem'), outros = lista.filter(i => i.tipo !== 'imagem');
  c.innerHTML = `<div class="bib-topo">
      ${biblioteca.length ? `<div class="seg bib-filtro">${[['todos', 'Tudo'], ['imagem', 'Fotos'], ['arquivo', 'Arquivos'], ['audio', 'Áudios']].map(([k, r]) => `<button data-f="${k}" class="${filtroBib === k ? 'on' : ''}">${r} ${n(k)}</button>`).join('')}</div>` : '<span></span>'}
      ${htmlVoltarConversa()}</div>
    <p class="info bib-nota">Fotos, arquivos e áudios que você mandou nesta sessão. <b>Ao fechar a Própons IA, tudo aqui é apagado</b> — baixe o que quiser guardar.</p>
    ${!lista.length ? `<div class="bib-vazio">${ICO.biblioteca}<p>${biblioteca.length ? 'Nada deste tipo por aqui.' : 'Ainda vazia. Mande uma foto, um arquivo ou grave um áudio pelo "+" ou pelo microfone.'}</p></div>` : ''}
    ${fotos.length ? `<div class="bib-grade">${fotos.map(i => `<figure class="bib-cart">
        <button class="bib-foto" data-i="${i.id}" title="Abrir ${esc(i.nome)}"><img src="${esc(i.miniatura)}" alt="${esc(i.nome)}" loading="lazy"></button>
        <button class="bib-baixar" data-baixar="${i.id}" title="Baixar" aria-label="Baixar ${esc(i.nome)}">${ICO.baixar}</button>
        <figcaption><b>${esc(i.nome)}</b><small>${esc([tamanhoBonito(i.tam || 0), detalheBib(i)].filter(Boolean).join(' · '))}</small></figcaption></figure>`).join('')}</div>` : ''}
    ${outros.length ? `<div class="bib-lista">${outros.map(i => `<div class="bib-linha">
        <button class="bib-abrir" data-i="${i.id}"><span class="mico">${iconeBib(i)}</span><span class="pt"><b>${esc(i.nome)}</b><small>${esc(descBib(i))}</small></span></button>
        <button class="icone" data-baixar="${i.id}" title="Baixar" aria-label="Baixar ${esc(i.nome)}">${ICO.baixar}</button></div>`).join('')}</div>` : ''}
    ${biblioteca.length ? `<div class="bib-fim"><button class="btn perigo" data-apagar-tudo>${ICO.apagar}Apagar tudo</button></div>` : ''}`;
  ligarVoltarConversa(c);
  c.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtroBib = b.dataset.f; desenharBiblioteca(folha); });
  c.querySelectorAll('[data-i]').forEach(b => b.onclick = () => verItemBiblioteca(biblioteca.find(i => i.id === b.dataset.i), folha));
  c.querySelectorAll('[data-baixar]').forEach(b => b.onclick = () => baixarItemBib(biblioteca.find(i => i.id === b.dataset.baixar)));
  const at = c.querySelector('[data-apagar-tudo]');
  if (at) at.onclick = async () => { if (await confirmar('Apagar a biblioteca?', 'Apaga todas as fotos, arquivos e transcrições desta sessão. As conversas continuam.', 'Apagar tudo', true)) { biblioteca = []; desenharBiblioteca(folha); toast('Biblioteca apagada.'); } };
  medirFotosBib(c, folha);
}
// as fotos não guardam largura/altura: mede uma vez (na miniatura) e redesenha a legenda
function medirFotosBib(c, folha) {
  const faltam = biblioteca.filter(i => i.tipo === 'imagem' && !i.w && (i.miniatura || i.dataUrl));
  if (!faltam.length) return;
  let pendentes = faltam.length, mudou = false;
  faltam.forEach(i => {
    const im = new Image();
    im.onload = im.onerror = () => {
      if (im.naturalWidth) { i.w = im.naturalWidth; i.h = im.naturalHeight; mudou = true; } else i.w = -1;
      if (--pendentes === 0 && mudou && telaAtual === 'biblioteca' && document.querySelector('.bib-corpo')) desenharBiblioteca(folha);
    };
    im.src = i.dataUrl || i.miniatura;
  });
}
const bytesDeDataUrl = u => { const b = atob(String(u).split(',')[1] || ''); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const mimeDeDataUrl = u => (String(u).match(/^data:([^;,]+)/) || [, 'application/octet-stream'])[1];
const extDeMime = m => /wav/.test(m) ? 'wav' : /webm/.test(m) ? 'webm' : /ogg/.test(m) ? 'ogg' : /mp4|m4a|aac/.test(m) ? 'm4a' : /mpeg|mp3/.test(m) ? 'mp3' : 'audio';
// baixar de novo o que está na biblioteca (foto e áudio como arquivo original; documento como texto extraído)
async function baixarItemBib(i) {
  if (!i) return;
  try {
    let r;
    if (i.tipo === 'imagem' && (i.dataUrl || i.miniatura)) {
      const u = i.dataUrl || i.miniatura;
      r = await PLATAFORMA.salvarArquivo(i.nome, bytesDeDataUrl(u), mimeDeDataUrl(u));
    } else if (i.tipo === 'audio' && i.audio) {
      const m = i.audio.type || 'audio/wav';
      r = await PLATAFORMA.salvarArquivo(nomeArquivo(i.nome) + '.' + extDeMime(m), new Uint8Array(await i.audio.arrayBuffer()), m);
    } else if (i.tipo === 'audio') {
      r = await PLATAFORMA.salvarArquivo(nomeArquivo(i.nome) + '.txt', i.texto || '', 'text/plain');
    } else {
      const soTexto = /\.(pdf|docx?)$/i.test(i.nome);
      r = await PLATAFORMA.salvarArquivo(soTexto ? nomeArquivo(i.nome.replace(/\.[^.]+$/, '')) + '.txt' : i.nome, i.conteudo || '', 'text/plain');
    }
    if (r !== false) toast(i.tipo === 'audio' && !i.audio ? 'Transcrição salva.' : 'Arquivo salvo.');
  } catch (e) { toast('Não deu para salvar: ' + e.message, 4000); }
}
// folha do item: prévia, ficha (tipo, tamanho, duração, hora) e as ações do mesmo tamanho
function verItemBiblioteca(i, folha) {
  if (!i) return;
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  const previa = i.tipo === 'imagem' ? `<img src="${esc(i.dataUrl || i.miniatura)}" alt="${esc(i.nome)}">`
    : `<pre>${esc(String(i.tipo === 'audio' ? i.texto : i.conteudo || '').slice(0, 20000))}</pre>`;
  const ficha = [['Tipo', tipoBib(i)], ['Tamanho', tamanhoBonito(i.tam || 0)],
    i.tipo === 'audio' ? ['Duração', i.segundos ? duracaoBonita(i.segundos) : 'não medida'] : null,
    i.tipo === 'imagem' && i.w > 0 ? ['Medidas', i.w + ' × ' + i.h + ' px'] : null,
    i.paginas ? ['Páginas', String(i.paginas)] : null,
    i.tipo === 'audio' ? ['Palavras', String(String(i.texto || '').split(/\s+/).filter(Boolean).length)] : null,
    ['Recebido', new Date(i.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })]].filter(Boolean);
  f.innerHTML = `<div class="dlg folha bib-item">${topoCentro(i.nome)}
    <div class="bib-previa">${previa}</div>
    <dl class="bib-ficha">${ficha.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <div class="bib-acoes">
      <button class="btn primario" data-a="usar">${ICO.seguir}${i.tipo === 'audio' ? 'Usar o texto' : 'Usar na mensagem'}</button>
      <button class="btn" data-a="baixar">${ICO.baixar}Baixar</button>
      ${i.tipo === 'imagem' ? '' : `<button class="btn" data-a="copiar">${ICO.copiar}Copiar</button>`}
      <button class="btn perigo" data-a="apagar">${ICO.apagar}Apagar</button></div></div>`;
  const dlg = f.firstChild, sair = () => animarSaida(f, dlg);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; dlg.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, dlg, sair);
  dlg.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'baixar') return baixarItemBib(i);
    if (a === 'copiar') return copiarTexto(i.tipo === 'audio' ? i.texto : i.conteudo).then(() => toast('Copiado.'));
    if (a === 'apagar') { biblioteca = biblioteca.filter(x => x !== i); sair(); desenharBiblioteca(folha); toast('Apagado da biblioteca.'); return; }
    // usar na mensagem: volta para a conversa já com o anexo (ou com o texto do áudio na caixa)
    if (i.tipo === 'audio') porTranscricao(i.texto || '');
    else if (anexos.some(x => x.nome === i.nome)) { toast('Já está na mensagem.'); return; }
    else if (i.tipo === 'imagem' && anexos.filter(x => x.tipo === 'imagem').length >= MAX_FOTOS) { toast(`Até ${MAX_FOTOS} fotos por mensagem.`); return; }
    else if (i.tipo === 'arquivo' && anexos.filter(x => x.tipo !== 'imagem').length >= MAX_ANEXOS) { toast(`Até ${MAX_ANEXOS} arquivos por mensagem.`); return; }
    else anexos.push(i.tipo === 'imagem' ? { tipo: 'imagem', nome: i.nome, tam: i.tam, dataUrl: i.dataUrl, miniatura: i.miniatura } : { nome: i.nome, tam: i.tam, lang: i.lang, conteudo: i.conteudo });
    sair(); fecharTela(); desenharChips(); ajustar(); $('#entrada').focus();
  });
  pausarDesenho(); document.body.appendChild(f);
}
