/**
 * Guardia 3 comprimida (2 de octubre). El respaldo diario era una segunda copia
 * entera del estado: con diez unidades, 2,5 M de caracteres más 2,5 M del
 * guardado real llenaban el 97% de lo que Chrome deja guardar (~5,2 M). Ahora
 * va comprimido ("gz1:" + gzip en base64, ~23%).
 *
 * loadState() lo tiene que leer en el arranque, que es síncrono, así que la app
 * lleva su propio descompresor de gzip (inflateRawSync). Aquí se prueba contra
 * zlib en todos sus niveles y contra CompressionStream, que es lo que usa el
 * navegador para comprimirlo.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const h = require('./harness.js');

const KEY = 'lingua_v4';
const BACKUP_KEY = 'lingua_v4_autobackup';
const NOMBRES = ['leerRespaldo', 'gunzipSync', 'inflateRawSync', '_gzipB64', '_ungzipB64', 'comprimirRespaldo'];

function montar(contexto = {}) {
  return h.ejecutar(`
    let _respaldoEnCurso = false;
    ${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
    ${h.extraerFuncion('compactarRespaldoViejo')}
    return { ${NOMBRES.join(', ')}, compactarRespaldoViejo,
      listo: async () => { for (let i = 0; i < 300 && _respaldoEnCurso; i++) await new Promise(r => setTimeout(r, 10)); } };`,
  { BACKUP_KEY, window: {}, console: h.consolaFalsa(), ...contexto });
}

const f = montar();
const iguales = (a, b) => assert.equal(Buffer.compare(Buffer.from(a), Buffer.from(b)), 0);

test('el descompresor lee lo que comprime zlib, en todos los niveles', () => {
  const texto = Buffer.from(JSON.stringify({ units: Array.from({ length: 400 }, (_, i) => ({
    word: `palabra ${i} ñ é 😀`, example: 'I feed the dogs at my shop every morning.'.repeat(1 + (i % 5)) })) }));
  for (let nivel = 0; nivel <= 9; nivel++) iguales(f.gunzipSync(new Uint8Array(zlib.gzipSync(texto, { level: nivel }))), texto);
  // Bloques guardados (nivel 0, más de 64 KB), Huffman fijo y bytes al azar.
  for (const n of [0, 1, 65535, 65536, 200000]) {
    const bytes = crypto.randomBytes(n);
    for (const nivel of [0, 6]) iguales(f.gunzipSync(new Uint8Array(zlib.gzipSync(bytes, { level: nivel }))), bytes);
  }
  const fijo = zlib.gzipSync(Buffer.from('hola hola hola hola'), { strategy: zlib.constants.Z_FIXED });
  assert.equal(Buffer.from(f.gunzipSync(new Uint8Array(fijo))).toString(), 'hola hola hola hola');
});

test('lee lo que comprime el navegador (CompressionStream), con la marca gz1:', async () => {
  const estado = JSON.stringify({ version: 4, units: { a2_7: { title: 'Vacations and Travel', batches: [
    { id: 'b1', vocab: [{ word: 'staycation', translation: 'vacaciones en casa', example: 'We just stayed home and took a staycation.' }] }] } } });
  const comprimido = await f.comprimirRespaldo(estado);
  assert.match(comprimido, /^gz1:/);
  assert.equal(f.leerRespaldo(comprimido), estado);
  assert.equal(f.leerRespaldo(estado), estado, 'un respaldo viejo, sin comprimir, se lee tal cual');
  const grande = JSON.stringify({ units: Array.from({ length: 3000 }, (_, i) => ({ word: `w${i}`, t: 'traducción ñ' })) });
  const c2 = await f.comprimirRespaldo(grande);
  assert.ok(c2.length < grande.length / 3, `ocupa ${(100 * c2.length / grande.length).toFixed(0)}%`);
  assert.equal(f.leerRespaldo(c2), grande);
});

test('un respaldo comprimido roto falla en voz alta, no devuelve basura', () => {
  const bueno = 'gz1:' + zlib.gzipSync(Buffer.from('{"units":{"u9":{"title":"Unit 9"}}}')).toString('base64');
  assert.throws(() => f.leerRespaldo(bueno.slice(0, bueno.length - 20)));
  assert.throws(() => f.leerRespaldo('gz1:' + Buffer.from('no es gzip').toString('base64')));
});

test('loadState recurre al respaldo comprimido, y si está roto levanta __loadCorrupt', () => {
  const montarLoad = disco => {
    const ventana = {};
    const estado = h.ejecutar(`
      const migrateState = s => s;
      const healUnitTitles = () => {};
      ${['defaultState', 'leerRespaldo', 'gunzipSync', 'inflateRawSync', 'loadState'].map(n => h.extraerFuncion(n)).join('\n')}
      return loadState();`, { KEY, OLD_KEYS: [], BACKUP_KEY, window: ventana, localStorage: h.almacenFalso(disco), console: h.consolaFalsa() });
    return { estado, ventana };
  };
  const respaldo = { version: 4, units: { u9: { title: 'Unit 9' }, u10: { title: 'Unit 10' } } };
  const gz = 'gz1:' + zlib.gzipSync(Buffer.from(JSON.stringify(respaldo))).toString('base64');
  const m = montarLoad({ [BACKUP_KEY]: gz, [BACKUP_KEY + '_date']: '2026-10-01' });
  assert.deepEqual(Object.keys(m.estado.units), ['u9', 'u10']);
  assert.equal(m.ventana.__loadedFromAutoBackup, true);
  assert.equal(m.ventana.__autoBackupDate, '2026-10-01');

  const roto = montarLoad({ [BACKUP_KEY]: gz.slice(0, gz.length - 30) });
  assert.deepEqual(roto.estado.units, {}, 'nada inventado');
  assert.equal(roto.ventana.__loadCorrupt, true, 'el arranque queda bloqueado para escribir');
});

test('el respaldo que ya estaba se comprime una vez, con su fecha y su contenido', async () => {
  const viejo = JSON.stringify({ version: 4, units: { u9: { title: 'Unit 9', batches: [] } }, notes: 'x'.repeat(5000) });
  const almacen = h.almacenFalso({ [BACKUP_KEY]: viejo, [BACKUP_KEY + '_date']: '2026-10-02' });
  const g = montar({ localStorage: almacen });
  g.compactarRespaldoViejo();
  await g.listo();
  assert.match(almacen.datos[BACKUP_KEY], /^gz1:/);
  assert.equal(g.leerRespaldo(almacen.datos[BACKUP_KEY]), viejo, 'el mismo respaldo');
  assert.equal(almacen.datos[BACKUP_KEY + '_date'], '2026-10-02', 'la fecha no cambia');
  const escrito = almacen.escrituras.length;
  g.compactarRespaldoViejo();
  await g.listo();
  assert.equal(almacen.escrituras.length, escrito, 'ya comprimido: no lo vuelve a tocar');

  // Con una carga fallida no se toca nada: ese respaldo puede ser lo único bueno.
  const otro = h.almacenFalso({ [BACKUP_KEY]: viejo });
  const r = montar({ localStorage: otro, window: { __loadCorrupt: true } });
  r.compactarRespaldoViejo();
  await r.listo();
  assert.equal(otro.datos[BACKUP_KEY], viejo);
  assert.equal(otro.escrituras.length, 0);
});

test('la app compacta el respaldo viejo después del arranque', () => {
  assert.match(h.fuente(), /setTimeout\(compactarRespaldoViejo, \d+\);/);
});
