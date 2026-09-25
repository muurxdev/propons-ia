/* ---------------- permissões (quem pergunta é o sistema, como em qualquer app) ----------------
   Nada de tela de permissões própria: microfone, localização e notificações são pedidos pelo próprio aparelho na hora
   em que o recurso é usado (a janelinha do Android/iOS/Windows). Se a pessoa negou, a Própons explica o que ficou
   bloqueado e abre as configurações do app no sistema, onde dá para liberar — o mesmo caminho de todos os apps.
   A câmera do celular é o app de câmera do sistema (não precisa de permissão); a do PC é pedida ao abrir a webcam. */
const PERMISSOES = {
  camera: { nome: 'Câmera', ico: 'camera', para: 'tirar uma foto na hora para a IA ver', nav: 'camera' },
  microfone: { nome: 'Microfone', ico: 'microfone', para: 'gravar a sua voz e transcrever em texto', nav: 'microphone' },
  localizacao: { nome: 'Localização', ico: 'local', para: 'responder sobre onde você está: hora, clima e lugares por perto', nav: 'geolocation' },
  notificacao: { nome: 'Notificações', ico: 'sino', para: 'avisar quando a resposta ficar pronta com o app em segundo plano' },
  ...(CELULAR ? {} : { pasta: { nome: 'Pasta de arquivos', ico: 'pasta', para: 'ler e gravar os seus arquivos na Área de código' } }),
};
ICO.local = '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';
// onde fica o botão no sistema de cada aparelho (o texto da explicação acompanha)
const CAMINHO_CONFIG = {
  android: 'Configurações → Apps → Própons IA → Permissões',
  ios: 'Ajustes → Própons IA',
  mac: 'Ajustes do Sistema → Privacidade e Segurança',
  windows: 'Configurações → Privacidade e segurança',
  web: 'o cadeado ao lado do endereço, no navegador',
};
async function estadoPermissao(k) {
  if (k === 'pasta') return !TEM_PASTA ? 'indisponivel' : pastaRaiz ? 'ok' : 'pedir';
  if (k === 'camera' && !PLATAFORMA.temVisao) return 'indisponivel';
  try {
    if (navigator.permissions && navigator.permissions.query && PERMISSOES[k].nav) {
      const r = await navigator.permissions.query({ name: PERMISSOES[k].nav });
      return r.state === 'granted' ? 'ok' : r.state === 'denied' ? 'negado' : 'pedir';
    }
  } catch (e) {}
  return 'pedir';
}
// negado: explica e leva às configurações do app no sistema (lá é que se libera)
async function avisarNegada(k) {
  const p = PERMISSOES[k] || { nome: k, para: '' }, onde = CAMINHO_CONFIG[PLATAFORMA.tipo] || CAMINHO_CONFIG.web;
  const abrir = await confirmar(`${p.nome} bloqueado${/a$/.test(p.nome) ? 'a' : ''}`,
    `<p>A Própons IA precisa da permissão de <b>${esc(p.nome.toLowerCase())}</b> para ${esc(p.para)}.</p><p>Ela foi negada no aparelho. Para liberar, abra <b>${esc(onde)}</b> e permita ${esc(p.nome.toLowerCase())}; depois é só tentar de novo.</p>`,
    PLATAFORMA.podeAbrirConfig ? 'Abrir configurações' : 'Entendi');
  if (abrir && PLATAFORMA.podeAbrirConfig) PLATAFORMA.abrirConfigApp(k).catch(() => toast('Abra ' + onde + '.', 4000));
}
// o erro de um pedido (getUserMedia, geolocalização) foi "não deixou"?
const foiNegado = e => !!e && (e.name === 'NotAllowedError' || e.name === 'SecurityError' || e.code === 1 || /denied|negad|permission/i.test(e.message || ''));
// usar o recurso: o sistema pergunta (se ainda não perguntou); devolve true quando pode seguir
async function garantirPermissao(k) {
  if (k === 'pasta') return await escolherPasta();
  // câmera do celular = app de câmera do sistema (sem permissão); microfone e webcam: o pedido real acontece no uso
  // (getUserMedia), e é o sistema que mostra a janelinha; o "negado" que a página enxerga nem sempre é o do sistema
  // (o WebView responde "negado" antes de perguntar), então quem decide é o pedido de verdade — e o erro dele
  return true;
}
