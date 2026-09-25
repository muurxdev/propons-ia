/* ---------------- nomes dos modelos ----------------
   Própons Lume (leve e rápido), Própons Aurora (médio e equilibrado) e Própons Ápice (pesado, o mais capaz). */
const NOME_MODELO = { leve: 'Lume', normal: 'Aurora', avancado: 'Ápice' };
const PESO_MODELO = { leve: 'Leve · Rápido', normal: 'Médio · Equilibrado', avancado: 'Pesado · Mais inteligente' };
const ESFORCO = { baixo: ['Baixo', 'Pensa menos e responde mais rápido.'], medio: ['Médio', 'Equilíbrio entre rapidez e profundidade.'], auto: ['Auto', 'Raciocina só quando a pergunta pede (contas, código, "por quê"); nas outras responde direto.'], alto: ['Alto', 'Raciocina antes de responder (dá para ver o raciocínio). Mais lento e bem mais preciso em contas e lógica.'] };
/* o esforço é por modelo (cada um guarda o seu) */
const idModeloAtual = () => (ESCOLHER ? MODELO_INICIAL : ((sistemaCache && (sistemaCache.modelos || []).find(m => m.atual) || {}).id)) || 'normal';
// padrão Auto no computador (placar de 24/09/2026: acerto entre o Médio e o Alto em metade do tempo do Alto); no
// celular o raciocínio roda no processador e pode levar um minuto, então Lume e Aurora começam no Médio
const PADRAO_ESFORCO = CELULAR ? { leve: 'medio', normal: 'medio', avancado: 'auto' } : { leve: 'auto', normal: 'auto', avancado: 'auto' };
// níveis que cada modelo usa de verdade (medidos no placar, treino/README.md): um nível só aparece se muda algo
// mensurável (tempo, tamanho ou acerto). No iPhone o motor não raciocina: sem Alto e sem Auto.
const ESFORCOS_MODELO = { leve: ['baixo', 'medio', 'auto', 'alto'], normal: ['baixo', 'medio', 'auto', 'alto'], avancado: ['baixo', 'medio', 'auto', 'alto'] };
const esforcosDe = id => (ESFORCOS_MODELO[id] || Object.keys(ESFORCO)).filter(k => PLATAFORMA.tipo !== 'ios' || (k !== 'alto' && k !== 'auto'));
const esforcoDe = id => { const v = pref('esforco:' + id), l = esforcosDe(id); return l.includes(v) ? v : l.includes(PADRAO_ESFORCO[id]) ? PADRAO_ESFORCO[id] : l.includes('medio') ? 'medio' : l[0]; };
const esforco = () => esforcoDe(idModeloAtual());
const definirEsforco = (id, v) => { pref('esforco:' + id, v); pref('esforco', v); pref('esforcoModelo', id); };
ICO.esforco = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
function abrirEsforco(depois) {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha esforco">${topoCentro('Nível de esforço · ' + nomeModelo(idModeloAtual()), true)}<div class="lista-modelos">${esforcosDe(idModeloAtual()).map(k => [k, ESFORCO[k]]).map(([k, [r, d]]) =>
    `<button class="lm${k === esforco() ? ' on' : ''}" data-e="${k}"><span class="pt"><b>${r}</b><small>${d}</small></span><span class="st">${k === esforco() ? `<span class="check">${ICO.check}</span>` : ''}</span></button>`).join('')}</div>
    <p class="info" style="margin:10px 12px 2px">Cada modelo guarda o seu nível. No Alto a IA raciocina sempre (acerta mais, demora mais); no Auto, só quando a pergunta pede.</p></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { definirEsforco(idModeloAtual(), b.dataset.e); atualizarSeletorModelo(); sair(); if (depois) depois(); });
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#seletorModelo'));
}
const DESC_MODELO = { leve: 'Leve e rápido', normal: 'Equilibrado, para o dia a dia', avancado: 'Para as tarefas mais difíceis' };
ICO.check = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
// dentro do app o "Própons" é redundante: na caixa estreita fica só Lume, Aurora ou Ápice
const nomeCurtoModelo = m => NOME_MODELO[m.id || m] || String(m.nome || '').replace(/^.*\((.*)\).*$/, '$1');
const nomeModelo = m => 'Própons ' + nomeCurtoModelo(m);
/* logo de cada modelo: Lume é uma chama com brilho, Aurora o sol nascendo no horizonte, Ápice a montanha com a estrela
   no topo. O desenho é branco sobre o degradê do modelo (CSS .logo-modelo.m-<id>). */
