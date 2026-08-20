# PROMPT MAESTRO — Fachada visual de Qualia Core (Contacts, Calendar, Accounting, Reports, Compliance, Admin)

> Pásale este documento completo a un agente de código, o dile: "sigue `Quialia/PROMPT-qualia-shell.md`".

---

## 0. Rol y objetivo

Eres un ingeniero frontend trabajando en el simulador de entrenamiento de Qualia dentro del repo
`SCTraining`. Tu tarea es construir **6 secciones nuevas de interfaz** que reproduzcan visualmente
Qualia Core: **Contacts, Calendar, Accounting, Reports, Compliance y Admin**.

El objetivo NO es funcionalidad. El objetivo es que una persona que abra el simulador pueda hacer
clic en cualquiera de esas pestañas, navegar, ver tablas con datos, filtros, badges y paneles de
detalle, y **sentir que está dentro del Qualia real**. Cero backend, cero persistencia, cero red.

Piensa en esto como un *showroom*: todo se ve, todo se recorre, nada se guarda.

---

## 1. Regla número uno — NO TOCAR LAS LECCIONES

Esto es un requisito duro del cliente. El sistema de entrenamiento ya está terminado, calificado y
validado. Tu trabajo es **estrictamente aditivo**.

**Prohibido modificar** (salvo los 4 puntos de enganche exactos de la sección 3):

| Archivo / símbolo | Por qué |
|---|---|
| `Quialia/qualia-data.js` completo | Contiene lecciones, escenarios, reviews, reconciles, composes y el banco del examen |
| `QZ_LESSONS`, `QZ_SCENARIOS`, `QZ_REVIEWS`, `QZ_RECONCILES`, `QZ_COMPOSES`, `QZ_EXAM_*` | Currículum y calificación |
| `qzMark()`, `qzStore`, `qzSave()`, `qzLoad()`, `QZ_LS_KEY` | Motor de progreso |
| `assets/js/sim-engine.js` (`SimEngine.*`) | Motor de walkthrough compartido con el módulo Docusign |
| `Quialia/qualia-tour.js` | Tour guiado |
| Vistas existentes: `qzDashboardHTML`, `qzOrdersHTML`, `qzOrderHTML`, `qzScenarioDetailHTML`, `qzLessonDetailHTML`, `qzExamHTML` | Ya funcionan |
| `QZ_CHECKLISTS`, `QZ_CHECKLIST_TAB` | Contrato de los pasos de lección |

**Tres invariantes que deben seguir siendo ciertos al terminar:**

1. Ninguna vista nueva llama nunca a `qzMark()` ni escribe en `qzStore` ni en `localStorage`.
2. `QZ_LS_KEY` sigue siendo `'qz_va_training_v2'` y su forma no cambia.
3. Un alumno puede completar cualquier lección y el examen exactamente igual que antes.

Si crees que necesitas romper alguna de estas reglas, **detente y pregunta**.

---

## 2. Contexto del repo

Sitio 100% estático, vanilla JS, sin build, sin frameworks, sin librerías externas.

```
Quialia/
  testdrive-qualia.html   105 líneas   — shell HTML: topbar oscura, tab strip, #qzRoot
  qualia-app.js         3.364 líneas   — estado, navegación y todas las vistas
  qualia-data.js        2.001 líneas   — datos + currículum  <- NO TOCAR
  qualia.css            2.968 líneas   — tokens y estilos
  qualia-tour.js          131 líneas   — tour guiado          <- NO TOCAR
  Images-resourses/                    — core.png = captura del Qualia Core real
assets/js/sim-engine.js                — walkthrough, toasts, modal de documentos <- NO TOCAR
assets/js/app-core.js                  — SCApp (auth simulado)
```

Cómo se navega hoy (`qualia-app.js:494`):

```js
const QZ_CORE_SECTIONS = [
  { id: 'dashboard', label: 'Training', view: 'dashboard', training: true },
  { id: 'orders',    label: 'Orders',   view: 'orders' },
  { id: 'contacts',  label: 'Contacts' },     // sin `view` -> qzCoreStub() -> toast
  { id: 'calendar',  label: 'Calendar' },
  { id: 'accounting',label: 'Accounting' },
  { id: 'reports',   label: 'Reports' },
  { id: 'compliance',label: 'Compliance' },
  { id: 'admin',     label: 'Admin' }
];
```

