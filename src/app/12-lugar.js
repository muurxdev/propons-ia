/* ---------------- lugar, hora e clima (dados reais, não chute do modelo) ----------------
   "Que horas são em Londres?", "como está o tempo aqui?", "onde eu estou?": antes de a IA responder, o app pega os
   dados de verdade e entrega prontos — ela só explica. A hora de outra cidade é calculada no aparelho (fuso oficial,
   sem internet para as cidades conhecidas); "aqui" usa a localização do aparelho, pedida pelo próprio sistema (se ela
   não estiver disponível, uma posição aproximada pela internet, dita como aproximada); o clima vem do Open-Meteo
   (temperatura, sensação, umidade, vento com direção e rajadas, chuva, máxima/mínima, nascer e pôr do sol, UV).
   Só vai para a internet o nome da cidade ou as coordenadas, e só nessas perguntas. Um cartão mostra os números na
   conversa, com o nome do lugar, latitude/longitude e de onde veio cada dado. */
ICO.clima = '<svg viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.5 4.3 4.3 0 0 0 7 18z"/></svg>';
// cidades conhecidas: [nome, outros nomes, país, fuso, latitude, longitude] — hora sem internet
const CIDADES = [
  ['São Paulo', 'sao paulo|sp|sampa', 'Brasil', 'America/Sao_Paulo', -23.55, -46.63], ['Rio de Janeiro', 'rio de janeiro|rio', 'Brasil', 'America/Sao_Paulo', -22.91, -43.17],
  ['Brasília', 'brasilia|df', 'Brasil', 'America/Sao_Paulo', -15.79, -47.88], ['Belo Horizonte', 'belo horizonte|bh', 'Brasil', 'America/Sao_Paulo', -19.92, -43.94],
  ['Salvador', 'salvador', 'Brasil', 'America/Bahia', -12.97, -38.51], ['Fortaleza', 'fortaleza', 'Brasil', 'America/Fortaleza', -3.72, -38.54],
  ['Recife', 'recife', 'Brasil', 'America/Recife', -8.05, -34.88], ['Manaus', 'manaus', 'Brasil', 'America/Manaus', -3.12, -60.02],
  ['Belém', 'belem', 'Brasil', 'America/Belem', -1.46, -48.49], ['Curitiba', 'curitiba', 'Brasil', 'America/Sao_Paulo', -25.43, -49.27],
  ['Porto Alegre', 'porto alegre|poa', 'Brasil', 'America/Sao_Paulo', -30.03, -51.23], ['Goiânia', 'goiania', 'Brasil', 'America/Sao_Paulo', -16.69, -49.26],
  ['Florianópolis', 'florianopolis|floripa', 'Brasil', 'America/Sao_Paulo', -27.6, -48.55], ['Vitória', 'vitoria', 'Brasil', 'America/Sao_Paulo', -20.32, -40.34],
  ['Natal', 'natal', 'Brasil', 'America/Fortaleza', -5.79, -35.21], ['João Pessoa', 'joao pessoa', 'Brasil', 'America/Fortaleza', -7.12, -34.86],
  ['Maceió', 'maceio', 'Brasil', 'America/Maceio', -9.67, -35.74], ['Aracaju', 'aracaju', 'Brasil', 'America/Maceio', -10.91, -37.07],
  ['Teresina', 'teresina', 'Brasil', 'America/Fortaleza', -5.09, -42.8], ['São Luís', 'sao luis', 'Brasil', 'America/Fortaleza', -2.53, -44.3],
  ['Cuiabá', 'cuiaba', 'Brasil', 'America/Cuiaba', -15.6, -56.1], ['Campo Grande', 'campo grande', 'Brasil', 'America/Campo_Grande', -20.47, -54.62],
  ['Porto Velho', 'porto velho', 'Brasil', 'America/Porto_Velho', -8.76, -63.9], ['Rio Branco', 'rio branco', 'Brasil', 'America/Rio_Branco', -9.97, -67.81],
  ['Boa Vista', 'boa vista', 'Brasil', 'America/Boa_Vista', 2.82, -60.67], ['Macapá', 'macapa', 'Brasil', 'America/Belem', 0.03, -51.07],
  ['Palmas', 'palmas', 'Brasil', 'America/Araguaina', -10.18, -48.33], ['Fernando de Noronha', 'fernando de noronha|noronha', 'Brasil', 'America/Noronha', -3.85, -32.42],
  ['Lisboa', 'lisboa|lisbon', 'Portugal', 'Europe/Lisbon', 38.72, -9.14], ['Porto', 'cidade do porto', 'Portugal', 'Europe/Lisbon', 41.15, -8.61],
  ['Londres', 'londres|london', 'Reino Unido', 'Europe/London', 51.51, -0.13], ['Paris', 'paris', 'França', 'Europe/Paris', 48.86, 2.35],
  ['Madri', 'madri|madrid', 'Espanha', 'Europe/Madrid', 40.42, -3.7], ['Barcelona', 'barcelona', 'Espanha', 'Europe/Madrid', 41.39, 2.17],
  ['Roma', 'roma|rome', 'Itália', 'Europe/Rome', 41.9, 12.5], ['Milão', 'milao|milan', 'Itália', 'Europe/Rome', 45.46, 9.19],
  ['Berlim', 'berlim|berlin', 'Alemanha', 'Europe/Berlin', 52.52, 13.4], ['Munique', 'munique|munich', 'Alemanha', 'Europe/Berlin', 48.14, 11.58],
  ['Amsterdã', 'amsterda|amsterdam', 'Países Baixos', 'Europe/Amsterdam', 52.37, 4.9], ['Bruxelas', 'bruxelas|brussels', 'Bélgica', 'Europe/Brussels', 50.85, 4.35],
  ['Zurique', 'zurique|zurich', 'Suíça', 'Europe/Zurich', 47.38, 8.54], ['Viena', 'viena|vienna', 'Áustria', 'Europe/Vienna', 48.21, 16.37],
  ['Dublin', 'dublin', 'Irlanda', 'Europe/Dublin', 53.35, -6.26], ['Moscou', 'moscou|moscow', 'Rússia', 'Europe/Moscow', 55.76, 37.62],
  ['Atenas', 'atenas|athens', 'Grécia', 'Europe/Athens', 37.98, 23.73], ['Istambul', 'istambul|istanbul', 'Turquia', 'Europe/Istanbul', 41.01, 28.98],
  ['Estocolmo', 'estocolmo|stockholm', 'Suécia', 'Europe/Stockholm', 59.33, 18.07], ['Oslo', 'oslo', 'Noruega', 'Europe/Oslo', 59.91, 10.75],
  ['Varsóvia', 'varsovia|warsaw', 'Polônia', 'Europe/Warsaw', 52.23, 21.01], ['Praga', 'praga|prague', 'Tchéquia', 'Europe/Prague', 50.08, 14.44],
  ['Nova York', 'nova york|nova iorque|new york|ny|nyc', 'Estados Unidos', 'America/New_York', 40.71, -74.01], ['Los Angeles', 'los angeles|la', 'Estados Unidos', 'America/Los_Angeles', 34.05, -118.24],
  ['Chicago', 'chicago', 'Estados Unidos', 'America/Chicago', 41.88, -87.63], ['Miami', 'miami', 'Estados Unidos', 'America/New_York', 25.76, -80.19],
  ['Orlando', 'orlando', 'Estados Unidos', 'America/New_York', 28.54, -81.38], ['São Francisco', 'sao francisco|san francisco', 'Estados Unidos', 'America/Los_Angeles', 37.77, -122.42],
  ['Washington', 'washington', 'Estados Unidos', 'America/New_York', 38.91, -77.04], ['Las Vegas', 'las vegas', 'Estados Unidos', 'America/Los_Angeles', 36.17, -115.14],
  ['Toronto', 'toronto', 'Canadá', 'America/Toronto', 43.65, -79.38], ['Vancouver', 'vancouver', 'Canadá', 'America/Vancouver', 49.28, -123.12],
  ['Cidade do México', 'cidade do mexico|mexico city', 'México', 'America/Mexico_City', 19.43, -99.13], ['Havana', 'havana', 'Cuba', 'America/Havana', 23.11, -82.37],
  ['Buenos Aires', 'buenos aires', 'Argentina', 'America/Argentina/Buenos_Aires', -34.6, -58.38], ['Santiago', 'santiago', 'Chile', 'America/Santiago', -33.45, -70.67],
  ['Montevidéu', 'montevideu|montevideo', 'Uruguai', 'America/Montevideo', -34.9, -56.16], ['Assunção', 'assuncao|asuncion', 'Paraguai', 'America/Asuncion', -25.26, -57.58],
  ['Lima', 'lima', 'Peru', 'America/Lima', -12.05, -77.04], ['Bogotá', 'bogota', 'Colômbia', 'America/Bogota', 4.71, -74.07],
  ['Caracas', 'caracas', 'Venezuela', 'America/Caracas', 10.48, -66.9], ['La Paz', 'la paz', 'Bolívia', 'America/La_Paz', -16.5, -68.15],
  ['Quito', 'quito', 'Equador', 'America/Guayaquil', -0.18, -78.47], ['Tóquio', 'toquio|tokyo', 'Japão', 'Asia/Tokyo', 35.68, 139.69],
  ['Pequim', 'pequim|beijing', 'China', 'Asia/Shanghai', 39.9, 116.41], ['Xangai', 'xangai|shanghai', 'China', 'Asia/Shanghai', 31.23, 121.47],
  ['Hong Kong', 'hong kong', 'China', 'Asia/Hong_Kong', 22.32, 114.17], ['Seul', 'seul|seoul', 'Coreia do Sul', 'Asia/Seoul', 37.57, 126.98],
  ['Singapura', 'singapura|singapore', 'Singapura', 'Asia/Singapore', 1.35, 103.82], ['Bangkok', 'bangkok|banguecoque', 'Tailândia', 'Asia/Bangkok', 13.76, 100.5],
  ['Dubai', 'dubai', 'Emirados Árabes Unidos', 'Asia/Dubai', 25.2, 55.27], ['Nova Délhi', 'nova delhi|delhi|new delhi', 'Índia', 'Asia/Kolkata', 28.61, 77.21],
  ['Mumbai', 'mumbai|bombaim', 'Índia', 'Asia/Kolkata', 19.08, 72.88], ['Jerusalém', 'jerusalem', 'Israel', 'Asia/Jerusalem', 31.77, 35.21],
  ['Cairo', 'cairo', 'Egito', 'Africa/Cairo', 30.04, 31.24], ['Joanesburgo', 'joanesburgo|johannesburg', 'África do Sul', 'Africa/Johannesburg', -26.2, 28.05],
  ['Cidade do Cabo', 'cidade do cabo|cape town', 'África do Sul', 'Africa/Johannesburg', -33.92, 18.42], ['Luanda', 'luanda', 'Angola', 'Africa/Luanda', -8.84, 13.23],
  ['Maputo', 'maputo', 'Moçambique', 'Africa/Maputo', -25.97, 32.57], ['Lagos', 'lagos', 'Nigéria', 'Africa/Lagos', 6.52, 3.38],
  ['Nairóbi', 'nairobi', 'Quênia', 'Africa/Nairobi', -1.29, 36.82], ['Sydney', 'sydney', 'Austrália', 'Australia/Sydney', -33.87, 151.21],
  ['Melbourne', 'melbourne', 'Austrália', 'Australia/Melbourne', -37.81, 144.96], ['Auckland', 'auckland', 'Nova Zelândia', 'Pacific/Auckland', -36.85, 174.76],
  ['Honolulu', 'honolulu|havai|hawaii', 'Estados Unidos', 'Pacific/Honolulu', 21.31, -157.86],
];
const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// perguntas de clima de verdade (não "temperatura de ebulição" nem "calcule o tempo em segundos")
const RE_CLIMA = /\b(clima|previs[ãa]o (do tempo|para|pra|de hoje|de amanh[ãa])|temperatura (hoje|agora|atual|de hoje|l[áa] fora|aqui|l[áa]|em|no|na|amanh[ãa])|quantos graus|graus (faz|est[áa]|t[áa])|vai chover|est[áa] chovendo|t[áa] chovendo|chuva (hoje|agora|amanh[ãa]|aqui|l[áa])|vento (hoje|agora|aqui|l[áa])|ventando|umidade do ar|como (est[áa]|t[áa]) o tempo|o tempo (hoje|agora|amanh[ãa]) |tempo l[áa] fora|[íi]ndice uv|nascer do sol|p[ôo]r do sol|(fazendo|est[áa]|t[áa]) (frio|calor)|vai (esfriar|esquentar|fazer frio|fazer calor))/i;
const RE_HORA = /\b(que horas?|quantas horas|horas? (de|do|da|em|no|na) |fuso hor[áa]rio|hor[áa]rio (em|no|na|de|do|da|l[áa]|a[íi]|aqui|local|atual)|hora (em|no|na|l[áa]|a[íi]|aqui|certa|local|agora|atual))\b/i;
const RE_AQUI = /\b(aqui|onde (eu )?(estou|t[ôo]|to|me encontro)|minha (localiza[çc][ãa]o|cidade|regi[ãa]o|posi[çc][ãa]o|rua)|meu (local|endere[çc]o|bairro)|perto de mim|por aqui|daqui|minhas coordenadas)\b/i;
const RE_LUGAR = /\b(onde (eu )?(estou|t[ôo]|to|me encontro)|minha localiza[çc][ãa]o|minhas coordenadas|em que (cidade|bairro|estado|pa[íi]s) (eu )?(estou|t[ôo]|to)|(latitude|longitude|coordenadas) (daqui|atuais|de|do|da))\b/i;
// a pergunta pede algo além dos números (conselho, explicação, comparação): aí a IA continua depois das linhas prontas
const PEDE_MAIS = /\b(preciso|devo|posso|d[áa] pra|vale|recomenda|sugest|o que (fa[çc]o|vestir|levar)|roupa|guarda-chuva|levar|sair|viajar|por ?qu[eê]|explique|explica|compar|diferen[çc]a|melhor|pior|dica|ideal|seguro|perigo)/i;
const usarDadosLugar = () => pref('dadosLugar') !== 'nao';
// o que a pergunta quer: { clima, hora, lugar, aqui, cidade (texto) } ou null
function intencaoLugar(texto) {
  const t = String(texto || ''); if (!t.trim() || t.length > 600) return null;
  const clima = RE_CLIMA.test(t), hora = RE_HORA.test(t), lugar = RE_LUGAR.test(t);
  if (!clima && !hora && !lugar) return null;
  const cidade = cidadeNaPergunta(t);
  const aqui = !cidade && (RE_AQUI.test(t) || clima);
  if (!cidade && !aqui) return null;   // 'o que é latitude?': pergunta de estudo, não de lugar
  if (hora && !clima && !lugar && !cidade && !RE_AQUI.test(t)) return null;   // "que horas são": a hora do aparelho já basta
  return { clima, hora, lugar, aqui, cidade, aquiTambem: !!cidade && RE_AQUI.test(t) };
}
// o lugar citado: primeiro as cidades conhecidas; depois o que vem após "em/no/na/de" (palavras com maiúscula, ou até 4
// palavras antes de hoje/agora/?)
function cidadeNaPergunta(t) {
  const n = ' ' + semAcento(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ') + ' ';
  let melhor = null;
  for (const c of CIDADES) for (const a of [semAcento(c[0]), ...c[1].split('|')]) {
    if (a.length < 3 && !/^(sp|rio|df|bh|la|ny)$/.test(a)) continue;
    if (a.length <= 3 && !new RegExp('\\b(em|no|na|de|do|da|pra|para)\\s+' + a + ' ').test(n)) continue;   // "la", "sp" só depois de preposição
    if (n.includes(' ' + a + ' ') && (!melhor || a.length > melhor.a.length)) melhor = { c, a };
  }
  if (melhor) return melhor.c[0];
  const m = /\b(?:em|no|na|nos|nas|de|do|da|para|pra)\s+((?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’-]+)(?:\s+(?:de|do|da|dos|das|del|e)?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}'’-]+){0,3})/u.exec(t);
  if (m && !/^(Própons|Brasil|Hoje|Agora)$/.test(m[1])) return m[1];
  const r = /\b(?:tempo|clima|horas?|hor[áa]rio|temperatura|previs[ãa]o)\b[^?.!]*?\b(?:em|no|na)\s+([\p{L}' -]{3,40}?)(?:\s+(?:hoje|agora|amanh[ãa]|neste|nesta|esta|essa|este|a noite|de manh[ãa])\b|[?.!,]|$)/iu.exec(t);
  if (r) { const x = r[1].trim(); if (x && !/^(o|a|os|as|um|uma|tempo|hoje|agora|aqui|l[áa]|casa|minha|meu|sua|seu|voc[êe])(\s|$)/i.test(x)) return x; }
  return null;
}
// direto da página (o Open-Meteo e os outros aceitam) e, se a rede da página falhar, pelo app
const buscarJson = async url => {
  try { const r = await comPrazo(fetch(url, { cache: 'no-store' }), 12000); if (r.ok) return await r.json(); } catch (e) {}
  return JSON.parse(await paginaDaWeb(url));
};
const acharCidadeConhecida = nome => { const s = semAcento(nome); return CIDADES.find(c => semAcento(c[0]) === s || c[1].split('|').includes(s)) || null; };
// nome → lugar (nome, estado, país, fuso, lat, lon): cidade conhecida sem internet; o resto pelo Open-Meteo
async function geocodificar(nome) {
  const c = acharCidadeConhecida(nome);
  if (c) return { nome: c[0], pais: c[2], fuso: c[3], lat: c[4], lon: c[5], fonte: 'tabela de fusos do app' };
  if (semInternet()) return null;
  const j = await buscarJson('https://geocoding-api.open-meteo.com/v1/search?count=1&language=pt&format=json&name=' + encodeURIComponent(nome));
  const r = j && j.results && j.results[0]; if (!r) return null;
  return { nome: r.name, regiao: r.admin1 || '', pais: r.country || '', fuso: r.timezone || '', lat: r.latitude, lon: r.longitude, fonte: 'Open-Meteo (geocodificação)' };
}
// a posição do aparelho: o sistema pergunta na primeira vez (Android, iPhone, Windows, Mac); negada, a IA avisa
function posicaoDoAparelho() {
  return new Promise(res => {
    if (!navigator.geolocation) return res({ erro: 'indisponivel' });
    let feito = false; const fim = v => { if (!feito) { feito = true; res(v); } };
    setTimeout(() => fim({ erro: 'demorou' }), 16000);
    try {
      navigator.geolocation.getCurrentPosition(p => fim({ lat: p.coords.latitude, lon: p.coords.longitude, precisao: Math.round(p.coords.accuracy || 0) }),
        e => fim({ erro: e && e.code === 1 ? 'negada' : 'indisponivel' }), { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60000 });
    } catch (e) { fim({ erro: 'indisponivel' }); }
  });
}
let ultimoLugar = null;   // { quando, lugar } — a mesma posição serve por 10 minutos
// a localização já foi permitida? (aí não há janelinha e nada precisa ser dito antes)
async function localJaPermitida() {
  if (pref('localOk') === 'sim') return true;
  try { return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'; } catch (e) { return false; }
}
async function lugarDoAparelho(passo, avisar) {
  if (ultimoLugar && Date.now() - ultimoLugar.quando < 10 * 60000) return ultimoLugar.lugar;
  passo('Vendo onde você está');
  // primeira vez: a resposta diz o que vai acontecer e logo em seguida vem a janelinha do sistema (o Windows não pergunta:
  // quem decide é a localização do próprio Windows)
  if (avisar && PLATAFORMA.tipo !== 'windows' && !(await localJaPermitida())) avisar('Para responder sobre onde você está, vou usar a sua localização. **Permita na janela do sistema** que abriu agora.');
  const p = await posicaoDoAparelho();
  if (p.lat != null) pref('localOk', 'sim');
  let lugar = null;
  if (p.lat != null) {
    lugar = { lat: p.lat, lon: p.lon, precisao: p.precisao, fonte: 'localização do aparelho', fuso: Intl.DateTimeFormat().resolvedOptions().timeZone };
    if (!semInternet()) {
      try {
        const j = await buscarJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=pt&latitude=${p.lat}&longitude=${p.lon}`);
        Object.assign(lugar, { nome: j.city || j.locality || '', bairro: j.city && j.locality && j.locality !== j.city ? j.locality : '', regiao: j.principalSubdivision || '', pais: j.countryName || '', nomeFonte: 'BigDataCloud (nome do lugar)' });
      } catch (e) {}
    }
  } else if (p.erro === 'negada' && CELULAR) {
    return { negada: true };   // no celular a pessoa negou na janelinha do sistema: vale o não
  } else if (!semInternet()) {
    // no PC a "negação" quase sempre é a localização do Windows/Mac desligada: usa a posição aproximada e oferece ligar
    // sem GPS/serviço de localização (PC sem localização ligada): posição aproximada pela conexão, dita como aproximada
    try {
      const j = await buscarJson('https://ipwho.is/?lang=pt-BR');
      if (j && j.success !== false && j.latitude != null) lugar = { lat: j.latitude, lon: j.longitude, nome: j.city || '', regiao: j.region || '', pais: j.country || '', fuso: (j.timezone && j.timezone.id) || '', aproximado: true, semPermissao: p.erro === 'negada', fonte: 'posição aproximada pela conexão (ipwho.is)' };
    } catch (e) {}
  }
  if (lugar) ultimoLugar = { quando: Date.now(), lugar };
  return lugar || { indisponivel: true };
}
// códigos de tempo da OMM (os que o Open-Meteo usa) em português, com um ícone simples
const TEMPO_WMO = { 0: ['Céu limpo', '☀️'], 1: ['Poucas nuvens', '🌤️'], 2: ['Parcialmente nublado', '⛅'], 3: ['Nublado', '☁️'], 45: ['Neblina', '🌫️'], 48: ['Neblina com geada', '🌫️'],
  51: ['Garoa fraca', '🌦️'], 53: ['Garoa', '🌦️'], 55: ['Garoa forte', '🌧️'], 56: ['Garoa congelante', '🌧️'], 57: ['Garoa congelante forte', '🌧️'],
  61: ['Chuva fraca', '🌦️'], 63: ['Chuva', '🌧️'], 65: ['Chuva forte', '🌧️'], 66: ['Chuva congelante', '🌧️'], 67: ['Chuva congelante forte', '🌧️'],
  71: ['Neve fraca', '🌨️'], 73: ['Neve', '🌨️'], 75: ['Neve forte', '❄️'], 77: ['Grãos de neve', '🌨️'], 80: ['Pancadas de chuva fracas', '🌦️'], 81: ['Pancadas de chuva', '🌧️'],
  82: ['Pancadas de chuva fortes', '⛈️'], 85: ['Pancadas de neve', '🌨️'], 86: ['Pancadas de neve fortes', '❄️'], 95: ['Trovoada', '⛈️'], 96: ['Trovoada com granizo', '⛈️'], 99: ['Trovoada com granizo forte', '⛈️'] };
const tempoWmo = (c, dia = 1) => { const t = TEMPO_WMO[c] || ['Tempo sem descrição', '🌡️']; return dia === 0 && c <= 2 ? [t[0], c === 0 ? '🌙' : '☁️'] : t; };   // de noite, sem sol no ícone
const DIRECOES = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const NOMES_DIR = { N: 'norte', NNE: 'norte-nordeste', NE: 'nordeste', ENE: 'leste-nordeste', L: 'leste', ESE: 'leste-sudeste', SE: 'sudeste', SSE: 'sul-sudeste', S: 'sul', SSO: 'sul-sudoeste', SO: 'sudoeste', OSO: 'oeste-sudoeste', O: 'oeste', ONO: 'oeste-noroeste', NO: 'noroeste', NNO: 'norte-noroeste' };
const direcaoDe = g => DIRECOES[Math.round((((+g % 360) + 360) % 360) / 22.5) % 16];
async function climaEm(l) {
  const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + l.lat + '&longitude=' + l.lon + '&timezone=auto&forecast_days=3&wind_speed_unit=kmh'
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,uv_index'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max';
  const j = await buscarJson(u), a = j.current || {}, d = j.daily || {};
  const dia = i => ({ data: (d.time || [])[i], codigo: (d.weather_code || [])[i], max: (d.temperature_2m_max || [])[i], min: (d.temperature_2m_min || [])[i], chuvaProb: (d.precipitation_probability_max || [])[i], chuvaMm: (d.precipitation_sum || [])[i], nascer: ((d.sunrise || [])[i] || '').slice(11, 16), por: ((d.sunset || [])[i] || '').slice(11, 16), uvMax: (d.uv_index_max || [])[i], ventoMax: (d.wind_speed_10m_max || [])[i] });
  return {
    fuso: j.timezone || l.fuso || '', hora: (a.time || '').replace('T', ' '),
    temp: a.temperature_2m, sensacao: a.apparent_temperature, umidade: a.relative_humidity_2m, chuvaMm: a.precipitation, codigo: a.weather_code, nuvens: a.cloud_cover,
    pressao: a.pressure_msl, vento: a.wind_speed_10m, ventoDir: a.wind_direction_10m, rajada: a.wind_gusts_10m, dia: a.is_day, uv: a.uv_index,
    dias: [0, 1, 2].map(dia).filter(x => x.data),
  };
}
const numBr = (v, casas = 0) => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
const coordBonita = (lat, lon) => `${numBr(Math.abs(lat), 4)}° ${lat >= 0 ? 'N' : 'S'}, ${numBr(Math.abs(lon), 4)}° ${lon >= 0 ? 'L' : 'O'}`;
function horaEm(fuso) {
  try {
    const agora = new Date(), f = o => new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: fuso }, o)).format(agora);
    const off = n => { const p = new Intl.DateTimeFormat('en-US', { timeZone: n, timeZoneName: 'longOffset' }).formatToParts(agora).find(x => x.type === 'timeZoneName'); return p ? p.value.replace('GMT', 'UTC') || 'UTC' : ''; };
    const minutos = n => { const v = off(n).match(/UTC([+-])(\d\d):?(\d\d)?/); return v ? (v[1] === '-' ? -1 : 1) * (+v[2] * 60 + +(v[3] || 0)) : 0; };
    const meu = Intl.DateTimeFormat().resolvedOptions().timeZone, dif = minutos(fuso) - minutos(meu);
    return { hora: f({ hour: '2-digit', minute: '2-digit' }), data: f({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), utc: off(fuso) || 'UTC', diferenca: dif, fuso };
  } catch (e) { return null; }
}
const difBonita = m => m === 0 ? 'mesmo horário que o seu' : `${Math.abs(m) % 60 ? (Math.abs(m) / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : Math.abs(m) / 60} h ${m > 0 ? 'à frente' : 'atrás'} do seu horário`;
const nomeCompleto = l => [l.bairro, l.nome, l.regiao, l.pais].filter((x, i, a) => x && a.indexOf(x) === i).join(', ');
/* junta tudo: devolve { painel (para o cartão), texto (para a IA) } ou null quando não é pergunta de lugar/hora/clima */
async function dadosDeLugar(texto, passo, avisar) {
  const q = usarDadosLugar() && intencaoLugar(texto); if (!q) return null;
  const linhas = [], paineis = [], resumos = [];
  // alvos: a cidade citada e/ou "aqui" ("que horas são em Londres e como está o tempo aqui?" traz os dois)
  const alvos = [];
  if (q.cidade) {
    passo('Procurando ' + q.cidade);
    let l = null; try { l = await geocodificar(q.cidade); } catch (e) {}
    if (l) alvos.push(l);
    else linhas.push(`Não achei o lugar "${q.cidade}" (${semInternet() ? 'o aparelho está sem internet e ele não está na lista de cidades do app' : 'nenhum resultado'}). Diga isso e peça o nome completo (cidade e país).`);
  }
  if (q.aqui || q.aquiTambem) {
    const l = await lugarDoAparelho(passo, avisar);
    if (l.negada) { linhas.push('A pessoa não permitiu a localização do aparelho. Diga em uma linha que precisa da permissão de localização (dá para liberar nas configurações do app) ou que ela pode dizer a cidade.'); paineis.push({ negada: true }); }
    else if (l.indisponivel) linhas.push('A localização do aparelho não está disponível agora (serviço de localização desligado ou sem sinal) e não deu para estimar pela internet. Diga isso e peça a cidade.');
    else alvos.push(Object.assign({ aqui: true }, l));
  }
  const querClima = q.clima || (!q.hora && !q.lugar);
  // dois lugares ("horas em Londres e o tempo aqui"): cada parte da frase vai para o lugar dela
  const partesFrase = String(texto).split(/[?.!;]+|,?\s+e\s+(?=(?:como|qual|quais|que|vai|est[áa]|t[áa]|quanto|quantos|a|o)\b)/i).filter(x => x && x.trim());
  const citaCidade = c => !!q.cidade && semAcento(c).includes(semAcento(q.cidade).split(' ')[0]);
  const eDoAlvo = (c, aqui) => aqui ? (RE_AQUI.test(c) || !citaCidade(c)) : (citaCidade(c) || !RE_AQUI.test(c));
  const pede = (re, aqui) => alvos.length < 2 || partesFrase.some(c => re.test(c) && eDoAlvo(c, aqui));
  for (const l of alvos) {
    const climaAqui = querClima && (alvos.length < 2 || pede(RE_CLIMA, !!l.aqui)), horaAqui = alvos.length < 2 || pede(RE_HORA, !!l.aqui) || !climaAqui;
    const painel = { lugar: { nome: l.nome || '', bairro: l.bairro || '', regiao: l.regiao || '', pais: l.pais || '', lat: +l.lat, lon: +l.lon, precisao: l.precisao || 0, aproximado: !!l.aproximado, semPermissao: !!l.semPermissao, fonte: l.fonte, aqui: !!l.aqui } };
    const quem = l.aqui ? 'ONDE A PESSOA ESTÁ' : 'LUGAR PERGUNTADO';
    linhas.push(`${quem}: ${nomeCompleto(l) || 'local sem nome conhecido'}. Latitude ${numBr(l.lat, 5)}, longitude ${numBr(l.lon, 5)}${l.precisao ? ` (precisão de ~${numBr(l.precisao)} m)` : ''}. Origem: ${l.fonte}${l.nomeFonte ? '; nome do lugar: ' + l.nomeFonte : ''}${l.aproximado ? ' — posição APROXIMADA (pela conexão, pode errar a cidade)' : ''}.`);
    let clima = null;
    if (climaAqui) {
      if (semInternet()) linhas.push(`Clima (${l.nome || 'aqui'}): o aparelho está sem internet, então não há dados de tempo agora. Diga isso; não invente números.`);
      else { passo('Vendo o tempo' + (alvos.length > 1 && l.nome ? ' em ' + l.nome : '')); try { clima = await climaEm(l); } catch (e) { linhas.push(`Clima (${l.nome || 'aqui'}): o serviço de previsão não respondeu agora. Diga isso; não invente números.`); } }
    }
    const h = horaEm((clima && clima.fuso) || l.fuso || Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (h) { painel.hora = h; linhas.push(`Hora local em ${l.nome || 'onde a pessoa está'} agora: ${h.hora}, ${h.data} (fuso ${h.fuso}, ${h.utc}; ${difBonita(h.diferenca)}).`); }
    if (clima) {
      painel.clima = clima;
      const [desc] = tempoWmo(clima.codigo), dir = direcaoDe(clima.ventoDir), hoje = clima.dias[0] || {}, amanha = clima.dias[1];
      linhas.push(`Tempo agora em ${l.nome || 'onde a pessoa está'} (${clima.hora}): ${desc}; ${numBr(clima.temp, 1)} °C (sensação de ${numBr(clima.sensacao, 1)} °C); umidade ${numBr(clima.umidade)}%; nuvens ${numBr(clima.nuvens)}%; chuva na última hora ${numBr(clima.chuvaMm, 1)} mm; vento ${numBr(clima.vento)} km/h vindo do ${NOMES_DIR[dir]} (${dir}, ${numBr(clima.ventoDir)}°), rajadas de ${numBr(clima.rajada)} km/h; pressão ${numBr(clima.pressao)} hPa; índice UV ${numBr(clima.uv, 1)}; ${clima.dia ? 'de dia' : 'de noite'}.`);
      if (hoje.data) linhas.push(`Hoje em ${l.nome || 'onde a pessoa está'}: ${tempoWmo(hoje.codigo)[0]}, máxima ${numBr(hoje.max)} °C e mínima ${numBr(hoje.min)} °C, chance de chuva ${numBr(hoje.chuvaProb)}% (${numBr(hoje.chuvaMm, 1)} mm), nascer do sol ${hoje.nascer}, pôr do sol ${hoje.por}, UV máximo ${numBr(hoje.uvMax, 1)}.`);
      if (amanha) linhas.push(`Amanhã em ${l.nome || 'onde a pessoa está'}: ${tempoWmo(amanha.codigo)[0]}, máxima ${numBr(amanha.max)} °C e mínima ${numBr(amanha.min)} °C, chance de chuva ${numBr(amanha.chuvaProb)}%.`);
    }
    // as linhas prontas (escritas pelo app, números exatos): cabeçalho com o lugar e a hora, depois o tempo
    const nomeCurto = [l.nome, l.pais].filter((x, i, v) => x && v.indexOf(x) === i).join(', ') || 'sua localização';
    const partes = [];
    const cab = l.aqui ? `**Onde você está: ${nomeCurto}**${l.aproximado ? ' (aproximado pela conexão)' : ''}` : `**${nomeCurto}**`;
    partes.push(h && horaAqui ? `${cab} · ${h.hora} de ${h.data}${h.diferenca ? ' (' + difBonita(h.diferenca) + ')' : ''}.` : cab);
    if (clima) {
      const hoje = clima.dias[0] || {}, am = clima.dias[1];
      partes.push(`Agora: ${tempoWmo(clima.codigo)[0].toLowerCase()}, ${numBr(clima.temp)} °C (sensação de ${numBr(clima.sensacao)} °C), umidade de ${numBr(clima.umidade)}% e vento de ${numBr(clima.vento)} km/h vindo do ${NOMES_DIR[direcaoDe(clima.ventoDir)]}.`);
      if (hoje.data) partes.push(`Hoje: ${tempoWmo(hoje.codigo)[0].toLowerCase()}, máxima de ${numBr(hoje.max)} °C, mínima de ${numBr(hoje.min)} °C e ${numBr(hoje.chuvaProb)}% de chance de chuva.`);
      if (am && /amanh/i.test(texto)) partes.push(`Amanhã: ${tempoWmo(am.codigo)[0].toLowerCase()}, máxima de ${numBr(am.max)} °C, mínima de ${numBr(am.min)} °C e ${numBr(am.chuvaProb)}% de chance de chuva.`);
    }
    if (q.lugar && l.aqui) partes.push(`Coordenadas: ${coordBonita(l.lat, l.lon)}${l.precisao ? ' (precisão de ~' + numBr(l.precisao) + ' m)' : ''} · origem: ${l.fonte}.`);
    else if (q.lugar) partes.push(`Coordenadas: ${coordBonita(l.lat, l.lon)}.`);
    if (partes.length) resumos.push(partes.join('\n'));
    paineis.push(painel);
  }
  if (paineis.some(p => p.clima)) linhas.push('Fonte do tempo: Open-Meteo (modelos meteorológicos oficiais), atualizado a cada 15 minutos.');
  if (!linhas.length) return null;
  // com frases prontas, a resposta já começa por elas (escritas pelo app, números exatos) e a IA só continua se a
  // pergunta pedir mais; sem elas (lugar não achado, sem internet), a IA explica com o que há
  return {
    painel: paineis.length ? paineis : null,
    inicio: resumos.join('\n\n'),
    completo: resumos.length > 0 && !PEDE_MAIS.test(texto) && !linhas.some(x => /Não achei|não está disponível|não permitiu|não respondeu|sem internet/.test(x)),
    texto: 'Dados reais pegos agora pelo aparelho para esta pergunta (a pessoa também vê um cartão com eles). '
      + (resumos.length ? 'A sua resposta JÁ COMEÇA com as frases com esses dados, escritas pelo app. Continue depois delas só se a pergunta pedir algo a mais (explicar, sugerir o que vestir, comparar, outro detalhe); não repita nem mude nenhum número. Se não houver mais nada a dizer, termine. Valores para detalhes:' : 'Use exatamente o que está abaixo, sem inventar nada:')
      + '\n- ' + linhas.join('\n- '),
  };
}
// o cartão na conversa: lugar, hora, clima, coordenadas e fonte
function htmlPainelLugar(p) {
  if (Array.isArray(p)) return p.map(htmlPainelLugar).join('');
  if (!p) return '';
  if (p.negada) return `<div class="lugar-card negada"><span class="lugar-ico">${ICO.local}</span><span><b>Localização bloqueada</b><small>Libere a localização nas configurações do app para eu responder sobre onde você está.</small></span><button class="btn" data-config-local>Abrir configurações</button></div>`;
  const l = p.lugar || {}, h = p.hora, c = p.clima;
  const titulo = esc(l.nome || l.regiao || 'Sua localização'), sub = esc([l.bairro, l.regiao, l.pais].filter((x, i, a) => x && x !== l.nome && a.indexOf(x) === i).join(', '));
  const [desc, ico] = c ? tempoWmo(c.codigo, c.dia) : ['', ''];
  const hoje = c && c.dias && c.dias[0];
  const dado = (rot, val) => `<span class="lugar-dado"><small>${rot}</small><b>${val}</b></span>`;
  const dir = c ? direcaoDe(c.ventoDir) : '';
  return `<div class="lugar-card${c ? ' com-clima' : ''}">
    <div class="lugar-topo"><span class="lugar-ico">${c ? `<span class="emoji">${ico}</span>` : ICO.local}</span>
      <span class="lugar-nome"><b>${titulo}</b>${sub ? `<small>${sub}</small>` : ''}</span>
      ${h ? `<span class="lugar-hora"><b>${esc(h.hora)}</b><small>${esc(h.utc)}</small></span>` : ''}</div>
    ${c ? `<div class="lugar-clima"><span class="lugar-temp">${numBr(c.temp)}°</span><span class="lugar-desc"><b>${esc(desc)}</b><small>Sensação ${numBr(c.sensacao)}° · ${hoje ? `Máx. ${numBr(hoje.max)}° · Mín. ${numBr(hoje.min)}°` : ''}</small></span></div>
    <div class="lugar-grade">${dado('Vento', `<i class="seta-vento" style="--g:${(+c.ventoDir || 0) + 180}deg"></i>${numBr(c.vento)} km/h ${dir}`)}${dado('Rajadas', numBr(c.rajada) + ' km/h')}${dado('Umidade', numBr(c.umidade) + '%')}${dado('Chuva hoje', (hoje ? numBr(hoje.chuvaProb) + '%' : '—'))}${dado('UV', numBr(c.uv, 1))}${dado('Pressão', numBr(c.pressao) + ' hPa')}${hoje ? dado('Nascer', esc(hoje.nascer)) + dado('Pôr do sol', esc(hoje.por)) : ''}</div>` : ''}
    ${h ? `<div class="lugar-linha">${esc(h.data)} · ${esc(difBonita(h.diferenca))}</div>` : ''}
    <div class="lugar-rodape"><span>${coordBonita(l.lat || 0, l.lon || 0)}${l.precisao ? ` · ±${numBr(l.precisao)} m` : ''}</span><span>${esc(l.aproximado ? 'Aproximada pela conexão' : l.aqui ? 'Localização do aparelho' : 'Lugar pesquisado')}${c ? ' · Open-Meteo' : ''}</span></div>
    ${l.semPermissao ? '<button class="lugar-exata" data-config-local>Ligar a localização exata</button>' : ''}
  </div>`;
}
function ligarPainelLugar(el) {
  el.querySelectorAll('[data-config-local]').forEach(b => b.onclick = () => PLATAFORMA.podeAbrirConfig ? PLATAFORMA.abrirConfigApp('localizacao').catch(() => {}) : avisarNegada('localizacao'));
}
// o cartão guardado na conversa passa pela mesma conferência do resto do arquivo
function normalizarPainelLugar(p) {
  if (Array.isArray(p)) { const l = p.slice(0, 3).map(normalizarPainelLugar).filter(Boolean); return l.length ? l : null; }
  if (!p || typeof p !== 'object') return null;
  if (p.negada) return { negada: true };
  const l = p.lugar; if (!l || !isFinite(+l.lat) || !isFinite(+l.lon)) return null;
  const s = (v, n = 80) => typeof v === 'string' ? v.slice(0, n) : '';
  const num = v => (v == null || !isFinite(+v)) ? null : +v;
  const out = { lugar: { nome: s(l.nome), bairro: s(l.bairro), regiao: s(l.regiao), pais: s(l.pais), lat: +l.lat, lon: +l.lon, precisao: num(l.precisao) || 0, aproximado: !!l.aproximado, semPermissao: !!l.semPermissao, fonte: s(l.fonte, 120), aqui: !!l.aqui } };
  if (p.hora && typeof p.hora === 'object') out.hora = { hora: s(p.hora.hora, 8), data: s(p.hora.data, 60), utc: s(p.hora.utc, 12), diferenca: num(p.hora.diferenca) || 0, fuso: s(p.hora.fuso, 40) };
  if (p.clima && typeof p.clima === 'object') {
    const c = p.clima;
    out.clima = { temp: num(c.temp), sensacao: num(c.sensacao), umidade: num(c.umidade), codigo: num(c.codigo), vento: num(c.vento), ventoDir: num(c.ventoDir), rajada: num(c.rajada), uv: num(c.uv), pressao: num(c.pressao), dia: num(c.dia), hora: s(c.hora, 20),
      dias: Array.isArray(c.dias) ? c.dias.slice(0, 3).map(d => ({ data: s(d.data, 12), codigo: num(d.codigo), max: num(d.max), min: num(d.min), chuvaProb: num(d.chuvaProb), nascer: s(d.nascer, 5), por: s(d.por, 5) })) : [] };
  }
  return out;
}
