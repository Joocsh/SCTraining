# PROMPT MAESTRO 3/3 — AppFolio: el currículum

> Pásale este documento completo a un agente de código, o dile:
> **"sigue `AppFolio/PROMPT-appfolio-3-curriculum.md`"**.
>
> Último de tres. El 1/3 y su addendum construyeron el **contrato**; el 2/3 construyó el
> **mundo**. Éste escribe las **13 lecciones y el examen**.
>
> No toca el mundo. Sólo lo cita.

---

## 0. De dónde partes

**No empieces hasta que el 2/3 esté terminado y su puerta H esté verde.** Este documento
depende de que existan los catorce anclajes del §6 del 2/3, con sus ids reales. Si no
están, para y dilo.

Lo que ya tienes construido y verificado:

| | |
|---|---|
| `afRecordAnswer(bucket, id, payload)` | El **único** escritor de los cinco buckets calificados. Con guard de modo. Devuelve `boolean` |
| `afMark(id)` | El único escritor de `checklist`. Con guard de modo |
| `afStaleSteps(lessonId)` | Detecta paso marcado con efecto ausente. **Espera a que los pasos declaren `effect()`** |
| `afNoteLessonComplete` / `afLessonEverComplete` / `afResetLesson` | Ya conectados a SimEngine |
| `afLessonStepStatus(step)` | Ya lee los cinco buckets por tipo de paso |
| `SimEngine.init()` | Ya recibe `selfFeedbackTypes: ['decide','verify','reconcile','compose','triage']` |
| Los 14 anclajes del §6 del 2/3 | Colocados sobre el error caro que cada lección enseña |

**Nada de esto se reescribe.** Si crees que una de esas funciones necesita cambiar,
para y pregunta: es más probable que la lección esté mal planteada.

---

## 1. Qué se construye y qué NO

### Sí

- `AF_LESSONS` — 13 lecciones con sus pasos y sus bloques `walk`
- Los cinco bancos de ítems calificados: `AF_SCENARIOS`, `AF_VERIFY_ITEMS`,
  `AF_RECONCILE_ITEMS`, `AF_COMPOSE_ITEMS`, `AF_TRIAGE_ITEMS`
- `AF_RUBRIC_CHECKS` — los predicados deterministas que califican lo escrito
- `AF_EXAM_BANK`, `AF_EXAM_BLUEPRINT`, `AF_EXAM_PASS_PCT`
- `AF_CHECKLIST_IDS` — el índice de todos los ids de paso `do`
- Las vistas de lección y de examen dentro de `afLessonsHTML()` / `afLessonDetailHTML()`,
  que hoy sólo pintan estado vacío
- Los `effect()` de los pasos `do` que dejan huella en el sandbox

### No

- **Ni una entidad nueva del mundo.** Si una lección necesita un caso que no existe,
  se añade como **anclaje fixture** en `appfolio-catalog-data.js` siguiendo la regla de
  dos capas del §3 del 2/3 — nunca como dato suelto dentro del currículum, y nunca
  reutilizando por casualidad una entidad generada.
- Ningún graduador nuevo. Todo pasa por `afRecordAnswer()`.
- Ninguna clave nueva en `afStore`. Las 10 bastan; `shuffleSalt` y `exam` ya están.
- Ningún cambio en `assets/`, `index.html`, `Docusign/` ni `Quialia/`.

**Criterio de terminado:** alguien sin experiencia en administración de propiedades
recorre las 13 lecciones, aprueba el examen, y sale sabiendo hacer el trabajo **y sabiendo
cuáles seis errores le pueden costar una demanda al empleador**.

---

## 2. El contrato de paso

SimEngine ya lo implementa. Esto es lo que tú tienes que respetar.

### 2.1 Los seis tipos

| Tipo | Qué pide | Dónde se guarda | Campo de id |
|---|---|---|---|
| `do` | Hacer algo real en el producto | `afStore.checklist` vía `afMark()` | `checklistId` |
| `decide` | Elegir entre opciones, una correcta | `afStore.scenarios` | `scenarioId` |
| `verify` | Leer una fuente y señalar lo que falla | `afStore.reviews` | `reviewId` |
| `reconcile` | Cuadrar varias fuentes a la vez | `afStore.reconciles` | `reconcileId` |
| `compose` | Escribir el texto que se enviaría | `afStore.composes` | `composeId` |
| `triage` | Ordenar una cola por prioridad | `afStore.triages` | `triageId` |

