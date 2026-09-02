# PROMPT MAESTRO — Qualia Core: cerrar la brecha de tareas y los últimos huecos

> Eres un agente de código trabajando sobre un simulador de entrenamiento. Lee este documento
> entero antes de tocar nada.
>
> **Versión de referencia:** commit `0bc9907`, medido el **2026-08-26**.
> Este documento reemplaza a cualquier `PROMPT-qualia-*.md` anterior. Si encuentras otro, ignóralo.
>
> Todos los números de aquí se obtuvieron **ejecutando el simulador y midiendo en la consola del
> navegador**, no leyendo el código. El §8 trae los scripts para reproducir cada cifra. Si una
> medición tuya no coincide con la de aquí, **la tuya manda**: vuelve a medir y dilo.

---

## 0. Qué es esto y cómo se ejecuta

Simulador de **Qualia Core** (software de title & escrow) para entrenar asistentes virtuales.
Sitio 100 % estático: JavaScript sin frameworks, sin build, sin red.

```
py -m http.server 5799          # desde la raíz del repo
http://localhost:5799/Quialia/testdrive-qualia.html
```

Si te redirige al login, ejecuta esto en la consola y recarga:

```js
localStorage.setItem('scc_session', JSON.stringify({ userId: 'maria' }));
```

**Trabajas sólo dentro de `Quialia/`.** No toques `AppFolio/`, `Docusign/` ni `assets/`.

Archivos:

| Archivo | Líneas | Qué es |
|---|---|---|
| `qualia-app.js` | 8036 | Núcleo: datos, enrutador, todas las pantallas del expediente |
| `qualia-shell.js` | 2398 | Secciones Contacts / Calendar / Accounting / Reports / Compliance / Admin |
| `qualia-data.js` | 2001 | **El curso.** Lecciones, escenarios, examen |
| `qualia-catalog-data.js` | 956 | Catálogo de órdenes |
| `qualia-shell-data.js` | 668 | Datos de las secciones del shell |
| `qualia.css` / `qualia-shell.css` | 3903 / 1584 | Estilos |
| `qualia-tour.js` | 131 | Tour inicial |

---

## 1. Reglas duras

### 1.1 No toques el curso

`qualia-data.js` **completo**, más `qzMark()`, `qzStore`, `qzSave()`, `qzLoad()`, `QZ_LS_KEY`,
`qualia-tour.js` y `assets/js/sim-engine.js`.

> **Excepción única, autorizada el 2026-08-27:** el bloque del ancla al principio de
> `qualia-data.js` (`QZ_ANCHOR`, `QZ_SHIFT_DAYS`, `qzShiftISO`, `QZ_TODAY`). Es el reloj, no
> el curso — ver §1.3. **Ni una lección, ni un escenario, ni un ítem del examen se tocaron:
> la prosa se desplaza en memoria al arrancar, y el archivo sigue diciendo lo que decía.**

Tres invariantes que deben seguir siendo ciertos al terminar:

1. `localStorage` contiene **una sola clave**, `qz_va_training_v2`, con **exactamente 10 campos**:
   `checklist, scenarios, reviews, reconciles, composes, exam, lessonsDone, checklistScoped,
   shuffleSalt, tourSeen, tourOptOut`. **Ningún dato de producto entra ahí.**
2. Los datos del producto viven **sólo en memoria** (`qzDB`). Al recargar, el mundo vuelve a
   estado de fábrica. Ya funciona: no metas persistencia.
3. Las 10 lecciones y el examen se completan igual que hoy.

### 1.2 Convenciones

- **Toda escritura pasa por la capa de datos**: `qzInsert / qzUpdate / qzRemove`, nunca mutando
  arrays a mano. Registra en `qzLogAudit` lo que el producto real auditaría.
- **Ningún dato dentro del renderizador.** Si un valor aparece en un template string y no viene
  de `qzList / qzFind`, está mal.
- **Ningún fallback literal.** El patrón `o.campo || 'Nombre Inventado'` está prohibido. Hoy hay
  **0** en el repo — no reintroduzcas ninguno. Un campo vacío se muestra vacío.
- **Ningún toast que mienta.** Un toast describe algo que ocurrió. Si no ocurrió nada, el control
  va deshabilitado con un `title` que explique por qué.
- **Cero estilos inline nuevos.** Todo a `qualia.css` / `qualia-shell.css`.
- El repo usa **CRLF**. Si editas con herramientas POSIX (`sed -i`, scripts), restaura los finales
  de línea o el diff saldrá con el archivo entero cambiado.

### 1.3 El reloj: el mundo se mueve con el alumno