Las 6 pestañas ya existen en la barra superior. Hoy solo lanzan un toast. Tu trabajo es darles
pantalla.

**Dato importante:** `qzSyncTopTabs()` (`qualia-app.js:537`) marca la pestaña activa comparando
`el.dataset.view === qzState.view`. Si usas **el mismo string para `id` y para `view`**
(`contacts`, `calendar`, ...), el subrayado verde de la pestaña activa funciona solo, sin tocar
esa función.

Para verlo en el navegador: abre `Quialia/testdrive-qualia.html` con un servidor estático
(existe `.claude/launch.json`).

---

## 3. Arquitectura obligatoria

`qualia-app.js` ya tiene 3.364 líneas. **No lo hagas crecer.**

### Archivos nuevos (aquí vive el 95% del trabajo)

```
Quialia/qualia-shell-data.js   — datos ficticios de las 6 secciones
Quialia/qualia-shell.js        — funciones de render
Quialia/qualia-shell.css       — estilos propios
```

### Convenciones de nombres (respétalas, evitan colisiones)

| Cosa | Convención | Ejemplo |
|---|---|---|
| Funciones de render | `qzShell<Seccion>HTML()` | `qzShellContactsHTML()` |
| Datos | `QZS_*` | `QZS_CONTACTS`, `QZS_EVENTS` |
| Estado local | `qzShellState` (objeto propio, separado de `qzState`) | `qzShellState.contactsFilter` |
| Clases CSS | prefijo `.qzs-` | `.qzs-toolbar`, `.qzs-kpi` |
| Handler de "sin función" | `qzShellAction(label)` | ver sección 5 |

### Registro central, en `qualia-shell.js`

```js
const QZ_SHELL_VIEWS = {
  contacts:   qzShellContactsHTML,
  calendar:   qzShellCalendarHTML,
  accounting: qzShellAccountingHTML,
  reports:    qzShellReportsHTML,
  compliance: qzShellComplianceHTML,
  admin:      qzShellAdminHTML
};
```

### Los ÚNICOS 4 toques permitidos al código existente

**(1)** `Quialia/qualia-app.js:494` — agregar `view` a las 6 entradas:

```js
{ id: 'contacts',   label: 'Contacts',   view: 'contacts' },
{ id: 'calendar',   label: 'Calendar',   view: 'calendar' },
{ id: 'accounting', label: 'Accounting', view: 'accounting' },
{ id: 'reports',    label: 'Reports',    view: 'reports' },
{ id: 'compliance', label: 'Compliance', view: 'compliance' },
{ id: 'admin',      label: 'Admin',      view: 'admin' },
```

**(2)** `Quialia/qualia-app.js:643` `qzRenderRoot()` — un solo `else if` al final de la cadena,
antes de la asignación a `root.innerHTML`:

```js
else if (typeof QZ_SHELL_VIEWS !== 'undefined' && QZ_SHELL_VIEWS[qzState.view]) {
  html = QZ_SHELL_VIEWS[qzState.view]();
}
```

**(3)** `Quialia/testdrive-qualia.html` — un `<link>` y dos `<script>`:

```html
<link rel="stylesheet" href="qualia-shell.css">   <!-- después de qualia.css -->
...
<script src="qualia-shell-data.js"></script>       <!-- antes de qualia-app.js -->
<script src="qualia-shell.js"></script>
```

**(4)** `qzGoto()` (`qualia-app.js:~660`) — guarda para no matar una lección en curso. Si hay
walkthrough activo y el destino es una vista de fachada, no navegues; muestra el toast:

```js
simToast('Finish or exit the current lesson step before browsing other sections.');
```

Nada más. Si te encuentras editando una quinta cosa, párate y replantea.

---

## 4. Sistema visual — cómo lograr que se vea igual

### Referencia

`Quialia/Images-resourses/core.png` es una captura real de Qualia Core. Ábrela y estúdiala antes
de escribir CSS. Es la sección Orders, pero define el lenguaje visual de todo el producto:
topbar oscura casi negra, acento verde, tipografía sans de sistema, tablas MUY densas con líneas
finas, mucho blanco, bordes suaves, cero sombras dramáticas, cero border-radius grande.

Si el usuario te entrega capturas adicionales de las 6 secciones, **esas mandan por encima de
cualquier cosa que diga este documento**.

### Tokens (ya definidos en `qualia.css:13`, úsalos, no inventes colores)

