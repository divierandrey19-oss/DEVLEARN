# Pruebas

```sh
node --test tests/*.test.js        # la suite (rápida, sin dependencias)
node tests/verificar-mutaciones.js # comprueba que la suite sirve de algo
```

Node 18 o superior. No hay `npm install`: la suite usa solo `node:test` y
`node:assert`, igual que la app no tiene build ni dependencias.

## Cómo funcionan

La app es un solo `index.html` de 20.000 líneas, así que no hay nada que
importar. Cada prueba **recorta del HTML real** la función que va a probar y la
ejecuta con un `localStorage` de mentira (`tests/harness.js`). Se prueba el
código que de verdad se publica, no una copia que se desactualiza sola.

El recorte se apoya en el formato del archivo: las funciones de primer nivel
empiezan en la columna 0 y cierran con un `}` en la columna 0. Si eso cambia,
el arnés **lanza** en vez de devolver vacío — una prueba que no encuentra su
función tiene que fallar, no pasar por no haber mirado nada.

## Qué cubren

`guards.test.js` — Los tres guardias de `writeState()` que el CLAUDE.md marca
como intocables, más el camino del límite de almacenamiento: que borrar y
reintentar funcione, y que un guardado fallido devuelva el valor viejo a su
sitio.

`heal-store.test.js` — `healBloatedStore()`, que escribe en `localStorage`
sin pasar por `writeState()`. Cubre el caso normal (un guardado válido con
fotos incrustadas sí se compacta) y el que borraba datos (con `__loadCorrupt`
no toca el disco).

`load-state.test.js` — De dónde salen los datos al abrir: la clave actual, las
claves viejas, el respaldo diario, una importación pendiente, y cuándo se
levanta `__loadCorrupt`.

`startup-order.test.js` — Que toda constante usada durante la carga esté
declarada **antes** de `let state = loadState()`. Es el fallo de
`U7_WH_BACKFILL`, que ya pasó dos veces: las funciones se elevan, las
constantes no, y una declarada tarde hace que la carga devuelva el estado
vacío.

`publish-checks.test.js` — Que los dos bloques `<script>` compilen, y que
`DEVLEARN_BUILD` y `APP_BUILD` digan lo mismo y sigan donde la app los busca.

`rec-challenge.test.js` — El reto de 20 días grabándose: que un día perdido
corte la racha, que hoy sin grabar todavía no la corte, que un día no cuente
dos veces y que los días de otro dispositivo se sumen en vez de pisarse.

`page-review.test.js` — Repasar una sola página: que la baraja traiga solo sus
palabras, que abrirla no borre el progreso del resto de la unidad, y que la
sesión guardada de una página no se retome en la unidad entera ni al revés.

`word-kind.test.js` — La etiqueta de la flashcard (Verb, Noun, Phrasal verb…):
que cada tipo de la IA tenga la suya, que un phrasal verb marcado como "verb"
se reconozca igual, y que sin tipo conocido no salga una etiqueta equivocada.

