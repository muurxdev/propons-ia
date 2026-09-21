/* ================= ALGORITMOS (idênticos ao código do professor) ================= */
function traceBubble(arr){
  const d=[...arr], n=d.length, st=[];
  st.push({l:[...d], t:`Lista inicial: ${fmt(d)}`, fixed:[]});
  const fixed=[];
  for(let fim=n-1; fim>0; fim--){
    const p=n-fim; let trocou=false;
    for(let i=0;i<fim;i++){
      const a=d[i], b=d[i+1];
      if(a>b){ d[i]=b; d[i+1]=a; trocou=true;
        st.push({l:[...d], sw:[i,i+1], fixed:[...fixed], t:`Passada ${p}: compara ${a} e ${b} → ${a} > ${b}, TROCA → ${fmt(d)}`, detail:true});
      } else {
        st.push({l:[...d], cmp:[i,i+1], fixed:[...fixed], t:`Passada ${p}: compara ${a} e ${b} → não troca`, detail:true});
      }
    }
    if(!trocou){
      st.push({l:[...d], fixed:[...fixed], t:`Passada ${p} terminou SEM trocas → a lista já está ordenada e o algoritmo para (break).`, pass:p, end:true});
      return st;
    }
    fixed.push(fim);
    st.push({l:[...d], fixed:[...fixed], t:`Fim da passada ${p}: ${fmt(d)} → o ${d[fim]} "borbulhou" para o índice ${fim} (posição final).`, pass:p});
  }
  st.push({l:[...d], fixed:d.map((_,i)=>i), t:`Lista ordenada: ${fmt(d)}`, end:true});
  return st;
}
function traceSelection(arr){
  const d=[...arr], n=d.length, st=[], fixed=[];
  st.push({l:[...d], t:`Lista inicial: ${fmt(d)}`, fixed:[]});
  for(let i=0;i<n-1;i++){
    let ime=i;
    for(let k=i+1;k<n;k++) if(d[k]<d[ime]) ime=k;
    const vi=d[i], vm=d[ime];
    st.push({l:[...d], cmp:[i,ime], fixed:[...fixed], t:`Passo ${i+1}: o menor valor do índice ${i} até o fim é ${vm} (índice ${ime}).`, detail:true});
    d[i]=vm; d[ime]=vi; fixed.push(i);
    st.push({l:[...d], sw: ime!==i?[i,ime]:null, fixed:[...fixed], pass:i+1,
      t: ime!==i ? `Passo ${i+1}: troca ${vi} (índice ${i}) com ${vm} (índice ${ime}) → ${fmt(d)}`
                 : `Passo ${i+1}: ${vm} já está no índice ${i} (troca consigo mesmo) → ${fmt(d)}`});
  }
  st.push({l:[...d], fixed:d.map((_,i)=>i), t:`Lista ordenada: ${fmt(d)}`, end:true});
  return st;
}
function traceQuick(arr){
  const d=[...arr], st=[]; let chamada=0;
  st.push({l:[...d], t:`Lista inicial: ${fmt(d)}`});
  function rec(ini,fim,depth){
    if(depth>60) return;
    chamada++; const c=chamada;
    const ip=Math.floor((ini+fim)/2), pivo=d[ip];
    let i=ini, f=fim;
    st.push({l:[...d], pv:[ip], range:[ini,fim], pass:c,
      t:`Chamada ${c} → quickrec(ini=${ini}, fim=${fim}) em ${fmt(d.slice(ini,fim+1))}. Pivô = elemento central dados[(${ini}+${fim})//2] = dados[${ip}] = ${pivo}.`});
    while(i<=f){
      while(d[i]<pivo) i++;
      while(d[f]>pivo) f--;
      if(i<=f){
        const a=d[i], b=d[f];
        d[i]=b; d[f]=a;
        st.push({l:[...d], sw: i!==f?[i,f]:[i], range:[ini,fim],
          t: i!==f ? `i parou no ${a} (índice ${i}, não é < ${pivo}) e f parou no ${b} (índice ${f}, não é > ${pivo}) → TROCA ${a} com ${b} → ${fmt(d)}`
                   : `i e f pararam no mesmo índice ${i} (valor ${a}) → "troca" consigo mesmo; i e f avançam.`, detail:true});
        i++; f--;
      }
    }
    st.push({l:[...d], range:[ini,fim], mark:{i,f},
      t:`Fim da partição da chamada ${c}: ${fmt(d.slice(ini,fim+1))} (i=${i}, f=${f}). À esquerda ≤ ${pivo}, à direita ≥ ${pivo}.` +
        (f>ini ? ` Chama a 1ª metade (${ini}..${f}).` : '') + (i<fim ? ` Chama a 2ª metade (${i}..${fim}).` : '') +
        (!(f>ini) && !(i<fim) ? ' Nenhuma metade para ordenar.' : '')});
    if(f>ini) rec(ini,f,depth+1);
    if(i<fim) rec(i,fim,depth+1);
  }
  if(d.length>1) rec(0,d.length-1,0);
  st.push({l:[...d], fixed:d.map((_,i)=>i), t:`Lista ordenada: ${fmt(d)}`, end:true});
  return st;
}
function traceBinaria(arr,val){
  const d=[...arr].sort((a,b)=>a-b), st=[]; const ord = arr.join()===d.join();
  st.push({l:[...d], t:(ord?'':`A lista precisa estar ORDENADA, então primeiro ordenamos: ${fmt(d)}. `)+`Procurando o ${val}. i = 0, f = ${d.length-1}.`});
  let i=0, f=d.length-1, it=0; const out=[];
  while(i<=f){
    it++; const ic=Math.floor((i+f)/2);
    const rng=[i,f];
    if(val<d[ic]){
      st.push({l:[...d], pv:[ic], range:rng, pass:it, t:`Iteração ${it}: i=${i}, f=${f} → ic = (${i}+${f})//2 = ${ic}, dados[${ic}] = ${d[ic]}. ${val} < ${d[ic]} → descarta a direita: f = ${ic-1}.`});
      f=ic-1;
    } else if(val>d[ic]){
      st.push({l:[...d], pv:[ic], range:rng, pass:it, t:`Iteração ${it}: i=${i}, f=${f} → ic = (${i}+${f})//2 = ${ic}, dados[${ic}] = ${d[ic]}. ${val} > ${d[ic]} → descarta a esquerda: i = ${ic+1}.`});
      i=ic+1;
    } else {
      st.push({l:[...d], pv:[ic], range:rng, pass:it, end:true, t:`Iteração ${it}: i=${i}, f=${f} → ic = (${i}+${f})//2 = ${ic}, dados[${ic}] = ${d[ic]}. ENCONTROU! Retorna o índice ${ic} (${it} comparação(ões) com o central).`});
      return st;
    }
  }
  st.push({l:[...d], range:[i,f], end:true, t:`i=${i} ficou maior que f=${f} → o ${val} NÃO está na lista. Retorna -1.`});
  return st;
}
const NOMES={bubble:'Bubble sort (bolha)',selection:'Selection sort (seleção)',quick:'Quick sort',binaria:'Busca binária'};
function trace(alg,lista,val){
  return alg==='bubble'?traceBubble(lista):alg==='selection'?traceSelection(lista):alg==='quick'?traceQuick(lista):traceBinaria(lista,val);
}
function parseNums(s){ return (s.match(/-?\d+/g)||[]).map(Number); }