Hasta el 2026-08-27 el simulador vivía en una semana fija y, tres meses después, el alumno
veía agosto de 2026 en su pantalla de noviembre. Ya no.

**Cómo funciona.** El dataset siempre estuvo escrito en relativo sin saberlo: cada fecha está
a una distancia fija del ancla, así que una orden que cerraba el `2026-10-11` era, literal,
*"cierra en 60 días"*. Basta un desplazamiento único para convertirlas todas:

```
QZ_ANCHOR     = '2026-08-12'   (un miércoles: la semana en que se escribió el dataset)
QZ_SHIFT_DAYS = semanas completas entre el ancla y hoy, x 7
QZ_TODAY      = QZ_ANCHOR + QZ_SHIFT_DAYS
```

**Semanas completas, no días.** El trabajo de title es de días hábiles: un desplazamiento
arbitrario pondría cierres en domingo y grabaciones en sábado. Así cada fecha conserva su día
de la semana y el "hoy" del simulador queda a **≤3 días** del real. Es un intercambio
deliberado.

**Dónde se aplica — cuatro superficies, todas cubiertas:**

| Superficie | Quién lo hace | Cuándo |
|---|---|---|
| Los datos (6.373 valores) | `qzShiftWorldTime()` | al hidratar, **antes** de construir el seed |
| La prosa del curso | el mismo barrido, sobre los objetos en memoria | al hidratar |
| Los 16 documentos (31 fechas) | `qzOpenDocFile()` — fetch, desplaza, sirve como blob | al abrirlos |
| Lo derivado (CSV, audit log, chips) | sale del dato ya desplazado | solo |

**Lo que NO se desplaza, y por qué:** los números de expediente. `ORD-2026-1483` se cita
**152 veces** en el curso y forma parte de las claves con que se guarda el progreso
(`de-property@ORD-2026-1483`). Moverlos borraría el avance de cualquiera que esté a media
formación. Un número de expediente lleva el año en que se abrió: es una etiqueta, no una
fecha. Las guardas de vecindad en `qzShiftDateText()` existen precisamente para que los
patrones de fecha nunca muerdan uno.

**Cómo se comprueba.** Abre el simulador con **`?selftest=1`**:

```
http://localhost:5799/Quialia/testdrive-qualia.html?selftest=1
```

17 comprobaciones, ninguna de ellas preguntando "¿sigue siendo 2026?" — que es la respuesta
correcta dos semanas después del ancla. Preguntan si cada fecha se movió **exactamente**
`QZ_SHIFT_DAYS` y si sigue trazando hasta lo que está escrito en el archivo. Funciona con
cualquier desfase distinto de cero.

Medido el 2026-08-27 (desfase de 14 días): **17/17 PASS** — 6.373 fechas de datos, 31 de 31
impresas en los 16 documentos, 28 menciones en prosa del curso, `localStorage` con 1 clave y
10 campos, consola limpia.

Verificado además en Node con el reloj falseado: a **2027-03-17** y a **2029-11-07** el
expediente `ORD-2026-1483` sigue viviendo 81 días entre apertura y cierre, sin una sola fecha
descolgada, y el miércoles sigue siendo miércoles.

---

## 2. Estado actual — esto YA ESTÁ HECHO, no lo rehagas

Tres rondas de trabajo previas dejaron el módulo en buen estado. Medido el 2026-08-26:

| | Estado |
|---|---|
| Errores de consola | **0** en 180 pantallas recorridas |
| Fallbacks literales en renderizadores | **0** (antes 19) |
| Filas de sólo lectura `qz-calc-row` | 25 (antes 103) |
| Páginas del expediente con controles editables | **34 de 38** |
| Basic Info | **27 controles editables** |
| Capa de datos | `qzDB` con `qzList/qzFind/qzInsert/qzUpdate/qzRemove/qzNextId/qzLogAudit` sobre 31 colecciones |
| Separación curso / producto | **Lograda.** `localStorage` sólo tiene progreso |
| Reset de fábrica al recargar | **Funciona** |

### 2.1 Las 4 páginas sin campos editables son correctas así

`cd-j` (totales derivados de la sección J), `preview-cd` y `preview-settlement` (previsualizaciones
de documento) y `review` (instrumento de entrenamiento, no una pantalla de Qualia).
**No las conviertas en formularios.**

### 2.2 Charges está completo

`chargeLines` es una colección real: **2.113 líneas repartidas en las 75 órdenes**, con esquema
`{ id, orderId, section, lineNo, description, payee, borrowerAt, borrowerBefore, sellerAt,
sellerBefore, byOthers }`. Tiene `qzChargeAdd / qzChargeSet / qzChargeDelete / qzChargeSort`, el
panel de **Payments**, y una regla de negocio correcta: una línea ya desembolsada no se puede
borrar, hay que anular el desembolso primero.

