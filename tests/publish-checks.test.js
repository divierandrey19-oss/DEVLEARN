/**
 * Las comprobaciones del checklist "Antes de publicar" que se pueden automatizar:
 * la sintaxis de los dos bloques `<script>` y el sello de build.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const h = require('./harness.js');

test('los dos bloques <script> compilan', () => {
  const bloques = h.bloquesScript();
  assert.equal(bloques.length, 2, 'se esperan dos bloques en línea: el grande y el módulo');

  // El segundo es `type="module"` y usa `import`, así que cada uno se comprueba
  // con la extensión que le corresponde: .js para el clásico, .mjs para el módulo.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'devlearn-sintaxis-'));
  try {
    bloques.forEach((codigo, i) => {
      const archivo = path.join(tmp, i === 0 ? 'bloque1.js' : 'bloque2.mjs');
      fs.writeFileSync(archivo, codigo);
      try {
        execFileSync(process.execPath, ['--check', archivo], { stdio: 'pipe' });
      } catch (e) {
        const salida = (e.stderr || '').toString().split('\n').slice(0, 6).join('\n');
        assert.fail(`el bloque <script> #${i + 1} no compila:\n${salida}`);
      }
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('el sello de build coincide en los dos sitios', () => {
  // La app lee el comentario del archivo publicado y lo compara con APP_BUILD
  // para decirle al usuario si su dispositivo tiene una copia vieja. Si se
  // desincronizan, ese aviso miente.
  const fuente = h.fuente();

  const comentario = /<!--\s*DEVLEARN_BUILD:\s*([\w.\-]+)\s*-->/.exec(fuente);
  assert.ok(comentario, 'falta el comentario DEVLEARN_BUILD');

  const constante = /^const APP_BUILD = '([\w.\-]+)';/m.exec(fuente);
  assert.ok(constante, 'falta const APP_BUILD');

  assert.equal(comentario[1], constante[1],
    `DEVLEARN_BUILD dice "${comentario[1]}" y APP_BUILD dice "${constante[1]}" — deben ir iguales`);
});

test('el sello de build entra en los primeros 300 bytes', () => {
  // El comprobador de versión pide `Range: bytes=0-300` para no bajar el archivo
  // entero. Si el sello se mueve más abajo, deja de encontrarlo.
  const cabecera = h.fuente().slice(0, 300);
  assert.match(cabecera, /DEVLEARN_BUILD:\s*[\w.\-]+/,
    'el comentario debe seguir arriba del archivo, dentro de los primeros 300 bytes');
});

test('el formato del sello permite compararlo como texto', () => {
  // El veredicto usa `liveBuild < APP_BUILD`, que solo es cronológico si el
  // formato es YYYY-MM-DD + letra.
  const m = /^const APP_BUILD = '([\w.\-]+)';/m.exec(h.fuente());
  assert.match(m[1], /^\d{4}-\d{2}-\d{2}[a-z]$/,
    `"${m[1]}" no cumple YYYY-MM-DD + letra, así que la comparación de texto ` +
    'dejaría de ser cronológica');
});
