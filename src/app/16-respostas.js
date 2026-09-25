/* ---------------- Ajustes → Respostas: como a IA responde para você ----------------
   Instruções próprias, tamanho das respostas, nível de estudo, esforço de cada modelo, compactar sozinho e Enter.
   Tudo fica no aparelho e entra no texto de sistema (a bolinha de contexto conta como "Instruções da Própons"). */
ICO.respostas = '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>';
ICO.ajuda = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><circle cx="12" cy="16.3" r=".6" fill="currentColor"/></svg>';
const TAMANHOS_RESPOSTA = [['curtas', 'Curtas'], ['normais', 'Normais'], ['detalhadas', 'Detalhadas']];
const NIVEIS_ESTUDO = [['livre', 'Não dizer'], ['fundamental', 'Fundamental'], ['medio', 'Ensino médio'], ['enem', 'ENEM e vestibular'], ['faculdade', 'Faculdade']];
function textoPreferencias() {
  const t = pref('tamanhoResposta') || 'normais', n = pref('nivelEstudo') || 'livre', inst = String(pref('instrucoes') || '').trim();
  let s = '';
  if (t === 'curtas') s += '\n\nPrefira respostas curtas e diretas (poucas linhas), a não ser que a pessoa peça mais.';
  if (t === 'detalhadas') s += '\n\nPrefira respostas completas: explique o porquê, dê um exemplo e termine com um resumo curto.';
  if (n !== 'livre') s += '\n\nQuem estuda está no nível: ' + (NIVEIS_ESTUDO.find(x => x[0] === n) || [, n])[1] + '. Ajuste a linguagem, os exemplos e a profundidade a esse nível.';
  if (inst) s += '\n\nInstruções de quem estuda (siga sempre que não contrariarem as regras acima):\n' + inst.slice(0, 1500);
  return s;
}
const enterEnvia = () => (pref('enterEnvia') || (CELULAR ? 'nao' : 'sim')) === 'sim';
const compactaSozinho = () => (pref('autoCompactar') || 'sim') === 'sim';

