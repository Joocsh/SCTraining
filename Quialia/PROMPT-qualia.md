# PROMPT MAESTRO — Qualia Core: de fachada pintada a expediente modelado

> Pásale este documento completo a un agente de código, o dile:
> **"sigue `Quialia/PROMPT-qualia.md`"**.
>
> Este documento **reemplaza y anula** a `PROMPT-qualia-shell.md`, `PROMPT-qualia-system.md` y
> `PROMPT-qualia-3-motor.md`, que fueron borrados el 2026-08-26. No los busques: lo que valía
> de ellos está aquí, y lo que decían de más ya se cumplió o quedó obsoleto.
>
> Todo número de este documento fue **medido ejecutando el simulador el 2026-08-26**, no leído
> del código ni heredado del prompt anterior. El §9 trae el script para volver a medirlo.

---

## 0. Alcance

Trabajas **exclusivamente** en `Quialia/`. No toques `Docusign/`. No toques `AppFolio/`. No toques `assets/`.

Sitio 100% estático: vanilla JS, sin build, sin frameworks, sin red. Se sirve con
`py -m http.server 5799` desde la raíz del repo y se abre en
`http://localhost:5799/Quialia/testdrive-qualia.html`.

---

## 1. Reglas duras — no negociables

### 1.1 El curso no se toca

`qualia-data.js` completo, `QZ_LESSONS`, `QZ_SCENARIOS`, `QZ_REVIEWS`, `QZ_RECONCILES`,
`QZ_COMPOSES`, `QZ_EXAM_*`, `qzMark()`, `qzStore`, `qzSave()`, `qzLoad()`, `QZ_LS_KEY`,
`qualia-tour.js`, `assets/js/sim-engine.js`.

Tres invariantes que deben seguir siendo ciertos al terminar:

1. `QZ_LS_KEY` sigue siendo `'qz_va_training_v2'` y guarda **sólo** las 10 claves académicas
   (`checklist, scenarios, reviews, reconciles, composes, exam, lessonsDone, checklistScoped,
   shuffleSalt, tourSeen`). Ningún dato de producto entra ahí.
2. Los datos del producto viven **sólo en memoria** (`qzDB`). Al refrescar, el mundo vuelve a
   estado de fábrica. Esto ya funciona: no lo rompas metiendo persistencia.
3. Un alumno puede completar las 14 lecciones y el examen exactamente igual que hoy.

### 1.2 Lo que ya está bien — no lo reescribas

El audit del 2026-08-26 encontró que **la arquitectura ya es correcta**. Los tres prompts
anteriores hicieron su trabajo. En concreto:

| Cosa | Estado medido |
|---|---|
| Errores de consola | **0** en 152 renders de pestaña (38 pestañas × 4 órdenes) + 28 vistas de shell |
| Imágenes rotas | **0** |
| Capa de datos genérica | **Existe y funciona**: `qzDB` con `qzList / qzFind / qzInsert / qzUpdate / qzRemove / qzNextId / qzLogAudit` sobre 31 colecciones. Probado en vivo: insert → update → remove sobre `orders` es correcto. |
| Separación curso/producto | **Lograda.** `localStorage` sólo tiene progreso. |
| Reset de fábrica al refrescar | **Funciona.** |
| Cobertura de pantallas | 38 páginas de expediente + 6 vistas raíz + 6 sub-pestañas de Accounting + 6 de Compliance + 10 de Admin = **66 pantallas**, todas renderizan |
| Fidelidad del rail | **Alta.** `QZ_CORE_NAV` reproduce el rail de `core-charges-section-b.png` sección por sección, badges A/B/C/E/F/G/H/J/K-M/L-N incluidos |
| Páginas `qzCoreStub` sin vista | **5**, y las 5 son de ayuda (Help Center, Contact Us, knowledge base). Antes eran 17. |

**No refactorices la capa de datos. No reconstruyas el rail. No reescribas el chrome.**
Todo eso ya está. El trabajo pendiente es otro.

---

## 2. La tesis: está **pintado**, no **modelado**

El simulador se ve como Qualia Core. No se **comporta** como Qualia Core.

