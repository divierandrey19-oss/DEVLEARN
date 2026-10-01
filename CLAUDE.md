# DEV LEARN

App de un solo archivo (`index.html`) para estudiar inglés. La usa Dev,
estudiante A2 en American Schoolway, Bogotá. Todo vive dentro del HTML:
datos, lógica y estilos. No hay build ni dependencias — se edita directo.

Son ~20.000 líneas. Antes de cambiar algo, lee esto.

---

## Lo que no se quita nunca

**El 3 de septiembre de 2026 el usuario perdió todos sus datos.** Tres
guardias en `writeState()` impiden que se repita:

1. **`window.__loadCorrupt`** — si la carga falló, no se escribe nada.
   Sin esto, un arranque malo sobrescribe los datos buenos con vacío.
2. **Bloqueo de guardado vacío** — si va a guardar 0 unidades y en disco
   hay unidades, se niega y avisa. Solo una importación deliberada puede
   vaciar (`window.__allowEmptyOverwrite`).
3. **Respaldo diario** en `lingua_v4_autobackup` — el primer guardado de
   cada día se duplica ahí. Es a lo que `loadState()` recurre antes de
   darse por vencido.

Quitar cualquiera de las tres borra datos reales de una persona.

---

## Reglas que ya costaron caro

### Las constantes van antes del arranque

`let state = loadState()` corre cerca de la línea 4650. Toda constante que
use `loadState()`, `migrateState()` o `defaultState()` debe estar
declarada **antes** de esa línea.

Las funciones se elevan; las constantes no. Un `const` declarado más
abajo hace que `loadState()` lance `ReferenceError`, se trague el error
y devuelva el estado vacío — exactamente el fallo que borró los datos.

Esto ya pasó una segunda vez, al agregar `U7_WH_BACKFILL`. Se detectó
antes de publicar porque las pruebas estaban en verde y pasaron a rojo.

### Subir `SEED_VERSION` al agregar contenido

Los textos y el vocabulario sembrados se entregan una sola vez, con
guarda por versión. Si se agrega contenido y no se sube `SEED_VERSION`,
el usuario que ya abrió una versión anterior **nunca lo recibe**.

Pasó dos veces: con el texto de la página 92-93 y con los phrasal verbs
de la Unit 9.

### Bandera nueva para corrección nueva

Una bandera de migración ya marcada en `true` no vuelve a correr jamás.
Si una corrección anterior falló y hay que reintentarla, necesita una
bandera **nueva** — reutilizar la vieja significa que no corre nunca.

Pasó con `_u8ShopTextFixed` → `_u8ShopTextFixedV2`.

### No sembrar vocabulario dentro de una unidad

La app borra palabras que ya existen en otro lote de la misma unidad,
para que no se repitan en Flashcards. Es correcto que lo haga.

Pero sembrar vocabulario a mano en una unidad **bloquea las páginas que
el usuario suba después**. Al sembrar los phrasal verbs de la Unit 9, la
página 104 entró con 4 palabras en vez de 27.

El vocabulario que no es del libro va fuera de las unidades —
`SHOP_FAMILIES` en la pestaña My life es el ejemplo.

### Que falte en la nube no es un borrado

El 29 de septiembre se perdió la p. 111: él la subió en el celular con el
computador abierto desde antes; el computador subió su copia vieja entera
encima de la nube, y al abrir el celular la unión tomó la página por
"borrada en otro aparato" y la quitó.

Ahora una página solo se borra al sincronizar si está en `deletedBatchIds`
(se anota cuando **él** borra algo, con `recordDeletedBatches`). Cada aparato
trae la nube antes de subir. No vuelvas a deducir borrados de una ausencia.
Si algo vuelve a perderse, Settings → "Restore missing pages from a backup"
lo recupera de un respaldo sin tocar lo demás.

### Un lote sin fotos no se puede regenerar

Regenerar reconstruye la gramática **desde las fotos de la página**. Un
lote sin fotos (vocabulario escrito a mano) no puede regenerarse, así
que no debe mostrarse como desactualizado ni ofrecer el botón.

---

## Revisar una página que él sube

Él sube la foto del libro; `_analyzeReal` la manda a **Opus 5.5** (el resto de
la app usa Sonnet 4.5) y guarda vocabulario, gramática, ejercicios y speaking
en un lote (`units.a2_N.batches[]`, con `pages: [112]`). Luego exporta el
respaldo desde Settings (`devlearn_backup_*.json`) y lo manda. El respaldo es
el estado completo **con las fotos** en base64.

