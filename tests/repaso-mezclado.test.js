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
  const i = fuente.indexOf('buildDailySession(units, maxCards = 20, foco = null) {');
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
const { focoDelRepaso } = h.ejecutar(`${sintaxis}\n${h.extraerFuncion('focoDelRepaso')} return { focoDelRepaso };`, { todayLocal: () => '2026-10-04' });
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
  const i = fuente.indexOf('buildDailySession(units, maxCards = 20, foco = null) {');
  const cuerpo = fuente.slice(i, fuente.indexOf('\n  },', i));
  assert.match(cuerpo, /llenar\(enFoco, Math\.round\(maxCards \* 0\.7\), 6, true\);\n\s*llenar\(x => !enFoco\(x\), maxCards, 0, false\);/);
  assert.match(cuerpo, /nuevasL\.filter\(x => x\.word\.type === 'question'\)/);
  const abrir = h.extraerFuncion('openDailyReview');
  assert.match(abrir, /const foco = focoDelRepaso\(\);\n\s*const session = SRS\.buildDailySession\(state\.units, 20, foco && foco\.keys\);/);
  assert.match(abrir, /🎯 Focus: \$\{escapeHtml\(foco\.unidades\)\}/);
});
