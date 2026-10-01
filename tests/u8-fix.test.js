/**
 * La Unit 8 revisada contra las fotos (su respaldo del 29 de septiembre).
 *
 * Lo que tenía: ejemplos sacados de los ejercicios con el pronombre borrado
 * ("I need in size 40", "I'll take in black"), las opciones de un ejercicio o
 * de un audio tomadas como hechos ("business casual = more formal", dónde
 * quedaba cada departamento), frases al azar de ejemplo en las prendas de la
 * p. 88, un dato del plano al revés (Children's), trampas del español escritas
 * en inglés o falsas, y traducciones que en Colombia no se usan así
 * (sweatshirt es buzo; ground floor es el primer piso).
 *
 * Lo delicado, como en la Unit 9: él ya había estudiado casi todas las
 * tarjetas. Unir repetidas o renombrar no puede borrarle el progreso.
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./harness.js');

const PAGINAS = ['fixU8P85', 'fixU8P86', 'fixU8P87', 'fixU8P88', 'fixU8P89', 'fixU8P90', 'fixU8P91', 'fixU8P92', 'fixU8P93', 'fixU8P94', 'fixU8P95'];
const NOMBRES = ['loteDeLaCorreccion', 'moverProgreso', 'fixBookPage', 'fixPageContent', 'unirEnLaUnidad', 'fixU8Pages', ...PAGINAS, 'fixU8Phrasal'];
const f = h.ejecutar(`${NOMBRES.map(n => h.extraerFuncion(n)).join('\n')}
  return { ${NOMBRES.join(', ')} };`, {});

const prog = interval => ({ state: 'review', interval });
const w = (word, example = '', extra = {}) => ({ word, translation: 't', example, exampleTranslation: 'e', ...extra });
const lote = (id, pages, vocab, extra = {}) => ({ id, pages, vocab, grammar: [], exercises: [], speakingPrompts: [], ...extra });

// ── Lo que se ve en cada página (su foto) ─────────────────────────────────
// Entre corchetes, las respuestas de los ejercicios de completar y de ordenar
// palabras; en la p. 93, lo que muestra el plano.
const IMPRESO = {
  85: `Where do you usually buy your clothes? In a small shop? In a department store? At a street market? Online?
    From a mail-order catalog? Me? I usually buy my clothes online. They're too expensive at the mall!`,
  86: `To keep you warm on a cool day: a sweater over a shirt / a heavy jacket and a scarf / a light coat over a sweater.
    To wear at home: an old sweatshirt and sweatpants / a casual shirt and jeans / a dress shirt or blouse with a pair of khakis or slacks.
    To keep you cool on a hot day: a loose, short-sleeve shirt and pants / a pair of shorts and a tank top / a bathing suit.
    For a party at a friend's home: a wild sweater / a nice suit / a blazer and slacks / a T-shirt and jeans.
    I like to wear a T-shirt and sweatpants at home, but not at a party. What about you?
    I agree. T-shirts and sweatpants aren't OK for a party. But they're great at home.`,
  87: `They say this place has the biggest selection of brands in town. And look how cheap those running shoes are!
    Well, no wonder! According to the sign in the window, they've got the lowest prices, too. Everything's on sale this week. Want to go in?
    Why not? Wow, those are really attractive. And they're half price. You're right. What a bargain! I think you should try them on.
    I'd be happy to help you with that. What's your size? So how are they? They're a little small. Let me ask for a larger size . . . Excuse me?
    So are those any better? Much better. I'll take them. Great. If you'd like to keep shopping, I can hold them here for you.
    Thank you so much! Salesperson: My pleasure. Well, they've got the best service in town, too.
    When something's "on sale," its price is a higher than usual b lower than usual.
    If you say, "What a bargain!" you're surprised about a a high price b a low price.`,
  88: `a long-sleeve shirt a short-sleeve shirt a polo shirt a sleeveless blouse a V-neck a crewneck a turtleneck a cardigan
    pajamas a nightgown high heels flats loafers running shoes sandals a belt a purse gloves a hat a cap
    Note: You can use "a pair of" with: shoes, high heels, flats, loafers, running shoes, sandals, gloves, pants, shorts, jeans, pajamas.
    Tell your partner about some of your favorite clothing and accessories. I love my old jeans. They're so comfortable.
    I want the belt. → I want it. She loves those sandals. → She loves them.
    Did you give your credit card to the salesperson? → Did you give your credit card to her?
    I'm buying a blue blazer for my husband. → I'm buying a blue blazer for him.
    Did you give the scarf to your brother? I'm buying it for her.
    I → me you → you he → him she → her it → it we → us they → them`,
  89: `Should I buy this short-sleeve shirt? It's really nice. You should definitely buy [it].
    I'm buying a gift for Mom. It's her birthday. What do you think of these pajamas?
    Actually, you shouldn't buy those for [her]. She doesn't like green. Get a different color.
    Did you want that belt, sir? Yes, please. I'll take [it] in black.
    Are you giving your husband that tie? Yes. I'm giving [him] a nice dress shirt, too.
    I want these sandals, but I need [them] in size 40. No problem. I can get [them] for [you].
    Can you help [me]? I'd like these five items, but I want to keep shopping.
    Certainly. I can hold [them] for [you]. Just tell [me] when you're ready to pay.
    for my sister-in-law / I / them / bought [I bought them for my sister-in-law.]
    Excuse me. I like this skirt, but can I get it in a different color? Certainly. Is black OK?
    Perfect. I'll take it. By the way, how much are those small purses over there? They're on sale . . . twenty dollars.
    That's great. I'll take the black one. Of course. And how would you like to pay: cash or credit? Credit, please. Thanks for your help!`,
  90: `Which of these men's coats is the cheapest? The most popular stores are on Smith Street. Jake's Shoes has the best prices in town.
    good → the best bad → the worst
    cheap → the cheapest great → the greatest nice → the nicest cute → the cutest easy → the easiest pretty → the prettiest
    big → the biggest hot → the hottest These shoes are the most comfortable. This sweater is the least expensive.
    Is there a nice mall around here? I need a birthday gift for my husband. Try the Park Plaza. It's [the newest] mall in town.
    Do you recommend Gloria's Jeans? Absolutely! They're [the most comfortable] jeans we sell.
    What's [the most popular] brand of running shoes right now? Definitely Marlins. And they're [the most attractive], too.
    What's [the nearest] department store from the train station?
    Hey, Silvia, I'm at Crane's Shoes, and I'm in the mood for Japanese food! Is there a good place nearby?
    Actually, Sid's Sushi is [the best] Japanese restaurant in that neighborhood.
    Well, I got a good deal on a Mixwell at the Bargain Barn. It's not [the cheapest] blender, but it's [the easiest] to use.`,
  91: `Where's the best place in town to buy footwear? That depends. What are you looking for? A pair of sandals.
    Well, they say Tom's Outdoor Store has the largest selection and the best bargains.
    What about location? I'd like something near public transportation.
    Well, Tom's is near the subway station. It's probably the most convenient.
    Ideas: footwear sleepwear men's / women's tops sweaters men's / women's accessories warm-weather clothing casual clothing
    Do you prefer . . . ? / Would you like . . . ? What about . . . ?`,
  92: `on the top floor on the third floor on the second floor on the first floor (OR on the ground floor) in the basement in the back in the front
    Take the escalator to the third floor. The men's department is on the third floor, in the back, on the right.
    Take the escalator. Take the stairs. Take the elevator.
    Go up (or down) the escalator. Go up (or down) the stairs. DON'T SAY: Go up (or down) the elevator.
    The electronics department is (on this floor / upstairs / downstairs). It's in (the front / the back) of the store.
    The men's bathroom is (on this floor / upstairs / downstairs). The coffee shop is (on this floor / upstairs / downstairs).
    Women's sweaters are (on this floor / upstairs / downstairs). They're in (the front / the back) of the store.
    The luggage department is (on this floor / upstairs / downstairs).
    It's on the third floor. Excuse me? The FIRST floor? No. It's on the THIRD floor.
    Is it in the BACK of the store? No. It's in the FRONT of the store. Should I take the STAIRS? No. It's on the third floor. Take the ESCALATOR.`,
  93: `[Coffee Shop, Furniture, Children's and Men's are on the second floor.] [Children's is on the second floor.]
    Excuse me. I'm looking for running shorts. Oh, those are in Sports and Fitness in the basement. Take the . . .
    Can I get [this] in ___ ? Is this [the heaviest] coat? I'll take [them]. How would you like to pay? I can hold that for you.`,
  94: `Going abroad on business? Well, that's pretty exciting!
    In some countries, clothing customs are pretty liberal, and in other ones, "anything goes"—there are almost no rules at all.
    So if that describes your destination, you can just relax and pack whatever you want.
    Instead of wearing suits and ties to work, most men simply wear a nice pair of slacks—such as khakis—and a dress shirt.
    Nevertheless, even in countries with generally liberal dress codes, some items are not "business casual."
    Shorts and tank tops may be fine on the street, but they're never appropriate in an office.
    Dressing casually—for example, not wearing a tie or a suit jacket—may actually seem impolite.
    The most important thing is the success of your business trip.
    In some countries, office dress codes are pretty casual. In other countries, dress codes are much more formal.`,
  95: `Another way to say "put clothes in your luggage" is (pack / travel).
    The rules about what to wear are sometimes called clothing (do's and don'ts / mistakes).
    When people dress in a business casual style, they wear (more formal / less formal) clothing in an office.
    Another way to describe an extremely liberal attitude about clothing is ("anything goes" / "very strict").
    a country where "anything goes" in casual settings a country where people generally wear "business casual" in offices
    I tend to be conservative. I tend to be liberal. My attitude is "anything goes!"
    on the street in a formal restaurant in an office in a casual social setting at a movie theater
    In this country, dress codes are pretty liberal. However, there are a few rules you should keep in mind. First of all, . . .`,
};
const normal = s => String(s).replace(/[[\]]/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

/** Los ejemplos que pone cada corrección: cambiados y de tarjetas nuevas. */
function ejemplosDe(nombre) {
  const vistos = [];
  const g = h.ejecutar(`${h.extraerFuncion(nombre)} return ${nombre};`, {
    fixBookPage: (units, fix) => {
      (fix.cambios || []).forEach(c => { if (c.set.example) vistos.push(c.set.example); });
      (fix.nuevas || []).forEach(n => { if (n.v.example) vistos.push(n.v.example); });
      return false;
    },
    fixPageContent: () => false, unirEnLaUnidad: () => false,
  });
  g({});
  return vistos;
}

