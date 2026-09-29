/**
 * El modelo que lee las páginas del libro, y cómo se lee su respuesta.
 *
 * Él eligió Opus 5.5 para leer las páginas (con Sonnet 4.5 la letra pequeña
 * del diálogo de la p. 111 salió mal leída), sabiendo que cuesta cerca del
 * doble por página. El resto de la app sigue en Sonnet 4.5.
 *
 * Opus 5.5 piensa antes de responder: su respuesta puede empezar con bloques
 * "thinking" vacíos. La app leía solo el primer bloque, así que con Opus
 * habría recibido "" y cada página habría fallado con PARSE_ERROR — después
 * de pagarla.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const fuente = h.fuente();

/** Arma AIService solo con _callClaude y una fetch falsa que guarda lo enviado. */
function servicio(respuesta) {
  const ini = fuente.indexOf('  async _callClaude(');
  const fin = fuente.indexOf('  /* ── Test connection', ini);
  assert.ok(ini > 0 && fin > ini, 'no se encontró _callClaude');
  const enviado = {};
  const svc = h.ejecutar(`
    return { getKey() { return 'k'; },
    ${fuente.slice(ini, fin)} };
  `, {
    fetch: async (url, opts) => {
      enviado.headers = opts.headers;
      enviado.body = JSON.parse(opts.body);
      return { status: 200, ok: true, json: async () => respuesta };
    },
    AbortController, setTimeout, clearTimeout,
  });
  return { svc, enviado };
}

const msgs = [{ role: 'user', content: 'hola' }];

test('la respuesta se lee por tipo de bloque, aunque empiece pensando', async () => {
  const { svc } = servicio({ stop_reason: 'end_turn', content: [
    { type: 'thinking', thinking: '' },
    { type: 'text', text: '{"vocabulary":' },
    { type: 'text', text: '[]}' },
  ] });
  assert.equal(await svc._callClaude({ messages: msgs }), '{"vocabulary":[]}');
});

test('las respuestas de siempre (un solo bloque de texto) siguen igual', async () => {
  const { svc } = servicio({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'OK' }] });
  assert.equal(await svc._callClaude({ messages: msgs }), 'OK');
});

test('un rechazo del filtro de seguridad es un error claro, no una página vacía', async () => {
  const { svc } = servicio({ stop_reason: 'refusal', content: [] });
  await assert.rejects(svc._callClaude({ messages: msgs }), /REFUSAL/);
  assert.match(fuente, /'REFUSAL':\s*\{ title: 'Claude declined this page'/);
});

test('effort y el reintento con otro modelo solo van cuando se piden', async () => {
  const a = servicio({ content: [] });
  await a.svc._callClaude({ messages: msgs });
  assert.equal(a.enviado.body.output_config, undefined);
  assert.equal(a.enviado.body.fallbacks, undefined);
  assert.equal(a.enviado.headers['anthropic-beta'], undefined, 'el tutor y lo demás no cambian');

  const b = servicio({ content: [] });
  await b.svc._callClaude({ messages: msgs, model: 'claude-opus-5-5', effort: 'medium', fallback: true });
  assert.equal(b.enviado.body.model, 'claude-opus-5-5');
  assert.deepEqual(b.enviado.body.output_config, { effort: 'medium' });
  assert.equal(b.enviado.body.fallbacks, 'default');
  assert.equal(b.enviado.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
});

test('leer las páginas usa Opus 5.5, con espacio y tiempo para pensar', () => {
  const ini = fuente.indexOf('async _analyzeReal(');
  const analisis = fuente.slice(ini, fuente.indexOf('_parseClaudeJSON(raw) {', ini));
  assert.match(analisis, /model: 'claude-opus-5-5',\s*effort: 'medium',\s*fallback: true,\s*maxTokens: 48000,\s*isJSON: true,\s*timeoutMs: 600000,/);
});

test('el resto de la app sigue en Sonnet 4.5', () => {
  assert.match(fuente, /timeoutMs = 120000, model = 'claude-sonnet-4-5', effort = null, fallback = false \}\)/);
  assert.equal(fuente.split("model: 'claude-opus-5-5'").length - 1, 1, 'solo el análisis de páginas');
});
