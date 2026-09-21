/* Detecta pedidos de passo a passo e calcula o rastreamento exato */
function detectTrace(txt){
  const t=txt.toLowerCase();
  let alg=null;
  if(/bubble|bolha/.test(t)) alg='bubble';
  else if(/sele[cç][aã]o|selection/.test(t)) alg='selection';
  else if(/quick|r[aá]pida/.test(t)) alg='quick';
  else if(/bin[aá]ri/.test(t) && !/arquivo|[aá]rvore/.test(t) && (/busca|pesquis|procur|\d/.test(t))) alg='binaria';
  if(!alg) return null;
  let val=null, body=txt, gerado=false;
  const br=txt.match(/\[([^\]]+)\]/);
  if(alg==='binaria'){
    const m=t.match(/(?:procur\w*|busc\w*|encontr\w*|ach\w*|valor|n[uú]mero|do|o)\s+(?:o\s+|pelo\s+|por\s+|valor\s+)?(-?\d+)/);
    if(m) val=+m[1];
  }
  let lista = br ? parseNums(br[1]) : parseNums(body);
  if(!br && val!==null){ const ix=lista.indexOf(val); if(ix>=0) lista.splice(ix,1); }
  // pediu exemplo sem dar números → o código gera uma lista
  if(lista.length<2 && /exemplo|mostr|demonstr|simul|passo a passo|na pr[aá]tica|ilustr/.test(t)){
    gerado=true;
    lista=[...Array(30).keys()].map(x=>x+1).sort(()=>Math.random()-.5).slice(0, alg==='binaria'?9:6);
    if(alg==='binaria'){ lista.sort((a,b)=>a-b); val=lista[Math.floor(Math.random()*lista.length)]; }
  }
  if(lista.length<2 || lista.length>20) return null;
  if(alg==='binaria' && val===null) return null;
  const st=trace(alg,lista,val);
  // listas grandes: esconde só as comparações sem troca (as trocas sempre aparecem)
  const steps = st.length<=40 ? st : st.filter(s=>!s.detail || s.sw);
  return {alg, lista, val, gerado, steps: steps.map(s=>s.t), marcos: st.filter(s=>!s.detail).map(s=>s.t)};
}