Los cinco últimos escriben **sólo** con `afRecordAnswer(bucket, id, payload)`. El payload
lleva `correct` (o `passed` en `compose`), la respuesta dada y lo necesario para repintar
el feedback tras un F5. `afLessonStepStatus()` ya lee esa forma; no la cambies.

### 2.2 El bloque `walk`

```js
walk: {
  target:     'CSS selector' | Element | function,   // a qué apunta el anillo
  text:       'string' | function,                   // recomputado en cada repintado
  example:    'string' | function,                   // opcional, plegable
  setup:      function,                              // deja la app en la pantalla correcta
  tour:       [{target, text}],                      // mini-tour tras completar el paso
  pauseText:  'string' | function,                   // pausa explicativa + Continue
  skipClick:  bool,                                  // explicar en vez de exigir clic
  nextAction: function                               // qué corre el botón Next
}
```

**Regla dura de SimEngine, y es fácil de incumplir sin notarlo:** el botón *Try It* sólo
aparece si **todos** los pasos de la lección llevan `walk`. Una lección con 6 de 7 pasos
guiados pierde el guiado entero, en silencio. Auditalo por lección, no por paso.

`text` como función es lo que hace que el guiado narre el estado vivo. Úsalo cuando lo
que el alumno ve puede diferir de lo que el texto asume — por ejemplo, si escribió mal
un filtro, el texto debe decírselo en vez de callar mientras la tabla sale vacía.

`setup()` deja la app donde tiene que estar. **`setup()` no puede calificar**: no llama a
`afMark()` ni a `afRecordAnswer()`, ni directa ni indirectamente. Si lo hace, el alumno
aprueba por navegar, que es exactamente lo que este proyecto lleva tres prompts evitando.

### 2.3 `effect()` — la detección de paso rancio

El 1b construyó `afStaleSteps()` y dejó el dato para aquí. Todo paso `do` cuya acción deje
huella en `afDemo` declara:

```js
effect: function () { /* → true si la consecuencia visible sigue presente */ }
```

Ejemplo: el paso que registra un pago devuelve `true` si existe ese asiento en
`afAllLedgerEntries()`. Tras un F5 el asiento se fue —el sandbox vive en memoria— pero
el paso sigue marcado, y el banner ofrece rehacerlo.

Un paso `do` que sólo navega **no lleva `effect()`**: no hay nada que revertir.

---

## 3. Las 13 lecciones

De mecánica a juicio, que es la progresión de los otros dos módulos. La columna de
anclajes cita el §6 del 2/3 **por id**.

### L1 · Orientation: properties, units and reading occupancy
`do` × 4
Navegar el portafolio, abrir una propiedad, entrar a una unidad, leer el estado de
ocupación. Termina en `LEASE-REN-01` — el lease que vence en 47 días — para que la
primera lección ya plante que hay trabajo con fecha.
**Anclajes:** `LEASE-REN-01`

### L2 · The resident ledger: charges, payments and balances
`do` × 2 · `verify` × 1
Leer un ledger de doce meses. El `verify` da un ledger con **un asiento cuyo
`balanceAfter` no encadena** y pide señalarlo. Es la invariante M2 del 2/3 convertida en
ejercicio: quien no sabe que la columna de saldo es una cadena, no sabe leer un ledger.
**Anclajes:** un residente con historial largo, elegido en Fase A y anotado.

### L3 · Posting rent and applying late fees
`do` × 3 · `decide` × 1
Registrar un pago, ver moverse saldo y morosidad. El `decide`: un pago **parcial** llega
el día 6 y la política aplica mora desde el 4. ¿Se aplica sobre el total o sobre el saldo?
¿Se aplica siquiera? La respuesta sale de la política de cargos que Settings ya declara.
**Anclajes:** `DQ-01`

### L4 · Delinquency: reading the report and the collection ladder
`do` × 2 · `decide` × 2
Leer el reporte y trabajar la escalera. Los dos `decide` toman dos peldaños distintos —
uno de 12 días y uno de 45— y preguntan cuál es el **siguiente** paso correcto. Que la
respuesta cambie con la antigüedad es la lección entera.
**Anclajes:** `DQ-01` … `DQ-09`

