/**
 * La bienvenida para otros estudiantes (17 de octubre).
 *
 * Él quiere que la app ayude a otros estudiantes a mejorar su inglés: "cuando
 * abran, que les pida entrar con Google, que escriban su nombre y el nivel en
 * que están, y al elegir el nivel se les baje la información del nivel". Por
 * ahora solo el A2. Decidió: Google obligatorio, los demás niveles "Coming
 * soon", sus ejemplos se quedan y la lista de estudiantes va después.
 *
 * Lo delicado es no tocar sus aparatos: la bienvenida solo sale donde no hay
 * nada, nunca si la carga falló, y una cuenta que ya tiene datos en la nube
 * los trae sin preguntar.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const { necesitaBienvenida, nivelDisponible } = h.ejecutar(`
  ${h.extraerFuncion('necesitaBienvenida')}
  ${h.extraerFuncion('nivelDisponible')}
  return { necesitaBienvenida, nivelDisponible };`, {});

test('solo en un aparato vacío', () => {
  assert.equal(necesitaBienvenida({ units: {}, texts: [] }), true);
  assert.equal(necesitaBienvenida({}), true, 'sin nada guardado');
  assert.equal(necesitaBienvenida({ units: { a2_1: { batches: [] } } }), true, 'una unidad sin páginas no cuenta');
  assert.equal(necesitaBienvenida({ units: { a2_1: { batches: [{ id: 'p1' }] } } }), false, 'con páginas: sus aparatos, el de su compañera');
  assert.equal(necesitaBienvenida({ units: {}, texts: [{ id: 't' }] }), false, 'con textos tampoco');
  assert.equal(necesitaBienvenida({ units: {}, profile: { name: 'Ana', level: 'a2' } }), false, 'ya se presentó');
  assert.equal(necesitaBienvenida(null), false);
});

test('su respaldo real nunca la ve', () => {
  const fs = require('node:fs');
  const ruta = '/root/.claude/uploads/3717c8a1-ffb3-598f-9939-5dd0978e088c/02055469-devlearn_backup_2026-10-16.json';
  if (!fs.existsSync(ruta)) return; // el respaldo es suyo y no está en el repositorio
  const d = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  assert.equal(necesitaBienvenida(d.state || d), false);
});

test('por ahora solo el A2 se puede escoger', () => {
  assert.equal(nivelDisponible('a2'), true);
  for (const id of ['a1', 'b1', 'b2', 'c1', 'c2']) assert.equal(nivelDisponible(id), false, id);
  assert.match(h.extraerFuncion('pasoNombreNivel'), /LEVELS\.map\(l => nivelDisponible\(l\.id\)/);
  assert.match(h.extraerFuncion('pasoNombreNivel'), /Coming soon/);
});

test('sale al abrir, pero nunca si la carga falló', () => {
  const fuente = h.fuente();
  assert.match(fuente, /renderDashboard\(\);\n\s*updateNavBadges\(\);\n\s*\/\/[^\n]*\n\s*if \(!window\.__loadCorrupt && necesitaBienvenida\(state\)\) abrirBienvenida\(\);/);
});

test('Google primero; si la cuenta ya está abierta, espera la nube', () => {
  const abrir = h.extraerFuncion('abrirBienvenida');
  assert.match(abrir, /if \(window\._fb && window\._fb\._user\) pasoEsperandoNube\(\);\n\s*else pasoGoogle\(\);/);
  assert.match(h.extraerFuncion('pasoGoogle'), /onclick="entrarBienvenida\(\)">Continue with Google</);
  assert.match(h.extraerFuncion('entrarBienvenida'), /await window\._fb\.signInWithPopup\(window\._fb\.auth, new window\._fb\.GoogleAuthProvider\(\)\);/);
});

test('la nube avisa cuando terminó, en los tres caminos', () => {
  const cargar = h.fuente().slice(h.fuente().indexOf('window._loadFromFirestore = function(forceLoad) {'));
  const cuerpo = cargar.slice(0, cargar.indexOf('_unsubscribeListener = window._fb.onSnapshot'));
  assert.equal(cuerpo.split('avisarNubeRevisada(true);').length - 1, 2, 'sin nada en la nube, y después de juntar');
  assert.equal(cuerpo.split('avisarNubeRevisada(false);').length - 1, 1, 'si la nube no responde');
  assert.match(h.fuente(), /function avisarNubeRevisada\(ok\) \{\n\s*window\.__nubeRevisada = \{ ok \};\n\s*window\.dispatchEvent\(new CustomEvent\('devlearn:nube-revisada', \{ detail: \{ ok \} \}\)\);/);
});

test('si la cuenta trajo sus páginas de la nube, se cierra sin preguntar nada', () => {
  const despues = h.extraerFuncion('despuesDeLaNube');
  assert.match(despues, /if \(!necesitaBienvenida\(state\)\) \{\n\s*cerrarBienvenida\(\);/);
  // Lo de la nube se mira antes de preguntar el nombre.
  assert.ok(despues.indexOf('necesitaBienvenida(state)') < despues.indexOf('pasoNombreNivel()'));
});

test('al empezar, el A2 se carga sin el aviso de "Restore", y el perfil se guarda solo si cargó', () => {
  const empezar = h.extraerFuncion('empezarBienvenida');
  assert.match(empezar, /cargarA2Compartido\(ok => \{\n\s*if \(!ok\) \{ pasoNombreNivel\([^\n]*\); return; \}\n\s*state\.profile = \{ name: nombre, level: nivel, since: todayLocal\(\) \};/);
  const restaurar = h.extraerFuncion('restorePagesFromBackup');
  assert.match(restaurar, /const preguntar = alTerminar \? o => o\.onConfirm\(\) : confirmAction;\n\s*preguntar\(\{/);
  assert.match(restaurar, /if \(alTerminar\) alTerminar\(true\);\n\s*\},/, 'avisa al terminar de restaurar');
  assert.match(h.extraerFuncion('cargarA2Compartido'), /if \(alTerminar\) alTerminar\(false\);\n\s*return;/, 'sin internet, avisa que no cargó');
});

test('el botón "Restore" de siempre sigue preguntando; la bienvenida no', () => {
  const correr = alTerminar => {
    let preguntado = null, avisado = null;
    const { restorePagesFromBackup } = h.ejecutar(`${h.extraerFuncion('restorePagesFromBackup')} return { restorePagesFromBackup };`, {
      FileReader: function () { this.readAsText = () => this.onload({ target: { result: '{"units":{}}' } }); },
      toast() {}, state: { units: {}, stats: {} }, missingBatchesFromBackup: () => [{ unit: { lid: 'a2', uid: 1 }, batch: { id: 'p1' } }],
      emptyBatchesToFill: () => [], newerContentFromBackup: () => [], listaDePaginas: () => ['A2 Unit 1 · p. 1'],
      confirmAction: o => { preguntado = o; },
      getUnit: () => ({ batches: [] }), ImageStore: { put: async () => {} }, ordenarPorPagina() {}, applyPageFixes() {},
      countTotalWords: () => 0, saveNow() {}, window: {}, refrescarPaginaActual() {}, updateNavBadges() {}, generatedFields: () => [],
    });
    restorePagesFromBackup({ target: { files: [{}], value: '' } }, alTerminar ? ok => { avisado = ok; } : null);
    return { preguntado, avisado };
  };
  const deSiempre = correr(false);
  assert.ok(deSiempre.preguntado && deSiempre.preguntado.onConfirm, 'Settings y el botón del A2 preguntan antes');
  const bienvenida = correr(true);
  assert.equal(bienvenida.preguntado, null, 'la bienvenida no muestra el aviso');
  assert.equal(bienvenida.avisado, true, 'y avisa que cargó');
});
