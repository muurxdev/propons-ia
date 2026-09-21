/* Resumo exato do algoritmo (gerado por código a partir dos passos — não passa pelo modelo) */
function resumo(alg, lista, val){
  const st = trace(alg, lista, val), f = a => "`" + fmt(a) + "`", ord = st[st.length - 1].l;
  const L = [];
  if (alg === 'bubble'){
    L.push('No **bubble sort**, cada passada compara vizinhos e empurra o **maior valor restante** para o fim.', '');
    const fins = st.filter(s => s.pass);
    for (const s of fins){
      if (s.end) L.push(`- **Passada ${s.pass}:** nenhuma troca, então a lista já está ordenada e o algoritmo para.`);
      else { const i = s.fixed[s.fixed.length - 1]; L.push(`- **Passada ${s.pass}:** o **${s.l[i]}** foi para a posição final (índice ${i}) → ${f(s.l)}`); }
    }
    const trocas = st.filter(s => s.sw).length;
    L.push('', `Resultado: **${f(ord)}**, com ${trocas} ${trocas === 1 ? 'troca' : 'trocas'}.`);
  } else if (alg === 'selection'){
    L.push('No **selection sort**, cada passo procura o **menor valor restante** e o coloca na posição atual.', '');
    for (const s of st.filter(s => s.pass)){
      const i = s.pass - 1;
      L.push(s.sw ? `- **Passo ${s.pass}:** o **${s.l[i]}** foi para o índice ${i} → ${f(s.l)}` : `- **Passo ${s.pass}:** o **${s.l[i]}** já estava no índice ${i}.`);
    }
    L.push('', `Resultado: **${f(ord)}**.`);
  } else if (alg === 'quick'){
    L.push('No **quick sort**, o pivô é o **elemento central**; os menores vão para a esquerda, os maiores para a direita, e cada lado é ordenado de novo.', '');
    const chamadas = st.filter(s => s.pass), fins = st.filter(s => s.mark);
    chamadas.forEach((s, k) => {
      const [a, b] = s.range, depois = fins[k] ? fins[k].l.slice(a, b + 1) : null;
      L.push(`- **Chamada ${s.pass}:** ${f(s.l.slice(a, b + 1))}, pivô **${s.l[s.pv[0]]}**` + (depois ? ` → ${f(depois)}` : ''));
    });
    L.push('', `Resultado: **${f(ord)}**.`);
  } else {
    const it = st.filter(s => s.pv), ult = st[st.length - 1], achou = /ENCONTROU/.test(ult.t);
    L.push(`Na **busca binária**, a lista precisa estar ordenada e, a cada passo, olhamos o **elemento do meio** e descartamos metade.`, '');
    if (st[0].t.startsWith('A lista precisa')) L.push(`- A lista foi ordenada antes: ${f(st[0].l)}`);
    it.forEach((s, k) => L.push(`- **Passo ${k + 1}:** meio = **${s.l[s.pv[0]]}** (índice ${s.pv[0]})`));
    L.push('', achou ? `Resultado: **${val}** encontrado no índice **${it[it.length - 1].pv[0]}**, com ${it.length} ${it.length === 1 ? 'comparação' : 'comparações'}.` : `Resultado: **${val}** não está na lista (retorna -1).`);
  }
  return L.join('\n');
}
