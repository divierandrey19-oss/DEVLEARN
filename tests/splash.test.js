/**
 * La bienvenida animada, una vez al día.
 *
 * Dura 1,4 s más su desvanecido, y la app ya está lista antes de que termine:
 * en un celular de gama media se puede tocar a los ~1,3 s sin ella y a los
 * ~2,6 s con ella. Él pidió verla una sola vez al día.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

function montar({ hoy = '2026-09-26', disco = {}, almacenRoto = false } = {}) {
  const almacen = almacenRoto
    ? { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } }
    : h.almacenFalso(disco);
  const api = h.ejecutar(`
    ${h.extraerFuncion('shouldPlaySplash')}
    return { shouldPlaySplash };
  `, { todayLocal: () => hoy, localStorage: almacen });
  return { ...api, almacen };
}

test('la primera apertura del día sí la muestra', () => {
  const m = montar();
  assert.equal(m.shouldPlaySplash(), true);
  assert.equal(m.almacen.datos.devlearn_splash_date, '2026-09-26', 'y anota que ya se vio hoy');
});

test('la segunda apertura del mismo día entra directo', () => {
  const m = montar();
  m.shouldPlaySplash();
  assert.equal(m.shouldPlaySplash(), false, 'ya se vio hoy');
  assert.equal(m.shouldPlaySplash(), false, 'y sigue sin verse las veces que haga falta');
});

test('al día siguiente vuelve a mostrarse', () => {
  const m = montar({ hoy: '2026-09-27', disco: { devlearn_splash_date: '2026-09-26' } });
  assert.equal(m.shouldPlaySplash(), true);
  assert.equal(m.almacen.datos.devlearn_splash_date, '2026-09-27');
});

test('si localStorage no responde, se muestra como antes y no lanza', () => {
  // Modo privado o almacenamiento lleno: mejor una animación de más que un error
  // que deje la bienvenida tapando la app.
  const m = montar({ almacenRoto: true });
  assert.doesNotThrow(() => m.shouldPlaySplash());
  assert.equal(m.shouldPlaySplash(), true);
});

test('no toca el estado ni dispara un guardado', () => {
  // Abrir la app no es un cambio de datos: un save() aquí costaría un guardado
  // completo (y una sincronización) en cada apertura.
  const codigo = h.extraerFuncion('shouldPlaySplash');
  assert.doesNotMatch(codigo, /\bstate\b/, 'no debe leer ni escribir `state`');
  assert.doesNotMatch(codigo, /\bsave(Now)?\(|writeState\(/, 'no debe guardar el estado');
});

test('la bienvenida la consulta antes de animar', () => {
  // Sin esta llamada la función existe pero nadie la usa — la bienvenida
  // volvería a salir en cada apertura.
  const fuente = h.fuente();
  const inicio = fuente.indexOf('// ── Cinematic splash');
  assert.notEqual(inicio, -1, 'no se encontró el bloque de la bienvenida');
  const bloque = fuente.slice(inicio, fuente.indexOf('requestAnimationFrame(draw);', inicio));
  assert.match(bloque, /if \(!shouldPlaySplash\(\)\) \{\s*splashEl\.remove\(\);\s*return;\s*\}/,
    'la bienvenida debe saltarse (quitando el elemento) cuando ya se vio hoy');
});
