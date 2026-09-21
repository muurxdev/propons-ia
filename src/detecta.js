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