**Revisar** (sacar la foto del lote a un archivo y mirarla):
- Vocabulario: impreso en la página; ejemplo copiado palabra por palabra (sin
  cambiar un *not* / *can't*); traducción natural colombiana; verbos en forma
  base; expresiones completas ("No offense, but...", no "offense").
- Gramática: `explanation` y `spanishTrap` en español; la trampa, real; "book"
  solo si la página enseña la regla.
- Ejercicios: respuesta correcta; la frase de contexto sigue la misma situación.
- Speaking: solo tareas impresas. Ni títulos de lecciones (franja
  COMMUNICATION GOALS) ni la misma conversación tres veces.
- Repetidos con otras páginas de la unidad (`vocabKey`).

Decirle qué salió bien y qué mal, **y preguntar** antes de corregir. Separar lo
que es del modelo de lo que causa el prompt: si una regla del prompt provoca el
error, se arregla también el prompt, o se repite en cada página.

**Corregir a mano**, sin pagar otro análisis:
- Vocabulario: `fixBookPage(units, { unit, page, marca, cambios, nuevas })`.
- Gramática, ejercicios, speaking: `fixPageContent(units, { unit, page,
  cambios: [[viejo, nuevo]], quitarGramatica, quitarPalabras, unir,
  quitarEjercicios, ejercicios })`. `cambios` solo reemplaza campos cuyo valor
  es **exactamente** el viejo (si él lo editó, no se toca); con `null` lo quita
  de su lista. Para cambiar la respuesta de un ejercicio usa `ejercicios`
  (por su pregunta exacta): con `cambios` el mismo texto cambiaría también
  donde es opción de otro ejercicio.
- Lotes sin número de página (los de antes de guardar `pages`): `id` en vez
  de `page`, o ponerles el número primero, como `fixU9Pages`.
- **Él estudia las tarjetas.** Renombrar una (`set.word`) mueve su progreso;
  una repetida se quita con `unir: [[vieja, queda]]`, que le pasa el progreso
  a la que queda (si ambas tenían, gana la de intervalo más largo). Nunca
  quitar tarjetas estudiadas con `quitarPalabras` salvo que estén mal (una
  afirmación falsa).
- Una función por página (`fixU10P111`, `fixU10P112Content`…), llamada desde
  `migrateState` con bandera nueva que se marca **solo si la página está en el
  aparato**: `if (!merged._flag && fixX(merged.units)) merged._flag = true;`.
- Agregarla a `applyPageFixes`, para que una página recuperada de un respaldo
  también salga corregida.
- Copiar los textos viejos **exactos** del respaldo y comprobar con un script,
  contra el respaldo real, que cada uno se encuentra antes de publicar.
- Todo ejemplo nuevo tiene que estar impreso en la página; la prueba lo
  verifica. Prueba en `tests/u10-*.test.js` y una mutación.
- El respaldo son datos suyos: no se sube al repositorio.

---

## Antes de publicar

- Revisar la sintaxis de **los dos** bloques `<script>`, no solo el grande.
- Correr las pruebas: `node --test tests/*.test.js`. **No publicar con nada
  en rojo**, ni siquiera un fallo que "parece del arnés" — verificar primero
  si es del código. Cubren los tres guardias, el orden del arranque y el
  sello de build; `tests/README.md` explica el resto.
- Subir `APP_BUILD` y el comentario `DEVLEARN_BUILD` de la línea 2. La
  app lee ese comentario en tiempo de ejecución para decirle al usuario
  qué versión tiene abierta.
- Verificar que las constantes del arranque sigan en orden.
- **Abrir el pull request.** Siempre, en cuanto se suba un cambio — no hay
  que pedirlo cada vez. Empujar la rama y quedarse callado no cuenta: el
  cambio no está entregado hasta que hay un PR abierto para revisarlo.
  Si la rama ya se mergeó, el trabajo nuevo arranca desde `main` en una
  rama fresca y lleva su propio PR.

---

## Los textos que él memoriza

Se escriben de a poco, solo los de las páginas de la clase siguiente, y se
entregan subiendo `SEED_VERSION`.

- Máximo 170 palabras (antes eran 150; él lo subió el 1 de octubre).
- **Preguntarle antes** lo de su vida que el texto va a contar. No suponer
  nada ("nunca nos quedamos hasta tarde" salió de una suposición).
- **Su opinión, con sus palabras.** Puede decir con quién del libro está de
  acuerdo, pero no repetir la frase de ese personaje como si fuera suya. El
  texto de las pp. 110-111 abre con la frase de Kevin casi igual ("anyone
  can be successful if you work hard"); él lo notó: la idea es hablar de lo
  que **él** piensa. Ese texto se queda así porque ya se lo aprendió.

---

## Contexto del usuario

- Estudia A2, va por la Unit 10. Examen final de nivel: 16 de octubre.
- Su punto más flojo en los speaking tests es la **coherencia** — por eso
  los textos llevan muchos conectores.
- Tiene una tienda de mascotas con su hermano. Los ejemplos del
  vocabulario usan su vida real a propósito; no los cambies por genéricos.
- Escribe en español. Responde en español.