### 2.3 El volumen de datos es realista

| Colección | Filas | Órdenes cubiertas (de 75) |
|---|---|---|
| `tasks` | **2.633** (35,1 por orden) | 75 |
| `documents` | **2.479** (33,1 por orden) | 75 |
| `chargeLines` | 2.113 | 75 |
| `vendors` | 537 | 75 |
| `ledgerLines` | 520 | 73 |
| `titleExceptions` | 438 | — |
| `disbursements` | 338 | 58 |
| `receipts` | 181 | 73 |
| `threads` | 109 | 57 |
| `invoices` | 15 | **14** |
| `notes` | **0** | — |
| `messages` | **0** | — |

44 títulos de tarea distintos, 42 nombres de documento distintos, 17 responsables.

### 2.4 Anular dinero funciona

`qzVoidMoneyRecord(coll, id, reason)` exige una razón escrita de ≥ 5 caracteres, marca el registro
como `Void` y **publica un asiento inverso en el libro mayor** en vez de borrar el original. Está
bien hecho. Ver §4 D4 para el único problema que tiene.

---

## 3. Cómo funcionan las tareas en el Qualia real

Esto sale de las capturas en `Images-resourses/` y de la documentación pública de Qualia. Es la
referencia para el trabajo del §4.

### 3.1 Panel derecho de cada expediente

De `real-screenshots/core-charges-section-b.png` (captura auténtica del producto):

```
▾ TASKS   [0 / 0]
▌ You have not been assigned any tasks
  on this order
```

- Contador **`abiertas / total`** dentro de una caja con borde.
- El estado vacío es una tarjeta con **barra de acento a la izquierda**.
- **`assigned any tasks` es un enlace** (color teal). Es la puerta a la lista personal de tareas
  del usuario, a través de todos los expedientes.
- Orden del panel: **CHAT · TASKS · HELP · NOTES**.

### 3.2 Tasks es una página de primer nivel del expediente

Los wireframes muestran una **tira horizontal de 5 sub-pestañas** bajo la fila de expedientes
abiertos: en `wireframes/core-order-dashboard.webp` la primera es *Overview*; en
`wireframes/core-order-tasks.webp` la tercera es **Tasks**, resaltada con una píldora verde pálido.
No cuelga del rail izquierdo.

### 3.3 La página Tasks

De `wireframes/core-order-tasks.webp`:

- **Se titula con el nombre del workflow** — en el wireframe, *"Refinance"*. No dice "Tasks".
- Debajo del título, tres barras cortas de progreso segmentado.
- Tres botones arriba a la derecha: **Modify** (fantasma) · **Add Task** (gris carbón) ·
  **Add Task Group** (verde, primario).
- **Grupos = fases cronológicas**: Order Opening · Title · Pre-Closing · Payoff Tasks · Post-Closing.
- Cabecera de cada grupo: nombre · píldora de progreso · barra de progreso · botón de acción.
  El grupo **activo va tintado en verde con ★ rellena**; los inactivos en gris con **☆ hueca**;
  *Payoff Tasks* aparece tintado en azul y su botón es un **ojo tachado** — grupo oculto.
- **Cada fila lleva una franja de color a la izquierda según su estado**: verde las completadas,
  ámbar la atrasada. Columnas: nombre · una columna media · barra de estado · icono de acción
  (**ⓘ en las completadas, × en las abiertas**).

### 3.4 El modelo, según la documentación pública

- Tareas **contingentes**: se disparan por condición (se detecta HOA en la transacción → se añaden
  solas las tareas de HOA).
- Asignación **a individuos, a roles o a grupos**.
- *Assignment groups* con reparto **round robin** o por **carga equilibrada**.
- **Plantillas de workflow** por tipo de transacción y estado.
- Las tareas se agrupan **en orden cronológico por tipo de rol**.

### 3.5 Lo que NO se pudo verificar

A dónde lleva exactamente el enlace *"assigned any tasks"*, y cuáles son las sub-pestañas 2, 4 y 5
de la tira. Qualia difumina el texto de sus wireframes a propósito y `knowledge.qualia.com`
redirige a login. **Si una decisión depende de eso, para y pregunta** en vez de inventarlo.

