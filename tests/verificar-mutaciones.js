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
    nombre: 'Textos U10: no subir SEED_VERSION (nunca le llegarían)',
    buscar: `  const SEED_VERSION = 14;`,
    reemplazo: `  const SEED_VERSION = 13;`,
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
  {
    nombre: 'que un texto recordado vuelva siempre al día siguiente',
    buscar: `  const step = recordado ? Math.min(antes + 1, pasos.length - 1) : 0;`,
    reemplazo: `  const step = recordado ? Math.min(antes, pasos.length - 1) : 0;`,
  },
  {
    nombre: 'repartir todos los textos aprendidos para hoy',
    buscar: `    t.review = { step: 0, due: addDaysLocal(hoy, i), last: null };`,
    reemplazo: `    t.review = { step: 0, due: addDaysLocal(hoy, 0), last: null };`,
  },
  {
    nombre: 'olvidar programar el repaso al marcar un texto ✅',
    buscar: `  if (repasa) startTextReview(t, todayLocal());`,
    reemplazo: ``,
  },
  {
    nombre: 'repasar los textos de todas las unidades',
    buscar: `  return !!u && [9, 10].includes(Number(u[1]));`,
    reemplazo: `  return true;`,
  },
  {
    nombre: 'repasar desde la primera página y no desde la última',
    buscar: `  return (ub - ua) || (pb - pa) || (tb - ta);`,
    reemplazo: `  return (ub - ua) || (pa - pb) || (ta - tb);`,
  },
  {
    nombre: 'que Listen de una frase lea el texto entero',
    buscar: `  speak(st.sentences[si], st.rate);\n}`,
    reemplazo: `  speak(st.sentences.join(' '), st.rate);\n}`,
  },
  {
    nombre: 'no abrir el menú de la frase',
    buscar: `        }</span><button class="tx-flip" onclick="sentenceMenu(\${si}, this)"`,
    reemplazo: `        }</span><button class="tx-flip" onclick="flipSentence(\${si})"`,
  },
  {
    nombre: 'volver a guardar abierta la lista del curso',
    buscar: `  const expanded = window.__courseOpen === true;`,
    reemplazo: `  const expanded = state.courseTrackerOpen === true;`,
  },
  {
    nombre: 'volver a pintar los niveles en el Dashboard',
    buscar: `  renderCalendar();\n  updateNavBadges();`,
    reemplazo: `  renderCalendar();\n  document.getElementById('dash-levels').innerHTML = '';\n  updateNavBadges();`,
  },
  {
    nombre: 'que una frase de podcast regale la respuesta en la pista',
    buscar: `["Here you go.", "", "", "al pasarle algo",`,
    reemplazo: `["Here you go.", "", "", "here you go: al pasarle algo",`,
  },
  {
    nombre: 'que la nube vuelva a ganar siempre el ✅ de un texto',
    buscar: `  if (aqui <= alla) return cloud;`,
    reemplazo: `  return cloud;`,
  },
  {
    nombre: 'olvidar la hora al marcar un texto ✅',
    buscar: `  t.markedAt = Date.now();   // ver mergeTextCopy: sin esto la nube lo desmarcaba`,
    reemplazo: ``,
  },
  {
    nombre: 'que la tarjeta de la unidad vuelva a ignorar las palabras vistas',
    buscar: `[[learned, 'mature'], [byState.review, 'seen'], [byState.learning, 'learning'], [byState.new, 'new']]`,
    reemplazo: `[[learned, 'mature'], [byState.learning, 'learning'], [byState.new, 'new']]`,
  },
  {
    nombre: 'que en la Unit 8 "Children\'s" vuelva al primer piso',
    buscar: `{ word: "Children's", set: { example: "Children's is on the second floor.",`,
    reemplazo: `{ word: "Children's", set: { example: "Children's is on the ground floor.",`,
  },
  {
    nombre: 'un ejemplo de la Unit 8 que no está impreso en la página',
    buscar: `{ word: 'take the stairs', set: { example: 'Should I take the STAIRS?',`,
    reemplazo: `{ word: 'take the stairs', set: { example: 'Take the stairs to the second floor.',`,
  },
  {
    nombre: 'unir una repetida aunque la que queda no esté en el aparato',
    buscar: `  return fixPageContent(units, { ...fix, unir: pares.filter(([, queda]) => hay(queda)) });`,
    reemplazo: `  return fixPageContent(units, { ...fix, unir: pares });`,
  },
  {
    nombre: 'olvidar una página de la Unit 8 en el arranque',
    buscar: `   ['_u8P93V1', fixU8P93], `,
    reemplazo: `   `,
  },
  {
    nombre: 'dejar las preguntas en el mazo aparte en vez de las flashcards',
    buscar: `  moveQuestionsToCards(merged.units);\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que las preguntas de la p. 14 (Unit 2) no lleguen al arrancar',
    buscar: `  if (!merged._u2P14QuestionsV1 && addU2P14Questions(merged.units)) merged._u2P14QuestionsV1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'olvidar las preguntas de una página de la Unit 9 en el arranque',
    buscar: `   ['_u9P103QuestionsV1', addU9P103Questions], `,
    reemplazo: `   `,
  },
  {
    nombre: 'que vocabKey vuelva a separar "a concert" de "concert"',
    buscar: `    .replace(/^(a|an|the)\\s+/, '')\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la corrección de la p. 16 (Unit 2) no corra al arrancar',
    buscar: `  if (!merged._u2P16V1 && fixU2P16(merged.units)) merged._u2P16V1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'volver a poner la inauguración de la p. 16 a las 6:00',
    buscar: `      set: { example: 'The opening reception is on Tuesday at 8:00 PM.',`,
    reemplazo: `      set: { example: 'The opening reception is on Tuesday at 6:00 PM.',`,
  },
  {
    nombre: 'no mandarle al análisis lo que la unidad ya tiene',
    buscar: `      known: unitKnownContent(unit, batch),\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que el prompt no lleve la lista de lo que ya está en la unidad',
    buscar: `\${yaEnLaUnidad}━━ THE PAGE MARKS ITS OWN TARGET LANGUAGE ━━`,
    reemplazo: `━━ THE PAGE MARKS ITS OWN TARGET LANGUAGE ━━`,
  },
  {
    nombre: 'quitar la regla de las afirmaciones falsas',
    buscar: `- A task that asks the student to correct FALSE statements`,
    reemplazo: `- A task`,
  },
  {
    nombre: 'volver a avisar "incomplete" en una página sin speaking',
    buscar: `if (!(batch.speakingPrompts || []).length && !parsed.complete) faltan.push`,
    reemplazo: `if (!(batch.speakingPrompts || []).length) faltan.push`,
  },
  {
    nombre: 'olvidar la p. 22 de la Unit 2 en el arranque',
    buscar: `['_u2P22V1', fixU2P22], `,
    reemplazo: ``,
  },
  {
    nombre: 'que una foto agregada no guarde el número de página',
    buscar: `    if (pagina.length) b.pages = pagina;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que una foto que no se pudo guardar quede a medias',
    buscar: `      b.images = antes.images; b.pages = antes.pages; b.pagesByHand = antes.pagesByHand; b.pagesAt = antes.pagesAt;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la ✕ vuelva a ofrecer solo borrar la página con sus tarjetas',
    buscar: `    altText: soloFoto ? '📷 Remove only the photo' : '',\n    onAlt: soloFoto,\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que quitar solo la foto deje el número de página de la foto equivocada',
    buscar: `  if (b.pagesByHand) { delete b.pages; delete b.pagesByHand; b.pagesAt = Date.now(); }\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que soltar una foto sobre otra vuelva a agregarla en vez de intercambiarlas',
    buscar: `  if ((a.images || []).length && de.images.length === 1) {`,
    reemplazo: `  if (false) {`,
  },
  {
    nombre: 'que el número escrito a mano pise el de una página analizada',
    buscar: `    if (n) { if (!(b.pages || []).length || b.pagesByHand) { b.pages = n; b.pagesByHand = true; } }`,
    reemplazo: `    if (n) { b.pages = n; b.pagesByHand = true; }`,
  },
  {
    nombre: 'que la foto arrastrada no salga de la página de origen',
    buscar: `  de.images = de.images.filter((_, k) => k !== i);\n`,
    reemplazo: ``,
  },
  {
    nombre: 'mover la foto en las páginas del momento de soltar (la nube ya las cambió)',
    buscar: `      const uAhora = getUnit(current.lid, current.uid);\n      const de = (uAhora?.batches || []).find(b => b.id === fromId);\n      const a = (uAhora?.batches || []).find(b => b.id === toId);\n`,
    reemplazo: ``,
  },
  {
    nombre: 'guardar la foto agregada en la página vieja si llegó la nube',
    buscar: `    b = (uAhora?.batches || []).find(x => x.id === batchId) || b;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la copia vieja de la nube pise el número escrito después (Unit 1)',
    buscar: `          if (lt > ct || (!lt && !ct`,
    reemplazo: `          if ((!lt && !ct`,
  },
  {
    nombre: 'que la nube no traiga el número que él cambió después en el otro aparato',
    buscar: `          if (lt > ct || (!lt && !ct`,
    reemplazo: `          if (lt || (!lt && !ct`,
  },
  {
    nombre: 'que cambiar el número de página no lleve la hora',
    buscar: `  b.pagesAt = Date.now();\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que una foto con número no lleve la hora',
    buscar: `    if (pagina.length) { b.pagesByHand = true; b.pagesAt = Date.now(); }`,
    reemplazo: `    if (pagina.length) { b.pagesByHand = true; }`,
  },
  {
    nombre: 'que arrastrar una foto cambie los números sin la hora',
    buscar: `if (firma(b) !== antes[k]) b.pagesAt = t;`,
    reemplazo: ``,
  },
  {
    nombre: 'que la Unit 1 no se renumere al abrir la app',
    buscar: `  if (!merged._u1PagesV1 && fixU1Pages(merged.units)) merged._u1PagesV1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que recuperar páginas de un respaldo pise lo que él renumeró después en la Unit 1',
    buscar: `    if (b.pagesAt) return;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la Unit 1 quede en otro orden',
    buscar: `    b.pages = [k + 1];\n`,
    reemplazo: `    b.pages = [k];\n`,
  },
  {
    nombre: 'que la nube cambie una página mientras se analiza (la respuesta se pierde)',
    buscar: `        if (lb && lb.analyzing && Date.now() - (lb.analyzingAt || 0) < 15 * 60 * 1000) { localById.delete(cb.id); return lb; }\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que una página marcada "analizando" hace horas nunca reciba la nube',
    buscar: `Date.now() - (lb.analyzingAt || 0) < 15 * 60 * 1000`,
    reemplazo: `true`,
  },
  {
    nombre: 'que una copia vieja de la nube pise la gramática regenerada aquí',
    buscar: `          if ((lb.generatedAt || 0) > (cb.generatedAt || 0)) {`,
    reemplazo: `          if (false) {`,
  },
  {
    nombre: 'que la gramática regenerada en la nube no llegue',
    buscar: `          if ((lb.generatedAt || 0) > (cb.generatedAt || 0)) {`,
    reemplazo: `          if (true) {`,
  },
  {
    nombre: 'que una página analizada aquí se quede sin tarjetas si en la nube estaba vacía',
    buscar: `            if (!(cb.vocab || []).length && (lb.vocab || []).length) cb.vocab = lb.vocab;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que recuperar de un respaldo no devuelva la gramática regenerada',
    buscar: `      if (mia && !b.analyzing && (b.grammar || []).length && (b.generatedAt || 0) > (mia.generatedAt || 0)) {`,
    reemplazo: `      if (false) {`,
  },
  {
    nombre: 'que un respaldo más viejo devuelva su gramática vieja',
    buscar: `(b.generatedAt || 0) > (mia.generatedAt || 0)) {`,
    reemplazo: `(b.generatedAt || 0) !== (mia.generatedAt || 0)) {`,
  },
  {
    nombre: 'que al recuperar la gramática se toquen las tarjetas',
    buscar: `  return ['grammar', 'exercises', 'speakingPrompts', 'grammarVersion', 'generatedAt', 'topics', 'title',`,
    reemplazo: `  return ['vocab', 'grammar', 'exercises', 'speakingPrompts', 'grammarVersion', 'generatedAt', 'topics', 'title',`,
  },
  {
    nombre: 'que la cita de Bruce siga siendo "en una semana"',
    buscar: `    ['Bruce has one week before the date. He can go to dance school and take a crash __.',\n`,
    reemplazo: `    ['(no está)',\n`,
  },
  {
    nombre: 'que el tema que sale de una frase falsa del audio se quede (p. 34)',
    buscar: `    quitarGramatica: ['Too + adjective + to + base verb'],\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que las correcciones de la gramática nueva marquen su bandera con la gramática de mayo',
    buscar: `  return !!b && (b.grammarVersion || 0) >= 3;`,
    reemplazo: `  return !!b;`,
  },
  {
    nombre: 'que la Unit 8 no reciba sus preguntas al abrir la app',
    buscar: `  if (!merged._u8P89QV1 && addU8P89Questions(merged.units)) merged._u8P89QV1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que una respuesta impresa de la Unit 8 no sea la del libro',
    buscar: `a: "Much better. I'll take them." },`,
    reemplazo: `a: "Much better. I'll buy them." },`,
  },
  {
    nombre: 'que la Unit 3 no se ordene al abrir la app',
    buscar: `  fixU3Order(merged.units);\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que el orden de la Unit 3 lleve bandera (una copia vieja de la nube lo desordenaría)',
    buscar: `  fixU3Order(merged.units);\n`,
    reemplazo: `  if (!merged._u3OrderV1 && fixU3Order(merged.units)) merged._u3OrderV1 = true;\n`,
  },
  {
    nombre: 'que al ordenar, las páginas sin número no queden al final',
    buscar: `return p.length ? p[0] : Infinity; };`,
    reemplazo: `return p.length ? p[0] : 0; };`,
  },
  {
    nombre: 'que el orden no sea estable',
    buscar: `    .sort((x, y) => (pagina(x.b) - pagina(y.b)) || (x.i - y.i))`,
    reemplazo: `    .sort((x, y) => (pagina(x.b) - pagina(y.b)) || (y.i - x.i))`,
  },
  {
    nombre: 'que las páginas viejas de la Unit 3 no reciban sus preguntas',
    buscar: `  if (!merged._u3P31ExtrasV1 && addU3P31Extras(merged.units)) merged._u3P31ExtrasV1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la Unit 1 no reciba sus preguntas al abrir la app',
    buscar: `  if (!merged._u1P6ExtrasV1 && addU1P6Extras(merged.units)) merged._u1P6ExtrasV1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que una palabra nueva de la Unit 1 entre aunque la unidad ya la tenga',
    buscar: `    if (ya.has(vocabKey(p.word))) return;\n    ya.add(vocabKey(p.word));\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que el ejemplo de una palabra nueva no sea el del libro',
    buscar: `        example: "I'm not sure. Let's talk later."`,
    reemplazo: `        example: "I'm not sure. Let's talk tomorrow."`,
  },
  {
    nombre: 'que las preguntas de la Unit 1 corran antes de unir las repetidas',
    buscar: `   addU1P1Extras, addU1P2Extras,`,
    reemplazo: `   addU1P2Extras,`,
  },
  {
    nombre: 'que la p. 11 de la Unit 1 no se corrija al abrir la app',
    buscar: `  if (!merged._u1P11V1 && fixU1P11(merged.units)) merged._u1P11V1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que accent y rhythm sigan con la definición cruzada',
    buscar: `      ['accent → the characteristic stress pattern of sentences', 'accent → the particular way you pronounce sounds and words'],\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que el ejemplo falso de "non-native speakers" se quede',
    buscar: `    { word: 'non-native speakers', example: 'Only a small number`,
    reemplazo: `    { word: 'non-native speakers', example: 'Only a big number`,
  },
  {
    nombre: 'que hometown siga siendo "ciudad natal"',
    buscar: `    { word: 'hometown', set: { translation: 'tu ciudad (donde vives ahora)'`,
    reemplazo: `    { word: 'hometown', set: { translation: 'ciudad natal'`,
  },
  {
    nombre: 'que "Gloria is an engineer" (una opción del audio) siga de ejemplo',
    buscar: `    { word: 'engineer', example: 'Gloria is an engineer.', set: { example: 'Is Gloria an engineer?', exampleTranslation: '¿Gloria es ingeniera?' } },\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que Jin-soo siga saludando a "Mr. and Mrs. Jin-soo Park"',
    buscar: `      ['Nice to meet you, Mr. and Mrs. Jin-soo Park.', TELLER.example],\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que no se quiten las tarjetas de nombres propios',
    buscar: `    quitarPalabras: ['Dallas', 'Paris City Tours', 'Seoul, South Korea'],\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que "How interesting!" siga saliendo como error',
    buscar: `    g.commonErrors = (g.commonErrors || []).map(e => (e && e.wrong === 'How interesting!'`,
    reemplazo: `    g.commonErrors = (g.commonErrors || []).map(e => (e && e.wrong === 'How interesting?'`,
  },
  {
    nombre: 'que un tema repetido se quite aunque falte la página que lo enseña',
    buscar: `  if (hayLote(units, 'a2_1', u1Lote(4))) quitar.push('Contractions of the verb be', 'Information questions with be for a partner');`,
    reemplazo: `  quitar.push('Contractions of the verb be', 'Information questions with be for a partner');`,
  },
  {
    nombre: 'que "helps" quede repetida con "help" de la p. 8',
    buscar: `  unirEnLaUnidad(units, { unit: 'a2_1', id: u1Lote(10) }, [['stressing', 'stress'], ['helps', 'help']]);`,
    reemplazo: `  unirEnLaUnidad(units, { unit: 'a2_1', id: u1Lote(10) }, [['stressing', 'stress']]);`,
  },
  {
    nombre: 'que el análisis tome como pareja la línea de al lado en un ejercicio de emparejar',
    buscar: `  prints its two columns in MIXED order on purpose: a word and the line printed next to it\n  are NOT a pair.`,
    reemplazo: `  prints its two columns.`,
  },
  {
    nombre: 'que la copia de la nube borre el número escrito a mano',
    buscar: `          if (lt > ct || (!lt && !ct && lb.pagesByHand && (lb.pages || []).length && !cb.pagesByHand)) {`,
    reemplazo: `          if (false) {`,
  },
  {
    nombre: 'que cambiar el número de página no lo marque como escrito por él',
    buscar: `  if (pagina.length) { b.pages = pagina; b.pagesByHand = true; }\n  else { delete b.pages; delete b.pagesByHand; }`,
    reemplazo: `  if (pagina.length) { b.pages = pagina; }\n  else { delete b.pages; delete b.pagesByHand; }`,
  },
  {
    nombre: 'que la pantalla no baje sola al arrastrar hacia el borde',
    buscar: `      st.scroller = contenedor();\n      st.raf = requestAnimationFrame(bordes);\n`,
    reemplazo: ``,
  },
  {
    nombre: 'volver a poner las páginas sin foto al final de la cuadrícula',
    buscar: `      else if (vacias.has(b)) puestos.push({ vacia: b });\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la cuadrícula no deje arrastrar fotos',
    buscar: `  }).join('');\n  enablePhotoDrag(grid);\n`,
    reemplazo: `  }).join('');\n`,
  },
  {
    nombre: 'esconder las páginas sin foto en una unidad sin fotos',
    buscar: `    // Sin fotos, la cuadrícula muestra las páginas a las que les falta la foto.\n    renderImagePreviews(imgs);\n`,
    reemplazo: `    const grid = document.getElementById('img-grid');\n    if (grid) grid.style.display = 'none';\n`,
  },
  {
    nombre: 'contar el lote de phrasal verbs como página sin foto',
    buscar: `!String(b.id || '').startsWith('pv_') && !b.analyzing);`,
    reemplazo: `!b.analyzing);`,
  },
  {
    nombre: 'repetir una pregunta que la unidad ya tiene como tarjeta',
    buscar: `    if (!k || !c.translation || ya.has(k)) return;`,
    reemplazo: `    if (!k || !c.translation) return;`,
  },
  {
    nombre: 'que las preguntas del análisis no entren a las tarjetas',
    buscar: `      yaEnLaPagina.add(k);\n      parsed.vocabulary.push(c);\n`,
    reemplazo: `      yaEnLaPagina.add(k);\n`,
  },
  {
    nombre: 'aceptar del análisis una "pregunta" sin signo de pregunta',
    buscar: `!/\\?$/.test(c.word) || `,
    reemplazo: ``,
  },
  {
    nombre: 'volver a "servir" el concentrado en My life',
    buscar: `"tool:scoop": {"en": "I fill the bag with kibble using a <b>scoop</b>."`,
    reemplazo: `"tool:scoop": {"en": "I serve the kibble with a <b>scoop</b>."`,
  },
  {
    nombre: 'no repartir los textos aprendidos al arrancar',
    buscar: `  seedTextReviews(merged.texts, todayLocal());\n`,
    reemplazo: ``,
  },
  {
    nombre: 'volver a forzar en el prompt la forma impresa ("I like a basketball game")',
    buscar: `Otherwise write a short, natural \${levelName} sentence built from words printed on these pages (their form may change: plural, verb ending)",`,
    reemplazo: `Otherwise write a short \${levelName} sentence using ONLY words printed on these pages",`,
  },
  {
    nombre: 'que la corrección de la p. 14 (Unit 2) no corra al arrancar',
    buscar: `  if (!merged._u2P14V1 && fixU2P14(merged.units)) merged._u2P14V1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'un ejemplo de la Unit 2 con una palabra que la página no imprime',
    buscar: `set: { example: 'I like basketball games.', exampleTranslation: 'Me gustan los partidos de baloncesto.' }`,
    reemplazo: `set: { example: 'I like basketball games a lot.', exampleTranslation: 'Me gustan los partidos de baloncesto.' }`,
  },
  {
    nombre: 'que en la Unit 7 "out of the question" vuelva a ser "acceptable"',
    buscar: `    { word: 'acceptable', set: CUESTION },\n`,
    reemplazo: ``,
  },
  {
    nombre: 'un ejemplo de la Unit 7 que no está impreso en la página',
    buscar: `{ word: 'took', set: CUATRO_HORAS },`,
    reemplazo: `{ word: 'took', set: { example: 'I took a photo of the mountains.' } },`,
  },
  {
    nombre: 'que la Unit 7 vuelva a dar por error "It will be hard to decline"',
    buscar: `      ['If an offer is tempting, it will be hard to decline.', 'If an offer will be tempting, it is hard to decline.'],\n`,
    reemplazo: ``,
  },
  {
    nombre: 'quitar un tema repetido de la Unit 7 sin la página que lo enseña',
    buscar: `  if (!hayLote(units, 'a2_7', u7Lote(paginaQueLoEnsena))) return;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que en la Unit 7 "give you a hand" pierda su progreso al renombrarla',
    buscar: `    if (c.set.word && c.set.word !== v.word) moverProgreso(u, v.word, c.set.word);\n`,
    reemplazo: ``,
  },
  {
    nombre: 'correr el lote de phrasal verbs de la Unit 7 antes que las páginas',
    buscar: `   ['_u7P81V1', fixU7P81], ['_u7P82V1', fixU7P82], ['_u7P83V1', fixU7P83], ['_u7PhrasalV1', fixU7Phrasal],`,
    reemplazo: `   ['_u7PhrasalV1', fixU7Phrasal], ['_u7P81V1', fixU7P81], ['_u7P82V1', fixU7P82], ['_u7P83V1', fixU7P83],`,
  },
  {
    nombre: 'que la Unit 7 no reciba sus preguntas al abrir la app',
    buscar: `   ['_u7P82QV1', addU7P82Questions], ['_u7P83QV1', addU7P83Questions]]`,
    reemplazo: `   ['_u7P82QV1', addU7P82Questions]]`,
  },
  {
    nombre: 'volver a guardar todo el estado en cada apertura (setTheme)',
    buscar: `  if (cambio) save();\n}`,
    reemplazo: `  save();\n}`,
  },
  {
    nombre: 'que la sincronización vuelva a escribir el estado de inmediato',
    buscar: `  state.lastCloudSeen = ms;\n  save();`,
    reemplazo: `  state.lastCloudSeen = ms;\n  saveNow();`,
  },
  {
    nombre: 'que Vocabulary vuelva a dibujar las ~2900 tarjetas de una vez',
    buscar: `  grid.insertAdjacentHTML('beforeend', list.slice(desde, hasta).map(vocabCardHtml).join(''));`,
    reemplazo: `  grid.insertAdjacentHTML('beforeend', list.slice(desde).map(vocabCardHtml).join(''));`,
  },
  {
    nombre: 'que loadState lea el respaldo comprimido como si fuera texto',
    buscar: `      const st = migrateState(JSON.parse(leerRespaldo(raw)));`,
    reemplazo: `      const st = migrateState(JSON.parse(raw));`,
  },
  {
    nombre: 'un error en el descompresor (bloques guardados)',
    buscar: `      n += len; pos += len;`,
    reemplazo: `      n += len;`,
  },
  {
    nombre: 'un error en el descompresor (distancias)',
    buscar: `      for (let i = 0; i < len; i++, n++) out[n] = out[n - dist];`,
    reemplazo: `      for (let i = 0; i < len; i++, n++) out[n] = out[n - dist + 1];`,
  },
  {
    nombre: 'fechar el respaldo aunque no se haya podido escribir',
    buscar: `    .catch(e => console.warn('Daily backup failed:', e))`,
    reemplazo: `    .catch(e => { localStorage.setItem(BACKUP_KEY + '_date', today); })`,
  },
  {
    nombre: 'compactar el respaldo aunque la carga haya fallado',
    buscar: `  if (window.__loadCorrupt || _respaldoEnCurso) return;`,
    reemplazo: `  if (_respaldoEnCurso) return;`,
  },
  {
    nombre: 'que el respaldo diario vuelva a ir sin comprimir',
    buscar: `  return 'gz1:' + b64;`,
    reemplazo: `  return texto;`,
  },
  {
    nombre: 'quitar las copias de la Unit 4 sin anotarlas como borradas (la nube las devolvería)',
    buscar: `    if (st) st.deletedBatchIds = [...new Set([...(st.deletedBatchIds || []), copia.id])];\n`,
    reemplazo: ``,
  },
  {
    nombre: 'juntar la copia de la Unit 4 perdiendo las tarjetas que solo ella tenía',
    buscar: `      ya.set(k, v.word);\n      b.vocab.push(v);`,
    reemplazo: `      ya.set(k, v.word);`,
  },
  {
    nombre: 'que la Unit 4 vuelva a decir que él tiene tres hermanos',
    buscar: `    { word: 'sibling', set: { example: "Even though I'm the older sibling, he's a little taller than I am."`,
    reemplazo: `    { word: 'sibling', set: { example: 'I have three siblings: two brothers and one sister.'`,
  },
  {
    nombre: 'que la p. 46 vuelva a dar como hecho una opción del audio',
    buscar: `    { word: 'multi-generational', set: { example: 'About (20% / 70% / 90%) of all households are multi-generational.'`,
    reemplazo: `    { word: 'multi-generational', set: { example: 'About 70% of all households are multi-generational.'`,
  },
  {
    nombre: 'correr las páginas de la Unit 4 antes de juntar las copias',
    buscar: `  if (!merged._u4MergeV1 && fixU4Merge(merged.units, merged)) merged._u4MergeV1 = true;\n`,
    reemplazo: ``,
  },
  {
    nombre: 'que la Unit 5 vuelva a dejar los platos raros con su país',
    buscar: `    ['Peruvian grilled fish', 'grilled fish'],`,
    reemplazo: ``,
  },
  {
    nombre: 'que la Unit 5 vuelva a decir "I\'m a real treat"',
    buscar: `    { word: 'real treat', set: { word: 'a meat and potatoes man',`,
    reemplazo: `    { word: 'real treat', set: { word: 'real treat',`,
  },
  {
    nombre: 'que la Unit 5 vuelva a dar por error "We have apples"',
    buscar: `    t.commonErrors = (t.commonErrors || []).filter(e => !(e && ['We have apples.', 'Do you have some eggs?'].includes(e.wrong)));`,
    reemplazo: `    t.commonErrors = (t.commonErrors || []).filter(e => !(e && ['Do you have some eggs?'].includes(e.wrong)));`,
  },
  {
    nombre: 'que la Unit 5 no reciba sus preguntas al abrir la app',
    buscar: `['_u5P58QV1', addU5P58Questions], ['_u5P59QV1', addU5P59Questions]]`,
    reemplazo: `['_u5P58QV1', addU5P58Questions]]`,
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
