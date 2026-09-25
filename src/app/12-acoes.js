/* ---------------- pedidos de ação na conversa ----------------
   "grave um áudio", "tire uma foto", "leia a resposta", "me avise quando terminar", "ative minha localização": o app
   responde na hora (sem passar pela IA) e logo em seguida faz — é aí que o próprio sistema mostra a janelinha de
   permissão (microfone, câmera, localização, notificações), como em qualquer app. Vale também com a IA desligada.
   Só pedidos diretos contam: "como gravar um áudio no celular?" continua sendo pergunta para a IA. */
const PEDIDO_ACAO = '^(?:(?:por favor|ei|oi|ok|pr[óo]pons)[,!.]?\\s+)*(?:(?:voc[êe]\\s+)?(?:pode|poderia|consegue|quero|queria|preciso|vamos|bora|vou|me ajuda a)\\s+)?';
const ACOES_CONVERSA = [
  ['gravar', '(?:grav(?:a|e|ar)(?:\\s+(?:um |uma |o |a |meu |minha |essa |esta )?(?:[áa]udio|voz|aula|mensagem de voz|o que eu (?:falar|disser))|\\s*(?:pra mim|para mim)?\\s*[.!?]?\\s*$)|come[çc](?:a|e|ar) a gravar|(?:liga|ligar|ligue|ativa|ativar|ative|abre|abrir|abra) o microfone|me (?:escuta|escute|ou[çc]a))\\b'],
  ['foto', '(?:tir(?:a|e|ar) (?:uma )?foto|fotograf(?:a|e|ar)|(?:abre|abrir|abra|liga|ligar|ligue|ativa|ativar|ative) a c[âa]mera)\\b'],
  ['ler', '(?:l[êe]|leia|ler)(?: isso| essa resposta| a resposta| a [úu]ltima resposta| pra mim| para mim| em voz alta| alto)+\\s*[.!]?\\s*$'],
  ['avisar', '(?:me avis(?:a|e|ar) quando (?:terminar|ficar pronto|acabar|responder)|(?:ativa|ativar|ative|liga|ligar|ligue) (?:as )?notifica[çc](?:ões|oes))'],
  ['local', '(?:(?:ativa|ativar|ative|liga|ligar|ligue|usa|usar|use|libera|liberar|libere) (?:a )?(?:minha )?localiza[çc][ãa]o)\\b'],
].map(([id, re]) => ({ id, re: new RegExp(PEDIDO_ACAO + re, 'i') }));
function acaoPedida(texto) {
  const t = String(texto || '').trim(); if (!t || t.length > 140) return null;
  const a = ACOES_CONVERSA.find(x => x.re.test(t));
  return a ? a.id : null;
}
// responde, desenha e só então faz (a janelinha do sistema vem logo depois da resposta)
async function executarAcao(id) {
  const depois = fn => setTimeout(() => { try { fn(); } catch (e) {} }, 350);
  const ultimaIa = () => { for (let i = atual.msgs.length - 1; i >= 0; i--) { const x = atual.msgs[i]; if (x.role === 'assistant' && x.texto && !x.interno) return x; } return null; };
  if (id === 'gravar') {
    if (!PLATAFORMA.temTranscricao) { respostaLocal('Neste aparelho não dá para gravar direto na conversa. Mande um arquivo de áudio pelo **+ → Áudio** que eu transcrevo.'); return; }
    respostaLocal('Pode falar: estou gravando. Toque em **✓** quando terminar e o texto aparece na caixa para você revisar antes de mandar.');
    depois(() => { alvoTranscricao = null; iniciarGravacao(); });
  } else if (id === 'foto') {
    if (!PLATAFORMA.temVisao) { respostaLocal('Neste aparelho eu ainda não leio fotos. Descreva o que você quer mostrar, ou mande o texto.'); return; }
    const celular = PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios';
    respostaLocal(celular ? 'Abrindo a câmera: tire a foto e ela vem anexada para você perguntar sobre ela.' : 'Abrindo a câmera do computador: tire a foto e ela vem anexada para você perguntar sobre ela.');
    depois(async () => { if (celular) $('#camera').click(); else if (await garantirPermissao('camera')) abrirWebcam(); });
  } else if (id === 'ler') {
    const m = ultimaIa();
    if (!m || !PLATAFORMA.temFala) { respostaLocal(!m ? 'Ainda não há resposta para ler nesta conversa.' : 'Este aparelho não tem voz para ler em voz alta.'); return; }
    respostaLocal('Lendo a última resposta em voz alta. Toque em **❚❚** embaixo dela para pausar.');
    depois(() => { if (!(falaAtual && falaAtual.msg === m)) lerMensagem(m); });
  } else if (id === 'avisar') {
    pref('avisarPronto', 'sim');
    respostaLocal('Combinado: quando uma resposta ficar pronta com o app em segundo plano, eu aviso com uma notificação.');
    depois(() => PLATAFORMA.pedirPermissao('notificacao').then(ok => { if (ok === false) avisarNegada('notificacao'); }).catch(() => {}));
  } else if (id === 'local') {
    respostaLocal('Vou usar a sua localização para responder sobre onde você está (hora, clima e lugares por perto). Permita na janela do sistema.');
    depois(async () => {
      ultimoLugar = null;
      const l = await lugarDoAparelho(() => {});
      if (l.negada) { respostaLocal('A localização não foi permitida. Dá para liberar nas configurações do app; enquanto isso, me diga a cidade.'); avisarNegada('localizacao'); }
      else if (l.indisponivel) respostaLocal('Não consegui a localização agora (serviço de localização desligado ou sem sinal). Me diga a cidade e eu respondo por ela.');
      else respostaLocal(`Pronto, localização ligada: você está em **${nomeCompleto(l) || 'um lugar sem nome conhecido'}** (${coordBonita(l.lat, l.lon)}${l.aproximado ? ', aproximado pela conexão' : ''}). Pergunte "como está o tempo aqui?" ou "que horas são em Tóquio?".`);
    });
  }
}
