// Baralho do Anki (.apkg, src/anki.js): o zip abre, o banco SQLite passa no integrity_check do próprio SQLite e tem
// o esquema e as linhas que o Anki lê (col, notes, cards). Usa o SQLite embutido do Node (node:sqlite, Node 22.5+).
// Uso: node src/testes/teste_anki.js
const fs = require('fs'), vm = require('vm'), path = require('path'), os = require('os');
const ctx = vm.createContext({ TextEncoder, BigInt });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'anki.js'), 'utf8') + '\nthis.ANKI = ANKI;', ctx);
const { gerarApkg, sha1 } = ctx.ANKI;
let falhas = 0, n = 0;
const ok = (nome, cond, det) => { n++; if (!cond) { falhas++; console.log('  FALHOU: ' + nome + (det !== undefined ? ' — ' + det : '')); } };
let sqlite; try { sqlite = require('node:sqlite'); } catch (e) { console.log('node:sqlite indisponível neste Node — pulado'); process.exit(0); }

ok('sha1 conhecido', sha1('abc') === 'a9993e364706816aba3e25717850c26c9cd0d89d', sha1('abc'));
// lê o zip sem compressão
function doZip(bytes) {
  const out = {}; let o = 0; const b = Buffer.from(bytes);
  while (b.readUInt32LE(o) === 0x04034b50) {
    const t = b.readUInt32LE(o + 18), nl = b.readUInt16LE(o + 26), el = b.readUInt16LE(o + 28);
    const nome = b.slice(o + 30, o + 30 + nl).toString('utf8'); out[nome] = b.slice(o + 30 + nl + el, o + 30 + nl + el + t); o += 30 + nl + el + t;
  }
  return out;
}
function abrir(cartoes, nome) {
  const z = doZip(gerarApkg(cartoes, nome, 1758800000000));
  const arq = path.join(os.tmpdir(), 'propons-anki-' + process.pid + '-' + Math.random().toString(36).slice(2) + '.anki2');
  fs.writeFileSync(arq, z['collection.anki2']);
  const db = new sqlite.DatabaseSync(arq);
  return { z, db, fim: () => { db.close(); fs.unlinkSync(arq); } };
}
const poucos = [{ frente: 'O que é fotossíntese?', verso: 'Processo em que a planta usa luz para produzir glicose.\nOcorre no cloroplasto.' }, { frente: '2 < 3 & 5 > 4?', verso: 'Sim' }, { frente: 'Capital do Brasil', verso: 'Brasília' }];
{
  const { z, db, fim } = abrir(poucos, 'Biologia ENEM');
  ok('zip tem collection.anki2 e media', !!z['collection.anki2'] && z.media && z.media.toString() === '{}');
  ok('integrity_check do SQLite', db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok');
  const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name).join(',');
  ok('tabelas do Anki', tabelas === 'cards,col,graves,notes,revlog', tabelas);
  const col = db.prepare('SELECT * FROM col').get();
  ok('col: versão 11 e baralho com o nome', col.ver === 11 && JSON.parse(col.decks)[String(1758800000000)].name === 'Biologia ENEM', col.ver);
  const modelo = Object.values(JSON.parse(col.models))[0];
  ok('col: modelo com Frente e Verso', modelo.flds.map(f => f.name).join() === 'Frente,Verso' && /\{\{Verso\}\}/.test(modelo.tmpls[0].afmt));
  const notas = db.prepare('SELECT * FROM notes ORDER BY id').all();
  ok('3 notas com os dois campos (HTML escapado, quebra vira <br>)', notas.length === 3 && notas[0].flds === 'O que é fotossíntese?\x1fProcesso em que a planta usa luz para produzir glicose.<br>Ocorre no cloroplasto.' && notas[1].flds.startsWith('2 &lt; 3 &amp; 5 &gt; 4?'), JSON.stringify(notas[1]));
  ok('csum = começo do SHA-1 do primeiro campo', notas[2].csum === parseInt(sha1('Capital do Brasil').slice(0, 8), 16));
  const cards = db.prepare('SELECT * FROM cards ORDER BY id').all();
  ok('3 cartões novos ligados às notas e ao baralho', cards.length === 3 && cards.every((c, i) => c.nid === notas[i].id && c.type === 0 && c.queue === 0 && c.due === i + 1 && c.did === 1758800000000));
  fim();
}
{
  // muitos cartões: a árvore B precisa de páginas internas
  const muitos = Array.from({ length: 1500 }, (_, i) => ({ frente: 'Pergunta número ' + i + ' ' + 'x'.repeat(i % 300), verso: 'Resposta ' + i + ' — ' + 'y'.repeat((i * 7) % 900) }));
  const { db, fim } = abrir(muitos, 'Grande');
  ok('1500 cartões: integrity_check', db.prepare('PRAGMA integrity_check').get().integrity_check === 'ok');
  ok('1500 cartões: todas as notas e cartões', db.prepare('SELECT count(*) c FROM notes').get().c === 1500 && db.prepare('SELECT count(*) c FROM cards').get().c === 1500);
  ok('1500 cartões: busca por id funciona (árvore em ordem)', db.prepare('SELECT flds FROM notes WHERE id = ?').get(1758800000000 + 1234).flds.startsWith('Pergunta número 1234'));
  fim();
}
let erro = ''; try { gerarApkg([], 'x'); } catch (e) { erro = e.message; }
ok('sem cartões: erro claro', /nenhum cartão/.test(erro), erro);
if (falhas) { console.log(`${falhas} de ${n} falharam`); process.exit(1); }
console.log(`baralho do Anki (.apkg): ${n} verificações no SQLite`);
// CI: grava um .apkg para o Anki de verdade importar (ferramentas/teste_anki_real.py)
if (process.env.ANKI_SAIDA) fs.writeFileSync(process.env.ANKI_SAIDA, gerarApkg(poucos, 'Própons teste'));