```css
--qz-dark:  #22252b   /* topbar */
--qz-green: #1c6b43   /* acento primario, links */
--qz-ocean: #48a668   /* acento claro, subrayado de tab activa, estados OK */
--qz-gold:  #f2b84b   /* warning */
--qz-amber: #e09924
--qz-ink:   #24262b   /* texto */
--qz-muted: #6e727c   /* texto secundario */
--qz-line:  #e3e5e8   /* bordes de tabla */
--qz-bg:    #f3f4f6   /* fondo de página */
--qz-card:  #ffffff
--qz-bad:   #c94b3f   /* error / alta severidad */
```

### Clases existentes que DEBES reutilizar (no las dupliques)

| Clase | Qué es |
|---|---|
| `table.qz-tbl` + `.qz-tbl-scroll` | Tabla densa de Core. `tr.link` = fila clickeable con hover |
| `.qz-badge` + `.open .pending .progress .scheduled .complete .completed .reviewed .dark` | Chips de estado |
| `.qz-btn`, `.qz-btn.primary`, `.qz-btn.sm`, `.qz-btn[disabled]` | Botones |
| `.qz-listhead` (`h2` + `.sub`) | Encabezado de sección con título y subtítulo |
| `.qz-kv` | Grilla clave-valor para paneles de detalle |
| `.qz-field`, `.qz-form-grid` | Campos de formulario |
| `.qz-subtabs` | Sub-navegación horizontal |
| `.qz-panel-*` | Paneles laterales |
| `QZ_ICONS` (`qualia-app.js:5`) | Iconos SVG inline ya definidos |
| `esc()`, `fmtDate()`, `simToast()`, `qzDueChipHTML()` | Helpers globales ya disponibles |

Solo escribe CSS nuevo para layouts que no existan (grilla de calendario, tiles KPI, gráficas,
matriz de permisos, panel deslizante de contacto).

### Reglas de densidad (esto es lo que hace que "se vea Qualia")

- Texto de tabla: **13px**. Encabezados: **11px**, `uppercase`, `letter-spacing: .04em`, color `--qz-muted`.
- Altura de fila: **34–38px**. Padding de celda: `8px 12px`.
- `border-radius` máximo **4px** en cualquier elemento. Qualia es de esquinas duras.
- Sombras: como máximo `0 1px 2px rgba(0,0,0,.06)`. Nada de sombras difusas grandes.
- Números monetarios: alineados a la derecha, tabulares, formato `$1,234.56`.
- Sin `!important`. Sin variables CSS nuevas globales.

---

## 5. Qué significa "sin funciones" — la regla del toast único

Cada acción de escritura pasa por **un solo helper**, en `qualia-shell.js`:

```js
/* Every write-shaped control in the shell answers here. Centralising it is what
   guarantees the facade can never mutate training state by accident. */
function qzShellAction(label) {
  simToast(`${label} is not available in this demo environment.`);
}
```

**Sí funciona (interacción local, sin persistencia):**
- Buscadores y filtros que filtran el array en memoria y re-renderizan
- Cambiar de sub-tab dentro de una sección
- Abrir el panel de detalle de un registro (read-only) y cerrarlo
- Cambiar de mes en el calendario / marcar checkboxes de filtro de calendario
- Ordenar una tabla al hacer clic en el encabezado (opcional, es un plus)

**NO funciona -> `qzShellAction()`:**
- New / Add / Create / Invite / Save / Edit / Delete / Void / Approve
- Export CSV / PDF, Print, Schedule, Run Report, Send, Import
- Cualquier toggle de configuración, cualquier submit

**Reglas duras:**
- Todo `<input>`/`<select>`/`<textarea>` de escritura lleva `disabled` (los de búsqueda/filtro no).
- Ningún `<form>` con submit. Ningún `fetch`/`XHR`. Ningún `localStorage`.
- Ningún link roto: todo `href` es `#` con `onclick` que hace algo o lanza el toast.

---

## 6. Datos ficticios — deriva de lo que ya existe

Esto es lo que separa una maqueta de algo que parece producto. `qualia-data.js` ya tiene un
universo coherente. **Reúsalo** (solo lectura), y complétalo en `qualia-shell-data.js`.

Ya disponible:
- `QZ_ORDERS` — 3 órdenes completas con `id`, `titleNumber`, `propertyAddress`, `type`, `status`,
  `stageIndex`, `opened`, `closingDate`, `purchasePrice`, `loanAmount`, `settlementAgency`, y
  `parties[]` con `{ name, role, email, phone }`
