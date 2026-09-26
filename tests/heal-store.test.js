/**
 * `healBloatedStore()` — la compactación de arranque.
 *
 * Esta función escribe en `KEY` directamente, sin pasar por `writeState()`, así
 * que no hereda el guardia 1. Cuando la carga falla, `state` ya quedó vacío, y
 * si el blob ilegible contiene `"data:image` (un guardado viejo con las fotos
 * incrustadas, justo lo que esta función existe para limpiar), el valor
 * "compactado" era el estado vacío: borraba los datos que `writeState()` se
 * había negado a tocar, y con ellos la única copia que `downloadCorruptRaw()`
 * podía ofrecer.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const KEY = 'lingua_v4';
const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(3000);

function estadoConFotos() {
  return {
    version: 4, theme: 'dark',
    units: {
      u9: { title: 'Unit 9', batches: [
        { id: 'b1', images: [FOTO], note: 'volleyball' },
        { id: 'b2', images: [FOTO, FOTO], note: 'workout' },
      ]},
      u10: { title: 'Unit 10', batches: [{ id: 'b3', images: [FOTO], note: 'camping' }] },
    },
    stats: { wordsLearned: 412, unitsCompleted: 2 },
  };
}

function estadoVacio() {
  return { version: 4, theme: 'dark', units: {}, stats: {} };
}

function montarHeal({ estado, disco, loadCorrupt = false }) {
  const almacen = h.almacenFalso(disco);
  const consola = h.consolaFalsa();
  const codigo = `
    ${h.extraerFuncion('stateWithoutImages')}
    ${h.extraerIIFE('healBloatedStore')}
  `;
  h.ejecutar(codigo, {
    KEY,
    state: estado,
    window: { __loadCorrupt: loadCorrupt },
    localStorage: almacen,
    console: consola,
  });
  return { almacen, consola };
}

test('caso normal: un guardado válido con fotos incrustadas sí se compacta', () => {
  const cargado = estadoConFotos();       // lo que devolvió loadState()
  const enDisco = JSON.stringify(cargado); // lo que hay en disco, con fotos
  const m = montarHeal({ estado: cargado, disco: { [KEY]: enDisco } });

  const despues = m.almacen.datos[KEY];
  assert.notEqual(despues, enDisco, 'reescribió el blob');
  assert.ok(despues.length < enDisco.length, `se encogió: ${enDisco.length} B → ${despues.length} B`);
  assert.ok(!despues.includes('"data:image'), 'ya no queda carga de fotos');

  const guardado = JSON.parse(despues);
  assert.deepEqual(Object.keys(guardado.units), ['u9', 'u10'], 'las dos unidades siguen');
  assert.equal(guardado.units.u9.batches.length, 2, 'los lotes siguen');
  assert.equal(guardado.units.u9.batches[0].note, 'volleyball', 'la metadata del lote se conserva');
  assert.deepEqual(guardado.units.u9.batches[0].images, [], 'images vaciado, no borrado');
  assert.equal(guardado.stats.wordsLearned, 412, 'las estadísticas se conservan');
  assert.match(m.consola.lineas.join(' | '), /Storage healed/);
});

test('con __loadCorrupt no toca el disco, aunque el blob tenga fotos', () => {
  // Un guardado truncado: JSON inválido que todavía contiene `"data:image`.
  const bueno = JSON.stringify(estadoConFotos());
  const truncado = bueno.slice(0, Math.floor(bueno.length * 0.8));
  assert.throws(() => JSON.parse(truncado), 'el fixture debe ser ilegible de verdad');
  assert.ok(truncado.includes('"data:image'), 'el fixture debe contener fotos');

  const m = montarHeal({ estado: estadoVacio(), disco: { [KEY]: truncado }, loadCorrupt: true });

  assert.equal(m.almacen.datos[KEY], truncado, 'el disco queda byte a byte igual');
  assert.equal(m.almacen.escrituras.length, 0, 'no escribe nada');
  assert.match(m.consola.lineas.join(' | '), /unresolved load failure/);
});

test('con __loadCorrupt tampoco toca un blob sin fotos', () => {
  const truncado = '{"version":4,"units":{"u9":{"title":"Unit 9","batches":[{"id":"b1"';
  const m = montarHeal({ estado: estadoVacio(), disco: { [KEY]: truncado }, loadCorrupt: true });

  assert.equal(m.almacen.datos[KEY], truncado);
  assert.equal(m.almacen.escrituras.length, 0);
});

test('una carga sana con estado vacío y sin fotos no toca el disco', () => {
  // Comportamiento previo, que el guardia no debe alterar: sin `"data:image`
  // no hay nada que compactar.
  const enDisco = JSON.stringify(estadoVacio());
  const m = montarHeal({ estado: estadoVacio(), disco: { [KEY]: enDisco } });

  assert.equal(m.almacen.datos[KEY], enDisco);
  assert.equal(m.almacen.escrituras.length, 0);
});

test('no compacta si el resultado no sería más chico', () => {
  // La guarda `clean.length >= raw.length` evita reescribir para nada.
  const enDisco = JSON.stringify({ version: 4, units: {}, nota: '"data:image' });
  const m = montarHeal({ estado: { version: 4, units: {}, nota: '"data:image', extra: 'x'.repeat(500) }, disco: { [KEY]: enDisco } });

  assert.equal(m.almacen.datos[KEY], enDisco, 'lo deja como estaba');
});
