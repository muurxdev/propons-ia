/* ---------------- ajustes (painel: no PC com menu ao lado, no celular em tela cheia) ---------------- */
const GB = 1073741824;
let abaAtual = 'modelo';
const PAGINAS = [
  [['modelo', 'Modelos de IA', ICO.chip], ['atualizacoes', 'Atualizações', ICO.atualizar]],
  [['geral', 'Geral', ICO.aparencia], ['respostas', 'Respostas', ICO.respostas], ['personalizacao', 'Personalização', ICO.memoria], ['privacidade', 'Privacidade', ICO.cadeado], ['conversas', 'Conversas', ICO.conversas], ['estudo', 'Estudo', ICO.estudo]],
  [['diagnostico', 'Diagnóstico', ICO.diagnostico], ['sobre', 'Sobre', ICO.sobre]],
];
const TITULOS = Object.fromEntries(PAGINAS.flat().map(([k, t]) => [k, t]));
let sistemaCache = null;
/* memória de verdade que cada modelo precisa (medido: pico do motor carregado + resposta gerada, llama.cpp b11070)
     Lume 0,9 GB · Aurora 2,0 GB (2,6 com visão) · Ápice 4,4 GB (5,1 com visão).
     PC: + ~2,5 GB de sistema e app → 3 / 4 / 8 GB. Celular: + ~3 GB de sistema e tela, e o Android fecha apps quando
     aperta → 3 / 6 / 12 GB. Abaixo disso o modelo fica bloqueado (sem "baixar mesmo assim"); só o Lume nunca é bloqueado. */
const RAM_MIN = CELULAR ? { leve: 3, normal: 6, avancado: 12 } : { leve: 3, normal: 4, avancado: 8 };
const ramNecessaria = m => RAM_MIN[m.id || m] || (m.ramMin || 0);
const semRam = (m, ram) => !!(ram && (m.id || m) !== 'leve' && ram < ramNecessaria(m) * GB * 0.93);
async function lerSistema() {
  const s = await PLATAFORMA.sistema().catch(() => null);
  if (s) {
    (s.modelos || []).forEach(m => {
      m.ramMin = ramNecessaria(m);
      if (m.bloqueado && /precisa de/.test(m.bloqueado)) delete m.bloqueado;   // a regra de memória é esta aqui, não a do aparelho
      if (!m.bloqueado && semRam(m, s.ramTotal)) m.bloqueado = `precisa de ${ramNecessaria(m)} GB de RAM (este tem ${gbBonito(s.ramTotal)})`;
    });
    sistemaCache = s;
  }
  return sistemaCache;
}

function subtitulo(k) {
  const ativo = sistemaCache && (sistemaCache.modelos || []).find(m => m.atual);
  switch (k) {
    case 'modelo': return ativo ? 'Em uso: ' + nomeModelo(ativo) : 'Escolher, baixar e apagar';
    case 'respostas': return ({ curtas: 'Respostas curtas', normais: 'Respostas normais', detalhadas: 'Respostas detalhadas' })[pref('tamanhoResposta') || 'normais'] + (querSugestoes() ? ' · com sugestões' : ' · sem sugestões');
    case 'atualizacoes': return atualizacao ? `Versão ${atualizacao.versao} disponível` : `Versão ${VERSAO}`;
    case 'geral': return ({ sistema: 'Tema do sistema', claro: 'Tema claro', escuro: 'Tema escuro' })[pref('tema') || 'sistema'] + ' · letra ' + ({ p: 'pequena', m: 'média', g: 'grande' })[pref('fonte') || 'm'] + (PLATAFORMA.temFala ? (pref('lerRespostas') === 'sim' ? ' · lê em voz alta' : ' · voz') : '');
    case 'conversas': return `${conversas.length} ${conversas.length === 1 ? 'conversa' : 'conversas'} · backup e limpeza`;
    case 'personalizacao': { const n = memoria().length, ins = String(pref('instrucoes') || '').trim(); return (ins ? 'Com suas instruções' : 'Instruções, nível') + ' · ' + (n ? `${n} ${n === 1 ? 'lembrança' : 'lembranças'}` : 'memória'); }
    case 'privacidade': return (pesquisaLigada() ? 'Pesquisa ligada' : 'Pesquisa desligada') + ' · ' + (usarDadosLugar() ? 'clima e lugar reais' : 'sem dados de lugar');
    case 'estudo': { const b = baralho(), n = paraRevisar(b).length; return b.cartoes.length ? `${n ? n + ' para revisar hoje' : 'nada para revisar hoje'} · ${b.cartoes.length} cartões` : 'Flashcards, quiz e redação'; }
    case 'diagnostico': return 'Testar tudo e medir a velocidade';
    case 'sobre': return 'Própons IA ' + VERSAO;
  }
  return '';
}
function desenharNav() {
  const n = $('#pNav'); if (!n) return;
  n.innerHTML = `<div class="p-nav-topo"><button class="icone" data-fechar aria-label="Fechar">${ICO.fechar}</button><h2>Ajustes</h2><span class="vazio-x"></span></div>` +
    PAGINAS.map(g => `<div class="p-grupo">${g.map(([k, t, ic]) => `<button class="p-item${k === abaAtual ? ' on' : ''}" data-aba="${k}"><span class="pi">${ic}</span><span class="pt"><b>${t}</b><small>${esc(subtitulo(k))}</small></span>${k === 'atualizacoes' && atualizacao ? '<i class="ponto"></i>' : ''}<span class="seta">${ICO.seta}</span></button>`).join('')}</div>`).join('');
  n.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => irPara(b.dataset.aba));
  n.querySelector('[data-fechar]').onclick = () => fecharModal();
}
function fecharModal(imediato) { document.querySelectorAll('.painel-fundo:not(.saindo)').forEach(f => imediato ? f.remove() : animarSaida(f, f.firstChild)); }
function voltarPainel() {
  pausarDesenho(300);
  const p = $('.painel');
  if (p && estreita() && p.classList.contains('sub')) { p.classList.remove('sub'); desenharNav(); entradaSuave([...$('#pNav').children]); }
  else fecharModal();
}
function abrirConfig(aba) {
  fecharModal(true); fecharMenus(); if (estreita()) fecharLateral();
  const f = document.createElement('div'); f.className = 'painel-fundo';
  f.innerHTML = `<div class="painel" role="dialog" aria-label="Ajustes"><div class="p-arrastar"><span class="alca"></span></div><nav class="p-nav" id="pNav"></nav>
    <section class="p-conteudo"><div class="p-topo"><button class="icone p-voltar" id="pVoltar" aria-label="Voltar">${ICO.voltar}</button><h3 id="pTitulo"></h3><button class="icone p-fechar" aria-label="Fechar">${ICO.fechar}</button></div><div class="p-corpo" id="corpoConfig"></div></section></div>`;
  document.body.appendChild(f);
  f.onclick = e => { if (e.target === f) fecharModal(); };
  f.querySelector('.p-fechar').onclick = () => fecharModal();
  folhaArrastavel(f, f.firstChild, () => fecharModal());
  $('#pVoltar').onclick = voltarPainel;
  pausarDesenho(420);
  if (aba || !estreita()) irPara(aba || abaAtual, true); else { desenharNav(); entradaSuave([...$('#pNav').children]); }
  // os subtítulos (modelo em uso…) chegam depois da entrada suave, sem refazer a lista no meio dela
  setTimeout(() => lerSistema().then(() => { if (!document.querySelector('.painel-fundo.saindo')) desenharNav(); }), 560);
}
function irPara(aba, abrindo) {
  aba = ({ memoria: 'personalizacao', aparencia: 'geral' })[aba] || aba;   // nomes antigos das páginas
  if (!TITULOS[aba]) aba = 'modelo';
  abaAtual = aba; desenharNav();
  const p = $('.painel'); if (!p) return;
  // celular: a página do módulo fica do tamanho do menu principal (nada de pular para a tela cheia)
  if (estreita() && !p.style.height) alturaPainel(p);
  p.classList.add('sub'); $('#pTitulo').innerHTML = esc(TITULOS[aba]) + botaoAjuda('m:' + aba);
  $('#corpoConfig').scrollTop = 0;
  pausarDesenho(300);
  // abrindo a folha: mostra a página só depois da animação (o conteúdo pesado não disputa o quadro com ela)
  if (abrindo) { $('#corpoConfig').innerHTML = '<p class="info">Carregando…</p>'; setTimeout(() => { if ($('#corpoConfig') && abaAtual === aba) desenharAba(); }, 340); }
  else desenharAba();
}
function alturaPainel(p) { p.style.height = ''; p.style.height = Math.max(p.offsetHeight, Math.min(alturaVisivel() * 0.6, 420)) + 'px'; }
// girou o celular com os Ajustes abertos: a altura fixa é refeita para a tela nova
let larguraPainel = innerWidth;
addEventListener('resize', () => {
  if (innerWidth === larguraPainel) return; larguraPainel = innerWidth;
  const p = $('.painel'); if (p && p.style.height) { if (estreita()) alturaPainel(p); else p.style.height = ''; }
});
$('#abrirConfig').onclick = () => abrirConfig();

