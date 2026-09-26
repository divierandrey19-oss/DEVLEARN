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

`let state = loadState()` corre cerca de la línea 99. Toda constante que
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
`SHOP_FAMILIES` en la sección Verbos es el ejemplo.

### Un lote sin fotos no se puede regenerar

Regenerar reconstruye la gramática **desde las fotos de la página**. Un
lote sin fotos (vocabulario escrito a mano) no puede regenerarse, así
que no debe mostrarse como desactualizado ni ofrecer el botón.

---

## Antes de publicar

- Revisar la sintaxis de **los dos** bloques `<script>`, no solo el grande.
- Correr las pruebas. **No publicar con nada en rojo**, ni siquiera un
  fallo que "parece del arnés" — verificar primero si es del código.
- Subir `APP_BUILD` y el comentario `DEVLEARN_BUILD` de la línea 2. La
  app lee ese comentario en tiempo de ejecución para decirle al usuario
  qué versión tiene abierta.
- Verificar que las constantes del arranque sigan en orden.

---

## Contexto del usuario

- Estudia A2, va por la Unit 9. Examen final de nivel: 16 de octubre.
- Su punto más flojo en los speaking tests es la **coherencia** — por eso
  los textos llevan muchos conectores.
- Tiene una tienda de mascotas con su hermano. Los ejemplos del
  vocabulario usan su vida real a propósito; no los cambies por genéricos.
- Escribe en español. Responde en español.
