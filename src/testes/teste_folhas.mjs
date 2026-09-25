// Menus no celular (tela de 390 px): o menu principal decide a altura, o que abre por cima entra pela direita do mesmo
// tamanho, e puxar para baixo de qualquer ponto (com o conteúdo no topo) fecha. Roda na interface montada (sem motor).
// Uso: node src/testes/teste_folhas.mjs <porta-cdp de um navegador headless> <pasta-saida>
import { conectar, espera, relatorio } from './cdp.mjs';
import path from 'node:path';
const [porta = 9555, saida = 'dist/teste-folhas'] = process.argv.slice(2);
const { ok, resumo } = relatorio();
// o navegador de teste abre já na interface (msedge --headless=new --remote-debugging-port=9555 file:///…/payload/interface/index.html)
const { js, cdp, foto } = await conectar({ porta, saida, filtro: u => /index.html/.test(u), timeoutMs: 20000 });
await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// página do navegador sem janela fica "oculta": sem quadros, as transições não andam e os toques travam
await cdp('Page.bringToFront', {}); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
const pagina = 'file:///' + path.resolve('payload/interface/index.html').replace(/\\/g, '/');
await cdp('Page.navigate', { url: pagina }); await espera(1500);   // de novo, já com a tela de celular
for (let i = 0; i < 40 && !(await js(`typeof abrirConfig === 'function'`).catch(() => false)); i++) await espera(250);
const toque = async (tipo, x, y) => cdp('Input.dispatchTouchEvent', { type: tipo, touchPoints: tipo === 'touchEnd' ? [] : [{ x, y }] });
async function puxar(x, y, dist) {
  await toque('touchStart', x, y); await espera(30);
  for (let d = 10; d <= dist; d += 20) { await toque('touchMove', x, y + d); await espera(16); }
  await toque('touchEnd'); await espera(450);
}

// 1) Ajustes: a página do módulo tem a altura do menu principal
await js(`abrirConfig(); 1`); await espera(700);
const hMenu = await js(`$('.painel').offsetHeight`);
await js(`irPara('geral'); 1`); await espera(600);
const hSub = await js(`$('.painel').offsetHeight`);
ok('Ajustes: módulo abre do tamanho do menu principal (sem pular para tela cheia)', Math.abs(hSub - hMenu) <= 2 && hMenu < 844 - 60, `${hMenu} → ${hSub} px`);
ok('Ajustes: módulo entra pela direita', await js(`getComputedStyle($('.p-conteudo')).visibility === 'visible' && $('.painel').classList.contains('sub')`));
await foto('f1-ajustes-modulo');

// 2) arrastar de qualquer ponto do conteúdo (no topo) fecha os Ajustes
const r = await js(`(() => { const c = $('#corpoConfig'); c.scrollTop = 0; const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 60 }; })()`);
await puxar(r.x, r.y, 320); await espera(300);
ok('Ajustes: puxar o conteúdo para baixo fecha', await js(`!document.querySelector('.painel-fundo:not(.saindo)')`));

// 3) menu por cima de outro: mesma altura e entra pela direita; o de baixo recua
await js(`abrirConfig(); 1`); await espera(700);
const hAj = await js(`$('.painel').offsetHeight`);
js(`confirmar('Teste', 'Menu aberto por cima dos Ajustes.', 'Ok')`); await espera(600);
const cima = await js(`(() => { const f = [...document.querySelectorAll('.dlg-fundo')].pop(); return { lado: f.classList.contains('lado'), h: f.firstElementChild.offsetHeight, atras: !!document.querySelector('.painel-fundo.atras') }; })()`);
ok('menu por cima: entra pela direita com a altura do de baixo', cima.lado && Math.abs(cima.h - hAj) <= 2, JSON.stringify(cima) + ' × ' + hAj);
ok('menu por cima: o de baixo recua', cima.atras);
await foto('f2-por-cima');
await js(`document.querySelectorAll('.dlg-fundo, .painel-fundo').forEach(f => f.remove()); 1`); await espera(200);