### L5 · The leasing funnel: guest card → tour → application
`do` × 4
Mover una consulta por el embudo hasta solicitud. Mecánica pura y deliberadamente sin
juicio: la L6 llega inmediatamente después y necesita que el embudo ya se sepa mover.
**Anclajes:** guest cards en etapa `new` y `contacted`

### L6 · Fair Housing in writing ⚠️
`compose` × 1 · `decide` × 2
La primera lección que puede costar una demanda.

- El `compose` contesta a `GC-FH-01`, la consulta que pregunta si es buen sitio para niños
  y menciona que espera un bebé. La respuesta correcta **no** es amable-y-servicial: es
  describir la propiedad sin aludir a quién encajaría en ella.
- Un `decide` corrige el anuncio `GC-FH-02`, que ya trae la violación escrita.
- El otro `decide` presenta cuatro frases de anuncio y pregunta cuál es publicable.

Cubre estatus familiar, discapacidad y fuente de ingresos. **Ver §5 sobre exactitud legal.**
**Anclajes:** `GC-FH-01`, `GC-FH-02`

### L7 · Screening and adverse action (FCRA) ⚠️
`verify` × 1 · `compose` × 1 · `decide` × 1
- El `verify` lee el reporte de screening de `APP-FCRA-01` y localiza qué obliga a dar
  aviso y qué dato del reporte tiene que aparecer en él.
- El `compose` escribe el aviso de acción adversa. La rúbrica exige **nombrar la agencia**
  y decir que la agencia no tomó la decisión — omitirlo es la infracción.
- El `decide` usa `APP-FCRA-02`: marca de desalojo previo. ¿Negativa o aprobación
  condicionada? La respuesta correcta es la condicionada, y el porqué importa.
**Anclajes:** `APP-FCRA-01`, `APP-FCRA-02`

### L8 · Assistance animals vs. pets ⚠️
`decide` × 2 · `compose` × 1
La confusión más frecuente del puesto. `APP-ADA-01` pide un animal de asistencia en una
propiedad sin mascotas; `RES-PET-01` tiene una mascota real con `petRent` legítimo. El
contraste **es** la lección: la respuesta correcta no es "todo animal es gratis", es saber
cuál de los dos casos lo es y qué se puede preguntar en cada uno.
El `compose` contesta a la solicitud de acomodo.
**Anclajes:** `APP-ADA-01`, `RES-PET-01`

### L9 · Move-in: lease, deposit and checklist
`do` × 4 · `verify` × 1
Generar el lease, firmarlo con la firma nativa simulada, cobrar el depósito, correr el
checklist. El `verify` compara el lease generado con la solicitud aprobada y busca la
discrepancia — renta, fecha o depósito.
**Anclajes:** una solicitud aprobada de Fase D

### L10 · Maintenance: request → order → vendor → invoice ⚠️
`do` × 3 · `decide` × 2
Despachar una orden completa. Los dos `decide` son las dos advertencias que el 2/3 dejó
puestas: `WO-INS-01` (proveedor con seguro vencido) y `WO-ENTRY-01` (entrada a unidad
ocupada sin aviso). En los dos casos el producto **deja continuar** — la lección es que
el alumno sepa que no debe.
**Anclajes:** `WO-INS-01`, `WO-ENTRY-01`

### L11 · Move-out: deposit accounting and the state clock ⚠️
`verify` × 1 · `reconcile` × 1 · `do` × 1
`LEASE-MO-01` salió hace 22 días. El `reconcile` cuadra depósito retenido, daños
documentados, renta impagada y devolución, y tiene que dar al centavo. El `verify` mira
el calendario contra el plazo del estado. Pasarse convierte el depósito en penalización,
y ese número también se calcula.
**Anclajes:** `LEASE-MO-01`

### L12 · Owner statements and the trust boundary ⚠️
`verify` × 1 · `decide` × 2
- El `verify` revisa `STMT-01`, el estado en borrador con una partida mal clasificada.
- Un `decide` sobre `OWN-TRUST-01`: el draw solicitado excede el saldo disponible sin
  tocar depósitos. Autorizar, reducir o rechazar.
- El otro `decide` presenta cuatro movimientos entre cuentas y pregunta cuál cruza la
  frontera fiduciaria.
**Anclajes:** `STMT-01`, `OWN-TRUST-01`

### L13 · Capstone: the Monday morning queue
`triage` × 1 · `decide` × 2
Nueve cosas esperando: una fuga con agua corriendo, un moroso de 45 días, una consulta de
renta de hace dos días, un estado de propietario por enviar, un aviso de acción adversa
pendiente, un lease por renovar, un depósito con el reloj corriendo, una factura de
proveedor y un correo de un residente enfadado.

