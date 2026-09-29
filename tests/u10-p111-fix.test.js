/**
 * La corrección de la p. 111 (Unit 10) y la resolución de las fotos.
 *
 * Su respaldo del 29 de septiembre, comparado con la foto: la IA leyó mal el
 * diálogo de Jake y Nicole ("meet tomorrow… on Ring Street", "how much time
 * they promoted you", "the deadline has a lot on his plate"), sacó "deadline"
 * sin que la página lo imprima, y dejó fuera expresiones del diálogo. Él pidió
 * corregirla a mano, sin gastar en otro análisis, y dejar el modelo actual.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { fixU10P111 } = h.ejecutar(`
  ${h.extraerFuncion('fixBookPage')}
  ${h.extraerFuncion('fixU10P111')}
  return { fixU10P111 };
`, {});

// El diálogo y el recuadro de la p. 111, tal como salen en la foto.
const PAGINA = `
  Hi, honey, it's me. How about we meet in twenty minutes and grab a bite at that new restaurant on King Street?
  Sorry, I can't. Believe me, I'd love to call it a day. But remember that meeting I told you about? It's next week, and I still have tons to do.
  Can't someone give you a hand?
  You mean like Tom? He has a lot on his plate, too. We're all super busy.
  So how late are you going to stay?
  I think I should keep working for another hour or two so I don't have to stay late again tomorrow.
  I hope they know how lucky they are to have you. It's about time they promoted you to group manager!
  I wish! Anyway, if I want that, I'm going to have to show my boss I can go the extra mile.
  Well, you deserve that promotion. You're the hardest working person in that office, and I'm sure they know it.
  Thanks. Listen, go ahead and eat. I'm just going to get something from the machine and keep working.
  Tell you what... Call me when you're done, and I'll come pick you up. OK?
  Sounds good!
  Write a tip about how to be successful in each of the following areas.
  If you want to be successful in love, you have to be able to understand the needs of another person.
`.replace(/\s+/g, ' ').toLowerCase();

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', difficulty: 'medium', ...extra });
const KING_MAL = 'How about we meet tomorrow and grab a bite at that new restaurant on Ring Street?';
const MEETING_MAL = "Believe me, I'd love to but I remembered that meeting I told you about?";
const TIME_MAL = 'I hope they know how lucky they are to have you, how much time they promoted you to group manager!';

// Las entradas como las dejó el análisis (copiadas de su respaldo).
function unidades() {
  return { a2_10: { batches: [
    { id: 'p110', pages: [110], vocab: [w('No offense, but...', 'x')] },
    { id: 'p111', pages: [111], vocab: [
      w('grab a bite', KING_MAL, { type: 'phrase' }),
      w('call it a day', 'When you call it a day, it means your work is ending.'),
      w('has a lot on his plate', 'You know the deadline has a lot on his plate, too.', { type: 'phrase' }),
      w('go the extra mile', "Anyway, if I want that, I'm going to have to show my boss I can go the extra mile."),
      w('meet', KING_MAL, { type: 'verb' }),
      w('restaurant', KING_MAL),
      w('believe', "Sorry, I can't. Believe me, I'd love to but I remembered that meeting I told you about?", { type: 'verb' }),
      w('remember', MEETING_MAL, { type: 'verb' }),
      w('meeting', MEETING_MAL),
      w('give someone a hand', "Can't someone give you a hand?"),
      w('deadline', 'You know the deadline has a lot on his plate, too.', { type: 'noun' }),
      w('promoted', TIME_MAL, { type: 'verb' }),
      w('group manager', TIME_MAL),
      w('get something from the machine', "Listen, I'm just going to get something from the machine and keep working."),
      w('pick you up', "Call me when you're done, and I'll come pick you up, OK?", { type: 'phrasal verb' }),
      w('sounds good', 'Sounds good!'),
      w('career', 'Write a tip about how to be successful in career.'),
    ] },
  ] } };
}

const p111 = u => u.a2_10.batches[1];
const palabras = u => p111(u).vocab.map(v => v.word);

test('los ejemplos del diálogo quedan como en el libro', () => {
  const u = unidades();
  assert.equal(fixU10P111(u), true);
  const ej = p111(u).vocab.map(v => v.example).join(' | ');
  assert.doesNotMatch(ej, /Ring Street|meet tomorrow|how much time|the deadline|I remembered|it means your work is ending/);
  assert.equal(p111(u).vocab.find(v => v.word === 'grab a bite').example,
    'How about we meet in twenty minutes and grab a bite at that new restaurant on King Street?');
});

test('"deadline" (no impreso) pasa a ser lo que Nicole sí dice, y las formas van en base', () => {
  const u = unidades();
  fixU10P111(u);
  const ps = palabras(u);
  for (const vieja of ['deadline', 'has a lot on his plate', 'promoted', 'pick you up', 'believe']) {
    assert.ok(!ps.includes(vieja), `sigue "${vieja}"`);
  }
  for (const nueva of ['have tons to do', 'have a lot on your plate', 'promote', 'pick up', 'Believe me']) {
    assert.ok(ps.includes(nueva), `falta "${nueva}"`);
  }
});

test('agrega las expresiones del diálogo que faltaban, una sola vez y en su sitio', () => {
  const u = unidades();
  fixU10P111(u);
  fixU10P111(u);
  const ps = palabras(u);
  for (const [nueva, despues] of [["It's about time...", 'promote'], ['go ahead and...', 'get something from the machine'],
                                  ['Tell you what...', 'pick up']]) {
    assert.equal(ps.filter(x => x === nueva).length, 1, nueva);
    assert.equal(ps[ps.indexOf(despues) + 1], nueva);
  }
});

test('todo ejemplo que la corrección escribe está impreso en la página', () => {
  const antes = new Map(p111(unidades()).vocab.map(v => [v.word, v.example]));
  const u = unidades();
  fixU10P111(u);
  const tocados = p111(u).vocab.filter(v => antes.get(v.word) !== v.example && v.word !== 'career');
  assert.ok(tocados.length >= 12);
  for (const v of tocados) {
    const ej = v.example.toLowerCase().replace(/[.!?]$/, '');
    assert.ok(PAGINA.includes(ej), `"${v.example}" no está en la p. 111`);
  }
});

test('no toca la p. 110, ni un ejemplo que él haya cambiado, ni un aparato sin la página', () => {
  const u = unidades();
  const meet = p111(u).vocab.find(v => v.word === 'meet');
  meet.example = 'Let\'s meet at the shop.';
  fixU10P111(u);
  assert.equal(meet.example, 'Let\'s meet at the shop.');
  assert.deepEqual(u.a2_10.batches[0], unidades().a2_10.batches[0]);
  assert.equal(fixU10P111({ a2_10: { batches: [{ pages: [111], vocab: [w('grab a bite', 'x')] }] } }), false,
    'ya corregida (sin sus marcas), no vuelve a entrar');
  assert.match(h.extraerFuncion('migrateState'),
    /if \(!merged\._u10P111FixV1 && fixU10P111\(merged\.units\)\) merged\._u10P111FixV1 = true;/);
});

test('la foto se guarda y se manda con resolución para leer la letra pequeña', () => {
  // A 800 px de ancho y calidad 0.6 leyó "Ring Street" por "King Street".
  const f = h.extraerFuncion('compressImage');
  assert.match(f, /function compressImage\(dataUrl, maxSide = 2048, quality = 0\.85\)/);
  assert.match(f, /maxSide \/ Math\.max\(img\.width, img\.height\)/, 'por el lado largo: las páginas son verticales');
});
