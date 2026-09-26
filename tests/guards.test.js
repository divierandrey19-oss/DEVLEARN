/**
 * Los tres guardias de `writeState()`.
 *
 * El 3 de septiembre de 2026 el usuario perdió todos sus datos. Estos guardias
 * son lo que impide que se repita, y el CLAUDE.md dice que quitar cualquiera
 * borra datos reales de una persona. Estas pruebas son lo que lo detecta si
 * alguien lo intenta.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const KEY = 'lingua_v4';
const BACKUP_KEY = 'lingua_v4_autobackup';
const HOY = '2026-09-26';

const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(2000);

/** Un estado con dos unidades y fotos, como el de alguien que lleva meses. */
function estadoConDatos() {
  return {
    version: 4, theme: 'dark', lang: 'en', streak: 7,
    units: {
      u9: { title: 'Unit 9', batches: [
        { id: 'b1', images: [FOTO], note: 'volleyball' },
        { id: 'b2', images: [FOTO, FOTO], note: 'workout' },
      ]},
      u10: { title: 'Unit 10', batches: [{ id: 'b3', images: [FOTO], note: 'camping' }] },
    },
    studyDates: ['2026-09-24', '2026-09-25'],
    stats: { wordsLearned: 412, unitsCompleted: 2 },
  };
}

function estadoVacio() {
  return { version: 4, theme: 'dark', units: {}, studyDates: [], stats: {} };
}

/**
 * Monta `writeState()` con sus dependencias recortadas del HTML real.
 * Devuelve la función y sondas para ver los efectos secundarios.
 */
function montarWriteState({ estado, disco = {}, loadCorrupt = false,
                            allowEmptyOverwrite = false, rechazarSi = null,
                            hoy = HOY } = {}) {
  const almacen = h.almacenFalso(disco, { rechazarSi });
  const consola = h.consolaFalsa();
  const bannersVacio = [];
  const bannersLleno = [];
  const bannersOcultos = [];

  const codigo = `
    let _saveDirty = false;
    let _storageFull = false;
    ${h.extraerFuncion('stateWithoutImages')}
    ${h.extraerFuncion('writeState')}
    return {
      writeState,
      sondas: {
        get saveDirty() { return _saveDirty; },
        get storageFull() { return _storageFull; },
      },
    };
  `;

  const api = h.ejecutar(codigo, {
    KEY, BACKUP_KEY,
    state: estado,
    window: { __loadCorrupt: loadCorrupt, __allowEmptyOverwrite: allowEmptyOverwrite },
    localStorage: almacen,
    console: consola,
    todayLocal: () => hoy,
    showEmptyOverwriteBanner: n => bannersVacio.push(n),
    showStorageBanner: () => bannersLleno.push(true),
    hideStorageBanner: () => bannersOcultos.push(true),
  });

  return { ...api, almacen, consola, bannersVacio, bannersLleno, bannersOcultos };
}

// ---------------------------------------------------------------------------
// Guardia 1: si la carga falló, no se escribe nada.
// ---------------------------------------------------------------------------

test('guardia 1: con __loadCorrupt no escribe y deja el disco intacto', () => {
  const enDisco = '{"units":{"u9":{"title":"Unit 9"'; // truncado, ilegible
  const m = montarWriteState({ estado: estadoVacio(), disco: { [KEY]: enDisco }, loadCorrupt: true });

  assert.equal(m.writeState(), false, 'debe negarse a guardar');
  assert.equal(m.almacen.datos[KEY], enDisco, 'el valor en disco no se toca');
  assert.equal(m.almacen.escrituras.length, 0, 'no escribe en ninguna clave');
  assert.match(m.consola.lineas.join(' | '), /blocked — unresolved load failure/);
});

test('guardia 1: se impone incluso si el estado en memoria tiene datos', () => {
  // Un estado poblado no vuelve legítima la escritura: si la carga falló, lo
  // que hay en memoria no vino del disco y no debe pisarlo.
  const enDisco = '{"units":{"u9":{"title":"Unit 9"';
  const m = montarWriteState({ estado: estadoConDatos(), disco: { [KEY]: enDisco }, loadCorrupt: true });

  assert.equal(m.writeState(), false);
  assert.equal(m.almacen.datos[KEY], enDisco);
});

