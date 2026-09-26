/**
 * `loadState()` — de dónde salen los datos al abrir la app.
 *
 * Se prueba el flujo: qué fuente elige, cuándo levanta la bandera
 * `__loadCorrupt` y cuándo no. `migrateState` y `healUnitTitles` se sustituyen
 * por dobles a propósito — aquí importa la elección de la fuente, no la
 * migración, y un doble deja la prueba señalando el fallo real cuando rompe.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const KEY = 'lingua_v4';
const OLD_KEYS = ['lingua_v3', 'lingua_v2'];
const BACKUP_KEY = 'lingua_v4_autobackup';

function montarLoadState(disco) {
  const almacen = h.almacenFalso(disco);
  const consola = h.consolaFalsa();
  const ventana = {};

  const codigo = `
    const migrateState = s => s;          // doble: la migración tiene lo suyo
    const healUnitTitles = () => {};      // doble: no influye en la elección
    ${h.extraerFuncion('defaultState')}
    ${h.extraerFuncion('loadState')}
    return loadState();
  `;

  const estado = h.ejecutar(codigo, {
    KEY, OLD_KEYS, BACKUP_KEY,
    window: ventana,
    localStorage: almacen,
    console: consola,
  });

  return { estado, almacen, consola, ventana };
}

test('lee la clave principal cuando es legible', () => {
  const guardado = { version: 4, units: { u9: { title: 'Unit 9' } }, stats: { wordsLearned: 412 } };
  const m = montarLoadState({ [KEY]: JSON.stringify(guardado) });

  assert.deepEqual(Object.keys(m.estado.units), ['u9']);
  assert.equal(m.ventana.__loadCorrupt, undefined, 'nada que marcar');
});

test('un blob ilegible levanta __loadCorrupt y guarda el original', () => {
  // Es el arranque que borró los datos: sin la bandera, el estado vacío que
  // devuelve aquí se veía igual que una instalación nueva.
  const roto = '{"version":4,"units":{"u9":{"title":"Unit 9","batches":[{"id"';
  const m = montarLoadState({ [KEY]: roto });

  assert.deepEqual(m.estado.units, {}, 'devuelve el estado vacío');
  assert.equal(m.ventana.__loadCorrupt, true, 'levanta la bandera');
  assert.equal(m.ventana.__loadCorruptRaw, roto,
               'conserva el original para que se pueda descargar');
  assert.match(m.consola.lineas.join(' | '), /Load state failed/);
});

test('un blob ilegible pero diminuto no levanta la bandera', () => {
  // Menos de 20 caracteres no es un guardado real que valga la pena defender,
  // y dejar la bandera puesta bloquearía la app sin nada que recuperar.
  const m = montarLoadState({ [KEY]: '{roto' });

  assert.deepEqual(m.estado.units, {});
  assert.equal(m.ventana.__loadCorrupt, undefined);
});

test('sin clave principal recurre al respaldo diario', () => {
  const respaldo = { version: 4, units: { u9: {}, u10: {} }, stats: { wordsLearned: 400 } };
  const m = montarLoadState({ [BACKUP_KEY]: JSON.stringify(respaldo) });

  assert.deepEqual(Object.keys(m.estado.units), ['u9', 'u10'], 'recupera del respaldo');
  assert.equal(m.ventana.__loadedFromAutoBackup, true, 'lo deja constar');
  assert.equal(m.ventana.__loadCorrupt, undefined);
});

test('al recuperar del respaldo captura su fecha, no la de hoy', () => {
  // El aviso usa esta fecha para decir cuánto se pudo perder. Tiene que
  // capturarse durante la carga: el primer guardado del día reescribe la fecha
  // del respaldo con hoy (guardia 3), y entonces el aviso diría "de hoy".
  const respaldo = { version: 4, units: { u9: {}, u10: {} } };
  const m = montarLoadState({
    [BACKUP_KEY]: JSON.stringify(respaldo),
    [BACKUP_KEY + '_date']: '2026-09-21',
  });

  assert.equal(m.ventana.__loadedFromAutoBackup, true);
  assert.equal(m.ventana.__autoBackupDate, '2026-09-21', 'la fecha del respaldo, tal cual');
});

test('un respaldo sin fecha no rompe la carga', () => {
  // Un respaldo escrito por una versión vieja puede no tener su clave de fecha.
  const respaldo = { version: 4, units: { u9: {} } };
  const m = montarLoadState({ [BACKUP_KEY]: JSON.stringify(respaldo) });

  assert.equal(m.ventana.__loadedFromAutoBackup, true, 'recupera igual');
  assert.equal(m.ventana.__autoBackupDate, null, 'sin fecha, pero sin lanzar');
});

test('sin nada guardado devuelve un estado nuevo, sin bandera', () => {
  const m = montarLoadState({});

  assert.deepEqual(m.estado.units, {});
  assert.equal(m.estado.version, 4);
  assert.equal(m.ventana.__loadCorrupt, undefined, 'una instalación nueva no es una carga fallida');
});

test('migra desde las claves viejas si no hay clave actual', () => {
  const viejo = { version: 3, units: { u8: { title: 'Unit 8' } } };
  const m = montarLoadState({ lingua_v3: JSON.stringify(viejo) });

  assert.deepEqual(Object.keys(m.estado.units), ['u8']);
  assert.ok(m.almacen.datos[KEY], 'deja lo migrado bajo la clave actual');
});

test('una importación pendiente gana a todo lo demás', () => {
  // El código exige más de 100 caracteres para tomar en serio una importación,
  // así que el fixture tiene que ser un respaldo con cuerpo, no un esqueleto.
  const importado = {
    version: 4, theme: 'dark', lang: 'en', streak: 7,
    units: {
      u9:  { title: 'Unit 9',  batches: [{ id: 'b1', note: 'volleyball' }] },
      u10: { title: 'Unit 10', batches: [{ id: 'b2', note: 'camping' }] },
      u11: { title: 'Unit 11', batches: [] },
    },
    studyDates: ['2026-09-24', '2026-09-25'],
    stats: { wordsLearned: 412, unitsCompleted: 2 },
  };
  const pendiente = JSON.stringify(importado);
  assert.ok(pendiente.length > 100, 'el fixture debe pasar el umbral de longitud');

  const m = montarLoadState({
    devlearn_pending_import: pendiente,
    [KEY]: JSON.stringify({ version: 4, units: { viejo: {} } }),
  });

  assert.deepEqual(Object.keys(m.estado.units), ['u9', 'u10', 'u11']);
  assert.equal(m.almacen.datos.devlearn_pending_import, undefined, 'la consume');
  assert.equal(m.almacen.datos[KEY], pendiente, 'y la deja como la copia actual');
});

test('un respaldo ilegible también levanta la bandera', () => {
  // El respaldo es la última red: si tampoco se puede leer, hay que avisar,
  // no fingir instalación nueva.
  const roto = '{"version":4,"units":{"u9":{"title":"Unit 9","batches":[{"id"';
  const m = montarLoadState({ [BACKUP_KEY]: roto });

  assert.deepEqual(m.estado.units, {});
  assert.equal(m.ventana.__loadCorrupt, true);
  assert.equal(m.ventana.__loadCorruptRaw, roto);
});