function desenharAba() {
  const c = $('#corpoConfig'); if (!c) return;
  const pagina = abaAtual, r = ({ respostas: abaRespostas, personalizacao: abaPersonalizacao, privacidade: abaPrivacidade, geral: abaGeral, modelo: abaModelo, atualizacoes: abaAtualizacoes, conversas: abaConversas, estudo: abaEstudo, diagnostico: abaDiagnostico, sobre: abaSobre })[abaAtual](c);
  // (!) nas seções e entrada suave dos blocos só na primeira vez que a página aparece (redesenhos não piscam)
  Promise.resolve(r).then(() => { if ($('#corpoConfig') !== c || abaAtual !== pagina) return; const nova = c.dataset.pagina !== pagina; c.dataset.pagina = pagina; enfeitarPagina(c, nova); });
}
function seg(nome, opcoes, atualV) {
  return `<div class="seg${opcoes.length > 4 ? ' muitos' : ''}" data-seg="${nome}" role="radiogroup">${opcoes.map(([v, r]) => `<button data-v="${v}" role="radio" aria-checked="${v === atualV}" class="${v === atualV ? 'on' : ''}">${r}</button>`).join('')}</div>`;
}
function ligarSeg(c, nome, f) { c.querySelectorAll(`[data-seg="${nome}"] button`).forEach(b => b.onclick = () => { c.querySelectorAll(`[data-seg="${nome}"] button`).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); f(b.dataset.v); desenharNav(); }); }
function ligarCopiar(c) { c.querySelectorAll('[data-copiar]').forEach(b => b.onclick = () => copiarTexto($('#' + b.dataset.copiar).textContent).then(() => toast('Copiado.'))); }

function abaGeral(c) {
  c.innerHTML = `<div class="secao"><h4>Tema</h4>${seg('tema', [['sistema', 'Sistema'], ['claro', 'Claro'], ['escuro', 'Escuro']], pref('tema') || 'sistema')}</div>
    <div class="secao"><h4>Tamanho da letra</h4>${seg('fonte', [['p', 'Pequena'], ['m', 'Média'], ['g', 'Grande']], pref('fonte') || 'm')}</div>
    ${PLATAFORMA.temFala ? `<div class="secao"><h4>Ler em voz alta</h4>${seg('lerRespostas', [['nao', 'Só quando eu pedir'], ['sim', 'Toda resposta']], pref('lerRespostas') || 'nao')}<p class="info">O alto-falante em cada resposta lê o texto com a voz do sistema. Em "Toda resposta", a leitura começa enquanto a IA ainda escreve.</p></div>` : ''}
    <div class="secao"><h4>Avisar quando ficar pronto</h4>${seg('avisarPronto', [['sim', 'Sim'], ['nao', 'Não']], pref('avisarPronto') || 'sim')}<p class="info">A IA continua respondendo com ${estreita() ? 'o app em segundo plano ou a tela apagada' : 'a janela minimizada ou em outro programa'}; quando terminar, ${estreita() ? 'chega uma notificação' : 'o sistema avisa'}. Sem aviso se você estiver com a Própons na frente.</p></div>
    <div class="secao"><h4>Enter envia</h4>${seg('enterEnvia', [['sim', 'Sim'], ['nao', 'Não, quebra a linha']], enterEnvia() ? 'sim' : 'nao')}
      <p class="info">${CELULAR ? 'No celular o padrão é Enter quebrar a linha e a seta enviar.' : 'Shift+Enter sempre quebra a linha.'}</p></div>
    ${estreita() ? `<div class="secao"><h4>Gestos</h4><p class="info">Arraste da borda esquerda para abrir o histórico · segure uma conversa para renomear, compartilhar ou apagar · botão voltar fecha menus e telas.</p></div>`
      : `<div class="secao"><h4>Atalhos</h4><p class="info">Enter envia · Shift+Enter quebra linha · ↑ edita a última pergunta · Ctrl+B histórico · Ctrl+K buscar · Ctrl+Shift+O nova conversa · Ctrl+, ajustes</p></div>`}`;
  ligarSeg(c, 'tema', v => { pref('tema', v); aplicarTema(); });
  ligarSeg(c, 'fonte', v => { pref('fonte', v); aplicarFonte(); });
  ligarSeg(c, 'enterEnvia', v => { pref('enterEnvia', v); $('#entrada').setAttribute('enterkeyhint', v === 'sim' ? 'send' : 'enter'); });
  ligarSeg(c, 'lerRespostas', v => { pref('lerRespostas', v); if (v === 'sim' && !falaAtual) falarAviso('Leitura em voz alta ligada.'); });
  ligarSeg(c, 'avisarPronto', v => { pref('avisarPronto', v); if (v === 'sim') PLATAFORMA.notificar('Própons IA', 'Pronto: é assim que eu vou avisar quando a resposta terminar.'); });
}

/* ---------------- modelos ---------------- */
const PERFIL_MODELO = { leve: 'Mais rápido', normal: 'Equilibrado', avancado: 'Mais inteligente' };
// o que cada um faz bem e o acerto no placar de 145 perguntas (sem pensar – pensando), treino/README.md
const USO_MODELO = { leve: 'Dúvidas rápidas e resumos em qualquer aparelho.', normal: 'O dia a dia de estudo: explicações, exercícios e redação.', avancado: 'Contas, código e perguntas difíceis; o que menos inventa.' };
const PLACAR_MODELO = { leve: [46, 65], normal: [65, 83], avancado: [88, 97] };
let baixando = {};          // id → { pct, feito, total, fase }
let trocandoPara = null;    // id do modelo que está sendo ligado
// antes do primeiro byte não há tamanho para mostrar (era o "NaN de NaN MB"); rede que bloqueia o download ganha texto próprio
const textoDownload = b => b.fase === 'verificando' ? 'Conferindo o arquivo…'
  : b.fase === 'bloqueado' ? 'A rede não está deixando baixar · tentando de novo…'
  : !(b.total > 0) || !(b.feito > 0) ? 'Conectando ao servidor…'
  : `Baixando ${Math.floor((b.pct || 0) * 100)}% · ${Math.round(b.feito / 1048576)} de ${Math.round(b.total / 1048576)} MB`;

function cartaoModelo(m, ram, rec) {
  const perfil = PERFIL_MODELO[m.id] || '';
  const b = baixando[m.id], ligando = trocandoPara === m.id && !b, web = PLATAFORMA.tipo === 'web';
  const pouca = ram && m.ramMin && ram < ramNecessaria(m) * GB * 0.93;
  const usar = rot => `<button class="btn primario" data-acao="usar" data-id="${m.id}" data-modelo="${m.id}">${rot}</button>`;
  let acoes = '';
  if (m.atual || ligando) acoes = '';
  else if (m.bloqueado) acoes = m.baixado && !web ? `<button class="btn perigo" data-acao="apagar" data-id="${m.id}">${ICO.apagar}Apagar</button>` : '';
  else if (b) acoes = `<button class="btn" data-acao="cancelar" data-id="${m.id}">Cancelar download</button>`;
  else if (web) acoes = usar('Usar');
  else if (m.baixado) acoes = usar('Usar') + `<button class="btn perigo" data-acao="apagar" data-id="${m.id}">${ICO.apagar}Apagar</button>`;
  else acoes = usar('Baixar e usar') + `<button class="btn" data-acao="baixar" data-id="${m.id}">${ICO.exportar}Só baixar</button>`;
  if (m.visaoBaixada && !web && !(m.atual && sistemaCache && sistemaCache.visaoAtiva) && !b && !ligando) acoes += `<button class="btn link" data-acao="apagarVisao" data-id="${m.id}">Apagar visão</button>`;
  const selo = m.atual ? '<span class="selo">Em uso</span>' : ligando ? '<span class="selo cinza">Ligando…</span>' : m.bloqueado ? '' : m.baixado ? '<span class="selo ok">Baixado</span>' : '';
  const pl = PLACAR_MODELO[m.id];
  const medida = (rotulo, valor, extra) => `<div class="mmed${extra ? ' ' + extra : ''}"><small>${rotulo}</small><b>${valor}</b></div>`;
  return `<div class="mcard${m.atual ? ' on' : ''}" data-cartao="${m.id}">
    <div class="mtopo">${logoModelo(m) || `<span class="logo-modelo">${esc((nomeCurtoModelo(m) || '?')[0])}</span>`}
      <div class="pt"><b>${esc(nomeModelo(m))}${botaoAjuda('modelo:' + m.id)}</b><small>${PESO_MODELO[m.id] || esc(m.descricao || '')}</small></div>${selo}</div>
    <div class="mmedidas">${pl ? medida('Acerto', pl[0] + '–' + pl[1] + ' %') : ''}${medida('Tamanho', gbBonito(m.tamanho))}${medida('Memória', ramNecessaria(m) + ' GB+', pouca ? 'aviso' : '')}</div>
    ${m.bloqueado ? `<p class="maviso">${esc(m.bloqueado)}</p>` : `<p class="mdesc">${esc(USO_MODELO[m.id] || perfil)}${m.id === rec ? ' <span class="rec">Recomendado para este aparelho</span>' : ''}${m.visaoTamanho && PLATAFORMA.temVisao ? ` · ${m.visaoBaixada ? 'lê fotos' : 'lê fotos (+' + gbBonito(m.visaoTamanho) + ')'}` : ''}</p>`}
    <div class="mprog"${b || ligando ? '' : ' hidden'}><div class="barra"><i style="width:${b ? (b.pct * 100).toFixed(1) : 100}%"></i></div><small>${b ? textoDownload(b) : 'Ligando o modelo…'}</small></div>
    <div class="macoes">${acoes}</div></div>`;
}
/* "Usar a IA de outro aparelho": o celular (ou outro PC) usa o modelo do PC de casa, pela rede. No PC: Ajustes →
   Modelos de IA → API na rede local mostra o endereço e a chave. */
