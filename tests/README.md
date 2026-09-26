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