> **Actualización 2026-08-27 — captura real aportada por el equipo.** El **logo es un botón**:
> abre una pantalla **Home** (migaja con icono de casita) con una tira de cinco chips —
> **Orders · Order Queue · Action Queue · Tasks · Notifications `46`**. Es decir, la cola
> personal de tareas **sí tiene casa en el producto**, y no es una pestaña del topbar.
> Implementado: `qzHomeHTML()` en `qualia-app.js`.
>
> Dos cosas que esa captura **no** resuelve:
>
> 1. **No es la tira del D8.** Aquella vive *dentro* de un expediente abierto
>    (`wireframes/core-order-dashboard.webp`: pestañas tipo navegador y luego *Overview* + 4
>    elementos difuminados). La de Home es de otro nivel. **D8 sigue bloqueado.**
> 2. **Qué llevan dentro `Order Queue` y `Action Queue`.** Se dejaron deshabilitados hasta que
>    se decidió construirlos el mismo 2026-08-27, y se hizo **derivando del dataset, no
>    imaginando el producto**: cada fila es un registro real de `qzDB`, alcanzable por la misma
>    navegación que el resto del simulador. Lo inferido es la **agrupación**, no los datos, y
>    así queda escrito en el comentario junto al código.
>
>    - **Order Queue** = expedientes abiertos que aún no han empezado el trabajo de título
>      (stage 0). Hoy: 9, de los que 7 llevan más de una semana parados — y la pantalla lo dice.
>    - **Action Queue** = lo que espera a alguien, agrupado por qué lo desbloquea: tus tareas
>      vencidas, documentos pedidos y no llegados, excepciones de Schedule B abiertas, CPLs sin
>      emitir y recibos sin depositar. Hoy suma 753 ítems en cinco bloques.
>
>    Si aparece una referencia real y agrupa distinto, **las filas sobreviven al cambio**; lo
>    único que no es cómo están ordenadas aquí.
>
> El topbar de esa captura (`Clear · Orders · Contacts · Calendar · Reports`) **contradice** a
> `real-screenshots/core-charges-section-b.png` — otro tenant, otra licencia o permisos
> distintos. Decisión tomada el 2026-08-27: **no se toca el topbar** con una sola captura de
> procedencia desconocida; Accounting, Compliance y Admin ya tienen pantallas y lecciones que
> dependen de ellas.

---

## 4. Los nueve huecos que quedan, medidos

### D1 — No existe una vista "Mis tareas" · **el más importante**

Hay **397 tareas abiertas** en el sistema. **142 están asignadas a `'You (VA)'`, repartidas en 25
expedientes.** No hay ninguna pantalla donde verlas juntas.

Peor: la **campana de notificaciones** es hoy la única superficie que agrega tareas entre
expedientes, y **no filtra por responsable** (`qzRenderBellDropdown` no menciona `assignedTo`).
Muestra las **397** abiertas de los 17 miembros del equipo como si todas fueran del alumno. Para un
simulador de entrenamiento eso es peor que no tener nada: enseña a un VA a tratar la cola del
equipo entero como propia.

**Qué construir:**

1. Una vista de tareas personales que liste, por defecto, las tareas abiertas asignadas al usuario
   actual, agrupadas en **Vencidas / Vencen hoy / Próximas**, con el expediente y su dirección en
   cada fila, y clic que abre el expediente en su pestaña Tasks (`qzGotoOrderTasks` ya existe).
2. Un conmutador **"Mis tareas" / "Todas"** para no perder la vista de equipo.
3. **Filtra la campana por responsable.** Debe mostrar 142, no 397.
4. Haz real el enlace del estado vacío del panel: donde hoy dice *"Nothing outstanding on this
   order."*, pon el texto del producto — *"You have not been **assigned any tasks** on this order"* —
   con **"assigned any tasks"** enlazando a la vista personal.

**Dónde colgarla — RESUELTO el 2026-08-27 (ver §3.5).** No es pestaña del topbar: vive en
**Home → Tasks**, la pantalla que abre el logo. Las tres puertas anteriores (campana → *View
All*, enlace *"assigned any tasks"* del panel, `qzGotoMyTasks()`) aterrizan ahí, así que no hay
dos caminos que mantener. La justificación está en el comentario de `qualia-app.js` junto a
`qzGotoHome()`.

### D2 — La página Tasks se desvía del producto en cinco puntos

Compara `qzTasksHTML` (en `qualia-app.js`) con §3.3:

| | Estado |
|---|---|
| Agrupada en las 5 fases reales | ✅ ya está |
| Barra de progreso y ★ por grupo | ✅ ya está |
| Botones *Add Task* / *Add Task Group* | ✅ ya están |
| **Título** | ❌ literal **"Order Tasks — Purchase · Standard Milestones"** en las 75 órdenes, incluidas las Refinance, Cash y Commercial. Debe llevar el nombre del workflow de la orden |
| Subtítulo | ❌ literal *"Assigned to Plano Escrow Team"* idéntico en todas |
| Botón **Modify** | ❌ no existe |
| Franja de color por estado en cada fila | ❌ no existe |
| Control de ocultar grupo (ojo tachado) | ❌ no existe |
| Origen de los grupos | ❌ **los 5 grupos están escritos a mano dentro del renderizador**, no se leen de `qzDB.taskGroups` (que ya contiene esos mismos 5). Por eso *Add Task Group* no puede producir un sexto grupo visible |

Empieza por el último: lee los grupos de la colección. Lo demás cae solo.

### D3 — Documentos abribles — **RESUELTO, la medición original estaba mal**

> **Corregido el 2026-08-27.** La cifra de “9 de 2.479 — 0,4 %” contaba únicamente `d.file` e
> **ignoraba por completo la capa de plantillas**. Medido en el navegador con el simulador
> cargado: **1.383 de 2.150 documentos (64 %) abren contenido** — 9 archivos estáticos más
> **1.374 renderizados por las 24 plantillas de `QZ_DOC_TEMPLATES`**, que inyectan los datos
> del expediente al que pertenecen. **Ninguna de las 75 órdenes baja del 25 %**; la media por
> orden es del 66 %. El criterio 7 del §8 ya estaba cumplido.
>
> Comprobado abriendo uno: `Purchase Agreement` de `ORD-2026-1471` sale con sus partes
> (David Vance / Rachel Green), su dirección, su descripción legal y su fecha ya desplazada.

**Cerrado del todo el mismo día.** Quedaban 584 documentos marcados Received/Reviewed que no
abrían nada — 18 tipos sin plantilla, encabezados por *Seller Disclosure Notice*, *Chain of
Title Abstract*, *Property Tax Statement* y *Judgment Search Results*. Se escribieron **las 18
plantillas que faltaban** (`QZ_DOC_TEMPLATES` pasa de 24 a 42 entradas), todas leyendo del
expediente al que pertenecen.

**Estado final medido: 2.150 de 2.150 documentos abren contenido. 100 %, en las 75 órdenes,
y cero recibidos sin nada detrás.**

Las nuevas no son relleno: la de *Judgment Search Results* cambia de texto cuando hay una
coincidencia posible de nombre y dice que eso no es un gravamen hasta confirmar identidad; la
de *Flood Certificate* distingue Zona X de Zona AE y avisa de que AE exige seguro antes de
fondear; la de *Repair Amendment* pone la cifra del crédito para que el alumno la contraste con
el settlement statement. Es material de examen, no decorado.

No escribas 2.470 archivos. Escribe **plantillas HTML parametrizadas** en `Quialia/documents/`
(ya hay 17 de ejemplo) y que el expediente inyecte sus propios datos al abrirlas. Objetivo: que al
menos **el 25 % de los documentos** de cada orden abran algo legible y coherente con esa orden.

### D4 — Anular dinero no se alcanza desde Accounting

`qzVoidMoneyModal` está bien implementado (§2.4) pero se invoca **desde un solo sitio**:
`qualia-app.js:5419`, el libro mayor del expediente. Las tablas de **Receipts, Disbursements e
Invoices** de la sección Accounting no tienen botón *Void*.

Es donde un contable de escrow anularía un recibo mal capturado. Cablea la acción que ya existe.

### D5 — `notes` y `messages` están vacías

`notes: 0` y `messages: 0`. El panel de Notas guarda lo que el alumno escribe, pero ningún
expediente llega con notas previas, y los **109 hilos de Connect no tienen ni un mensaje**: hay
conversación sin contenido.

Siembra notas en al menos 40 órdenes (lo que el equipo anotó antes de que llegara el alumno) y
mensajes reales en los hilos.

### D6 — Las facturas sólo tocan 14 de 75 órdenes

`receipts` cubre 73 órdenes, `disbursements` 58, `ledgerLines` 73. `invoices` se queda en **14**
con 15 filas. Súbelo al nivel de las demás.

### D7 — Controles que siguen siendo sólo un toast

| Control | Qué hace hoy |
|---|---|
| `Export` / `Export CSV` | Dice *"CSV export generated and downloaded"* y **no descarga nada** |
| `Export PDF` / `Print` | Llama a `window.print()` — aceptable |
| `Run Report` | Toast |
| `Schedule` | Toast |
| `Email` / `Call` | Toast — aceptable, son integraciones externas |
| `New <plantilla>` / `Configure <integración>` | Toast |

El de Export es el que miente. Genera un CSV real con `Blob` + `URL.createObjectURL`, o deshabilita
el botón. Las dos cosas valen; mentir no.