Un VA puede recorrer 66 pantallas y no poder **escribir** en 31 de las 38 páginas del
expediente. Puede abrir la orden 1471 y ver exactamente el mismo equipo de settlement, el mismo
condado, el mismo underwriter y los mismos $5,000.00 de earnest money que en la 1483 — porque
esos valores no son datos, son literales en el renderer.

El patrón dominante es este:

```html
<div class="qz-kv"><b>Paralegal / Closer</b>${esc(o.paralegal || 'Travis Jones')}</div>
```

Hay **103** filas `qz-calc-row` y decenas de `qz-kv` como esa. `o.paralegal` **no existe en
ninguna de las 75 órdenes**. Siempre cae al literal. El campo se ve, se lee, y no es real.

**El objetivo de esta ronda: convertir cada valor pintado en un campo del modelo, y cada campo
del modelo en un control editable.** Nada más. No hay pantallas nuevas que construir.

---

## 3. Los nueve defectos, medidos

### D1 — 31 de 38 páginas del expediente no tienen un solo control editable

Conteo de `input/select/textarea` habilitados por página, **descontando** el buscador del panel
de Help que aparece en todas:

| Página | Editables | Página | Editables |
|---|---|---|---|
| `loan` | **18** | `earnest` | **0** |
| `documents` | 9 | `prorations` | **0** |
| `dataentry` | 5 | `payoffs` | **0** |
| `requirements` | 5 | `cpl` | **0** |
| `tasks` | 3 | `policy-info` | **0** |
| `communication` | 1 | `commitment` | **0** |
| `overview` (Basic Info) | **1** (sólo el checkbox 1099) | `exceptions` | **0** |
| | | `final-policy` | **0** |
| | | `cd-a … cd-ln` (10 págs) | **0** |
| | | `accounting` | **0** |
| | | `closing` | **0** (5 inputs, todos disabled) |
| | | `preview-cd`, `preview-settlement` | **0** |
| | | `mailing`, `recording`, `proceeds`, `workflow` | **0** |
| | | `marketplace`, `erecording`, `underwriter`, `esign` | **0** |
| | | `vendors` | **0** |

`loan` es la prueba de que se puede hacer bien: 18 campos editables, y nadie tuvo que inventar
arquitectura nueva para lograrlo. **`loan` es el patrón a replicar.**

### D2 — Las 10 páginas de Charges son literales, no datos

`qualia-app.js:3494`, `qzClosingDisclosureSectionHTML()`:

```js
const lineGenerators = {
  'cd-a': () => [
    { desc: '0.50 % of Loan Amount (Points)', payee: 'Lender', amount: Math.round((o.loanAmount||300000)*0.005), col:'borrowerAt' },
    { desc: 'Application Fee', payee: 'Lender', amount: 350.00, col:'borrowerBefore' },
    { desc: 'Underwriting Fee', payee: 'Lender', amount: 795.00, col:'borrowerAt' }
  ], ...
```

Las mismas 2–5 líneas para las 75 órdenes, escaladas por `purchasePrice`/`loanAmount`. Se
pintan como `<td>` de sólo lectura. **Cero inputs.**

Comparado con `real-screenshots/core-charges-section-b.png`, faltan:

- Celdas editables en Description / Payee / las 5 columnas de importe.
- Botones **Sort Lines**, **+**, **−** en la cabecera.
- El **panel Payments** completo: pestañas *Check / Wire / Net Funded / Aggregate / Transfer /
  Holdback*, campos *Name / Payment Amount / Label / Reference #*, el toggle *Disburse
  Separately*, el bloque *Mailing Address*, el enlace *Itemize*, los botones *Add Contact* y
  *Clear*.

Esto no es un detalle cosmético: **las páginas de Charges son donde un VA de escrow pasa el
día.** Son la razón de existir de Core.

### D3 — El modelo tiene 16 campos; Basic Info pinta 28 valores

El objeto orden tiene 16 campos (17 en la única orden que además trae `originalClosingDate`):

```
id, titleNumber, propertyAddress, type, status, stageIndex, opened, closingDate,
purchasePrice, loanAmount, inspectionCharge, legalDescription, settlementAgency,
flag, statusNote, parties  (+ originalClosingDate en 1 orden)
```

Basic Info lee **14 campos que no existen en ninguna de las 75 órdenes** (cobertura 0/75):