El `triage` los ordena. **La clave no es la urgencia: es qué tiene un reloj legal
corriendo.** Los dos `decide` obligan a justificar dos posiciones del orden.
**Anclajes:** todos los anteriores. Es lo que hace de capstone.

---

## 4. El examen

**Blueprint por categoría**, no lista fija — así el banco puede crecer sin tocar la
estructura:

```js
const AF_EXAM_BLUEPRINT = [
  { category: 'compliance', count: 8 },   // FH, FCRA, animales, plazos, fiduciaria
  { category: 'ledger',     count: 4 },   // verify sobre un ledger o un estado
  { category: 'numeric',    count: 3 },   // aritmética con tolerancia declarada
  { category: 'judgment',   count: 6 },   // decide
  { category: 'written',    count: 3 }    // compose contra rúbrica
];
const AF_EXAM_PASS_PCT = 0.8;
```

Reglas:

1. **24 ítems, 80% para aprobar.** Un tercio del examen es cumplimiento, porque es un
   tercio de lo que hace contratable al alumno.
2. El banco tiene **al menos el doble** de ítems por categoría que el blueprint pide.
3. **`shuffleSalt` es la única excepción admitida a la prohibición de `Math.random()`**,
   y se genera **una sola vez por alumno**, se guarda en `afStore.shuffleSalt` y a partir
   de ahí el barajado es determinista: `afMulberry32(afHashString(salt + itemId))`.
   Recargar a mitad de examen no puede repartir un examen distinto.
4. El examen usa **entidades propias** (`AFC_EXAM_*`), no los anclajes de las lecciones.
   Examinar sobre el caso que se acaba de practicar mide memoria, no criterio.
5. Cada ítem lleva su explicación, y **se muestra al terminar, nunca antes**.
6. `afStore.exam` guarda intento, respuestas, nota y duración. La duración se mide con
   `Date.now()` — el 1/3 lo admite explícitamente y es el único uso permitido del reloj.
7. Reintentar rebaraja con el mismo salt: mismos ítems, distinto orden. Se aprende del
   contenido, no de la posición.

---

## 5. Exactitud legal — léelo antes de escribir una sola lección

Cinco de las trece lecciones enseñan obligaciones legales reales. Un simulador que las
enseña mal es peor que uno que no las enseña: produce confianza equivocada.

**Reglas de contenido, sin excepción:**

1. **Cada afirmación legal lleva su cita** en el texto de la lección: la ley, el
   reglamento o la guía. No "es ilegal", sino qué norma y de dónde.
2. **Toda regla estatal nombra su estado.** El portafolio es de Texas. Si la lección
   compara con otro estado, lo dice; si la regla es federal, lo dice.
3. **Verifica antes de afirmar.** No copies datos de los documentos de análisis de este
   proyecto sin comprobarlos, incluidos los de los prompts anteriores.
   **Dos puntos concretos que tienes que confirmar y no dar por buenos:**
   - **El aviso de entrada.** El análisis inicial lo describió como *"lo que exige el
     estado"*. Texas **no** tiene el mismo régimen que, por ejemplo, California, y en
     muchos casos la obligación nace **del contrato de arrendamiento**, no de un estatuto.
     Confírmalo. Si resulta ser contractual, la L10 tiene que enseñarlo así —y esa
     distinción es *más* valiosa que la versión simplificada, porque es la que evita que
     el VA cite una ley que no existe.
   - **El plazo de depósito de Texas.** Confirma el plazo, desde cuándo cuenta, qué
     condiciones lo modifican y qué penalización acarrea incumplirlo. Cita la sección.
4. **Aviso en la interfaz.** Las cinco lecciones marcadas ⚠️ y el examen llevan una nota
   visible: es material de formación, no asesoría legal; las normas cambian y varían por
   estado; ante un caso real se consulta al broker o al abogado de la administradora.
   Una línea, en el patrón de aviso que el módulo ya usa. Sin dramatismo y sin esconderla.
5. **Si una fuente no te resulta verificable, no inventes la regla.** Reformula el ítem
   para que enseñe el principio sin afirmar un número que no puedes sostener, y **anótalo
   en el informe** para que lo revise una persona.

---

## 6. La calificación de lo escrito

