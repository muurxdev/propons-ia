// Gera os arquivos de exemplo usados pelo teste_pc.mjs: teste.pdf (2 páginas) e teste.docx, sem dependências.
// Uso: node src/testes/gerar_arquivos.mjs <pasta>   (o teste_pc.mjs procura em <saida>/../)
import fs from 'node:fs';
import path from 'node:path';
const pasta = process.argv[2] || 'dist';
fs.mkdirSync(pasta, { recursive: true });

// PDF mínimo com texto de verdade em duas páginas (fonte Helvetica, sem acentos)
function pdf(paginas) {
  const objs = [];
  const add = s => { objs.push(s); return objs.length; };
  const fonte = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const raiz = objs.length + 1; objs.push(null); // Pages, preenchido depois
  const kids = [];
  for (const linhas of paginas) {
    const conteudo = 'BT /F1 14 Tf 72 740 Td 18 TL ' + linhas.map(l => `(${l.replace(/[()\\]/g, '\\$&')}) '`).join(' ') + ' ET';
    const c = add(`<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
    kids.push(add(`<< /Type /Page /Parent ${raiz} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fonte} 0 R >> >> /Contents ${c} 0 R >>`));
  }
  objs[raiz - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const cat = add(`<< /Type /Catalog /Pages ${raiz} 0 R >>`);
  let out = '%PDF-1.4\n'; const pos = [];
  objs.forEach((o, i) => { pos.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + pos.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

// ZIP sem compressão (suficiente para um .docx que o mammoth lê)
const TAB = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = b => { let c = 0xffffffff; for (const x of b) c = TAB[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(arquivos) {
  const partes = [], central = []; let off = 0;
  for (const [nome, texto] of arquivos) {
    const dados = Buffer.from(texto, 'utf8'), n = Buffer.from(nome), crc = crc32(dados);
    const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt32LE(crc, 14);
    loc.writeUInt32LE(dados.length, 18); loc.writeUInt32LE(dados.length, 22); loc.writeUInt16LE(n.length, 26);
    const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(dados.length, 20); cen.writeUInt32LE(dados.length, 24); cen.writeUInt16LE(n.length, 28); cen.writeUInt32LE(off, 42);
    partes.push(loc, n, dados); central.push(cen, n); off += 30 + n.length + dados.length;
  }
  const c = Buffer.concat(central), fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10); fim.writeUInt32LE(c.length, 12); fim.writeUInt32LE(off, 16);
  return Buffer.concat([...partes, c, fim]);
}
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docx = paragrafos => zip([
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${W}><w:body>${paragrafos.map(p => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`],
]);

fs.writeFileSync(path.join(pasta, 'teste.pdf'), pdf([
  ['Fotossintese', 'As plantas usam luz, agua e gas carbonico para produzir glicose e oxigenio.', 'A energia do sol fica guardada na glicose.'],
  ['Quick sort', 'O quick sort escolhe um pivo e separa a lista em menores e maiores.', 'Depois ordena cada parte do mesmo jeito.'],
]));
fs.writeFileSync(path.join(pasta, 'teste.docx'), docx(['A mitocondria produz energia para a celula.', 'Segundo paragrafo: o nucleo guarda o DNA.']));
console.log(`teste.pdf e teste.docx gravados em ${pasta}`);