`fundingDate`, `disbursementDate`, `purpose`, `representing`, `statementType`,
`sourceOfBusiness`, `eligible1099`, `orderOpener`, `paralegal`, `attorney`, `assistants`,
`marketers`, `aptSuite`, `county`.

Además pinta como literal puro, sin campo siquiera: el underwriter
(`'Old Republic National Title Insurance Co.'`), el policy jacket (`'OR-TX-448120'`) y el
earnest money (`'$5,000.00'`).

Y de los que sí existen: **`settlementAgency` está poblado 75/75 pero tiene 1 solo valor
distinto.** Igual `attorney`, `orderOpener`, `paralegal`, `county`: 1 valor cada uno.

Resultado: **las 75 órdenes tienen el mismo equipo de settlement.**

El modal `qzEditOrderModal` expone **5 campos**.

Los nombres de campo correctos están en `real-screenshots/core-basic-info-LEGACY-2016.png` —
chrome viejo, pero la nomenclatura y el agrupamiento siguen vigentes.

### D4 — Contabilidad y Compliance son un universo paralelo

**Ninguna colección de dinero tiene un campo `orderId`.** La relación con la orden es texto
libre dentro de otros campos. Medido:

| Colección | Filas | Órdenes distintas citadas | Resuelven |
|---|---|---|---|
| `receipts` | 30 | 3 | 3 |
| `disbursements` | 30 | 3 | 3 |
| `invoices` | 15 | 3 | 3 |
| `events` | 31 | **0** | 0 |
| `pospay` | 8 | **0** | 0 |
| `reconciliations` | 12 | **0** | 0 |
| `notifications` | 10 | **0** | 0 |
| `ledgerLines` | **0** | — | — |
| `notes` | **0** | — | — |
| `cpls` | 20 | 19 | 19 ✅ |
| `wireLog` | 25 | 20 | 20 ✅ |

Consecuencias concretas:

- **El ledger del expediente está vacío para las 75 órdenes** (`ledgerLines: 0`), mientras 30
  recibos y 30 disbursements flotan en una lista aparte.
- Abres una orden y no puedes preguntar "¿qué dinero tiene esta orden?".
- Abres un recibo y no puedes saltar a su orden.
- Los 31 eventos del calendario no pertenecen a ninguna orden.

### D5 — Las 72 órdenes de catálogo son cascarones

| Cosa | Total | Dónde está |
|---|---|---|
| Vendors | **8** | Las 8 en las 3 órdenes del currículum → **72 órdenes con Marketplace vacío** |
| Threads (Connect) | **3** | Los 3 en el currículum → **72 órdenes con Connect vacío** |
| Reviews | 6 | Sólo currículum |
| Recibos / disbursements / invoices | 75 filas | Sólo 3 órdenes |

Medido en bytes de HTML renderizado (la base del chrome son ~13.300 bytes):

| Pestaña | Orden 1483 (currículum) | Orden 1471 (catálogo) |
|---|---|---|
| `accounting` | 29.392 | 14.857 → **~1.500 de contenido** |
| `vendors` | 15.017 | 13.256 → **~0** |
| `communication` | 14.426 | 13.042 → **~0** |
| `review` | 19.397 | 13.072 → **~0** |

### D6 — Sólo 9 de 220 documentos abren un archivo

211 documentos son filas con nombre y estado. Sólo 9 tienen `file` apuntando a un HTML real en
`Quialia/documents/`.

**La habilidad central de un VA es abrir el documento y leer lo que dice.** Hoy funciona en el
**4%** de los documentos.

### D7 — Monotonía

| Métrica | Valor | Referencia real |
|---|---|---|
| Nombres de documento distintos, 75 órdenes | **12** | 30–60 |
| Títulos de tarea distintos, 75 órdenes | **11** | decenas |
| Documentos por orden | media 2.9 (mín 2, máx 7) | **20–40** |
| Estados de orden | **2** (Open 26 / Closed 49) | el `stageIndex` ya soporta más |
| Tipos de orden | Purchase 51, Cash 11, Refinance 10, Commercial 3 | razonable ✅ |
| Partes por orden | media 5.1, 133 nombres distintos | razonable ✅ |

### D8 — Inconsistencias del modelo

