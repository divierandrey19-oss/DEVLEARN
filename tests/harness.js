/**
 * Arnés de pruebas para DEV LEARN.
 *
 * La app es un solo HTML sin build ni dependencias, así que no hay nada que
 * importar: las pruebas recortan la función que van a probar directamente de
 * `index.html` y la ejecutan con un `localStorage` de mentira. Se prueba el
 * código que de verdad se publica, no una copia que se desactualiza.
 *
 * El recorte se apoya en el formato del archivo: las funciones de primer nivel
 * empiezan en la columna 0 y cierran con un `}` en la columna 0. Si eso cambia,
 * `extraerFuncion` lanza en vez de devolver vacío — una prueba que no encuentra
 * su función debe fallar, no pasar por no haber probado nada.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Por defecto se prueba el `index.html` del repo. `DEVLEARN_INDEX` permite
 * apuntar a otra copia, que es como `verificar-mutaciones.js` comprueba que
 * estas pruebas de verdad se ponen rojas cuando se rompe lo que protegen.
 */
const RUTA_INDEX = process.env.DEVLEARN_INDEX || path.join(__dirname, '..', 'index.html');
const FUENTE = fs.readFileSync(RUTA_INDEX, 'utf8');
const LINEAS = FUENTE.split('\n'); // LINEAS[i] es la línea i+1

/** El HTML completo, tal cual se publica. */
function fuente() {
  return FUENTE;
}

/** Los bloques `<script>` en línea (los que no tienen `src`). */
function bloquesScript() {
  const bloques = [...FUENTE.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  if (!bloques.length) throw new Error('No se encontró ningún <script> en línea en index.html');
  return bloques;
}

/**
 * Rango de líneas (1-based) del primer bloque `<script>`, el grande.
 * Sirve para las comprobaciones de orden del arranque, que se razonan en
 * líneas del script, no del archivo.
 */
function rangoScriptPrincipal() {
  const inicio = LINEAS.findIndex(l => /^<script>\s*$/.test(l));
  if (inicio === -1) throw new Error('No se encontró la apertura del <script> principal');
  const fin = LINEAS.findIndex((l, i) => i > inicio && /^<\/script>/.test(l));
  if (fin === -1) throw new Error('No se encontró el cierre del <script> principal');
  return { inicio: inicio + 2, fin: fin }; // primera línea de código .. última
}

/** Número de línea (1-based) de la primera línea que cumple el patrón. */
function lineaDe(patron) {
  const i = LINEAS.findIndex(l => patron.test(l));
  if (i === -1) throw new Error(`No se encontró ninguna línea que cumpla ${patron}`);
  return i + 1;
}

/**
 * Recorta una función de primer nivel por su nombre: desde `function NOMBRE(`
 * en la columna 0 hasta el siguiente `}` en la columna 0.
 */
function extraerFuncion(nombre) {
  const inicio = LINEAS.findIndex(l => l.startsWith(`function ${nombre}(`));
  if (inicio === -1) {
    throw new Error(`No se encontró la función de primer nivel "${nombre}" en index.html`);
  }
  const fin = LINEAS.findIndex((l, i) => i > inicio && l === '}');
  if (fin === -1) throw new Error(`No se encontró el cierre de "${nombre}"`);
  return LINEAS.slice(inicio, fin + 1).join('\n');
}

/**
 * Recorta una IIFE con nombre: desde `(function NOMBRE() {` en la columna 0
 * hasta el `})();` en la columna 0.
 */
function extraerIIFE(nombre) {
  const inicio = LINEAS.findIndex(l => l.startsWith(`(function ${nombre}(`));
  if (inicio === -1) throw new Error(`No se encontró la IIFE "${nombre}" en index.html`);
  const fin = LINEAS.findIndex((l, i) => i > inicio && l.startsWith('})()'));
  if (fin === -1) throw new Error(`No se encontró el cierre de la IIFE "${nombre}"`);
  return LINEAS.slice(inicio, fin + 1).join('\n');
}

/** Declaraciones `const`/`let`/`var` de primer nivel → línea (1-based). */
function declaracionesDePrimerNivel() {
  const mapa = new Map();
  LINEAS.forEach((l, i) => {
    const m = /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(l);
    if (m && !mapa.has(m[1])) mapa.set(m[1], i + 1);
  });
  return mapa;
}

/** Identificadores que aparecen en un trozo de código, sin comentarios ni cadenas. */
function identificadoresDe(codigo) {
  const limpio = codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // comentarios de bloque
    .replace(/\/\/[^\n]*/g, ' ')          // comentarios de línea
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")     // cadenas simples
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')     // cadenas dobles
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');      // plantillas
  return new Set(limpio.match(/\b[A-Za-z_$][\w$]*\b/g) || []);
}

/**
 * Un `localStorage` de mentira.
 *
 * `rechazarSi(clave, valor)` permite reproducir el comportamiento del navegador
 * al topar el límite, que es lo que `writeState()` intenta sortear: la escritura
 * se rechaza según la clave y el valor, no siempre.
 */
function almacenFalso(inicial = {}, { rechazarSi = null } = {}) {
  const datos = { ...inicial };
  const escrituras = [];
  return {
    datos,
    escrituras,
    getItem(k) { return k in datos ? datos[k] : null; },
    setItem(k, v) {
      const valor = String(v);
      if (rechazarSi && rechazarSi(k, valor, datos)) {
        const e = new Error('cuota agotada');
        e.name = 'QuotaExceededError';
        throw e;
      }
      datos[k] = valor;
      escrituras.push(k);
    },
    removeItem(k) { delete datos[k]; },
  };
}

/** Consola de mentira que guarda lo que se le dice, para poder afirmar sobre ello. */
function consolaFalsa() {
  const lineas = [];
  const push = nivel => (...args) => lineas.push(`${nivel}: ${args.join(' ')}`);
  return { lineas, warn: push('warn'), info: push('info'), error: push('error'), log: push('log') };
}

/**
 * Ejecuta código recortado de `index.html` con los globales que se le pasen.
 * `codigo` debe acabar en un `return` con lo que la prueba quiera inspeccionar.
 */
function ejecutar(codigo, globales) {
  const nombres = Object.keys(globales);
  return new Function(...nombres, codigo)(...nombres.map(n => globales[n]));
}

module.exports = {
  RUTA_INDEX,
  fuente,
  bloquesScript,
  rangoScriptPrincipal,
  lineaDe,
  extraerFuncion,
  extraerIIFE,
  declaracionesDePrimerNivel,
  identificadoresDe,
  almacenFalso,
  consolaFalsa,
  ejecutar,
};
