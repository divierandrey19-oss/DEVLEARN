/**
 * Los cambios de página.
 *
 * Antes cada elemento tardaba 0,55 s en aparecer con escalones de 0,04 s, así
 * que el séptimo terminaba a los 0,81 s de cada cambio de página: la página ya
 * estaba lista y había que esperar a la animación para verla. Él pidió la app
 * más ágil. El escalonado se conserva — solo más apretado — para que siga
 * viéndose suave.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const TOPE = 0.3; // segundos hasta que la página queda quieta

function segundos(re, texto, que) {
  const m = re.exec(texto);
  assert.ok(m, `no se encontró ${que} en el CSS`);
  return Number(m[1]);
}

test('la página entra en menos de 0,25 s', () => {
  const t = segundos(/--t-page:\s*([\d.]+)s/, h.fuente(), '--t-page');
  assert.ok(t <= 0.25, `--t-page es ${t}s; con eso cada cambio de página se siente lento`);
});

test('todo el contenido de la página queda quieto antes de 0,3 s', () => {
  const fuente = h.fuente();
  const duracion = segundos(/\.page\.active > \* \{\s*animation:\s*pageChildIn\s+([\d.]+)s/, fuente,
                            'la animación pageChildIn');
  const retrasos = [...fuente.matchAll(/\.page\.active > \*:nth-child\(\d+\) \{ animation-delay:\s*([\d.]+)s; \}/g)]
    .map(m => Number(m[1]));
  assert.ok(retrasos.length >= 5, 'no se encontró el escalonado de los hijos');

  const ultimo = duracion + Math.max(...retrasos);
  assert.ok(ultimo <= TOPE,
    `el último elemento termina de aparecer a los ${ultimo.toFixed(2)} s (tope ${TOPE} s)`);
});

test('el escalonado se conserva, para que siga viéndose suave', () => {
  // Más rápido no quiere decir quitarle el efecto: los hijos siguen entrando
  // uno tras otro, y en orden.
  const retrasos = [...h.fuente().matchAll(/\.page\.active > \*:nth-child\(\d+\) \{ animation-delay:\s*([\d.]+)s; \}/g)]
    .map(m => Number(m[1]));
  const ordenados = retrasos.slice().sort((a, b) => a - b);
  assert.deepEqual(retrasos, ordenados, 'los retrasos deben ir en orden');
  assert.ok(Math.max(...retrasos) > 0, 'debe quedar algún escalonado');
});