1. **Llave foránea con dos nombres.** `documents` usa `orderId`; `tasks` usa `relatedOrderId`.
   Misma capa de datos, dos convenciones.
2. **`taskGroups` existe y nadie lo usa.** La colección trae exactamente los 5 grupos reales de
   Qualia — *Order Opening, Title, Pre-Closing, Payoff Tasks, Post-Closing*, los mismos que se
   ven en `wireframes/core-order-tasks.webp` — pero **ninguna de las 221 tareas referencia un
   grupo**. La pantalla Tasks del producto real, que se organiza por grupos con barra de
   progreso, no se puede construir con estos datos.

### D9 — CRUD incompleto: 7 de 21 entidades

| Cobertura | Entidades |
|---|---|
| **C+U+D completo** | Order, Party, Document, Task, Vendor, LedgerLine, Event |
| C+U, sin borrar | Contact, User (sólo *disable*), Fee, Office, CPL |
| C+D, sin editar | Thread |
| **Sólo crear** | Receipt, Disbursement, Invoice, TaskGroup, Folder |
| Sólo actualizar | Exception (*Resolve / Reassign / Waive*), Disbursement (*Approve*) |
| Nada | Note, Reconciliation, Template, Integration, Account |

**Lo más grave:** recibos, disbursements e invoices se crean pero **nunca se editan ni se
anulan**. Anular un recibo mal capturado es trabajo diario en escrow.

Controles que siguen siendo sólo un toast: `Export` / `Export CSV` (no genera archivo),
`Run Report`, `Schedule`, `New <template>`, `Configure <integration>`, `Email`, `Call`.

---

## 4. El trabajo, en orden

Cada fase es independiente y deja el simulador funcionando. **No pases a la siguiente sin que
la anterior cumpla su criterio de aceptación (§8).**

### Fase 1 — Ensanchar el modelo de la orden *(la base de todo)*

Añade al objeto orden los 14 campos que Basic Info ya lee, más los 3 que hoy son literales sin
campo:

```
fundingDate, disbursementDate, purpose, representing, statementType, sourceOfBusiness,
eligible1099, orderOpener, paralegal, attorney, assistants, marketers, aptSuite, county,
underwriter, policyJacket, earnestAmount
```

Poblalos en **las 75 órdenes** con variedad real:

- Mínimo **6 agencias de settlement**, **8 order openers**, **8 paralegales**, **5 abogados**.
  Reutiliza los 18 nombres que ya viven en `qzDB.users` — no inventes un elenco paralelo.
- `county` coherente con la dirección de cada propiedad (hoy las 75 dicen "Collin County").
- `earnestAmount` proporcional al precio, no $5,000 fijo.
- `fundingDate` / `disbursementDate` derivados de `closingDate` con desfases realistas y
  variables.

Luego **borra todos los fallbacks literales** de `qzOverviewHTML()`. Si un campo no está
poblado, que se vea vacío. Un campo vacío es información; un campo con el nombre de Travis
Jones inventado es mentira.

### Fase 2 — Basic Info editable

Convierte `qzOverviewHTML()` de `qz-kv` de sólo lectura a formulario, replicando el layout de
`real-screenshots/core-basic-info-LEGACY-2016.png`:

- **Important Dates**: 3 date pickers.
- **Amounts**: 2 campos de moneda + earnest.
- **Type**: `Purpose` y `Representing` como `<select>`, `Order #` con su botón *Change Order #*,
  `Settlement Statement` con *Toggle HUD/CD*.
- **Reporting**: `Source of Business` (select), toggle 1099 (ya existe).
- **Settlement Team**: 6 campos de tipo *people picker* — input con lupa que abre un selector
  poblado desde `qzDB.users`.
- **Place of Closing**: address, apt/suite, city, county, state (select), zipcode.

Cada `onchange` escribe con `qzUpdate('orders', ...)` y registra en `qzLogAudit`. Usa el patrón
que ya funciona en la página `loan`: **no inventes uno nuevo.**

### Fase 3 — Charges de verdad

1. **Modela las líneas.** Colección nueva `chargeLines`, con
   `{ id, orderId, section, lineNo, description, payee, borrowerAt, borrowerBefore, sellerAt,
   sellerBefore, byOthers }`. Migra ahí los `lineGenerators` hardcodeados y **genera variedad
   por orden** — no las mismas 3 líneas 75 veces.
