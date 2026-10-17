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
const ids = t => sintaxisIds(t);
function sintaxisIds(titulo) { const m = sintaxis.match(new RegExp(`\\{ id: (\\d+), title: '${titulo.replace(/[/]/g, '\\/')}`)); return m && Number(m[1]); }

test('el próximo examen con unidades da el foco, hasta su fecha', () => {
  const hechas = Array.from({ length: 86 }, (_, i) => i + 1); // todo hasta el Review Test 2
  const st = { classesDone: hechas, classSchedule: { [ids('SPEAKING TEST / Units 9-10')]: '2026-10-13' } };
  const f = focoDelRepaso(st, '2026-10-04');
  assert.deepEqual([...f.keys], ['a2_9', 'a2_10']);
  assert.equal(f.unidades, 'Units 9-10');
  assert.equal(f.fecha, '2026-10-13');
  assert.ok(focoDelRepaso(st, '2026-10-13'), 'el mismo día del examen, todavía');
  assert.equal(focoDelRepaso(st, '2026-10-14'), null, 'pasada la fecha, vuelve a mezclar todo');
  const despues = { ...st, classesDone: [...hechas, ids('SPEAKING TEST / Units 9-10')] };
  assert.equal(focoDelRepaso(despues, '2026-10-10'), null, 'marcado como hecho: el próximo es el final, sin unidades');
  assert.ok(focoDelRepaso({ classesDone: hechas }, '2026-10-04'), 'sin fecha en el calendario, mientras sea el próximo');
});

test('un examen viejo sin marcar, con su fecha pasada, no se cuenta', () => {
  const hechas = Array.from({ length: 86 }, (_, i) => i + 1).filter(n => n !== ids('SPEAKING TEST / Units 7-8'));
  const st = { classesDone: hechas, classSchedule: { [ids('SPEAKING TEST / Units 7-8')]: '2026-09-01', [ids('SPEAKING TEST / Units 9-10')]: '2026-10-13' } };
  assert.equal(focoDelRepaso(st, '2026-10-04').unidades, 'Units 9-10');
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
const hechasTodo = Array.from({ length: 87 }, (_, i) => i + 1); // hasta el speaking de las Units 9-10

test('pasado el speaking, el foco son las 3 unidades con más palabras sin ver', () => {
  const f = focoDelRepaso({ classesDone: hechasTodo, units: suCurso() }, '2026-10-17');
  assert.equal(f.atrasadas, true);
  assert.deepEqual([...f.keys].sort(), ['a2_1', 'a2_2', 'a2_6']);
  assert.equal(f.unidades, 'Units 1, 2, 6', 'en orden de unidad');
  assert.equal(f.faltan, 60 + 50 + 58);
  // La 9 tiene 10 sin ver: menos de 30 ya no cuenta, aunque haya cupo.
  const pocas = suCurso(); delete pocas.a2_1; delete pocas.a2_2;
  assert.deepEqual([...focoDelRepaso({ classesDone: hechasTodo, units: pocas }, '2026-10-17').keys], ['a2_6']);
  // Con todo estudiado no hay foco: el repaso mezcla todo, como antes.
  assert.equal(focoDelRepaso({ classesDone: hechasTodo, units: { a2_7: suCurso().a2_7 } }, '2026-10-17'), null);
});

test('antes del speaking, el foco sigue siendo el de sus unidades', () => {
  const hechas = Array.from({ length: 86 }, (_, i) => i + 1);
  const f = focoDelRepaso({ classesDone: hechas, units: suCurso(), classSchedule: { [ids('SPEAKING TEST / Units 9-10')]: '2026-10-16' } }, '2026-10-15');
  assert.equal(f.unidades, 'Units 9-10');
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
