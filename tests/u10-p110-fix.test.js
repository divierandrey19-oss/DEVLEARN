/**
 * La corrección de la p. 110 (Unit 10).
 *
 * Su respaldo del 29 de septiembre, comparado con la foto, mostró que el
 * análisis dejó un ejemplo que decía lo contrario del libro ("you just have to
 * keep doing things the same way", cuando Grace dice "you can't just keep
 * doing…"), expresiones cortadas ("offense", "keep your ideas"), una expresión
 * que la página no imprime ("to tell you the truth") y otra que sí imprime y
 * faltaba ("That's just the way it is"). Él pidió corregirla.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { fixU10P110 } = h.ejecutar(`
  ${h.extraerFuncion('loteDeLaCorreccion')}
  ${h.extraerFuncion('moverProgreso')}
  ${h.extraerFuncion('fixBookPage')}
  ${h.extraerFuncion('fixU10P110')}
  return { fixU10P110 };
`, {});

// El texto impreso en la p. 110, tal como sale en la foto.
const PAGINA = [
  "I hate to say it, but you need help from friends or family—or you're never going to be successful in life. No one does it alone.",
  "I think it's necessary to have lots of money. People who don't have money are never successful. That's just the way it is.",
  "In my opinion, anyone can be successful. If you work hard, no way you're not going to be successful.",
  "If you're not succeeding, you should change the way you usually do things. No offense, but you can't just keep doing things the same way and expect different results.",
  "I think it's important to take small steps until you feel ready to take the big ones. That's the best way to be successful.",
  "Don't let anyone tell you you can't succeed. They're just being negative. Believe in yourself. It's best to keep your ideas to yourself.",
].join(' ').toLowerCase().replace(/—/g, ' ');

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', difficulty: 'medium', ...extra });

// Las entradas como las dejó el análisis (copiadas de su respaldo).
function unidades() {
  return { a2_10: { batches: [
    { id: 'p109', pages: [109], vocab: [w('life goal', 'Which of the three life goals do you find the most appealing?')] },
    { id: 'p110', pages: [110], vocab: [
      w('successful', 'In my opinion, anyone can be successful if you work hard.'),
      w('to tell you the truth', "To tell you the truth, I hate to say it, but you need help from friends.", { type: 'phrase' }),
      w('alone', 'No one does it alone.'),
      w('money', "People who don't have money are never successful."),
      w('work hard', "If you work hard, no way you're not going to be successful.", { type: 'phrasal verb' }),
      w('no way', "No way you're not going to be successful.", { exampleTranslation: 'De ninguna manera no vas a ser exitoso.' }),
      w('succeeding', "If you're not succeeding, you should change the way you usually do things.", { type: 'verb' }),
      w('offense', 'No offense, but you just have to keep doing things the same way.', { type: 'noun' }),
      w('keep doing', 'You just have to keep doing things the same way and expect different results.'),
      w('expect', 'Keep doing things the same way and expect different results.'),
      w('different results', 'Expect different results.'),
      w('let anyone tell you', "Don't let anyone tell you you can't succeed."),
      w('keep your ideas', "It's best to keep your ideas to yourself.", { translation: 'mantener tus ideas' }),
      w('agree with', 'Check the opinions you agree with.', { type: 'phrasal verb' }),
      w('life', 'No one does it alone in life.'),
    ] },
  ] } };
}

const palabras = b => b.vocab.map(v => v.word);
const p110 = u => u.a2_10.batches[1];

test('ya no queda ningún ejemplo que diga lo contrario del libro', () => {
  const u = unidades();
  assert.equal(fixU10P110(u), true);
  const malos = p110(u).vocab.filter(v => /just have to|^keep doing things|^expect different/i.test(v.example));
  assert.deepEqual(malos.map(v => v.word), []);
  const offense = p110(u).vocab.find(v => v.word === 'No offense, but...');
  assert.match(offense.example, /you can't just keep doing/);
  assert.match(offense.exampleTranslation, /no puedes simplemente/);
});

test('las expresiones quedan completas, y "work hard" deja de ser phrasal verb', () => {
  const u = unidades();
  fixU10P110(u);
  const ps = palabras(p110(u));
  for (const esperada of ['No offense, but...', 'keep your ideas to yourself', 'succeed',
                          "Don't let anyone tell you...", 'I hate to say it, but...']) {
    assert.ok(ps.includes(esperada), `falta "${esperada}"`);
  }
  for (const vieja of ['offense', 'keep your ideas', 'succeeding', 'let anyone tell you', 'to tell you the truth']) {
    assert.ok(!ps.includes(vieja), `sigue "${vieja}"`);
  }
  assert.equal(p110(u).vocab.find(v => v.word === 'keep your ideas to yourself').translation, 'guardarte tus ideas');
  assert.equal(p110(u).vocab.find(v => v.word === 'work hard').type, 'phrase');
  assert.equal(p110(u).vocab.find(v => v.word === 'agree with').type, 'phrasal verb', 'este sí lo es');
});

test('agrega "That\'s just the way it is" una sola vez, después de "money"', () => {
  const u = unidades();
  fixU10P110(u);
  fixU10P110(u);
  const ps = palabras(p110(u));
  assert.equal(ps.filter(x => x === "That's just the way it is").length, 1);
  assert.equal(ps[ps.indexOf('money') + 1], "That's just the way it is");
});

test('todo ejemplo que la corrección escribe está impreso en la página', () => {
  const antes = new Map(p110(unidades()).vocab.map(v => [v.word, v.example]));
  const u = unidades();
  fixU10P110(u);
  const tocados = p110(u).vocab.filter(v => antes.get(v.word) !== v.example);
  assert.ok(tocados.length >= 8);
  for (const v of tocados) {
    const ej = v.example.toLowerCase().replace(/\.$/, '');
    assert.ok(PAGINA.includes(ej), `"${v.example}" no está en la p. 110`);
  }
});

test('no toca la p. 109, ni un ejemplo que él haya cambiado', () => {
  const u = unidades();
  const kd = p110(u).vocab.find(v => v.word === 'keep doing');
  kd.example = 'I keep doing my homework at night.';
  fixU10P110(u);
  assert.equal(kd.example, 'I keep doing my homework at night.');
  assert.deepEqual(u.a2_10.batches[0], unidades().a2_10.batches[0]);
});

test('sin la p. 110 en el aparato, no hace nada y la bandera no se marca', () => {
  assert.equal(fixU10P110({}), false);
  assert.equal(fixU10P110({ a2_10: { batches: [{ pages: [109], vocab: [] }] } }), false);
  // La bandera se marca solo si la encontró: un celular que la recibe después
  // por la nube la corrige entonces.
  assert.match(h.extraerFuncion('migrateState'),
    /if \(!merged\._u10P110FixV1 && fixU10P110\(merged\.units\)\) merged\._u10P110FixV1 = true;/);
});