// ---------------------------------------------------------------------------
// Guardia 2: no reemplazar unidades guardadas por ninguna.
// ---------------------------------------------------------------------------

test('guardia 2: no reemplaza unidades en disco con un estado vacío', () => {
  const enDisco = JSON.stringify({ units: { u9: {}, u10: {} } });
  const m = montarWriteState({ estado: estadoVacio(), disco: { [KEY]: enDisco } });

  assert.equal(m.writeState(), false, 'debe negarse');
  assert.equal(m.almacen.datos[KEY], enDisco, 'las unidades siguen en disco');
  assert.deepEqual(m.bannersVacio, [2], 'avisa al usuario, con la cuenta real');
  assert.equal(m.sondas.saveDirty, true, 'queda marcado como pendiente');
});

test('guardia 2: una importación deliberada sí puede vaciar', () => {
  const enDisco = JSON.stringify({ units: { u9: {}, u10: {} } });
  const m = montarWriteState({
    estado: estadoVacio(), disco: { [KEY]: enDisco }, allowEmptyOverwrite: true,
  });

  assert.equal(m.writeState(), true, 'con __allowEmptyOverwrite se permite');
  assert.deepEqual(JSON.parse(m.almacen.datos[KEY]).units, {});
  assert.deepEqual(m.bannersVacio, [], 'no avisa: es intencional');
});

test('guardia 2: una instalación nueva de verdad sí guarda', () => {
  // Sin nada en disco no hay nada que proteger; un usuario nuevo debe poder
  // guardar su primer estado vacío.
  const m = montarWriteState({ estado: estadoVacio(), disco: {} });

  assert.equal(m.writeState(), true);
  assert.ok(m.almacen.datos[KEY], 'escribió el estado inicial');
  assert.deepEqual(m.bannersVacio, []);
});

test('guardia 2: un disco ilegible no bloquea el guardado', () => {
  // Es el agujero que hace insustituible al guardia 1: aquí `JSON.parse` lanza
  // y el guardia 2 deja pasar la escritura a propósito, porque no hay nada
  // legible que proteger. Con datos en memoria eso es correcto.
  const m = montarWriteState({ estado: estadoConDatos(), disco: { [KEY]: '{roto' } });

  assert.equal(m.writeState(), true);
  assert.equal(Object.keys(JSON.parse(m.almacen.datos[KEY]).units).length, 2);
});

// ---------------------------------------------------------------------------
// Guardia 3: respaldo diario.
// ---------------------------------------------------------------------------

test('guardia 3: el primer guardado del día se duplica en el respaldo', () => {
  const m = montarWriteState({ estado: estadoConDatos(), disco: {} });

  assert.equal(m.writeState(), true);
  assert.ok(m.almacen.datos[BACKUP_KEY], 'existe el respaldo');
  assert.equal(m.almacen.datos[BACKUP_KEY + '_date'], HOY, 'queda fechado');
  assert.equal(m.almacen.datos[BACKUP_KEY], m.almacen.datos[KEY],
               'el respaldo es el mismo contenido que el guardado real');
});

test('guardia 3: los guardados siguientes del mismo día no repisan el respaldo', () => {
  const m = montarWriteState({ estado: estadoConDatos(), disco: {} });
  m.writeState();
  const respaldoInicial = m.almacen.datos[BACKUP_KEY];

  // El usuario borra una unidad y vuelve a guardar el mismo día. El respaldo
  // debe seguir siendo el de la mañana, no la versión ya reducida.
  delete m.almacen.datos.nada;
  const estado = JSON.parse(respaldoInicial);
  delete estado.units.u10;
  const m2 = montarWriteState({ estado, disco: { ...m.almacen.datos } });
  assert.equal(m2.writeState(), true);

  assert.equal(m2.almacen.datos[BACKUP_KEY], respaldoInicial,
               'el respaldo del día no se sobrescribe');
  assert.equal(Object.keys(JSON.parse(m2.almacen.datos[BACKUP_KEY]).units).length, 2,
               'el respaldo conserva las dos unidades');
});

