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
const LIFE_NOW = constanteJSON('LIFE_NOW');

const clave = (f, v) => (f.keyPrefix ? f.keyPrefix + ':' : '') + v[0];
const tarjetas = SHOP_FAMILIES.flatMap(f => f.verbs.map(v => ({ f, v, k: clave(f, v) })));

// ---------------------------------------------------------------------------
// El contenido.
// ---------------------------------------------------------------------------

test('cada tarjeta del local tiene su frase en presente', () => {
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
  assert.match(h.extraerFuncion('lifeDueCount'), /SHOP_FAMILIES\.forEach/);
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