function htmlRemota() {
  const r = PLATAFORMA.remota;
  return `<div class="secao"><h4>Usar a IA de outro aparelho</h4><div class="cartao">
    <p class="info" style="margin-top:0!important">Use o modelo do seu PC (mais rápido e maior) neste aparelho, pela rede da casa. No PC: Ajustes → Modelos de IA → ligue <b>API na rede local</b> e copie o endereço e a chave.</p>
    <label class="bib-campo"><span>Endereço</span><input class="campo-texto" id="remUrl" placeholder="http://192.168.0.10:8765" autocomplete="off" spellcheck="false" inputmode="url" value="${esc(r ? r.url : pref('iaRemotaUrl') || '')}"></label>
    <label class="bib-campo"><span>Chave</span><input class="campo-texto" id="remChave" autocomplete="off" spellcheck="false" value="${esc(r ? r.chave : '')}"></label>
    <div class="botoes">${r ? '<button class="btn perigo" id="remDesligar">Voltar para os modelos deste aparelho</button>' : '<button class="btn primario" id="remLigar">Testar e usar</button>'}</div>
    <p class="info" id="remEstado">${r ? 'Em uso: ' + esc(r.nome || r.url) + '. As perguntas vão pela rede da casa (sem criptografia): use só na sua rede.' : 'As perguntas vão pela rede da casa sem criptografia: use só numa rede em que você confia.'}</p></div></div>`;
}
function ligarRemota(c) {
  const est = c.querySelector('#remEstado');
  const bl = c.querySelector('#remLigar'); if (bl) bl.onclick = async () => {
    let url = c.querySelector('#remUrl').value.trim(); const chaveR = c.querySelector('#remChave').value.trim();
    url = url.replace(/\/v1\/?$/, '');   // o PC mostra o endereço com /v1 no fim
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    if (!/:\d+$/.test(url.replace(/\/+$/, ''))) url = url.replace(/\/+$/, '') + ':8765';
    bl.disabled = true; est.textContent = 'Testando…';
    try {
      const nome = await PLATAFORMA.testarRemota(url, chaveR);
      pref('iaRemotaUrl', url);
      PLATAFORMA.definirRemota({ url, chave: chaveR, nome: 'PC', modelo: nome, ligada: true });
      est.textContent = 'Funcionou (' + nome + '). Abrindo de novo com a IA do PC…';
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      bl.disabled = false;
      est.textContent = /Failed to fetch|NetworkError|Load failed|timed out|TimeoutError|aborted/i.test(e.message + ' ' + e.name) ? 'Não achei o PC nesse endereço. Confira se o PC está ligado, na mesma rede, com a API na rede local ligada.' : 'Não deu: ' + e.message + '.';
    }
  };
  const bd = c.querySelector('#remDesligar'); if (bd) bd.onclick = () => { PLATAFORMA.definirRemota(null); toast('Voltando para os modelos deste aparelho…'); setTimeout(() => location.reload(), 700); };
}
async function abaModelo(c) {
  if (!sistemaCache) c.innerHTML = '<p class="info">Carregando…</p>';
  const s = await lerSistema();
  if (abaAtual !== 'modelo' || !$('#corpoConfig')) return;
  const modelos = (s && s.modelos) || [];
  if (!modelos.length) { c.innerHTML = '<p class="info">Não foi possível ler os modelos deste aparelho.</p>'; return; }
  const ram = s.ramTotal || 0, web = PLATAFORMA.tipo === 'web';
  const rec = ram && ram < 5.5 * GB ? 'leve' : 'normal';
  const usado = modelos.reduce((t, m) => t + (m.baixado ? m.tamanho : 0) + (m.visaoBaixada ? m.visaoTamanho : 0), 0) + (s.vozes || []).reduce((t, v) => t + (v.baixado ? v.tamanho : 0), 0), livre = s.discoLivre || 0;
  const rolagem = c.scrollTop;
  c.innerHTML = `<p class="info">Os modelos ficam guardados neste aparelho e funcionam sem internet. Os maiores respondem melhor (principalmente código), mas são mais lentos e usam mais memória.</p>
    ${REMOTA ? htmlRemota() : ''}
    ${modelos.map(m => cartaoModelo(m, ram, rec)).join('')}
    ${!REMOTA && !(s.api && s.api.ligada) ? htmlRemota() : ''}
    ${PLATAFORMA.temVisao && !web ? `<div class="secao" style="margin-top:18px"><h4>Fotos</h4><div class="cartao"><button class="interruptor" id="swVisao" role="switch" aria-checked="${!!s.visaoLigada}"><span class="pt"><b>Ler fotos (visão)</b><small>${s.visaoAtiva ? 'Ligada: a IA entende fotos e prints' : 'Desligada: liga sozinha quando você manda uma foto'}</small></span><span class="chave"></span></button></div></div>` : ''}
    ${s.gpu && !web ? `<div class="secao" style="margin-top:18px"><h4>Aceleração por GPU</h4><div class="cartao"><button class="interruptor" id="swGpu" role="switch" aria-checked="${!!s.gpu.ligada}"><span class="pt"><b>Usar a placa de vídeo (Vulkan)</b><small>${descricaoGpu(s.gpu)}</small></span><span class="chave"></span></button>${s.gpu.baixada && !s.gpu.ligada && !baixando['gpu-vulkan'] ? `<button class="btn link" data-gpu="apagar" style="margin:8px 12px 10px">Apagar o módulo (${gbBonito(43658240)})</button>` : ''}</div></div>` : ''}
    ${s.api && s.api.suporte ? `<div class="secao" style="margin-top:18px"><h4>API na rede local</h4><div class="cartao"><button class="interruptor" id="swApi" role="switch" aria-checked="${!!s.api.ligada}"><span class="pt"><b>Deixar outros aparelhos usarem esta IA</b><small>${s.api.ligada ? 'Ligada: compatível com a API da OpenAI, na sua rede Wi-Fi' : 'Desligada (só este computador)'}</small></span><span class="chave"></span></button>
      ${s.api.ligada ? `<div class="api-info"><p class="info">Endereço: ${(s.api.enderecos || []).map(ip => `<code>http://${esc(ip)}:${s.api.porta}/v1</code>`).join(' · ') || '(sem rede)'}</p><p class="info">Chave (Bearer): <code id="apiChave">${esc(PLATAFORMA.chave)}</code> <button class="icone" data-copiar="apiChave" aria-label="Copiar chave">${ICO.copiar}</button></p><p class="info">Quem tiver o endereço e a chave usa a IA deste computador. O Windows pode pedir para liberar o "llama-server" no firewall.</p></div>` : ''}</div></div>` : ''}
    ${s.vozes ? `<div class="secao" style="margin-top:18px"><h4>Transcrição de áudio</h4><div class="lista-modelos" style="margin:0">${s.vozes.map(v => {
      const b = baixando[v.id];
      const st = b ? Math.floor(b.pct * 100) + '%' : v.atual ? (v.baixado ? 'Em uso' : 'Escolhida') : v.baixado ? 'Baixada' : gbBonito(v.tamanho);
      const botoes = b ? '' : (!v.atual && v.baixado ? `<button class="btn" data-voz="usar" data-id="${v.id}">Usar</button>` : '') + (!v.baixado ? `<button class="btn" data-voz="baixar" data-id="${v.id}">Baixar</button>` : `<button class="btn link" data-voz="apagar" data-id="${v.id}">Apagar</button>`);
      return `<div class="lm${v.atual ? ' on' : ''}"><span class="mico">${ICO.microfone}</span><span class="pt"><b>${esc(v.nome)}</b><small>${esc(v.descricao)} · ${gbBonito(v.tamanho)}</small></span><span class="st">${st}</span>${botoes}</div>`;
    }).join('')}</div><p class="info" style="margin-top:8px">Grave com o 🎤 ao lado de enviar ou mande um arquivo pelo "+" → Arquivos (qualquer tamanho). O texto aparece na caixa para você conferir.</p></div>` : ''}
    <div class="secao" style="margin-top:18px"><h4>Armazenamento</h4><div class="cartao">
      ${livre ? `<div class="uso"><i style="width:${Math.max(usado ? 1.5 : 0, Math.min(100, usado / (usado + livre) * 100)).toFixed(1)}%"></i></div>` : ''}
      <div class="linha-info"><span>Modelos baixados</span><b>${usado ? gbBonito(usado) : 'nenhum'}</b></div>
      ${livre ? `<div class="linha-info"><span>Espaço livre</span><b>${gbBonito(livre)}</b></div>` : ''}
      <div class="linha-info"><span>Memória (RAM)</span><b>${ram ? gbBonito(ram) : '?'}</b></div>
      ${s.pastaModelos ? `<div class="linha-info"><span>Pasta</span><b>${esc(s.pastaModelos)}</b></div>` : ''}
    </div></div>
    ${web ? `<div class="secao"><h4>No Linux</h4><p class="info">Troque o modelo pelo terminal (a Própons IA reabre com ele e baixa se preciso):</p>
      <div class="cmd"><code id="cmdModelo">propons-ia --modelo normal</code><button class="icone" data-copiar="cmdModelo" aria-label="Copiar">${ICO.copiar}</button></div>
      <p class="info" style="margin-top:12px">Para apagar um modelo e liberar espaço:</p><div class="cmd"><code id="cmdApagar">propons-ia --apagar-modelo avancado</code><button class="icone" data-copiar="cmdApagar" aria-label="Copiar">${ICO.copiar}</button></div></div>` : ''}`;
  c.scrollTop = rolagem;
  ligarCopiar(c); ligarRemota(c);
  c.querySelectorAll('[data-acao]').forEach(b => b.onclick = () => acaoModelo(b.dataset.acao, modelos.find(x => x.id === b.dataset.id), ram));
  c.querySelectorAll('[data-voz]').forEach(b => b.onclick = async () => {
    const v = s.vozes.find(x => x.id === b.dataset.id); if (!v) return;
    try {
      if (b.dataset.voz === 'usar') { await PLATAFORMA.usarVoz(v.id); toast(v.nome + ' em uso.'); }
      else if (b.dataset.voz === 'baixar') { if (Object.keys(baixando).length) { toast('Espere o download atual terminar.'); return; } baixando[v.id] = { pct: 0, feito: 0, total: v.tamanho }; await PLATAFORMA.baixarVoz(v.id); await PLATAFORMA.usarVoz(v.id); }
      else if (await confirmar('Apagar a voz?', `Libera ${gbBonito(v.tamanho)}. Ela é baixada de novo se você transcrever com ela.`, 'Apagar', true)) { await PLATAFORMA.apagarVoz(v.id); toast('Voz apagada.'); }
    } catch (e) { delete baixando[v.id]; toast(e.message, 4000); }
    desenharAba();
  });
  const sw = c.querySelector('#swVisao');
  if (sw) sw.onclick = async () => {
    if (sw.getAttribute('aria-checked') === 'true') {
      if (!await confirmar('Desligar a visão?', 'A IA deixa de ler fotos até você mandar outra (aí ela liga de novo). O módulo continua baixado.', 'Desligar')) return;
      try { await PLATAFORMA.ligarVisao(false); sw.setAttribute('aria-checked', 'false'); } catch (e) { toast(e.message, 4000); }
    } else if (await garantirVisao()) { toast('Visão ligada.'); if (abaAtual === 'modelo') desenharAba(); }
  };
  const sg = c.querySelector('#swGpu');
  if (sg) sg.onclick = async () => {
    const g = (sistemaCache && sistemaCache.gpu) || {};
    if (geracao || transcrevendo) { toast('Espere a resposta terminar.'); return; }
    if (sg.getAttribute('aria-checked') === 'true') {
      try { await PLATAFORMA.ligarGpu(false); toast('GPU desligada. A IA volta a usar o processador.', 3000); } catch (e) { toast(e.message, 4000); }
      await lerSistema(); if (abaAtual === 'modelo') desenharAba(); return;
    }
    if (!g.baixada) {
      if (!await confirmar('Aceleração por GPU', `<p>A Própons baixa o módulo Vulkan do motor (${gbBonito(g.tamanho || 31851321)}, uma vez só) e passa a usar a placa de vídeo para responder mais rápido — no PC com placa dedicada, 3 a 4 vezes.</p><p>Se a placa for mais lenta que o processador (comum em gráficos integrados), a IA volta para o processador sozinha.</p>`, 'Baixar e testar')) return;
      baixando['gpu-vulkan'] = { pct: 0, feito: 0, total: g.tamanho || 0 }; desenharAba();
      const fim = await new Promise(res => { esperaGpu = res; PLATAFORMA.baixarGpu().catch(e => res({ ok: false, erro: e.message })); });
      delete baixando['gpu-vulkan'];
      if (!fim.ok) { toast(fim.erro === 'cancelado' ? 'Download cancelado.' : (fim.erro || 'Não foi possível baixar.'), 4500); await lerSistema(); if (abaAtual === 'modelo') desenharAba(); return; }
    }
    await testarGpu();
  };
  const sa = c.querySelector('#swApi');
  if (sa) sa.onclick = async () => {
    if (geracao || transcrevendo) { toast('Espere a resposta terminar.'); return; }
    const ligar = sa.getAttribute('aria-checked') !== 'true';
    if (ligar && !await confirmar('Ligar a API na rede local?', '<p>O motor da IA passa a aceitar pedidos de outros aparelhos da sua rede (Wi-Fi), sempre com a chave desta sessão. Use só em redes que você confia.</p>', 'Ligar')) return;
    try { await PLATAFORMA.ligarApi(ligar); toast(ligar ? 'API ligada. O endereço e a chave estão logo abaixo.' : 'API desligada.', 3500); } catch (e) { toast(e.message, 4000); }
    await lerSistema(); if (abaAtual === 'modelo') desenharAba();
  };
  ligarCopiar(c);
  const ag = c.querySelector('[data-gpu="apagar"]');
  if (ag) ag.onclick = async () => { try { await PLATAFORMA.apagarGpu(); pref('gpuMedida', ''); toast('Módulo da GPU apagado.'); } catch (e) { toast(e.message, 4000); } await lerSistema(); if (abaAtual === 'modelo') desenharAba(); };
}
// GPU: texto do interruptor, download e o teste que decide (a placa só fica ligada se for mais rápida que o processador)
let esperaGpu = null;
PLATAFORMA.ao('download-fim', d => { if (d.id === 'gpu-vulkan' && esperaGpu) { const r = esperaGpu; esperaGpu = null; r(d); } });
function descricaoGpu(g) {
  let med = null; try { med = JSON.parse(pref('gpuMedida') || 'null'); } catch (e) {}
  const b = baixando['gpu-vulkan'];
  if (b) return `Baixando o módulo · ${Math.floor((b.pct || 0) * 100)}%`;
  if (g.ativa) return `Em uso: ${g.dispositivo}${med && med.gpu ? ` · ${med.gpu.toFixed(0)} tokens/s (processador: ${med.cpu.toFixed(0)})` : ''}`;
  if (g.ligada && g.falhou) return 'A placa não funcionou desta vez; a IA está no processador. Desligue e ligue para tentar de novo.';
  if (g.ligada) return 'Ligada (entra quando a IA religar)';
  if (g.baixada) return med && med.lenta ? `Desligada: aqui a placa (${med.dispositivo || 'GPU'}) ficou mais lenta que o processador (${med.gpu.toFixed(0)} × ${med.cpu.toFixed(0)} tokens/s)` : 'Baixada, desligada';
  return `Desligada · baixa o módulo Vulkan (${gbBonito(g.tamanho || 31851321)}) uma vez`;
}
async function testarGpu() {
  const medir = async () => { const r = await PLATAFORMA.gerar([{ role: 'user', content: 'Escreva os números de 1 a 60 separados por vírgula, sem mais nada.' }], { temperatura: 0, maxTokens: 80, exato: true }, () => {}); return r && r.timings && r.timings.predicted_per_second || 0; };
  const esperarOnline = async () => { for (let i = 0; i < 480 && !online; i++) await new Promise(r => setTimeout(r, 250)); return online; };
  toast('Medindo o processador…', 4000);
  const cpu = await medir().catch(() => 0);
  toast('Ligando a placa de vídeo…', 4000);
  let r;
  try { r = await PLATAFORMA.ligarGpu(true); } catch (e) { toast('A placa de vídeo não funcionou aqui: ' + e.message + ' A IA continua no processador.', 6000); await lerSistema(); if (abaAtual === 'modelo') desenharAba(); return; }
  await esperarOnline();
  const gpu = r && r.ativa ? await medir().catch(() => 0) : 0;
  if (!r || !r.ativa || gpu < cpu * 1.15) {
    try { await PLATAFORMA.ligarGpu(false); } catch (e) {}
    pref('gpuMedida', JSON.stringify({ cpu, gpu, dispositivo: (r && r.dispositivo) || '', lenta: true }));
    toast(r && r.ativa ? `A placa (${r.dispositivo}) não ficou mais rápida que o processador (${gpu.toFixed(0)} × ${cpu.toFixed(0)} tokens/s). A IA continua no processador.` : 'Nenhuma placa de vídeo compatível com Vulkan foi encontrada. A IA continua no processador.', 8000);
  } else {
    pref('gpuMedida', JSON.stringify({ cpu, gpu, dispositivo: r.dispositivo }));
    toast(`Placa de vídeo ligada: ${r.dispositivo} · ${gpu.toFixed(0)} tokens/s (antes ${cpu.toFixed(0)}).`, 7000);
  }
  await lerSistema(); if (abaAtual === 'modelo') desenharAba();
}
async function acaoModelo(acao, m, ram) {
  if (!m) return;
  if (PLATAFORMA.tipo === 'web') { $('#cmdModelo').textContent = 'propons-ia --modelo ' + m.id; $('#cmdModelo').scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Copie o comando e rode no terminal.'); return; }
  if (acao === 'cancelar') { PLATAFORMA.cancelarDownload(m.id).catch(() => {}); return; }
  if (acao === 'apagarVisao') {
    if (!await confirmar('Apagar a visão?', `Libera ${gbBonito(m.visaoTamanho)}. Se mandar uma foto com este modelo, ela é baixada de novo.`, 'Apagar', true)) return;
    try { await PLATAFORMA.apagarVisao(m.id); toast('Visão apagada.'); } catch (e) { toast('Não deu para apagar: ' + e.message, 4000); }
    desenharAba(); return;
  }
  if (acao === 'apagar') {
    if (!await confirmar(`Apagar o ${nomeModelo(m)}?`, `Libera ${gbBonito(m.tamanho)}. Se quiser usar de novo, ele é baixado outra vez.`, 'Apagar', true)) return;
    try { await PLATAFORMA.apagarModelo(m.id); toast('Modelo apagado.'); } catch (e) { toast('Não deu para apagar: ' + e.message, 4000); }
    desenharAba(); return;
  }
  if (Object.keys(baixando).length || trocandoPara) { toast('Espere o download ou a troca atual terminar.'); return; }
  if (semRam(m, ram)) { toast(`O ${nomeModelo(m)} precisa de ${ramNecessaria(m)} GB de memória; este aparelho tem ${gbBonito(ram)}.`, 4500); return; }
  if (!m.baixado && !await confirmar(`Baixar o ${nomeModelo(m)}?`, `São ${gbBonito(m.tamanho)}, baixados uma vez só. De preferência use Wi-Fi.`, 'Baixar')) return;
  try {
    if (acao === 'baixar') { baixando[m.id] = { pct: 0, feito: 0, total: m.tamanho }; desenharAba(); await PLATAFORMA.baixarModelo(m.id); return; }
    if (geracao) geracao.ctrl.abort();
    if (!m.baixado) baixando[m.id] = { pct: 0, feito: 0, total: m.tamanho };
    trocandoPara = m.id; desenharAba();
    await PLATAFORMA.trocarModelo(m.id);
  } catch (e) { delete baixando[m.id]; trocandoPara = null; toast('O modelo não foi baixado (' + e.message + '). Confira a internet e o espaço livre; o download continua de onde parou.', 6000); desenharAba(); }
}
function atualizarCartao(id) {
  const el = document.querySelector(`[data-cartao="${id}"]`); if (!el) return;
  const b = baixando[id], p = el.querySelector('.mprog');
  if (b && p && !p.hidden && el.querySelector('[data-acao="cancelar"]')) { p.querySelector('i').style.width = (b.pct * 100).toFixed(1) + '%'; p.querySelector('small').textContent = textoDownload(b); return; }
  if (abaAtual === 'modelo') desenharAba();
}
const idDoModelo = d => d.id || ((sistemaCache && (sistemaCache.modelos || []).find(m => m.nome === d.nome)) || {}).id;
PLATAFORMA.ao('download', d => {
  redesenharSeletor();
  const id = idDoModelo(d); if (!id) return;
  baixando[id] = { pct: d.pct, feito: d.feito, total: d.total, fase: d.fase };
  atualizarCartao(id);
  if (id === 'gpu-vulkan') { const el = document.querySelector('#swGpu small'); if (el) el.textContent = descricaoGpu((sistemaCache && sistemaCache.gpu) || {}); }
  estado(`baixando ${Math.floor(d.pct * 100)}%`);
});
PLATAFORMA.ao('download-fim', d => {
  delete baixando[d.id]; estado('', false, 'download');
  if (String(d.id).startsWith('visao-') && !d.ok) fimEsperaVisao(false);
  if (esperaVoz && d.id === esperaVoz.id) { const r = esperaVoz.res; esperaVoz = null; r(!!d.ok); }
  if (d.ok && !String(d.id).startsWith('gpu-')) toast('Download concluído. O modelo já pode ser usado.', 3000);
  else if (d.erro === 'cancelado') toast('Download cancelado.');
  else if (d.erro) avisarErroDownload(d.erro);
  if (abaAtual === 'modelo') desenharAba();
  lerSistema().then(desenharNav);
});
PLATAFORMA.ao('motor', d => {
  if (d.estado === 'reiniciando' || d.estado === 'trocando') {
    online = false; estado(d.estado === 'trocando' ? 'trocando de modelo' : 'reconectando');
    if (d.estado === 'trocando' && trocandoPara) { delete baixando[trocandoPara]; if (abaAtual === 'modelo') desenharAba(); redesenharSeletor(); }
  }
  if (d.estado === 'pronto') {
    online = false; verificar(true);
    lerSistema().then(atualizarSeletorModelo);
    baixando = {}; trocandoPara = null;
    lerSistema().then(() => { desenharNav(); atualizarSeletorModelo(); redesenharSeletor(); if (abaAtual === 'modelo') desenharAba(); fimEsperaVisao(!!(sistemaCache && sistemaCache.visaoAtiva)); });
  }
  if (d.estado === 'erro') {
    baixando = {}; trocandoPara = null; fimEsperaVisao(false);
    estado('erro', true); avisarErroDownload(d.mensagem || 'Erro no motor da IA.');
    if (abaAtual === 'modelo') desenharAba(); redesenharSeletor();
  }
});

/* ---------------- conversas ---------------- */
function abaConversas(c) {
  const n = conversas.length, msgs = conversas.reduce((s, x) => s + x.msgs.length, 0);
  c.innerHTML = `<div class="cartao"><div class="linha-info"><span>Conversas</span><b>${n}</b></div><div class="linha-info"><span>Mensagens</span><b>${msgs}</b></div>
      <div class="linha-info"><span>Tamanho</span><b>${tamanhoBonito(new Blob([JSON.stringify(conversas)]).size)}</b></div>
      <div class="linha-info"><span>Onde ficam</span><b>${PLATAFORMA.tipo === 'windows' ? 'ao lado do programa (vão junto no pendrive)' : 'só neste aparelho'}</b></div></div>
    <div class="secao"><h4>Backup</h4><div class="botoes"><button class="btn" id="expTudo">${ICO.exportar}Exportar tudo (.json)</button><button class="btn" id="impTudo">${ICO.arquivo}Importar (.json)</button></div></div>
    <div class="secao"><h4>Limpeza</h4><div class="botoes"><button class="btn perigo" id="apagarTudo">${ICO.apagar}Apagar todas as conversas</button></div></div>`;
  $('#expTudo').onclick = () => PLATAFORMA.salvarArquivo('propons-ia-conversas-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'Própons IA', versao: VERSAO, conversas }, null, 1), 'application/json')
    .then(r => r !== false && toast('Backup exportado.')).catch(e => toast('Não deu para exportar: ' + e.message));
  $('#impTudo').onclick = () => $('#importar').click();
  $('#apagarTudo').onclick = () => apagarTodasConversas().then(ok => { if (ok) { desenharAba(); desenharNav(); } });
}
async function apagarTodasConversas() {
  const sai = conversas.filter(c => !c.fixada), ficam = conversas.length - sai.length;
  if (!sai.length) { toast(ficam ? 'Só há conversas fixadas (desafixe para apagar).' : 'Não há conversas para apagar.', 3000); return false; }
  if (!await confirmar('Apagar todas as conversas?', `${sai.length} ${sai.length === 1 ? 'conversa será apagada' : 'conversas serão apagadas'} deste aparelho. Isso não pode ser desfeito.${ficam ? ` ${ficam === 1 ? 'A conversa fixada fica' : 'As ' + ficam + ' fixadas ficam'}.` : ''}`, 'Apagar tudo', true)) return false;
  if (geracao && !geracao.conv.fixada) geracao.ctrl.abort();
  conversas = conversas.filter(c => c.fixada); salvarBloqueado = false;
  if (!atual || !atual.fixada) nova(); else desenharLista();
  salvar(true); toast('Conversas apagadas.'); return true;
}
$('#importar').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const novas = validar(Array.isArray(j) ? j : j.conversas);
    const ids = new Set(conversas.map(c => c.id)); let n = 0;
    for (const c of novas) { if (ids.has(c.id)) continue; conversas.push(c); n++; }
    conversas.sort((a, b) => b.atualizada - a.atualizada); salvarBloqueado = false; salvar(true); desenharLista(); desenharAba(); desenharNav();
    toast(n ? `${n} ${n === 1 ? 'conversa importada' : 'conversas importadas'}.` : 'Nenhuma conversa nova no arquivo.');
  } catch (err) { toast('Arquivo inválido: ' + err.message, 4000); }
};

/* ---------------- diagnóstico embutido ---------------- */
let ultimoRelatorio = '';
function abaDiagnostico(c) {
  c.innerHTML = `<p class="info">Confere se tudo está funcionando e mede a velocidade real da IA neste aparelho.</p>
    <div class="botoes" style="margin-bottom:12px"><button class="btn primario" id="rodarDiag">Rodar diagnóstico</button><button class="btn" id="copDiag" ${ultimoRelatorio ? '' : 'hidden'}>${ICO.copiar}Copiar relatório</button></div>
    <ul class="diag" id="listaDiag"></ul>`;
  $('#rodarDiag').onclick = rodarDiagnostico;
  $('#copDiag').onclick = () => copiarTexto(ultimoRelatorio).then(() => toast('Relatório copiado.'));
  if (ultimoRelatorio && window.__ultimaListaDiag) $('#listaDiag').innerHTML = window.__ultimaListaDiag;
}
async function rodarDiagnostico() {
  const ul = $('#listaDiag'); if (!ul) return;
  $('#rodarDiag').disabled = true; ul.innerHTML = '';
  const itens = [];
  const add = (st, titulo, det) => {
    itens.push({ st, titulo, det });
    const li = document.createElement('li');
    li.innerHTML = `<span class="ic">${{ ok: '✅', aviso: '⚠️', erro: '❌', info: 'ℹ️' }[st]}</span><div><b>${esc(titulo)}</b>${det ? `<small>${esc(det)}</small>` : ''}</div>`;
    if ($('#listaDiag')) $('#listaDiag').appendChild(li);
  };
  add('info', `Própons IA ${VERSAO}`, `Plataforma: ${({ windows: 'Windows', android: 'Android', ios: 'iOS', mac: 'Mac', web: 'Linux (navegador)' })[PLATAFORMA.tipo]} · ${navigator.userAgent.replace(/\s+/g, ' ').slice(0, 120)}`);
  // sistema
  let s = null; try { s = await PLATAFORMA.sistema(); } catch (e) {}
  if (s) {
    const livreRam = s.ramLivre ? `, livre ${gbBonito(s.ramLivre)}` : '';
    add(s.ramTotal && s.ramTotal < 3.5 * 1073741824 ? 'aviso' : 'ok', 'Memória (RAM)', `${s.ramTotal ? gbBonito(s.ramTotal) : '?'} total${livreRam}`);
    if (s.ramLivre !== undefined) add(s.ramLivre < 1.2 * 1073741824 ? 'aviso' : 'ok', 'Memória livre agora', s.ramLivre < 1.2 * 1073741824 ? 'Pouca memória livre: feche outros programas para a IA ficar mais rápida.' : gbBonito(s.ramLivre));
    add('info', 'Processador', `${s.cpu || '?'}${s.nucleos ? ` · ${s.nucleos} núcleos` : ''}`);
    if (s.discoLivre !== undefined) add(s.discoLivre < 2 * 1073741824 ? 'aviso' : 'ok', 'Espaço livre para modelos', `${gbBonito(s.discoLivre)}${s.pastaModelos ? ' em ' + s.pastaModelos : ''}`);
    if (s.pastaDados) add('info', 'Conversas salvas em', s.pastaDados);
    if (s.so) add('info', 'Sistema', s.so);
    const ativo = (s.modelos || []).find(m => m.atual);
    if (ativo) add('ok', 'Modelo selecionado', `${nomeModelo(ativo)} · ${ativo.nome} (${ativo.arquivo})`);
  } else add('aviso', 'Informações do sistema', PLATAFORMA.tipo === 'web' ? 'Abra pelo comando propons-ia para ver RAM/CPU/disco.' : 'Não foi possível ler.');
  // motor
  const t0 = performance.now(); const vivo = await PLATAFORMA.saude(); const lat = performance.now() - t0;
  add(vivo ? 'ok' : 'erro', 'Motor da IA', vivo ? `respondendo (${lat.toFixed(0)} ms)` : 'não está respondendo. Feche e abra a Própons IA de novo.');
  if (vivo) {
    try {
      const p = await PLATAFORMA.props();
      const modelo = p && (p.model_path || p.modelo || '').split(/[\\/]/).pop();
      const ctx = p && ((p.default_generation_settings && p.default_generation_settings.n_ctx) || p.n_ctx);
      if (ctx) nCtx = ctx;
      add('ok', 'Modelo carregado', `${modelo || '?'} · contexto ${ctx || '?'} tokens`);
    } catch (e) { add('aviso', 'Modelo carregado', 'não foi possível ler: ' + e.message); }
    // velocidade real
    if (!geracao) {
      const ctrl = new AbortController(); let n = 0, tPrimeiro = 0; const ti = performance.now();
      try {
        const r = await PLATAFORMA.gerar([{ role: 'user', content: 'Escreva os números de 1 a 40 separados por vírgula, sem mais nada.' }],
          { temperatura: 0, maxTokens: 64 }, () => { if (!n) tPrimeiro = performance.now() - ti; n++; }, ctrl.signal);
        const total = (performance.now() - ti) / 1000;
        const tm = r && r.timings;
        const ger = tm && tm.predicted_per_second ? tm.predicted_per_second : n / Math.max(total - tPrimeiro / 1000, 0.01);
        const pro = tm && tm.prompt_per_second;
        add(ger >= 6 ? 'ok' : ger >= 2.5 ? 'aviso' : 'erro', 'Velocidade de resposta',
          `${ger.toFixed(1)} tokens/s gerando${pro ? ` · ${pro.toFixed(0)} tokens/s lendo` : ''} · primeira palavra em ${(tPrimeiro / 1000).toFixed(1)} s${ger < 6 ? ' — use um modelo menor em Ajustes > Modelos de IA para ficar mais rápido' : ''}`);
      } catch (e) { add('erro', 'Velocidade de resposta', 'falhou: ' + e.message); }
    } else add('info', 'Velocidade de resposta', 'pulado (a IA está respondendo agora).');
    if (sistemaCache && sistemaCache.gpu) add('info', 'Aceleração', sistemaCache.gpu.ativa ? `placa de vídeo (${sistemaCache.gpu.dispositivo}, Vulkan)` : 'processador (CPU)' + (sistemaCache.gpu.baixada ? '' : ' — a placa de vídeo pode ser ligada em Modelos de IA'));
  }
  // algoritmos e renderizador
  try {
    const r = resumo('bubble', [5, 2, 8, 1]);
    const q = resumo('quick', [8, 2, 6, 4, 9, 1]);
    const b = resumo('binaria', [4, 8, 15, 16, 23, 42, 50], 23);
    const ok = /\[1, 2, 5, 8\]/.test(r) && /4 trocas/.test(r) && /\[1, 2, 4, 6, 8, 9\]/.test(q) && /índice \*\*4\*\*/.test(b);
    add(ok ? 'ok' : 'erro', 'Cálculo exato de algoritmos', ok ? 'bubble, quick e busca binária conferidos' : 'resultado inesperado');
  } catch (e) { add('erro', 'Cálculo exato de algoritmos', e.message); }
  const h = md('**ok** `x` [l](https://a.b)\n```python\ndef f(): pass\n```\n<b>x</b>');
  add(/<pre/.test(h) && /tk-kw/.test(h) && !/<b>x<\/b>/.test(h) ? 'ok' : 'erro', 'Formatação e destaque de código', 'Markdown, cores e proteção contra HTML');
  // armazenamento
  try {
    const antes = JSON.stringify(conversas); await PLATAFORMA.salvar(antes); const volta = await PLATAFORMA.carregar();
    add(volta === antes ? 'ok' : 'aviso', 'Gravação das conversas', volta === antes ? `${conversas.length} conversas gravadas e lidas corretamente` : 'o que foi lido difere do que foi gravado');
  } catch (e) { add('erro', 'Gravação das conversas', e.message); }
  // atualização
  const upd = await checarAtualizacao();
  add(upd === null ? 'aviso' : upd ? 'aviso' : 'ok', 'Atualizações', upd === null ? 'sem internet para verificar (a IA funciona offline normalmente)' : upd ? `nova versão ${upd.versao} disponível` : 'você está na versão mais recente');
  // relatório
  const ic = { ok: '[OK]', aviso: '[!]', erro: '[X]', info: '[i]' };
  ultimoRelatorio = `Diagnóstico Própons IA ${VERSAO} — ${new Date().toLocaleString('pt-BR')}\n` + itens.map(x => `${ic[x.st]} ${x.titulo}${x.det ? ': ' + x.det : ''}`).join('\n');
  window.__ultimaListaDiag = $('#listaDiag') ? $('#listaDiag').innerHTML : '';
  window.__diagnostico = itens;             // usado pelos testes automáticos
  if ($('#rodarDiag')) { $('#rodarDiag').disabled = false; $('#copDiag').hidden = false; }
}

/* ---------------- atualizações ---------------- */
let atualizacao = null;        // { versao, notas, tamanho } se houver versão nova · false = está em dia · null = não verificado
let atualizando = null;        // { pct, fase: 'baixando' | 'verificando' | 'instalando' }
let ultimaVerificacao = +(pref('ultimaVerificacao') || 0);
const maior = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
const ARQUIVO_DA_PLATAFORMA = { windows: 'Propons-IA-Windows.exe', android: 'Propons-IA-Android.apk', ios: 'Propons-IA-iOS.ipa', mac: 'Propons-IA-Mac.zip' };

// devolve { versao, ... } se houver versão nova, false se está em dia, null se não deu para verificar
async function checarAtualizacao() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json(); const v = String(j.tag_name || '').replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(v)) return null;
    ultimaVerificacao = Date.now(); pref('ultimaVerificacao', String(ultimaVerificacao));
    const asset = (j.assets || []).find(a => a.name === ARQUIVO_DA_PLATAFORMA[PLATAFORMA.tipo]);
    atualizacao = maior(v, VERSAO) ? { versao: v, url: j.html_url, notas: String(j.body || ''), tamanho: asset ? asset.size : 0, data: j.published_at || '' } : false;
    marcarPontos(); desenharNav();
    return atualizacao;
  } catch (e) { return null; }
}
function marcarPontos() { const tem = !!atualizacao; $('#pontoConfig').hidden = !tem; $('#pontoLat').hidden = !tem || !estreita(); }
function tempoAtras(ts) {
  const s = (Date.now() - ts) / 1000;
  return s < 90 ? 'agora há pouco' : s < 3600 ? `há ${Math.round(s / 60)} min` : s < 86400 ? `há ${Math.round(s / 3600)} h` : 'em ' + new Date(ts).toLocaleDateString('pt-BR');
}
// notas da versão (vêm de docs/novidades.md): sem o título e sem a tabela de downloads
// só a seção da versão nova; itens marcados como de outra plataforma ("- **PC:**", "- **Celular:**") não aparecem
/* novidades de uma versão: cada "- **Título.** texto" das notas vira um item com ícone e tipo (novo, melhoria,
   correção, por dentro); aparecem as 4 primeiras e "Ver todas" abre o resto, com data, tamanho e o link do GitHub */
const TIPOS_NOTA = {
  novo: ['Novo', '<svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="currentColor" stroke="none"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="currentColor" stroke="none"/></svg>'],
  melhora: ['Melhoria', '<svg viewBox="0 0 24 24"><path d="M4 16l5-5 4 4 7-7"/><path d="M15 8h5v5"/></svg>'],
  corrige: ['Correção', '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg>'],
  dentro: ['Por dentro', '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/></svg>'],
};
function itensNotas(s) {
  const out = [];
  limparNotas(s).split('\n').forEach(l => {
    const sub = /^\s+[-*]\s+(.*)$/.exec(l);
    if (sub && out.length) { const u = out[out.length - 1]; u.texto += (u.texto ? '; ' : '') + sub[1].trim(); return; }
    const m = /^[-*]\s+(?:\*\*(.+?)\*\*[:.]?\s*)?(.*)$/.exec(l);
    if (m) out.push({ titulo: (m[1] || '').replace(/[.:]\s*$/, ''), texto: m[2] || '' });
    else if (out.length && l.trim() && !/^\s*#/.test(l)) out[out.length - 1].texto += ' ' + l.trim();
  });
  return out.filter(n => n.titulo || n.texto);
}
function tipoNota(n) {
  const t = n.titulo + ' ' + n.texto;
  if (/^por dentro/i.test(n.titulo)) return 'dentro';
  // correção pelo título (o texto de uma novidade pode dizer "sem chance de erro" sem ser correção)
  if (/(corre[çc]|corrig|consert|arrum|n[ãa]o (trava|some|pula|fecha|cai|falha|apaga)|volta a funcionar)/i.test(n.titulo || t)) return 'corrige';
  // melhoria: o que já existia e ficou melhor; o resto (recurso com nome próprio) é novidade
  if (/\b(melhor|mais (r[áa]pid|leve|limp|clar|leg[íi]vel|compact)|menos|ficou|ficaram|agora (é|são|fica|ficam|abre|aparece)|visual|design|desenho|espaçamento|margens?)\b/i.test(n.titulo)) return 'melhora';
  if (/\b(novo|nova|novos|novas|chega|ganha|agora (d[áa]|tem|mostra|l[êe])|passa a)\b/i.test(t) || n.titulo) return 'novo';
  return 'melhora';
}
const inlineMd = t => md(t).replace(/^\s*<p>|<\/p>\s*$/g, '');
function htmlNotasVersao(u, nova) {
  const itens = itensNotas(u.notas || ''); if (!itens.length) return '';
  const cont = {}; itens.forEach(n => { n.tipo = tipoNota(n); cont[n.tipo] = (cont[n.tipo] || 0) + 1; });
  const data = u.data ? new Date(u.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const meta = [data && 'Publicada em ' + data, u.tamanho ? Math.round(u.tamanho / 1048576) + ' MB' : ''].filter(Boolean).join(' · ');
  return `<div class="nv${nova ? ' nv-destaque' : ''}">
    <div class="nv-topo"><span class="nv-selo">${nova ? 'Versão nova' : 'Nesta versão'}</span><b>O que há na ${esc(u.versao)}</b>${meta ? `<small>${esc(meta)}</small>` : ''}
      <div class="nv-tipos">${Object.keys(TIPOS_NOTA).filter(k => cont[k]).map(k => `<span class="nv-chip t-${k}">${TIPOS_NOTA[k][1]}${cont[k]} ${cont[k] > 1 ? ({ novo: 'novidades', melhora: 'melhorias', corrige: 'correções', dentro: 'por dentro' })[k] : ({ novo: 'novidade', melhora: 'melhoria', corrige: 'correção', dentro: 'por dentro' })[k]}</span>`).join('')}</div></div>
    <ol class="nv-lista">${itens.map((n, i) => `<li class="nv-item t-${n.tipo}"${i >= 4 ? ' hidden' : ''}><span class="nv-ico" title="${TIPOS_NOTA[n.tipo][0]}">${TIPOS_NOTA[n.tipo][1]}</span><div>${n.titulo ? `<b>${inlineMd(n.titulo)}</b>` : ''}${n.texto ? `<p>${inlineMd(n.texto)}</p>` : ''}</div></li>`).join('')}</ol>
    <div class="nv-pe">${itens.length > 4 ? `<button class="btn nv-mais">Ver todas as ${itens.length} novidades</button>` : ''}${u.url ? `<a class="nv-link" href="${esc(u.url)}" data-link>${ICO.link || ''}Notas completas no GitHub</a>` : ''}</div>
  </div>`;
}
function ligarNotasVersao(c) {
  c.querySelectorAll('.nv-item').forEach(li => li.onclick = e => { if (!e.target.closest('a')) li.classList.toggle('aberto'); });   // texto longo: 3 linhas, toque abre
  c.querySelectorAll('.nv-mais').forEach(b => b.onclick = () => { b.closest('.nv').querySelectorAll('.nv-item[hidden]').forEach((li, i) => { li.hidden = false; li.style.animationDelay = (i * 40) + 'ms'; }); b.remove(); });
  ligarLinks(c);
}
// em dia: mostra o que chegou na versão instalada (as notas vêm do GitHub, uma vez por abertura)
let notasDaAtual = null;
async function mostrarNotasDaAtual() {
  const alvo = () => $('#notasAtual');
  if (notasDaAtual === null && !semInternet()) {
    notasDaAtual = false;
    try { const r = await fetch(`https://api.github.com/repos/${REPO}/releases/tags/v${VERSAO}`, { cache: 'no-store' }); if (r.ok) { const j = await r.json(); notasDaAtual = { versao: VERSAO, notas: String(j.body || ''), url: j.html_url, data: j.published_at || '' }; } } catch (e) {}
  }
  const a = alvo(); if (!a || !notasDaAtual) return;
  a.innerHTML = htmlNotasVersao(notasDaAtual, false); ligarNotasVersao(a);
}
function limparNotas(s) {
  const linhas = s.replace(/\r/g, '').replace(/^\s*#{1,3}\s[^\n]*\n/, '').split(/\n#{1,3}\s*(?:Baixar|Downloads?|Instalar|Novidades)\b/i)[0].split('\n');
  const outra = CELULAR ? /^\s*-\s*\*\*(PC|Windows|Mac|Linux|Computador)\b/i : /^\s*-\s*\*\*(Celular|Android|iPhone|iOS|Mobile)\b/i;
  return linhas.filter(l => !outra.test(l)).join('\n').trim().slice(0, 8000);
}
const daLoja = () => !!(sistemaCache && sistemaCache.loja);   // Windows instalado pela Microsoft Store
function rotuloAtualizar() {
  if (daLoja()) return 'Atualizar pela Microsoft Store';
  return ({ ios: 'Atualizar pelo SideStore/AltStore', web: 'Como atualizar', windows: 'Atualizar agora', android: 'Atualizar agora', mac: 'Atualizar agora' })[PLATAFORMA.tipo];
}
function textoAtualizando() {
  if (!atualizando) return '';
  return ({ baixando: `Baixando a versão nova: ${Math.floor(atualizando.pct * 100)}%${atualizando.total ? ` (${Math.round(atualizando.feito / 1048576)} de ${Math.round(atualizando.total / 1048576)} MB)` : ''}`,
    verificando: 'Conferindo o arquivo baixado…',
    instalando: PLATAFORMA.tipo === 'windows' || PLATAFORMA.tipo === 'mac' ? 'Instalando: a Própons IA vai fechar e abrir de novo sozinha…' : 'Abrindo o instalador do Android…' })[atualizando.fase] || '';
}
function instrucoesAtualizacao() {
  switch (PLATAFORMA.tipo) {
    case 'windows': return daLoja() ? 'Instalada pela Microsoft Store: as versões novas chegam pela própria Store (assinadas pela Microsoft). Conversas e modelos continuam.' : 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256), troca o programa (também no pendrive) e abre de novo. Conversas e modelos continuam.';
    case 'android': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256) e abre o instalador do Android. Conversas e modelos continuam.';
    case 'mac': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256), troca o app e abre de novo. Conversas e modelos continuam.';
    case 'ios': return 'No iPhone, a atualização é feita pelo SideStore ou AltStore: abra o app, vá em <b>Meus apps</b> e toque em <b>Atualizar</b> na Própons IA. Conversas e modelos continuam.';
    default: return 'No Linux, rode no terminal:<div class="cmd"><code id="cmdAtualizar">propons-ia --atualizar</code><button class="icone" data-copiar="cmdAtualizar" aria-label="Copiar">' + ICO.copiar + '</button></div>';
  }
}
function abaAtualizacoes(c) {
  const u = atualizacao;
  const status = u ? `Nova versão ${esc(u.versao)} disponível` : u === false ? 'Você está na versão mais recente' : ultimaVerificacao ? 'Verificado ' + tempoAtras(ultimaVerificacao) : 'Ainda não verificado';
  c.innerHTML = `<div class="cartao"><div class="versao-topo"><div class="marca"></div><div><b>Própons IA ${VERSAO}</b><small class="${u ? 'tem-nova' : ''}">${status}</small></div></div>
      ${u && u.notas ? htmlNotasVersao(u, true) : '<div id="notasAtual"></div>'}
      <div id="progAtual"${atualizando ? '' : ' hidden'}><div class="barra"><i style="width:${atualizando ? (atualizando.pct * 100).toFixed(1) : 0}%"></i></div><small class="info" id="txtProgAtual">${textoAtualizando()}</small></div>
      <div class="botoes" style="margin-top:14px">${u ? `<button class="btn primario" id="btnAtualizar"${atualizando ? ' disabled' : ''}>${ICO.exportar}${rotuloAtualizar()}${u.tamanho && PLATAFORMA.podeAtualizarSozinho ? ` · ${Math.round(u.tamanho / 1048576)} MB` : ''}</button>` : ''}
        <button class="btn" id="btnTudo">${ICO.atualizar}Procurar atualizações</button></div>
      <ul class="diag" id="listaTudo" style="margin-top:8px"></ul>
      <p class="info" style="margin:12px 0 0">${instrucoesAtualizacao()} Procurar também confere se os modelos baixados estão inteiros (um com defeito é apagado para ser baixado de novo).</p></div>
    <div class="secao"><h4>Automático</h4><div class="cartao"><button class="interruptor" id="swAvisar" role="switch" aria-checked="${pref('avisarAtualizacao') !== 'nao'}"><span class="pt"><b>Avisar quando sair versão nova</b><small>Confere ao abrir o app, quando houver internet</small></span><span class="chave"></span></button></div></div>`;
  ligarCopiar(c); ligarNotasVersao(c);
  if (!u) mostrarNotasDaAtual();
  if ($('#btnAtualizar')) $('#btnAtualizar').onclick = iniciarAtualizacao;
  $('#btnTudo').onclick = atualizarTudo;
  $('#swAvisar').onclick = () => { const on = $('#swAvisar').getAttribute('aria-checked') !== 'true'; $('#swAvisar').setAttribute('aria-checked', on); pref('avisarAtualizacao', on ? 'sim' : 'nao'); };
}
function desenharAtualizando() {
  const p = $('#progAtual'); if (!p) return;
  p.hidden = !atualizando;
  if (atualizando) { p.querySelector('i').style.width = (atualizando.pct * 100).toFixed(1) + '%'; $('#txtProgAtual').textContent = textoAtualizando(); }
  const b = $('#btnAtualizar'); if (b) b.disabled = !!atualizando;
}
async function iniciarAtualizacao() {
  const u = atualizacao; if (!u || atualizando) return;
  const t = PLATAFORMA.tipo;
  if (t === 'web') { if (abaAtual !== 'atualizacoes' || !$('#corpoConfig')) abrirConfig('atualizacoes'); toast('Rode no terminal: propons-ia --atualizar', 4000); return; }
  if (t === 'ios') {
    let ok = false; try { ok = await PLATAFORMA.abrirLoja(); } catch (e) {}
    if (!ok) PLATAFORMA.abrirLink(`https://github.com/${REPO}/blob/main/docs/instalar-ios.md`);
    return;
  }
  if (daLoja()) { PLATAFORMA.abrirLoja().catch(() => {}); return; }   // a Store atualiza (e assina) o app
  if (!PLATAFORMA.podeAtualizarSozinho) { PLATAFORMA.abrirLink('https://muurxdev.github.io/propons-ia/'); return; }
  if (geracao) { if (!await confirmar('Parar a resposta?', 'A IA está respondendo agora. Atualizar interrompe a resposta.', 'Atualizar')) return; geracao.ctrl.abort(); }
  atualizando = { pct: 0, fase: 'baixando' }; desenharAtualizando();
  try {
    const r = await PLATAFORMA.atualizar(u.versao);
    if (r && r.precisaPermissao) {
      atualizando = null; desenharAtualizando();
      await perguntar('Permita a instalação', '<p>O Android abriu a tela de permissão. Ative <b>Permitir desta fonte</b> para a Própons IA, volte e toque em <b>Atualizar agora</b> de novo.</p>', [['Entendi', true, 'primario']]);
      return;
    }
    atualizando = { pct: 1, fase: 'instalando' }; desenharAtualizando();
  } catch (e) { atualizando = null; desenharAtualizando(); toast('A atualização não terminou (' + e.message + '). Confira a internet e tente de novo em Ajustes → Atualizações.', 6000); }
}
PLATAFORMA.ao('atualizacao', d => {
  if (d.fase === 'erro') { atualizando = null; toast(d.mensagem || 'A atualização não foi concluída.', 5000); }
  else atualizando = d;
  desenharAtualizando();
});

