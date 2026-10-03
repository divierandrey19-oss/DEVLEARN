/**
 * La Unit 6, revisada contra sus fotos (pp. 61-71; su respaldo del 2 de
 * octubre). Las pp. 61-64 se subieron en julio sin foto ni número; las otras
 * siete, el 2 de octubre.
 *
 * - Errores de lectura: "for quarters" por "for starters", "Absolutely no" por
 *   "Actually, no", "smart phone habits" como "hábitos inteligentes".
 * - El ejercicio de unir broken / obsolete / up to date / defective tenía las
 *   respuestas en el orden desordenado del libro.
 * - Frases sobre él y su familia que nadie le preguntó ("Yes, my brother. He
 *   looks at his phone all the time", "My father reads local and world news")
 *   y opciones del audio como hechos. El prompt ya no lo permite.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = Array.from({ length: 11 }, (_, i) => 61 + i);
const CORREGIDAS = PAGINAS.filter(n => n !== 71);
const CON_PREGUNTAS = [61, 62, 63, 64];
const NOMBRES = ['vocabKey', 'loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'hayLote',
  'fixGrammarTopic', 'sanitizePageNumbers', 'ordenarPorPagina', 'u6Lote', 'fixU6Pages', 'fixU6Order', ...CORREGIDAS.map(n => `fixU6P${n}`),
  'questionCard', 'addQuestionCards', 'addPageExtras', 'addU6Questions', ...CON_PREGUNTAS.map(n => `addU6P${n}Questions`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const pregunta = (word, example) => w(word, example, { type: 'question', exampleTranslation: '' });
const pagina = (units, n) => units.a2_6.batches.find(b => b.id === f.u6Lote(n));
const palabra = (units, n, word) => pagina(units, n).vocab.find(v => v.word === word);
const todas = units => units.a2_6.batches.flatMap(b => b.vocab || []);

// Lo que se ve en las fotos (solo las partes de donde salen los ejemplos nuevos).
const IMPRESO = {
  62: `a tablet: have / want / don't want. a copier: have / want / don't want. speakers: have / want / don't want.
    I actually have one, but I only use the thing once or twice a week.`,
  63: `Liz: Uh-oh! I think there's some kind of plumbing problem in this hotel. Liz: Well, for starters, the sink is clogged.
    Tony: Actually, no. The TV IS working, but . . . it's like totally obsolete. It's not defective, and it works fine.
    Are you kidding? That sounds impossible.
    More Ideas: a refrigerator, a microwave, a stove, a sink, a toilet, a shower, a lamp, a car`,
  64: `What kind of dryer is that? It's a Quick Dry. It dries clothes faster than my old one.
    Sure! It's still in the juicer on the counter in the kitchen. Where are they buying the dishwasher?`,
  67: `The woman (often / hardly ever / never) makes videos of family parties. It won't start.`,
  68: `text, check email, post to social media, play games. Additional activities: listen to podcasts, listen to music,
    read local and world news, stream movies, shop online, get information`,
  70: `What doesn't work well in the Atlanta hotel? (the shower / the coffee maker / the wi-fi / all of the above)`,
};
const plano = t => t.toLowerCase().replace(/\s+/g, ' ').trim();

function unidad() {
  const lotes = {
    61: { vocab: [w('smart', 'Describe smart phone habits', { translation: 'inteligente' }), w('crossing', "to use your phone while you're crossing the street"),
                  w('working', "Talk about things that aren't working"), w('advantage', 'Describe advantages and disadvantages of a brand')],
          grammar: [
            { title: "Expressing opinions with 'I think' and 'I don't think'", spanishTrap: "Colombian speakers often translate literally 'Creo que no' as 'I think it's not' instead of the more natural 'I don't think it is'. In English, we prefer to put the negative with 'think'.",
              commonErrors: [{ wrong: "I think it's not OK to use your phone while driving." }, { wrong: "I no think it's nice to text during a movie." }] },
            { title: "Using 'while' to show two actions happening at the same time",
              commonErrors: [{ wrong: 'I use my phone while eating in a restaurant.' }, { wrong: "Don't text while you drive." }] }],
          exercises: [{ type: 'multiple_choice', question: 'Which is NOT a good phone habit?', answer: 'Texting while driving' }],
          speakingPrompts: ['Look at the photos. In your opinion, which situations are OK? Which are not OK?', 'Describe advantages and disadvantages of a brand',
            "Talk about things that aren't working", 'Describe smart phone habits', 'Discuss the challenges of traveling with technology'] },
    62: { vocab: [w('copier', 'I have a copier.'), w('device', 'Which devices do you have now?'),
                  w('once', 'I only use the thing once or twice a week.'), w('twice', 'I only use the thing once or twice a week.'),
                  w('week', 'I only use the thing once or twice a week.')] },
    63: { vocab: [w('plumbing', "I think there's some kind of plumbing problem."), w('quarters', 'For quarters, the sink is clogged.', { translation: 'habitaciones' }),
                  w('sink', 'For quarters, the sink is clogged.'), w('Absolutely no', 'Absolutely, no. The TV IS working.')],
          grammar: [{ title: 'Present simple for describing current states and problems' }, { title: 'Modal should for recommendations' }],
          exercises: [{ type: 'matching', question: 'Match each word with its meaning', answer: 'all',
            options: ['broken → has a problem', 'obsolete → is hard to use because the technology is old', "up to date → isn't working", 'defective → uses new or recent technology'] }] },
    64: { vocab: [w('juicer', 'Is she making her hair right now?'), w('advantages', 'Describe advantages and disadvantages of a brand.'),
                  w('devices', 'Tell your partner about your household appliances and devices.'), w('shopping', 'At shopping paradise.'),
                  w('paradise', 'At shopping paradise.')] },
    66: { vocab: [w('shop online', 'Do you sometimes shop online?'), pregunta('Do you sometimes shop online?', 'Yes, I do. I sometimes buy devices online.')] },
    67: { vocab: [w('For starters, ...', "For starters, it's obsolete."), w('family party', 'I usually make videos of family parties.')],
          speakingPrompts: ['CONVERSATION PAIR WORK: Role-play the conversation. Use one of the pictures. Then change roles and use a different picture.',
            'CHANGE PARTNERS: Role-play the conversation again. Use another device or appliance.'] },
    68: { vocab: [w('read local and world news', 'My father reads local and world news on his phone.')] },
    69: { vocab: [pregunta('Are you (or is someone you know) dependent on or addicted to a smart phone?', 'Yes, my brother. He looks at his phone all the time.'),
                  pregunta("Why don't you keep your phone in your bedroom?", 'Because I want to sleep better.')] },
    70: { vocab: [w('coffee maker', 'The coffee maker in my hotel room is broken.')] },
  };
  return { a2_6: {
    fcProgress: { twice: { interval: 58 }, once: { interval: 3 }, smart: { interval: 1 }, advantages: { interval: 58 }, advantage: { interval: 20 },
                  devices: { interval: 52 }, device: { interval: 58 }, shopping: { interval: 82 } },
    batches: PAGINAS.map(n => ({ id: f.u6Lote(n), vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...(n >= 65 ? { pages: [n] } : {}), ...(lotes[n] || {}) })),
  } };
}

function corregida() {
  const units = unidad();
  assert.equal(f.fixU6Pages(units), true);
  for (const n of CORREGIDAS) assert.equal(f[`fixU6P${n}`](units), true, `p. ${n}`);
  return units;
}

test('errores de lectura: for starters, Actually, no, smart phone; el progreso sigue a la tarjeta', () => {
  const units = corregida();
  assert.equal(palabra(units, 63, 'for starters').example, 'Well, for starters, the sink is clogged.');
  assert.equal(palabra(units, 63, 'sink').example, 'Well, for starters, the sink is clogged.');
  assert.match(palabra(units, 63, 'Actually, no.').example, /^Actually, no\. The TV IS working/);
  assert.equal(palabra(units, 61, 'smart phone').translation, 'celular (teléfono inteligente)');
  assert.deepEqual(units.a2_6.fcProgress['smart phone'], { interval: 1 });
  assert.equal(palabra(units, 61, 'cross the street').example, "to use your phone while you're crossing the street");
  assert.ok(palabra(units, 61, 'work'));
  assert.equal(todas(units).some(v => ['quarters', 'Absolutely no', 'smart', 'crossing', 'working'].includes(v.word)), false);
});

test('repetidas: una sola tarjeta, con el progreso más largo', () => {
  const units = corregida();
  assert.equal(palabra(units, 62, 'once or twice a week').example, 'I actually have one, but I only use the thing once or twice a week.');
  assert.deepEqual(units.a2_6.fcProgress['once or twice a week'], { interval: 58 });
  assert.equal(pagina(units, 67).vocab.some(v => v.word === 'For starters, ...'), false, 'la p. 67 la une con la de la p. 63');
  assert.deepEqual(units.a2_6.fcProgress.advantage, { interval: 58 });
  assert.deepEqual(units.a2_6.fcProgress.device, { interval: 58 });
  assert.deepEqual(units.a2_6.fcProgress['shop online'], { interval: 82 });
  for (const ida of ['once', 'twice', 'week', 'advantages', 'devices', 'shopping', 'paradise']) {
    assert.equal(todas(units).some(v => v.word === ida), false, ida);
  }
  const claves = todas(units).map(v => f.vocabKey(v.word));
  assert.equal(new Set(claves).size, claves.length);
});

test('p. 63: el ejercicio de unir tiene las respuestas correctas; entra "Uh-oh!"', () => {
  const units = corregida();
  assert.deepEqual(pagina(units, 63).exercises[0].options, ["broken → isn't working", 'obsolete → is hard to use because the technology is old',
    'up to date → uses new or recent technology', 'defective → has a problem']);
  assert.equal(pagina(units, 63).vocab[1].word, 'Uh-oh!');
  assert.deepEqual(pagina(units, 63).grammar.map(g => g.title), ['Modal should for recommendations']);
});

test('p. 61: ni errores falsos, ni trampas en inglés, ni la franja de lecciones como speaking', () => {
  const units = corregida();
  const [opinion, mientras] = pagina(units, 61).grammar;
  assert.deepEqual(opinion.commonErrors.map(e => e.wrong), ["I no think it's nice to text during a movie."]);
  assert.match(opinion.spanishTrap, /^En español/);
  assert.deepEqual(mientras.commonErrors, []);
  assert.deepEqual(pagina(units, 61).speakingPrompts, ['Look at the photos. In your opinion, which situations are OK? Which are not OK?']);
  assert.deepEqual(pagina(units, 61).exercises, []);
  assert.deepEqual(pagina(units, 67).speakingPrompts.length, 1, '"Change partners" era la misma conversación');
});

test('nada inventado sobre él ni su familia, ni opciones del audio como hechos', () => {
  const units = corregida();
  for (const v of todas(units)) {
    assert.doesNotMatch(v.example, /my (father|brother|sister)|I have a copier|I usually make videos|coffee maker in my hotel room|I sometimes buy/, v.word);
  }
  assert.equal(palabra(units, 62, 'copier').example, "a copier: have / want / don't want");
  assert.equal(palabra(units, 69, 'Are you (or is someone you know) dependent on or addicted to a smart phone?').example, 'Yes. / No.');
  assert.equal(palabra(units, 69, "Why don't you keep your phone in your bedroom?"), undefined);
  assert.equal(palabra(units, 66, 'Do you sometimes shop online?').example, "Yes, I do. / No, I don't.");
});

test('los ejemplos nuevos están impresos en la página', () => {
  const units = corregida();
  const nuevos = [[62, 'copier'], [62, 'once or twice a week'], [63, 'Uh-oh!'], [63, 'for starters'], [63, 'Actually, no.'],
    [64, 'juicer'], [67, 'family party'], [68, 'read local and world news'], [70, 'coffee maker']];
  for (const [n, word] of nuevos) {
    const v = palabra(units, n, word);
    assert.ok(v, `p. ${n}: ${word}`);
    assert.ok(plano(IMPRESO[n]).includes(plano(v.example)), `p. ${n}: "${v.example}" no está impreso así`);
  }
});

test('números de página; sin la página, nada; correrlo otra vez no cambia nada', () => {
  const units = corregida();
  assert.deepEqual(units.a2_6.batches.map(b => b.pages[0]), PAGINAS);
  for (const n of CON_PREGUNTAS) f[`addU6P${n}Questions`](units);
  const una = JSON.stringify(units);
  f.fixU6Pages(units);
  for (const n of CORREGIDAS) f[`fixU6P${n}`](units);
  for (const n of CON_PREGUNTAS) f[`addU6P${n}Questions`](units);
  assert.equal(JSON.stringify(units), una);
  for (const n of CORREGIDAS) assert.equal(f[`fixU6P${n}`]({ a2_6: { batches: [] } }), false);
});

test('las páginas quedan en el orden del libro', () => {
  const units = corregida();
  units.a2_6.batches.reverse();
  assert.equal(f.fixU6Order(units), true);
  assert.deepEqual(units.a2_6.batches.map(b => b.pages[0]), PAGINAS);
  assert.match(h.extraerFuncion('migrateState'), /fixU6Pages\(merged\.units\)\) merged\._u6PagesV1 = true;\n  fixU6Order\(merged\.units\);/);
  assert.match(h.extraerFuncion('applyPageFixes'), /fixU6Pages, fixU6Order, fixU6P61/);
});

test('las pp. 61-64 reciben sus preguntas', () => {
  const units = corregida();
  for (const n of CON_PREGUNTAS) assert.equal(f[`addU6P${n}Questions`](units), true);
  for (const n of CON_PREGUNTAS) {
    const q = pagina(units, n).vocab.filter(v => v.type === 'question');
    assert.ok(q.length >= 4, `p. ${n}: ${q.length}`);
    for (const c of q) assert.ok(/\?$/.test(c.word) && c.translation && c.example, c.word);
  }
  assert.equal(palabra(units, 64, "Who's vacuuming the house tomorrow?").example, "No one is! The vacuum cleaner isn't working.");
});

test('el arranque y la restauración las corren; la p. 63 antes que la p. 67', () => {
  const migrar = h.extraerFuncion('migrateState');
  const aplicar = h.extraerFuncion('applyPageFixes');
  assert.match(migrar, /if \(!merged\._u6PagesV1 && fixU6Pages\(merged\.units\)\) merged\._u6PagesV1 = true;/);
  for (const n of CORREGIDAS) {
    assert.match(migrar, new RegExp(`\\['_u6P${n}V1', fixU6P${n}\\]`));
    assert.match(aplicar, new RegExp(`\\bfixU6P${n}\\b`));
  }
  for (const n of CON_PREGUNTAS) {
    assert.match(migrar, new RegExp(`\\['_u6P${n}QV1', addU6P${n}Questions\\]`));
    assert.match(aplicar, new RegExp(`\\baddU6P${n}Questions\\b`));
  }
  assert.ok(migrar.indexOf('fixU6P63]') < migrar.indexOf('fixU6P67]'));
  assert.ok(aplicar.indexOf('fixU6P63') < aplicar.indexOf('fixU6P67'));
});

test('el prompt prohíbe inventar datos sobre él en ejemplos y respuestas', () => {
  const fuente = h.fuente();
  assert.match(fuente, /Never state a fact about the student, his family or his things/);
  assert.match(fuente, /you do not know his answer: give the choices the page prints/);
});