- `QZ_VENDORS` — 8 proveedores con `orderId`, `name`, `service`, `status`
- `QZ_TASKS` — 8 tareas con `dueDate`, `status`, `relatedOrderId`
- `QZ_MESSAGES`, `QZ_DOCUMENTS`
- `QZ_TODAY = '2026-08-12'` <- **el "hoy" del simulador. Toda fecha nueva debe ser coherente con esto.**
- `QZ_STAGES` — etapas del ciclo de una orden

**Obligatorio:** Contacts debe incluir a las mismas personas que aparecen en `QZ_ORDERS[].parties`.
Calendar debe mostrar las mismas `closingDate` y `dueDate` que ya existen. Accounting debe usar
montos derivados de `purchasePrice` / `loanAmount`. Cuando alguien abra una orden y luego Contacts
y vea al mismo comprador, el sistema se siente real.

**Volumen a inventar** (Texas: Frisco, Plano, Dallas, McKinney, Allen, Richardson, Collin County;
nombres realistas; emails con dominios coherentes; teléfonos `(469|972|214) 555-01XX`):

| Sección | Filas nuevas |
|---|---|
| Contacts | ~35 contactos (incluyendo los ~20 derivados) |
| Calendar | ~40 eventos repartidos en Ago 2026 |
| Accounting | 30 receipts, 30 disbursements, 12 cuentas/reconciliaciones, 15 invoices |
| Reports | 24 filas de detalle + series de 12 meses para las gráficas |
| Compliance | 12 excepciones, 20 CPL/pólizas, 25 verificaciones de wire, 40 líneas de audit log |
| Admin | 18 usuarios, 5 oficinas, 10 plantillas, 12 integraciones |

Nada de "Lorem ipsum", nada de "Test 1 / Test 2", nada de `foo@bar.com`.

---

## 7. Especificación detallada de cada sección

Estructura común de toda sección: `.qz-listhead` (título + subtítulo + botones de acción a la
derecha) -> barra de herramientas (búsqueda + filtros) -> contenido.

---

### 7.1 CONTACTS

**Qué es en Qualia:** el directorio de todas las personas y empresas que tocan las órdenes.

**Encabezado:** "Contacts" / "All parties, companies and vendors across your orders".
Botones: `New Contact`, `Import`, `Export` -> todos `qzShellAction()`.

**Barra de herramientas:**
- Buscador **funcional** (filtra por nombre, empresa, email, teléfono) con icono de lupa
- Chips de tipo **funcionales**: `All` · `Buyers` · `Sellers` · `Agents` · `Lenders` · `Attorneys` · `Vendors` · `Internal` — el activo con fondo `--qz-green` y texto blanco, cada uno con su conteo entre paréntesis
- Dos selects **deshabilitados**: `Office`, `Status`
- A la derecha: contador "35 contacts"

**Tabla** (`qz-tbl`, filas `tr.link`):

| Name | Type | Company | Email | Phone | Orders | Last Activity |
|---|---|---|---|---|---|---|

- `Name` en negrita, con avatar circular de iniciales de 24px a la izquierda
- `Type` como `.qz-badge`
- `Orders` = número de órdenes ligadas, como chip pequeño
- `Last Activity` = fecha relativa ("2 days ago", "Aug 8, 2026")
- Filas ordenadas por última actividad descendente

**Panel de detalle** (al hacer clic en una fila): panel deslizante desde la derecha, 420px, con
scrim semitransparente y botón de cerrar. Contenido:
- Cabecera: avatar 48px, nombre, rol, empresa
- Botones `Email` · `Call` · `Edit` -> `qzShellAction()`
- Bloque `.qz-kv`: Email, Phone, Mobile, Company, Address, Contact Type, Created, Created By
- **Linked Orders**: lista con número de orden + dirección + estado. Si la orden existe en
  `QZ_ORDERS`, el clic la abre de verdad (`qzOpenOrder(id)`); si no, toast.
- **Notes**: 2–3 notas estáticas con autor y fecha
- **Recent Activity**: timeline vertical de 4–5 eventos

**Estado vacío:** cuando la búsqueda no arroja nada, mensaje centrado con icono, "No contacts
match your search" y botón `Clear filters` (este sí funciona).

---

### 7.2 CALENDAR

