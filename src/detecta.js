/* Detecta pedidos de passo a passo de algoritmo e calcula o rastreamento exato.
   Só dispara com o NOME do algoritmo (não com palavras comuns como "seleção" ou "rápida")
   e com uma lista de números: entre colchetes, ou pelo menos 3 números soltos. */
const RE_ALG = {
  bubble: /bubble\s*-?\s*sort|\bbubble\b|m[eé]todo\s+(?:da\s+)?bolha|(?:ordena\w*|sort|algoritmo)\s+(?:\w+\s+){0,2}bolha|\bbolha\s+(?:sort|ordena)/i,
  selection: /selection\s*-?\s*sort|ordena[çc][aã]o\s+(?:por\s+)?sele[çc][aã]o|(?:m[eé]todo|algoritmo)\s+(?:de\s+|da\s+)?sele[çc][aã]o|sele[çc][aã]o\s+sort/i,
  quick: /quick\s*-?\s*sort|ordena[çc][aã]o\s+r[aá]pida/i,
  binaria: /busca\s+bin[aá]ria|pesquisa\s+bin[aá]ria|binary\s+search/i,
};
function detectTrace(txt){
  const t = txt.toLowerCase();
  const alg = Object.keys(RE_ALG).find(k => RE_ALG[k].test(txt));
  if (!alg) return null;
  let val = null, gerado = false;
  const br = txt.match(/\[([^\]]+)\]/);
  if (alg === 'binaria'){
    const m = t.match(/(?:procur\w*|busc\w*|encontr\w*|ach\w*|valor|n[uú]mero|do|o)\s+(?:o\s+|pelo\s+|por\s+|valor\s+)?(-?\d+)/);
    if (m) val = +m[1];
  }
  let lista = br ? parseNums(br[1]) : parseNums(txt);
  if (!br && val !== null){ const ix = lista.indexOf(val); if (ix >= 0) lista.splice(ix, 1); }
  if (!br && lista.length < 3) lista = [];   // números soltos só contam se forem vários
  // pediu exemplo sem dar números → o código gera uma lista
  if (lista.length < 2 && /exemplo|mostr|demonstr|simul|passo a passo|na pr[aá]tica|ilustr/.test(t)){
    gerado = true;
    lista = [...Array(30).keys()].map(x => x + 1).sort(() => Math.random() - .5).slice(0, alg === 'binaria' ? 9 : 6);
    if (alg === 'binaria'){ lista.sort((a, b) => a - b); val = lista[Math.floor(Math.random() * lista.length)]; }
  }
  if (lista.length < 2 || lista.length > 20) return null;
  if (alg === 'binaria' && val === null) return null;
  const st = trace(alg, lista, val);
  // listas grandes: esconde só as comparações sem troca (as trocas sempre aparecem)
  const steps = st.length <= 40 ? st : st.filter(s => !s.detail || s.sw);
  return { alg, lista, val, gerado, steps: steps.map(s => s.t), marcos: st.filter(s => !s.detail).map(s => s.t) };
}

// pedidos de código e de conta (a amostragem fica quase determinística; o modo Auto pensa neles)
const PEDE_CODIGO = /\b(?:fa[çc]a|crie|cria|escreva|escreve|gere|gera|implemente|implementa|programe|desenvolva|monte|me\s+d[êáe]|mostre|mostra|quero|preciso\s+de|refatore|corrija|conserte|converta|traduza)\b[\s\S]{0,60}\b(?:c[óo]digo|programa|script|fun[çc][ãa]o|classe|m[ée]todo|algoritmo|api|site|p[áa]gina|app|jogo|bot|calculadora|sistema)\b|\b(?:em|no|na|usando|com)\s+(?:python|java(?:script)?|typescript|c\+\+|c#|c|go|golang|rust|php|kotlin|swift|ruby|sql|html|css|bash|dart|lua)\b|```/i;
// contas e matemática: temperatura baixa (resposta quase determinística), como em código
const PEDE_EXATO = /\d\s*[-+*/^×÷=]\s*\d|\b(?:calcule|calcula|resolva|resolve|some|multiplique|divida|derivada|integral|equa[çc][ãa]o|fra[çc][ãa]o|porcentagem|raiz quadrada|matriz|logaritmo|quanto [ée]|quantos? (?:s[ãa]o|d[áa]))\b/i;
// Esforço Auto: pensa onde o raciocínio rende (contas, física, química, código, lógica, "por quê", perguntas com
// número) e responde direto em cumprimento, conversa e pergunta curta de fato. O placar (treino/avaliar.mjs --auto)
// usa esta mesma função.
const PEDE_RACIOCINIO = /\b(?:calcul\w*|resolv\w*|demonstr\w*|prove|equa[çc][ãa]o|equa[çc][õo]es|deriv\w*|integr\w*|probabilidade|porcentagem|fra[çc][ãa]o|propor[çc][ãa]o|f[íi]sica|qu[íi]mica|velocidade|acelera[çc][ãa]o|for[çc]a|energia|pot[êe]ncia|massa|densidade|mol|estequiometria|rea[çc][ãa]o|algoritmo|complexidade|l[óo]gica|compare|diferen[çc]a entre|por que|por qu[êe]|explique como|passo a passo|quantos?|quantas?|qual (?:[ée] )?(?:o|a) (?:valor|resultado)|verdadeir[oa] ou fals[oa]|existe|existiu)\b/i;
const CONVERSA = /^\s*(?:oi+|ol[áa]|e a[íi]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|tchau|tudo bem|beleza|ok|legal|show)\b[\s!.?,]*$/i;
function precisaPensar(texto) {
  const t = String(texto || '').trim();
  if (!t || CONVERSA.test(t)) return false;
  if (PEDE_EXATO.test(t) || PEDE_CODIGO.test(t) || Object.values(RE_ALG).some(r => r.test(t))) return true;
  if (/\d/.test(t) && t.length > 15) return true;   // datas, quantidades, contas escritas por extenso
  return PEDE_RACIOCINIO.test(t);
}
