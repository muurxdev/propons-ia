/* ---------------- permissões (uma por recurso, sempre com botão) ----------------
   Nada é ligado escondido: câmera, microfone, notificações e a pasta de arquivos têm cada uma o seu pedido, com o
   motivo escrito. Ajustes → Permissões mostra o estado de todas e o botão "Permitir" de cada uma. */
const PERMISSOES = {
  camera: { nome: 'Câmera', ico: 'camera', para: 'tirar uma foto na hora para a IA ver', nav: 'camera' },
  microfone: { nome: 'Microfone', ico: 'microfone', para: 'gravar a sua voz e transcrever em texto', nav: 'microphone' },
  notificacao: { nome: 'Notificações', ico: 'sino', para: 'avisar quando a resposta ficar pronta com o app em segundo plano' },
  ...(CELULAR ? {} : { pasta: { nome: 'Pasta de arquivos', ico: 'pasta', para: 'ler e gravar os seus arquivos na Área de código' } }),
};
const permLembrada = k => pref('perm:' + k) || '';
async function estadoPermissao(k) {
  if (k === 'notificacao') {
    if (PLATAFORMA.tipo === 'web') return !('Notification' in window) ? 'indisponivel'
      : Notification.permission === 'granted' ? 'ok' : Notification.permission === 'denied' ? 'negado' : 'pedir';
    return permLembrada(k) === 'ok' ? 'ok' : 'pedir';       // no aparelho quem pergunta é o sistema
  }
  if (k === 'pasta') return !TEM_PASTA ? 'indisponivel' : pastaRaiz ? 'ok' : 'pedir';
  if (k === 'camera' && !PLATAFORMA.temVisao) return 'indisponivel';
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const r = await navigator.permissions.query({ name: PERMISSOES[k].nav });
      if (r.state === 'granted') return 'ok';
      if (r.state === 'denied') return 'negado';
      return 'pedir';
    }
  } catch (e) {}
  return permLembrada(k) === 'ok' ? 'ok' : 'pedir';
}
async function pedirPermissao(k) {
  try {
    if (k === 'notificacao') {
      if (PLATAFORMA.tipo === 'web' && 'Notification' in window) { if (await Notification.requestPermission() !== 'granted') return false; }
      else await PLATAFORMA.notificar('Própons IA', 'Pronto: é assim que eu aviso quando a resposta fica pronta.');
      pref('perm:notificacao', 'ok'); return true;
    }
    if (k === 'pasta') return await escolherPasta();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { pref('perm:' + k, 'ok'); return true; }
    const fluxo = await navigator.mediaDevices.getUserMedia(k === 'camera' ? { video: true } : { audio: true });
    fluxo.getTracks().forEach(t => t.stop());
    pref('perm:' + k, 'ok'); return true;
  } catch (e) { return false; }
}
// usar o recurso só depois de explicar e pedir; devolve true quando pode seguir
async function garantirPermissao(k) {
  const e = await estadoPermissao(k);
  if (e === 'ok' || e === 'indisponivel') return true;
  const p = PERMISSOES[k];
  const deu = await pedirPermissao(k);   // sem popup nosso: quem pergunta é o próprio aparelho
  if (!deu) toast(e === 'negado' ? `${p.nome} bloqueada: libere nas configurações do sistema.` : `Sem permissão de ${p.nome.toLowerCase()}.`, 4000);
  return deu;
}
function abaPermissoes(c) {
  c.innerHTML = `<p class="info">Cada recurso pede a permissão dele, só quando você toca no botão. A IA continua rodando no aparelho: nada é enviado para a internet.</p>
    <div class="lista-modelos" id="listaPerm"></div>`;
  const desenhar = async () => {
    const l = $('#listaPerm'); if (!l) return;
    const estados = {};
    for (const k of Object.keys(PERMISSOES)) estados[k] = await estadoPermissao(k);
    if (!$('#listaPerm')) return;
    const rotulo = { ok: 'Permitido', pedir: 'Não pedida', negado: 'Negada', indisponivel: 'Indisponível' };
    l.innerHTML = Object.entries(PERMISSOES).map(([k, p]) => `<div class="perm">
      <span class="mico">${ICO[p.ico]}</span>
      <span class="pt"><b>${p.nome}</b><small>Para ${p.para}.</small></span>
      <span class="st ${estados[k]}">${rotulo[estados[k]]}</span>
      ${estados[k] === 'ok' || estados[k] === 'indisponivel' ? '' : `<button class="btn" data-p="${k}">Permitir</button>`}</div>`).join('');
    l.querySelectorAll('[data-p]').forEach(b => b.onclick = async () => {
      b.disabled = true;
      const deu = await pedirPermissao(b.dataset.p);
      toast(deu ? `${PERMISSOES[b.dataset.p].nome}: permitido.` : `${PERMISSOES[b.dataset.p].nome}: sem permissão.`, 3000);
      desenhar();
    });
  };
  desenhar();
}