test('todo ejemplo nuevo está impreso en su página', () => {
  for (const nombre of PAGINAS) {
    const pagina = Number(nombre.slice(-2));
    const texto = normal(IMPRESO[pagina]);
    for (const ej of ejemplosDe(nombre)) {
      assert.ok(texto.includes(normal(ej)), `p. ${pagina}: "${ej}" no está en la página`);
    }
  }
});

// ── Las páginas ────────────────────────────────────────────────────────────

test('las páginas reciben su número del libro, por su id', () => {
  const units = { a2_8: { batches: [lote('b_1788803892009_h0jubf', undefined, []), lote('b_1789062402130_55jc7v', undefined, []), lote('otro', undefined, [])] } };
  assert.equal(f.fixU8Pages(units), true);
  assert.deepEqual(units.a2_8.batches.map(b => b.pages), [[85], [95], undefined]);
});

test('p. 89: ningún ejemplo queda sin el pronombre que faltaba en el ejercicio', () => {
  const units = { a2_8: { fcProgress: {}, batches: [lote('x', [89], [
    w('size', 'I need in size 40.'), w('get', 'I can get for you.'), w('take', "I'll take in black."),
    w('help', 'Can you help?'), w('no problem', 'No problem. I can get for.'), w('by the way'), w('black'), w('of course'),
  ])] } };
  f.fixU8P89(units);
  const ej = Object.fromEntries(units.a2_8.batches[0].vocab.map(v => [v.word, v.example]));
  assert.equal(ej.size, 'I want these sandals, but I need them in size 40.');
  assert.equal(ej.get, 'No problem. I can get them for you.');
  assert.equal(ej.take, "Yes, please. I'll take it in black.");
  assert.equal(ej.help, 'Can you help me?');
});