function abaRespostas(c) {
  const modelos = ((sistemaCache && sistemaCache.modelos) || Object.keys(NOME_MODELO).map(id => ({ id }))).filter(m => NOME_MODELO[m.id]);
  c.innerHTML = `<div class="secao"><h4>Instruções para a IA</h4>
      <textarea class="campo-texto instrucoes" id="instrucoes" rows="4" maxlength="1500" placeholder="Ex.: sou do 3º ano, quero exemplos do dia a dia e as fórmulas sempre no fim.">${esc(pref('instrucoes') || '')}</textarea>
      <p class="info"><span id="instrucoesConta"></span> Vale para todas as conversas, em todos os modelos.</p></div>
    <div class="secao"><h4>Tamanho das respostas</h4>${seg('tamanhoResposta', TAMANHOS_RESPOSTA, pref('tamanhoResposta') || 'normais')}</div>
    <div class="secao"><h4>Seu nível de estudo</h4>${seg('nivelEstudo', NIVEIS_ESTUDO, pref('nivelEstudo') || 'livre')}</div>
    <div class="secao"><h4>Esforço de cada modelo</h4>${modelos.map(m => `<div class="linha-esforco"><b>${esc(nomeModelo(m))}</b>${seg('esforco-' + m.id, esforcosDe(m.id).map(k => [k, ESFORCO[k][0]]), esforcoDe(m.id))}</div>`).join('')}
      <p class="info">O mesmo que a etiqueta ao lado do nome do modelo na caixa. Cada modelo mostra só os níveis que usa de verdade.</p></div>
    <div class="secao"><h4>Compactar sozinho</h4>${seg('autoCompactar', [['sim', 'Sim'], ['nao', 'Não']], compactaSozinho() ? 'sim' : 'nao')}
      <p class="info">Quando a conversa enche a memória da IA, as mensagens antigas viram um resumo antes da próxima resposta (continuam na tela).</p></div>
    <div class="secao"><h4>Sugestões no fim da resposta</h4>${seg('sugestoes', [['sim', 'Mostrar'], ['nao', 'Não']], querSugestoes() ? 'sim' : 'nao')}
      <p class="info">Três perguntas curtas para continuar o assunto; tocar manda a pergunta. A IA gasta alguns segundos a mais depois de cada resposta.</p></div>
    <div class="secao"><h4>Lugar, hora e clima</h4>${seg('dadosLugar', [['sim', 'Usar dados reais'], ['nao', 'Não']], usarDadosLugar() ? 'sim' : 'nao')}
      <p class="info">Em perguntas como "que horas são em Londres?" ou "vai chover aqui?", o app pega a hora, a sua localização (o aparelho pede a permissão) e o clima de verdade antes de responder. Só vai para a internet o nome da cidade ou as coordenadas.</p></div>
    <div class="secao"><h4>Enter envia</h4>${seg('enterEnvia', [['sim', 'Sim'], ['nao', 'Não, quebra a linha']], enterEnvia() ? 'sim' : 'nao')}
      <p class="info">${CELULAR ? 'No celular o padrão é Enter quebrar a linha e a seta enviar.' : 'Shift+Enter sempre quebra a linha.'}</p></div>`;
  const ta = c.querySelector('#instrucoes'), conta = c.querySelector('#instrucoesConta');
  const mostrarConta = () => { conta.textContent = `${ta.value.length}/1500 caracteres.`; };
  let tGuardar = 0; mostrarConta();
  ta.oninput = () => { mostrarConta(); clearTimeout(tGuardar); tGuardar = setTimeout(() => { pref('instrucoes', ta.value.trim()); atualizarMedidor(); }, 400); };
  ta.onblur = () => { pref('instrucoes', ta.value.trim()); atualizarMedidor(); };
  ligarSeg(c, 'tamanhoResposta', v => pref('tamanhoResposta', v));
  ligarSeg(c, 'nivelEstudo', v => pref('nivelEstudo', v));
  ligarSeg(c, 'autoCompactar', v => pref('autoCompactar', v));
  ligarSeg(c, 'dadosLugar', v => pref('dadosLugar', v));
  ligarSeg(c, 'sugestoes', v => { pref('sugestoes', v); if (v === 'nao') pararSugestoes(); });
  ligarSeg(c, 'enterEnvia', v => { pref('enterEnvia', v); $('#entrada').setAttribute('enterkeyhint', v === 'sim' ? 'send' : 'enter'); });
  modelos.forEach(m => ligarSeg(c, 'esforco-' + m.id, v => { definirEsforco(m.id, v); atualizarSeletorModelo(); }));
}
// antes de responder: se a conversa já não cabe na memória da IA, compacta primeiro (o começo vira um resumo)
async function compactarSeCheia(conv, aoPasso) {
  if (!compactaSozinho() || !conv || !online) return;
  const u = montarHistorico(conv, Math.min(1500, Math.floor(nCtx * 0.45)), SYSTEM + textoMemoria() + textoPreferencias() + textoResumo(conv)).uso;
  const cheia = u.omitidas > 0 || (u.sistema + u.historico + u.anexos) / Math.max(1, u.total - u.reserva) > 0.9;
  if (!cheia || conv.msgs.filter(m => !m.interno && !m.compactada).length <= 6) return false;
  if (aoPasso) aoPasso();
  return compactarConversa(conv, true);
}

