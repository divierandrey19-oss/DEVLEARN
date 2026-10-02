/**
 * Agregarle la foto a una página que ya existe.
 *
 * Las Units 1 y 3 a 6 se subieron sin guardar las fotos: no se pueden revisar
 * contra el libro (como las 8, 9, 10 y 2) ni regenerar. Volver a subirlas
 * costaría otro análisis y entrarían casi vacías (la limpieza de repetidas
 * quita lo que ya existe). Él eligió poder agregarle la foto a cada página sin
 * analizarla: no cuesta nada y no toca sus tarjetas ni su progreso.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();

function montar({ guarda = true, pagina = '52' } = {}) {
  const u = { fcProgress: { family: { interval: 9 } }, batches: [
    { id: 'b1', vocab: [{ word: 'family' }], images: [] },
    { id: 'pv_a2_4', vocab: [{ word: 'grow up' }], images: [] },
    { id: 'b2', vocab: [{ word: 'cousin' }], images: ['data:image/jpeg;base64,YQ=='] },
    { id: 'b3', vocab: [], images: [], analyzing: true },
  ] };
  const hecho = { puestas: [], toasts: [], hojas: [] };
  const env = {
    current: { lid: 'a2', uid: 4 },
    getUnit: () => u,
    document: { getElementById: id => (id === 'ps-page' ? { value: pagina } : null) },
    FileReader: class { readAsDataURL(f) { setTimeout(() => this.onload({ target: { result: 'data:image/jpeg;base64,' + f.name } })); } },
    compressImage: async img => img + '-comprimida',
    writeState: () => guarda,
    ImageStore: { put: async (id, imgs) => { hecho.puestas.push([id, imgs.length]); } },
    renderImagePreviews: () => {}, getUnitImages: () => [],
    openPageSheet: id => hecho.hojas.push(id),
    toast: m => hecho.toasts.push(m),
    console,
  };
  const f = h.ejecutar(`${['pagesWithoutPhoto', 'attachPagePhoto', 'sanitizePageNumbers'].map(n => h.extraerFuncion(n)).join('\n')}
    return { pagesWithoutPhoto, attachPagePhoto };`, env);
  return { u, f, hecho };
}

const esperar = () => new Promise(r => setTimeout(r, 20));

test('las páginas sin foto: ni los lotes hechos a mano ni una que se está analizando', () => {
  const { u, f } = montar();
  assert.deepEqual(f.pagesWithoutPhoto(u).map(b => b.id), ['b1']);
  assert.deepEqual(f.pagesWithoutPhoto(null), []);
});

test('agregar la foto la guarda con su número de página, sin tocar tarjetas ni progreso', async () => {
  const { u, f, hecho } = montar();
  f.attachPagePhoto('b1', { files: [{ name: 'p52', size: 1000 }] });
  await esperar();
  const b = u.batches[0];
  assert.deepEqual(b.images, ['data:image/jpeg;base64,p52-comprimida']);
  assert.deepEqual(b.pages, [52]);
  assert.deepEqual(b.vocab, [{ word: 'family' }]);
  assert.deepEqual(u.fcProgress, { family: { interval: 9 } });
  assert.deepEqual(hecho.puestas, [['b1', 1]], 'la foto va a IndexedDB, como las demás');
  assert.deepEqual(hecho.hojas, ['b1'], 'la hoja se vuelve a abrir, ya con la foto');
});

test('sin número de página, la foto entra igual; un número basura no se guarda', async () => {
  const { u, f } = montar({ pagina: 'abc' });
  f.attachPagePhoto('b1', { files: [{ name: 'x', size: 1000 }] });
  await esperar();
  assert.equal(u.batches[0].images.length, 1);
  assert.equal(u.batches[0].pages, undefined);
});

test('si no se puede guardar, todo vuelve como estaba', async () => {
  const { u, f, hecho } = montar({ guarda: false });
  f.attachPagePhoto('b1', { files: [{ name: 'p52', size: 1000 }] });
  await esperar();
  assert.deepEqual(u.batches[0].images, []);
  assert.equal(u.batches[0].pages, undefined);
  assert.deepEqual(hecho.puestas, [], 'no se escribe en IndexedDB');
  assert.match(hecho.toasts[0], /Could not save/);
});

test('la unidad muestra las páginas sin foto, y la hoja ofrece agregarla o cambiarla', () => {
  const carga = h.extraerFuncion('loadUnitContent');
  assert.match(carga, /\} else \{\s*if \(uploadZone\) uploadZone\.style\.display = '';\s*\/\/[^\n]*\n\s*renderImagePreviews\(imgs\);/);
  const cuadricula = h.extraerFuncion('renderImagePreviews');
  assert.match(cuadricula, /pagesWithoutPhoto\(u\)/);
  assert.match(cuadricula, /class="img-thumb img-thumb-empty" data-batch="[^"]+" onclick="openPageSheet\(/);
  const hoja = h.extraerFuncion('openPageSheet');
  assert.match(hoja, /📷 Add the photo of this page/);
  assert.match(hoja, /🔄 Wrong photo\? Change it/);
  assert.equal((hoja.match(/onchange="attachPagePhoto\('\$\{escapeStr\(batchId\)\}', this\)"/g) || []).length, 2);
  assert.ok(fuente.includes('id="ps-page" type="number"'));
});

// Él le puso una foto a la página equivocada, tocó la ✕ y el aviso solo
// ofrecía borrar la página con sus 22 palabras.

test('quitar solo la foto: la página queda como antes, con sus tarjetas y progreso', async () => {
  const { u, f } = montar();
  f.attachPagePhoto('b1', { files: [{ name: 'p52', size: 1000 }] });
  await esperar();
  assert.equal(u.batches[0].pagesByHand, true);
  const hecho = { puestas: [], toasts: [], recargas: 0 };
  const g = h.ejecutar(`${h.extraerFuncion('removeOnlyPagePhoto')}; return removeOnlyPagePhoto;`, {
    current: { lid: 'a2', uid: 4 }, getUnit: () => u, console,
    ImageStore: { put: async (id, imgs) => { hecho.puestas.push([id, imgs.length]); } },
    save: () => {}, loadUnitContent: () => { hecho.recargas++; }, toast: m => hecho.toasts.push(m),
  });
  assert.equal(g('b1'), true);
  const b = u.batches[0];
  assert.deepEqual(b.images, []);
  assert.equal(b.pages, undefined, 'el número era el de la foto equivocada');
  assert.deepEqual(b.vocab, [{ word: 'family' }]);
  assert.deepEqual(u.fcProgress, { family: { interval: 9 } });
  assert.deepEqual(hecho.puestas, [['b1', 0]], 'también sale de IndexedDB, o volvería al recargar');
  // Una página analizada conserva su número: no lo escribió él.
  u.batches[2].pages = [97];
  g('b2');
  assert.deepEqual(u.batches[2].pages, [97]);
  assert.deepEqual(u.batches[2].vocab, [{ word: 'cousin' }]);
});

test('la ✕ de la última foto ofrece quitar solo la foto, además de borrar', () => {
  const quitar = h.extraerFuncion('removeUnitImage');
  assert.match(quitar, /altText: soloFoto \? '📷 Remove only the photo' : '',/);
  assert.match(quitar, /\(\) => removeOnlyPagePhoto\(batch\.id\)/);
  const confirmar = h.extraerFuncion('confirmAction');
  assert.match(confirmar, /alt\.style\.display = onAlt \? '' : 'none'/);
  assert.match(h.extraerFuncion('closeConfirm'), /if \(confirmed === 'alt'\)/);
  assert.ok(fuente.includes(`id="confirm-alt-btn" style="display:none;" onclick="closeConfirm('alt')"`));
});

// Él le puso la foto a la página equivocada y preguntó si podía arrastrarla
// (mantener presionado y soltar sobre la página correcta).

const mover = h.ejecutar(`${h.extraerFuncion('movePhotoBetweenPages')}; return movePhotoBetweenPages;`, {});

test('pasar una foto a una página sin foto: solo se mueve la foto, no las tarjetas', () => {
  const de = { id: 'a', images: ['F1'], pages: [5], pagesByHand: true, vocab: [{ word: 'job' }] };
  const a = { id: 'b', images: [], vocab: [{ word: 'occupation' }] };
  assert.equal(mover(de, a, 'F1'), 'move');
  assert.deepEqual(de, { id: 'a', images: [], vocab: [{ word: 'job' }] }, 'el número que él escribió se va con la foto');
  assert.deepEqual(a, { id: 'b', images: ['F1'], pages: [5], pagesByHand: true, vocab: [{ word: 'occupation' }] });
});

test('soltarla sobre una página con foto las intercambia, con sus números', () => {
  // Él soltaba la foto encima de otra y la app le agregaba una segunda foto a
  // esa página: "no queda donde la pongo".
  const p9 = { id: 'a', images: ['FOTO_DE_LA_P10'], pages: [9], pagesByHand: true, vocab: [{ word: 'x' }] };
  const p10 = { id: 'b', images: ['FOTO_DE_LA_P9'], pages: [10], pagesByHand: true, vocab: [{ word: 'y' }] };
  assert.equal(mover(p9, p10, 'FOTO_DE_LA_P10'), 'swap');
  assert.deepEqual(p9.images, ['FOTO_DE_LA_P9']);
  assert.deepEqual(p10.images, ['FOTO_DE_LA_P10']);
  assert.deepEqual([p9.pages, p10.pages], [[10], [9]], 'cada número viaja con su foto');
  assert.deepEqual([p9.vocab, p10.vocab], [[{ word: 'x' }], [{ word: 'y' }]], 'las tarjetas no se mueven');
});

test('el número de una página analizada no se mueve ni se pisa', () => {
  const mia = { images: ['H'], pages: [6], pagesByHand: true };
  const analizada = { images: ['G'], pages: [97] };
  assert.equal(mover(mia, analizada, 'H'), 'swap');
  assert.deepEqual(analizada, { images: ['H'], pages: [97] });
  assert.deepEqual(mia, { images: ['G'] }, 'su número era el de la foto que se fue');
  // Con dos fotos en el origen no se intercambia: la foto se agrega.
  const dos = { images: ['F1', 'F2'], pages: [5], pagesByHand: true };
  const otra = { images: ['G'], pages: [97] };
  assert.equal(mover(dos, otra, 'F1'), 'move');
  assert.deepEqual(dos, { images: ['F2'], pages: [5], pagesByHand: true }, 'le queda otra foto: su número sigue');
  assert.deepEqual(otra, { images: ['G', 'F1'], pages: [97] });
  assert.equal(mover(otra, otra, 'G'), false, 'a la misma página, nada');
  assert.equal(mover(dos, otra, 'NO'), false, 'una foto que no es de esa página, nada');
});

test('la cuadrícula deja arrastrar: cada recuadro sabe su página y soltar pide confirmar', () => {
  const cuadricula = h.extraerFuncion('renderImagePreviews');
  assert.match(cuadricula, /<div class="img-thumb" \$\{batchId \? `data-batch="\$\{escapeHtml\(batchId\)\}"` : ''\}>/);
  assert.match(cuadricula, /enablePhotoDrag\(grid\);/);
  const arrastre = h.extraerFuncion('enablePhotoDrag');
  assert.match(arrastre, /}, 450\);/, 'mantener presionado medio segundo');
  assert.match(arrastre, /if \(Math\.hypot\(x - st\.x0, y - st\.y0\) > 10\) fin\(\)/, 'moverse antes es desplazar la pantalla');
  assert.match(arrastre, /if \(e && e\.cancelable\) e\.preventDefault\(\);/);
  assert.match(arrastre, /if \(over\) askMovePagePhoto\(batchId, src, over\.dataset\.batch\);/);
  const pedir = h.extraerFuncion('askMovePagePhoto');
  assert.match(pedir, /confirmText: intercambio \? '🔄 Swap them' : '📷 Move it'/);
  assert.match(pedir, /ImageStore\.put\(de\.id, de\.images\)/);
  assert.match(pedir, /ImageStore\.put\(a\.id, a\.images\)/);
  assert.match(pedir, /tile\.scrollIntoView\(/, 'le muestra dónde quedó');
});

// Con el computador abierto, la nube trae cambios mientras el aviso está
// abierto, y juntar reemplaza las páginas por copias nuevas. La foto se movía
// en la copia vieja: salía "Photo moved" y nada cambiaba.

test('mover: las páginas se buscan otra vez al confirmar, no las del momento de soltar', () => {
  let unidad = { batches: [{ id: 'a', images: ['F'], vocab: [] }, { id: 'b', images: [], vocab: [] }] };
  let confirmar = null;
  const toasts = [];
  const pedir = h.ejecutar(`${['askMovePagePhoto', 'movePhotoBetweenPages'].map(n => h.extraerFuncion(n)).join('\n')}; return askMovePagePhoto;`, {
    current: { lid: 'a2', uid: 1 }, getUnit: () => unidad, batchLabel: (u, id) => id,
    confirmAction: o => { confirmar = o.onConfirm; }, writeState: () => true,
    ImageStore: { put: async () => {} }, loadUnitContent: () => {}, toast: m => toasts.push(m), console,
    document: { querySelector: () => null }, CSS: { escape: x => x },
  });
  pedir('a', 'F', 'b');
  unidad = JSON.parse(JSON.stringify(unidad));   // llegó la nube: objetos nuevos
  confirmar();
  assert.deepEqual(unidad.batches.map(b => b.images), [[], ['F']], 'la foto se mueve en las páginas que se ven');
  assert.match(toasts[0], /Photo moved/);
});

test('agregar: si la nube llegó mientras se comprimía la foto, se guarda en la página nueva', async () => {
  const { u, f } = montar();
  const vieja = u.batches[0];
  f.attachPagePhoto('b1', { files: [{ name: 'p52', size: 1000 }] });
  // Antes de que termine de leer la foto, la nube reemplaza la página.
  u.batches[0] = JSON.parse(JSON.stringify(vieja));
  await esperar();
  assert.deepEqual(u.batches[0].images, ['data:image/jpeg;base64,p52-comprimida']);
  assert.deepEqual(vieja.images, [], 'no en la copia vieja');
});

// Él había escrito "10" en una foto que en el libro dice "UNIT 1 · 7", y la
// hoja de una página con foto no dejaba cambiar el número.

function montarNumero(valor, { guarda = true } = {}) {
  const u = { batches: [{ id: 'b1', images: ['F'], pages: [10], pagesByHand: true, vocab: [{ word: 'accent' }] },
                        { id: 'b2', images: ['G'], pages: [97], vocab: [] }] };
  const hecho = { toasts: [], hojas: [] };
  const f = h.ejecutar(`${['setPageNumber', 'sanitizePageNumbers'].map(n => h.extraerFuncion(n)).join('\n')}; return setPageNumber;`, {
    current: { lid: 'a2', uid: 1 }, getUnit: () => u,
    document: { getElementById: id => (id === 'ps-page-edit' ? { value: valor } : null) },
    writeState: () => guarda, renderImagePreviews: () => {}, getUnitImages: () => [],
    openPageSheet: id => hecho.hojas.push(id), toast: m => hecho.toasts.push(m),
  });
  return { u, f, hecho };
}

test('cambiar el número de una página con foto', () => {
  const { u, f, hecho } = montarNumero('7');
  assert.equal(f('b1'), true);
  assert.deepEqual([u.batches[0].pages, u.batches[0].pagesByHand], [[7], true]);
  assert.deepEqual(u.batches[0].vocab, [{ word: 'accent' }]);
  assert.match(hecho.toasts[0], /p\. 7/);
  // Una página analizada también: el número que él pone es el de su foto.
  const otra = montarNumero('98');
  otra.f('b2');
  assert.deepEqual([otra.u.batches[1].pages, otra.u.batches[1].pagesByHand], [[98], true]);
});

test('vacío quita el número; basura no cambia nada; si no guarda, vuelve como estaba', () => {
  const vacio = montarNumero('');
  vacio.f('b1');
  assert.equal(vacio.u.batches[0].pages, undefined);
  const basura = montarNumero('p7a');
  assert.equal(basura.f('b1'), false);
  assert.deepEqual(basura.u.batches[0].pages, [10]);
  const falla = montarNumero('7', { guarda: false });
  assert.equal(falla.f('b1'), false);
  assert.deepEqual([falla.u.batches[0].pages, falla.u.batches[0].pagesByHand], [[10], true]);
  assert.match(h.extraerFuncion('openPageSheet'), /onclick="setPageNumber\('\$\{escapeStr\(batchId\)\}'\)">✏️ Save page<\/button>/);
});