`compose` no se califica con un modelo. Se califica con **predicados deterministas**, por
la misma razón que todo lo demás en este módulo lo es: el mismo texto tiene que dar la
misma nota hoy y en seis meses.

Copia la forma que ya funciona en Qualia (`QZ_RUBRIC_CHECKS`, `qualia-app.js`):

```js
const AF_RUBRIC_CHECKS = {
  namesAgency: function (text, ctx) { /* … */ },
  ...
};
```

Cada ítem de `AF_COMPOSE_ITEMS` lleva:

```js
{
  id, anchorId, label, instruction, placeholder,
  thread: [ /* el contexto que el alumno está contestando */ ],
  rubric: [ { check: 'namesAgency', label: '…', why: '…' } ],
  passMark: 5      // cuántos checks hay que cumplir
}
```

**El campo `why` no es adorno.** Es lo que el alumno lee cuando falla un check, y es
donde de verdad ocurre el aprendizaje. Escríbelo como se lo explicarías a alguien que
acaba de cometer el error: qué pasa si lo mandas así, no qué regla incumpliste.

Dos clases de check, y las dos hacen falta:

- **Positivos** — lo que tiene que estar. *Nombra la agencia de crédito. Da una fecha
  concreta. Identifica la unidad.*
- **Negativos** — lo que no puede estar. *No alude al estatus familiar. No promete una
  fecha que no está confirmada. No cobra depósito por un animal de asistencia. No incluye
  el número de la seguridad social.*

Los negativos son los que enseñan cumplimiento, y son los que más se olvidan.

Prueba cada check contra **tres textos**: uno que lo cumple, uno que no, y uno ambiguo.
Un check que da `true` con cualquier cosa no está calificando nada.

---

## 7. Reglas que siguen vigentes

- **`afRecordAnswer()` y `afMark()` son los únicos escritores de nota.** Al terminar,
  cada uno de los cinco buckets sigue apareciendo escrito en **un solo sitio**.
- `setup()` no califica, ni directa ni indirectamente.
- Cero `Math.random()` salvo la generación única de `shuffleSalt`.
- Cero `new Date()` salvo la duración del examen.
- `grep -n localStorage AppFolio/*.js` → sigue en 3 líneas reales.
- Ninguna clave nueva en `afStore`.
- Todo lo del curso lleva `training: true` y se filtra con `afShowsTraining()`.
- `?demo=1` sigue sin mostrar una palabra del curso.
- Cero tipo D · sin `!important` · sin estilos inline · cero red.
- Interfaz y comentarios en inglés.
- **Cero huérfanos:** todo id que una lección cite tiene que abrir.

---

## 8. Batería de pruebas

**Currículum**

1. Las 13 lecciones abren, recorren sus pasos y se completan
2. **Cada lección: todos sus pasos llevan `walk`** — si no, *Try It* desaparece en silencio
3. Todo `checklistId`, `scenarioId`, `reviewId`, `reconcileId`, `composeId` y `triageId`
   es único en todo el módulo
4. Todo anclaje citado por una lección resuelve y abre
5. `afResetLesson()` limpia los ítems de esa lección y de ninguna otra
6. Terminar la L13 marca el curso completo

**Separación — la prueba que este proyecto existe para pasar**

7. En sandbox, recorrer las 13 lecciones **sin entrar en modo lección**: contestar,
   escribir, ordenar → `afStore` sigue vacío en los seis buckets
8. En modo lección, lo mismo → se registra y persiste
9. Ningún `setup()` escribe nota: instrumenta `afMark` y `afRecordAnswer` con un contador,
   corre los 13 `setup()` de cada primer paso, el contador sigue en cero
10. `grep` de cada bucket → escrito en un solo sitio, dentro de `afRecordAnswer`

**Paso rancio**

11. Completar un paso `do` con `effect()`, F5, volver a la lección → el banner ofrece
    rehacerlo
12. Rehacerlo lo deja verde otra vez
13. Un paso `do` sin `effect()` nunca se marca como rancio

**Examen**

14. El blueprint se cumple: 24 ítems, con el reparto por categoría exacto
15. Cada categoría tiene al menos el doble en el banco
16. Recargar a mitad de examen → mismos ítems, mismo orden
17. Dos alumnos con distinto `shuffleSalt` → distinto orden, mismo contenido
18. 80% aprueba, 79% no
19. Las explicaciones sólo aparecen al terminar
20. Reintentar rebaraja sin cambiar los ítems