const LOGO_MODELO = {
  leve: '<svg viewBox="0 0 24 24"><path d="M12 3.5c.6 3-2.8 4.6-2.8 8.2A2.9 2.9 0 0 0 12 14.6a2.9 2.9 0 0 0 2.8-2.9c0-1.1-.4-2-1-2.8 2.6 1 4.3 3.6 4.3 6.3A6.1 6.1 0 0 1 12 21.3a6.1 6.1 0 0 1-6.1-6.1c0-5.2 5.3-7 6.1-11.7z"/><path d="M18.5 3.8l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="currentColor"/></svg>',
  normal: '<svg viewBox="0 0 24 24"><path d="M3 16.5h18M6.5 20h11"/><path d="M6.8 16.5a5.2 5.2 0 0 1 10.4 0"/><path d="M12 5.5v2.2M5.2 8.7l1.6 1.5M18.8 8.7l-1.6 1.5M2.8 13.2h2.1M19.1 13.2h2.1"/></svg>',
  avancado: '<svg viewBox="0 0 24 24"><path d="M2.8 19.5l6.3-10 3.2 4.6 2.2-3.1 6.7 8.5z"/><path d="M9.1 9.5l1.6 2.4 1.6-1"/><path d="M15.2 3.3l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="currentColor"/></svg>',
};
const logoModelo = m => { const id = (m && (m.id || m)) || ''; return LOGO_MODELO[id] ? `<span class="logo-modelo m-${id}" aria-hidden="true">${LOGO_MODELO[id]}</span>` : ''; };
// bolinha com a porcentagem do download
const anel = pct => `<span class="anel" style="--p:${Math.max(0, Math.min(100, Math.floor(pct * 100)))}"><b>${Math.floor(pct * 100)}%</b></span>`;

/* ---------------- primeira abertura ----------------
   O app abre direto no chat, sem modelo. Ao mandar a primeira mensagem (ou tocar no seletor ao lado do "+"),
   sobe a lista de modelos; ao tocar em Baixar, aparece a bolinha com a %; quando termina, o app liga a IA,
   abre o chat de novo e a IA responde a mensagem que ficou esperando. */
