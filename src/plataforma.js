/* ================= PLATAFORMA =================
   A mesma interface roda em 4 lugares; só esta camada muda:
   - windows: WebView2 (window.chrome.webview) + llama-server local (HTTP)
   - android: WebView (window.ProponsAndroid)  + llama-server local (HTTP)
   - ios:     WKWebView (webkit.messageHandlers.propons) + motor dentro do app (ponte nativa)
   - web:     navegador no Linux (sem ponte) + llama-server local (HTTP)
   Protocolo da ponte: a página manda {t:'pedido', id, acao, args}; o app responde chamando
   window.__proponsMsg({t:'resposta', id, ok, dados, erro}) ou manda eventos {t:'evento', nome, dados}. */
const PLATAFORMA = (() => {
  const wv2 = window.chrome && window.chrome.webview;
  const and = window.ProponsAndroid;
  const ios = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.propons;
  const tipo = wv2 ? 'windows' : and ? 'android' : ios ? 'ios' : 'web';
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

  const enviarPonte = obj => {
    if (wv2) wv2.postMessage(obj);
    else if (and) and.pedido(JSON.stringify(obj));
    else if (ios) ios.postMessage(obj);
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
  const base = location.protocol.startsWith('http') ? '' : 'http://127.0.0.1:8765';
  const cab = () => Object.assign({ 'Content-Type': 'application/json' }, chave ? { Authorization: 'Bearer ' + chave } : {});

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
    const t = await fetch(base + '/apply-template', { method: 'POST', signal: sinal, headers: cab(),
      body: JSON.stringify({ messages: mensagens.slice(0, -1), chat_template_kwargs: { enable_thinking: false } }) });
    if (!t.ok) throw await erroHTTP(t);
    const { prompt } = await t.json();
    const r = await fetch(base + '/completion', { method: 'POST', signal: sinal, headers: cab(),
      body: JSON.stringify({ prompt: prompt + parcial, stream: true, n_predict: op.maxTokens, temperature: op.temperatura, top_p: 0.85, top_k: 20,
        repeat_penalty: op.repeticao || 1.05, cache_prompt: true }) });
    if (!r.ok) throw await erroHTTP(r);
    let fim = 'stop', timings = null;
    await lerSSE(r, j => { if (j.content) aoToken(j.content); if (j.stop) { fim = j.stop_type === 'limit' ? 'length' : 'stop'; timings = j.timings || timings; } });
    return { fim, timings };
  }

  /* geração via HTTP (llama-server, compatível com OpenAI, com streaming) */
  async function gerarHTTP(mensagens, op, aoToken, sinal) {
    if (op.continuar && mensagens.length && mensagens[mensagens.length - 1].role === 'assistant') return continuarHTTP(mensagens, op, aoToken, sinal);
    const corpo = { messages: mensagens, stream: true, temperature: op.temperatura, top_p: 0.85, top_k: 20,
      repeat_penalty: op.repeticao || 1.05, max_tokens: op.maxTokens, cache_prompt: true,
      chat_template_kwargs: { enable_thinking: false }, timings_per_token: false };
    const r = await fetch(base + '/v1/chat/completions', { method: 'POST', signal: sinal, headers: cab(), body: JSON.stringify(corpo) });
    if (!r.ok) throw await erroHTTP(r);
    let fim = null, timings = null;
    await lerSSE(r, j => {
      const ch = j.choices && j.choices[0];
      if (ch) { const c = ch.delta && ch.delta.content; if (c) aoToken(c); if (ch.finish_reason) fim = ch.finish_reason; }
      if (j.timings) timings = j.timings;
    });
    return { fim: fim || 'stop', timings };
  }

  /* geração no iOS: tokens chegam pela ponte */
  function gerarNativo(mensagens, op, aoToken, sinal) {
    return new Promise((ok, falha) => {
      const id = ++seq;
      const p = { token: aoToken, ok, falha };
      pendentes.set('g' + id, p);
      pendentes.set(id, { ok: d => { pendentes.delete('g' + id); ok(d || { fim: 'stop' }); }, falha: e => { pendentes.delete('g' + id); falha(e); } });
      if (sinal) sinal.addEventListener('abort', () => enviarPonte({ t: 'pedido', id: ++seq, acao: 'parar', args: { alvo: id } }));
      enviarPonte({ t: 'pedido', id, acao: 'gerar', args: { mensagens, temperatura: op.temperatura, maxTokens: op.maxTokens, continuar: !!op.continuar } });
    });
  }

  return {
    tipo, chave,
    temPonte: tipo !== 'web',
    ao(nome, f) { (ouvintes[nome] = ouvintes[nome] || []).push(f); },
    gerar(mensagens, op, aoToken, sinal) { return tipo === 'ios' ? gerarNativo(mensagens, op, aoToken, sinal) : gerarHTTP(mensagens, op, aoToken, sinal); },
    async saude() {
      if (tipo === 'ios') { try { const s = await pedir('estado', {}, 4000); return !!(s && s.pronto); } catch (e) { return false; } }
      try { const r = await fetch(base + '/health', { cache: 'no-store' }); return r.ok; } catch (e) { return false; }
    },
    async props() {
      if (tipo === 'ios') return pedir('estado');
      const r = await fetch(base + '/props', { headers: cab(), cache: 'no-store' }); return r.ok ? r.json() : null;
    },
    async textoSistema() {
      if (tipo === 'ios') return pedir('conhecimento');
      const r = await fetch('conhecimento.md', { cache: 'no-store' }); return r.ok ? r.text() : '';
    },
    async carregar() {
      if (tipo === 'web') { try { return localStorage.getItem('conversas') || '[]'; } catch (e) { return '[]'; } }
      return pedir('carregar');
    },
    salvar(json) {
      if (tipo === 'web') { try { localStorage.setItem('conversas', json); return Promise.resolve(true); } catch (e) { return Promise.reject(e); } }
      return pedir('salvar', { dados: json });
    },
    async sistema() {
      if (tipo === 'web') { try { const r = await fetch('sistema.json', { cache: 'no-store' }); if (r.ok) return r.json(); } catch (e) {} return null; }
      return pedir('sistema', {}, 15000);
    },
    trocarModelo(id) { return pedir('modelo', { id }, 10000); },
    tema(v) { if (tipo !== 'web') pedir('tema', { v }, 3000).catch(() => {}); },
    abrirLink(url) { if (tipo === 'web' || tipo === 'windows') window.open(url, '_blank', 'noopener'); else pedir('link', { url }, 3000).catch(() => {}); },
    async salvarArquivo(nome, conteudo, tipoMime) {
      if (tipo === 'web') {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([conteudo], { type: tipoMime || 'text/plain' })); a.download = nome;
        document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return true;
      }
      return pedir('salvarArquivo', { nome, conteudo, tipo: tipoMime || 'text/plain' }, 120000);
    },
  };
})();
