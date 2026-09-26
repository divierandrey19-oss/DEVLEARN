/**
 * El aviso de recuperación desde el respaldo diario.
 *
 * `loadState()` recurre al respaldo cuando la clave principal no está, y el
 * respaldo se escribe una sola vez al día: lo estudiado después de tomarlo no
 * está en ninguna parte. Antes esto era silencioso — la bandera
 * `__loadedFromAutoBackup` se escribía y nadie la leía — así que una
 * recuperación se veía igual que un arranque normal.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const HOY = '2026-09-26';

/** DOM mínimo: solo lo que el banner usa. */
function domFalso() {
  const cuerpo = { hijos: [], appendChild(el) { cuerpo.hijos.push(el); } };
  return {
    getElementById: id => cuerpo.hijos.find(x => x.id === id) || null,
    createElement: () => ({ style: {}, id: '', innerHTML: '' }),
    get body() { return cuerpo; },
    _cuerpo: cuerpo,
  };
}

function montarBanner({ fechaRespaldo, hoy = HOY } = {}) {
  const doc = domFalso();
  const almacen = h.almacenFalso({});
  const codigo = `
    ${h.extraerFuncion('escapeHtml')}
    ${h.extraerFuncion('showAutoBackupBanner')}
    ${h.extraerFuncion('hideAutoBackupBanner')}
    return { showAutoBackupBanner, hideAutoBackupBanner };
  `;
  const api = h.ejecutar(codigo, {
    document: doc,
    window: { __autoBackupDate: fechaRespaldo },
    todayLocal: () => hoy,
    localStorage: almacen,
  });
  return {
    ...api,
    doc,
    almacen,
    get banners() { return doc._cuerpo.hijos; },
    get texto() { return (doc._cuerpo.hijos[0] || {}).innerHTML || ''; },
  };
}

test('avisa cuando el respaldo es de ayer, diciendo que puede faltar algo', () => {
  const m = montarBanner({ fechaRespaldo: '2026-09-25' });
  m.showAutoBackupBanner();

  assert.equal(m.banners.length, 1, 'pone un banner');
  assert.equal(m.banners[0].id, 'auto-backup-banner');
  assert.match(m.texto, /del respaldo de ayer/, 'dice cuándo se tomó el respaldo');
  assert.match(m.texto, /puede faltar/, 'advierte que puede faltar trabajo');
  assert.match(m.texto, /No encontré tu guardado principal/,
               'explica por qué pasó, no solo que pasó');
});

test('con un respaldo viejo dice cuántos días han pasado', () => {
  // Es el dato que le dice cuánto puede haber perdido.
  const m = montarBanner({ fechaRespaldo: '2026-09-20' });
  m.showAutoBackupBanner();

  assert.match(m.texto, /hace 6 días/, `esperaba "hace 6 días" en: ${m.texto.slice(0, 200)}`);
});

test('si el respaldo es de hoy lo dice, sin inventar días', () => {
  const m = montarBanner({ fechaRespaldo: HOY });
  m.showAutoBackupBanner();

  assert.match(m.texto, /del respaldo de hoy/);
  assert.doesNotMatch(m.texto, /hace .* días|de ayer/);
});

test('sin fecha de respaldo avisa igual, solo sin la parte del cuándo', () => {
  // Un respaldo escrito por una versión vieja puede no tener fecha. El aviso
  // sigue siendo lo importante.
  const m = montarBanner({ fechaRespaldo: null });
  m.showAutoBackupBanner();

  assert.equal(m.banners.length, 1);
  assert.match(m.texto, /Recuperé tus datos/);
  assert.doesNotMatch(m.texto, /respaldo de (hoy|ayer)|hace \d+ días/);
});

test('no escribe nada en localStorage', () => {
  // El banner aparece justo cuando los datos están en su momento más frágil:
  // no debe tocar el disco, solo contar y ofrecer descargar.
  const m = montarBanner({ fechaRespaldo: '2026-09-25' });
  m.showAutoBackupBanner();

  assert.deepEqual(m.almacen.escrituras, [], 'ninguna escritura');
});

test('llamarlo dos veces no duplica el banner', () => {
  const m = montarBanner({ fechaRespaldo: '2026-09-25' });
  m.showAutoBackupBanner();
  m.showAutoBackupBanner();

  assert.equal(m.banners.length, 1);
});

test('ofrece descargar una copia, que es lo que resuelve el problema', () => {
  const m = montarBanner({ fechaRespaldo: '2026-09-25' });
  m.showAutoBackupBanner();

  assert.match(m.texto, /onclick="exportData\(\)"/, 'botón para descargar la copia');
  assert.match(m.texto, /hideAutoBackupBanner\(\)/, 'se puede cerrar');
});

test('una fecha ilegible no ensucia el aviso ni entra cruda en el HTML', () => {
  // La fecha viene de localStorage, así que es un dato, no HTML. Y si no se
  // puede leer, el aviso se da sin el cuándo: "hace NaN días (Invalid Date)"
  // sería peor que no decir la fecha.
  const basura = '<img src=x onerror=alert(1)>';
  const m = montarBanner({ fechaRespaldo: basura });
  m.showAutoBackupBanner();

  assert.equal(m.banners.length, 1, 'el aviso se da igual');
  assert.match(m.texto, /Recuperé tus datos/);
  assert.ok(!m.texto.includes(basura), 'la fecha cruda no llega al HTML');
  assert.doesNotMatch(m.texto, /<img/, 'nada de HTML desde la fecha');
  assert.doesNotMatch(m.texto, /NaN|Invalid Date/, 'nada de basura en pantalla');
});

test('una fecha con formato raro tampoco imprime NaN', () => {
  const m = montarBanner({ fechaRespaldo: '21/09/2026' });
  m.showAutoBackupBanner();

  assert.doesNotMatch(m.texto, /NaN|Invalid Date/);
  assert.match(m.texto, /Recuperé tus datos/);
});

// ---------------------------------------------------------------------------
// El cableado: que el arranque lo llame de verdad.
// ---------------------------------------------------------------------------

test('el arranque llama al banner cuando se recuperó del respaldo', () => {
  const fuente = h.fuente();
  assert.match(fuente, /^if \(window\.__loadedFromAutoBackup\) showAutoBackupBanner\(\);$/m,
    'sin esta línea la bandera se vuelve a escribir sin que nadie la lea, que era el fallo');
});

test('la bandera se lee, no solo se escribe', () => {
  // La prueba que habría atrapado el fallo original: `__loadedFromAutoBackup`
  // aparecía una sola vez en todo el archivo.
  const usos = (h.fuente().match(/__loadedFromAutoBackup/g) || []).length;
  assert.ok(usos >= 2, `solo ${usos} aparición(es): se escribe pero nadie la lee`);
});

test('la fecha del respaldo se captura durante la carga', () => {
  // Si se leyera al pintar el banner, el primer guardado del día ya la habría
  // reescrito con hoy (guardia 3) y el aviso ocultaría cuánto se pudo perder.
  const loadState = h.extraerFuncion('loadState');
  assert.match(loadState, /window\.__autoBackupDate = localStorage\.getItem\(BACKUP_KEY \+ '_date'\)/,
    'la fecha debe capturarse dentro de loadState()');
});
