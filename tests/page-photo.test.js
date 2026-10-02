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
  assert.match(cuadricula, /class="img-thumb img-thumb-empty" onclick="openPageSheet\(/);
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
