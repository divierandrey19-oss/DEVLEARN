/**
 * Quién estudia con la app (18 de octubre).
 *
 * Él la comparte con compañeros y quiere ver "el nombre y la última vez" que
 * cada uno la abrió (el nivel no le importa). Cada aparato anota solo eso en
 * students/{uid}, como mucho cada 30 minutos; las reglas de Firebase dejan que
 * cada uno escriba el suyo y que solo él lea la lista. La sección de Settings
 * sale únicamente si la lista se pudo leer.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { cuandoAbrio, escapeHtml } = h.ejecutar(`
  ${h.extraerFuncion('cuandoAbrio')}
  ${h.extraerFuncion('escapeHtml')}
  return { cuandoAbrio, escapeHtml };`, {});

const AHORA = new Date(2026, 9, 18, 7, 0).getTime();

test('cuándo la abrió, dicho en palabras', () => {
  assert.match(cuandoAbrio(new Date(2026, 9, 18, 6, 41).getTime(), AHORA), /^Today 6:41\sAM$/);
  assert.match(cuandoAbrio(new Date(2026, 9, 17, 21, 10).getTime(), AHORA), /^Yesterday 9:10\sPM$/);
  assert.equal(cuandoAbrio(new Date(2026, 9, 15, 12, 0).getTime(), AHORA), '3 days ago');
  assert.equal(cuandoAbrio(null, AHORA), 'never');
});

test('cada aparato anota solo el nombre y la hora: nada de su progreso ni su correo', () => {
  const anotar = h.extraerFuncion('anotarVisita');
  assert.match(anotar, /window\._fb\.setDoc\(window\._fb\.doc\(window\._fb\.db, 'students', user\.uid\),\s*\{ name, lastOpen: window\._fb\.serverTimestamp\(\) \}, \{ merge: true \}\)\.catch\(\(\) => \{\}\);/);
  assert.doesNotMatch(anotar, /email|fcProgress|texts|units/);
  assert.match(anotar, /const name = String\(perfil\.name \|\| user\.displayName \|\| 'Student'\)\.slice\(0, 60\);/, 'el nombre de la bienvenida, o el de Google');
  assert.match(anotar, /if \(Date\.now\(\) - antes < 30 \* 60 \* 1000\) return;/, 'como mucho cada 30 minutos');
});

test('se anota al terminar de revisar la nube, y al volver a la app', () => {
  assert.match(h.extraerFuncion('avisarNubeRevisada'), /if \(ok\) anotarVisita\(\);/);
  assert.match(h.fuente(), /document\.addEventListener\('visibilitychange', \(\) => \{\n\s*if \(document\.visibilityState === 'visible'\) anotarVisita\(\);\n\}\);/);
  assert.match(h.extraerFuncion('openSettings'), /modal\.classList\.add\('open'\);\n\s*mostrarEstudiantes\(\);/);
});

function settings(leer) {
  const sec = { style: { display: 'none' } }, lista = { innerHTML: '' };
  const { mostrarEstudiantes } = h.ejecutar(`${h.extraerFuncion('mostrarEstudiantes')} return { mostrarEstudiantes };`, {
    document: { getElementById: id => (id === 'people-section' ? sec : id === 'people-list' ? lista : null) },
    window: { _leerEstudiantes: leer }, escapeHtml, cuandoAbrio: ms => cuandoAbrio(ms, AHORA),
  });
  return { sec, lista, mostrarEstudiantes };
}

test('a él le sale la lista, la más reciente primero', async () => {
  const s = settings(async () => [
    { name: 'Laura', lastOpen: new Date(2026, 9, 15, 12, 0).getTime() },
    { name: 'Ana', lastOpen: new Date(2026, 9, 18, 6, 41).getTime() },
  ]);
  await s.mostrarEstudiantes();
  assert.equal(s.sec.style.display, '');
  assert.ok(s.lista.innerHTML.indexOf('Ana') < s.lista.innerHTML.indexOf('Laura'));
  assert.match(s.lista.innerHTML, /3 days ago/);
});

test('a los demás no: si Firebase no deja leer, la sección sigue escondida', async () => {
  const s = settings(async () => { throw new Error('Missing or insufficient permissions.'); });
  await s.mostrarEstudiantes();
  assert.equal(s.sec.style.display, 'none');
  const sinCuenta = settings(async () => null);
  await sinCuenta.mostrarEstudiantes();
  assert.equal(sinCuenta.sec.style.display, 'none');
  assert.match(h.fuente(), /<div id="people-section" style="display:none;/);
});

test('un nombre con < o > no se vuelve HTML', async () => {
  const s = settings(async () => [{ name: '<img src=x onerror=alert(1)>', lastOpen: AHORA }]);
  await s.mostrarEstudiantes();
  assert.doesNotMatch(s.lista.innerHTML, /<img/);
});