// 4) folha comprida (lista que rola): puxar de qualquer ponto, com a lista no topo, fecha; com a lista rolada, rola
await js(`perguntar('Lista comprida', Array.from({ length: 60 }, (_, i) => '<p>Linha ' + i + '</p>').join(''), [['Ok', 1, 'primario']]); 1`); await espera(600);
const rola = await js(`document.querySelector('.dlg').classList.contains('rola')`);
const meio = await js(`(() => { const b = document.querySelector('.dlg').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
await js(`document.querySelector('.dlg').scrollTop = 200; 1`);
await puxar(meio.x, meio.y, 150);
ok('folha comprida: com a lista rolada, o dedo rola e não fecha', rola && (await js(`!!document.querySelector('.dlg-fundo:not(.saindo)')`)));
await js(`document.querySelector('.dlg').scrollTop = 0; 1`); await espera(100);
await puxar(meio.x, meio.y, 320);
ok('folha comprida: com a lista no topo, puxar do meio fecha', await js(`!document.querySelector('.dlg-fundo:not(.saindo)')`));
// 5) Ajustes → Respostas e a ajuda (!): balão pequeno, dentro da tela, fecha ao tocar fora
await js(`abrirConfig('respostas'); 1`); await espera(900);
const resp = await js(`(() => { const c = $('#corpoConfig'); return { secoes: [...c.querySelectorAll('.secao > h4')].map(h => h.textContent.trim()), ajudas: c.querySelectorAll('.ajuda').length, entra: c.querySelectorAll('.entra').length, titulo: !!$('#pTitulo .ajuda') }; })()`);
ok('Respostas: instruções, tamanho, nível, esforço, compactar e Enter', ['Instruções para a IA', 'Tamanho das respostas', 'Seu nível de estudo', 'Esforço de cada modelo', 'Compactar sozinho', 'Enter envia'].every(t => resp.secoes.includes(t)), resp.secoes.join(' · '));
ok('(!) em cada seção e no título do módulo', resp.ajudas >= 6 && resp.titulo, `${resp.ajudas} botões`);
ok('blocos entram um depois do outro', resp.entra >= 3, `${resp.entra} blocos animados`);
await js(`$('#pTitulo .ajuda').click(); 1`); await espera(350);
const bal = await js(`(() => { const b = document.querySelector('.balao'); if (!b) return null; const r = b.getBoundingClientRect(); return { dentro: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, largura: Math.round(r.width), texto: b.textContent.slice(0, 60) }; })()`);
ok('(!) abre um balão pequeno dentro da tela', bal && bal.dentro && bal.largura <= 300, JSON.stringify(bal));
await foto('f3-ajuda');
await js(`document.body.click(); 1`); await espera(200);
ok('balão fecha ao tocar fora', await js(`!document.querySelector('.balao')`));
await js(`pref('instrucoes', 'Use exemplos de futebol.'); pref('tamanhoResposta', 'curtas'); 1`);
ok('instruções e tamanho entram no texto de sistema', await js(`/exemplos de futebol/.test(textoPreferencias()) && /curtas/.test(textoPreferencias())`));
await js(`pref('instrucoes', ''); pref('tamanhoResposta', 'normais'); 1`);
await js(`document.querySelectorAll('.painel-fundo, .dlg-fundo, .balao').forEach(f => f.remove()); 1`); await espera(200);

// 6) página curta dos Ajustes (nada rola): puxar do meio do conteúdo fecha — antes só o topo fechava
await js(`abrirConfig('sobre'); 1`); await espera(900);
const meioSobre = await js(`(() => { const c = $('#corpoConfig'); const b = c.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + Math.min(b.height / 2, 200), rola: c.scrollHeight - c.clientHeight }; })()`);
await puxar(meioSobre.x, meioSobre.y, 320); await espera(300);
ok('Ajustes (página curta): puxar do meio fecha', await js(`!document.querySelector('.painel-fundo:not(.saindo)')`), 'rolagem ' + meioSobre.rola + ' px');

// 7) folha do raciocínio com o texto ainda chegando: não pula para o fim e fecha puxando de qualquer ponto
await js(`window.__pensa = 'Primeira linha do raciocínio.'; abrirFolhaPensa(window.__pensa, null); 1`); await espera(500);
await js(`for (let i = 0; i < 80; i++) { window.__pensa += ' Mais um passo ' + i + ' do raciocínio que continua chegando.'; atualizarFolhaPensa(window.__pensa); } 1`); await espera(200);
const pen = await js(`(() => { const t = document.querySelector('.pens-txt'); const b = t.getBoundingClientRect(); return { topo: t.scrollTop, x: b.left + b.width / 2, y: b.top + 80 }; })()`);
ok('raciocínio chegando não puxa a rolagem para o fim', pen.topo === 0, 'scrollTop ' + pen.topo);
await puxar(pen.x, pen.y, 320); await espera(300);
ok('raciocínio: puxar do meio do texto fecha', await js(`!document.querySelector('.dlg-fundo:not(.saindo) .pensa-folha')`));

// 8) cartões dos modelos (dados de exemplo): selo, três medidas e para que serve
await js(`sistemaCache = { ramTotal: 8 * GB, discoLivre: 100 * GB, modelos: [
  { id: 'leve', nome: 'Leve', tamanho: 532517120, baixado: true, visaoTamanho: 204987232 },
  { id: 'normal', nome: 'Normal', tamanho: 1280835840, baixado: true, atual: true, visaoTamanho: 668227264 },
  { id: 'avancado', nome: 'Avançado', tamanho: 2740937888, visaoTamanho: 672423616 }] }; lerSistema = async () => sistemaCache; abrirConfig('modelo'); 1`);
await espera(1200);
const cards = await js(`[...document.querySelectorAll('.mcard')].map(c => ({ selo: !!c.querySelector('.logo-modelo svg'), medidas: c.querySelectorAll('.mmed').length, desc: (c.querySelector('.mdesc') || {}).textContent || '' }))`);
ok('Modelos: cada cartão com a logo do modelo, 3 medidas e para que serve', cards.length === 3 && cards.every(c => c.selo && c.medidas === 3 && c.desc.length > 10), JSON.stringify(cards.map(c => c.medidas)));
await foto('f4-modelos');

// 9) puxar para cima: a folha cresce com o dedo e, soltando, cobre a tela inteira
await js(`document.querySelectorAll('.dlg-fundo, .painel-fundo').forEach(f => f.remove()); abrirMais(); 1`); await espera(700);
const alca = await js(`(() => { const b = document.querySelector('.dlg.mais .dlg-topo').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 12, h: document.querySelector('.dlg.mais').offsetHeight }; })()`);
await toque('touchStart', alca.x, alca.y); await espera(30);
for (let d = 10; d <= 260; d += 20) { await toque('touchMove', alca.x, alca.y - d); await espera(16); }
await toque('touchEnd'); await espera(500);
const cheia = await js(`(() => { const f = document.querySelector('.dlg.mais'); return { h: f.offsetHeight, cheia: f.classList.contains('cheia'), tela: innerHeight }; })()`);
ok('puxar a folha para cima faz ela cobrir a tela', cheia.cheia && cheia.h > cheia.tela * 0.9 && cheia.h > alca.h, JSON.stringify([alca.h, cheia]));
await foto('f5-cheia');
// 10) da tela cheia, puxar para baixo volta ao tamanho normal (não fecha de uma vez); do normal, puxar fecha
await toque('touchStart', alca.x, 30); await espera(30);
for (let d = 10; d <= 300; d += 20) { await toque('touchMove', alca.x, 30 + d); await espera(16); }
await toque('touchEnd'); await espera(600);
const volta = await js(`(() => { const f = document.querySelector('.dlg-fundo:not(.saindo) .dlg.mais'); return f ? { h: f.offsetHeight, cheia: f.classList.contains('cheia') } : null; })()`);
ok('da tela cheia, puxar para baixo volta ao tamanho normal (sem fechar)', !!volta && !volta.cheia && Math.abs(volta.h - alca.h) <= 4, JSON.stringify([alca.h, volta]));
const topo2 = await js(`(() => { const b = document.querySelector('.dlg.mais .dlg-topo').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 12 }; })()`);
await toque('touchStart', topo2.x, topo2.y); await espera(30);
for (let d = 10; d <= 260; d += 20) { await toque('touchMove', topo2.x, topo2.y + d); await espera(16); }
await toque('touchEnd'); await espera(600);
ok('do tamanho normal, puxar para baixo fecha', await js(`!document.querySelector('.dlg-fundo:not(.saindo) .dlg.mais')`));
// o topo da folha é opaco: o conteúdo que rola por baixo não aparece nas laterais
// um tremor de poucos pixels (rápido) não fecha a folha — só um puxão de verdade
await js(`document.querySelectorAll('.dlg-fundo').forEach(f => f.remove()); abrirMais(); 1`); await espera(700);
const t3 = await js(`(() => { const b = document.querySelector('.dlg.mais .dlg-topo').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 12 }; })()`);
await toque('touchStart', t3.x, t3.y); await espera(16); await toque('touchMove', t3.x, t3.y + 20); await espera(16); await toque('touchEnd'); await espera(500);
ok('arrastar só um pouquinho (rápido) não fecha a folha', await js(`!!document.querySelector('.dlg-fundo:not(.saindo) .dlg.mais')`));
// fonte aberta da lista: a lista fica parada embaixo; "Abrir página" não fecha o popup; fechar volta para a lista
await js(`document.querySelectorAll('.dlg-fundo').forEach(f => f.remove()); window.__abrir0 = PLATAFORMA.abrirLink; PLATAFORMA.abrirLink = u => { window.__abriu = u; }; abrirListaFontes([{ titulo: 'Wikipédia', url: 'https://pt.wikipedia.org/wiki/X' }, { titulo: 'G1', url: 'https://g1.globo.com/' }]); 1`); await espera(600);
await js(`document.querySelector('.fontes-lista a').click(); 1`); await espera(600);
const fl = await js(`JSON.stringify({ atras: document.querySelector('.fontes-dlg').closest('.dlg-fundo').classList.contains('atras'), focoNoEndereco: document.activeElement && document.activeElement.classList.contains('fonte-url') })`);
await js(`document.querySelector('.fonte-dlg [data-abrir]').click(); 1`); await espera(400);
const fl2 = await js(`JSON.stringify({ abriu: !!window.__abriu, popup: !!document.querySelector('.dlg-fundo:not(.saindo) .fonte-dlg') })`);
await js(`document.querySelector('.fonte-dlg [data-x]').click(); 1`); await espera(500);
ok('fonte aberta da lista: a lista fica parada, o endereço não vem selecionado e "Abrir página" não fecha', !JSON.parse(fl).atras && !JSON.parse(fl).focoNoEndereco && JSON.parse(fl2).abriu && JSON.parse(fl2).popup, fl + ' ' + fl2);
ok('fechar a fonte volta para a lista (que continua aberta)', await js(`!!document.querySelector('.dlg-fundo:not(.saindo) .fontes-dlg')`));
await js(`PLATAFORMA.abrirLink = window.__abrir0; document.querySelectorAll('.dlg-fundo').forEach(f => f.remove()); 1`);
// raciocínio aberto antes de começar: anel girando; quando o texto chega, ele sai
await js(`document.querySelectorAll('.dlg-fundo').forEach(f => f.remove()); folhaPensa = null; abrirFolhaPensa('', null); 1`); await espera(500);
const esperaPensa = await js(`(() => { const a = document.querySelector('.pens-anel'); return !!a && getComputedStyle(a).animationName === 'girar'; })()`);
await js(`atualizarFolhaPensa('Primeiro passo do raciocínio.'); 1`); await espera(100);
ok('raciocínio ainda vazio mostra o anel girando e some quando o texto chega', esperaPensa && await js(`!document.querySelector('.pens-espera') && /Primeiro passo/.test(document.querySelector('.pens-txt').textContent)`));
await js(`folhaPensa && folhaPensa.fechar(); 1`); await espera(400);
ok('o topo da folha cobre as laterais (conteúdo não vaza por cima)', await js(`(() => { abrirConhecimentos(); const t = document.querySelector('.dlg.conh .dlg-topo'); const s = getComputedStyle(t); return s.position === 'sticky' && /24px/.test(s.boxShadow) && s.clipPath !== 'none'; })()`));
resumo();
