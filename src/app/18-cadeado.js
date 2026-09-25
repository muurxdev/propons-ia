/* ---------------- cadeado: PIN para abrir o app ----------------
   Para celular dividido com a família ou PC da escola: com o cadeado ligado, o app abre numa tela de PIN (e, se a
   pessoa quiser, pede de novo ao voltar depois de 5 minutos fora). É uma proteção de tela: quem mexer nos arquivos do
   aparelho ainda acha as conversas (isso é dito na hora de ligar). O PIN nunca é guardado, só o resumo dele (SHA-256
   com sal). Esqueceu o PIN: dá para tirar o cadeado apagando as conversas, a memória e o baralho deste aparelho. */
ICO.cadeadoFechado = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="16" r="1.2"/></svg>';
// SHA-256 pequeno (o crypto.subtle não existe em toda página do app: a abertura fria e o iPhone são file:// ou http)
function sha256(texto) {
  const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  const b = [...new TextEncoder().encode(texto)], n = b.length;
  b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  const bits = n * 8; for (let i = 7; i >= 0; i--) b.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 0xff);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64);
  const rr = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    [a, bb, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
function lerCadeado() { try { const c = JSON.parse(pref('cadeado') || 'null'); return c && c.hash && c.sal ? c : null; } catch (e) { return null; } }
const pinConfere = (c, pin) => sha256(c.sal + ':' + pin) === c.hash;
let cadeadoAberto = false, saiuEm = 0;

/* a tela do PIN: modo 'abrir' (confere), 'criar' (pede duas vezes); fim(pin|null) */
function telaPin(modo, fim, op = {}) {
  document.querySelectorAll('.cadeado').forEach(x => x.remove());
  const v = document.createElement('div'); v.className = 'cadeado'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  let pin = '', primeiro = null, erros = 0, esperaAte = 0;
  const titulo = () => modo === 'abrir' ? 'Digite o PIN' : primeiro ? 'Digite de novo para confirmar' : 'Crie um PIN de 4 a 6 números';
  v.innerHTML = `<div class="cd-caixa"><span class="cd-ico">${ICO.cadeadoFechado}</span><h2 class="cd-titulo"></h2><p class="cd-aviso" aria-live="polite"></p>
    <div class="cd-pontos" aria-hidden="true"></div>
    <div class="cd-teclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}
      ${modo === 'abrir' && !op.cancelar ? '<span></span>' : '<button type="button" class="cd-lado" data-cancelar>Cancelar</button>'}<button type="button" data-k="0">0</button><button type="button" class="cd-lado" data-apagar aria-label="Apagar">⌫</button></div>
    ${modo === 'abrir' && !op.cancelar ? '<button type="button" class="cd-esqueci">Esqueci o PIN</button>' : ''}</div>`;
  const pontos = v.querySelector('.cd-pontos'), aviso = v.querySelector('.cd-aviso');
  const desenhar = () => { v.querySelector('.cd-titulo').textContent = titulo(); pontos.innerHTML = Array.from({ length: Math.max(4, pin.length) }, (_, i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join(''); };
  const tremer = t => { aviso.textContent = t; pontos.classList.remove('treme'); void pontos.offsetWidth; pontos.classList.add('treme'); pin = ''; desenhar(); };
  const sair = r => { document.removeEventListener('keydown', teclas, true); v.classList.add('saindo'); setTimeout(() => v.remove(), 200); fim(r); };
  const conferir = () => {
    if (modo === 'abrir') {
      const c = lerCadeado();
      if (!c || pinConfere(c, pin)) {
        // a página da IA ligada (outro endereço) abre logo depois da primeira: ela não pede o PIN de novo em 2 minutos
        if (!op.cancelar) { cadeadoAberto = true; pref('cadeadoLivreAte', String(Date.now() + 120000)); }
        sair(pin); return;
      }
      erros++;
      if (erros >= 5) { esperaAte = Date.now() + 30000; erros = 0; tremer('Muitas tentativas. Espere 30 segundos.'); } else tremer('PIN errado.');
      return;
    }
    if (pin.length < 4) { aviso.textContent = 'Use pelo menos 4 números.'; return; }
    if (!primeiro) { primeiro = pin; pin = ''; aviso.textContent = ''; desenhar(); return; }
    if (pin !== primeiro) { primeiro = null; tremer('Os PINs não bateram. Comece de novo.'); return; }
    sair(pin);
  };
  const tecla = k => {
    if (Date.now() < esperaAte) return;
    if (k === 'apagar') { pin = pin.slice(0, -1); desenhar(); return; }
    if (pin.length >= 6) return;
    pin += k; aviso.textContent = ''; desenhar();
    if (modo === 'abrir' ? pin.length >= 4 && lerCadeado() && pinConfere(lerCadeado(), pin) || pin.length === 6 : false) conferir();
  };
  v.querySelectorAll('[data-k]').forEach(b => b.onclick = () => tecla(b.dataset.k));
  v.querySelector('[data-apagar]').onclick = () => tecla('apagar');
  // "OK" implícito: no abrir confere sozinho quando acerta (ou com 6); no criar, Enter/um toque longo não é preciso — confirma com 4+
  const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'btn primario cd-ok'; ok.textContent = modo === 'abrir' ? 'Entrar' : 'Continuar'; ok.onclick = conferir;
  v.querySelector('.cd-teclado').after(ok);
  const cancelar = v.querySelector('[data-cancelar]'); if (cancelar) cancelar.onclick = () => sair(null);
  const esqueci = v.querySelector('.cd-esqueci');
  if (esqueci) esqueci.onclick = async () => {
    if (!await confirmar('Tirar o cadeado sem o PIN?', '<p>Para abrir sem o PIN, as conversas, a memória e o baralho deste aparelho são apagados. Os modelos e os ajustes continuam.</p>', 'Apagar e abrir', true)) return;
    if (typeof geracao !== 'undefined' && geracao) geracao.ctrl.abort();
    conversas = []; salvarBloqueado = false; pref('memoria', ''); pref('baralho', ''); pref('cadeado', ''); try { localStorage.removeItem('cadeado'); } catch (e) {}
    nova(); salvar(true); cadeadoAberto = true; sair(null); toast('Cadeado tirado. As conversas deste aparelho foram apagadas.', 4000);
  };
  const teclas = e => {
    if (!v.isConnected) return;
    if (/^\d$/.test(e.key)) { e.preventDefault(); tecla(e.key); }
    else if (e.key === 'Backspace') { e.preventDefault(); tecla('apagar'); }
    else if (e.key === 'Enter') { e.preventDefault(); conferir(); }
    else if (e.key === 'Escape' && (modo !== 'abrir' || op.cancelar)) { e.preventDefault(); sair(null); }
    else if (modo === 'abrir' && !op.cancelar) e.stopPropagation();   // nada do app por baixo reage a atalhos
  };
  document.addEventListener('keydown', teclas, true);
  desenhar();
  document.body.appendChild(v);
  setTimeout(() => { const b = v.querySelector('[data-k="1"]'); if (b && !estreita()) b.focus(); }, 60);
}
// abriu o app (ou voltou depois de um tempo): com cadeado, a tela do PIN cobre tudo
// inicio: abrindo o app (acabou de desbloquear na outra página? não pede de novo); sem inicio: voltou depois de um tempo
function travarSePreciso(inicio) {
  const c = lerCadeado(); if (!c) return;
  if (inicio) {
    if (cadeadoAberto) return;
    if (+pref('cadeadoLivreAte') > Date.now()) { cadeadoAberto = true; document.querySelectorAll('.cadeado').forEach(x => x.remove()); return; }
  } else cadeadoAberto = false;
  if (!document.querySelector('.cadeado')) telaPin('abrir', () => {});
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { saiuEm = Date.now(); return; }
  const c = lerCadeado();
  if (c && c.quando === 'voltar' && saiuEm && Date.now() - saiuEm > 5 * 60000) travarSePreciso(false);
});
// Ajustes → Privacidade
function htmlCadeado() {
  const c = lerCadeado();
  return `<div class="secao"><h4>Cadeado</h4>${seg('cadeado', [['nao', 'Desligado'], ['abrir', 'Ao abrir'], ['voltar', 'Ao abrir e ao voltar']], c ? (c.quando === 'voltar' ? 'voltar' : 'abrir') : 'nao')}
    <p class="info">Pede um PIN para abrir o app (e, em "ao voltar", quando você fica mais de 5 minutos fora). Protege de quem pega o aparelho; os arquivos das conversas continuam no aparelho sem criptografia.</p>
    ${c ? '<div class="botoes"><button class="btn" id="trocarPin">Trocar o PIN</button></div>' : ''}</div>`;
}
function ligarCadeado(c) {
  const criar = quando => telaPin('criar', pin => {
    if (pin) { const sal = Math.random().toString(36).slice(2) + Date.now().toString(36); pref('cadeado', JSON.stringify({ sal, hash: sha256(sal + ':' + pin), quando })); cadeadoAberto = true; toast('Cadeado ligado.'); }
    desenharAba(); desenharNav();
  });
  ligarSeg(c, 'cadeado', v => {
    const atualC = lerCadeado();
    if (v === 'nao') { if (!atualC) return; telaPin('abrir', pin => { if (pin != null) { pref('cadeado', ''); try { localStorage.removeItem('cadeado'); } catch (e) {} toast('Cadeado desligado.'); } desenharAba(); desenharNav(); }, { cancelar: true }); return; }
    if (atualC) { atualC.quando = v; pref('cadeado', JSON.stringify(atualC)); return; }
    criar(v);
  });
  const t = c.querySelector('#trocarPin'); if (t) t.onclick = () => { const q = (lerCadeado() || {}).quando || 'abrir'; telaPin('abrir', pin => { if (pin != null) criar(q); }, { cancelar: true }); };
}
