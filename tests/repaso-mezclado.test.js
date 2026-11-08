/**
 * El repaso diario (Flashcards → "Start today's review") toma 20 tarjetas: las
 * que más falla, las más atrasadas, las que está aprendiendo, las de hoy y
 * hasta 5 nuevas. Las palabras que estudió el mismo día vencen el mismo día, así
 * que las 20 más atrasadas salían de una sola unidad. Él lo pidió revuelto
 * (4 de octubre): ahora van por turnos entre unidades, sin perder la prioridad.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { intercalarUnidades } = h.ejecutar(`${h.extraerFuncion('intercalarUnidades')} return { intercalarUnidades };`, {});

const u = n => ({ key: `a2_${n}`, lid: 'a2', uid: n });
const it = (n, w) => ({ unit: u(n), word: { word: w } });

test('por turnos entre unidades; cada unidad conserva su orden', () => {
  const lista = [it(3, 'a'), it(3, 'b'), it(3, 'c'), it(5, 'x'), it(5, 'y'), it(9, 'm')];
  assert.deepEqual(intercalarUnidades(lista).map(i => i.word.word), ['a', 'x', 'm', 'b', 'y', 'c']);
});

test('la unidad de la tarjeta más urgente va primero; no se pierde ninguna', () => {
  const lista = [it(7, 'urgente'), it(2, 'otra'), it(7, 'segunda')];
  const out = intercalarUnidades(lista);
  assert.equal(out[0].word.word, 'urgente');
  assert.equal(out.length, 3);
  assert.deepEqual(intercalarUnidades([]), []);
  assert.deepEqual(intercalarUnidades(undefined), []);
  // Una unidad sin "key" (copia vieja) se agrupa por nivel y número.
  const sinKey = [{ unit: { lid: 'a2', uid: 4 }, word: { word: 'p' } }, { unit: { lid: 'a2', uid: 4 }, word: { word: 'q' } }, it(1, 'r')];
  assert.deepEqual(intercalarUnidades(sinKey).map(i => i.word.word), ['p', 'r', 'q']);
});

test('el repaso diario intercala cada grupo, y las atrasadas siguen de la más vieja a la más nueva', () => {
  const fuente = h.fuente();
  const i = fuente.indexOf('buildDailySession(units, maxCards = 20, foco = null, adelantar = false) {');
  const cuerpo = fuente.slice(i, fuente.indexOf('\n  },', i));
  assert.match(cuerpo, /const overdue = due\.overdue\.sort\(\(a,b\) => a\.card\.dueDate\.localeCompare\(b\.card\.dueDate\)\);/);
  for (const g of ['due\\.leeches', 'overdue', 'due\\.learning', 'due\\.due']) {
    assert.match(cuerpo, new RegExp(`push\\(intercalarUnidades\\(${g}\\.filter\\(filtro\\)\\), limite\\);`), g);
  }
  assert.match(cuerpo, /let nuevasL = intercalarUnidades\(due\.new\.filter\(filtro\)\);/);
  assert.match(cuerpo, /llenar\(\(\) => true, maxCards, 5, false\); \/\/ max 5 new per day/);
});

// ── Antes de un speaking test: el repaso se enfoca en sus unidades ─────────

const sintaxis = h.fuente().match(/const COURSE_SYLLABUS = \[[\s\S]*?\n\];/)[0];
const { focoDelRepaso } = h.ejecutar(`${sintaxis}\n${h.extraerFuncion('unidadesAtrasadas')}\n${h.extraerFuncion('focoDelRepaso')} return { focoDelRepaso };`,
  { todayLocal: () => '2026-10-04', getUnitVocab: u => u.vocab || [], SRS: { readCard: (prog, w) => prog[w] || { state: 'new' } } });
// El curso es el del B1 (5 de noviembre): id = 1000 + el número de BLOCKS.
const ids = t => sintaxisIds(t);
function sintaxisIds(titulo) { const m = sintaxis.match(new RegExp(`\\{ id: (\\d+), n: \\d+, title: '${titulo.replace(/[/]/g, '\\/')}'`)); return m && Number(m[1]); }
const hasta = n => Array.from({ length: n - 1 }, (_, i) => 1002 + i); // vistas las clases 2..n

test('el próximo examen con unidades da el foco, hasta su fecha', () => {
  const hechas = hasta(13); // todo antes del Speaking Test 1
  const st = { classesDone: hechas, classSchedule: { [ids('SPEAKING TEST 1 / Unit 1')]: '2026-11-20' } };
  const f = focoDelRepaso(st, '2026-11-15');
  assert.deepEqual([...f.keys], ['b1_1']);
  assert.equal(f.unidades, 'Unit 1', 'una sola unidad, no "Units 1-1"');
  assert.equal(f.fecha, '2026-11-20');
  assert.equal(focoDelRepaso(st, '2026-11-20').unidades, 'Unit 1', 'el mismo día del examen, todavía');
  assert.equal(focoDelRepaso(st, '2026-11-21').unidades, 'Unit 2', 'pasada la fecha, el siguiente examen');
  const despues = { ...st, classesDone: [...hechas, ids('SPEAKING TEST 1 / Unit 1')] };
  assert.equal(focoDelRepaso(despues, '2026-11-18').unidades, 'Unit 2', 'marcado como hecho: el siguiente');
  assert.equal(focoDelRepaso({ classesDone: hechas }, '2026-11-15').unidades, 'Unit 1', 'sin fecha en el calendario, mientras sea el próximo');
});

test('los exámenes de varias unidades enfocan todas', () => {
  const dos = focoDelRepaso({ classesDone: hasta(62) }, '2027-01-10');
  assert.deepEqual([...dos.keys], ['b1_4', 'b1_5'], '"SPEAKING TEST 4, 5"');
  assert.equal(dos.unidades, 'Units 4-5');
  assert.deepEqual([...focoDelRepaso({ classesDone: hasta(120) }, '2027-04-10').keys], ['b1_9', 'b1_10']);
  // Una presentación oral es de todo: sin unidades, como el final.
  assert.equal(focoDelRepaso({ classesDone: hasta(46), units: {} }, '2027-01-10'), null);
});

test('un examen viejo sin marcar, con su fecha pasada, no se cuenta', () => {
  const hechas = hasta(24).filter(n => n !== ids('SPEAKING TEST 1 / Unit 1'));
  const st = { classesDone: hechas, classSchedule: { [ids('SPEAKING TEST 1 / Unit 1')]: '2026-11-20', [ids('SPEAKING TEST 2 / Unit 2')]: '2026-12-10' } };
  assert.equal(focoDelRepaso(st, '2026-12-01').unidades, 'Unit 2');
});

test('con foco: 14 de las unidades del examen (preguntas primero entre las nuevas) y el resto mezclado', () => {
  const fuente = h.fuente();
  const i = fuente.indexOf('buildDailySession(units, maxCards = 20, foco = null, adelantar = false) {');
  const cuerpo = fuente.slice(i, fuente.indexOf('\n  },', i));
  assert.match(cuerpo, /llenar\(enFoco, Math\.round\(maxCards \* 0\.7\), 6, true\);\n\s*llenar\(x => !enFoco\(x\), maxCards, 0, false\);/);
  assert.match(cuerpo, /nuevasL\.filter\(x => x\.word\.type === 'question'\)/);
  const abrir = h.extraerFuncion('openDailyReview');
  assert.match(abrir, /const foco = focoDelRepaso\(\);\n\s*const session = SRS\.buildDailySession\(state\.units, 20, foco && foco\.keys, !!\(foco && foco\.atrasadas\)\);/);
  assert.match(abrir, /🎯 Focus: \$\{escapeHtml\(foco\.unidades\)\}/);
});

// ── Pasado el speaking: adelantar las unidades atrasadas (17 de octubre) ───
// "Mi aplicación estaba programada para lo del speaking test, pero como ya lo
// presenté, quiero que se enfoque en las unidades que están más atrasadas para
// yo poder adelantarlas." En su respaldo del 16: 325 palabras sin ver en la
// Unit 1, 319 en la 6 y 297 en la 2, y el repaso no se las mostraba nunca.

const palabras = (n, pref, extra = {}) => Array.from({ length: n }, (_, i) => ({ word: `${pref}${i}`, ...extra }));
const unidad = (n, vocab, fcProgress = {}) => ({ key: `a2_${n}`, lid: 'a2', uid: n, batches: [{ vocab }], vocab, fcProgress });
const vistas = (vocab, card) => Object.fromEntries(vocab.map(v => [v.word, { ...card }]));

function suCurso() {
  const v7 = palabras(40, 'u7_'), v9 = palabras(35, 'u9_');
  return {
    a2_1: unidad(1, palabras(60, 'u1_')),
    a2_2: unidad(2, palabras(50, 'u2_')),
    a2_6: unidad(6, [...palabras(3, 'u6q_', { type: 'question' }), ...palabras(55, 'u6_')]),
    a2_7: unidad(7, v7, vistas(v7, { state: 'review', dueDate: '2026-10-01', interval: 7, lapses: 0 })),
    a2_9: unidad(9, [...v9, ...palabras(10, 'u9n_')], vistas(v9, { state: 'review', dueDate: '2026-10-02', interval: 7, lapses: 0 })),
    b1_1: { ...unidad(1, palabras(90, 'b1_')), key: 'b1_1', lid: 'b1' }, // otro nivel: no cuenta
  };
}
// Con el B1, el foco sin examen de unidades son las del B1 (el nivel del curso).
const unidadB1 = (n, vocab, prog) => ({ ...unidad(n, vocab, prog), key: `b1_${n}`, lid: 'b1' });
function suB1() {
  const v4 = palabras(40, 'b4_'), v5 = palabras(35, 'b5_');
  return {
    b1_1: unidadB1(1, palabras(60, 'b1_')),
    b1_2: unidadB1(2, palabras(50, 'b2_')),
    b1_3: unidadB1(3, [...palabras(3, 'b3q_', { type: 'question' }), ...palabras(55, 'b3_')]),
    b1_4: unidadB1(4, v4, vistas(v4, { state: 'review', dueDate: '2026-12-01', interval: 7, lapses: 0 })),
    b1_5: unidadB1(5, [...v5, ...palabras(10, 'b5n_')], vistas(v5, { state: 'review', dueDate: '2026-12-02', interval: 7, lapses: 0 })),
    a2_1: unidad(1, palabras(90, 'u1_')), // otro nivel: no cuenta
  };
}
const antesDeLaPresentacion = hasta(46); // el próximo examen, la Oral Presentation 1, no tiene unidades

test('sin examen de unidades por delante, el foco son las 3 unidades del nivel con más palabras sin ver', () => {
  const f = focoDelRepaso({ classesDone: antesDeLaPresentacion, units: suB1() }, '2026-12-10');
  assert.equal(f.atrasadas, true);
  assert.deepEqual([...f.keys].sort(), ['b1_1', 'b1_2', 'b1_3']);
  assert.equal(f.unidades, 'Units 1, 2, 3', 'en orden de unidad');
  assert.equal(f.faltan, 60 + 50 + 58);
  // La 5 tiene 10 sin ver: menos de 30 ya no cuenta, aunque haya cupo.
  const pocas = suB1(); delete pocas.b1_1; delete pocas.b1_2;
  assert.deepEqual([...focoDelRepaso({ classesDone: antesDeLaPresentacion, units: pocas }, '2026-12-10').keys], ['b1_3']);
  // Con todo estudiado no hay foco: el repaso mezcla todo, como antes.
  assert.equal(focoDelRepaso({ classesDone: antesDeLaPresentacion, units: { b1_4: suB1().b1_4 } }, '2026-12-10'), null);
});

test('antes de un speaking, el foco sigue siendo el de sus unidades', () => {
  const f = focoDelRepaso({ classesDone: hasta(13), units: suB1(), classSchedule: { [ids('SPEAKING TEST 1 / Unit 1')]: '2026-11-20' } }, '2026-11-19');
  assert.equal(f.unidades, 'Unit 1');
  assert.ok(!f.atrasadas);
});

// La sesión de verdad, con el SRS de la app.
const fuenteSRS = h.fuente().match(/const SRS = \{[\s\S]*?\n\};/)[0];
function sesion(units, foco, adelantar) {
  const { SRS } = h.ejecutar(`${h.extraerFuncion('dateLocal')}\n${h.extraerFuncion('intercalarUnidades')}\n${fuenteSRS} return { SRS };`,
    { todayLocal: () => '2026-10-17', getUnitVocab: u => (u.batches || []).flatMap(b => b.vocab || []) });
  return SRS.buildDailySession(units, 20, foco, adelantar).map(x => x.word.word);
}

test('adelantando: 10 palabras nuevas de las atrasadas, por turnos, y 10 del repaso de siempre', () => {
  const units = suCurso();
  const s = sesion(units, new Set(['a2_1', 'a2_2', 'a2_6']), true);
  assert.equal(s.length, 20);
  assert.deepEqual(s.slice(0, 6), ['u1_0', 'u2_0', 'u6_0', 'u1_1', 'u2_1', 'u6_1'], 'una de cada unidad, desde la primera página');
  assert.ok(s.slice(0, 10).every(w => /^u[126]_/.test(w)), 'la primera mitad, nuevas de las atrasadas');
  assert.ok(s.slice(10).every(w => /^u[79]_/.test(w)), 'la otra mitad, las atrasadas de las demás');
  assert.ok(!s.some(w => w.startsWith('u6q_')), 'las preguntas del speaking van al final');
});

test('sin adelantar, las atrasadas de otras unidades llenaban las 20 y no salía ninguna nueva', () => {
  const s = sesion(suCurso(), null, false);
  assert.equal(s.length, 20);
  assert.ok(s.every(w => /^u[79]_/.test(w)));
});

test('el repaso diario adelanta cuando el foco es de unidades atrasadas, y lo dice', () => {
  const abrir = h.extraerFuncion('openDailyReview');
  assert.match(abrir, /🚀 Catch up: \$\{escapeHtml\(foco\.unidades\)\} · \$\{foco\.faltan\} words you haven't studied yet/);
});

// ── Ponerse al día (30 de octubre) ─────────────────────────────────────────
// Volvió de Cartagena con 1423 pendientes y 1384 nuevas: "siento que avanzo
// muy poco". Cada ronda traía 10 nuevas y solo 10 pendientes, así que la pila
// no bajaba. Él escogió: solo pendientes mientras haya 100 o más, y una meta de
// 100 al día (5 rondas de 20).

function conPila(n) {
  const v = palabras(n, 'p_');
  const units = suCurso();
  units.a2_7 = unidad(7, v, vistas(v, { state: 'review', dueDate: '2026-10-01', interval: 7, lapses: 0 }));
  delete units.a2_9;
  return units;
}

test('con 100 pendientes o más, la ronda no trae ninguna nueva', () => {
  const s = sesion(conPila(120), new Set(['a2_1', 'a2_2', 'a2_6']), true);
  assert.equal(s.length, 20);
  assert.ok(s.every(w => w.startsWith('p_')), 'las 20 son pendientes');
  // Con 99 vuelve a adelantar: 10 nuevas de las unidades atrasadas.
  const al = sesion(conPila(99), new Set(['a2_1', 'a2_2', 'a2_6']), true);
  assert.equal(al.filter(w => /^u[126]_/.test(w)).length, 10);
});

test('con la pila alta, ni el foco de un examen mete nuevas', () => {
  // La Unit 1 solo tiene nuevas: antes entraban 6 aunque hubiera 120 pendientes.
  const s = sesion(conPila(120), new Set(['a2_1']), false);
  assert.equal(s.length, 20);
  assert.ok(!s.some(w => w.startsWith('u1_')));
});

const { repasadasHoy } = h.ejecutar(`${h.extraerFuncion('repasadasHoy')} return { repasadasHoy };`, { todayLocal: () => '2026-10-30' });

test('la meta cuenta las tarjetas calificadas hoy, una vez cada una', () => {
  const units = {
    a2_7: { fcProgress: {
      hoy: { history: [{ date: '2026-10-29', rating: 2 }, { date: '2026-10-30', rating: 0 }, { date: '2026-10-30', rating: 2 }] },
      ayer: { history: [{ date: '2026-10-29', rating: 2 }] },
      nueva: { state: 'new', history: [] },
      vieja: { score: 2 }, // formato viejo, sin historial
    } },
    a2_9: { fcProgress: { otra: { history: [{ date: '2026-10-30', rating: 3 }] } } },
    vacia: {},
  };
  assert.equal(repasadasHoy(units), 2);
  assert.equal(repasadasHoy(units, '2026-10-29'), 2);
});

test('la meta y la ronda se ven en Memory Review, al empezar y al terminar', () => {
  const fuente = h.fuente();
  assert.match(fuente, /ATRASO: 100,/);
  assert.match(fuente, /META_DIARIA: 100,/);
  const lista = h.extraerFuncion('renderAllFlashcards');
  assert.match(lista, /\$\{totalDue\} card\$\{totalDue !== 1 \? 's' : ''\} waiting/);
  assert.doesNotMatch(lista, /to review today<\/span>/, 'mil y pico "para hoy" no se podía cumplir');
  assert.match(lista, /🎯 Today's goal: \$\{hechasHoy\} \/ \$\{meta\}/);
  assert.match(lista, /🧠 Start round \$\{Math\.min\(rondas, Math\.floor\(hechasHoy \/ 20\) \+ 1\)\} of \$\{rondas\}/);
  const abrir = h.extraerFuncion('openDailyReview');
  assert.match(abrir, /\$\{!alDia \? `<div class="fc-prep-sub"[^`]*🧹 Catching up: \$\{pendientes\} cards waiting/);
  assert.match(abrir, /\$\{foco && foco\.atrasadas && alDia \?/, 'el aviso de Catch up solo cuando sí trae nuevas');
  assert.match(abrir, /session\.filter\(x => x\.card\.state === 'new'\)\.length/, 'las nuevas que de verdad trae la ronda');
  assert.match(fuente, /const otraRonda = isDailyRev && dueCount > 0 && hechasHoy < SRS\.META_DIARIA;/);
  assert.match(fuente, /\$\{otraRonda \? `<button class="btn btn-primary" onclick="closeFcStudy\(\); openDailyReview\(\)">Next round →<\/button>` : ''\}/);
});

// ── El speaking test check 0 del B1 (8 de noviembre) ───────────────────────
// El profe puso en el tablero los 4 temas de los readiness checks, que son
// gramática del A2: present/continuous/going to (Unit 6), modales (9),
// comparativos (8) y pasado (7). El repaso se enfoca en esas unidades hasta el
// speaking, aunque el curso sea del B1.
test('el speaking test check 0 enfoca la gramática del A2 (Units 6-9)', () => {
  const f = focoDelRepaso({ classesDone: [] }, '2026-11-15');
  assert.deepEqual([...f.keys].sort(), ['a2_6', 'a2_7', 'a2_8', 'a2_9']);
  assert.equal(f.unidades, 'Units 6, 7, 8, 9', 'ordenadas, aunque el tablero vaya 6-9-8-7');
  assert.ok(!f.atrasadas);
  // Marcado como visto, el foco pasa al siguiente examen, ya del B1.
  assert.equal(focoDelRepaso({ classesDone: [ids('SPEAKING TEST CHECK 0 / Unit 1')] }, '2026-11-15').unidades, 'Unit 1');
});