const ESCOLHER = !!window.PROPONS_ESCOLHER || /[#&]escolher\b/.test(location.hash);
// abertura fria: a IA ainda não foi ligada. Se já há um modelo baixado (MODELO_INICIAL), o chat abre normal e a IA liga
// na primeira mensagem; se não há, a primeira mensagem abre a lista para escolher e baixar.
const MODELO_INICIAL = window.PROPONS_MODELO || (location.hash.match(/[#&]modelo=([a-z]+)/) || [])[1] || null;
async function ligarInicial() {
  escolhendoId = MODELO_INICIAL;
  const alvo = addIa({ texto: '', interno: true }, false); if (alvo) alvo.classList.add('digitando');
  try { await PLATAFORMA.escolherModelo(MODELO_INICIAL); }
  catch (e) { escolhendoId = null; if (alvo) alvo.parentNode.remove(); toast('A IA não ligou (' + e.message + '). Tente de novo; se continuar, escolha um modelo mais leve na lista.', 6000); }
}
let escolhendoId = null;
PLATAFORMA.ao('download', d => {
  const id = d.id;
  const linha = document.querySelector(`.lista-modelos [data-m="${id}"] .st`);
  if (linha) linha.innerHTML = d.fase === 'verificando' ? '<span class="anel girando"><b>✓</b></span>' : anel(d.pct || 0);
  // o texto embaixo do nome acompanha o anel (antes ficava parado no primeiro valor)
  const texto = document.querySelector(`.lista-modelos [data-m="${id}"] small`); if (texto) texto.textContent = textoDownload(d);
  if (ESCOLHER && id === escolhendoId) estado(d.fase === 'verificando' ? 'conferindo o download' : d.fase === 'bloqueado' ? 'a rede não deixa baixar' : !(d.feito > 0) ? 'conectando' : `baixando ${Math.floor((d.pct || 0) * 100)}%`);
});
// erro de download: rede que bloqueia (escola, empresa) ganha a explicação com o caminho do pendrive numa folha, em vez
// de um aviso que some; os dois ouvintes de download-fim avisam uma vez só
let ultimoErroDl = { msg: '', quando: 0 };
function avisarErroDownload(msg) {
  if (msg === ultimoErroDl.msg && Date.now() - ultimoErroDl.quando < 3000) return;
  ultimoErroDl = { msg, quando: Date.now() };
  if (/pendrive/i.test(msg)) perguntar('A rede não deixou baixar', `<p>${esc(msg).replace(/\n/g, '</p><p>')}</p>`, [['Entendi', true, 'primario']]);
  else toast(msg, 5000);
}
PLATAFORMA.ao('download-fim', d => {
  if (!ESCOLHER || d.id !== escolhendoId || d.ok) return;
  escolhendoId = null; estado('', false, 'download');
  avisarErroDownload(d.erro === 'cancelado' ? 'Download cancelado.' : (d.erro || 'Não foi possível baixar. Verifique a internet e tente de novo.'));
  const f = document.querySelector('.dlg.modelos'); if (f) desenharListaModelos(f);
});
PLATAFORMA.ao('motor', d => {
  if (!ESCOLHER) return;
  if (d.estado === 'ligando') document.querySelectorAll('.lista-modelos .st .anel').forEach(a => a.outerHTML = '<span class="anel girando"><b></b></span>');
  if (d.estado === 'pronto') escolhendoId = null;
  if (d.estado === 'erro') { escolhendoId = null; document.querySelectorAll('.msg.ia .txt.digitando').forEach(t => t.parentNode.remove()); avisarErroDownload(d.mensagem || 'Não foi possível ligar a IA.', 5000); const f = document.querySelector('.dlg.modelos'); if (f) desenharListaModelos(f); }
});
// depois que a IA liga, responde a mensagem que ficou esperando o download
async function responderPendente() {
  const c = conversas.find(x => x.msgs.length && x.msgs[x.msgs.length - 1].role === 'user' && x.msgs[x.msgs.length - 1].pendente);
  if (!c) return;
  delete c.msgs[c.msgs.length - 1].pendente;
  abrir(c.id); await responder(c);
}

/* ---------------- seletor de modelo (ao lado do "+", como no Claude) ---------------- */
function atualizarSeletorModelo() {
  const a = sistemaCache && (sistemaCache.modelos || []).find(m => m.atual && m.baixado !== false);
  const curto = m => estreita() ? nomeCurtoModelo(m) : nomeModelo(m);
  $('#nomeModelo').textContent = ESCOLHER ? 'Selecionar modelo' : a ? curto(a) : 'Modelo';   // sem motor ligado, não mostra o modelo da vez passada
  const lg = $('#logoSeletor'); if (lg) lg.innerHTML = !ESCOLHER && a ? logoModelo(a) : '';
  // o nível aparece sempre (inclusive "Médio"): todo modelo tem o seu
  const p = $('#pillEsforco'); if (p) { p.textContent = ESFORCO[esforco()][0]; p.hidden = ESCOLHER; }
}
async function abrirSeletorModelo(motivo) {
  document.querySelectorAll('.dlg.modelos').forEach(x => x.closest('.dlg-fundo').remove());
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha modelos">${topoCentro(motivo === 'enviar' ? 'Escolha o modelo para responder' : 'Selecionar modelo')}
    ${ESCOLHER ? '<p class="info" style="margin:0 12px 10px;text-align:center">O modelo é baixado uma vez e depois funciona sem internet. Dá para trocar quando quiser.</p>' : ''}
    <div class="lista-modelos"><p class="info" style="padding:12px 14px;margin:0">Carregando…</p></div>
    ${ESCOLHER ? '' : `<div class="opcoes linhas" style="margin-top:12px"><button data-esforco><span class="oi">${ICO.esforco}</span><span class="pt"><b>Esforço</b><small class="acento">${ESFORCO[esforco()][0]}</small></span>${ICO.seta}</button><button data-gerenciar><span class="oi">${ICO.chip}</span><span class="pt"><b>Gerenciar modelos</b><small>Baixar, apagar e ver detalhes</small></span>${ICO.seta}</button></div>`}</div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); };
  folha.querySelector('[data-x]').onclick = sair;
  const g = folha.querySelector('[data-gerenciar]'); if (g) g.onclick = () => { sair(); abrirConfig('modelo'); };
  const ef = folha.querySelector('[data-esforco]'); if (ef) ef.onclick = () => { sair(); abrirEsforco(() => abrirSeletorModelo()); };
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#seletorModelo'));
  await lerSistema(); atualizarSeletorModelo(); atualizarBotaoPesquisa();
  desenharListaModelos(folha); posicionarPop(f, folha, $('#seletorModelo'));
}
// a folha/menu do seletor, se estiver aberta, acompanha downloads e trocas
function redesenharSeletor() { const f = document.querySelector('.dlg.modelos'); if (f) desenharListaModelos(f); }
function desenharListaModelos(folha) {
  const lm = folha.querySelector('.lista-modelos'), sis = sistemaCache; if (!lm) return;
  if (!sis || !sis.modelos) { lm.innerHTML = '<p class="info" style="padding:12px 14px;margin:0">Não foi possível ler os modelos.</p>'; return; }
  const ram = sis.ramTotal || 0, rec = ram && ram < 5.5 * GB ? 'leve' : 'normal';
  lm.innerHTML = sis.modelos.map(m => {
    // só mostra porcentagem quando está realmente baixando; modelo já baixado que foi clicado mostra "ativando"
    const b = baixando[m.id] || (escolhendoId === m.id && !m.baixado ? { pct: 0, feito: 0, total: m.tamanho, fase: 'conectando' } : null);
    const emUso = !ESCOLHER && m.atual && !trocandoPara;
    const ligando = !b && (trocandoPara === m.id || (escolhendoId === m.id && m.baixado));
    const st = b ? anel(b.pct || 0) : ligando ? '<span class="anel girando"><b></b></span>' : m.bloqueado ? '' : emUso ? `<span class="check">${ICO.check}</span>`
      : !m.baixado ? `<span class="btn-mini">Baixar</span>` : '';   // clicar já liga: nada de botão "Usar"
    const desc = m.bloqueado ? m.bloqueado : ligando ? 'Ativando…' : b ? textoDownload(b) : (DESC_MODELO[m.id] || PESO_MODELO[m.id] || '') + (m.baixado ? '' : ' · ' + gbBonito(m.tamanho) + (ESCOLHER ? '' : ' para baixar'));
    return `<button class="lm${emUso ? ' on' : ''}" data-m="${m.id}"${m.bloqueado || (escolhendoId && escolhendoId !== m.id) ? ' disabled' : ''}>
      ${logoModelo(m)}<span class="pt"><b>${esc(nomeModelo(m))}${ESCOLHER && m.id === rec ? ' <span class="selo ok">Recomendado</span>' : ''}</b>
      <small>${esc(desc)}</small></span><span class="st">${st}</span></button>`;
  }).join('');
  lm.querySelectorAll('[data-m]').forEach(bt => bt.onclick = async () => {
    const m = sis.modelos.find(x => x.id === bt.dataset.m); if (!m || bt.disabled) return;
    if (ESCOLHER) {
      if (escolhendoId) return;
      if (semRam(m, ram)) { toast(`O ${nomeModelo(m)} precisa de ${ramNecessaria(m)} GB de memória; este aparelho tem ${gbBonito(ram)}.`, 4500); return; }
      escolhendoId = m.id; desenharListaModelos(folha); estado(m.baixado ? 'ativando' : 'baixando 0%');
      try { await PLATAFORMA.escolherModelo(m.id); } catch (e) { escolhendoId = null; estado(''); toast('Não deu para usar esse modelo (' + e.message + '). Confira a internet e o espaço livre e tente de novo.', 6000); desenharListaModelos(folha); }
      return;
    }
    if (m.atual || trocandoPara) return;
    if (PLATAFORMA.tipo === 'web') { animarSaida(folha.parentNode, folha); abrirConfig('modelo'); return; }
    await acaoModelo('usar', m, ram);
    desenharListaModelos(folha);
  });
}
$('#seletorModelo').onclick = () => abrirSeletorModelo();
$('#pillEsforco').onclick = e => { e.stopPropagation(); abrirEsforco(); };
$('#btPesquisa').onclick = () => definirPesquisa(false);
addEventListener('online', atualizarBotaoPesquisa); addEventListener('offline', atualizarBotaoPesquisa);
$('#pillEsforco').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); abrirEsforco(); } };

