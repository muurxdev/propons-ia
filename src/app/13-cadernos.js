/* ---------------- Cadernos por matéria (como os notebooks do NotebookLM) ----------------
   Uma pasta de conversas vira um caderno: fontes fixas (apostila, resumo, lista de exercícios, da Biblioteca) e
   instruções próprias. Toda conversa da pasta usa os trechos das fontes ligados à pergunta (a mesma busca dos arquivos
   longos, src/busca.js) e cita de qual fonte veio. As fontes ficam copiadas no caderno (até 80 mil letras cada), então
   continuam valendo mesmo se o arquivo sair da Biblioteca. Tudo no aparelho. */
ICO.caderno = '<svg viewBox="0 0 24 24"><path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6z"/><path d="M6 3v18M4 7h4M4 12h4M4 17h4M10 8h6"/></svg>';
const MAX_FONTES_CADERNO = 6, MAX_TEXTO_FONTE = 80000;
function lerCadernos() { try { const o = JSON.parse(pref('cadernos') || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
const salvarCadernos = o => pref('cadernos', JSON.stringify(o));
function cadernoDe(conv) {
  if (!conv || !conv.pasta) return null;
  const c = lerCadernos()[conv.pasta];
  return c && ((c.fontes && c.fontes.length) || (c.instrucoes && c.instrucoes.trim())) ? c : null;
}
// o que vai para a IA: as instruções e os trechos de cada fonte ligados à pergunta (cabe em ~3 mil tokens)
function blocoCaderno(nome, cad, pergunta) {
  const partes = [];
  if (cad.instrucoes && cad.instrucoes.trim()) partes.push('Instruções deste caderno: ' + cad.instrucoes.trim());
  const fontes = (cad.fontes || []).filter(f => f && f.texto);
  if (fontes.length) {
    const porFonte = Math.floor(Math.min(9000, nCtx * 1.1) / fontes.length);
    for (const f of fontes) {
      const t = BUSCA.trechosRelevantes(f.texto, pergunta, porFonte);
      if (t && t.texto.trim()) partes.push(`Fonte "${f.nome}"${t.paginas && t.paginas.length ? ' (páginas ' + t.paginas.join(', ') + ')' : ''}:\n${t.texto}`);
    }
  }
  return partes.length ? `CADERNO "${nome}" — material do aluno para esta matéria. Use as fontes quando ajudarem, diga de qual fonte tirou a informação e não invente o que não estiver nelas:\n\n` + partes.join('\n\n') : '';
}
function abrirCaderno(nome) {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha caderno">${topoCentro('Caderno: ' + nome)}<div class="cad-corpo"></div></div>`;
  const folha = f.firstChild, corpo = folha.querySelector('.cad-corpo'), sair = () => animarSaida(f, folha);
  const cad = () => lerCadernos()[nome] || { instrucoes: '', fontes: [] };
  const guardar = c => { const t = lerCadernos(); t[nome] = c; salvarCadernos(t); desenharLista(); };
  const desenhar = () => {
    const c = cad(), n = conversas.filter(x => x.pasta === nome).length;
    corpo.innerHTML = `<p class="info" style="margin:0 4px 12px">As ${n} ${n === 1 ? 'conversa' : 'conversas'} desta pasta usam as fontes e as instruções abaixo. A IA pega só os trechos ligados a cada pergunta e diz de qual fonte veio.</p>
      <h4 class="conh-sub">Fontes (${(c.fontes || []).length} de ${MAX_FONTES_CADERNO})</h4>
      <div class="cad-fontes">${(c.fontes || []).map((x, i) => `<div class="cad-fonte"><span class="conh-ico">${ICO.arquivo}</span><span class="pt"><b>${esc(x.nome)}</b><small>${tamanhoBonito(new Blob([x.texto]).size)} de texto</small></span><button class="icone" data-tirar="${i}" aria-label="Tirar ${esc(x.nome)}">${ICO.fechar}</button></div>`).join('') || '<p class="info" style="margin:0 4px">Nenhuma fonte ainda: adicione apostilas, resumos ou listas da Biblioteca.</p>'}</div>
      <button class="btn" data-add${(c.fontes || []).length >= MAX_FONTES_CADERNO ? ' disabled' : ''} style="margin-top:10px">${ICO.mais || '+'}Adicionar da Biblioteca</button>
      <h4 class="conh-sub">Instruções</h4>
      <textarea class="campo-texto" data-ins rows="3" maxlength="1500" placeholder="Ex.: sou do 2º ano; foque no que cai no ENEM; use os exemplos da apostila.">${esc(c.instrucoes || '')}</textarea>
      <div class="botoes" style="margin-top:14px"><button class="btn primario" data-nova>${ICO.editar}Nova conversa neste caderno</button></div>`;
    corpo.querySelectorAll('[data-tirar]').forEach(b => b.onclick = () => { const c2 = cad(); c2.fontes.splice(+b.dataset.tirar, 1); guardar(c2); desenhar(); });
    const ta = corpo.querySelector('[data-ins]'); let tG = 0;
    ta.oninput = () => { clearTimeout(tG); tG = setTimeout(() => { const c2 = cad(); c2.instrucoes = ta.value.trim(); guardar(c2); }, 400); };
    ta.onblur = () => { const c2 = cad(); c2.instrucoes = ta.value.trim(); guardar(c2); };
    corpo.querySelector('[data-add]').onclick = () => escolherFontesCaderno(nome, desenhar);
    corpo.querySelector('[data-nova]').onclick = () => { sair(); nova(nome); toast(`A próxima pergunta abre uma conversa no caderno "${nome}".`, 3000); if (estreita()) fecharLateral(); };
  };
  desenhar();
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f);
}
// os itens de texto da Biblioteca (PDF, DOCX, anotações, áudios transcritos) para marcar como fonte
function escolherFontesCaderno(nome, depois) {
  const c0 = lerCadernos()[nome] || { instrucoes: '', fontes: [] };
  const jaTem = new Set((c0.fontes || []).map(x => x.id));
  const itens = biblioteca.filter(i => i.tipo !== 'imagem' && textoBib(i).trim().length > 40);
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha">${topoCentro('Fontes da Biblioteca')}
    ${itens.length ? `<div class="opcoes linhas">${itens.map(i => `<button data-id="${esc(i.id)}"${jaTem.has(i.id) ? ' disabled' : ''}><span class="oi">${ICO.arquivo}</span><span class="pt"><b>${esc(i.nome)}</b><small>${jaTem.has(i.id) ? 'Já está no caderno' : tamanhoBonito(new Blob([textoBib(i)]).size) + ' de texto'}</small></span></button>`).join('')}</div>`
    : '<p class="info" style="margin:0 8px 12px">A Biblioteca não tem textos ainda. Mande um PDF, DOCX ou áudio numa conversa (ou pela Biblioteca) e ele aparece aqui.</p>'}</div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
    const i = biblioteca.find(x => x.id === b.dataset.id); if (!i) return;
    const t = lerCadernos(), c = t[nome] || { instrucoes: '', fontes: [] };
    c.fontes = (c.fontes || []).concat({ id: i.id, nome: i.nome, texto: textoBib(i).slice(0, MAX_TEXTO_FONTE) }).slice(0, MAX_FONTES_CADERNO);
    t[nome] = c; salvarCadernos(t); desenharLista(); toast(`"${i.nome}" entrou no caderno.`); sair(); if (depois) depois();
  });
  pausarDesenho(); document.body.appendChild(f);
}