2. **Haz la grid editable.** Cada celda un input. Los totales por columna se recalculan en vivo.
   Botones **+** (añadir línea), **−** (borrar la seleccionada) y **Sort Lines**.
3. **Construye el panel Payments** tal como aparece en `core-charges-section-b.png`: pestañas
   *Check / Wire / Net Funded / Aggregate / Transfer / Holdback*, campos *Name / Payment Amount
   / Label / Reference #*, *Disburse Separately*, *Mailing Address*, *Itemize*.

Esta fase sola cubre 10 de las 31 páginas muertas de D1.

### Fase 4 — Conectar el dinero con la orden

1. Añade `orderId` a `receipts`, `disbursements`, `invoices`, `events`, `pospay`,
   `reconciliations`, `notifications`. Rellénalo en todas las filas existentes.
2. **Puebla `ledgerLines`** — hoy está en 0. Cada orden abierta debe tener su ledger de escrow
   con depósitos y desembolsos que **cuadren** con sus recibos y disbursements.
3. Distribuye los 75 documentos de dinero sobre **al menos 25 órdenes**, no 3.
4. Vuelve bidireccional la navegación: desde el recibo se salta a la orden y desde la orden se
   ven sus recibos. `qzShellOrderCell()` ya sabe hacer el enlace; dale datos que enlazar.
5. Completa el CRUD de dinero: **editar y anular** recibos, disbursements e invoices.

### Fase 5 — Llenar el catálogo

- **Vendors**: de 8 a **≥ 150**, cubriendo ≥ 60 de las 75 órdenes.
- **Threads de Connect**: de 3 a **≥ 60**, cubriendo ≥ 40 órdenes.
- **Documentos**: de 220 a **≥ 900** (media 12/orden), con **≥ 35 nombres distintos**.
- **Tareas**: **≥ 35 títulos distintos**, y **cada tarea con su `taskGroup`** de los 5 que ya
  existen en `qzDB.taskGroups`.
- **Documentos abribles**: de 9 a **≥ 60**. Escribe plantillas HTML parametrizadas en
  `Quialia/documents/` en vez de un archivo por documento — la orden inyecta sus datos.

### Fase 6 — Rematar

1. Unifica la llave foránea: `relatedOrderId` → `orderId` en `tasks`.
2. Reconstruye la pantalla Tasks agrupada como `wireframes/core-order-tasks.webp`: los 5 grupos,
   barra de progreso por grupo, botones *Modify / Add Task / Add Task Group*.
3. Añade el botón verde **Order Dashboard** en la cabecera del rail
   (`wireframes/core-order-dashboard.webp`). Hoy el rail arranca con el pin de dirección, que es
   el chrome de 2021.
4. Convierte `Export` / `Export CSV` en una descarga real vía `Blob` + `URL.createObjectURL`.
   Hoy sólo lanza un toast que **miente**: dice "CSV export generated and downloaded" y no
   descarga nada.
5. Completa el CRUD faltante de D9, priorizando Note y Reconciliation.

---

## 5. Reglas de estilo

- **Ningún dato en el renderer.** Si un valor aparece dentro de un template string y no viene de
  `qzList/qzFind`, está mal. Los 103 `qz-calc-row` son el inventario de lo que hay que migrar.
- **Ningún fallback literal.** `o.campo || 'Nombre Inventado'` está prohibido. Vacío es vacío.
- **Ningún toast que mienta.** Un toast describe algo que pasó. Si no pasó nada, no hay toast:
  hay un control deshabilitado con un `title` que explica por qué.
- **Toda escritura pasa por `qzUpdate` / `qzInsert` / `qzRemove`** y registra `qzLogAudit`.
- **Cero estilos inline nuevos.** Todo a `qualia.css` / `qualia-shell.css`.
- **Cero `localStorage` nuevo.** El producto vive en memoria.
- El repo usa **CRLF**. Si editas con `sed -i` u otra herramienta POSIX, restaura los finales de
  línea o el diff saldrá con el archivo entero cambiado.

---

## 6. Referencias visuales

