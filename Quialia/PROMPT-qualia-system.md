# PROMPT MAESTRO — Qualia: separar el sistema del curso, y hacerlo usable

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Quialia/PROMPT-qualia-system.md`".
>
> Segundo de la serie de Qualia. El primero (`PROMPT-qualia-shell.md`) construyó la fachada
> visual de las seis secciones de Core y **declaró explícitamente que no debía funcionar**:
> *"El objetivo NO es funcionalidad… un showroom: todo se ve, todo se recorre, nada se guarda."*
>
> **Éste revierte esa decisión.** Donde los dos documentos choquen, manda éste.

---

## 0. Objetivo

Trabajas **exclusivamente** en `Quialia/`. No toques `Docusign/`. No toques `assets/`.

Hoy el módulo tiene dos problemas que se refuerzan entre sí:

1. **No se puede usar.** Sólo existen **3 órdenes** (`ORD-2026-1483`, `-1512`, `-1398`) más una
   cuarta escondida para el examen. No se puede crear una orden, ni añadir una parte, ni un
   documento, ni una tarea, ni un contacto, ni un recibo. 41 controles de la fachada y 17 de las
   30 páginas del expediente responden con un toast.
2. **El curso y el producto son la misma cosa.** Un solo almacén guarda progreso y datos, y
   **navegar califica**: abrir la pestaña Tasks sólo para mirar marca un paso de lección.

Estado medido hoy:

| Métrica | Valor |
|---|---|
| Órdenes en `QZ_ORDERS` | **3** (+1 de examen, fuera del array) |
| Números de orden citados en `qualia-shell-data.js` | **28** |
| → de ellos, inexistentes y pintados en gris | **~24** |
| Usos de `.qzs-dim` en `qualia-shell.js` | 34 |
| Controles de la fachada que sólo lanzan un toast (`qzShellAction`) | **41** |
| Páginas del rail del expediente sin vista (`qzCoreStub`) | **17 de 30** |
| Llamadas a `qzMark()` desde el producto | **35** |
| Lecciones · Escenarios · Reviews · Reconciles · Composes | 14 · 24 · 6 · 4 · 2 |
| Banco del examen | 24 ítems para un blueprint de 20 |
| Estilos inline (`qualia-app.js` + `qualia-shell.js`) | 16 + 11 — ya está limpio |

Al terminar, un alumno debe poder **abrir Qualia y trabajar** —crear una orden, cargarla,
editarla, cerrarla— sin que nada de eso toque su expediente académico; y **abrir una lección**
y que el curso siga calificando exactamente igual que hoy.

---

## 1. Las seis decisiones ya tomadas

**Decisiones del cliente. No las vuelvas a plantear.**

1. **El estado del producto vive en memoria. F5 borra.** Se crea `qzDemo`, y `qzStore` se queda
   **sólo** con el progreso académico. Mismo modelo que el módulo Docusign.
2. **Conmutador Sandbox / Lección, visible en la topbar.** Misma aplicación, dos modos.
3. **Un solo mundo, todo editable — y las lecciones se reparan solas.** El alumno puede editar
   incluso las 3 órdenes del currículum. Abrir o reiniciar una lección restaura sus órdenes a
   estado de fábrica automáticamente.
4. **Catálogo de ~60 órdenes de fondo con detalle completo**: partes, documentos, tareas,
   vendors, accounting y timeline coherentes. Se abren y se trabajan como las reales.
5. **Se construyen las 17 páginas del rail.** Las cuatro familias, sin excepción.
6. **La separación es de estado + conmutador**, no de puertas de entrada. `index.html` no cambia.

---

## 2. Qué no se toca

| Archivo / símbolo | Por qué |
|---|---|
| `Quialia/qualia-data.js` | Currículum calificado. **Congelado.** La Fase F es la única vía para ampliarlo. |
| `QZ_LESSONS`, `QZ_SCENARIOS`, `QZ_REVIEWS`, `QZ_RECONCILES`, `QZ_COMPOSES`, `QZ_EXAM_*` | Currículum y calificación |
| `assets/js/sim-engine.js`, `assets/css/sim-engine.css` | Motor compartido con Docusign. Se **usa**, no se edita. |
| `Quialia/qualia-tour.js` | Tour guiado |
| `Docusign/` completo | Otro módulo |
| `QZ_CHECKLISTS`, `QZ_CHECKLIST_TAB` | Contrato de los pasos de lección |
| Los identificadores de `qzMark()` | Siguen colgando de los mismos controles (cambia **cuándo** escriben, no **de dónde** cuelgan) |
| `[data-tab="…"]`, `[data-detab="…"]`, `[data-doc-action="…"]`, `[data-order-id="…"]`, `[data-task-id="…"]`, `[data-doc-id="…"]` | Selectores que los walkthroughs de las 14 lecciones apuntan. **No renombres ninguno.** |

### 2.1 La invariante que decide si el trabajo está bien hecho

Antes de empezar, comprueba y **anota** que esto es cierto — porque es la razón de que la
separación sea posible:

> La calificación vive enteramente en `qzStore.{checklist, scenarios, reviews, reconciles,
> composes, exam, lessonsDone}`. Lo que se escribe **sobre la orden** (`qzSetScalarOverride`,
> `qzSetPartyOverride`, `docStatus`, `taskStatus`, `notes`, `replies`) es siempre la
> *consecuencia visible* de una respuesta ya calificada, **nunca un insumo de la nota**.

Verificado en `qzRevSaveCorrection`, `qzRevFinalize`, `qzRecSaveRowValue` y `qzComposeGrade`.
Si en algún momento tu cambio hace que una nota dependa de `qzDemo`, **para y repórtalo**: has
roto la premisa entera del documento.

---

## 3. El principio: ningún control sin respuesta

Taxonomía heredada del módulo Docusign, que se adopta aquí igual:

- **A — Real.** Muta `qzDemo`, la UI cambia al instante, F5 lo borra.
- **B — Real con confirmación.** Modal → efecto real. Para lo destructivo.
- **C — Toast honesto.** Una sola frase, una sola vía. Para lo que necesitaría un backend.
- **D — Botón muerto. Prohibido.**

`qzShellAction()` y `qzCoreStub()` son hoy la vía C. Este documento mueve a A la mayoría de sus
41 + 17 llamadas. Lo que se queda en C está listado en la Fase E.

---

## Fase A — La separación (primero, y todo lo demás depende de ella)

### A.1 Dos almacenes

Crea `qzDemo`, en memoria, con su `qzDefaultDemo()`, y **muévele** estas cinco claves que hoy
viven en `qzStore`:

| Clave | Qué guarda |
|---|---|
| `overrides` | Ediciones de Data Entry y correcciones de Review |
| `docStatus` | Pending / Received / Reviewed por documento |
| `taskStatus` | Estado de cada tarea |
| `notes` | La nota del panel lateral del expediente |
| `replies` | Respuestas escritas en los hilos |

Y añádele lo que las fases siguientes van a necesitar: `orders` (las creadas por el alumno),
`parties`, `documents`, `tasks`, `vendors`, `contacts`, `events`, `receipts`, `disbursements`,
`invoices`, `users`, `exceptions`.

`qzStore` se queda **exactamente** con: `checklist`, `scenarios`, `reviews`, `reconciles`,
`composes`, `exam`, `lessonsDone`, `checklistScoped`, `shuffleSalt`, `tourSeen`.

**Migración obligatoria.** Hay alumnos con un `qz_va_training_v2` guardado que contiene las cinco
claves viejas. `qzLoad()` debe **descartarlas en silencio** y no reventar con la forma antigua.
No cambies `QZ_LS_KEY` ni la forma de lo que queda.

**El botón "← Test Drive"** llama hoy a `qzResetProgress()`, que hace
`localStorage.removeItem(QZ_LS_KEY)` — es decir, **borra el progreso académico al salir**. Con
dos almacenes eso deja de tener sentido: salir debe soltar el sandbox (que muere solo de todas
formas) y **no** tocar el progreso. Corrige el `onclick` en `testdrive-qualia.html`.

Añade en su lugar un **"Reset sandbox"** explícito (tipo B) que devuelva la cuenta a fábrica sin
tocar una sola lección.

### A.2 El conmutador

`qzMode`: `'sandbox'` | `'lesson'`. Vive en `qzState` (no se persiste: cada carga empieza donde
diga la regla de abajo).

- **Visible en la topbar**, junto al avatar. Dice en qué mundo está el alumno y por qué importa:
  en Sandbox nada cuenta para el curso.
- **Abrir una lección conmuta automáticamente a `lesson`.** El alumno nunca debe descubrir a
  mitad de una lección que su trabajo no se estaba contando.
- **Salir de la lección vuelve a `sandbox`.**
- Conmutar a mano es tipo A y no pide confirmación: no destruye nada.
- En `?demo=1` el conmutador **no se muestra** y el modo es `sandbox` fijo, por la misma razón
  que hoy se oculta el bloque de Training: un stakeholder debe ver sólo Qualia.

### A.3 `qzMark()` deja de calificar por navegar

Hoy hay **35 llamadas**, y seis de ellas cuelgan de pura navegación
([qualia-app.js:1180-1185](qualia-app.js)):

```js
if (tab === 'dataentry') { qzMark('de-property'); }
else if (tab === 'tasks')      qzMark('tasks-open');
else if (tab === 'workflow')   qzMark('workflow-view');
else if (tab === 'vendors')    qzMark('vendors-open');
else if (tab === 'closing')    qzMark('closing-open');
else if (tab === 'accounting') qzMark('accounting-open');
```

Más `qzOpenOrder` → `orders-open`, `qzTopSearch` → `orders-search`, `qzDeTab` → `de-*`.

**La regla:** `qzMark()` sale por la puerta sin escribir nada cuando `qzMode !== 'lesson'`.
Un `return` al principio de la función, **no** 35 ediciones repartidas.

**Cuidado con dos cosas:**

- `qzNotifyStepDone()` y `SimEngine.stepCompleted()` cuelgan de `qzMark`. Si el guard corta
  demasiado arriba, el walkthrough deja de avanzar. Comprueba que un walkthrough completo sigue
  encadenando sus pasos.
- `qzPracticeAction()` ([qualia-app.js:2940](qualia-app.js)) llama a ocho `qzMark()` seguidos.
  Averigua desde dónde se invoca antes de tocarlo.

### A.4 Auto-reparación de lecciones — la pieza nueva

`QZ_LESSON_UNDO` ([qualia-app.js:360](qualia-app.js)) existe pero **no sirve para esto**: es
quirúrgico —deshace exactamente cuatro mutaciones concretas (el teléfono del comprador, el
documento 3, la respuesta 3, la tarea 7)— y sólo se dispara al **reiniciar** una lección, nunca
al abrirla.

Con la decisión de "un solo mundo, todo editable", hace falta algo general:

```js
qzRestoreOrder(orderId)   // borra TODO el estado de qzDemo referido a esa orden:
                          // overrides, docStatus y taskStatus de sus documentos y tareas,
                          // notes, replies de sus hilos, y cualquier parte/doc/tarea que el
                          // alumno le haya añadido en Sandbox.