### D8 — Falta la tira de sub-pestañas del expediente

El producto real tiene una tira horizontal de 5 elementos dentro del expediente abierto (§3.2).
Aquí toda la navegación cuelga del rail izquierdo, y *"Order Tasks"* vive en el grupo **TASKS** del
rail — que en el producto real contiene Documents, Accounting, Marketplace y Connect, no una entrada
de tareas.

**Cambio de chasis, no lo hagas sin decidirlo explícitamente.** Sólo conoces 2 de los 5 elementos
(*Overview* y *Tasks*). Si lo abordas, pregunta antes por los otros tres.

### D9 — CRUD — **de 13 a 18 de 24 el 2026-08-27**

> Se añadió borrado a **Contact, User, Office, Fee y TaskGroup**, cada uno con la guarda que
> el producto real tendría — porque un borrado que siempre funciona enseña lo contrario de lo
> que un puesto de escrow necesita aprender:
>
> | Entidad | Se niega cuando… |
> |---|---|
> | User | es la cuenta con la que estás dentro. Si sigue nombrado en expedientes abiertos, avisa con el número y deja decidir |
> | Office | quedan usuarios asignados; los nombra en el rechazo |
> | TaskGroup | quedan tareas dentro; las cuenta |
> | Fee | nunca — pero no reprecia los expedientes que ya la llevan, y lo dice |
> | Contact | los derivados de una orden no se borran aquí, y la fila explica dónde sí |
>
> Nota para quien siga: la primera versión de la guarda de User protegía al “último Admin”.
> **En este tenant no existe el rol Admin** — son Escrow Officer, Title Examiner, Accounting,
> Closer, Processor, Virtual Assistant y Read Only — así que era una guarda contra una
> condición imposible. Peor que no tenerla: parece que protege algo.
>
> Faltan por cerrar: CPL, Folder, TitleException y Reconciliation.

### Estado original — CRUD incompleto en 14 de 24 entidades

Completas (C+U+D): Order, Party, Document, Task, Vendor, LedgerLine, ChargeLine, Thread, Event,
Exception.

Sin borrado ni anulación: **Contact, Receipt, Disbursement, Invoice, Office, Fee, User, CPL,
TaskGroup, Folder**. Sin nada: `TitleException`, `Reconciliation`.

Prioriza las tres del dinero — se resuelven cableando D4 — y luego Contact y User.

---

## 4b. La clase de bug que se encontró el 2026-08-27

Tres bugs distintos, **una sola causa raíz**: el simulador se probó siempre sobre los datos
escritos a mano del curso, que llevan **id numérico**, y nunca sobre las 71 órdenes generadas,
cuyos ids son **texto** (`t-6001`, `doc-7930`, `v-1029`, `th-606`).

| Bug | Síntoma | Alcance |
|---|---|---|
| Id sin comillas en handler inline | `qzToggleTaskStatus(t-6404, ...)` → `ReferenceError` | 13 sitios: 2.196/2.417 tareas, 1.930/2.150 documentos, 529/537 vendors, 106/109 hilos |
| `JSON.stringify(id)` dentro de atributo con comillas dobles | el atributo se cierra solo → handler sintácticamente inválido, el botón no hace nada | 5 sitios, toda la pestaña Vendors y el check de revisión en Closing |
| `hash >> 4` con hash sin signo | índice negativo → `undefined` | 37 personas llamadas *“Linda undefined”* |

Los tres, corregidos. Lo importante no son los bugs sino **cómo se encuentran**, porque volverán
a aparecer en cuanto alguien añada una pantalla:

```js
// Barrido estático: identificadores no definidos en cada handler inline de cada pantalla.
document.querySelectorAll('#qzRoot [onclick],#qzRoot [onchange]').forEach(el => { ... });

// Barrido dinámico: pulsar TODO sobre órdenes GENERADAS, no sobre las 4 del curso.
new Function(el.getAttribute('onclick'));   // ¿siquiera parsea?
el.click();                                 // ¿lanza?
```

Medición del 2026-08-27 tras las correcciones: **81 pantallas, 942 clics, 0 errores,
0 handlers inválidos**; y en el barrido estático ampliado, **227 pantallas y 17.810 handlers
sin una sola referencia rota**.

**Regla para quien siga:** cualquier prueba que solo toque `ORD-2026-1483`, `1512`, `1398` o
`EXAM` no está probando el simulador, está probando el 5 % de él.

---

## 5. Orden de trabajo

Cada fase deja el simulador funcionando. **No pases a la siguiente sin cumplir su criterio.**

