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
    nombre: 'dejar de avisar cuando se recupera del respaldo diario',
    buscar: `if (window.__loadedFromAutoBackup) showAutoBackupBanner();`,
    reemplazo: '',
  },
  {
    nombre: 'leer la fecha del respaldo tarde, cuando ya dice "today"',
    buscar: `      window.__autoBackupDate = localStorage.getItem(BACKUP_KEY + '_date');`,
    reemplazo: '',
  },
  {
    // La fecha viene de localStorage. Pintarla cruda en innerHTML, en vez de la
    // versión ya formateada, sí sería un defecto de verdad.
    nombre: 'meter la fecha cruda del respaldo en el HTML',
    buscar: `      cuando = dias <= 0 ? \` from today's backup (\${escapeHtml(bonita)})\`
             : dias === 1 ? \` from yesterday's backup (\${escapeHtml(bonita)})\`
             : \` from the backup of \${dias} days ago (\${escapeHtml(bonita)})\`;`,
    reemplazo: '      cuando = ` from the backup (${fecha})`;',
  },
  {
    nombre: 'dejar que una fecha ilegible imprima "NaN días / Invalid Date"',
    buscar: `    if (!isNaN(d)) {`,
    reemplazo: '    if (true) {',
  },
  {
    nombre: 'volver a descartar los ejercicios de gramática que manda la IA',
    buscar: `      drillSentences: Array.isArray(g.drillSentences)`,
    reemplazo: '      drills: Array.isArray(g.drills)',
  },
  {
    nombre: 'que el análisis de páginas deje de usar el filtro de gramática',
    buscar: `    parsed.grammar = sanitizeGrammar(parsed.grammar);`,
    reemplazo: '    parsed.grammar = Array.isArray(parsed.grammar) ? parsed.grammar : [];',
  },
  {
    nombre: 'volver a ofrecer primero la sesión vieja aunque no traiga las pendientes',
    buscar: `  const pendientesFuera = !!activeStudy && srsCounts.due > 0 && dueEnSesion < srsCounts.due;`,
    reemplazo: '  const pendientesFuera = false;',
  },
  {
    nombre: 'contar pendientes en lo ya visto de la sesión',
    buscar: `  return session.queue.slice(session.position || 0)`,
    reemplazo: '  return session.queue',
  },
  {
    nombre: 'que el botón "Review" retome la sesión vieja',
    buscar: `onclick="startFcSession(false)">
      Review `,
    reemplazo: `onclick="startFcSession(true)">
      Review `,
  },
  {
    nombre: 'volver a mostrar solo la hora de la sesión guardada',
    buscar: `  if (dia === hoy) return \`today at \${hora}\`;`,
    reemplazo: '',
  },
  {
    nombre: 'volver a sumar las difíciles al globito de Memory review',
    buscar: `      badge: dueCount || null,`,
    reemplazo: '      badge: dueCount + leechCount,',
  },
  {
    nombre: 'volver a dibujar las pendientes como un tramo aparte en la barra',
    buscar: "          ${bar.due        > 0 ? `<div style=\"flex:${bar.due};background:var(--accent);\"></div>` : ''}",
    reemplazo: "          ${totalDue > 0 ? `<div style=\"flex:${totalDue};background:var(--accent);\"></div>` : ''}",
  },
  {
    nombre: 'dejar las pendientes también en el tramo de su estado',
    buscar: `  if (card.dueDate && card.dueDate <= today) return 'due';`,
    reemplazo: '',
  },
  {
    nombre: 'volver a mostrar la bienvenida en cada apertura',
    buscar: `    if (localStorage.getItem('devlearn_splash_date') === hoy) return false;`,
    reemplazo: '',
  },
  {
    nombre: 'dejar de consultar si la bienvenida ya se vio hoy',
    buscar: `    if (!shouldPlaySplash()) {
      splashEl.remove();
      return;
    }`,
    reemplazo: '',
  },
  {
    nombre: 'volver a la animación lenta de los elementos de la página',
    buscar: `  animation: pageChildIn 0.18s var(--ease-ios) backwards;`,
    reemplazo: '  animation: pageChildIn 0.55s var(--ease-ios) backwards;',
  },
  {
    nombre: 'volver a la entrada lenta de la página',
    buscar: `--t-page: 0.2s;`,
    reemplazo: '--t-page: 0.45s;',
  },
  {
    nombre: 'volver a sembrar una fecha de examen ya pasada',
    buscar: `    merged.examDate = '2026-10-16';`,
    reemplazo: "    merged.examDate = '2026-07-31';",
  },
  {
    nombre: 'pisar la fecha de examen que el usuario ya tiene',
    buscar: `  if (merged.examDate === undefined) {`,
    reemplazo: '  if (true) {',
  },
  {
    nombre: 'reto de 20 días: que hoy sin grabar corte la racha de ayer',
    buscar: `  if (!set.has(today)) d.setDate(d.getDate() - 1);`,
    reemplazo: '',
  },
  {
    nombre: 'reto de 20 días: contar el mismo día dos veces',
    buscar: `  if (state.recDays.includes(hoy)) return false;`,
    reemplazo: '',
  },
  {
    nombre: 'reto de 20 días: que cualquier grabación corta cuente',
    buscar: `secs >= 30 && markRecDay()`,
    reemplazo: 'secs >= 3 && markRecDay()',
  },
  {
    nombre: 'reto de 20 días: que la nube pise los días de este celular',
    buscar: `    state.recDays = [...new Set([...localRecDays, ...(imported.recDays || [])])].sort();`,
    reemplazo: '    state.recDays = imported.recDays || [];',
  },
  {
    nombre: 'My life: que a una tarjeta le falte su frase en presente',
    buscar: `"tool:drain": {"en": "The water goes to the <b>drain</b>.", "es": "El agua va al desagüe.", "past": {"en": "The water <b>went</b> to the drain.", "es": "El agua se fue al desagüe."}}, `,
    reemplazo: '',
  },
  {
    nombre: 'My life: que las herramientas vuelvan a quedarse sin pasado',
    buscar: `  const antes = esNombre ? now.past : { en: eg, es: egEs };`,
    reemplazo: '  const antes = esNombre ? null : { en: eg, es: egEs };',
  },
  {
    nombre: 'My life: que la casa comparta tarjeta con el local (sin prefijo)',
    buscar: `"id": "home_chores", "kind": "home", "section": "home", "sound": "🧺", "name": "Housework", "diff": "medium", "keyPrefix": "home",`,
    reemplazo: '"id": "home_chores", "kind": "home", "section": "home", "sound": "🧺", "name": "Housework", "diff": "medium",',
  },
  {
    nombre: 'My life: que Going out desaparezca de la pestaña',
    buscar: `    { titulo: '🚲 Going out',  fams: HOME_FAMILIES.filter(f => f.section === 'out') },`,
    reemplazo: '',
  },
  {
    nombre: 'My life: dos tarjetas con el mismo frente en español',
    buscar: `"es": "Limpio el local todas las mañanas."`,
    reemplazo: '"es": "Limpio el mostrador con un trapo."',
  },
  {
    nombre: 'My life: que el globito de Verbs vuelva a contar el local',
    buscar: `  VERB_FAMILIES.forEach(f => f.verbs.forEach(v => {
    if (SRS.isDue(vbCard(f, v))) n++;
  }));`,
    reemplazo: `  VERB_FAMILIES.concat(SHOP_FAMILIES).forEach(f => f.verbs.forEach(v => {
    if (SRS.isDue(vbCard(f, v))) n++;
  }));`,
  },
  {
    nombre: 'My life: que el menú marque otro botón',
    buscar: `'levels': 1, 'life': 2, 'progress': 3,`,
    reemplazo: "'levels': 1, 'life': 9, 'progress': 3,",
  },
  {
    nombre: 'Análisis: quitar la regla de phrasal verbs y expresiones',
    buscar: `━━ PHRASAL VERBS AND FIXED EXPRESSIONS: KEEP THEM WHOLE ━━`,
    reemplazo: '',
  },
  {
    nombre: 'Análisis: permitir que los ejemplos del libro se reescriban',
    buscar: `never drop or add "not", "can't", "don't", "never", "no"`,
    reemplazo: 'try to keep the meaning',
  },
  {
    nombre: 'Análisis: quitar la revisión de que cada palabra esté impresa',
    buscar: `cannot point to where it is printed on these photos, remove it.`,
    reemplazo: 'use your judgement.',
  },
  {
    nombre: 'p. 110: dejar el ejemplo de "keep doing" al revés del libro',
    buscar: `{ word: 'keep doing', example: 'You just have to keep doing things the same way and expect different results.', set: GRACE },`,
    reemplazo: '',
  },
  {
    nombre: 'p. 110: marcar la bandera aunque la página no esté en el aparato',
    buscar: `if (!merged._u10P110FixV1 && fixU10P110(merged.units)) merged._u10P110FixV1 = true;`,
    reemplazo: `if (!merged._u10P110FixV1) { fixU10P110(merged.units); merged._u10P110FixV1 = true; }`,
  },
  {
    nombre: 'p. 111: dejar "meet tomorrow… Ring Street" en grab a bite',
    buscar: `    { word: 'grab a bite', example: VIEJO_KING, set: KING },`,
    reemplazo: '',
  },
  {
    nombre: 'Fotos: volver a 800 px y calidad 0.6',
    buscar: `function compressImage(dataUrl, maxSide = 2048, quality = 0.85) {`,
    reemplazo: `function compressImage(dataUrl, maxSide = 800, quality = 0.6) {`,
  },
  {
    nombre: 'API: volver a leer solo el primer bloque de la respuesta',
    buscar: `return (data.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('');`,
    reemplazo: `return data.content?.[0]?.text || '';`,
  },
  {
    nombre: 'API: ignorar el stop_reason "refusal"',
    buscar: `if (data.stop_reason === 'refusal') throw new Error('REFUSAL');`,
    reemplazo: '',
  },
  {
    nombre: 'Análisis: volver a Sonnet 4.5',
    buscar: `      model: 'claude-opus-5-5',\n      effort: 'medium',`,
    reemplazo: `      model: 'claude-sonnet-4-5',\n      effort: 'medium',`,
  },
  {
    nombre: 'p. 109: dejar la tarea de speaking que era título de lección',
    buscar: `    ['Discuss what makes a job attractive.', null],`,
    reemplazo: '',
  },
  {
    nombre: 'Contenido de página: que el reemplazo no llegue dentro de las listas',
    buscar: `    if (Array.isArray(x)) return x.map(arreglar).filter(y => y !== null);`,
    reemplazo: `    if (Array.isArray(x)) return x;`,
  },
  {
    nombre: 'Sync: volver a tomar "ya no está en la nube" como borrado (se perdió la p. 111)',
    buscar: `      cloudUnit.batches = [...cloudBatches, ...localById.values()];`,
    reemplazo: `      cloudUnit.batches = [...cloudBatches, ...[...localById.values()].filter(b => !(state.syncedBatchIds || []).includes(b.id))];`,
  },
  {
    nombre: 'Sync: subir sin traer antes la nube',
    buscar: `    const actual = await window._fb.getDoc(ref);`,
    reemplazo: `    const actual = { exists: () => false };`,
  },
  {
    nombre: 'Sync: borrar una foto sin dejar el registro del borrado',
    buscar: `        recordDeletedBatches([batch.id]);\n`,
    reemplazo: '',
  },
  {
    nombre: 'Sync: ignorar los borrados que llegan de la nube',
    buscar: `const tumbas = new Set([...(state.deletedBatchIds || []), ...(imported.deletedBatchIds || [])]);`,
    reemplazo: `const tumbas = new Set([...(state.deletedBatchIds || [])]);`,
  },
  {
    nombre: 'Análisis: volver a exigir siempre una diferencia con el español',
    buscar: `If there is no real trap, return an empty string: that is a correct answer.`,
    reemplazo: `Always name a trap.`,
  },
  {
    nombre: 'Análisis: quitar la regla de no contradecir el libro',
    buscar: `6. NEVER CONTRADICT THE PAGE.`,
    reemplazo: `6. BE CREATIVE.`,
  },
  {
    nombre: 'Análisis: dejar la explicación de gramática sin idioma',
    buscar: `"explanation": "Clear explanation IN SPANISH (Colombian), written for this A2 student`,
    reemplazo: `"explanation": "Clear explanation, written for this A2 student`,
  },
  {
    nombre: 'p. 109: quitar los repetidos aunque la p. 112 no esté',
    buscar: `  if (!u || !(u.batches || []).some(b => b && (b.pages || []).includes(112))) return false;`,
    reemplazo: '',
  },
  {
    nombre: 'Repetidas: volver a comparar el texto exacto ("to have kids" ≠ "have kids")',
    buscar: `    .replace(/^to\\s+/, '')`,
    reemplazo: '',
  },
  {
    nombre: 'Progreso: al quitar una repetida, quedarse con el peor progreso',
    buscar: `  if (!q || (p.interval || 0) > (q.interval || 0)) u.fcProgress[nueva] = p;`,
    reemplazo: `  if (!q) u.fcProgress[nueva] = p;`,
  },
  {
    nombre: 'Progreso: renombrar una tarjeta sin mover su progreso',
    buscar: `    if (c.set.word && c.set.word !== v.word) moverProgreso(u, v.word, c.set.word);`,
    reemplazo: '',
  },
  {
    nombre: 'Unit 9: correr las correcciones sin poner antes los números de página',
    buscar: `  if (!merged._u9PagesV1 && fixU9Pages(merged.units)) merged._u9PagesV1 = true;\n`,
    reemplazo: '',
  },
  {
    nombre: 'Análisis: quitar la regla de que las opciones no son hechos',
    buscar: `━━ ANSWER OPTIONS ARE NOT FACTS ━━`,
    reemplazo: `━━ OPTIONS ━━`,
  },
  {
    nombre: 'Página del libro: que el número leído no se guarde',
    buscar: `    if (paginas.length) batch.pages = paginas;`,
    reemplazo: '',
  },
  {
    nombre: 'Página del libro: dejar entrar números imposibles',
    buscar: `                  .filter(n => Number.isInteger(n) && n >= 1 && n <= 999);`,
    reemplazo: '                  .filter(n => !Number.isNaN(n));',
  },
  {
    nombre: 'Flashcards: que Start vuelva a traer toda la unidad cuando la pantalla dijo "N new words"',
    buscar: `  if (!dueOnly && unseen.length > 0) return shuffle(unseen);`,
    reemplazo: '',
  },
  {
    nombre: 'Voz: volver a borrar el apóstrofo de las contracciones',
    buscar: `    .replace(/(^|[^A-Za-z])['‘’]+|['‘’]+(?=[^A-Za-z]|$)/g, '$1')`,
    reemplazo: "    .replace(/['‘’]/g, '')",
  },
  {
    nombre: 'Frases: que la sección de frases desaparezca de My life',
    buscar: `    { titulo: '💬 Phrases I heard', fams: PHRASE_FAMILIES },`,
    reemplazo: '',
  },
  {
    nombre: 'Etiqueta: dejar de reconocer phrasal verbs que la IA marcó como verb',
    buscar: `  if ((type === 'verb' || type === 'phrase') && partes.length > 1 && partes.slice(1).some(p => PHRASAL_PARTICLES.has(p))) {`,
    reemplazo: '  if (false) {',
  },
  {
    nombre: 'Página: que abrir una página borre el progreso del resto de la unidad',
    buscar: `  if (!fc.batchId) {
    Object.keys(u.fcProgress).forEach(word => {`,
    reemplazo: `  if (true) {
    Object.keys(u.fcProgress).forEach(word => {`,
  },
  {
    nombre: 'Página: retomar la sesión de una página en la unidad entera',
    buscar: `    if ((s.batchId || null) !== (batchId || null)) return null;   // cada página tiene su fila`,
    reemplazo: '',
  },
  {
    nombre: 'Verbs: volver a partir un sonido en dos familias',
    buscar: `{ id:"ied", kind:'reg'`,
    reemplazo: `{ id:"d3", kind:'reg'`,
  },
  {
    nombre: 'Verbs: el mismo verbo en dos familias',
    buscar: `["hug", "hugged",`,
    reemplazo: '["cry", "hugged",',
  },
  {
    nombre: 'Verbs: un regular con el sonido de otra familia',
    buscar: `["fix", "fixed", "/fɪkst/"`,
    reemplazo: '["fix", "fixed", "/fɪksd/"',
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