async function atualizarTudo() {
  const ul = $('#listaTudo'), bt = $('#btnTudo'); if (!ul) return;
  bt.disabled = true; bt.lastChild.textContent = 'Procurando…'; ul.innerHTML = '';
  const add = (st, titulo, det) => { const li = document.createElement('li'); li.innerHTML = `<span class="ic">${{ ok: '✅', aviso: '⚠️', erro: '❌', info: 'ℹ️', vai: '⏳' }[st]}</span><div><b>${esc(titulo)}</b>${det ? `<small>${esc(det)}</small>` : ''}</div>`; if ($('#listaTudo')) $('#listaTudo').appendChild(li); return li; };
  const u = await checarAtualizacao();
  add(u === null ? 'aviso' : u ? 'info' : 'ok', 'Aplicativo', u === null ? 'sem internet para verificar' : u ? `versão ${u.versao} disponível` : `versão ${VERSAO} é a mais recente`);
  add('ok', 'Interface e motor da IA', 'vêm dentro do app e são atualizados junto com ele');
  if (PLATAFORMA.tipo !== 'web') {
    const li = add('vai', 'Modelos baixados', 'conferindo os arquivos…');
    verificandoLi = li;
    try {
      const r = await PLATAFORMA.verificarModelos();
      li.remove();
      if (!r || !r.length) add('info', 'Modelos baixados', 'nenhum modelo baixado ainda');
      else r.forEach(x => add(x.ok ? 'ok' : 'erro', x.id ? nomeModelo(x) : x.nome, x.ok ? 'arquivo inteiro e conferido (SHA-256)' : x.apagado ? 'arquivo com defeito: foi apagado. Baixe de novo em Modelos de IA.' : 'arquivo com defeito e em uso: troque de modelo, apague este e baixe de novo.'));
    } catch (e) { li.remove(); add('aviso', 'Modelos baixados', 'não foi possível conferir: ' + e.message); }
    verificandoLi = null;
    lerSistema().then(desenharNav);
  }
  if ($('#btnTudo')) { $('#btnTudo').disabled = false; $('#btnTudo').lastChild.textContent = 'Procurar atualizações'; }
  // versão nova: a página mostra o "Atualizar agora" com as novidades (a lista do que foi conferido continua)
  if (u && abaAtual === 'atualizacoes' && $('#listaTudo')) { const lista = $('#listaTudo').innerHTML; desenharAba(); if ($('#listaTudo')) $('#listaTudo').innerHTML = lista; }
}
let verificandoLi = null;
PLATAFORMA.ao('verificacao', d => { if (verificandoLi && verificandoLi.isConnected) verificandoLi.querySelector('small').textContent = `conferindo ${d.nome}: ${Math.floor((d.pct || 0) * 100)}%`; });