test('p. 95: las opciones del ejercicio ya no son hechos', () => {
  const units = { a2_8: { fcProgress: {}, batches: [lote('x', [95], [
    w('travel', "Another way to say 'put clothes in your luggage' is pack or travel."),
    w('more formal', 'When people dress in a business casual style, they wear more formal clothing in an office.'),
    w('very strict', "Another way to describe an extremely liberal attitude about clothing is 'very strict'."),
    w('keep in mind'), w('pretty liberal'),
  ])] } };
  f.fixU8P95(units);
  const ej = Object.fromEntries(units.a2_8.batches[0].vocab.map(v => [v.word, v.example]));
  assert.match(ej.travel, /\(pack \/ travel\)/);
  assert.match(ej['more formal'], /\(more formal \/ less formal\)/);
  assert.match(ej['very strict'], /\("anything goes" \/ "very strict"\)/);
});

test('p. 93: "Children\'s" está en el segundo piso, como en el plano', () => {
  const units = { a2_8: { fcProgress: {}, batches: [lote('x', [93], [
    w("Children's", "Children's is on the ground floor."), w('Accessories', 'Accessories is on the ground floor.', { exampleTranslation: 'Accesorios está en la planta baja.' }),
  ])] } };
  f.fixU8P93(units);
  const [ninos, acc] = units.a2_8.batches[0].vocab;
  assert.equal(ninos.example, "Children's is on the second floor.");
  assert.equal(acc.exampleTranslation, 'Accesorios está en el primer piso.', 'en Colombia el ground floor es el primer piso');
});