```

Reglas:

- **Se invoca al abrir una lección y al reiniciarla**, sobre las órdenes que esa lección cita.
- Las órdenes del currículum son **tres**: `ORD-2026-1483`, `ORD-2026-1512`, `ORD-2026-1398`,
  más `ORD-2026-EXAM`. Deriva la lista de las órdenes que cita cada lección **desde los propios
  pasos** (`step.orderId`) y desde los ítems que referencia, no de una lista escrita a mano:
  es el mismo criterio que ya usa `qzUndoItemWrite()`, que resuelve la orden desde los metadatos
  del ítem. Ese patrón es bueno — consérvalo y generalízalo.
- **Nunca toca las ~60 órdenes del catálogo ni las que creó el alumno.** Reparar la lección 3 no
  puede costarle al alumno la orden que estaba montando.
- `QZ_LESSON_UNDO` se queda para lo que no es una orden; lo que sí lo es pasa a `qzRestoreOrder`.
- **Avisa antes de reparar**, tipo B, sólo si hay algo que perder: *"Abrir esta lección devolverá
  ORD-2026-1483 a su estado original. Los cambios que hiciste en ella se perderán."* Si el alumno
  no ha tocado esa orden, no preguntes nada.

### A.5 La arruga que hay que documentar en la interfaz

Con el estado del producto en memoria, tras un **F5 a mitad de lección** el paso sigue marcado
como hecho (el progreso persiste) pero **su efecto visible se revierte** (el teléfono corregido
vuelve al original). Es el coste conocido del modelo y es aceptable.

No lo escondas: el banner de la lección debe poder decirlo cuando se detecte esa situación —
paso marcado, efecto ausente— y ofrecer rehacer la acción. **No** lo resuelvas persistiendo el
sandbox: la decisión 1 es firme.

---

## Fase B — El catálogo de órdenes

### B.1 El agujero que cierra

`qualia-shell-data.js` cita 28 números de orden en Accounting, Compliance, Calendar y Contacts.
`qzShellOrderCell()` ([qualia-shell.js:591](qualia-shell.js)) hace lo correcto y pinta en
`.qzs-dim` los que no existen — que hoy son **~24 de 28**. Es la mayor fuente de gris del módulo.

**Estos 24 identificadores deben existir al terminar** (están literalmente escritos en
`qualia-shell-data.js`, extráelos de ahí y verifícalos, no los copies de esta lista a ciegas):

```
1387 1391 1395 1399 1403 1407 1411 1415 1419 1423 1430 1434
1438 1441 1445 1449 1452 1456 1459 1462 1465 1468 1471 1427
```

### B.2 Cómo se construye

Archivo nuevo: **`Quialia/qualia-catalog-data.js`**, cargado después de `qualia-data.js` y antes
de `qualia-app.js`. Expone `QZC_ORDERS` (~60) y sus colecciones asociadas.

- **Generado, no escrito a mano.** Un generador determinista, sembrado con el id de la orden.
  **Cero `Math.random()`** (hoy sólo aparece en el salt del examen, y ahí se queda). La cuenta
  debe ser byte por byte idéntica en cada carga.
- **Detalle completo**, según la decisión 4: partes con roles reales, documentos con estado y
  tipo, tareas con vencimientos, vendors, líneas de accounting y un `stageIndex` coherente con
  su `closingDate`.
- **Coherencia interna obligatoria.** Una orden en `Post-Closing` no puede tener el Title
  Commitment en `Pending`. Una que cierra en tres días no puede estar en `Opened`. Las fechas se
  miden contra `QZ_TODAY` (`2026-08-12`), **nunca contra el reloj real**.
- **Coherencia externa obligatoria.** Los importes, fechas y partes que ya aparecen en
  `QZS_RECEIPTS`, `QZS_DISBURSEMENTS`, `QZS_INVOICES`, `QZS_EXCEPTIONS`, `QZS_CPLS`, `QZS_EVENTS`
  y `QZS_CONTACTS` para un id dado **mandan**: la orden generada se ajusta a ellos, no al revés.
  Una orden cuyo Accounting contradice el recibo que ya existe es peor que el gris que sustituye.

### B.3 La capa de acceso

Tres funciones cambian, y sólo tres:

```js
qzBaseOrder(orderId)  // QZ_ORDERS → QZC_ORDERS → qzDemo.orders → QZ_EXAM_ORDER
qzAllOrders()         // concatena las tres fuentes
qzGetOrder(orderId)   // igual que hoy, pero leyendo overrides de qzDemo
```

**El currículum gana siempre en colisión de id.** Una orden del catálogo no puede sombrear jamás
a `1483`, `1512`, `1398` ni a la del examen.

`qzDocsForOrder`, `qzTasksForOrder` y el filtro de `QZ_VENDORS` deben leer también las
colecciones del catálogo y de `qzDemo`.

### B.4 Lo que la lista de Orders necesita para aguantar 60 filas

Hoy la tabla pinta todas las filas de golpe con un solo filtro de texto. Con 60+ hace falta:

- Filtros por **estado**, **stage**, **tipo**, **oficina** y **rango de fecha de cierre**
- Ordenación por columna
- Paginación con tamaño de página
- El buscador de la topbar sigue funcionando **exactamente igual** — `qzTopSearch` es un paso
  calificado (`orders-search`) y tiene lógica especial para el walkthrough. Léela antes de tocarla.
- Los contadores de `qzOrdersStatsHTML()` pasan a contar sobre el conjunto completo

---

## Fase C — Crear y editar

### C.1 Nueva orden — el control insignia

`qzOrdersHTML()` ([qualia-app.js:1116](qualia-app.js)) tiene hoy:

```js
onclick="simToast('Training only, creating new orders is not available in this simulator.')"
```

Sustitúyelo por un asistente de cuatro pasos, tipo A:

1. **Tipo y propiedad** — Purchase / Refinance / Cash / Commercial · dirección, tipo de
   inmueble, descripción legal, condado
2. **Partes** — comprador, vendedor, agentes, prestamista, agente de cierre. Con libreta de
   direcciones desde `QZS_CONTACTS` (hoy 18 contactos que no se pueden usar para nada) y
   validación de email y teléfono
3. **Transacción** — precio, préstamo, fecha de cierre, número de título, agencia de settlement,
   oficina. Con validación: una fecha de cierre anterior a `QZ_TODAY` se rechaza; un préstamo
   mayor que el precio avisa sin bloquear
4. **Revisión** — resumen y crear

Al crear: entra en `qzDemo.orders`, aparece en la lista con `stageIndex: 0` (Opened), genera su
timeline y su juego inicial de tareas y documentos pendientes según el tipo, y **se abre**.

El botón **"Get a Quote"** de al lado se queda en tipo C: calcular primas de título reales
necesita las tarifas del estado, y eso es backend honesto.

### C.2 Dentro del expediente

| Qué | Dónde | Notas |
|---|---|---|
| **Añadir / quitar parte** | Data Entry → Parties | Hoy sólo se editan las 6 fijas. Rol, nombre, email, teléfono, con las mismas validaciones del asistente. Quitar es tipo B. |
| **Añadir documento** | Documents | Subir con `FileReader` **en memoria**, o elegir de una lista de tipos esperados. Hoy sólo hay "Upload" sobre los 15 predefinidos. |
| **Crear tarea** | Tasks | Título, responsable (de `QZS_USERS`), vencimiento, prioridad. Hoy sólo hay "Mark Complete". |
| **Contratar un servicio** | Marketplace / Vendors | Es lo que Marketplace *es* en el producto real. Hoy sólo hay "Check Status" sobre 8 vendors fijos. |
| **Iniciar un hilo** | Connect | Hoy hay 3 hilos fijos y sólo se puede responder. Elegir destinatarios entre las partes de la orden. |

**Ojo:** cada una de estas vistas contiene selectores que los walkthroughs apuntan
(`[data-doc-action]`, `[data-task-id]`, `[data-doc-id]`). Añadir controles no puede desplazarlos
ni ocultarlos.

### C.3 Cambiar de stage

El expediente avanza hoy sólo porque el dato lo dice. Añade el control de avanzar de etapa
(Opened → Title Processing → Closing Prep → Closing Date → Post-Closing → Closed), tipo B, con
las condiciones de salida visibles: *"3 documentos pendientes y 2 tareas abiertas."*

`qzWorkflowHTML()` declara ser read-only *"porque la estructura del workflow la configuran los
admins, no un VA"*. **Eso sigue siendo cierto y no se toca**: configurar el workflow y avanzar
un expediente por él son cosas distintas.

---

## Fase D — Las 17 páginas del expediente

`QZ_CORE_NAV` ([qualia-app.js:1198](qualia-app.js)) tiene 30 entradas y 17 sin `view`. Se
construyen **todas**, en este orden, porque el valor formativo no es el mismo.

### D.1 Las que el currículum ya exige — primero

Aquí hay una contradicción abierta entre curso y producto que hay que cerrar antes que nada:

| Lección | Se llama | Página que necesita | Existe hoy |
|---|---|---|---|
| 11 | *Reading a Title Commitment* | **Commitment** | ❌ |
| 12 | *Prorations & Payoff Arithmetic* | **Taxes & Prorations** · **Payoffs** | ❌ ❌ |

- **Commitment** — Schedule A (asegurado, importe, vesting, descripción legal) y Schedule B
  (excepciones y requisitos), cotejables contra el documento fuente. `documents/`
  ya tiene `title-commitment-1483.html` y `commitment-schedule-b-1512.html`.
- **Taxes & Prorations** — calculadora de prorrateo: impuestos anuales, fecha de cierre, método
  (365/360), reparto comprador/vendedor. Los números salen de la orden y **se recalculan solos**.
- **Payoffs** — saldo del payoff, interés diario, buena hasta la fecha, comisión de wire.
  `documents/payoff-statement-1398.html` ya existe y es la fuente contra la que cotejar.

### D.2 El Closing Disclosure completo — nueve secciones

Origination Charges (A), Did Shop For (C), Taxes & Fees (E), Prepaids (F), Escrow (G), Other
Charges (H), Lender Credits (J), Debits/Credits (K/M) y (L/N). "Did Not Shop For" (B) ya apunta a
`accounting`.

- Una vista compartida parametrizada por sección, **no** nueve renderizadores copiados.
- Líneas editables (descripción, importe, a quién se paga, quién paga) con subtotal por sección.
- Los totales suben al `qzAccountingHTML()` de la orden y **cuadran** con él.
- `QZ_ACCT_COLS` ya define las cinco columnas (`borrowerAt`, `borrowerBefore`, `sellerAt`,
  `sellerBefore`, `byOthers`). Úsalas; no inventes un modelo paralelo.
- **La lección 7 se llama "Vendors & Read-Only Accounting".** En modo `lesson`, el Accounting de
  las tres órdenes del currículum **sigue siendo de sólo lectura**. En Sandbox se edita. Esta es
  la única excepción de la Fase D y es obligatoria.

### D.3 Título y seguro

**CPL** (emitir, con `QZS_CPLS` de Compliance como fuente — hoy esos datos existen y no se
alcanzan desde la orden), **Policy Info & Rates** (tipo de póliza, importe asegurado, prima,
endosos) y **Final Policy**.

### D.4 El dinero de la orden

**Earnest & Commissions** (depósito de arras, quién lo tiene, comisiones de agentes y reparto) y
**Proceeds** (hoja de proceeds del vendedor, que cuadra con el CD).

---

## Fase E — La fachada, viva

41 controles pasan hoy por `qzShellAction()`. La mayoría se convierte en tipo A contra `qzDemo`.

| Sección | Pasa a tipo A |
|---|---|
| **Contacts** | New Contact · Edit contact · Import (pegar CSV) · Export (descarga en memoria) |
| **Calendar** | New Event · Edit event · Delete event (B) · vistas Día y Semana |
| **Accounting** | New Receipt · New Disbursement · New Invoice · Approve selected (B) · Start Reconciliation |
| **Reports** | Run Report — filtra las ~60 órdenes de verdad y pinta con `qzShellBarChartSVG` / `qzShellDonutSVG`, que ya existen |
| **Compliance** | Resolve · Reassign · Waive (B) sobre `QZS_EXCEPTIONS` · Issue CPL |
| **Admin** | Edit user · Disable user (B) · Add Office · New Template · Add Fee |

**Se queda en tipo C, y está bien así:** Invite User (necesita correo saliente), Configure
integration (necesita el tercero), Export PDF, Print, Schedule report, Generate File de Positive
Pay (formato bancario real), Email y Call de un contacto.

**Regla dura de la fachada, heredada del prompt anterior y todavía vigente:** nada de
`qualia-shell.js` llama jamás a `qzMark()` ni escribe en `qzStore`. Ahora sí escribe — **en
`qzDemo`, y sólo ahí**. Esa propiedad debe seguir siendo greppable en un solo vistazo.

---

## Fase F — Currículum: aditivo y sólo con autorización

**`qualia-data.js` está congelado y sigue congelado.** Si esta fase se aprueba, lo nuevo va en
`qualia-data-ext.js`, cargado después, y **sólo añade**:

```js
QZ_LESSONS.push(...);
QZ_EXAM_BANK.push(...);
```

`git diff Quialia/qualia-data.js` debe seguir vacío al terminar.

### F.1 Repórtalo antes de escribir nada

El blueprint pide 20 ítems: 6 source, 2 multi, 7 judgment, 2 numeric, 3 written.
El banco tiene 24: 7 source, **2** multi, 9 judgment, 3 numeric, **3** written.

`multi` (2 de 2) y `written` (3 de 3) están **agotados**: 5 de los 20 ítems son idénticos en cada
intento. Menos grave que en Docusign, pero real. Para que la aleatorización signifique algo cada
categoría necesita al menos el doble de su cuota. **Es decisión de producto: repórtala y espera.**

### F.2 Lecciones candidatas, sólo tras cerrar A–E

| # | Lección | Depende de |
|---|---|---|
| 15 | Abrir un expediente desde cero y dejarlo listo para título | C.1 |
| 16 | Montar el Closing Disclosure y cuadrarlo con el Accounting | D.2 |
| 17 | Emitir el CPL y la póliza | D.3 |

Cada una con sus propios identificadores de checklist y sus propios selectores. **No reutilices**
los existentes: son la superficie calificada del currículum congelado.

---

## 4. Reglas transversales

- **Cero red.** Ni `fetch`, ni XHR, ni WebSocket, ni fuentes remotas, ni CDN.
- **Cero dependencias.** Vanilla JS. Sin frameworks ni librerías.
- **Cero `Math.random()` nuevo.** El único que hay es el salt del examen, y ahí se queda.
- **Cero reloj real.** Todo se mide contra `QZ_TODAY`. Hay un incumplimiento existente que
  debes corregir de paso: `qzSendReply()` ([qualia-app.js:2101](qualia-app.js)) fecha las
  respuestas con `new Date()`, así que una respuesta aparece fechada hoy en un mundo congelado
  el 12 de agosto de 2026.
- **Ninguna escritura nueva a `localStorage`.** Al terminar, `grep -n localStorage Quialia/*.js`
  debe devolver sólo las líneas de `qzStore`.
- Nada de `sessionStorage`, IndexedDB, cookies ni `window.name`.
- Convenciones vigentes: renderizadores `qzShell<Sección>HTML()`, datos `QZS_*` (fachada) y
  `QZC_*` (catálogo), CSS con prefijo `.qzs-`, estado de fachada en `qzShellState`.
- Estilos en CSS, no inline. El módulo está en 27 inline entre los dos archivos: **que baje,
  nunca que suba.**
- Interfaz en inglés. Comentarios en inglés, explicando el **porqué**.
- Cada control nuevo es de tipo A, B o C. Ninguno queda mudo.

---

## 5. Plan de pruebas

**Fase 0, antes de escribir una línea:** corre las **14 lecciones** y el examen de principio a
fin y anota qué ítems del checklist quedan marcados al terminar cada una. Esa tabla es tu
criterio de no-regresión. Guárdala en el commit de la Fase 0. Sin ella no empieces la Fase A.

Después de **cada** fase, corre la batería completa:

**Separación** (lo primero que se rompe si algo va mal)
1. Modo Sandbox: abrir una orden, recorrer las seis pestañas, buscar, editar Data Entry →
   **`qzStore.checklist` sigue vacío**. Compruébalo en la consola, no de memoria.
2. Abrir la lección 1 → conmuta solo a modo Lección → repetir los mismos gestos → **ahora sí**
   marcan, y el walkthrough encadena sus pasos.
3. Salir de la lección → vuelve a Sandbox.
4. En Sandbox, editar `ORD-2026-1483` a fondo (partes, precio, descripción legal) → abrir la
   lección 3 → avisa, restaura, y la discrepancia que la lección pide detectar **está ahí otra vez**.
5. Esa restauración **no** tocó ninguna otra orden ni el trabajo del alumno en el catálogo.
6. F5 → el sandbox desaparece, el progreso de lecciones sigue intacto.
7. "← Test Drive" → **el progreso NO se borra**.
8. "Reset sandbox" → la cuenta vuelve a fábrica y el progreso sigue intacto.
9. `grep -n localStorage Quialia/*.js` → sólo `qzStore`.

**Producto** (sesión limpia, en Sandbox)
10. Orders: **cero celdas de orden en gris** en Accounting y en Compliance. Cada número abre su
    expediente.
11. Filtrar, ordenar y paginar 60+ órdenes; el buscador de la topbar sigue funcionando igual.
12. Crear una orden con los 4 pasos, incluida una fecha de cierre inválida que debe rechazarse →
    se abre → tiene timeline, tareas y documentos iniciales.
13. Añadir una parte, quitar otra, subir un documento, crear una tarea, contratar un servicio,
    abrir un hilo.
14. Avanzar el expediente de stage con condiciones de salida sin cumplir → avisa.
15. Recorrer **las 30 entradas del rail**: ninguna responde con un toast de "no disponible".
16. Prorrateo: cambiar la fecha de cierre → los números se recalculan.
17. Rellenar dos secciones del CD → los totales cuadran con el Accounting de la orden.
18. Emitir un CPL → aparece en Compliance.
19. Fachada: crear contacto, evento, recibo, desembolso y factura; ejecutar un reporte.
20. Clicar **cada** control de todas las pantallas: ninguno queda sin respuesta.

**No-regresión del curso**
21. Las **14 lecciones** completas, con sus walkthroughs encontrando cada objetivo.
22. Los ítems marcados al terminar cada lección son **exactamente** los de la tabla de Fase 0.
23. Ningún selector `[data-tab]`, `[data-detab]`, `[data-doc-action]`, `[data-order-id]`,
    `[data-task-id]` ni `[data-doc-id]` ha cambiado de nombre.
24. Lección 7: el Accounting de las órdenes del currículum sigue siendo de sólo lectura **en modo
    Lección**.
25. El examen abre, califica y reporta igual. El tour guiado funciona igual.
26. Un `qz_va_training_v2` guardado con la forma antigua carga sin errores.

**Técnico**
27. Consola limpia — cero errores y cero warnings — en todas las pantallas y en los tres modos
    (Sandbox, Lección, `?demo=1`).
28. Network: **cero peticiones** después de la carga inicial.
29. Dos cargas seguidas producen la misma cuenta byte por byte.
30. De 1280px a 1920px sin scroll horizontal en el body.
31. `?demo=1` no muestra el conmutador ni nada de Training.

---

## 6. Criterios de aceptación

### Separación
- [ ] `qzStore` contiene **sólo** progreso académico; `overrides`, `docStatus`, `taskStatus`, `notes` y `replies` viven en `qzDemo`
- [ ] Explorar el producto en Sandbox no marca ni un solo ítem de checklist
- [ ] Abrir una lección conmuta a modo Lección automáticamente
- [ ] Abrir o reiniciar una lección restaura sus órdenes, y **sólo** las suyas
- [ ] "← Test Drive" ya no borra el progreso; "Reset sandbox" existe y no lo toca
- [ ] Un store guardado con la forma antigua carga sin errores

### Capacidad
- [ ] Cero celdas de orden en gris en toda la aplicación
- [ ] ~60 órdenes con detalle completo, coherentes con los datos que ya existían en la fachada
- [ ] Se puede crear una orden, y añadir partes, documentos, tareas, servicios e hilos
- [ ] Las 30 entradas del rail tienen vista; ninguna responde `qzCoreStub`
- [ ] Existen Commitment, Taxes & Prorations y Payoffs — las tres que el currículum ya exige
- [ ] Los totales del Closing Disclosure cuadran con el Accounting de la orden
- [ ] De los 41 controles de la fachada, sólo quedan en toast los siete listados en la Fase E

### No-regresión
- [ ] Los 31 puntos del plan de pruebas pasan
- [ ] `git diff Quialia/qualia-data.js` → vacío
- [ ] `git diff assets/` → vacío
- [ ] `git diff Docusign/` → vacío
- [ ] Ningún selector de walkthrough renombrado
- [ ] Ninguna nota depende de `qzDemo`
- [ ] `grep -c 'style="'` en los dos JS ≤ 27

---

## 7. Fases y orden

| Fase | Contenido | Riesgo | Toca código calificado |
|---|---|---|---|
| 0 | Línea base: 14 lecciones + examen, con la tabla de ítems | — | No |
| A | La separación: `qzDemo`, conmutador, guard de `qzMark`, auto-reparación | **Muy alto** | Sí, el motor entero |
| B | Catálogo de ~60 órdenes + lista con filtros y paginación | Medio | Roza `qzTopSearch` |
| C | Crear y editar: nueva orden, partes, documentos, tareas, servicios | Medio | Sí, Data Entry y Documents |
| D | Las 17 páginas del expediente | Alto por volumen | D.2 roza la lección 7 |
| E | La fachada viva: 34 de 41 controles a tipo A | Bajo | No |
| F | Currículum aditivo — **requiere autorización explícita** | Alto | Aditivo, nunca edición |

Una fase por commit. La batería de §5 completa entre fases.

**Orden obligado.** A va primero y no se negocia: todas las demás escriben en `qzDemo`, que la
Fase A crea. B antes que C (una orden nueva entra en una lista que tiene que aguantarla) y antes
que D (las páginas del expediente leen del catálogo). E puede ir en paralelo a D si hace falta.

**La Fase D es la más grande del documento.** Divídela en sus cuatro sub-fases (D.1 a D.4) con un
commit cada una. Si hay que recortar algo, se recorta de D.3 y D.4 — pero **D.1 no es opcional**:
es la que cierra la contradicción entre lo que las lecciones 11 y 12 enseñan y lo que el producto
tiene.

---

## 8. Decisiones ya tomadas — no las vuelvas a preguntar

1. **El estado del producto vive en memoria. F5 borra.** `qzStore` es sólo progreso académico.
2. **Conmutador Sandbox / Lección visible en la topbar**, misma aplicación, `index.html` no cambia.
3. **Un solo mundo, todo editable.** Las lecciones restauran sus propias órdenes al abrirse.
4. **~60 órdenes de catálogo con detalle completo**, deterministas y coherentes con la fachada.
5. **Se construyen las 17 páginas del rail**, las cuatro familias.
6. `qualia-data.js` no se edita **nunca**. Lo nuevo se añade desde un archivo aparte.
7. Ningún selector de walkthrough se renombra. Los identificadores de `qzMark()` cuelgan de los
   mismos controles; sólo cambia **cuándo** escriben.
8. El Accounting de las órdenes del currículum sigue siendo de sólo lectura **en modo Lección**.
9. "Get a Quote", invitar usuarios, configurar integraciones, exportar PDF, imprimir, programar
   reportes y Positive Pay se quedan en toast honesto.
10. Vanilla JS, sin dependencias, sin red, sin reloj real, interfaz y comentarios en inglés.
11. Una fase por commit, con la batería de pruebas entre cada una.

**Sí pregunta si:** un cambio te obliga a renombrar un selector de walkthrough, a tocar
`qualia-data.js` o `assets/`, a añadir una dependencia, a hacer que una nota dependa de `qzDemo`,
o si al correr la línea base encuentras que una lección ya dependía de algo que este documento
manda cambiar. En ese caso **para y repórtalo antes de tocar nada**.
