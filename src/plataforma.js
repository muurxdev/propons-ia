/* ================= PLATAFORMA =================
   A mesma interface roda em 4 lugares; só esta camada muda:
   - windows: WebView2 (window.chrome.webview) + llama-server local (HTTP)
   - android: WebView (window.ProponsAndroid)  + llama-server local (HTTP)
   - ios:     WKWebView (webkit.messageHandlers.propons) + motor dentro do app (ponte nativa)
   - mac:     WKWebView (webkit.messageHandlers.proponsMac) + llama-server local (HTTP)
   - web:     navegador no Linux (sem ponte) + llama-server local (HTTP)
   Protocolo da ponte: a página manda {t:'pedido', id, acao, args}; o app responde chamando
   window.__proponsMsg({t:'resposta', id, ok, dados, erro}) ou manda eventos {t:'evento', nome, dados}. */
const PLATAFORMA = (() => {
  const wv2 = window.chrome && window.chrome.webview;
  const and = window.ProponsAndroid;
  const mac = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.proponsMac;
  const ios = !mac && window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.propons;
  const tipo = wv2 ? 'windows' : and ? 'android' : mac ? 'mac' : ios ? 'ios' : 'web';
  const pendentes = new Map(), ouvintes = {};
  let seq = 0;

  const receber = m => {
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { return; } }
    if (!m) return;
    if (m.t === 'resposta' && pendentes.has(m.id)) {
      const p = pendentes.get(m.id); pendentes.delete(m.id);
      m.ok ? p.ok(m.dados) : p.falha(new Error(m.erro || 'erro na ponte'));
    } else if (m.t === 'evento') (ouvintes[m.nome] || []).forEach(f => { try { f(m.dados); } catch (e) {} });
    else if (m.t === 'token' && pendentes.has('g' + m.id)) pendentes.get('g' + m.id).token(m.texto);
  };
  window.__proponsMsg = receber;
  if (wv2) wv2.addEventListener('message', e => receber(e.data));
  const emitir = (nome, dados) => (ouvintes[nome] || []).forEach(f => { try { f(dados); } catch (e) {} });

  /* voz de saída (ler em voz alta): Web Speech do próprio WebView (WebView2, WKWebView, Chromium) ou, no Android,
     o TextToSpeech pela ponte (o WebView do Android não tem sintetizador). Cada frase é uma fala com id;
     o evento 'fala' {id, estado: 'fim'|'erro'} avisa quando termina. */
  const temFala = tipo === 'android' ? true : !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
  let vozPt = null, vozesPt = [];
  const acharVozPt = () => { try { const v = speechSynthesis.getVoices(); vozesPt = v.filter(x => /^pt[-_]BR/i.test(x.lang)).concat(v.filter(x => /^pt/i.test(x.lang) && !/^pt[-_]BR/i.test(x.lang))); vozPt = vozesPt[0] || null; } catch (e) {} };
  if (temFala && tipo !== 'android') { acharVozPt(); try { speechSynthesis.onvoiceschanged = acharVozPt; } catch (e) {} }
  function falarWeb(texto, id, op) {
    const u = new SpeechSynthesisUtterance(texto); u.lang = 'pt-BR'; u.rate = 1.05; if (vozPt) u.voice = vozPt;
    // segunda voz (resumo em áudio): outra voz em português, ou a mesma num tom mais grave
    if (op && op.voz === 1) { if (vozesPt[1]) u.voice = vozesPt[1]; else u.pitch = 0.75; }
    u.onstart = () => emitir('fala', { id, estado: 'inicio' });
    // a palavra dita agora (quando a voz informa): a página pinta de roxo no ritmo da fala
    u.onboundary = e => { if (e.name === 'word' || e.name === undefined) emitir('fala', { id, estado: 'palavra', ini: e.charIndex, fim: e.charIndex + (e.charLength || (texto.slice(e.charIndex).match(/^\S+/) || [''])[0].length) }); };
    u.onend = () => emitir('fala', { id, estado: 'fim' });
    u.onerror = e => emitir('fala', { id, estado: /interrupted|canceled/.test(e.error || '') ? 'fim' : 'erro', erro: e.error });
    speechSynthesis.speak(u);
  }

  const enviarPonte = obj => {
    if (wv2) wv2.postMessage(obj);
    else if (and) and.pedido(JSON.stringify(obj));
    else if (mac) mac.postMessage(obj);
    else if (ios) ios.postMessage(obj);
  };
  // bytes -> base64 em pedaços (String.fromCharCode estoura a pilha com arrays grandes)
  const base64De = b => {
    const u = b instanceof Uint8Array ? b : new Uint8Array(b);
    let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
  };
  const pedir = (acao, args = {}, ms = 30000) => new Promise((ok, falha) => {
    if (tipo === 'web') return falha(new Error('sem ponte'));
    const id = ++seq;
    const tempo = setTimeout(() => { if (pendentes.delete(id)) falha(new Error('sem resposta do app')); }, ms);
    pendentes.set(id, { ok: d => { clearTimeout(tempo); ok(d); }, falha: e => { clearTimeout(tempo); falha(e); } });
    enviarPonte({ t: 'pedido', id, acao, args });
  });

  // chave do motor (llama-server --api-key) vem no endereço: #k=...
  const chave = (location.hash.match(/[#&]k=([A-Za-z0-9_-]+)/) || [])[1] || '';
  // a página vem do motor (127.0.0.1) ou, na abertura fria do Windows, do site local propons.local — aí o motor tem endereço próprio
const baseLocal = (location.protocol.startsWith('http') && location.hostname !== 'propons.local') ? '' : 'http://127.0.0.1:8765';
  /* IA de outro aparelho (Ajustes → Modelos → "Usar a IA de outro aparelho"): o celular manda as perguntas para o PC de
     casa (API na rede local da Própons, formato OpenAI, com chave). Guardado só neste aparelho. */
  let remota = null; try { const r = JSON.parse(localStorage.getItem('iaRemota') || 'null'); if (r && r.ligada && /^https?:\/\//.test(r.url)) remota = r; } catch (e) {}
  const usarRemota = () => !!remota;
  const base = () => remota ? remota.url.replace(/\/+$/, '') : baseLocal;
  const cab = () => { const k = remota ? remota.chave : chave; return Object.assign({ 'Content-Type': 'application/json' }, k ? { Authorization: 'Bearer ' + k } : {}); };

  // lê um fluxo SSE do llama-server chamando aoDado(json) para cada evento
  async function lerSSE(r, aoDado) {
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const linhas = buf.split('\n'); buf = linhas.pop();
      for (const ln of linhas) {
        if (!ln.startsWith('data:')) continue;
        const d = ln.slice(5).trim(); if (!d || d === '[DONE]') continue;
        let j; try { j = JSON.parse(d); } catch (e) { continue; }
        if (j.error) throw new Error(j.error.message || String(j.error));
        aoDado(j);
      }
    }
  }
  async function erroHTTP(r) {
    let msg = 'HTTP ' + r.status;
    try { const j = await r.json(); msg = (j.error && (j.error.message || j.error)) || msg; } catch (e) {}
    return new Error(msg);
  }

  /* continuar uma resposta cortada: formata a conversa com o modelo de chat do próprio modelo
     (/apply-template) e continua o texto bruto a partir do ponto exato onde parou (/completion) */
  async function continuarHTTP(mensagens, op, aoToken, sinal) {
    const parcial = mensagens[mensagens.length - 1].content;
    const t = await fetch(base() + '/apply-template', { method: 'POST', signal: sinal, headers: cab(),
      body: JSON.stringify({ messages: mensagens.slice(0, -1).map(m => Array.isArray(m.content) ? { role: m.role, content: m.content.filter(c => c.type === 'text').map(c => c.text).join('\n') } : m), chat_template_kwargs: { enable_thinking: false } }) });
    if (!t.ok) throw await erroHTTP(t);
    const { prompt } = await t.json();
    const r = await fetch(base() + '/completion', { method: 'POST', signal: sinal, headers: cab(),
      body: JSON.stringify({ prompt: prompt + parcial, stream: true, n_predict: op.maxTokens, ...amostragem(op), cache_prompt: true }) });
    if (!r.ok) throw await erroHTTP(r);
    let fim = 'stop', timings = null;
    await lerSSE(r, j => { if (j.content) aoToken(j.content); if (j.stop) { fim = j.stop_type === 'limit' ? 'length' : 'stop'; timings = j.timings || timings; } });
    return { fim, timings };
  }

  /* aquecer: o motor lê de antemão exatamente o começo que a próxima pergunta vai ter (texto de sistema + conversa
     aberta), sem responder nada. O corte é no fim da última mensagem pronta: a próxima pergunta começa ali, então o
     ponto salvo pelo motor serve de verdade (antes o aquecimento terminava num "oi" que a pergunta real não tinha, e o
     modelo híbrido relia tudo). O começo é achado formatando a conversa duas vezes com perguntas diferentes. */
  async function aquecerHTTP(mensagens, sinal) {
    const soTexto = mensagens.map(m => Array.isArray(m.content) ? { role: m.role, content: m.content.filter(c => c.type === 'text').map(c => c.text).join('\n') } : m);
    const formatar = async u => {
      const r = await fetch(base() + '/apply-template', { method: 'POST', signal: sinal, headers: cab(), body: JSON.stringify({ messages: soTexto.concat({ role: 'user', content: u }) }) });
      if (!r.ok) throw await erroHTTP(r);
      return (await r.json()).prompt || '';
    };
    const [a, b] = await Promise.all([formatar('a1'), formatar('b2')]);
    let n = 0; while (n < a.length && a[n] === b[n]) n++;
    const corte = a.lastIndexOf('<|', n - 1);   // antes da marca que abre a pergunta (tokens especiais nunca se juntam ao texto)
    if (corte <= 0) return false;
    const r = await fetch(base() + '/completion', { method: 'POST', signal: sinal, headers: cab(),
      body: JSON.stringify({ prompt: a.slice(0, corte), n_predict: 1, stream: true, cache_prompt: true, temperature: 0 }) });
    if (!r.ok) throw await erroHTTP(r);
    await lerSSE(r, () => {});
    return true;
  }

  /* amostragem: semente nova a cada pedido (a mesma pergunta não cai sempre no mesmo texto) e os valores
     recomendados para o Qwen3.5; em texto livre, DRY (não repetir trechos) e XTC (mais variedade). Em código e contas
     (op.exato) só temperatura baixa e semente. */
  function amostragem(op) {
    const a = { temperature: op.temperatura, top_k: 20, top_p: 0.95, min_p: 0.02, repeat_penalty: op.repeticao || 1.05, seed: Math.floor(Math.random() * 2147483647) };
    if (!op.exato) Object.assign(a, { dry_multiplier: 0.8, dry_base: 1.75, dry_allowed_length: 2, xtc_probability: 0.3, xtc_threshold: 0.1 });
    return a;
  }

  /* geração via HTTP (llama-server, compatível com OpenAI, com streaming) */
  async function gerarHTTP(mensagens, op, aoToken, sinal) {
    if (op.continuar && mensagens.length && mensagens[mensagens.length - 1].role === 'assistant') return continuarHTTP(mensagens, op, aoToken, sinal);
    // op.pensar (Esforço Alto): o modelo raciocina antes de responder; o raciocínio chega em reasoning_content (op.aoPensar)
    const corpo = { messages: mensagens, stream: true, ...amostragem(op), max_tokens: op.maxTokens, cache_prompt: true,
      chat_template_kwargs: { enable_thinking: !!op.pensar }, timings_per_token: false };
    // modos de estudo: a resposta segue um esquema JSON (o motor força pela gramática — nunca vem JSON quebrado)
    if (op.esquema) corpo.response_format = { type: 'json_schema', json_schema: { name: 'resposta', schema: op.esquema } };
    const r = await fetch(base() + '/v1/chat/completions', { method: 'POST', signal: sinal, headers: cab(), body: JSON.stringify(corpo) });
    if (!r.ok) throw await erroHTTP(r);
    let fim = null, timings = null;
    await lerSSE(r, j => {
      const ch = j.choices && j.choices[0];
      if (ch) { const c = ch.delta && ch.delta.content; if (c) aoToken(c); const p = ch.delta && ch.delta.reasoning_content; if (p && op.aoPensar) op.aoPensar(p); if (ch.finish_reason) fim = ch.finish_reason; }
      if (j.timings) timings = j.timings;
    });
    return { fim: fim || 'stop', timings };
  }

  /* geração no iOS: tokens chegam pela ponte */
  function gerarNativo(mensagens, op, aoToken, sinal) {
    return new Promise((ok, falha) => {
      const id = ++seq; let vigia = 0, acabou = false;
      // vigia: se o motor morrer no meio, nenhum token em 90 s (ou 2 s depois de pedir para parar) encerra o pedido
      // aqui mesmo — sem isso `geracao` ficaria travado para sempre
      const fim = (f, v) => { if (acabou) return; acabou = true; clearTimeout(vigia); pendentes.delete('g' + id); pendentes.delete(id); f(v); };
      const armar = ms => { clearTimeout(vigia); vigia = setTimeout(() => fim(sinal && sinal.aborted ? ok : falha, sinal && sinal.aborted ? { fim: 'stop' } : new Error('A IA parou de responder.')), ms); };
      pendentes.set('g' + id, { token: t => { armar(90000); aoToken(t); }, ok: d => fim(ok, d || { fim: 'stop' }), falha: e => fim(falha, e) });
      pendentes.set(id, { ok: d => fim(ok, d || { fim: 'stop' }), falha: e => fim(falha, e) });
      if (sinal) sinal.addEventListener('abort', () => { if (acabou) return; enviarPonte({ t: 'pedido', id: ++seq, acao: 'parar', args: { alvo: id } }); armar(2000); });
      armar(90000);
      enviarPonte({ t: 'pedido', id, acao: 'gerar', args: { mensagens, temperatura: op.temperatura, maxTokens: op.maxTokens, continuar: !!op.continuar } });
    });
  }

  /* IndexedDB mínimo (chave → valor), usado só no Linux/web */
  const idb = {
    abrir() { return new Promise((ok, falha) => { if (!window.indexedDB) return falha(new Error('sem IndexedDB')); const p = indexedDB.open('propons', 1); p.onupgradeneeded = () => p.result.createObjectStore('kv'); p.onsuccess = () => ok(p.result); p.onerror = () => falha(p.error); }); },
    async get(k) { const db = await this.abrir(); try { return await new Promise((ok, falha) => { const r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); }); } finally { db.close(); } },
    async set(k, v) { const db = await this.abrir(); try { return await new Promise((ok, falha) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = () => ok(true); t.onerror = () => falha(t.error); }); } finally { db.close(); } },
  };

  return {
    tipo, chave,
    ao(nome, f) { (ouvintes[nome] = ouvintes[nome] || []).push(f); },
    gerar(mensagens, op, aoToken, sinal) { return tipo === 'ios' && !remota ? gerarNativo(mensagens, op, aoToken, sinal) : gerarHTTP(mensagens, op, aoToken, sinal); },
    // sem o /apply-template (iOS, motor embutido) não há como aquecer só o começo: não faz nada
    aquecer(mensagens, sinal) { return tipo === 'ios' && !remota ? Promise.resolve(false) : aquecerHTTP(mensagens, sinal); },
    // IA de outro aparelho: { url, chave, ligada } (guardada neste aparelho); testar confere se responde e com qual modelo
    get remota() { return remota; },
    usarRemota,
    definirRemota(r) { try { if (r && r.ligada) localStorage.setItem('iaRemota', JSON.stringify(r)); else localStorage.removeItem('iaRemota'); } catch (e) {} },
    async testarRemota(url, chaveR) {
      const u = String(url || '').trim().replace(/\/+$/, ''), h = chaveR ? { Authorization: 'Bearer ' + chaveR } : {};
      // prazo curto: endereço errado ou firewall que descarta não pode deixar o botão esperando para sempre
      const s = await fetch(u + '/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) }); if (!s.ok) throw new Error('o aparelho respondeu HTTP ' + s.status);
      const r = await fetch(u + '/v1/models', { headers: h, cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (r.status === 401) throw new Error('chave errada');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json(); const m = j && j.data && j.data[0] && j.data[0].id;
      return String(m || 'modelo').split(/[\\/]/).pop().replace(/\.gguf$/i, '');
    },
    async saude() {
      if (tipo === 'ios' && !remota) { try { const s = await pedir('estado', {}, 4000); return !!(s && s.pronto); } catch (e) { return false; } }
      try { const r = await fetch(base() + '/health', { cache: 'no-store' }); return r.ok; } catch (e) { return false; }
    },
    async props() {
      if (tipo === 'ios' && !remota) return pedir('estado');
      const r = await fetch(base() + '/props', { headers: cab(), cache: 'no-store' }); return r.ok ? r.json() : null;
    },
    // quantos tokens um texto ocupa de verdade (o tokenizador do próprio modelo); null quando não dá (iOS, motor fora)
    async contarTokens(texto) {
      if (tipo === 'ios' && !remota) return null;
      try {
        const r = await fetch(base() + '/tokenize', { method: 'POST', headers: cab(), body: JSON.stringify({ content: texto }) });
        if (!r.ok) return null;
        const j = await r.json(); return Array.isArray(j.tokens) ? j.tokens.length : null;
      } catch (e) { return null; }
    },
    async textoSistema() {
      if (tipo === 'ios') return pedir('conhecimento');
      // o motor exige a chave também para os arquivos estáticos (menos o index.html)
      const r = await fetch('conhecimento.md', { cache: 'no-store', headers: cab() }); return r.ok ? r.text() : '';
    },
    async carregar() {
      if (tipo === 'web') {
        // Linux: histórico em IndexedDB (o localStorage tem cota de ~5 MB e estourava com as miniaturas); migra o antigo
        try {
          const v = await idb.get('conversas'); if (v != null) return v;
          const antigo = localStorage.getItem('conversas');
          if (antigo) { await idb.set('conversas', antigo); localStorage.removeItem('conversas'); return antigo; }
          return '[]';
        } catch (e) {}
        try { return localStorage.getItem('conversas') || '[]'; } catch (e) { return '[]'; }
      }
      return pedir('carregar');
    },
    salvar(json) {
      if (tipo === 'web') return idb.set('conversas', json).catch(() => { localStorage.setItem('conversas', json); return true; });
      return pedir('salvar', { dados: json });
    },
    async sistema() {
      if (tipo === 'web') { try { const r = await fetch('sistema.json', { cache: 'no-store' }); if (r.ok) return r.json(); } catch (e) {} return null; }
      return pedir('sistema', {}, 15000);
    },
    trocarModelo(id) { return pedir('modelo', { id }, 10000); },
    // primeira abertura: a pessoa escolhe o modelo; o app baixa, liga a IA e abre o chat
    escolherModelo(id) { return pedir('escolherModelo', { id }, 10000); },
    // ler fotos (módulo de visão): Windows, Android e Linux (no Linux, pelo comando propons-ia --visao)
    temVisao: tipo !== 'ios',
    ligarVisao(ligar) { return pedir('visao', { ligar: !!ligar }, 10000); },
    apagarVisao(id) { return pedir('apagarVisao', { id }, 15000); },
    // aviso do sistema quando a resposta fica pronta com a janela em segundo plano (cada app decide se mostra)
    notificar(titulo, texto) {
      if (tipo === 'web') {   // Linux: notificação do próprio navegador (pede permissão na 1ª vez)
        try {
          if (!('Notification' in window)) return Promise.resolve(false);
          const mostrar = () => new Notification(titulo, { body: texto, tag: 'propons-resposta', icon: 'propons-ia.png' });
          if (Notification.permission === 'granted') mostrar();
          else if (Notification.permission !== 'denied') Notification.requestPermission().then(p => { if (p === 'granted') mostrar(); });
        } catch (e) {}
        return Promise.resolve(true);
      }
      return pedir('notificar', { titulo, texto }, 8000).catch(() => false);
    },
    // ler em voz alta
    temFala,
    falar(texto, id, op) { if (tipo === 'android') return pedir('falar', { texto, id, tom: op && op.voz === 1 ? 0.8 : 1 }, 5000); try { falarWeb(texto, id, op); } catch (e) { emitir('fala', { id, estado: 'erro', erro: e.message }); } return Promise.resolve(true); },
    pararFala() { if (tipo === 'android') return pedir('pararFala', {}, 5000).catch(() => {}); try { speechSynthesis.cancel(); } catch (e) {} return Promise.resolve(true); },
    // permissão negada: abre as configurações do app no sistema (Android, iPhone, Mac, Windows)
    podeAbrirConfig: tipo !== 'web',
    // pede uma permissão ao sistema na hora (hoje: notificações). true = permitida, false = negada, null = não se sabe
    async pedirPermissao(recurso) {
      if (tipo === 'android') return pedir('pedirPermissao', { recurso }, 60000);
      if (recurso === 'notificacao' && tipo === 'web') { try { return (await Notification.requestPermission()) === 'granted'; } catch (e) { return null; } }
      // Windows, Mac e iPhone perguntam na primeira notificação: manda uma de teste
      if (recurso === 'notificacao') { await this.notificar('Própons IA', 'Pronto: é assim que eu aviso quando a resposta fica pronta.'); return null; }
      return null;
    },
    abrirConfigApp(recurso) { return pedir('abrirConfig', { recurso }, 5000); },
    // aceleração por GPU (Windows): módulo Vulkan baixado sob demanda; ligar/desligar religa o motor
    baixarGpu() { return pedir('baixarGpu', {}, 10000); },
    ligarGpu(ligar) { return pedir('ligarGpu', { ligar: !!ligar }, 240000); },
    apagarGpu() { return pedir('apagarGpu', {}, 240000); },
    // API na rede local (Windows): o motor passa a escutar em todas as interfaces (religa) — com a mesma chave
    ligarApi(ligar) { return pedir('ligarApi', { ligar: !!ligar }, 240000); },
    // gerenciar modelos (Windows, Android, iOS; no Linux é pelo comando propons-ia)
    baixarModelo(id) { return pedir('baixarModelo', { id }, 10000); },
    cancelarDownload(id) { return pedir('cancelarDownload', { id }, 5000); },
    apagarModelo(id) { return pedir('apagarModelo', { id }, 15000); },
    verificarModelos() { return pedir('verificarModelos', {}, 30 * 60000); },
    // atualização do app: Windows e Android baixam, conferem (SHA-256) e instalam; iOS abre o SideStore/AltStore
    podeAtualizarSozinho: tipo === 'windows' || tipo === 'android' || tipo === 'mac',
    atualizar(versao) { return pedir('atualizar', { versao }, 60 * 60000); },
    abrirLoja() { return pedir('abrirLoja', {}, 5000); },
    // IA respondendo: o app mantém o aparelho acordado (tela apagada no celular, suspensão no PC)
    ocupado(sim) { if (tipo === 'android' || tipo === 'windows' || tipo === 'mac') pedir('ocupado', { sim: !!sim }, 3000).catch(() => {}); },
    podeCompartilhar: tipo === 'android' || tipo === 'ios',
    // transcrever áudio: a página manda o áudio em partes (base64) e o app roda o whisper (no iPhone, o reconhecimento de voz do iOS)
    temTranscricao: tipo === 'windows' || tipo === 'android' || tipo === 'ios' || tipo === 'mac',
    // Linux: o endereço (secreto) do whisper-server vem no # da página, junto com a chave do motor
    urlTranscricao: decodeURIComponent((location.hash.match(/[#&]voz=([^&]+)/) || [])[1] || ''),
    async transcrever(bytes, ext, aoEnviar, sinal) {
      if (tipo === 'web') {   // Linux: whisper-server local num endereço secreto (vem no # da página)
        if (!this.urlTranscricao) throw new Error('transcrição desligada: rode propons-ia --voz');
        const f = new FormData();
        f.append('file', new Blob([bytes], { type: 'audio/wav' }), 'audio.wav'); f.append('response_format', 'json'); f.append('language', 'pt');
        if (aoEnviar) aoEnviar(1);
        const r = await fetch(this.urlTranscricao, { method: 'POST', body: f, signal: sinal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json(); return { texto: String(j.text || '').replace(/\s*\n\s*/g, ' ').trim() };
      }
      const id = await pedir('audioInicio', { ext: ext || 'wav' }, 10000);
      const PARTE = 768 * 1024;
      for (let i = 0; i < bytes.length; i += PARTE) {
        const pedaco = bytes.subarray(i, i + PARTE);
        let bin = ''; for (let j = 0; j < pedaco.length; j += 0x8000) bin += String.fromCharCode.apply(null, pedaco.subarray(j, j + 0x8000));
        await pedir('audioParte', { id, dados: btoa(bin) }, 60000);
        if (aoEnviar) aoEnviar(Math.min(1, (i + PARTE) / bytes.length));
      }
      return pedir('transcrever', { id }, 60 * 60000);
    },
    baixarVoz(id) { return pedir('baixarVoz', { id }, 10000); },
    usarVoz(id) { return pedir('usarVoz', { id }, 5000); },
    apagarVoz(id) { return pedir('apagarVoz', { id }, 15000); },
    compartilhar(texto) { return pedir('compartilhar', { texto }, 60000); },
    // Área de código → Rodar (só o app do Windows por enquanto): { arquivos:[{nome,conteudo}], principal, entrada }
    podeRodar: tipo === 'windows',
    rodarCodigo(d) { return pedir('rodarCodigo', d, 60000); },
    // o que chegou de outro app pelo "compartilhar" do sistema (Android): { texto?, imagem? (data: URL), nome? } ou null
    pegarCompartilhado() { return tipo === 'android' ? pedir('compartilhado', {}, 10000) : Promise.resolve(null); },
    tema(v) { if (tipo !== 'web') pedir('tema', { v }, 3000).catch(() => {}); },
    // pesquisa na internet: o app baixa a página por nós (a janela web não lê sites de fora)
    temBusca: tipo !== 'web',
    buscarPagina: url => pedir('buscar', { url }, 25000),
    abrirLink(url) { if (tipo === 'web' || tipo === 'windows') window.open(url, '_blank', 'noopener'); else pedir('link', { url }, 3000).catch(() => {}); },   // android/ios/mac: o app abre no navegador
    // conteudo pode ser texto ou bytes (Uint8Array/ArrayBuffer) — para os hosts os bytes vão em base64
    async salvarArquivo(nome, conteudo, tipoMime) {
      if (tipo === 'web') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([conteudo], { type: tipoMime || 'text/plain' })); a.download = nome;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return true;
      }
      const bytes = typeof conteudo !== 'string';
      return pedir('salvarArquivo', { nome, conteudo: bytes ? base64De(conteudo) : conteudo, base64: bytes, tipo: tipoMime || 'text/plain' }, 120000);
    },
  };
})();
