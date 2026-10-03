/**
 * La Unit 4, revisada contra sus fotos (pp. 38-47; su respaldo del 2 de
 * octubre). Cada página estaba dos veces: las de junio y una copia de las diez
 * subida el 1 de julio, con gramática, ejercicios y speaking repetidos.
 *
 * - Se junta cada copia con su página: sus tarjetas pasan, con el progreso, y
 *   la copia se anota como borrada para que la nube no la devuelva.
 * - Ejemplos que contaban cosas de su vida que nadie le preguntó ("I have three
 *   siblings: two brothers and one sister"), opciones de un audio como hechos
 *   ("About 70% of the households are multi-generational"), trampas en inglés,
 *   y la gramática que daba por error "About 70% of households".
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = Array.from({ length: 10 }, (_, i) => 38 + i);
const NOMBRES = ['vocabKey', 'loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'hayLote',
  'fixGrammarTopic', 'u4Lote', 'u4Copia', 'fixU4Merge', 'quitarTemaU4', 'quitarEjerciciosPorRespuesta',
  ...PAGINAS.map(n => `fixU4P${n}`), 'questionCard', 'addQuestionCards', 'addPageExtras', 'addU4Questions',
  ...PAGINAS.map(n => `addU4P${n}Questions`)];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const lote = (id, extra) => ({ id, vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...extra });
const pagina = (units, n) => units.a2_4.batches.find(b => b.id === f.u4Lote(n));
const palabra = (units, n, word) => pagina(units, n).vocab.find(v => v.word === word);
const todas = units => units.a2_4.batches.flatMap(b => b.vocab || []);

// Lo que se ve en las fotos (solo las partes de donde salen los ejemplos nuevos).
const IMPRESO = {
  39: `Kyla: Do you have a lot of brothers and sisters? Emi: Actually, no. I'm an only child. But I've got tons of
    cousins. Kyla: Wow! Do you all keep in touch? Kyla: But is it hard to really get together? Emi: Well, a bunch
    of us get together at my great-grandmother's place once every couple of years. Kyla: You have a
    great-grandmother? She actually lives nearby. My mom and I drop by to say hello once a week.`,
  41: `B: He's a bank manager. He works at Metro Bank on First Avenue. A: His fiancée? She's a sales manager.
    A: I have some bad news. My cousin Tina is getting divorced.`,
  43: `Let me tell you about my brother, Adam. Even though I'm the older sibling, he's a little taller than I am.`,
  44: `They dress alike. Their tastes are similar. Both men have a mustache. Neither woman likes fish. Paula and Rosie,
    both 25, are identical twins. Around the world, about 30 out of every 1,000 births are twins.`,
  46: `1 Many adult children come back home and live with their parents until they are at least (18 / 20 / 30)
    years old. 3 About (20% / 70% / 90%) of all households are multi-generational. Prakash is a bank manager.
    T F NI`,
  47: `1 At what age do children usually leave home? It depends on their marital status. No. They're extremely
    unusual.`,
};

function estaImpresa(frase, n) {
  const impresas = new Set(IMPRESO[n].toLowerCase().match(/[a-z0-9%'-]+/g));
  const forma = p => [p, p.replace(/s$/, ''), `${p}s`];
  for (const p of frase.toLowerCase().match(/[a-z0-9%'-]+/g)) {
    assert.ok(forma(p).some(x => impresas.has(x)), `"${p}" (de "${frase}") no está impreso en la p. ${n}`);
  }
}

// ── Una unidad como la de él: cada página, más su copia de julio ──────────

function unidad() {
  const junio = {
    38: { vocab: [w('husband', "Matt is Kim's husband."), w('immediate family', 'My immediate family includes my parents and my sister.')],
          grammar: [{ title: "Possessive 's (Saxon Genitive)", spanishTrap: "Colombian Spanish speakers often translate directly using 'of' (the husband of Kim) instead of the possessive 's (Kim's husband). Remember: in English, the possessor comes BEFORE the thing possessed." },
                    { title: 'Plural Forms of Family Nouns' }] },
    39: { vocab: [w('great-grandmother', 'My great-grandmother is ninety-one years old.'), w('bunch', 'A bunch of us get together every month.'),
                  w('every couple of years', 'We visit our family in Spain every couple of years.'), w('cousin', 'I have tons of cousins in different cities.'),
                  w('an only child', 'She is an only child, so she has no brothers or sisters.')] },
    40: { grammar: [{ title: 'Simple Present: Questions with Do and Does', commonErrors: [] }] },
    41: { vocab: [w('get married', 'My brother is getting married next month.'), w('bank', 'He works at a bank on First Avenue.'),
                  w('sales manager', 'She is a sales manager at an international company.')],
          grammar: [{ title: 'Responding to Good and Bad News' }, { title: 'Simple Present Tense - Negative Statements' }] },
    42: { vocab: [w('story', 'My grandfather tells funny stories.')] },
    43: {},
    44: { vocab: [w('siblings', 'I have three siblings: two brothers and one sister.'), w('both', 'Both teachers speak English.')],
          exercises: [{ type: 'fill_blank', question: 'My two younger sisters, Ana and Sofia, ___ in the park every Saturday morning. They never miss their routine.', answer: 'run' }] },
    45: { vocab: [w('only child', 'She is an only child.')] },
    46: { vocab: [w('household', 'My household has four people: my parents, my sister, and me.'),
                  w('multi-generational', 'In a multi-generational house, grandparents live with their children and grandchildren.')],
          grammar: [{ title: "Quantifiers with 'of'", spanishTrap: "…'About 70% of THE households' not 'About 70% of households'." },
                    { title: 'Present Simple: Third Person Singular' }, { title: 'Frequency Expressions' }, { title: 'Possessive Forms with Family' }],
          exercises: [{ type: 'sentence_builder', question: 'Build a sentence with these words:', answer: 'My ex-husband visits the children once a month.', words: ['My'] },
                      { type: 'sentence_builder', question: 'Build a sentence with these words:', answer: 'A growing number of families live in multi-generational households.', words: ['A'] }] },
    47: { vocab: [w('leave home', 'Most young adults leave home at age 21.'), w('depends on', 'It depends on the weather if we go to the park.')],
          exercises: [{ type: 'multiple_choice', question: 'At what age do children USUALLY leave home in most English-speaking countries?', answer: 'between 21 and 25' }] },
  };
  const julio = {
    39: [w('a bunch of', 'A bunch of us meet at the café every Friday afternoon.')],
    41: [w('getting married', 'My brother is getting married!')],
    42: [w('stories', 'He tells funny stories at every party.'), w('loves', 'Everybody loves his stories because they are funny.')],
    43: [w('sibling', 'I have three siblings: two brothers and one sister.')],
    44: [w('around', 'Around 30 students are in the classroom.', { translation: 'alrededor de, aproximadamente' })],
    46: [w('changing', 'Family structures are changing in modern society.')],
    47: [w('depend on', 'It depends on many factors.'), w('change', 'There are many changes to the traditional household.')],
  };
  return { a2_4: {
    fcProgress: { bunch: { interval: 52 }, 'a bunch of': { interval: 0 }, siblings: { interval: 3 }, sibling: { interval: 9 },
                  loves: { interval: 4 }, 'only child': { interval: 58 }, 'an only child': { interval: 2 } },
    batches: [
      ...PAGINAS.map(n => lote(f.u4Lote(n), junio[n] || {})),
      ...PAGINAS.map(n => lote(f.u4Copia(n), { vocab: julio[n] || [], grammar: [{ title: 'repetido' }], exercises: [{ question: 'x' }] })),
    ],
  } };
}

function corregida() {
  const units = unidad();
  const st = { deletedBatchIds: ['otra'] };
  assert.equal(f.fixU4Merge(units, st), true);
  for (const n of PAGINAS) assert.equal(f[`fixU4P${n}`](units), true, `p. ${n}`);
  return { units, st };
}

test('cada copia de julio se junta con su página y queda anotada como borrada', () => {
  const { units, st } = corregida();
  assert.deepEqual(units.a2_4.batches.map(b => b.pages[0]), PAGINAS, 'diez páginas, en orden y con su número');
  for (const n of PAGINAS) assert.ok(st.deletedBatchIds.includes(f.u4Copia(n)), `copia de la p. ${n}`);
  assert.ok(st.deletedBatchIds.includes('otra'), 'los borrados de antes siguen');
  assert.ok(palabra(units, 44, 'around'), 'lo que solo tenía la copia pasa a la página');
  assert.equal(units.a2_4.batches.some(b => b.grammar.some(g => g.title === 'repetido')), false, 'sin la gramática repetida');
});

test('nada inventado sobre su vida, y las opciones del audio con sus opciones', () => {
  const { units } = corregida();
  for (const v of todas(units)) {
    assert.doesNotMatch(v.example, /three siblings|ninety-one|in Spain|My household has|My brother is getting married next month|at age 21/, v.word);
  }
  assert.equal(palabra(units, 46, 'multi-generational').example, 'About (20% / 70% / 90%) of all households are multi-generational.');
  assert.equal(palabra(units, 47, 'leave home').example, 'At what age do children usually leave home?');
  assert.equal(pagina(units, 47).exercises.length, 0, '"between 21 and 25" no lo dice la página');
  assert.equal(pagina(units, 44).exercises.length, 0, 'sus "hermanas Ana y Sofía" no existen');
  assert.deepEqual(pagina(units, 46).exercises.map(e => e.answer), ['A growing number of families live in multi-generational households.']);
  assert.deepEqual(pagina(units, 46).grammar, [], 'la p. 46 es un audio: no enseña gramática');
  assert.match(palabra(units, 44, 'around').translation, /en todo el mundo/);
});

test('las trampas, en español; y el "Who calls?" del recuadro de la p. 40', () => {
  const { units } = corregida();
  assert.match(pagina(units, 38).grammar[0].spanishTrap, /^En español decimos 'el esposo de Kim'/);
  assert.deepEqual(pagina(units, 38).grammar.map(g => g.title), ["Possessive 's (Saxon Genitive)"]);
  const quien = pagina(units, 40).grammar[0].commonErrors;
  assert.deepEqual(quien.map(e => [e.wrong, e.correct]), [['Who does call on Fridays?', 'Who calls on Fridays?']]);
  assert.deepEqual(pagina(units, 41).grammar.map(g => g.title), ['Responding to Good and Bad News'], 'el presente simple ya está en la p. 40');
});

test('unir y renombrar no le quita progreso; ninguna repetida', () => {
  const { units } = corregida();
  const p = units.a2_4.fcProgress;
  assert.equal(palabra(units, 39, 'bunch'), undefined);
  assert.deepEqual(p['a bunch of'], { interval: 52 }, 'queda el de intervalo más largo');
  assert.equal(palabra(units, 44, 'siblings'), undefined);
  assert.deepEqual(p.sibling, { interval: 9 });
  assert.ok(palabra(units, 42, 'love'));
  assert.deepEqual(p.love, { interval: 4 });
  assert.deepEqual(p['an only child'], { interval: 58 });
  assert.ok(palabra(units, 47, 'depend on'));
  assert.equal(palabra(units, 46, 'changing'), undefined, 'se unió con "change" de la p. 47');
  const claves = todas(units).map(v => f.vocabKey(v.word));
  assert.equal(new Set(claves).size, claves.length);
});

test('los ejemplos nuevos están impresos en la página', () => {
  const { units } = corregida();
  const nuevos = [[39, 'great-grandmother'], [39, 'a bunch of'], [39, 'every couple of years'], [39, 'cousin'], [41, 'bank'],
    [41, 'sales manager'], [41, 'get divorced'], [43, 'sibling'], [44, 'both'], [44, 'around'], [46, 'multi-generational'],
    [46, 'bank manager'], [47, 'leave home'], [47, 'depend on']];
  for (const [n, word] of nuevos) {
    const v = palabra(units, n, word);
    if (v) estaImpresa(v.example.replace(/\(T \/ F \/ NI\)/, 'T F NI'), n);
  }
});

test('sin las páginas, nada; correrlo otra vez no cambia nada', () => {
  const { units, st } = corregida();
  for (const n of PAGINAS) f[`addU4P${n}Questions`](units);
  const una = JSON.stringify(units);
  f.fixU4Merge(units, st);
  for (const n of PAGINAS) { f[`fixU4P${n}`](units); f[`addU4P${n}Questions`](units); }
  assert.equal(JSON.stringify(units), una);
  const vacia = { a2_4: { batches: [] } };
  assert.equal(f.fixU4Merge(vacia, {}), false);
  for (const n of PAGINAS) assert.equal(f[`fixU4P${n}`](vacia), false);
});

test('cada página recibe sus preguntas; la de la portada va en la p. 42', () => {
  const { units } = corregida();
  for (const n of PAGINAS) assert.equal(f[`addU4P${n}Questions`](units), true);
  for (const n of PAGINAS) {
    const q = pagina(units, n).vocab.filter(v => v.type === 'question');
    assert.ok(q.length >= 3, `p. ${n}: ${q.length}`);
    for (const c of q) assert.ok(/\?$/.test(c.word) && c.translation && c.example, c.word);
  }
  assert.ok(palabra(units, 42, 'Which adjective describes your personality?'));
  assert.equal(palabra(units, 38, "Who is Nina's nephew?").example, "Luke is Nina's nephew. Jake is her son.");
});

test('el arranque y la restauración lo corren: primero juntar, después las páginas', () => {
  const migrar = h.extraerFuncion('migrateState');
  const aplicar = h.extraerFuncion('applyPageFixes');
  assert.match(migrar, /if \(!merged\._u4MergeV1 && fixU4Merge\(merged\.units, merged\)\) merged\._u4MergeV1 = true;/);
  for (const n of PAGINAS) {
    assert.match(migrar, new RegExp(`\\['_u4P${n}V1', fixU4P${n}\\]`));
    assert.match(migrar, new RegExp(`\\['_u4P${n}QV1', addU4P${n}Questions\\]`));
    assert.match(aplicar, new RegExp(`\\bfixU4P${n}\\b`));
    assert.match(aplicar, new RegExp(`\\baddU4P${n}Questions\\b`));
  }
  assert.ok(migrar.indexOf('fixU4Merge(') < migrar.indexOf('fixU4P38]'));
  assert.ok(aplicar.indexOf('fixU4Merge') < aplicar.indexOf('fixU4P38'));
});
