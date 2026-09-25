/* ---------------- "Me ensina", "Estudar isto", sugestões para começar e sequência de estudo ----------------
   Ideias vindas dos melhores apps de estudo (ChatGPT Study Mode, Gemini Guided Learning, Khanmigo, NotebookLM,
   Duolingo), feitas para rodar no aparelho:
   - Me ensina: a conversa inteira vira tutor — perguntas e dicas em vez da resposta pronta (fica ligado até desligar);
   - Estudar isto: qualquer resposta vira flashcards, quiz ou resumo com um toque;
   - sugestões para começar na tela inicial (por matéria, sorteadas);
   - sequência de dias estudando, gentil: um dia de descanso por semana não quebra a sequência. */
ICO.tutor = '<svg viewBox="0 0 24 24"><path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11.2V16c0 1.6 2.2 3 5 3s5-1.4 5-3v-4.8"/><path d="M21 9v5"/></svg>';
const INSTRUCAO_TUTOR = 'MODO "ME ENSINA" (você é tutor): não entregue a resposta final de cara. Descubra o que a pessoa já sabe, faça UMA pergunta curta por vez que leve ao próximo passo, dê uma dica pequena quando ela travar e elogie o raciocínio certo. Se ela errar, mostre onde está o erro sem dar a resposta. Só mostre a solução completa se ela pedir ("me mostra a resposta") ou depois de três tentativas. Respostas curtas, em tom de conversa.';
MODOS.tutor = { nome: 'Me ensina', desc: 'A IA te guia com perguntas e dicas, sem entregar a resposta de cara', ico: 'tutor', placeholder: 'Diga o exercício ou o assunto que quer aprender…',
  instrucao: 'Vamos estudar no modo "Me ensina" (siga as instruções de tutor). O que eu quero aprender:' };
const tutorLigado = conv => !!(conv && conv.tutor);
function desligarTutor() { if (atual) { delete atual.tutor; salvar(); } desenharChips(); toast('"Me ensina" desligado: a IA volta a responder direto.'); }

/* Estudar isto: menu com Flashcards, Quiz e Resumo a partir de uma resposta */
function estudarIsto(m, botao) {
  const texto = String(m.texto || '').slice(0, 6000); if (!texto.trim()) return;
  const mandar = modo => { definirModo(modo); enviar('Sobre este conteúdo:\n\n' + texto, []); };
  menuFlutuante(botao, [
    [ICO.cartoes, 'Criar flashcards disto', () => mandar('flashcards')],
    [ICO.quiz, 'Criar um quiz disto', () => mandar('quiz')],
    [ICO.resumo, 'Resumir para estudar', () => mandar('resumo')],
    [ICO.tutor, 'Me ensinar isto passo a passo', () => mandar('tutor')],
  ], 'Estudar isto');
}

/* sugestões para começar (tela inicial): quatro sorteadas, de matérias diferentes */
const SUGESTOES_INICIO = [
  ['Biologia', 'Explique a fotossíntese de um jeito simples'], ['Biologia', 'Qual a diferença entre mitose e meiose?'],
  ['Matemática', 'Me ensina a resolver equação do 2º grau'], ['Matemática', 'Como calcular porcentagem de cabeça?'],
  ['História', 'Resuma as causas da Revolução Francesa'], ['História', 'O que foi a Era Vargas?'],
  ['Redação', 'Como fazer uma boa proposta de intervenção no ENEM?'], ['Português', 'Quando usar crase? Me dá exemplos'],
  ['Física', 'Explique as leis de Newton com exemplos do dia a dia'], ['Química', 'O que é balanceamento de equação química?'],
  ['Geografia', 'Quais são os biomas do Brasil?'], ['Inglês', 'Monte um quiz de verbos irregulares em inglês'],
];
function htmlSugestoesInicio() {
  const porMateria = {}; SUGESTOES_INICIO.forEach(([m, t]) => (porMateria[m] = porMateria[m] || []).push(t));
  const materias = Object.keys(porMateria).sort(() => Math.random() - 0.5).slice(0, 4);
  return `<div class="inicio-sug">${materias.map(m => { const l = porMateria[m], t = l[Math.floor(Math.random() * l.length)]; return `<button type="button" data-inicio="${esc(t)}">${ICO.seguir}<span>${esc(t)}</span></button>`; }).join('')}</div>`;
}
function ligarSugestoesInicio(raiz) {
  raiz.querySelectorAll('[data-inicio]').forEach(b => b.onclick = () => enviar(b.dataset.inicio, []));
}

/* sequência de estudo: dias (AAAA-MM-DD) em que houve pergunta; descanso de 1 dia por semana não quebra */
const hojeISO = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const diasEstudo = () => { try { const l = JSON.parse(pref('diasEstudo') || '[]'); return Array.isArray(l) ? l.filter(x => /^\d{4}-\d\d-\d\d$/.test(x)) : []; } catch (e) { return []; } };
function marcarDiaDeEstudo() {
  const l = diasEstudo(), h = hojeISO(); if (l.includes(h)) return;
  l.push(h); pref('diasEstudo', JSON.stringify(l.slice(-400)));
}
function sequenciaDeEstudo(hoje = new Date()) {
  const dias = new Set(diasEstudo()); let n = 0, descansos = 0, semDescanso = 0;
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  if (!dias.has(hojeISO(d))) d.setDate(d.getDate() - 1);   // hoje ainda não estudou: conta até ontem
  for (let i = 0; i < 400; i++) {
    if (dias.has(hojeISO(d))) { n++; semDescanso++; }
    else if (n > 0 && semDescanso >= 6 && descansos < 60) { descansos++; semDescanso = 0; }   // um dia de descanso depois de 6 seguidos
    else break;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
const htmlSequencia = () => { const n = sequenciaDeEstudo(); return n >= 2 ? `<span class="sequencia" title="Um dia de descanso por semana não quebra a sequência">🔥 ${n} dias estudando</span>` : ''; };