`speakable.test.js` — Lo que lee la voz: que las contracciones (I've, we're,
I'll) conserven su apóstrofo y que las comillas alrededor de una palabra se
sigan quitando.

`fc-queue.test.js` — Qué trae la sesión al tocar Start: las pendientes si hay,
si no las nuevas (lo que dice la pantalla), y la unidad entera solo cuando ya
no hay nada nuevo.

`book-pages.test.js` — Las páginas se llaman como en su libro ("p. 109"): que
solo entren números razonables, que el nombre salga bien y que el análisis los
pida y los guarde.

`analysis-prompt.test.js` — Lo que se le pide a la IA al leer una página: que
busque phrasal verbs y expresiones y los guarde enteros, sin saltarse la regla
de solo lo impreso, y que "phrasal verb" sea un tipo válido. También que copie
los ejemplos del libro palabra por palabra (en la p. 110 uno decía lo contrario),
que las expresiones vayan completas ("No offense, but…", "keep your ideas to
yourself"), que "work hard" no cuente como phrasal verb y que los verbos vayan en
forma base, y que las frases citadas como ejemplo en la regla no se cuelen como
vocabulario si la página no las imprime. Y, por lo que salió en la gramática de las
pp. 109-111: la trampa del español solo si es real, la frase de contexto de un
completar sigue la misma situación, como mucho dos temas "derived" en una página
que no enseña gramática, y nada de lo que escribe puede contradecir el libro.
La explicación y la trampa de la gramática van en español (con Opus, la p. 112
salió con ambas en inglés porque el prompt no decía el idioma).

`u10-p110-fix.test.js` — La corrección única de la p. 110 (Unit 10), hecha
comparando su respaldo con la foto: ningún ejemplo al revés del libro,
expresiones completas, "That's just the way it is" agregada una sola vez, todo
ejemplo nuevo impreso en la página, y la bandera marcada solo si la página estaba
en el aparato. Usa `fixBookPage()`, el mismo mecanismo que las páginas siguientes.

`analysis-model.test.js` — Leer las páginas usa Opus 5.5 (lo eligió él; el resto
de la app sigue en Sonnet 4.5). La respuesta se lee por tipo de bloque, porque
Opus empieza pensando y leer solo el primer bloque daba vacío; un rechazo del
filtro de seguridad es el error `REFUSAL`, y `effort` / `fallbacks` solo van en
la llamada que los pide.

`sync-merge.test.js` — Celular y computador sin perder páginas. El 29 de
septiembre el computador, abierto desde antes, subió su copia vieja y la unión
tomó la p. 111 del celular por borrada. Ahora solo borra una página el registro
explícito de que él la borró (`deletedBatchIds`, unido entre aparatos); cada
aparato trae la nube antes de subir y al volver a la pestaña; y "Restore missing
pages" agrega desde un respaldo solo las páginas que faltan, con sus correcciones.

`u10-content-fix.test.js` — La gramática, los ejercicios y el speaking de las
pp. 109-111, corregidos a mano con `fixPageContent()`: las tareas de speaking que
eran títulos de lecciones, la "trampa" falsa del if, el error común que decía lo
contrario de Sophie, traducciones literales. Solo reemplaza textos que siguen
exactamente como los dejó el análisis. También la p. 112 (explicación y trampa
al español) y los repetidos de la p. 109 que la p. 112 ya enseña, solo si la
p. 112 está en el aparato. Y la p. 113: una sola tarea de speaking para la
conversación, y "to have kids" de la p. 109 fuera porque la p. 113 tiene "have
kids" — con `vocabKey()`, que ahora reconoce esas repetidas al analizar.

`texts-u10.test.js` — Los textos de la Unit 10 que él memoriza: en la semilla,
con traducción, máximo 150 palabras (lo pidió), con lo que él contó de su vida
(no lo que se supuso: "nunca nos quedamos hasta tarde") y entregados subiendo
`SEED_VERSION`.

`sentence-menu.test.js` — Escuchar una sola frase del texto: el botón 🔄 de
cada frase abre un menú con 🔊 Listen (solo esa frase, y el cursor queda ahí
para ◀ y 🔁) o 🔄 Flip. Antes solo volteaba, y para oír una frase había que
escuchar el texto entero.

`text-review.test.js` — El repaso espaciado de los textos aprendidos, para que
no se le olviden los de la unidad anterior: al marcar ✅ vuelve mañana; si se lo
sabe, cada vez más espaciado (3, 7, 14, 30, 60 días); si se le olvidaron partes,
mañana otra vez. Solo las Units 9 y 10, las que más le sirven para el speaking
(lo pidió él). Los que ya tenía aprendidos se reparten uno por día, de la última
página hacia atrás, sin mover nada ya programado.

`u9-fix.test.js` — La Unit 9 revisada contra las fotos: números de página por
id, letra mal leída (Teri, cast), ejemplos que mezclaban opciones, opciones de
"Scan for facts" tomadas como hechos, el ejercicio que adivinaba el audio, y
tarjetas repetidas ("go kayaking" / "kayaking", "burned" / "burn"). Él ya había
estudiado toda la unidad: `moverProgreso` pasa el progreso de una tarjeta
renombrada o repetida a la que queda, y si las dos tenían, queda el mejor.

`u10-p111-fix.test.js` — La corrección de la p. 111: el diálogo de Jake y Nicole
leído mal ("Ring Street", "how much time", "the deadline…"), "deadline" que la
página no imprime, formas base y las expresiones del diálogo que faltaban. Y que
la foto se guarde y se mande a 2048 px por el lado largo, calidad 0.85 (a 800 px
de ancho la IA leyó mal la letra pequeña).

`verbs.test.js` — El contenido de Verbs: que ningún verbo esté en dos familias,
que el ejemplo resalte el pasado que pide la tarjeta, que los regulares
terminen en -ed y estén en la familia de su sonido, y que cada familia tenga
su regla.

`my-life.test.js` — La pestaña My life: que cada tarjeta del local tenga su
frase en presente (el local, la casa y Going out), que no haya dos frentes
iguales en español, que la casa no comparta tarjeta con el local, que Verbs ya
no lleve el local y que cada globito cuente lo suyo.

## verificar-mutaciones.js

Una suite en verde no prueba nada por sí sola: puede estar pasando porque no
examina nada. Este script rompe `index.html` a propósito —quita cada guardia,
desordena el arranque, desincroniza el sello— y comprueba que la suite **se
pone roja** en cada caso. Si una mutación pasa en verde, la prueba que debía
atraparla no sirve.

Córrelo al tocar la suite. Si una mutación deja de aplicarse porque el código
cambió, el script lo dice en vez de fingir que pasó.

## Al agregar pruebas

Las que valen la pena son las que habrían atrapado algo que ya dolió. El
CLAUDE.md lleva la lista de lo que costó caro; lo que siga sin cubrir de ahí es
el mejor sitio para empezar. Y toda prueba nueva merece su mutación en
`verificar-mutaciones.js`: si no puedes escribir una que la ponga roja, la
prueba probablemente no examina nada.
