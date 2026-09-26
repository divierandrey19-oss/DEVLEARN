/**
 * ¿Sirven de algo estas pruebas?
 *
 * Una suite en verde no prueba nada por sí sola: puede estar pasando porque no
 * examina nada. Este script rompe `index.html` a propósito, una cosa cada vez,
 * y comprueba que la suite se pone roja. Si una mutación pasa en verde, la
 * prueba que debía atraparla no sirve y hay que arreglarla.
 *
 *     node tests/verificar-mutaciones.js
 *
 * No forma parte de `node --test`: se corre cuando se toca la suite o cuando se
 * quiere confiar en ella antes de publicar algo delicado.
 */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..');
const ORIGINAL = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

/**
 * Cada mutación imita un error real: quitar un guardia, desordenar el arranque,
 * olvidar el sello. `buscar` debe aparecer exactamente una vez, para que una
 * mutación nunca se aplique a medias sin avisar.
 */
const MUTACIONES = [
  {
    nombre: 'quitar el guardia 1 de writeState()',
    buscar: `  if (window.__loadCorrupt) {
    console.warn('writeState: blocked — unresolved load failure, see the recovery banner');
    return false;
  }`,
    reemplazo: '',
  },
  {
    nombre: 'quitar el guardia 1 de healBloatedStore()',
    buscar: `    if (window.__loadCorrupt) { console.warn('Storage heal skipped: unresolved load failure'); return; }`,
    reemplazo: '',
  },
  {
    nombre: 'quitar el guardia 2 (bloqueo de guardado vacío)',
    buscar: `    if (!window.__allowEmptyOverwrite && !Object.keys(state.units || {}).length) {`,
    reemplazo: '    if (false) {',
  },
  {
    nombre: 'quitar el guardia 3 (respaldo diario)',
    buscar: `      if (localStorage.getItem(BACKUP_KEY + '_date') !== today) {`,
    reemplazo: '      if (false) {',
  },
  {
    nombre: 'hacer que el respaldo se repise en cada guardado',
    buscar: `      if (localStorage.getItem(BACKUP_KEY + '_date') !== today) {`,
    reemplazo: '      if (true) {',
  },
  {
    nombre: 'escribir las fotos en localStorage',
    buscar: `    const payload = JSON.stringify(stateWithoutImages());`,
    reemplazo: '    const payload = JSON.stringify(state);',
  },
  {
    nombre: 'no devolver el valor viejo cuando el reintento falla',
    buscar: `        if (prev) { try { localStorage.setItem(KEY, prev); } catch (e3) {} }`,
    reemplazo: '',
  },
  {
    nombre: 'no marcar __loadCorrupt cuando la carga falla',
    buscar: `    if (raw && raw.length > 20) {
      window.__loadCorrupt = true;
      window.__loadCorruptRaw = raw;
    }`,
    reemplazo: '',
  },
  {
    nombre: 'quitar el recurso al respaldo diario en loadState()',
    buscar: `    raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {`,
    reemplazo: `    raw = null;
    if (raw) {`,
  },
  {
    nombre: 'mover BACKUP_KEY después de la línea de arranque',
    buscar: `const BACKUP_KEY = 'lingua_v4_autobackup';
let state = loadState();`,
    reemplazo: `let state = loadState();
const BACKUP_KEY = 'lingua_v4_autobackup';`,
  },
  {
    nombre: 'desincronizar el sello de build',
    buscar: `const APP_BUILD = '`,
    reemplazo: `const APP_BUILD = ' 0000-00-00z'.trim() && '`,
  },
  {
    nombre: 'romper la sintaxis del script principal',
    buscar: `function writeState() {`,
    reemplazo: `function writeState() { if (`,
  },
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'devlearn-mut-'));
let fallos = 0;

/** Corre la suite contra una copia. Devuelve true si pasó (verde). */
function suitePasa(rutaIndex) {
  try {
    execFileSync(process.execPath,
      ['--test', ...listaDePruebas()],
      { cwd: RAIZ, env: { ...process.env, DEVLEARN_INDEX: rutaIndex }, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function listaDePruebas() {
  return fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.join('tests', f));
}

// La referencia: sin mutar, la suite tiene que estar en verde. Si no, no se
// puede concluir nada de las mutaciones.
const rutaBase = path.join(tmp, 'base.html');
fs.writeFileSync(rutaBase, ORIGINAL);
if (!suitePasa(rutaBase)) {
  console.error('✗ La suite ya está en rojo sin mutar nada. Arregla eso primero.');
  process.exit(1);
}
console.log('✓ referencia: la suite pasa con el index.html actual\n');

for (const m of MUTACIONES) {
  const apariciones = ORIGINAL.split(m.buscar).length - 1;
  if (apariciones !== 1) {
    console.error(`✗ "${m.nombre}": el texto a mutar aparece ${apariciones} veces, se esperaba 1.`);
    console.error('  El código cambió; actualiza esta mutación.');
    fallos++;
    continue;
  }

  const ruta = path.join(tmp, `mut-${fallos}-${Date.now()}.html`);
  fs.writeFileSync(ruta, ORIGINAL.replace(m.buscar, m.reemplazo));

  if (suitePasa(ruta)) {
    console.error(`✗ ${m.nombre}\n    la suite siguió en VERDE — ninguna prueba lo atrapa`);
    fallos++;
  } else {
    console.log(`✓ ${m.nombre}\n    la suite se pone en rojo, como debe`);
  }
  fs.unlinkSync(ruta);
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log();
if (fallos) {
  console.error(`${fallos} de ${MUTACIONES.length} mutaciones no se detectan.`);
  process.exit(1);
}
console.log(`Las ${MUTACIONES.length} mutaciones se detectan. La suite sirve.`);
