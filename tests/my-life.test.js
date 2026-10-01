/**
 * La pestaña My life: su vida diaria, aparte del libro y aparte de Verbs.
 *
 * Él pidió sacar el local de Verbs ("eso son verbos en pasado") y tener una
 * pestaña para aprender cosas de su día. La tarjeta muestra la frase en
 * español y él la dice en inglés. Por eso lo que más importa es el contenido:
 * que cada tarjeta tenga su frase en presente, y que no haya dos frentes
 * iguales, porque no sabría cuál de las dos le están pidiendo.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();

/** Lee una constante de datos (una sola línea JSON) tal como está en el HTML. */
function constanteJSON(nombre) {
  const m = new RegExp(`^const ${nombre} = (.*);$`, 'm').exec(fuente);
  assert.ok(m, `no se encontró ${nombre}`);
  return JSON.parse(m[1]);
}

const SHOP_FAMILIES = constanteJSON('SHOP_FAMILIES');
const HOME_FAMILIES = constanteJSON('HOME_FAMILIES');
const PHRASE_FAMILIES = constanteJSON('PHRASE_FAMILIES');
const LIFE_NOW = constanteJSON('LIFE_NOW');

const clave = (f, v) => (f.keyPrefix ? f.keyPrefix + ':' : '') + v[0];
const tarjetas = SHOP_FAMILIES.concat(HOME_FAMILIES, PHRASE_FAMILIES).flatMap(f => f.verbs.map(v => ({ f, v, k: clave(f, v) })));

// ---------------------------------------------------------------------------
// El contenido.
// ---------------------------------------------------------------------------

test('cada tarjeta de My life tiene su frase en presente', () => {
  const faltan = tarjetas.filter(t => !LIFE_NOW[t.k]).map(t => t.k);
  assert.deepEqual(faltan, [], 'sin su frase, la tarjeta caería al ejemplo en pasado');
  assert.equal(Object.keys(LIFE_NOW).length, tarjetas.length, 'ni frases de sobra que no use nadie');
});

test('cada frase resalta el bloque que se aprende', () => {
  const sinResaltar = Object.entries(LIFE_NOW).filter(([, n]) => !/<b>[^<]+<\/b>/.test(n.en)).map(([k]) => k);
  assert.deepEqual(sinResaltar, []);
});

test('no hay dos frentes iguales', () => {
  const vistos = new Map();
  for (const [k, n] of Object.entries(LIFE_NOW)) {
    const es = n.es.trim().toLowerCase();
    assert.ok(!vistos.has(es), `"${n.es}" es el frente de ${vistos.get(es)} y de ${k}`);
    vistos.set(es, k);
  }
});

test('la frase en presente no es la vieja en pasado', () => {
  // Las frases de los verbos pasaron a presente: "I opened" ya no es el frente.
  const verbos = tarjetas.filter(t => t.v[1]);
  const iguales = verbos.filter(t => LIFE_NOW[t.k].en === t.v[4]).map(t => t.k);
  assert.deepEqual(iguales, []);
});

test('las herramientas también traen su frase en pasado', () => {
  // Son sustantivos: el pasado va en un verbo de la frase. Él lo pidió para
  // practicar los dos tiempos en todas las tarjetas.
  // Las frases de podcasts no: son bloques para usar enteros, sin pasado.
  const herramientas = tarjetas.filter(t => !t.v[1] && t.f.kind !== 'phrase');
  assert.ok(herramientas.length > 0);
  for (const t of herramientas) {
    const pasado = LIFE_NOW[t.k].past;
    assert.ok(pasado && pasado.en && pasado.es, `${t.k} no tiene pasado`);
    assert.match(pasado.en, /<b>[^<]+<\/b>/, `${t.k}: el verbo en pasado va resaltado`);
    assert.notEqual(pasado.en, LIFE_NOW[t.k].en, `${t.k}: el pasado es la misma frase del presente`);
  }
});