/* ---------------- ajuda (!) : um balão pequeno explicando o módulo, a seção ou o modelo ---------------- */
const AJUDA = {
  // módulos
  'm:modelo': ['Modelos de IA', 'Os "cérebros" da Própons, que rodam no seu aparelho. Lume é o mais leve e rápido; Aurora equilibra velocidade e qualidade; Ápice acerta mais e pede mais memória. Baixe uma vez e use sem internet.'],
  'm:respostas': ['Respostas', 'Como a IA responde para você: instruções próprias, tamanho, seu nível de estudo e o esforço de cada modelo. Vale para todas as conversas.'],
  'm:atualizacoes': ['Atualizações', 'Versões novas do app e dos componentes (motor da IA, leitura de fotos, transcrição). O app confere sozinho e avisa; nada é instalado sem você tocar.'],
  'm:geral': ['Aparência', 'Tema, tamanho da letra, leitura em voz alta e o aviso quando a resposta fica pronta.'],
  'm:conversas': ['Conversas', 'Backup (exportar e importar tudo num arquivo) e limpeza. As conversas ficam só neste aparelho.'],
  'm:estudo': ['Estudo', 'Seus flashcards (com revisão espaçada: cada cartão volta no dia certo), quizzes e redações corrigidas.'],
  'm:memoria': ['Memória', 'O que a IA sabe sobre você, porque você pediu ("lembre que eu faço o ENEM"). Entra em todas as conversas; apague o que quiser.'],
  'm:diagnostico': ['Diagnóstico', 'Mede memória, processador, espaço e a velocidade real da IA, e gera um relatório para copiar se algo der errado.'],
  'm:sobre': ['Sobre', 'Versão, licença e como a Própons é feita: código aberto, sem conta, tudo no seu aparelho.'],
  // seções
  'Tema': ['Tema', '"Sistema" segue o claro ou escuro do aparelho; os outros fixam um dos dois.'],
  'Tamanho da letra': ['Tamanho da letra', 'Muda o texto das conversas. Os menus continuam do mesmo tamanho.'],
  'Ler em voz alta': ['Ler em voz alta', 'Usa a voz do próprio aparelho, sem internet. Em "Toda resposta", a leitura começa enquanto a IA ainda escreve.'],
  'Sugestões no fim da resposta': ['Sugestões', 'Depois de cada resposta a IA sugere três perguntas para você aprofundar o assunto, como nos apps de chat. Desligue para economizar bateria no celular.'],
  'Lugar, hora e clima': ['Lugar, hora e clima', 'A IA não sabe a hora nem o tempo lá fora: o app busca os números reais (fuso oficial, localização do aparelho, Open-Meteo) e ela só explica. Aparece um cartão com o lugar, latitude/longitude e de onde veio cada dado.'],
  'Avisar quando ficar pronto': ['Avisar quando ficar pronto', 'Se você sair do app enquanto a IA responde, chega uma notificação quando terminar.'],
  'Instruções para a IA': ['Instruções para a IA', 'Um recado fixo que a IA lê antes de toda resposta: como explicar, que exemplos usar, o que evitar. Não precisa repetir em cada conversa.'],
  'Tamanho das respostas': ['Tamanho das respostas', 'Curtas: direto ao ponto. Detalhadas: explica o porquê, dá exemplo e resume no fim. Pedir na conversa sempre vale mais que isto.'],
  'Seu nível de estudo': ['Seu nível de estudo', 'A IA ajusta a linguagem e a profundidade: no Fundamental explica do zero; na Faculdade vai direto ao técnico.'],
  'Esforço de cada modelo': ['Esforço', 'Baixo responde rápido e curto. Médio equilibra. Alto raciocina antes de responder (acerta bem mais contas e armadilhas, demora mais). Auto raciocina só quando a pergunta pede.'],
  'Compactar sozinho': ['Compactar sozinho', 'A memória da IA tem limite (a bolinha ao lado do microfone mostra quanto já foi usado). Cheia, as mensagens antigas viram um resumo para a IA não esquecer o assunto.'],
  'Enter envia': ['Enter envia', 'Liga ou desliga o envio com a tecla Enter.'],
  'Aceleração por GPU': ['Placa de vídeo', 'Com uma placa de vídeo, a IA pode responder várias vezes mais rápido. A Própons mede processador e placa e usa o mais rápido; se a placa falhar, volta para o processador sozinha.'],
  'API na rede local': ['API na rede local', 'Deixa outros aparelhos da sua rede (outro PC, um script) usarem esta IA, no formato da OpenAI e com chave. Desligada, nada fora deste aparelho fala com ela.'],
  'Transcrição de áudio': ['Transcrição de áudio', 'Transforma sua voz em texto no próprio aparelho (whisper.cpp). A voz Base é rápida; a Small erra menos e é mais lenta.'],
  'Armazenamento': ['Armazenamento', 'Quanto os modelos ocupam e quanto espaço e memória o aparelho tem.'],
  'Fotos': ['Fotos', 'O módulo de visão deixa a IA ler fotos e prints. É baixado na primeira foto e fica guardado.'],
  'Backup': ['Backup', 'Guarda todas as conversas num arquivo (.json) para levar a outro aparelho ou guardar. Importar junta com as que já existem.'],
  'Limpeza': ['Limpeza', 'Apaga conversas deste aparelho. Conversas fixadas não saem.'],
  'Privacidade': ['Privacidade', 'Tudo fica no aparelho. A internet só é usada para baixar o app e os modelos e, se você ligar, para a pesquisa na internet.'],
  'Automático': ['Atualização automática', 'Confere de tempos em tempos se há versão nova e avisa com um ponto em Ajustes.'],
  'Atualizar tudo': ['Atualizar tudo', 'Baixa e instala de uma vez o app e os componentes que tiverem versão nova.'],
  'Componentes': ['Componentes', 'Peças que a Própons usa por dentro: o motor da IA, a leitura de fotos e a transcrição.'],
  'Gestos': ['Gestos', 'Atalhos com o dedo no celular.'],
  'Atalhos': ['Atalhos', 'Atalhos de teclado no computador.'],
  'Baralho': ['Baralho', 'Cartões de flashcards guardados. A revisão espaçada traz de volta cada cartão no dia em que você está para esquecer.'],
  'Flashcards': ['Flashcards', 'Peça pelo "+" → Modos de estudo → Flashcards, sobre um assunto ou um arquivo.'],
  'Quizzes': ['Quizzes', 'Perguntas de múltipla escolha com correção comentada.'],
  // modelos
  'modelo:leve': ['Própons Lume', 'O mais leve (Qwen3.5 0.8B, ~0,5 GB). Roda em quase qualquer aparelho e responde em menos de 1 s. Sem pensar acerta 46 % do placar; no Auto, 55 %; pensando, 65 %. Bom para dúvidas rápidas.'],
  'modelo:normal': ['Própons Aurora', 'O equilibrado (Qwen3.5 2B, ~1,3 GB). Acerta 65 % sem pensar e 83 % pensando. Bom para o dia a dia de estudo.'],
  'modelo:avancado': ['Própons Ápice', 'O mais inteligente dos três (Qwen3.5 4B, ~2,7 GB): acerta 88 % mesmo sem pensar e inventa menos. Pede 8 GB de RAM no PC e 12 GB no celular.'],
};
function abrirBalao(botao, chave) {
  fecharBalao();
  const [titulo, texto] = AJUDA[chave] || [];
  if (!texto) return;
  const b = document.createElement('div'); b.className = 'balao'; b.setAttribute('role', 'tooltip');
  b.innerHTML = `<b>${esc(titulo)}</b><p>${esc(texto)}</p>`;
  document.body.appendChild(b);
  const r = botao.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
  b.style.width = w + 'px';
  b.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2)) + 'px';
  const embaixo = r.bottom + 8 + b.offsetHeight < innerHeight - 12;
  b.style.top = (embaixo ? r.bottom + 8 : r.top - 8 - b.offsetHeight) + 'px';
  b.classList.add(embaixo ? 'baixo' : 'cima');
  botao.setAttribute('aria-expanded', 'true'); b._botao = botao;
  requestAnimationFrame(() => b.classList.add('visivel'));
}
function fecharBalao() { document.querySelectorAll('.balao').forEach(b => { if (b._botao) b._botao.setAttribute('aria-expanded', 'false'); b.remove(); }); }
const botaoAjuda = chave => AJUDA[chave] ? `<button type="button" class="ajuda" data-ajuda="${esc(chave)}" aria-label="O que é: ${esc(AJUDA[chave][0])}" aria-expanded="false">${ICO.ajuda}</button>` : '';
document.addEventListener('click', e => {
  const a = e.target.closest('[data-ajuda]');
  if (a) { e.preventDefault(); e.stopPropagation(); if (a.getAttribute('aria-expanded') === 'true') fecharBalao(); else abrirBalao(a, a.dataset.ajuda); return; }
  if (!e.target.closest('.balao')) fecharBalao();
}, true);
addEventListener('keydown', e => { if (e.key === 'Escape') fecharBalao(); });
addEventListener('scroll', fecharBalao, true);
// depois de desenhar uma página dos Ajustes: (!) ao lado de cada seção que tem explicação, e entrada suave dos blocos
function enfeitarPagina(c, animar) {
  c.querySelectorAll('.secao > h4').forEach(h => { const k = h.textContent.trim(); if (AJUDA[k] && !h.querySelector('.ajuda')) h.insertAdjacentHTML('beforeend', botaoAjuda(k)); });
  if (animar) entradaSuave([...c.children]);
}
// entrada suave: cada bloco aparece um pouquinho depois do anterior (subindo 6 px), como nos apps do sistema
function entradaSuave(els) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  els.slice(0, 14).forEach((el, i) => { el.style.setProperty('--i', i); el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); });
}