1. **D1 — Mis tareas.** Es lo que se pidió y lo de mayor impacto para el alumno.
2. **D2 — Fidelidad de la página Tasks.** Empieza leyendo los grupos de `qzDB.taskGroups`.
3. **D4 + D9 (dinero).** Cablear *Void* en las tres tablas de Accounting.
4. **D7 — Export real o deshabilitado.**
5. **D5 + D6 — Sembrar notas, mensajes y facturas.**
6. **D3 — Documentos abribles.** Es la más larga; hazla cuando lo demás esté verde.
7. **D8 — Tira de sub-pestañas.** Sólo si lo confirmas antes.

---

## 6. Referencias visuales

Están en `Quialia/Images-resourses/`. `RESOURCES.md` documenta la procedencia de cada archivo.
**Míralas antes de tocar la UI.**

| Archivo | Para qué |
|---|---|
| `real-screenshots/core-charges-section-b.png` | **La referencia principal.** Única captura real, legible, a 3456×1944. De aquí sale el panel derecho del §3.1 y los tokens de color |
| `real-screenshots/core-basic-info-LEGACY-2016.png` | Nombres y agrupación de campos de Basic Info. Chrome de 2016: **copia los campos, no el chrome** |
| `wireframes/core-order-tasks.webp` | La página Tasks del §3.3 |
| `wireframes/core-order-dashboard.webp` | La tira de sub-pestañas y el botón verde *Order Dashboard* |
| `wireframes/core-order-accounting.webp` | *Account Balances*, *Payment Details / Breakdown*, badge *Ready to Disburse* |

Los wireframes llevan el texto difuminado a propósito: sirven para **maquetación y nomenclatura de
sección**, no para datos.

**No pidas capturas más nuevas.** Se verificó el 2026-08-26: el Knowledge Base de Qualia redirige a
`login.qualia.io`, Qualia University exige login, `api.qualia.com/graphql` responde `UNAUTHORIZED` y
`docs.qualia.com` no existe. Los wireframes del repo son **byte por byte idénticos** a los que
qualia.com sirve hoy.

---

## 7. Fuera de alcance

- **Qualia Connect.** Es el portal del comprador y del agente: otro producto, otra maquetación. Un
  VA de title/escrow trabaja en **Core**.
- Persistencia, backend, red, librerías externas, paso de compilación.
- Rehacer la capa de datos, el rail o el sistema de Charges. Ya están bien.
- Convertir en formularios las 4 páginas del §2.1.

---

## 8. Criterios de aceptación

| # | Criterio | Hoy | Meta |
|---|---|---|---|
| 0 | Home tras el logo, con sus chips | no existía | **los 5 chips vivos**: Orders, Order Queue, Action Queue, Tasks, Notifications |
| 1 | Vista de tareas personales | no existe | **existe**, muestra las 142 |
| 2 | La campana filtra por responsable | no (muestra 397) | **sí** (muestra 142) |
| 3 | Enlace *"assigned any tasks"* en el panel | no | **sí**, lleva a la vista personal |
| 4 | Título de la página Tasks | literal en las 75 | **del workflow de cada orden** |
| 5 | Grupos leídos de `qzDB.taskGroups` | no (escritos a mano) | **sí** |
| 6 | Botón *Modify* + franja de estado + ocultar grupo | no | **sí** |
| 7 | Documentos que abren archivo | **2.150 / 2.150 (100 %)** | ≥ 25 % por orden — **superado en las 75** |
| 8 | *Void* alcanzable desde Accounting | no | **sí**, en Receipts, Disbursements e Invoices |
| 9 | `notes` / `messages` | 0 / 0 | **≥ 40 órdenes con notas**, hilos con mensajes |
| 10 | Órdenes con factura | 14 | **≥ 55** |
| 11 | Export | toast que miente | **CSV real** o deshabilitado con motivo |
| 12 | Entidades con CRUD completo | **18 / 24** | ≥ 16 / 24 — **superado** |
| 13 | Fallbacks literales | 0 | **0** |
| 14 | Errores de consola en el recorrido | 0 | **0** |
| 15 | `localStorage` | 1 clave, 10 campos | **igual** |
| 16 | Las 10 lecciones y el examen | pasan | **pasan** |

---

## 9. Cómo medir

Pega estos scripts en la consola con el simulador cargado.

### 9.1 Tareas