**Qué es en Qualia:** los cierres, firmas y vencimientos del equipo.

**Layout:** dos columnas — sidebar izquierdo 240px + grilla del mes.

**Barra superior de la sección:**
- Flechas de mes anterior/siguiente (**funcionales**), botón `Today` (**funcional**, vuelve a Ago 2026)
- Título grande "August 2026"
- Toggle de vista: `Month` (activo, funcional) · `Week` · `Day` · `Agenda` -> los otros 3, toast
- Botón `New Event` -> toast

**Sidebar:**
- Mini calendario del mes, con el 12 marcado como hoy (círculo verde) y puntos bajo los días con eventos
- **My Calendars** — checkboxes **funcionales** que filtran la grilla, cada uno con su color:
  - `Closings` — verde `--qz-ocean`
  - `Signings` — azul `#3d7ab8`
  - `Deadlines` — ámbar `--qz-gold`
  - `Recording` — gris `--qz-muted`
  - `Wire Cutoffs` — rojo `--qz-bad`
  - `Personal` — morado `#7c6bb0`
- **Offices** — lista con checkboxes deshabilitados
- Leyenda de colores

**Grilla del mes:** 7 columnas × 5–6 filas. Encabezados Sun–Sat. Días de otro mes en gris claro.
El día 12 con fondo tenue y número en círculo verde. Cada celda con altura mínima de 108px.

**Eventos** como píldoras de 18px de alto, texto de 11px, truncado con elipsis:
- Los `closingDate` de `QZ_ORDERS` -> `Closing · 5445 Main St` (28 ago), `812 Birchwood Ln` (20 ago), etc.
- Los `dueDate` de `QZ_TASKS` -> deadlines los 12, 13, 14, 15 de agosto
- ~30 eventos inventados más: firmas, grabaciones, cortes de wire, walkthroughs, vencimientos de payoff
- Si una celda tiene más de 3 eventos: `+2 more` -> abre popover con la lista completa del día

**Popover de evento** (clic en una píldora): tarjeta flotante read-only con tipo (chip de color),
título, hora (`10:30 AM – 11:30 AM`), orden ligada, dirección, participantes con avatares,
ubicación, y notas. Botones `Edit` / `Delete` -> toast.

---

### 7.3 ACCOUNTING

**Qué es en Qualia:** contabilidad fiduciaria (escrow/trust) de la agencia de título.

**Sub-navegación** (`.qz-subtabs`, todas funcionales):
`Overview` · `Receipts` · `Disbursements` · `Reconciliation` · `Invoices` · `Positive Pay`

**Overview**
- 4 tiles KPI: `Escrow Trust Balance $4,182,940.17` · `Pending Deposits $186,400.00` ·
  `Outstanding Checks $92,318.45` · `Last Reconciliation — Jul 31, 2026` con badge verde "Balanced"
- Cada tile: etiqueta pequeña en mayúsculas arriba, cifra grande abajo, delta contra el mes previo
- Tabla **Escrow Accounts**: `Account` | `Bank` | `Type` | `Balance` | `Last Reconciled` | `Status`
  (5 cuentas: Escrow Trust – Operating, Escrow Trust – Commercial, Recording Escrow, IOLTA, Operating)
- Panel lateral derecho: **Alerts** — "3 disbursements pending approval", "1 account not reconciled
  in 45 days", "Positive Pay file not sent today"

**Receipts** — tabla: `Date` | `Receipt #` | `Order` | `Payer` | `Method` | `Amount` | `Status` | `Received By`
- `Method` = Wire / Check / ACH / Cashier's Check, como badge
- `Status` = Deposited / Pending / On Hold
- Fila de totales al pie, en negrita
- Botones `New Receipt`, `Export` -> toast

**Disbursements** — tabla: `Date` | `Check/Wire #` | `Order` | `Payee` | `Method` | `Amount` | `Status` | `Approved By`
- `Status` = Issued / Cleared / Pending Approval / Void — con sus colores
- Los `Payee` deben incluir los nombres de `QZ_VENDORS`
- Las filas "Pending Approval" con fondo ámbar tenue

**Reconciliation** — el corazón visual de esta sección: panel de **conciliación a tres vías**
con tres columnas grandes (`Bank Balance` / `Book Balance` / `Trial Balance`), la misma cifra en
las tres, y un badge verde grande "IN BALANCE" con checkmark. Debajo, tabla del historial mensual:
`Period` | `Account` | `Bank` | `Book` | `Difference` | `Reconciled By` | `Date` | `Status`.
Un mes con diferencia distinta de cero, en rojo, estado "Under Review" — le da credibilidad.