// ao abrir (e a cada 6 h): se houver versão nova, avisa com um diálogo (pode adiar por 1 dia)
async function avisoAutomatico() {
  const u = await checarAtualizacao();
  if (!u || pref('avisarAtualizacao') === 'nao') return;
  if (pref('adiarVersao') === u.versao && +(pref('adiarAte') || 0) > Date.now()) return;
  if (document.querySelector('.dlg-fundo:not(.saindo)') || atualizando) return;
  const v = await perguntar(`Nova versão ${u.versao} disponível`,
    `<p>Você está na ${VERSAO}. Atualize para ter as melhorias e correções mais recentes.</p>${u.notas ? `<div class="notas txt">${md(limparNotas(u.notas))}</div>` : ''}`,
    [['Depois', 'depois', ''], [rotuloAtualizar(), 'sim', 'primario']]);
  if (v === 'sim') { abrirConfig('atualizacoes'); iniciarAtualizacao(); }
  else { pref('adiarVersao', u.versao); pref('adiarAte', String(Date.now() + 86400000)); }
}

/* ---------------- sobre ---------------- */
function abaSobre(c) {
  c.innerHTML = `<div class="cartao"><div class="versao-topo"><div class="marca"></div><div><b>Própons IA</b><small>Versão ${VERSAO} · IA de estudos que roda no seu aparelho</small></div></div></div>
    <div class="botoes" style="margin-bottom:18px"><button class="btn" id="abrirSite">Site para baixar</button><button class="btn" id="abrirRepo">Código no GitHub</button></div>
    <div class="secao"><h4>Privacidade</h4><p class="info">${TEXTO_PRIVACIDADE}</p></div>
    <div class="secao"><h4>Componentes</h4><p class="info">Motor: llama.cpp (MIT) · Modelos: Qwen3.5 (Apache 2.0) · Leitura de PDF: pdf.js (Apache 2.0) · DOCX: mammoth.js (BSD-2)${PLATAFORMA.tipo === 'windows' ? ' · Microsoft WebView2' : ''}.</p></div>`;
  $('#abrirSite').onclick = () => PLATAFORMA.abrirLink('https://muurxdev.github.io/propons-ia/');
  $('#abrirRepo').onclick = () => PLATAFORMA.abrirLink('https://github.com/' + REPO);
}