Están en `Quialia/Images-resourses/`. **Léelas antes de tocar UI.** `RESOURCES.md` documenta la
procedencia de cada archivo.

| Archivo | Para qué |
|---|---|
| `real-screenshots/core-charges-section-b.png` | **La referencia principal.** Única captura real, legible y a resolución completa (3456×1944). De aquí salen la Fase 3 entera, los tokens de color y la densidad tipográfica. |
| `real-screenshots/core-basic-info-LEGACY-2016.png` | Nombres y agrupamiento de campos de Basic Info → Fases 1 y 2. Chrome de 2016: **copia los campos, no el chrome.** |
| `real-screenshots/core-loan-LEGACY-2016.png` | Campos de Loan. Misma advertencia. |
| `wireframes/core-order-tasks.webp` | Los 5 grupos de tareas y los botones → Fase 6. |
| `wireframes/core-order-dashboard.webp` | El botón verde *Order Dashboard* → Fase 6. |
| `wireframes/core-order-accounting.webp` | *Account Balances*, *Payment Details / Breakdown*, badge *Ready to Disburse* → Fase 4. |

**Los wireframes tienen el texto borroso a propósito.** Sirven para layout y nomenclatura de
sección, no para datos.

**No pidas capturas más nuevas.** Se verificó el 2026-08-26: el Knowledge Base de Qualia
(`knowledge.qualia.com`) redirige a `login.qualia.io`, Qualia University (`help.qualia.com`)
exige login, `api.qualia.com/graphql` responde `UNAUTHORIZED`, y `docs.qualia.com` /
`developer.qualia.com` no existen. Los 4 wireframes del repo son **byte por byte idénticos** a
los que qualia.com sirve hoy — ya están al día. Detalle completo en `RESOURCES.md §3`.

---

## 7. Fuera de alcance

- **Qualia Connect.** Es el portal del comprador/agente, otro producto con otro layout. Un VA de
  title/escrow trabaja en **Core**. Se borraron sus capturas en la limpieza del 2026-08-26.
- Persistencia, backend, red, librerías externas, build step.
- Rediseñar el chrome, el rail o la capa de datos. Ya están bien.

---

## 8. Criterios de aceptación

Al terminar, **cada uno de estos debe ser cierto y demostrable con el script del §9**:

| # | Criterio | Hoy |
|---|---|---|
| 1 | Páginas del expediente con ≥ 1 control editable | **7 / 38** → **≥ 34 / 38** |
| 2 | Controles editables en Basic Info | 1 → **≥ 20** |
| 3 | Campos del objeto orden | 16 → **≥ 31** |
| 4 | Valores distintos de `settlementAgency` / `paralegal` / `county` | 1 / 1 / 1 → **≥ 6 / ≥ 8 / ≥ 5** |
| 5 | `ledgerLines` | 0 → **≥ 400**, cuadrando con receipts y disbursements |
| 6 | Órdenes con movimiento de dinero | 3 → **≥ 25** |
| 7 | Vendors totales / órdenes cubiertas | 8 / 3 → **≥ 150 / ≥ 60** |
| 8 | Threads / órdenes cubiertas | 3 / 3 → **≥ 60 / ≥ 40** |
| 9 | Documentos / nombres distintos / abribles | 220 / 12 / 9 → **≥ 900 / ≥ 35 / ≥ 60** |
| 10 | Títulos de tarea distintos | 11 → **≥ 35** |
| 11 | Tareas con `taskGroup` asignado | 0 % → **100 %** |
| 12 | Colecciones con campo `orderId` real | 7 / 14 → **14 / 14** |
| 13 | Entidades con CRUD completo | 7 / 21 → **≥ 16 / 21** |
| 14 | Fallbacks literales `\|\| 'Nombre'` en renderers | **19 distintos** → **0** |
| 15 | Errores de consola en el recorrido completo | 0 → **0** (no regresar) |
| 16 | `localStorage` sigue con sólo las 10 claves académicas | ✅ → **✅** |
| 17 | Las 14 lecciones y el examen se completan igual | ✅ → **✅** |

---

## 9. Cómo medir

Levanta el servidor, abre el simulador, autentícate y pega esto en la consola:

```js
localStorage.setItem('scc_session', JSON.stringify({userId:'maria'}));  // si te redirige al login
```

