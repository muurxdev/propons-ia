/* ---------------- Conhecimento (como as skills do Claude, do jeito da Própons) ----------------
   Cada conhecimento é um pacote que ensina a IA a fazer uma coisa do seu jeito: nome, quando usar, instruções e, se
   quiser, arquivos de referência (apostila, gabarito, modelo de redação). A cada pergunta o app escolhe sozinho os que
   combinam (pelo nome e pelo "quando usar"), e só esses entram na resposta — com os trechos dos arquivos ligados à
   pergunta, não o arquivo inteiro. Dá para marcar "usar sempre" ou chamar pelo nome com /nome. A resposta mostra qual
   conhecimento foi usado. Fica guardado só neste aparelho. */
ICO.conhecimento = '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.3l5-.7z"/><path d="M5 20h14"/></svg>';
const MODELOS_CONHECIMENTO = [
  { nome: 'Redação nota 1000', quando: 'redação, ENEM, dissertação, texto dissertativo-argumentativo, proposta de intervenção, repertório',
    instrucoes: 'Siga as 5 competências do ENEM. Estrutura: introdução com tese e repertório legitimado, dois desenvolvimentos (tópico frasal, argumento, exemplo, fechamento) e conclusão com proposta de intervenção completa (agente, ação, modo/meio, finalidade e detalhamento). Use conectivos variados, norma culta e não fuja do tema. Ao corrigir, aponte o trecho e diga como melhorar.' },
  { nome: 'Matemática passo a passo', quando: 'conta, calcular, equação, matemática, álgebra, função, porcentagem, geometria, física, exercício de exatas',
    instrucoes: 'Resolva em passos numerados, um cálculo por linha, mostrando a fórmula antes de usar. Confira o resultado substituindo de volta ou por estimativa. Termine com a resposta final em negrito e a unidade. Se faltar dado, diga qual.' },
  { nome: 'Revisão para prova', quando: 'prova, revisão, revisar, estudar para, simulado, resumo para prova, pontos principais',
    instrucoes: 'Monte a revisão em três partes: 1) resumo em tópicos curtos com o essencial; 2) os pontos que mais caem e as pegadinhas comuns; 3) três perguntas rápidas para a pessoa testar o que aprendeu (com as respostas no fim).' },
];
const lerConhecimentos = () => { try { const l = JSON.parse(pref('conhecimentos') || '[]'); return Array.isArray(l) ? l.filter(k => k && k.id && k.nome) : []; } catch (e) { return []; } };
const salvarConhecimentos = l => pref('conhecimentos', JSON.stringify(l.slice(0, 60)));
// palavras que contam para escolher (sem acento, sem as muito comuns)
const VAZIAS_K = new Set('para como com sem sobre uma umas uns que qual quais quando onde porque isso esse essa este esta meu minha seu sua dos das nos nas pelo pela mais menos muito pouco fazer faz ser ter tem voce vou quero preciso pode'.split(' '));
const palavrasK = t => semAcento(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 3 && !VAZIAS_K.has(w));
const raiz = w => w.slice(0, Math.max(4, Math.min(6, w.length - 1)));   // "redações" e "redação" casam
// quais conhecimentos entram nesta pergunta: os de "usar sempre", os chamados por /nome e os que combinam com ela
function conhecimentosPara(texto) {
  const l = lerConhecimentos().filter(k => k.ativo !== false); if (!l.length) return [];
  const t = semAcento(texto), pal = new Set(palavrasK(texto).map(raiz));
  const nota = k => {
    if (k.sempre) return 99;
    if (t.includes('/' + semAcento(k.nome).replace(/\s+/g, '')) || t.includes('/' + semAcento(k.nome))) return 50;
    const n = palavrasK(k.nome).filter(w => pal.has(raiz(w))).length, q = palavrasK(k.quando || '').filter(w => pal.has(raiz(w))).length;
    return n * 2 + q * 2;   // uma palavra do nome ou do "quando usar" já basta
  };
  return l.map(k => [nota(k), k]).filter(([n]) => n >= 2).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, k]) => k);
}
// o texto que vai para a IA: instruções e os trechos dos arquivos ligados à pergunta
function blocoConhecimento(lista, texto) {
  const orc = Math.max(1500, Math.min(7000, Math.floor(nCtx * 0.9)));   // ~caracteres para as referências
  return lista.map(k => {
    let refs = '';
    for (const r of (k.refs || [])) {
      const tr = r.texto.length > orc / lista.length ? (BUSCA.trechosRelevantes(r.texto, texto, Math.floor(orc / lista.length)) || { texto: r.texto.slice(0, Math.floor(orc / lista.length / 2)) }).texto : r.texto;
      if (tr) refs += `\n\nReferência "${r.nome}":\n${tr}`;
    }
    return `CONHECIMENTO "${k.nome}" (a pessoa preparou isto: siga nesta resposta):\n${k.instrucoes}${refs}`;
  }).join('\n\n');
}
function abrirConhecimentos() {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha conh">${topoCentro('Conhecimento')}<div class="conh-corpo"></div></div>`;
  const folha = f.firstChild, corpo = folha.querySelector('.conh-corpo'), sair = () => animarSaida(f, folha);
  const desenhar = () => {
    const l = lerConhecimentos();
    corpo.innerHTML = `<p class="conh-intro">Ensine a Própons do seu jeito. Cada conhecimento tem instruções (e, se quiser, arquivos de referência) que a IA usa sozinha quando a pergunta combina. Chame pelo nome com <b>/nome</b>.</p>
      ${l.length ? `<div class="conh-lista">${l.map(k => `<div class="conh-item${k.ativo === false ? ' off' : ''}" data-id="${esc(k.id)}">
        <button class="conh-abrir" data-editar><span class="conh-ico">${ICO.conhecimento}</span><span class="pt"><b>${esc(k.nome)}</b><small>${esc(k.sempre ? 'Usado em toda resposta' : (k.quando || 'Sem "quando usar"'))}${(k.refs || []).length ? ` · ${k.refs.length} ${k.refs.length === 1 ? 'arquivo' : 'arquivos'}` : ''}</small></span></button>
        <button class="interruptor so-chave" role="switch" aria-checked="${k.ativo !== false}" aria-label="Ligar ${esc(k.nome)}" data-ligar><span class="chave"></span></button></div>`).join('')}</div>`
        : `<div class="conh-vazio"><span class="conh-ico grande">${ICO.conhecimento}</span><b>Nenhum conhecimento ainda</b><small>Crie um do zero ou comece por um modelo abaixo.</small></div>`}
      <button class="btn primario conh-novo" data-novo><svg viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M12 5v14M5 12h14"/></svg>Novo conhecimento</button>
      <h4 class="conh-sub">Começar de um modelo</h4>
      <div class="conh-modelos">${MODELOS_CONHECIMENTO.map((m, i) => `<button class="conh-modelo" data-modelo="${i}"${l.some(k => k.nome === m.nome) ? ' disabled' : ''}><b>${esc(m.nome)}</b><small>${esc(m.instrucoes.slice(0, 90))}…</small><span>${l.some(k => k.nome === m.nome) ? 'Adicionado' : 'Adicionar'}</span></button>`).join('')}</div>`;
    corpo.querySelectorAll('[data-ligar]').forEach(b => b.onclick = () => {
      const id = b.closest('[data-id]').dataset.id, l2 = lerConhecimentos(), k = l2.find(x => x.id === id); if (!k) return;
      k.ativo = k.ativo === false; salvarConhecimentos(l2); desenhar();
    });
    corpo.querySelectorAll('[data-editar]').forEach(b => b.onclick = () => editarConhecimento(lerConhecimentos().find(x => x.id === b.closest('[data-id]').dataset.id), desenhar));
    corpo.querySelector('[data-novo]').onclick = () => editarConhecimento(null, desenhar);
    corpo.querySelectorAll('[data-modelo]').forEach(b => b.onclick = () => {
      const m = MODELOS_CONHECIMENTO[+b.dataset.modelo], l2 = lerConhecimentos();
      l2.push({ id: novoId(), nome: m.nome, quando: m.quando, instrucoes: m.instrucoes, refs: [], ativo: true, criado: Date.now() });
      salvarConhecimentos(l2); toast(`"${m.nome}" adicionado.`); desenhar();
    });
  };
  desenhar();
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f);
}
function editarConhecimento(k, depois) {
  const novo = !k; k = k ? JSON.parse(JSON.stringify(k)) : { id: novoId(), nome: '', quando: '', instrucoes: '', refs: [], ativo: true, criado: Date.now() };
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha conh-ed">${topoCentro(novo ? 'Novo conhecimento' : 'Editar conhecimento')}
    <label class="campo"><span>Nome</span><input class="campo-texto" data-c="nome" maxlength="60" placeholder="Ex.: Redação nota 1000"${novo ? " data-autofocus" : ""}></label>
    <label class="campo"><span>Quando usar</span><input class="campo-texto" data-c="quando" maxlength="240" placeholder="Palavras e situações: redação, ENEM, dissertação…"><small>A IA usa este conhecimento sozinha quando a pergunta fala dessas coisas.</small></label>
    <label class="campo"><span>Instruções</span><textarea class="campo-texto" data-c="instrucoes" rows="6" maxlength="4000" placeholder="Como a IA deve responder: estrutura, tom, passos, o que evitar…"></textarea></label>
    <div class="campo"><span>Arquivos de referência</span><div class="conh-refs"></div><button type="button" class="btn" data-ref>${ICO.arquivo}Adicionar arquivo (.txt, .md, .pdf, .docx)</button><small>Só os trechos ligados a cada pergunta entram na resposta.</small></div>
    <button class="interruptor" role="switch" data-sempre aria-checked="${!!k.sempre}"><span class="pt"><b>Usar em toda resposta</b><small>Sem precisar combinar com a pergunta</small></span><span class="chave"></span></button>
    <div class="conh-botoes">${novo ? '' : `<button class="btn perigo" data-apagar>${ICO.apagar}Apagar</button>`}<button class="btn primario" data-salvar>Salvar</button></div>
    <input type="file" hidden data-arq accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx,text/*"></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  folha.querySelectorAll('[data-c]').forEach(el => { el.value = k[el.dataset.c] || ''; el.oninput = () => { k[el.dataset.c] = el.value; }; });
  const refs = () => { folha.querySelector('.conh-refs').innerHTML = (k.refs || []).map((r, i) => `<div class="conh-ref">${ICO.arquivo}<span>${esc(r.nome)}<small>${tamanhoBonito(r.texto.length)} de texto</small></span><button class="icone" data-tirar="${i}" aria-label="Tirar ${esc(r.nome)}">${ICO.fechar}</button></div>`).join('');
    folha.querySelectorAll('[data-tirar]').forEach(b => b.onclick = () => { k.refs.splice(+b.dataset.tirar, 1); refs(); }); };
  refs();
  folha.querySelector('[data-ref]').onclick = () => folha.querySelector('[data-arq]').click();
  folha.querySelector('[data-arq]').onchange = async e => {
    const arq = e.target.files[0]; e.target.value = ''; if (!arq) return;
    try {
      const texto = /\.pdf$/i.test(arq.name) ? (await extrairPdf(arq)).texto : /\.docx$/i.test(arq.name) ? (await extrairDocx(arq)).texto : await arq.text();
      if (!texto.trim()) { toast('Esse arquivo não tem texto.'); return; }
      if (texto.length > 150000) toast(`"${arq.name}" é grande: guardei os primeiros 150 mil caracteres.`, 4000);
      k.refs = (k.refs || []).concat({ nome: arq.name, texto: texto.slice(0, 150000) }).slice(-3); refs();
    } catch (er) { toast(`Não consegui ler "${arq.name}".`, 3500); }
  };
  folha.querySelector('[data-sempre]').onclick = e => { const b = e.currentTarget; k.sempre = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', k.sempre); };
  folha.querySelector('[data-salvar]').onclick = () => {
    k.nome = (k.nome || '').trim(); k.instrucoes = (k.instrucoes || '').trim();
    if (!k.nome || !k.instrucoes) { toast('Dê um nome e escreva as instruções.'); return; }
    const l = lerConhecimentos(), i = l.findIndex(x => x.id === k.id);
    if (i >= 0) l[i] = k; else l.push(k);
    salvarConhecimentos(l); sair(); if (depois) depois();
  };
  const ap = folha.querySelector('[data-apagar]');
  if (ap) ap.onclick = async () => { if (!await confirmar('Apagar o conhecimento?', `"${esc(k.nome)}" sai deste aparelho.`, 'Apagar', true)) return; salvarConhecimentos(lerConhecimentos().filter(x => x.id !== k.id)); sair(); if (depois) depois(); };
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f);
}