**Invoices** — cuentas por cobrar de honorarios de título:
`Invoice #` | `Order` | `Bill To` | `Issued` | `Due` | `Amount` | `Balance` | `Status`
(Paid / Open / Past Due — las vencidas en rojo)

**Positive Pay** — lista de archivos generados: `Date` | `File Name` | `Account` | `Items` |
`Total` | `Status` | `Sent At`, con botón `Generate File` -> toast.

---

### 7.4 REPORTS

**Qué es en Qualia:** biblioteca de reportes de producción, financieros y de actividad.

**Layout:** rail izquierdo de 260px con el catálogo de reportes + contenido a la derecha.

**Rail izquierdo** — categorías colapsables, con el reporte activo resaltado en verde:
- **Production** — Order Volume · Closed Orders · Open Orders Aging · Orders by Source
- **Financial** — Revenue by Office · Revenue by Agent · Fee Analysis · Escrow Balances
- **Title** — Policy Production · Underwriter Remittance · Commitment Turnaround
- **Escrow** — Disbursement Summary · Trust Activity · Unreleased Funds
- **Compliance** — CPL Issuance · Exception Summary · Audit Activity
- **User Activity** — Productivity by User · Login History · Task Completion

Arriba del rail: buscador de reportes (funcional) y sección `Favorites` con 3 reportes.

**Contenido** (el reporte por defecto es *Order Volume*):
- Barra de filtros: `Date Range: Aug 1 – Aug 31, 2026` · `Office: All` · `User: All` ·
  `Order Type: All` — selects deshabilitados. Botones `Run Report`, `Schedule`, `Export CSV`,
  `Export PDF`, `Print` -> todos toast.
- Fila de 5 KPI: `Orders Opened 148 +12%` · `Orders Closed 121 -3%` · `Avg Cycle Time 34 days` ·
  `Revenue $412,860` · `Avg Fee $3,412`. Deltas verdes/rojos con flecha.
- **Dos gráficas en SVG inline escrito a mano** (sin librerías — el repo no usa ninguna y no vas a
  agregar una):
  1. **Barras verticales**, 12 meses (Sep 2025 – Ago 2026), dos series (Opened / Closed),
     ejes con líneas de rejilla finas `--qz-line`, etiquetas de 10px, leyenda arriba a la derecha
  2. **Dona**, distribución por tipo de orden: Purchase 62% · Refinance 21% · Cash 11% ·
     Commercial 6%, con el total al centro y leyenda lateral con valores
- Tabla de detalle: `Order` | `Property` | `Type` | `Opened` | `Closed` | `Cycle Days` |
  `Settlement Fees` | `Escrow Officer` | `Agent` — 24 filas, totales al pie
- Pie: "Generated Aug 12, 2026 at 9:14 AM by Training User · 24 of 148 rows shown"

---

### 7.5 COMPLIANCE

**Qué es en Qualia:** control de riesgo, ALTA Best Practices y rastro de auditoría.

**Sub-navegación:** `Overview` · `Exceptions` · `CPL & Policies` · `Wire Security` · `Audit Log` · `ALTA Best Practices`

**Overview**
- 4 tiles: `Open Exceptions 7` (rojo) · `CPLs Issued MTD 96` · `Policies Pending 14` (ámbar) ·
  `ALTA Compliance 92%` (con barra de progreso)
- Panel **Requires Attention**: 4 ítems críticos con severidad y orden ligada
- Panel **Recent Activity**: últimas 6 acciones de compliance

**Exceptions** — la cola de trabajo, es la pantalla que más se va a mirar:
`Severity` | `Order` | `Property` | `Exception` | `Opened` | `Owner` | `Age` | `Status`
- Severidad como badge: High (rojo) / Medium (ámbar) / Low (gris)
- Filas de ejemplo obligatorias (enlazan con el contenido que ya existe en el simulador):
  - **High** — "Legal description mismatch — Schedule A vs. purchase contract" · ORD-2026-1483
  - **High** — "Wire instructions changed after initial issuance — callback pending" · ORD-2026-1398
  - **Medium** — "HOA resale certificate not received" · ORD-2026-1512
  - **Medium** — "Payoff statement expires before scheduled closing date" · ORD-2026-1398
  - **Low** — "Borrower phone number missing area code" · ORD-2026-1483
  - + 7 más inventadas
