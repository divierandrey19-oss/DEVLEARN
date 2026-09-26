/**
 * Los textos sembrados y su versión.
 *
 * Si se agrega contenido y no se sube `SEED_VERSION`, quien ya abrió una
 * versión anterior **nunca lo recibe**. Pasó dos veces: con el texto de la
 * página 92-93 y con los phrasal verbs de la Unit 9.
 *
 * Por eso la comprobación central de aquí no es que los textos existan, sino
 * que la cuenta de textos y el número de versión se muevan juntos.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

/** El array `seed` de migrateState(), evaluado tal cual está en el archivo. */
function textosSembrados() {
  const fuente = h.fuente();
  const inicio = fuente.indexOf('    const seed = [');
  assert.notEqual(inicio, -1, 'no se encontró el array seed de textos');
  const fin = fuente.indexOf('\n    ];', inicio);
  assert.notEqual(fin, -1, 'no se encontró el cierre del array seed');
  const codigo = fuente.slice(inicio + '    const seed = '.length, fin) + ']';
  return new Function(`return ${codigo}`)();
}

function seedVersion() {
  const m = /^  const SEED_VERSION = (\d+);$/m.exec(h.fuente());
  assert.ok(m, 'no se encontró SEED_VERSION');
  return Number(m[1]);
}

/**
 * Cuántos textos hay por cada versión. Al agregar textos se sube la versión y
 * se actualiza esta cuenta; si alguien agrega uno y no sube la versión, esta
 * prueba se pone roja y le dice exactamente qué le falta.
 */
const TEXTOS_POR_VERSION = { 13: 24 };

test('la cuenta de textos corresponde a la SEED_VERSION declarada', () => {
  const version = seedVersion();
  const textos = textosSembrados();
  const esperados = TEXTOS_POR_VERSION[version];

  assert.ok(esperados !== undefined,
    `SEED_VERSION es ${version} pero no está en TEXTOS_POR_VERSION.\n` +
    `Si agregaste textos: sube SEED_VERSION y añade { ${version}: ${textos.length} } aquí.\n` +
    'Sin subirla, quien ya abrió una versión anterior nunca recibe lo nuevo.');

  assert.equal(textos.length, esperados,
    `hay ${textos.length} textos sembrados y SEED_VERSION ${version} espera ${esperados}. ` +
    'Si agregaste o quitaste textos, sube SEED_VERSION y actualiza esta cuenta.');
});

test('todos los textos tienen id, título, cuerpo y traducción', () => {
  for (const t of textosSembrados()) {
    assert.ok(t.id, `un texto sin id: ${JSON.stringify(t).slice(0, 80)}`);
    assert.ok(t.title, `"${t.id}" sin título`);
    assert.ok(t.body && t.body.length > 40, `"${t.id}" sin cuerpo`);
    assert.ok(t.trans && t.trans.length > 40, `"${t.id}" sin traducción — la necesita para estudiar`);
  }
});

test('ningún id de texto está repetido', () => {
  // Un id repetido significa que el segundo nunca se inserta: `find` encuentra
  // el primero y se devuelve sin agregar nada.
  const ids = textosSembrados().map(t => t.id);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(repetidos, [], `ids repetidos: ${repetidos.join(', ')}`);
});

// ---------------------------------------------------------------------------
// Los textos de examen, que es contenido nuevo con un propósito concreto.
// ---------------------------------------------------------------------------

const IDS_EXAMEN = ['txt_exam_rutina', 'txt_exam_trabajo', 'txt_exam_finsemana',
                    'txt_exam_viaje', 'txt_exam_compras', 'txt_exam_planes'];

test('están las seis respuestas de examen', () => {
  const ids = textosSembrados().map(t => t.id);
  for (const id of IDS_EXAMEN) assert.ok(ids.includes(id), `falta ${id}`);
});

test('cada respuesta de examen abre y cierra con un marco', () => {
  // Es lo que sube el criterio de coherencia: que la respuesta se lea como un
  // bloque y no como frases sueltas.
  for (const t of textosSembrados().filter(x => IDS_EXAMEN.includes(x.id))) {
    assert.match(t.body, /^First,/, `"${t.id}" no abre con un marco`);
    // El cierre tiene que estar al final, pero no ser forzosamente la última
    // frase: "What a bargain!" después del Finally es una fórmula de la Unit 8
    // que vale la pena conservar.
    const iFinally = t.body.indexOf('Finally,');
    assert.ok(iFinally > 0, `"${t.id}" no cierra con un marco`);
    assert.ok(iFinally > t.body.length * 0.65,
      `"${t.id}" pone el "Finally," demasiado pronto, así que no cierra nada`);
  }
});

test('cada respuesta de examen lleva conectores de sobra', () => {
  // Sin conectores el texto no sirve para lo que se escribió.
  // Sin distinguir mayúsculas: "But" al empezar una frase cuenta igual que "but".
  const CONECTORES = ['because', 'so', 'but', 'also', 'then', 'after that',
                      'for example', 'since', 'such as', 'to tell you the truth'];
  for (const t of textosSembrados().filter(x => IDS_EXAMEN.includes(x.id))) {
    const usados = CONECTORES.filter(c => new RegExp(`\\b${c}\\b`, 'i').test(t.body));
    assert.ok(usados.length >= 7,
      `"${t.id}" solo usa ${usados.length} tipos de conector (${usados.join(', ')}); se esperan 7+`);
  }
});

test('cada respuesta de examen trae repreguntas contestadas', () => {
  // En el examen repreguntan. Una respuesta sin repreguntas deja esa parte sin
  // practicar.
  for (const t of textosSembrados().filter(x => IDS_EXAMEN.includes(x.id))) {
    assert.ok((t.wh || []).length >= 3, `"${t.id}" tiene ${(t.wh || []).length} repreguntas, se esperan 3+`);
    for (const p of t.wh) {
      assert.match(p.q, /\?$/, `una pregunta de "${t.id}" no termina en ?`);
      assert.ok(p.a && p.a.length > 60, `una respuesta de "${t.id}" es demasiado corta para practicar coherencia`);
    }
  }
});

test('las respuestas de examen son del nivel, sin tiempos avanzados', () => {
  // A2: presente, pasado simple, going to, would like, could, have to. Un
  // present perfect o un condicional lo sacan de nivel.
  const FUERA_DE_NIVEL = [/\bhave (?:been|gone|done|had)\b/i, /\bhas \w+ed\b/i,
                          /\bwould have\b/i, /\bhad been\b/i];
  for (const t of textosSembrados().filter(x => IDS_EXAMEN.includes(x.id))) {
    for (const patron of FUERA_DE_NIVEL) {
      assert.doesNotMatch(t.body, patron, `"${t.id}" usa una estructura fuera de A2: ${patron}`);
    }
  }
});