test('la tarjeta muestra el pasado de las herramientas', () => {
  const tarjeta = h.extraerFuncion('renderLifeCard');
  assert.match(tarjeta, /const antes = esNombre \? now\.past : \{ en: eg, es: egEs \};/);
  assert.match(tarjeta, /\$\{antes && antes\.en \? `<div class="vb-sent">/);
});

test('la casa no comparte tarjeta con el local', () => {
  // sweep, mop, take care of… existen en los dos con frases distintas. Sin el
  // prefijo "home", calificar una movería el calendario de la otra.
  assert.ok(HOME_FAMILIES.length > 0);
  for (const f of HOME_FAMILIES) assert.equal(f.keyPrefix, 'home', `${f.id} sin prefijo`);
  const claves = tarjetas.map(t => t.k);
  assert.equal(new Set(claves).size, claves.length, 'dos tarjetas con la misma clave');
});

test('cada grupo de la casa sale en una sección de la pestaña', () => {
  for (const f of HOME_FAMILIES) assert.ok(['home', 'out'].includes(f.section), `${f.id}: sección "${f.section}"`);
  const pagina = h.extraerFuncion('renderLife');
  assert.match(pagina, /HOME_FAMILIES\.filter\(f => f\.section === 'home'\)/);
  assert.match(pagina, /HOME_FAMILIES\.filter\(f => f\.section === 'out'\)/);
});

test('el globito de My life cuenta también la casa', () => {
  assert.match(h.extraerFuncion('lifeFamilies'), /SHOP_FAMILIES\.concat\(HOME_FAMILIES\b/);
  assert.match(h.extraerFuncion('lifeDueCount'), /lifeFamilies\(\)\.forEach/);
});

test('la pista del frente no regala la respuesta en inglés', () => {
  // El frente muestra la frase en español y una pista (🔑). Si la pista trae
  // la palabra en inglés, ya no hay nada que recordar.
  for (const t of tarjetas.filter(t => t.f.kind === 'phrase')) {
    const clave = (LIFE_NOW[t.k].en.match(/<b>([^<]+)<\/b>/) || [])[1] || '';
    const palabras = clave.toLowerCase().match(/[a-z']{3,}/g) || [];
    const pista = t.v[3].toLowerCase();
    for (const w of palabras) assert.ok(!new RegExp(`\\b${w}\\b`).test(pista), `${t.k}: la pista "${t.v[3]}" trae "${w}"`);
  }
});

test('las frases que mandó el 1 de octubre son una familia nueva de Phrases I heard', () => {
  // Primero se subieron como una sesión de Podcasts y él preguntó por qué, si
  // ya tenía sus frases aquí. Cada lote que manda es una familia nueva.
  const f = PHRASE_FAMILIES.find(x => x.id === 'phr_podcast2');
  assert.ok(f, 'falta la familia del 1 de octubre');
  assert.deepEqual(f.verbs.map(v => v[0]), [
    'How close are they?', 'Ever since when?', "It's gross.", 'Kind of crazy.',
    "I'm going to train you.", 'And I was like…', 'Here you go.',
  ]);
  assert.ok(!f.verbs.some(v => /wish/i.test(v[0])), '"I wish you had to" no entra hasta saber qué decía');
  assert.doesNotMatch(fuente, /_podPhrases20261001/, 'ni la sesión de Podcasts duplicada');
});

test('las frases de podcasts salen en su sección', () => {
  assert.ok(PHRASE_FAMILIES.length > 0);
  for (const f of PHRASE_FAMILIES) assert.equal(f.keyPrefix, 'phrase', `${f.id} sin prefijo`);
  assert.match(h.extraerFuncion('renderLife'), /fams: PHRASE_FAMILIES/);
  assert.match(h.extraerFuncion('lifeFamilies'), /PHRASE_FAMILIES/);
});

// ---------------------------------------------------------------------------
// El cableado.
// ---------------------------------------------------------------------------

test('Verbs ya no tiene la pestaña del local', () => {
  const verbos = h.extraerFuncion('renderVerbs');
  assert.doesNotMatch(verbos, /vbSetDeck\('shop'\)/);
  assert.doesNotMatch(verbos, /SHOP_FAMILIES/);
});

test('My life está en el menú y abre su página', () => {
  assert.match(fuente, /onclick="navigate\('life'\)"/);
  assert.match(fuente, /<div class="page" id="page-life">/);
  assert.match(h.extraerFuncion('navigate'), /if \(page === 'life'\) renderLife\(\);/);
});

test('el menú marca cada página en su posición real', () => {
  // navigate() marca el botón activo por su posición en el menú, así que
  // mover un botón corre a todos los de abajo.
  const nav = fuente.slice(fuente.indexOf('<nav class="nav">'), fuente.indexOf('</nav>'));
  const botones = [...nav.matchAll(/class="nav-item[^"]*" onclick="([^"]+)"/g)].map(m => m[1]);
  const mapa = /const navMap = (\{[^}]+\});/.exec(h.extraerFuncion('navigate'))[1];
  const entradas = [...mapa.matchAll(/'([^']+)': (\d+)/g)];
  assert.ok(entradas.length >= 10);
  for (const [, pagina, i] of entradas) {
    assert.equal(botones[Number(i)], `navigate('${pagina}')`, `${pagina} marca el botón ${i}`);
  }
});

test('My life está arriba, junto a la academia', () => {
  // Él pidió que se viera igual de importante que My Levels.
  const nav = fuente.slice(fuente.indexOf('<nav class="nav">'), fuente.indexOf('</nav>'));
  const botones = [...nav.matchAll(/onclick="([^"]+)"/g)].map(m => m[1]);
  assert.equal(botones.indexOf("navigate('life')"), botones.indexOf("navigate('levels')") + 1);
  assert.ok(nav.indexOf("navigate('life')") < nav.indexOf('>Practice<'), 'en la sección Learn, no en Practice');
});

test('cada globito cuenta lo suyo, sin repetir tarjetas', () => {
  assert.doesNotMatch(h.extraerFuncion('vbDueCount'), /SHOP_FAMILIES/);
  assert.doesNotMatch(h.extraerFuncion('vbDueCount'), /HOME_FAMILIES/);
  assert.match(h.extraerFuncion('updateNavBadges'), /\['life-count', lifeDueCount\(\)\]/);
});

test('las tarjetas son las mismas de antes, así que el progreso sigue', () => {
  // renderLifeCard y vbRate califican con vbKey: la misma clave "vb:" de siempre.
  assert.match(h.extraerFuncion('vbRate'), /SRS\.rate\(vbProgress\(\), vbKey\(item\[0\], fam, item\), rating\)/);
  assert.match(fuente, /vbStart\('\$\{f\.id\}', 'life'\)/);
});

test('el frente de My life está en español y no suena con la voz en inglés', () => {
  const voltear = h.extraerFuncion('vbFlip');
  assert.match(voltear, /if \(vbSes\.where === 'life'\) \{\s*\/\/[^\n]*\n\s*if \(vbSes\.shown\) speak\(/);
});
