/* ---------------- falar: gravar e transcrever (qualquer tamanho) ----------------
   Áudio longo é cortado em trechos (nos silêncios) e transcrito um por um; áudio curtinho ganha silêncio
   em volta, porque o whisper ignora trechos com menos de 1 segundo. */
const TRECHO = PLATAFORMA.tipo === 'ios' ? 50 : 180;   // segundos por trecho (o reconhecimento do iPhone aceita ~1 min)
let gravacao = null, transcrevendo = false, esperaVoz = null, trechoAtual = null, cancelarTranscricao = null;
const AVISO_GRAV = 10 * 60, LIMITE_GRAV = 30 * 60;   // segundos: aviso e parada automática (memória do celular)
const mmss = s => (s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') : Math.floor(s / 60)) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function barraGravacao(modo, texto, pct) {
  const g = $('#gravando');
  if (!modo) { g.hidden = true; return; }
  g.hidden = false;
  const grav = modo === 'gravando';
  $('#cancelarGrav').disabled = false; $('#cancelarGrav').title = grav ? 'Cancelar gravação' : 'Cancelar transcrição';
  $('#pararGrav').disabled = !grav; $('#pararGrav').classList.toggle('carregando', !grav);
  g.classList.toggle('transcrevendo', !grav);
  if (!grav) $('#tempoGrav').textContent = 'Transcrevendo'; else if (texto !== undefined) $('#tempoGrav').textContent = texto;
}
// a voz (whisper) é baixada uma vez: pede confirmação e espera o download
async function garantirVoz() {
  if (!PLATAFORMA.temTranscricao) { toast('Neste aparelho a transcrição ainda não está disponível.'); return false; }
  const s = await lerSistema();
  if (!s || !s.vozes) return true;                       // iPhone: reconhecimento de voz do próprio iOS
  if (s.temTranscricao === false) { toast('A transcrição ainda não existe neste aparelho. Digite a mensagem ou mande o áudio num computador com a Própons IA.', 5000); return false; }
  const v = s.vozes.find(x => x.atual) || s.vozes[0];
  if (PLATAFORMA.tipo === 'web') {
    if (PLATAFORMA.urlTranscricao || s.transcricaoUrl) { if (!PLATAFORMA.urlTranscricao) PLATAFORMA.urlTranscricao = s.transcricaoUrl; return true; }
    await perguntar('Transcrever áudio no Linux', `<p>Para transformar fala em texto, ligue a transcrição pelo terminal (baixa a voz de ${gbBonito(v.tamanho)} uma vez) e abra de novo:</p><div class="cmd"><code id="cmdVoz">propons-ia --voz</code><button class="icone" data-copiar="cmdVoz">${ICO.copiar}</button></div><p class="info" style="margin-top:8px">Voz mais precisa (190 MB): <code>propons-ia --voz small</code></p>`, [['Entendi', true, 'primario']]);
    return false;
  }
  if (v.baixado) return true;
  if (!await confirmar('Transcrever áudio', `<p>Para transformar fala em texto, a IA usa a <b>${esc(v.nome)}</b> (${gbBonito(v.tamanho)}), baixada uma vez só. Depois funciona sem internet.</p><p>Dá para trocar pela voz mais precisa em Ajustes → Modelos de IA.</p>`, 'Baixar')) return false;
  try { baixando[v.id] = { pct: 0, feito: 0, total: v.tamanho }; await PLATAFORMA.baixarVoz(v.id); }
  catch (e) { delete baixando[v.id]; toast('A voz para transcrever não foi baixada (' + e.message + '). Confira a internet e tente de novo em Ajustes → Voz.', 6000); return false; }
  toast('Baixando a voz…', 2500);
  return new Promise(res => { esperaVoz = { id: v.id, res }; setTimeout(() => { if (esperaVoz && esperaVoz.res === res) { esperaVoz = null; res(false); } }, 30 * 60000); });   // nunca fica esperando para sempre
}
// ondas: cobrem a largura toda e cada barrinha é o volume real de um instante (a mais nova entra pela direita)
function montarOnda() {
  const o = $('#onda'), n = Math.max(12, Math.floor((o.clientWidth || 200) / 6));
  o.innerHTML = '<i></i>'.repeat(n);
  return [...o.children];
}
const nivelDaOnda = rms => { const db = 20 * Math.log10(rms + 1e-6); return Math.max(0.1, Math.min(1, (db + 58) / 46)); };   // -58 dB (silêncio) → 10%, -12 dB (voz alta) → 100%
async function iniciarGravacao() {
  if (gravacao || transcrevendo || geracao) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Este aparelho não permite gravar aqui. Use "+" → Áudio para mandar um arquivo.', 4500); return; }
  if (!(await garantirVoz())) return;
  let fluxo;
  try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }); }
  catch (e) { if (foiNegado(e)) avisarNegada('microfone'); else toast('Não foi possível usar o microfone: ' + (e.name === 'NotFoundError' ? 'nenhum microfone encontrado.' : e.message), 4500); return; }
  const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
  const partes = []; rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
  rec.start(1000);
  let ctx = null, analisador = null, amostras = null;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); analisador = ctx.createAnalyser(); analisador.fftSize = 1024; ctx.createMediaStreamSource(fluxo).connect(analisador); amostras = new Float32Array(analisador.fftSize); } catch (e) {}
  const t0 = Date.now();
  gravacao = { rec, fluxo, partes, tipo, ctx };
  barraGravacao('gravando', '0:00');
  const barras = montarOnda(), niveis = barras.map(() => 0.1);
  let soma = 0, qtd = 0, tick = 0;
  let avisou = false;
  gravacao.timer = setInterval(() => {
    const seg = (Date.now() - t0) / 1000;
    $('#tempoGrav').textContent = mmss(seg);
    if (seg >= LIMITE_GRAV) { toast('Gravação de 30 min: parei e vou transcrever. Para continuar, grave de novo.', 5000); pararGravacao(true); return; }
    if (seg >= AVISO_GRAV && !avisou) { avisou = true; toast('Gravação longa (10 min). Aos 30 min ela para sozinha.', 4000); }
    if (!analisador) return;
    analisador.getFloatTimeDomainData(amostras);
    let q = 0; for (let i = 0; i < amostras.length; i++) q += amostras[i] * amostras[i];
    soma += Math.sqrt(q / amostras.length); qtd++;
    if (++tick % 2) return;                                  // uma barrinha nova a cada 100 ms
    niveis.shift(); niveis.push(nivelDaOnda(soma / qtd)); soma = 0; qtd = 0;
    for (let i = 0; i < barras.length; i++) barras[i].style.transform = `scaleY(${niveis[i].toFixed(2)})`;
  }, 50);
}
function pararGravacao(transcreverDepois) {
  const g = gravacao; if (!g) return;
  gravacao = null; clearInterval(g.timer);
  g.rec.onstop = () => {
    g.fluxo.getTracks().forEach(t => t.stop()); try { g.ctx && g.ctx.close(); } catch (e) {}
    if (!transcreverDepois) { barraGravacao(null); return; }
    transcreverAudio(new Blob(g.partes, { type: g.rec.mimeType || g.tipo || 'audio/webm' }));
  };
  try { g.rec.stop(); } catch (e) { g.rec.onstop(); }
}
// qualquer áudio → amostras 16 kHz mono (o formato do whisper)
async function audioPara16k(blob) {
  const buf = await blob.arrayBuffer();
  let ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 }); } catch (e) { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  let audio; try { audio = await ctx.decodeAudioData(buf); } finally { try { ctx.close(); } catch (e) {} }
  const taxa = audio.sampleRate, n = Math.floor(audio.length * 16000 / taxa), sai = new Float32Array(n);
  const canais = []; for (let c = 0; c < audio.numberOfChannels; c++) canais.push(audio.getChannelData(c));
  for (let i = 0; i < n; i++) {
    const k = Math.min(audio.length - 1, Math.floor(i * taxa / 16000));
    let x = 0; for (const c of canais) x += c[k]; sai[i] = x / canais.length;
  }
  return sai;
}
// corta em trechos de até TRECHO segundos, sempre no ponto mais silencioso dos últimos 15 s do trecho
function cortarEmTrechos(a) {
  const max = TRECHO * 16000, janela = 1600, trechos = [];
  let ini = 0;
  while (a.length - ini > max) {
    let melhor = ini + max, menor = Infinity;
    for (let p = ini + max - 15 * 16000; p + janela <= ini + max; p += janela) {
      let q = 0; for (let i = p; i < p + janela; i++) q += a[i] * a[i];
      if (q < menor) { menor = q; melhor = p + janela / 2; }
    }
    trechos.push(a.subarray(ini, melhor)); ini = melhor;
  }
  trechos.push(a.subarray(ini));
  return trechos;
}
// WAV 16 bits; trechos com menos de 2 s ganham silêncio antes e depois (o whisper ignora áudio com menos de 1 s)
function wav16k(amostras) {
  const MIN = 2 * 16000, pad = amostras.length < MIN ? Math.ceil((MIN - amostras.length) / 2) + 4000 : 0;
  const n = amostras.length + pad * 2;
  const wav = new Uint8Array(44 + n * 2), v = new DataView(wav.buffer);
  const txt = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); txt(8, 'WAVE'); txt(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < amostras.length; i++) { const x = Math.max(-1, Math.min(1, amostras[i])); v.setInt16(44 + (pad + i) * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return wav;
}
// o whisper às vezes "inventa" frases em áudio sem fala; só vale para trechos quase mudos
const picoDe = a => { let pico = 0; for (let i = 0; i < a.length; i += 4) { const x = Math.abs(a[i]); if (x > pico) pico = x; } return pico; };
const temFala = a => picoDe(a) > 0.015;
// tira as marcas que o whisper põe em trechos sem fala: [BLANK_AUDIO], (música), [risos]…
const limparTranscricao = t => String(t || '').replace(/\[[^\]]{0,40}\]|\((?:m[uú]sica|music|risos?|aplausos|sil[eê]ncio|inaud[ií]vel)[^)]{0,20}\)/gi, ' ').replace(/\s+/g, ' ').trim();
/* a transcrição cai na caixa do chat ou na caixa da Área de código (quem gravou decide) */
let alvoTranscricao = null;
function porTranscricao(texto) {
  const e = (alvoTranscricao && alvoTranscricao.isConnected) ? alvoTranscricao : $('#entrada');
  e.value = (e.value.trim() ? e.value.trim() + ' ' : '') + texto;
  if (e.id === 'entrada') ajustar(); else { e.style.height = 'auto'; e.style.height = Math.min(e.scrollHeight, 140) + 'px'; }
  e.focus(); try { e.setSelectionRange(e.value.length, e.value.length); } catch (err) {}
}
// duração quando o áudio não foi decodificado aqui (iPhone manda o arquivo inteiro para o motor)
const duracaoDeAudio = b => new Promise(ok => {
  try {
    const u = URL.createObjectURL(b), a = new Audio();
    const fim = d => { URL.revokeObjectURL(u); ok(isFinite(d) && d > 0 ? d : 0); };
    a.preload = 'metadata'; a.onloadedmetadata = () => fim(a.duration); a.onerror = () => fim(0);
    setTimeout(() => fim(0), 4000); a.src = u;
  } catch (e) { ok(0); }
});
async function transcreverAudio(blob, mesmoSemFala) {
  if (transcrevendo) return;
  transcrevendo = true; cancelarTranscricao = new AbortController();
  const sinal = cancelarTranscricao.signal;
  barraGravacao('transcrevendo', 'Transcrevendo');
  try {
    let amostras = null;
    try { amostras = await audioPara16k(blob); }
    catch (e) {
      // o iPhone lê m4a/mp3 direto; nos outros aparelhos, formato não suportado
      if (PLATAFORMA.tipo !== 'ios') throw e;
    }
    let texto = '';
    if (!amostras) {
      const ext = /mp4|m4a|aac/.test(blob.type) ? 'm4a' : /mpeg|mp3/.test(blob.type) ? 'mp3' : 'wav';
      trechoAtual = { i: 0, n: 1 };
      const r = await PLATAFORMA.transcrever(new Uint8Array(await blob.arrayBuffer()), ext, null, sinal);
      texto = limparTranscricao(r && r.texto);
    } else {
      if (!amostras.length) { toast('Este áudio está vazio.', 3500); return; }
      if (!mesmoSemFala && !temFala(amostras)) {
        // volume baixo demais: pergunta em vez de descartar (pode ser uma gravação distante, mas com fala)
        transcrevendo = false; barraGravacao(null);
        if (await confirmar('Áudio muito baixo', '<p>Não ouvi fala neste áudio — pode estar mudo ou muito baixo.</p>', 'Transcrever assim mesmo')) return transcreverAudio(blob, true);
        return;
      }
      const trechos = cortarEmTrechos(amostras), partes = [], pico = Math.max(...trechos.map(picoDe));
      for (let i = 0; i < trechos.length; i++) {
        if (sinal.aborted) break;
        trechoAtual = { i, n: trechos.length };
        if (!mesmoSemFala && picoDe(trechos[i]) < Math.max(0.004, pico * 0.02)) continue;   // trecho mudo em relação ao resto
        const r = await PLATAFORMA.transcrever(wav16k(trechos[i]), 'wav', null, sinal);
        const t = limparTranscricao(r && r.texto);
        if (t) partes.push(t);
      }
      texto = partes.join(' ').replace(/\s+/g, ' ').trim();
    }
    if (sinal.aborted) { if (texto) toast('Transcrição cancelada; ficou só o que já tinha sido transcrito.', 3500); else { toast('Transcrição cancelada.'); return; } }
    if (!texto) { toast('Não ouvi nenhuma fala neste áudio.', 3500); return; }
    porTranscricao(texto);
    const segundos = amostras && amostras.length ? amostras.length / 16000 : await duracaoDeAudio(blob);
    guardarNaBiblioteca({ tipo: 'audio', nome: blob.name || ('Gravação ' + new Date().toTimeString().slice(0, 5)), tam: blob.size, texto, segundos, audio: blob });
  } catch (e) {
    if (e.name === 'AbortError' || sinal.aborted) toast('Transcrição cancelada.');
    else toast(/decode|EncodingError|Unable to decode/i.test(e.message || e.name) ? 'Não consegui ler este áudio (formato não suportado).' : /memory|allocation|RangeError/i.test(e.message || e.name) ? 'Áudio grande demais para a memória deste aparelho.' : 'Não foi possível transcrever: ' + e.message, 4500);
  } finally { transcrevendo = false; trechoAtual = null; cancelarTranscricao = null; barraGravacao(null); }
}
// progresso real do whisper (quando o aparelho manda): a barra deixa de ser indeterminada
PLATAFORMA.ao('transcricao', d => { if (!transcrevendo) return; const t = trechoAtual || { i: 0, n: 1 }; barraGravacao('transcrevendo', undefined, (t.i + (d.pct || 0)) / t.n); });
$('#falar').onclick = async () => { alvoTranscricao = null; if (await garantirPermissao('microfone')) iniciarGravacao(); };
$('#pararGrav').onclick = () => pararGravacao(true);
$('#cancelarGrav').onclick = () => { if (gravacao) pararGravacao(false); else if (cancelarTranscricao) { cancelarTranscricao.abort(); $('#tempoGrav').textContent = 'Cancelando'; } };
$('#audio').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { transcreverAudio(f); } };