```js
(() => {
  const os = qzList('orders');
  const tabs = []; QZ_CORE_NAV.forEach(s=>s.groups.forEach(g=>g.items.forEach(i=>{ if(i.tab&&!tabs.includes(i.tab)) tabs.push(i.tab); })));
  const d = document.createElement('div');
  const editables = tabs.map(t => {
    qzState.orderId = os[0].id; qzState.orderTab = t; d.innerHTML = qzOrderHTML(os[0]);
    // -1 descuenta el buscador del panel de Help, presente en todas las páginas
    return { tab: t, editable: d.querySelectorAll('input:not([disabled]):not([readonly]),select:not([disabled]),textarea:not([disabled]):not([readonly])').length - 1 };
  });
  const distinct = k => new Set(os.map(o => o[k])).size;
  const linked   = k => new Set(qzList(k).map(x => x.orderId).filter(Boolean)).size;
  return {
    paginasEditables : editables.filter(e => e.editable > 0).length + ' / ' + tabs.length,
    paginasMuertas   : editables.filter(e => e.editable <= 0).map(e => e.tab),
    basicInfo        : editables.find(e => e.tab === 'overview').editable,
    camposOrden      : Object.keys(os[0]).length,
    variedad         : { agency: distinct('settlementAgency'), paralegal: distinct('paralegal'), county: distinct('county') },
    ledgerLines      : qzList('ledgerLines').length,
    dineroPorOrden   : linked('receipts') + ' / ' + linked('disbursements') + ' / ' + linked('invoices'),
    vendors          : qzList('vendors').length + ' en ' + linked('vendors') + ' ordenes',
    threads          : qzList('threads').length + ' en ' + linked('threads') + ' ordenes',
    documentos       : qzList('documents').length,
    docsDistintos    : new Set(qzList('documents').map(x => x.name)).size,
    docsAbribles     : qzList('documents').filter(x => x.file).length,
    tareasDistintas  : new Set(qzList('tasks').map(x => x.title)).size,
    tareasConGrupo   : qzList('tasks').filter(x => x.taskGroup || x.groupId).length + ' / ' + qzList('tasks').length,
    lsKeys           : Object.keys(JSON.parse(localStorage.getItem('qz_va_training_v2') || '{}'))
  };
})()
```

Recorrido completo sin errores:

```js
(() => {
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  const tabs = []; QZ_CORE_NAV.forEach(s=>s.groups.forEach(g=>g.items.forEach(i=>{ if(i.tab&&!tabs.includes(i.tab)) tabs.push(i.tab); })));
  const os = qzList('orders'); let n = 0;
  [os[0], os[10], os[50], os[74]].forEach(o => { qzOpenOrder(o.id); tabs.forEach(t => { try { qzOrderTab(t); n++; } catch(e){ errs.push(t + ': ' + e); } }); });
  ['contacts','calendar','accounting','reports','compliance','admin'].forEach(v => { try { qzState.view = v; qzRenderRoot(); n++; } catch(e){ errs.push(v + ': ' + e); } });
  QZ_SHELL_ACCT_TABS.forEach(t => { qzShellState.acctTab = t[0]; qzState.view='accounting'; try { qzRenderRoot(); n++; } catch(e){ errs.push('acct/'+t[0]+': '+e); } });
  QZ_SHELL_COMP_TABS.forEach(t => { qzShellState.compTab = t[0]; qzState.view='compliance'; try { qzRenderRoot(); n++; } catch(e){ errs.push('comp/'+t[0]+': '+e); } });
  QZ_SHELL_ADMIN_PAGES.forEach(p => { qzShellState.adminPage = p[0]; qzState.view='admin'; try { qzRenderRoot(); n++; } catch(e){ errs.push('admin/'+p[0]+': '+e); } });
  return { pantallas: n, errores: errs };
})()
```

Fallbacks literales que quedan (hoy da **19**; debe dar **0**):

```bash
grep -oE "o\.[a-zA-Z]+ \|\| '[A-Z][^']*'" Quialia/qualia-app.js | sort -u
```

---

## 10. Si algo choca

Este documento manda sobre cualquier comentario en el código que lo contradiga. Si crees que
necesitas romper una de las reglas duras del §1, **detente y pregunta**.