- Chips de filtro por severidad y por estado (funcionales)
- Clic en una fila -> panel de detalle read-only: descripción, regla que la disparó, historial de
  resolución, documentos ligados. Botones `Resolve` / `Reassign` / `Waive` -> toast.

**CPL & Policies** — `Order` | `Lender` | `CPL #` | `Issued` | `Expires` | `Policy Type` |
`Jacket #` | `Underwriter` | `Status`. Las próximas a vencer en ámbar.

**Wire Security** — bitácora de verificación por llamada de retorno:
`Date` | `Order` | `Party` | `Instruction Type` | `Verification Method` | `Verified By` | `Result`
- `Result` = Verified (verde) / Failed (rojo) / Pending (ámbar)
- Banner arriba con la política: "All wire instructions must be verified by outbound callback to a
  previously known phone number. Never use a number contained in the wire request itself."
- Un registro "Failed — number in email did not match contact record" para que la pantalla enseñe algo

**Audit Log** — `Timestamp` | `User` | `Action` | `Object` | `Order` | `IP Address`
- 40 filas, mono-espaciado para timestamp e IP, orden descendente
- Nota arriba: "Audit records are immutable and retained for 7 years."
- Filtros de fecha y usuario deshabilitados

**ALTA Best Practices** — los 7 pilares como tarjetas, cada uno con nombre, descripción de una
línea, porcentaje, barra de progreso y estado (Compliant / Needs Review / Action Required):
1. Licensing · 2. Escrow Trust Accounting · 3. Privacy & Information Security ·
4. Settlement Processes · 5. Title Policy Production · 6. Insurance Coverage ·
7. Consumer Complaints

---

### 7.6 ADMIN

**Qué es en Qualia:** configuración de la agencia. Todo aquí está **deshabilitado por diseño**.

**Layout:** rail izquierdo de settings de 240px + panel de contenido.

**Rail:** `Users & Roles` · `Offices` · `Order Templates` · `Workflow Templates` ·
`Document Templates` · `Fee Schedules` · `Integrations` · `Notifications` · `Security` · `Audit`

**Users & Roles** (vista por defecto)
- Botones `Invite User`, `Export` -> toast
- Buscador funcional + chips por rol
- Tabla: `User` (avatar + nombre + email) | `Role` | `Office` | `Status` | `Last Login` | `2FA` | `Actions`
- 18 usuarios con roles: Administrator, Escrow Officer, Title Examiner, Closer, Processor,
  Accounting, Virtual Assistant, Read Only
- `Status` = Active / Invited / Disabled. `2FA` = check verde o guion gris
- `Actions` = iconos de editar/desactivar -> toast
- Debajo, **Permission Matrix**: tabla con permisos en filas (View Orders, Edit Orders, Delete
  Orders, Issue CPL, Disburse Funds, Reconcile Accounts, Manage Users, View Reports, Export Data,
  Access Audit Log) y roles en columnas, con checkmarks verdes / guiones grises. Estática.

**Offices** — tarjetas o tabla: `Office` | `Address` | `Phone` | `States Licensed` |
`Underwriters` | `Users` | `Status`. 5 oficinas de Texas.

**Order Templates / Workflow Templates / Document Templates** — grillas de tarjetas: nombre,
descripción, número de pasos o campos, "Last modified by X on date", badge Active/Draft, y menú
de tres puntos -> toast.

**Fee Schedules** — tabla de tarifas: `Fee Name` | `Type` | `Basis` | `Amount / Rate` |
`Applies To` | `Effective Date`. Incluye Settlement Fee, Title Search, Examination, Endorsements,
Recording Fees, Wire Fee, Courier.

**Integrations** — grilla de tarjetas con logo/inicial, nombre, descripción de una línea, badge
`Connected` (verde) o `Not Connected` (gris) y botón `Configure` -> toast:
Underwriter (First American, Old Republic, Stewart), e-Recording (Simplifile, CSC),
Payoffs, **DocuSign** <- guiño al otro módulo del repo, Notary Scheduling, Bank Feed / Positive Pay,
MLS, QuickBooks, Marketplace.

**Notifications** — lista de eventos con toggles **deshabilitados** por canal (Email / In-App / SMS).