**Compose**

21. Cada check probado con cumple / no cumple / ambiguo
22. Ningún check da `true` con texto vacío
23. Cada `why` está escrito y se muestra al fallar

**Legal**

24. Las cinco lecciones ⚠️ y el examen muestran el aviso del §5.4
25. Cada afirmación legal lleva su cita y nombra su estado cuando aplica
26. Los dos puntos del §5.3 —aviso de entrada y plazo de depósito— están verificados y
    anotados en el informe con su fuente

**Regresión**

27. `afAuditIntegrity()` → 0 · `afAuditMoney()` → 0
28. Dos cargas → mismo hash del catálogo
29. `?demo=1` limpio · `grep afDemoAction` ≤ 8 · cero controles muertos
30. Consola limpia en las 11 secciones, las 13 lecciones, el examen y los tres modos
31. `git diff assets/ index.html Docusign/ Quialia/` → vacío

---

## 9. Criterios de aceptación

**Currículum**

- [ ] 13 lecciones completas, cada una con **todos** sus pasos con `walk`
- [ ] Los seis tipos de paso en uso, con el reparto del §3
- [ ] Todo id de paso es único; todo anclaje citado abre
- [ ] Los pasos `do` con huella declaran `effect()`; el banner ofrece rehacer

**Examen**

- [ ] 24 ítems por blueprint, 80% de corte, banco al doble
- [ ] `shuffleSalt` generado una vez, barajado determinista a partir de ahí
- [ ] Entidades propias, no los anclajes de las lecciones
- [ ] Explicaciones sólo al terminar

**Calificación**

- [ ] `afRecordAnswer()` y `afMark()` siguen siendo los únicos escritores
- [ ] Ningún `setup()` califica
- [ ] Cada check de rúbrica probado con tres textos
- [ ] Cada `why` escrito y visible al fallar

**Legal**

- [ ] Cada afirmación legal citada y con su estado
- [ ] Los dos puntos del §5.3 verificados, con fuente, en el informe
- [ ] El aviso del §5.4 en las cinco lecciones ⚠️ y en el examen

**Contrato**

- [ ] 3 líneas de `localStorage` · ninguna clave nueva en `afStore`
- [ ] Cero `Math.random()` salvo `shuffleSalt`; cero `new Date()` salvo duración
- [ ] `?demo=1` limpio · cero tipo D · sin `!important` · sin estilos inline
- [ ] Las 31 pruebas pasan · consola limpia · `git diff` limpio fuera de `AppFolio/`

---

## 10. Qué entregar

Un commit por bloque de lecciones (L1–L5, L6–L8, L9–L13, examen), cada uno con sus
pruebas en verde. Y un informe con:

1. **Las dos verificaciones legales del §5.3**, con la fuente de cada una y qué acabó
   enseñando la lección. Es lo primero que va a revisar una persona.
2. Cualquier ítem que hayas reformulado por no poder sostener un dato (§5.5).
3. Los anclajes nuevos que hayas tenido que añadir al catálogo, y por qué ninguno de los
   catorce servía.
4. La tabla de checks de rúbrica con su tasa de acierto en los tres textos de prueba.
5. Dónde te obligó este documento a elegir sin decirte cómo.

**Pregunta antes de seguir si:** un anclaje del §6 del 2/3 no soporta la lección que
tenía asignada; necesitas una clave nueva en `afStore`; una verificación legal contradice
lo que dice un prompt anterior — **si eso pasa, gana la ley, y lo dices**; o algo te
obliga a tocar `assets/`, `index.html`, `Docusign/` o `Quialia/`.

---

## 11. Qué queda cuando esto termine

El cuarto test drive del repositorio, y el único que cubre **renta y administración** —
donde está la mayor demanda de VA hispanohablante.

Cierra además el hueco que el análisis identificó al principio: `roles/leasing-coordinator.html`
enseña hoy el flujo `inquiry → screening → fair housing → decisión → move-in` **sin el
sistema donde ocurre**. Con esto, el Case Simulator describe el trabajo y AppFolio es
donde se hace.

Y las seis franjas de riesgo —Fair Housing, FCRA, animales de asistencia, plazos de
depósito, contabilidad fiduciaria y aviso de entrada— pasan a ser practicables. Ninguna
lo era en ningún módulo del repositorio antes de este documento.