/* a 1ª vez que uma folha abre, o navegador monta os estilos dela (lento em aparelho fraco): monta uma vez,
   invisível, com o app ocioso, para a abertura de verdade já sair lisa */
function aquecerFolhas() {
  const quando = window.requestIdleCallback || (f => setTimeout(f, 200));
  quando(() => {
    if (document.querySelector('.painel-fundo, .dlg-fundo') || geracao) return;
    // abre os Ajustes e um diálogo de verdade, quase transparentes e sem receber toques, por dois quadros
    const abaAntes = abaAtual;
    abrirConfig(estreita() ? undefined : abaAtual);
    perguntar('Própons IA', '<p>…</p>', [['Ok', 0, 'primario']]);
    menuFlutuante(document.body, [[ICO.renomear, 'Renomear', () => {}], [ICO.apagar, 'Apagar', () => {}, true]], 'Própons IA');
    const folhas = document.querySelectorAll('.painel-fundo, .dlg-fundo, .menu');
    folhas.forEach(f => { f.style.opacity = '0.001'; f.style.pointerEvents = 'none'; f.style.animation = 'none'; f.classList.remove('atras'); if (f.firstChild) f.firstChild.style.animation = 'none'; });
    requestAnimationFrame(() => requestAnimationFrame(() => { folhas.forEach(f => f.remove()); abaAtual = abaAntes; }));
  });
}