test('p. 86: en Colombia el sweatshirt es un buzo y la sudadera es el pantalón', () => {
  const units = { a2_8: { fcProgress: {}, batches: [lote('x', [86], [w('a sweatshirt'), w('sweatpants')])] } };
  f.fixU8P86(units);
  const [buzo, sudadera] = units.a2_8.batches[0].vocab;
  assert.match(buzo.translation, /buzo/);
  assert.match(sudadera.translation, /sudadera/);
});

// ── El progreso no se pierde ───────────────────────────────────────────────

test('una repetida en otra página se une y su progreso pasa a la que queda', () => {
  const units = { a2_8: { fcProgress: { cheapest: prog(5), cheap: prog(2) }, batches: [
    lote('p87', [87], [w('cheapest'), w('attractive'), w('bargain'), w("I'll take them")]),
    lote('p90', [90], [w('cheap')]),
  ] } };
  f.fixU8P87(units);
  assert.ok(!units.a2_8.batches[0].vocab.some(v => v.word === 'cheapest'));
  assert.deepEqual(units.a2_8.fcProgress.cheap, prog(5), 'queda el de intervalo más largo');
  assert.equal(units.a2_8.fcProgress.cheapest, undefined);
});

test('si la que queda no está en el aparato, la repetida no se quita', () => {
  const units = { a2_8: { fcProgress: { cheapest: prog(5) }, batches: [lote('p87', [87], [w('cheapest')])] } };
  f.fixU8P87(units);
  assert.ok(units.a2_8.batches[0].vocab.some(v => v.word === 'cheapest'));
  assert.deepEqual(units.a2_8.fcProgress, { cheapest: prog(5) });
});

test('al renombrar ("comparing" → "compare"), el progreso la sigue', () => {
  const units = { a2_8: { fcProgress: { comparing: prog(4) }, batches: [lote('p91', [91], [w('comparing'), w('That depends'), w('location')])] } };
  f.fixU8P91(units);
  assert.ok(units.a2_8.batches[0].vocab.some(v => v.word === 'compare'));
  assert.deepEqual(units.a2_8.fcProgress, { compare: prog(4) });
});

test('phrasal verbs: solo los que lo son, y sin la copia de los que ya están en su página', () => {
  const units = { a2_8: { fcProgress: {}, batches: [
    lote('pv_a2_8', undefined, [w('try on', '', { type: 'phrasal verb' }), w('no wonder', '', { type: 'phrasal verb' }),
      w('put on', '', { type: 'phrasal verb' }), w('anything goes', '', { type: 'phrasal verb' })], { title: 'Phrasal verbs — Unit 8' }),
    lote('p87', [87], [w('no wonder')]),
  ] } };
  f.fixU8Phrasal(units);
  const pv = units.a2_8.batches[0];
  assert.deepEqual(pv.vocab.map(v => [v.word, v.type]), [['try on', 'phrasal verb'], ['put on', 'phrasal verb'], ['anything goes', 'phrase']],
    '"no wonder" se va (está en la p. 87); "try on" y "anything goes" no, porque aquí no hay otra página que los tenga');
  assert.equal(pv.title, 'Phrasal verbs & expressions — Unit 8');
});

test('en el arranque y al restaurar páginas corren todas las de la Unit 8', () => {
  const migrar = h.extraerFuncion('migrateState');
  assert.match(migrar, /if \(!merged\._u8PagesV1 && fixU8Pages\(merged\.units\)\) merged\._u8PagesV1 = true;/);
  for (const n of [...PAGINAS, 'fixU8Phrasal']) {
    assert.match(migrar, new RegExp(`\\['_u8\\w+V1', ${n}\\]`), `${n} sin bandera en migrateState`);
  }
  assert.ok(migrar.indexOf('fixU8Pages(merged.units)') < migrar.indexOf("['_u8P85V1', fixU8P85]"), 'los números de página van primero');
  const restaurar = h.extraerFuncion('applyPageFixes');
  for (const n of ['fixU8Pages', ...PAGINAS, 'fixU8Phrasal']) assert.match(restaurar, new RegExp(`\\b${n}\\b`));
});
