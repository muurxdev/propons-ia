// pedido de código: nunca vira "passo a passo" nem sofre a trava de listas inventadas
const PEDE_CODIGO = /c[oó]digo|codigo|program(a|e|ar)|implement|script|fun[cç][aã]o|classe|algoritmo em|python|java(script)?|\bc\+\+|\bc#|\bhtml\b|\bcss\b|\bsql\b|typescript|\bjs\b|\bts\b|\bgo\b|rust|kotlin|php|ruby|\bc\b(?= |$)/i;

async function enviar(texto){
  texto = texto.trim(); if (!texto || ctrl) return;
  $('#entrada').value = ''; ajustar();
  if (!atual){
    atual = { id: novoId(), titulo: texto.replace(/\s+/g, ' ').slice(0, 48), criada: Date.now(), msgs: [] };
    conversas.unshift(atual); $('#tituloAtual').textContent = atual.titulo;
  } else { conversas = [atual, ...conversas.filter(c => c !== atual)]; }
  addEu(texto);
  atual.msgs.push({ role: 'user', texto, llm: texto });
  desenharLista(); salvar();
  await responder(texto);
}

// gera de novo a última resposta
async function regenerar(){
  if (ctrl || !atual || !atual.msgs.length) return;
  if (atual.msgs[atual.msgs.length - 1].role === 'assistant') atual.msgs.pop();
  const ultimaPergunta = atual.msgs[atual.msgs.length - 1];
  if (!ultimaPergunta || ultimaPergunta.role !== 'user') return;
  // remove da tela tudo o que veio depois da última pergunta
  const col = coluna(), eus = col.querySelectorAll('.msg.eu'), ref = eus[eus.length - 1];
  while (ref && ref.nextSibling) ref.nextSibling.remove();
  await responder(ultimaPergunta.texto);
}

async function responder(texto){
  const pedeCodigo = PEDE_CODIGO.test(texto);

  // algoritmo com lista de números: passo a passo e resumo calculados por código (exatos e instantâneos)
  const tr = pedeCodigo ? null : detectTrace(texto);
  if (tr){
    const titulo = NOMES[tr.alg] + (tr.alg === 'binaria' ? ` · procurando ${tr.val} em ${fmt(tr.lista)}` : ` · ${fmt(tr.lista)}`);
    const passos = { titulo, lista: tr.steps };
    addPassos(titulo, tr.steps);
    const r = resumo(tr.alg, tr.lista, tr.val);
    const msg = { role: 'assistant', texto: r, llm: r, passos };
    atual.msgs.push(msg); addIa(r, null, msg);
    salvar(); desenharLista(); return;
  }
  if (!online){
    const t = 'A IA ainda está carregando. Tente de novo em alguns segundos.';
    const msg = { role: 'assistant', texto: t, llm: t };
    atual.msgs.push(msg); addIa(t, null, msg); salvar(); return;
  }
  const historico = atual.msgs.slice(-7).map(m => ({ role: m.role, content: m.llm }));
  const alvo = addIa(''); alvo.classList.add('digitando');
  $('#enviar').classList.add('gerando'); $('#enviar').disabled = false; $('#enviar').title = 'Parar';
  ctrl = new AbortController(); let out = '', cortou = false;
  const sobreAlgoritmo = !pedeCodigo && /bubble|bolha|sele[cç][aã]o|selection|quick|busca bin|ordena/i.test(texto);
  const foraDeCodigo = s => s.split('```').filter((_, i) => i % 2 === 0).join('\n');
  try{
    const r = await fetch(API + '/v1/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM }, ...historico], stream: true,
        temperature: pedeCodigo ? 0.2 : 0.3, top_p: 0.85, top_k: 20, repeat_penalty: pedeCodigo ? 1.0 : 1.05,
        max_tokens: pedeCodigo ? 3000 : 1200, cache_prompt: true, chat_template_kwargs: { enable_thinking: false } }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    while (true){
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const linhas = buf.split('\n'); buf = linhas.pop();
      for (const ln of linhas){
        if (!ln.startsWith('data:')) continue;
        const d = ln.slice(5).trim(); if (d === '[DONE]') continue;
        try{
          const c = JSON.parse(d).choices?.[0]?.delta?.content;
          if (c){
            out += c;
            if (sobreAlgoritmo && INVENTA.test(foraDeCodigo(out))){ cortou = true; ctrl.abort(); break; }
            alvo.innerHTML = md(out.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')); rolar();
          }
        }catch(e){}
      }
    }
  }catch(e){ if (e.name !== 'AbortError') out += `\n\n*(não foi possível responder: ${e.message})*`; }
  out = out.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  if (cortou){
    const m = INVENTA.exec(out); if (m) out = out.slice(0, out.lastIndexOf('\n', m.index) + 1).trim();
    out += '\n\nPara ver um exemplo com números exatos, me mande a lista. Por exemplo: **bubble sort em [5, 2, 8, 1]**.';
  }
  const msg = { role: 'assistant', texto: out, llm: out };
  atual.msgs.push(msg);
  alvo.parentNode.remove(); addIa(out || '*(sem resposta)*', null, msg);
  $('#enviar').classList.remove('gerando'); $('#enviar').title = 'Enviar'; ctrl = null; ajustar();
  salvar(); desenharLista();
}
