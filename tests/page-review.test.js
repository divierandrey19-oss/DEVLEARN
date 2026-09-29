/**
 * Repasar una sola página.
 *
 * Él tiene muchas fotos por unidad y quería tocar una y repasar solo las
 * palabras de esa página, "por lotes", en vez de la unidad entera. Las páginas
 * sin foto (vocabulario escrito a mano) salen en una lista.
 *
 * Lo delicado no es la baraja sino lo que la rodea: la limpieza de progreso
 * "huérfano" al abrir, y las sesiones guardadas, que guardan índices de SU
 * baraja. Mezclar la de una página con la de la unidad mostraría otra palabra.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();

/** Recorta un objeto de primer nivel `const NOMBRE = { … };`. */
function objeto(nombre) {
  const ini = fuente.indexOf(`const ${nombre} = {`);
  const fin = fuente.indexOf('\n};', ini);
  assert.ok(ini > 0 && fin > ini, `no se encontró ${nombre}`);
  return fuente.slice(ini, fin + 3);
}

function unidad() {
  const w = word => ({ word, translation: 't', difficulty: 'medium' });
  return {
    lid: 'a2', uid: '9',
    fcProgress: {},
    batches: [
      { id: 'b1', images: ['data:1'], vocab: [w('hike'), w('tent')] },
      { id: 'pv', images: [], title: 'Phrasal verbs — Unit 9', vocab: [w('work out')] },
      { id: 'b2', images: ['data:2', 'data:3'], vocab: [w('helmet'), w('sail'), w('rock')] },
    ],
  };
}

function montar({ batchId = null, almacen = h.almacenFalso() } = {}) {
  const fc = { batchId };
  const u = unidad();
  return h.ejecutar(`
    ${h.extraerFuncion('getUnitVocab')}
    ${h.extraerFuncion('batchVocab')}
    ${h.extraerFuncion('fcDeckVocab')}
    ${h.extraerFuncion('sanitizePageNumbers')}
    ${h.extraerFuncion('bookPageLabel')}
    ${h.extraerFuncion('batchLabel')}
    ${h.extraerFuncion('todayLocal')}
    ${h.extraerFuncion('dateLocal')}
    const QUIZ_SESSION_KEY = 'q';
    const STUDY_SESSION_KEY = 's';
    ${objeto('QuizSession').replace('const QuizSession', 'var QuizSession')}
    ${objeto('StudySession').replace('const StudySession', 'var StudySession')}
    return { getUnitVocab, batchVocab, fcDeckVocab, batchLabel, QuizSession, StudySession, u, fc };
  `, {
    u, fc,
    localStorage: almacen,
    getUnit: () => u,
    SRS: { initCard: (p, v) => (p[v.word] = p[v.word] || { state: 'new' }) },
  });
}

// ---------------------------------------------------------------------------
// La baraja.
// ---------------------------------------------------------------------------

test('con una página, la baraja trae solo sus palabras', () => {
  const m = montar({ batchId: 'b2' });
  assert.deepEqual(m.fcDeckVocab(m.u).map(v => v.word), ['helmet', 'sail', 'rock']);
});

test('sin página elegida, la baraja es la unidad entera', () => {
  const m = montar();
  assert.equal(m.fcDeckVocab(m.u).length, 6);
});

test('las páginas con foto se numeran en orden, las otras usan su título', () => {
  const m = montar();
  assert.equal(m.batchLabel(m.u, 'b1'), 'Page 1');
  assert.equal(m.batchLabel(m.u, 'b2'), 'Page 2', 'el lote sin foto no corre la numeración');
  assert.equal(m.batchLabel(m.u, 'pv'), 'Phrasal verbs — Unit 9');
});

// ---------------------------------------------------------------------------
// Las sesiones guardadas no se cruzan.
// ---------------------------------------------------------------------------

test('una sesión de Quiz de una página se arma solo con esa página', () => {
  const m = montar();
  const s = m.QuizSession.build('a2', '9', 'b1');
  assert.equal(s.batchId, 'b1');
  assert.ok(s.queue.every(i => i < 2), 'los índices son de la baraja de la página');
});

test('la sesión de una página no se retoma en la unidad, ni al revés', () => {
  const almacen = h.almacenFalso();
  const m = montar({ almacen });
  m.QuizSession.build('a2', '9', 'b1');
  assert.equal(m.QuizSession.getActive('a2', '9'), null, 'la unidad no retoma la de la página');
  assert.ok(m.QuizSession.getActive('a2', '9', 'b1'), 'la misma página sí');
  assert.equal(m.QuizSession.getActive('a2', '9', 'b2'), null, 'otra página no');

  m.StudySession.start('a2', '9', 'classic', [0, 1], 2, 'b1');
  assert.equal(m.StudySession.getActive('a2', '9', 'classic', 2), null,
    'aunque la unidad tuviera el mismo número de palabras');
  assert.ok(m.StudySession.getActive('a2', '9', 'classic', 2, 'b1'));

  m.StudySession.start('a2', '9', 'classic', [0, 1, 2], 6);
  assert.equal(m.StudySession.getActive('a2', '9', 'classic', 6, 'b1'), null);
  assert.ok(m.StudySession.getActive('a2', '9', 'classic', 6), 'la de la unidad sigue funcionando');
});

// ---------------------------------------------------------------------------
// El cableado.
// ---------------------------------------------------------------------------

const abrir = h.extraerFuncion('openFcStudy');

test('abrir una página NO borra el progreso de las demás palabras', () => {
  // La limpieza de huérfanas borra lo que no está en la baraja. Con una sola
  // página, eso sería todo el progreso del resto de la unidad.
  assert.match(abrir, /if \(!fc\.batchId\) \{\s*Object\.keys\(u\.fcProgress\)\.forEach\(word => \{\s*if \(!vocabSet\.has\(word\)\) delete u\.fcProgress\[word\];/);
});

test('la baraja y las sesiones usan la página elegida', () => {
  assert.match(abrir, /const vocab = fcDeckVocab\(u\);/);
  assert.match(abrir, /QuizSession\.getActive\(lid, uid, fc\.batchId\)/);
  assert.match(abrir, /StudySession\.getActive\(lid, uid, fc\.mode \|\| 'classic', vocab\.length, fc\.batchId\)/);
  const empezar = h.extraerFuncion('startFcSession');
  assert.match(empezar, /QuizSession\.build\(fc\.unitLid, fc\.unitUid, fc\.batchId\)/);
  assert.match(empezar, /StudySession\.start\(fc\.unitLid, fc\.unitUid, fc\.mode, fc\.queue, vocabLen, fc\.batchId\)/);
});

test('tocar la foto abre su repaso, y hay lista para las que no tienen foto', () => {
  assert.match(h.extraerFuncion('renderImagePreviews'), /onclick="openPageSheet\(/);
  assert.match(h.extraerFuncion('openPageSheet'), /openFcStudy\(current\.lid, current\.uid, false, '/);
  assert.match(h.extraerFuncion('renderFlashcards'), /\$\{pageListHtml\(lid, uid\)\}/);
});

test('el repaso diario y Focus empiezan sin página elegida', () => {
  assert.match(fuente, /fc\.unitUid {5}= null;\n\s*fc\.batchId {5}= null;/);
  assert.match(h.extraerFuncion('openFocusMode'), /fc\.batchId = null;/);
});