**Security** — password policy, session timeout, IP allowlist, SSO, data retention. Todos los
inputs `disabled`. Nota arriba: "Security settings are managed by your organization administrator."

**Audit** — mismo componente que Compliance -> Audit Log, reutilizado.

---

## 8. Modo demo (`?demo=1`)

Al final, agrega un modo demo que se activa con el query param `?demo=1`:
- Oculta la pestaña `Training` de la barra superior
- Oculta la franja `.td-strip` de test drive **excepto** la leyenda de "practice copy"
- Arranca en `orders` en lugar de `dashboard`

Es el link que se le pasa a un stakeholder para que vea un producto limpio, sin andamiaje de
curso. Impleméntalo leyendo `new URLSearchParams(location.search)` en `qualia-shell.js`, sin tocar
la lógica de arranque existente más allá del punto de enganche que ya definiste.

---

## 9. Fases de entrega

Entrega y verifica fase por fase. **No empieces la siguiente sin que la anterior corra limpia.**

| Fase | Contenido | Por qué en ese orden |
|---|---|---|
| **1** | Andamiaje (`QZ_SHELL_VIEWS`, los 4 toques, `qzShellAction`, CSS base) + **Contacts** | Establece el patrón; todo lo demás es repetición |
| **2** | **Calendar** | Es la que más impresiona visualmente y no depende de nada |
| **3** | **Accounting** | La más densa en datos |
| **4** | **Reports** (incluye las gráficas SVG) | La más pesada en CSS/SVG |
| **5** | **Compliance** | Reutiliza mucho de Accounting |
| **6** | **Admin** + modo demo | Cierre |

Al terminar cada fase: captura de pantalla + confirmación de que la consola está limpia.

---

## 10. Criterios de aceptación

Al terminar, TODO esto debe ser cierto:

**Funcional**
- [ ] Las 6 pestañas abren su pantalla; la pestaña activa se subraya en verde sola
- [ ] Ninguna consola con errores ni warnings en ninguna sección
- [ ] Los buscadores y chips de filtro filtran de verdad
- [ ] Cada botón de escritura muestra el toast; **ningún clic queda sin respuesta**
- [ ] Ningún link roto, ningún `href="#"` sin handler, ninguna imagen faltante

**No-regresión (lo más importante)**
- [ ] Completar la Lección 1 de principio a fin funciona igual que antes
- [ ] El examen abre, califica y reporta igual que antes
- [ ] El tour guiado funciona igual que antes
- [ ] `git diff Quialia/qualia-data.js` -> **vacío**
- [ ] `git diff Quialia/qualia-app.js` -> **solo** los cambios de los puntos (1), (2) y (4)
- [ ] `git diff assets/` -> **vacío**
- [ ] Buscar `qzMark(` en `qualia-shell.js` -> **0 resultados**
- [ ] Buscar `localStorage` en `qualia-shell.js` -> **0 resultados**
- [ ] Borrar `localStorage` y recargar: la app arranca en el login como siempre

**Visual**
- [ ] Comparado lado a lado contra `core.png`, las secciones nuevas se leen como el mismo producto
- [ ] Cero colores fuera de los tokens de `qualia.css:13`
- [ ] Ningún `border-radius` mayor a 4px
- [ ] Funciona de 1280px a 1920px de ancho sin scroll horizontal en el body
- [ ] Ninguna librería externa agregada; ninguna petición de red nueva

**Código**
- [ ] Comentarios en inglés, explicando el *porqué* y no el *qué* — igual que el resto del repo
- [ ] Banners de sección al estilo de `qualia.css`
- [ ] Sin `!important`, sin variables globales nuevas fuera del prefijo `QZS_`/`qzShell`

---

## 11. Decisiones ya tomadas — no las vuelvas a preguntar

- Vanilla JS. **No** agregues React, Vue, Tailwind, Chart.js, ni ninguna dependencia.
- Los datos son **ficticios y hardcodeados**. No hay API, no habrá API.
- Los textos de la interfaz van **en inglés** (el producto es en inglés). Los comentarios de
  código, también en inglés.
- Las lecciones **no se tocan ni se borran ni se reorganizan**.
- Si falta una captura de referencia de alguna sección, **constrúyela con el lenguaje visual de
  `core.png`** y déjalo anotado; no te bloquees esperando.

**Sí pregunta si:** te ves obligado a modificar un archivo fuera de los 4 puntos de enganche, o si
algo de este documento choca con lo que encuentras en el código.