```js
(() => {
  const all = qzList('tasks');
  const abiertas = all.filter(t => qzTaskStatus(t) !== 'Complete');
  const mias = abiertas.filter(t => /you/i.test(t.assignedTo || ''));
  return {
    total: all.length,
    abiertas: abiertas.length,
    mias: mias.length,
    ordenesConMias: new Set(mias.map(t => t.relatedOrderId)).size,
    responsables: new Set(all.map(t => t.assignedTo)).size,
    conGrupo: all.filter(t => t.taskGroup || t.group).length + ' / ' + all.length,
    campanaFiltra: /assignedTo/.test(qzRenderBellDropdown.toString()),
    campanaMuestra: qzOpenTasks().length
  };
})()
```

Hoy: `{ total: 2633, abiertas: 397, mias: 142, ordenesConMias: 25, responsables: 17,
conGrupo: "2633 / 2633", campanaFiltra: false, campanaMuestra: 397 }`.

### 9.2 Volumen y enlace con la orden

```js
(() => {
  const link = k => new Set(qzList(k).map(x => x.orderId || x.relatedOrderId).filter(Boolean)).size;
  const cols = ['tasks','documents','chargeLines','vendors','ledgerLines','disbursements',
                'receipts','threads','invoices','notes','messages'];
  const out = {};
  cols.forEach(k => out[k] = qzList(k).length + ' filas / ' + link(k) + ' ordenes');
  out.docsConArchivo = qzList('documents').filter(d => d.file).length;
  out.totalOrdenes = qzList('orders').length;
  return out;
})()
```

### 9.3 Campos editables por página

```js
(() => {
  const tabs = [];
  QZ_CORE_NAV.forEach(s => s.groups.forEach(g => g.items.forEach(i => {
    if (i.tab && !tabs.includes(i.tab)) tabs.push(i.tab);
  })));
  const o = qzList('orders')[0], d = document.createElement('div');
  const rows = tabs.map(t => {
    qzState.orderId = o.id; qzState.orderTab = t; d.innerHTML = qzOrderHTML(o);
    // -1 descuenta el buscador del panel de Ayuda, presente en todas
    const n = d.querySelectorAll('input:not([disabled]):not([readonly]),select:not([disabled]),textarea:not([disabled]):not([readonly])').length - 1;
    return { tab: t, editables: n };
  });
  return {
    conEditables: rows.filter(r => r.editables > 0).length + ' / ' + tabs.length,
    sinEditables: rows.filter(r => r.editables <= 0).map(r => r.tab)
  };
})()
```

Hoy: `34 / 38`, sin editables `["cd-j","preview-cd","preview-settlement","review"]` — los cuatro
correctos así.

### 9.4 Recorrido completo sin errores

```js
(() => {
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  const tabs = [];
  QZ_CORE_NAV.forEach(s => s.groups.forEach(g => g.items.forEach(i => {
    if (i.tab && !tabs.includes(i.tab)) tabs.push(i.tab);
  })));
  const os = qzList('orders'); let n = 0;
  [os[0], os[10], os[40], os[74]].forEach(o => {
    qzOpenOrder(o.id);
    tabs.forEach(t => { try { qzOrderTab(t); n++; } catch (e) { errs.push(t + ': ' + e); } });
  });
  ['contacts','calendar','accounting','reports','compliance','admin'].forEach(v => {
    try { qzState.view = v; qzRenderRoot(); n++; } catch (e) { errs.push(v + ': ' + e); }
  });
  QZ_SHELL_ACCT_TABS.forEach(t => { qzShellState.acctTab = t[0]; qzState.view = 'accounting'; try { qzRenderRoot(); n++; } catch (e) { errs.push('acct/' + t[0]); } });
  QZ_SHELL_COMP_TABS.forEach(t => { qzShellState.compTab = t[0]; qzState.view = 'compliance'; try { qzRenderRoot(); n++; } catch (e) { errs.push('comp/' + t[0]); } });
  QZ_SHELL_ADMIN_PAGES.forEach(p => { qzShellState.adminPage = p[0]; qzState.view = 'admin'; try { qzRenderRoot(); n++; } catch (e) { errs.push('admin/' + p[0]); } });
  return { pantallas: n, errores: errs,
           lsClaves: Object.keys(JSON.parse(localStorage.getItem('qz_va_training_v2') || '{}')) };
})()
```

Hoy: `{ pantallas: 180, errores: [], lsClaves: [10 campos] }`.

### 9.5 Fallbacks literales (debe dar 0)

```bash
grep -oE "o\.[a-zA-Z]+ \|\| '[A-Z][^']*'" Quialia/qualia-app.js | sort -u
```

---

## 10. Si algo choca

Este documento manda sobre cualquier comentario del código que lo contradiga. Si crees que
necesitas romper una regla del §1, o si una decisión depende de algo del §3.5 que no se pudo
verificar, **detente y pregunta** en vez de inventarlo.
