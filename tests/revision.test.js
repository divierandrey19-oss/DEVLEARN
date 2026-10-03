/**
 * La revisión de todas las unidades (3 de octubre), con su respaldo del 2 de
 * octubre, después de corregir la Unit 6:
 *
 * - Unit 3: ejemplos inventados sobre su familia ("My sister can play the
 *   piano beautifully", "My son has a runny nose because of allergies"); ahora,
 *   lo que la página imprime. La tarjeta y su progreso se quedan.
 * - Unit 2, p. 20: "My brother loves hip-hop and rap" no está en la página.
 * - Unit 8, p. 88: "her" / "to her" y "salesperson" / "to the salesperson"
 *   eran la misma palabra dos veces.
 * - Unit 9: la p. 104 salía después de la 106.
 * - Unit 10, p. 110: tres trampas seguían en inglés.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const U3 = [26, 29, 30, 31, 32, 33, 34, 35];
const FIXES = [...U3.map(n => `fixU3P${n}Ejemplos`), 'fixU2P20Ejemplo', 'fixU8P88Dupes', 'fixU9Order', 'fixU10P110Traps'];
const NOMBRES = ['vocabKey', 'loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad',
  'sanitizePageNumbers', 'ordenarPorPagina', 'u3Lote', 'u3Ejemplos', ...FIXES];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const w = (word, example, extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const lote = (id, extra) => ({ id, vocab: [], grammar: [], exercises: [], speakingPrompts: [], ...extra });

// Lo que se ve en las fotos (solo las partes de donde salen los ejemplos nuevos).
const IMPRESO = {
  26: "I can sing. / I can't sing. I can drive. / I can't drive. I can cook. / I can't cook. Well, I can't play the guitar, but I can play the piano.",
  29: 'What instruments can you play? The piano and the guitar.',
  30: "Give advice to someone who doesn't feel well. I don't feel well. I have a runny nose. I don't feel well. I have a toothache. Right now I have a backache.",
  31: "Give more advice, using should or shouldn't: go home, take a nap, make soup, rest. Give more advice, using should or shouldn't: go to class, exercise, go to work, go out",
  32: 'Answer Man, help! My 13-year-old daughter, Ruby, is on her school soccer team.',
  33: 'You get a new job in a different city. It starts next month.',
  34: "You can't teach an old dog new tricks.",
  35: 'Ability: playing a musical instrument. Motivation: 40%. Practice: 50%. Natural ability: 10%.',
  20: 'Musical genres: hip-hop / rap, jazz, classical, folk, pop, rock, heavy metal',
};

function unidades() {
  const u3 = {
    26: [w('sing', "I can sing well, but my brother can't sing."), w('play the piano', 'My sister can play the piano beautifully.'),
         w('drive', "My father can drive, but my mother can't."), w('cook', 'My grandmother can cook delicious traditional food.')],
    29: [w('piano', 'My sister can play the piano beautifully.')],
    30: [w('runny nose', 'My son has a runny nose because of allergies.'), w('toothache', 'My brother has a toothache and needs a dentist.'),
         w('backache', 'My father has a backache from working all day.'), w('advice', "My mother always gives me good advice when I'm sick.")],
    31: [w('make soup', "My grandmother makes soup when I'm sick."), w('go to work', 'My father goes to work at 7 am every morning.')],
    32: [w('daughter', 'My daughter is 13 years old.')],
    33: [w('city', 'My brother lives in a different city.')],
    34: [w('old', 'My grandfather is 70 years old but still learns new things.')],
    35: [w('musical instrument', 'My sister plays a musical instrument.')],
  };
  return {
    a2_3: { fcProgress: { 'runny nose': { interval: 203 }, sing: { interval: 75 } },
            batches: [lote('b_p28', { pages: [28], vocab: [w('No way.', 'My brother? No way.')] }),
                      ...U3.map(n => lote(f.u3Lote(n), { pages: [n], vocab: u3[n] }))] },
    a2_2: { batches: [lote('b_p20', { pages: [20], vocab: [w('hip-hop / rap', 'My brother loves hip-hop and rap.')] })] },
    a2_8: { fcProgress: { 'to her': { interval: 9 }, her: { interval: 5 }, 'to the salesperson': { interval: 4 }, salesperson: { interval: 2 } },
            batches: [lote('b_p87', { pages: [87], vocab: [w('salesperson', 'Salesperson: My pleasure.')] }),
                      lote('b_p88', { pages: [88], vocab: [w('to the salesperson', 'Did you give your credit card to the salesperson?'),
                        w('to her', 'Did you give your credit card to her?'), w('her', 'Did you give your credit card to her?', { translation: 'la/ella' })] })] },
    a2_9: { batches: [97, 98, 103, 'pv', 105, 106, 104, 107].map(p => lote(`b_${p}`, p === 'pv' ? {} : { pages: [p] })) },
    a2_10: { batches: [lote('b_p110', { pages: [110], grammar: [
      { title: "Expressing opinions with 'In my opinion'", spanishTrap: "Colombian speakers often say 'For me' (Para mí) instead of 'In my opinion'. While 'For me' is grammatically possible, 'In my opinion' is more natural when expressing opinions in English." },
      { title: "Modal verb 'should' for advice", spanishTrap: "Never add 'to' after 'should'. Spanish speakers often say 'you should to change' because in Spanish we say 'deberías cambiar', but in English it's always 'should change' without 'to'." },
      { title: "Negative imperatives with 'Don't'", spanishTrap: "Spanish uses different forms for negative commands (no hagas, no digas), but English always uses 'Don't' + base verb for all persons." }] })] },
  };
}

function corregidas() {
  const units = unidades();
  for (const n of FIXES) assert.equal(f[n](units), true, n);
  return units;
}
const todas = (units, k) => units[k].batches.flatMap(b => b.vocab || []);
const plano = t => t.toLowerCase().replace(/\s+/g, ' ').trim();

test('Unit 3: ningún ejemplo inventado sobre su familia; las tarjetas y su progreso se quedan', () => {
  const units = corregidas();
  for (const v of todas(units, 'a2_3').filter(v => v.word !== 'No way.')) {
    assert.doesNotMatch(v.example, /\bmy (father|mother|brother|sister|son|grandmother|grandfather)\b/i, v.word);
  }
  assert.equal(todas(units, 'a2_3').find(v => v.word === 'No way.').example, 'My brother? No way.', 'la p. 28 sí lo imprime');
  assert.deepEqual(units.a2_3.fcProgress, { 'runny nose': { interval: 203 }, sing: { interval: 75 } });
  assert.equal(todas(units, 'a2_3').length, 16);
});

test('los ejemplos nuevos están impresos en la página', () => {
  const units = corregidas();
  for (const b of [...units.a2_3.batches, ...units.a2_2.batches]) {
    const n = b.pages[0];
    if (!IMPRESO[n]) continue;
    for (const v of b.vocab) assert.ok(plano(IMPRESO[n]).includes(plano(v.example)), `p. ${n}: "${v.example}"`);
  }
});

test('Unit 8: "to her" y "to the salesperson" se unen; queda el progreso más largo', () => {
  const units = corregidas();
  assert.deepEqual(todas(units, 'a2_8').map(v => v.word), ['salesperson', 'her']);
  assert.deepEqual(units.a2_8.fcProgress, { her: { interval: 9 }, salesperson: { interval: 4 } });
  assert.match(todas(units, 'a2_8')[1].translation, /^la, le, ella/);
});

test('Unit 9 en el orden del libro; la página sin número, al final', () => {
  const units = corregidas();
  assert.deepEqual(units.a2_9.batches.map(b => b.id), ['b_97', 'b_98', 'b_103', 'b_104', 'b_105', 'b_106', 'b_107', 'b_pv']);
});

test('Unit 10, p. 110: las trampas en español', () => {
  const units = corregidas();
  for (const g of units.a2_10.batches[0].grammar) assert.match(g.spanishTrap, /^(En español|Después de)/, g.title);
});

test('sin la página, nada; correrlo otra vez no cambia nada', () => {
  const units = corregidas();
  const una = JSON.stringify(units);
  for (const n of FIXES) f[n](units);
  assert.equal(JSON.stringify(units), una);
  for (const n of FIXES.filter(n => n !== 'fixU9Order')) assert.equal(f[n]({ a2_2: { batches: [] }, a2_3: { batches: [] }, a2_8: { batches: [] }, a2_10: { batches: [] } }), false, n);
});

test('el arranque y la restauración los corren', () => {
  const migrar = h.extraerFuncion('migrateState');
  const aplicar = h.extraerFuncion('applyPageFixes');
  for (const n of FIXES) assert.match(aplicar, new RegExp(`\\b${n}\\b`), n);
  for (const n of U3) assert.match(migrar, new RegExp(`\\['_u3P${n}EjV1', fixU3P${n}Ejemplos\\]`));
  assert.match(migrar, /\['_u2P20EjV1', fixU2P20Ejemplo\]/);
  assert.match(migrar, /\['_u8P88DupesV1', fixU8P88Dupes\]/);
  assert.match(migrar, /\['_u10P110TrapsV1', fixU10P110Traps\]/);
  assert.match(migrar, /fixU9Pages\(merged\.units\)\) merged\._u9PagesV1 = true;\n  fixU9Order\(merged\.units\);/);
});