// câmera do PC (webcam) numa folha: tira a foto e anexa
async function abrirWebcam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#fotos').click(); return; }
  let fluxo;
  try { fluxo = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); }
  catch (e) { toast('Não foi possível abrir a câmera: ' + (e.name === 'NotAllowedError' ? 'permissão negada.' : e.name === 'NotFoundError' ? 'nenhuma câmera encontrada.' : e.message), 4500); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg">${topoFolha('Câmera')}<div class="webcam"><video autoplay playsinline muted></video></div>
    <div class="botoes"><button class="btn" data-c="cancelar">Cancelar</button><button class="btn primario" data-c="foto">${ICO.camera}Tirar foto</button></div></div>`;
  const v = f.querySelector('video'); v.srcObject = fluxo;
  const sair = () => { fluxo.getTracks().forEach(t => t.stop()); animarSaida(f, f.firstChild); };
  f.fechar = sair;
  f.onclick = e => { if (e.target === f) sair(); };
  f.querySelector('[data-x]').onclick = sair;
  f.querySelector('[data-c="cancelar"]').onclick = sair;
  f.querySelector('[data-c="foto"]').onclick = () => {
    const c = document.createElement('canvas'); c.width = v.videoWidth || 1280; c.height = v.videoHeight || 960;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => { if (b) adicionarArquivos([new File([b], 'foto-' + new Date().toTimeString().slice(0, 8).replace(/:/g, '') + '.jpg', { type: 'image/jpeg' })]); }, 'image/jpeg', 0.9);
    sair();
  };
  folhaArrastavel(f, f.firstChild, sair);
  pausarDesenho();
  document.body.appendChild(f);
}

// a IA precisa do módulo de visão para ler fotos: baixa (uma vez) e liga, com confirmação
let esperaVisao = null;
async function garantirVisao() {
  const sis = await lerSistema();
  if (!sis || sis.visaoAtiva) return true;
  if (!PLATAFORMA.temVisao) { toast('Neste aparelho a IA ainda não lê fotos.'); return false; }
  const ativo = (sis.modelos || []).find(m => m.atual) || {};
  if (PLATAFORMA.tipo === 'web') {
    await perguntar('Ler fotos no Linux', `<p>Para a IA entender fotos, ligue a visão pelo terminal (baixa ${gbBonito(ativo.visaoTamanho || 0)} uma vez) e abra de novo:</p><div class="cmd"><code id="cmdVisao">propons-ia --visao</code><button class="icone" data-copiar="cmdVisao">${ICO.copiar}</button></div>`, [['Entendi', true, 'primario']]);
    return false;
  }
  const baixar = !ativo.visaoBaixada;
  const ok = await confirmar('Ler fotos', `<p>Para entender fotos, a IA usa um <b>módulo de visão</b>${baixar ? ` de ${gbBonito(ativo.visaoTamanho || 0)}, baixado uma vez só` : ''}.</p><p>Com a visão ligada a IA usa um pouco mais de memória. Dá para desligar em Ajustes → Modelos de IA.</p>`, baixar ? 'Baixar e ligar' : 'Ligar visão');
  if (!ok) return false;
  try { await PLATAFORMA.ligarVisao(true); } catch (e) { toast('A leitura de fotos não ligou (' + e.message + '). Confira a internet e o espaço livre e tente de novo.', 6000); return false; }
  toast(baixar ? 'Baixando a visão… a foto vai assim que terminar.' : 'Ligando a visão…', 3500);
  return new Promise(res => { esperaVisao = res; setTimeout(() => { if (esperaVisao === res) { esperaVisao = null; res(false); } }, 30 * 60000); });
}
function fimEsperaVisao(ok) {
  if (!esperaVisao) return;
  const r = esperaVisao; esperaVisao = null;
  if (!ok) { r(false); return; }
  // espera o motor voltar a responder antes de mandar a foto
  (async () => { for (let i = 0; i < 240 && !online; i++) await new Promise(t => setTimeout(t, 500)); r(online); })();
}
document.addEventListener('click', e => { const b = e.target.closest('.dlg [data-copiar]'); if (b) copiarTexto($('#' + b.dataset.copiar).textContent).then(() => toast('Copiado.')); });
['dragenter', 'dragover'].forEach(t => document.addEventListener(t, e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); $('#caixa').classList.add('soltar'); } }));
['dragleave', 'drop'].forEach(t => document.addEventListener(t, e => { if (t === 'dragleave' && e.relatedTarget) return; $('#caixa').classList.remove('soltar'); }));
document.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); adicionarArquivos([...e.dataTransfer.files]); } });
$('#entrada').addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); adicionarArquivos(fs); } });