test('guardia 3: un respaldo que falla no tumba el guardado real', () => {
  // Es "best-effort" a propósito: el respaldo nunca debe costar el guardado.
  const m = montarWriteState({
    estado: estadoConDatos(), disco: {},
    rechazarSi: (k) => k.startsWith(BACKUP_KEY),
  });

  assert.equal(m.writeState(), true, 'el guardado real sigue devolviendo true');
  assert.ok(m.almacen.datos[KEY], 'los datos quedaron guardados');
  assert.equal(m.almacen.datos[BACKUP_KEY], undefined);
});

// ---------------------------------------------------------------------------
// Las fotos no van a localStorage.
// ---------------------------------------------------------------------------

test('las fotos no se escriben en localStorage, pero siguen en memoria', () => {
  const estado = estadoConDatos();
  const m = montarWriteState({ estado, disco: {} });

  assert.equal(m.writeState(), true);
  assert.ok(!m.almacen.datos[KEY].includes('"data:image'),
            'el blob guardado no lleva fotos');
  assert.equal(estado.units.u9.batches[0].images[0], FOTO,
               'el estado en memoria conserva la foto');

  const guardado = JSON.parse(m.almacen.datos[KEY]);
  assert.deepEqual(guardado.units.u9.batches[0].images, [],
                   'el lote sigue ahí con images vacío, no borrado');
  assert.equal(guardado.units.u9.batches[0].note, 'volleyball',
               'el resto del lote se conserva');
  assert.equal(guardado.stats.wordsLearned, 412);
});

// ---------------------------------------------------------------------------
// Límite de almacenamiento.
// ---------------------------------------------------------------------------

test('al topar el límite, borra el valor viejo y reintenta', () => {
  // El navegador puede negarse a reemplazar un valor en su sitio aunque el
  // nuevo sea más chico. Soltar el viejo primero garantiza el espacio.
  const m = montarWriteState({
    estado: estadoConDatos(),
    disco: { [KEY]: 'x'.repeat(5000) },
    rechazarSi: (k, v, datos) => k === KEY && datos[k] !== undefined,
  });

  assert.equal(m.writeState(), true, 'el reintento tras borrar sí entra');
  assert.equal(Object.keys(JSON.parse(m.almacen.datos[KEY]).units).length, 2);
  assert.equal(m.sondas.storageFull, false);
});

test('si el reintento también falla, el valor viejo vuelve a su sitio', () => {
  // Un guardado fallido nunca debe costar más de lo que ya costaba.
  const viejo = JSON.stringify({ units: { u9: {}, u10: {} } });
  const m = montarWriteState({
    estado: estadoConDatos(),
    disco: { [KEY]: viejo },
    rechazarSi: (k, v) => k === KEY && v.length > viejo.length,
  });

  assert.equal(m.writeState(), false, 'informa el fallo');
  assert.equal(m.almacen.datos[KEY], viejo, 'el valor viejo está de vuelta');
  assert.equal(m.sondas.storageFull, true);
  assert.deepEqual(m.bannersLleno, [true], 'avisa con un banner persistente');
  assert.equal(m.sondas.saveDirty, true);
});

test('un guardado exitoso retira el aviso de almacenamiento lleno', () => {
  const viejo = JSON.stringify({ units: { u9: {} } });
  const m = montarWriteState({
    estado: estadoConDatos(),
    disco: { [KEY]: viejo },
    rechazarSi: (k, v) => k === KEY && v.length > viejo.length,
  });
  assert.equal(m.writeState(), false);
  assert.equal(m.sondas.storageFull, true);

  // Ahora el almacén acepta: el siguiente guardado debe limpiar el estado.
  const m2 = montarWriteState({ estado: estadoConDatos(), disco: { [KEY]: viejo } });
  assert.equal(m2.writeState(), true);
  assert.equal(m2.sondas.saveDirty, false, 'ya no queda nada pendiente');
});
