/**
 * El orden del arranque.
 *
 * `let state = loadState()` corre cerca de la línea 99 del script. Las funciones
 * se elevan; las constantes no. Una constante declarada más abajo que use
 * `loadState()`, `migrateState()` o `defaultState()` hace que la carga lance
 * `ReferenceError`, se trague el error y devuelva el estado vacío — exactamente
 * el fallo que borró los datos del usuario.
 *
 * Ya pasó dos veces. La segunda, con `U7_WH_BACKFILL`, se atrapó porque las
 * pruebas pasaron a rojo. Esta es esa prueba.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

/** Las funciones que corren durante `loadState()`, antes de que exista `state`. */
const FUNCIONES_DE_ARRANQUE = ['loadState', 'migrateState', 'defaultState', 'healUnitTitles'];

test('toda constante que usa el arranque se declara antes de la línea de arranque', () => {
  const lineaArranque = h.lineaDe(/^let state = loadState\(\);/);
  const declaraciones = h.declaracionesDePrimerNivel();

  // `state` es la propia línea de arranque, no una dependencia de ella.
  declaraciones.delete('state');

  const usados = new Set();
  for (const nombre of FUNCIONES_DE_ARRANQUE) {
    for (const id of h.identificadoresDe(h.extraerFuncion(nombre))) usados.add(id);
  }

  const tarde = [];
  for (const id of usados) {
    const linea = declaraciones.get(id);
    if (linea !== undefined && linea > lineaArranque) {
      tarde.push(`${id} (declarada en la línea ${linea}, el arranque corre en la ${lineaArranque})`);
    }
  }

  assert.deepEqual(tarde, [],
    'Estas constantes se usan durante la carga pero se declaran después de ella.\n' +
    'Una de ellas hace que loadState() lance ReferenceError y devuelva el estado\n' +
    'vacío — el fallo que borró los datos. Súbelas antes de `let state = loadState()`:\n  ' +
    tarde.join('\n  '));
});

test('el arranque sigue estando cerca de la línea 99 del script', () => {
  // No es cosmético: el margen entre el inicio del script y la carga es el
  // espacio donde caben las constantes del arranque. Si se dispara, alguien
  // metió código en medio y conviene mirarlo.
  const { inicio } = h.rangoScriptPrincipal();
  const lineaArranque = h.lineaDe(/^let state = loadState\(\);/);
  const relativa = lineaArranque - inicio + 1;

  assert.ok(relativa < 200,
    `la carga arranca en la línea ${relativa} del script (antes era ~99); ` +
    'si el preámbulo creció tanto, revisa que no haya lógica antes de la carga');
});

test('las constantes de almacenamiento están antes del arranque', () => {
  // Comprobación explícita de las tres claves, por si el análisis de
  // identificadores se despistara: son las que no pueden faltar.
  const lineaArranque = h.lineaDe(/^let state = loadState\(\);/);
  const declaraciones = h.declaracionesDePrimerNivel();

  for (const clave of ['KEY', 'OLD_KEYS', 'BACKUP_KEY']) {
    const linea = declaraciones.get(clave);
    assert.ok(linea !== undefined, `${clave} debe ser una declaración de primer nivel`);
    assert.ok(linea < lineaArranque,
      `${clave} está en la línea ${linea}, después del arranque (${lineaArranque})`);
  }
});

test('las funciones del arranque siguen siendo de primer nivel y localizables', () => {
  // Si alguna se anida o se convierte en arrow function, las pruebas de arriba
  // dejarían de examinar nada. Que falle aquí, ruidosamente.
  for (const nombre of FUNCIONES_DE_ARRANQUE) {
    const codigo = h.extraerFuncion(nombre);
    assert.ok(codigo.length > 20, `"${nombre}" salió sospechosamente corta`);
  }
});
