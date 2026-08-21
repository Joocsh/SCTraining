# PROMPT MAESTRO 1/3 — AppFolio: el contrato

> Pásale este documento completo a un agente de código, o dile:
> "sigue `AppFolio/PROMPT-appfolio-1-contrato.md`".
>
> Primero de una serie de tres. Éste fija **la arquitectura**: el esqueleto del módulo, los
> dos almacenes, el conmutador, el modelo de datos y el enrutador. No construye el mundo ni
> el currículum — eso es 2/3 y 3/3.
>
> **Al terminar éste, el módulo debe correr, navegar y estar vacío.** Ese es exactamente el
> objetivo: cimientos validables antes de comprometer 85 unidades y 13 lecciones.

---

## 0. Por qué existe este documento

El módulo Docusign necesitó **cinco** prompts maestros y Qualia va por el segundo, porque
ambos se construyeron primero y se les acopló la disciplina después. La separación entre curso
y producto en Qualia hoy es de **~0%**: un solo almacén guarda progreso y datos, y navegar
califica.

**AppFolio empieza de cero y no va a repetir ese camino.** Los dos almacenes, el conmutador
Sandbox/Lección, la taxonomía de controles y el determinismo entran en la línea uno, no en el
prompt número cinco.

Si en algún momento este documento te parece excesivo para "sólo un esqueleto": ese exceso es
el punto. Lo que aquí se fija mal cuesta cuatro prompts arreglarlo después.

---

## 1. Qué se construye y qué NO

### Sí, en este documento

- La carpeta del módulo, sus archivos y sus prefijos
- El enganche con la plataforma: `index.html`, orden de carga, `SCApp`, `SimEngine`
- **`afStore` y `afDemo`** — los dos almacenes, desde el principio
- **El conmutador Sandbox / Lección** — visible, funcional, desde el principio
- El shell visual: topbar, navegación, layout, tokens de marca
- `afState`, el enrutador de vistas y los estados vacíos
- **El esquema completo de todas las entidades** — el contrato que 2/3 va a rellenar
- La taxonomía A/B/C/D y el manejador único de tipo C

### No, en este documento

- **Datos del portafolio.** Nada de 12 propiedades ni 85 unidades. Un *seed mínimo* de 1
  propiedad, 2 unidades, 1 lease y 1 residente, sólo para probar que el enrutador y las
  tablas funcionan. **2/3 lo sustituye entero.**
- **Ninguna lección, ningún escenario, ningún examen.** `AF_LESSONS` existe como array vacío
  y `SimEngine.init()` se llama con él. Eso basta para demostrar que el enganche es correcto.
- Vistas con lógica de negocio real: ledgers que calculan, screening, conciliación. Cada
  vista existe, se navega y muestra su estado vacío. La carne es 2/3.

**Criterio de "terminado" de este documento:** el módulo abre, las 11 secciones navegan,
ninguna dice "vista no encontrada", el conmutador funciona, F5 borra el sandbox y no toca el
progreso, y la consola está limpia.

---

## 2. Decisiones ya tomadas — no las vuelvas a preguntar

1. **Vertical: residencial puro.** Casas unifamiliares, dúplex/cuádruplex y un edificio de
   departamentos. Sin comercial, sin HOA.
2. **Contabilidad completa, incluida la fiduciaria.** Recibos, facturas, cheques, draws,
   estados del propietario, conciliación bancaria, y la frontera entre cuenta operativa,
   fondos del propietario y depósitos de garantía.
3. **El lease se firma dentro de AppFolio**, con firma electrónica simulada propia. El
   producto real la tiene nativa. **Cero acoplamiento con el módulo Docusign.**
4. **Serie de tres prompts:** contrato (éste), mundo, currículum.
5. **El estado del producto vive en memoria. F5 borra.** `afStore` es sólo progreso académico.
6. **Conmutador Sandbox / Lección visible en la topbar**, misma aplicación.
7. Vanilla JS, sin dependencias, sin red, sin build. Interfaz y comentarios **en inglés**.

---

## 3. El contrato con la plataforma

### 3.1 Estructura de la carpeta

```
AppFolio/
  testdrive-appfolio.html      — shell de entrada
  appfolio.css                 — tokens de marca y estilos del núcleo
  appfolio-shell.css           — secciones periféricas
  appfolio-data.js             — CURRÍCULUM. Vacío en 1/3, congelado a partir de 3/3.
  appfolio-catalog-data.js     — catálogo del portafolio. Seed mínimo en 1/3.
  appfolio-app.js              — estado, navegación, vistas nucleares
  appfolio-shell.js            — Accounting, Reporting, Communications, Settings
  appfolio-tour.js             — tour guiado
  documents/                   — vacío en 1/3, salvo doc.css
  Images-resources/            — logo y capturas de referencia
```

**No repitas el error del nombre de `Quialia/`.** La carpeta se llama exactamente `AppFolio`.

### 3.2 Prefijos, obligatorios y sin excepciones

| Cosa | Convención | Ejemplo |
|---|---|---|
| Funciones | `af*` | `afGoto()`, `afRenderRoot()` |
| Currículum | `AF_*` | `AF_LESSONS`, `AF_TODAY` |
| Catálogo | `AFC_*` | `AFC_PROPERTIES`, `AFC_UNITS` |
| Fachada | `AFS_*` | `AFS_REPORT_CATALOG` |
| CSS del núcleo | `.af-` | `.af-topbar` |
| CSS de fachada | `.afs-` | `.afs-toolbar` |
| Progreso | `afStore` | clave `af_va_training_v1` |
| Producto | `afDemo` | **memoria, nunca almacenamiento** |
| Estado de vista | `afState` | |
| Manejador tipo C | `afDemoAction(label)` | manejador **único** |

### 3.3 Orden de carga

En `testdrive-appfolio.html`, exactamente este orden — la razón está en los comentarios de los
otros dos módulos: la fachada lee ayudantes que el núcleo define, y el núcleo lee `AF_TODAY`
que el currículum define.

```html
<link rel="stylesheet" href="../assets/css/styles.css">
<link rel="stylesheet" href="../assets/css/sim-engine.css">
<link rel="stylesheet" href="appfolio.css">
<link rel="stylesheet" href="appfolio-shell.css">
...
<script src="../assets/js/app-core.js"></script>
<script src="../assets/js/sim-engine.js"></script>
<script src="appfolio-data.js"></script>
<script src="appfolio-catalog-data.js"></script>
<script src="appfolio-app.js"></script>
<script src="appfolio-shell.js"></script>
<script src="appfolio-tour.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (window.SCApp && SCApp.requireAuth) SCApp.requireAuth();
  });
</script>
```

`sim-engine.css` va **antes** de `appfolio.css` para que el módulo pueda sobrescribir sus
tokens `--sim-*`. El overlay del walkthrough, los toasts y el modal de documentos los inyecta
`SimEngine.init()` — **no pegues ese marcado a mano**.

### 3.4 La franja de Test Drive

Copia el patrón exacto de los otros dos, con una corrección:

```html
<a class="td-strip-back" href="../index.html#test-drive-open">&larr; Test Drive</a>
```

**Sin `onclick="afResetProgress()"`.** Los otros dos módulos llaman ahí a su reset y con eso
**borran el progreso académico al salir** — es un bug heredado que Qualia arrastra. AppFolio
no nace con él. Salir de un test drive no puede costarle a nadie su expediente.

### 3.5 Alta en `index.html`

Dos sitios, siguiendo el marcado que ya existe:

1. `.td-launch-apps` → una fila `.td-mini-row` más
2. `.td-tiles` dentro de `#tdOverlay` → un `.td-tile` más, con clase de color propia (`af`)

Texto de la tarjeta: **"AppFolio — Properties, residents, leasing, maintenance and trust
accounting."**

`index.html` es un archivo grande y compartido. **Toca sólo esos dos bloques.**

### 3.6 `SimEngine.init()`

El motor ya está generalizado — su cabecera lo dice: *"un segundo consumidor cuesta una llamada
a `init()` en lugar de un fork"*. AppFolio es el tercero y **no se toca `assets/`**.

```js
function afInitEngine() {
  SimEngine.init({
    lessons: AF_LESSONS,              // array vacío en 1/3
    store: () => afStore,
    save: afSave,
    render: afRenderRoot,
    goHome: () => afGoto('dashboard'),
    showLesson: (id) => { afState.view = 'lesson'; afState.lessonId = id; afRenderRoot(); },
    currentLessonId: () => afState.lessonId,
    navigate: afLessonStepNavigate,
    stepDone: afLessonStepDone,
    stepLabel: afLessonStepLabel,
    stepStatus: afLessonStepStatus,
    selfFeedbackTypes: ['decide', 'verify', 'reconcile', 'compose', 'triage'],
    feedbackSelector: '.af-feedback, .sim-feedback',
    beforeStep: function () {},
    lessonEverComplete: afLessonEverComplete,
    noteLessonComplete: afNoteLessonComplete,
    resetLesson: afResetLesson,
    btnClass: 'af-btn'
  });
}
```

Las ocho funciones `afLesson*` / `afReset*` se escriben en 1/3 como **implementaciones
mínimas y correctas** sobre un array de lecciones vacío. 3/3 las llena, no las reescribe.

---

## 4. Los dos almacenes — el corazón del documento

### 4.1 `afStore` — progreso académico, en `localStorage`

Clave: `af_va_training_v1`. Contiene **exclusivamente** esto y nada más:

```js
const AF_STORE_DEFAULTS = {
  checklist: {},     // pasos de lección completados
  scenarios: {},     // respuestas de tipo decide
  reviews: {},       // tipo verify
  reconciles: {},    // tipo reconcile
  composes: {},      // tipo compose
  triages: {},       // tipo triage
  exam: null,
  lessonsDone: {},
  shuffleSalt: null,
  tourSeen: false
};
```

**Si alguna vez necesitas añadir una clave aquí, pregunta primero.** Todo lo que no sea una
respuesta calificada del alumno va al otro almacén.

### 4.2 `afDemo` — el producto, en memoria

Objeto nuevo en cada carga. `afDefaultDemo()` lo construye desde el catálogo. **F5 lo borra
por completo.**

```js
const AF_DEMO_DEFAULTS = {
  overrides: {},      // ediciones sobre entidades del catálogo, por tipo e id
  created: {},        // entidades que creó el visitante, por tipo
  purged: {},         // lápidas de lo que borró
  ledgerEntries: [],  // cargos y pagos que registró
  workOrders: {},     // cambios de estado
  applications: {},   // decisiones del embudo de leasing
  messages: [],       // comunicaciones enviadas
  tasks: {},
  notifications: [],
  settings: {},
  user: { /* el VA */ },
  filters: {}
};
```

### 4.3 Las tres reglas que no se negocian

1. **Ninguna escritura a `localStorage` fuera de `afSave()`.** Al terminar,
   `grep -n localStorage AppFolio/*.js` debe devolver **exactamente tres líneas**: la lectura
   en `afLoad()`, la escritura en `afSave()` y el `removeItem` en `afResetProgress()`.
2. Nada de `sessionStorage`, IndexedDB, cookies ni `window.name`. Todos sobreviven al F5 y por
   eso no sirven.
3. **`afLoad()` nunca lee `afDemo` de vuelta.** Un objeto nuevo en cada carga es el punto
   entero del modelo.

### 4.4 Los dos botones de reset

| Control | Qué hace | Tipo |
|---|---|---|
| **Reset sandbox** | `afDemo = afDefaultDemo()`. No toca ni una lección. | B |
| **Reset training progress** | `localStorage.removeItem('af_va_training_v1')`. No toca el sandbox. | B |

Separados, etiquetados sin ambigüedad, y cada uno dice en su confirmación **qué NO va a
borrar**. Viven en Settings.

---

## 5. El conmutador Sandbox / Lección

### 5.1 Comportamiento

`afState.mode`: `'sandbox'` | `'lesson'`. **No se persiste.** Cada carga arranca en `sandbox`.

- **Visible en la topbar**, junto al avatar. Dice en qué mundo está el alumno: en Sandbox nada
  cuenta para el curso.
- **Abrir una lección conmuta a `lesson` automáticamente.** Nadie debe descubrir a mitad de una
  lección que su trabajo no se estaba contando.
- **Salir de la lección vuelve a `sandbox`.**
- Conmutar a mano es tipo A y no pide confirmación: no destruye nada.
- En `?demo=1` **no se muestra** y el modo queda fijo en `sandbox`.

### 5.2 `afMark()` — la puerta

```js
function afMark(id) {
  /* Exploring the product must never accrue course credit. Everything that grades
     funnels through here, so one guard is the whole rule. */
  if (afState.mode !== 'lesson') return;
  ...
}
```

**Un solo `return`, no un guard repartido por los sitios que llamen.** Esa propiedad —que un
revisor confirme la separación leyendo una función— es la razón de que exista este diseño.

### 5.3 La invariante que decide si el módulo está bien construido

> La calificación vive **enteramente** en `afStore`. Lo que se escribe sobre una entidad del
> producto es siempre la *consecuencia visible* de una respuesta ya calificada, **nunca un
> insumo de la nota**.

Es la propiedad que hizo posible separar Qualia, verificada allí en cuatro funciones de
calificación. **En AppFolio se construye así desde el principio.** Si un cálculo de nota lee
`afDemo`, para y repórtalo.

### 5.4 La arruga que hay que mostrar, no esconder

Con el producto en memoria, tras un **F5 a mitad de lección** el paso sigue marcado (el
progreso persiste) pero **su efecto visible se revierte**. Es el coste conocido del modelo.

El banner de la lección debe poder detectar esa situación —paso marcado, efecto ausente— y
ofrecer rehacer la acción. **No lo resuelvas persistiendo el sandbox.**

---

## 6. Determinismo

1. **Cero `Math.random()` ejecutable.** La única excepción admitida es el salt del examen, y
   eso llega en 3/3. En 1/3 y 2/3 no debe existir ni uno.
2. **Cero reloj real.** `AF_TODAY = '2026-08-12'` — la misma fecha congelada que usan los otros
   dos módulos, para que los tres cuenten la misma semana. Toda fecha se mide contra ella.
   `new Date()` no aparece en ninguna parte salvo para medir duración de un examen.
3. **Dos cargas seguidas producen un portafolio idéntico byte por byte.** Cuando 2/3 genere el
   mundo, lo hará con un generador sembrado por el id de la entidad.
4. Escribe ya los ayudantes: `afToday()`, `afDaysFromToday(iso)`, `afAddDays(iso, n)`,
   `afFmtDate(iso)`, `afFmtMoney(n)`, `afHashString(s)`, `afMulberry32(seed)`.

---

## 7. La taxonomía de controles

- **A — Real.** Muta `afDemo`, la UI cambia al instante, F5 lo borra.
- **B — Real con confirmación.** Modal → efecto real. Para lo destructivo.
- **C — Toast honesto.** `afDemoAction('…')`, una frase, **un único manejador**.
- **D — Botón muerto. Prohibido.**

En 1/3 casi todo será C, porque no hay mundo que mutar todavía. **Eso es correcto y esperado.**
Lo que no es aceptable es un control sin `onclick`.

`afDemoAction()` se escribe una sola vez y todos los tipo C pasan por ella. Centralizarlo es lo
que permite auditar en un vistazo cuánto queda por convertir — y es la métrica con la que 2/3
va a medir su propio avance.

---

## 8. El shell visual

### 8.1 Referencia obligatoria

`AppFolio/Images-resources/` debe contener el logo y capturas de la aplicación real antes de
escribir una línea de CSS. Los otros dos módulos se construyeron así: `Quialia/Images-resourses/core.png`
es una captura del Qualia Core real, y el prompt de fidelidad de Docusign derivó sus tokens de
marca de la suya.

**Si la carpeta está vacía, para y pídelas.** No inventes la identidad visual: la fidelidad es
el principio que gobierna los otros dos módulos y una conjetura aquí se paga en el prompt
siguiente.

Deriva los tokens de las capturas y decláralos **todos** en `:root` de `appfolio.css`
(`--af-brand`, `--af-brand-dark`, `--af-accent`, `--af-bg`, `--af-panel`, `--af-line`,
`--af-text`, `--af-muted`, `--af-good`, `--af-warn`, `--af-bad`). Ni un color literal fuera de
ese bloque.

### 8.2 Layout

```
┌─ .td-strip ────────────────────────────────────┐
├─ .af-topbar ───────────────────────────────────┤
│  logo · nav · búsqueda global · + New · modo ·  │
│  notificaciones · avatar                        │
├─ .af-subnav (contextual por sección) ──────────┤
├─ .af-body ─────────────────────────────────────┤
│  #afLessonBanner                                │
│  #afRoot                                        │
└────────────────────────────────────────────────┘
```

- El banner de lección **fuera** de `#afRoot`, para que no se repinte con cada vista.
- Aprende del error documentado en Qualia: un banner metido en un contenedor `display:flex`
  se convirtió en una columna de 305px al lado de la app.
- Responsive de 1280px a 1920px sin scroll horizontal en el body. Menú hamburguesa por debajo
  de 1024px.

### 8.3 Navegación

Las 11 secciones, todas con vista desde el día uno:

```js
const AF_SECTIONS = [
  { id: 'dashboard',      label: 'Dashboard' },
  { id: 'properties',     label: 'Properties' },
  { id: 'residents',      label: 'Residents' },
  { id: 'owners',         label: 'Owners' },
  { id: 'leasing',        label: 'Leasing' },
  { id: 'maintenance',    label: 'Maintenance' },
  { id: 'accounting',     label: 'Accounting' },
  { id: 'communications', label: 'Communications' },
  { id: 'reporting',      label: 'Reporting' },
  { id: 'tasks',          label: 'Tasks' },
  { id: 'settings',       label: 'Settings' },
  { id: 'lessons',        label: 'Lessons', training: true }
];
```

**`training: true` se separa visualmente y desaparece en `?demo=1`**, igual que en los otros dos
módulos. Un stakeholder que abre el enlace debe ver sólo AppFolio.

### 8.4 Estados vacíos

Cada vista sin datos muestra un estado vacío **con carácter**: icono, una frase de qué va ahí,
y el control que lo llenaría. En 1/3 casi todas los mostrarán. Eso no es un defecto — es la
prueba de que el enrutador funciona.

Ninguna vista puede decir "view not found".

---

## 9. El modelo de datos

**Esta sección es el verdadero producto de este documento.** 2/3 rellena estos esquemas y 3/3
los referencia. Un campo mal puesto aquí cuesta dos prompts.

Todas las fechas en ISO `YYYY-MM-DD`. Todos los importes en **centavos, como enteros** — nunca
flotantes: la contabilidad fiduciaria no perdona un `0.1 + 0.2`.

### 9.1 Los tres ejes

```
PROPERTY ──< UNIT ──< LEASE ──< RESIDENT
    │                   │
    │                   └──< LEDGER_ENTRY
    │
    ├──< OWNERSHIP >── OWNER ──< OWNER_STATEMENT
    │
    └──< WORK_ORDER ──> VENDOR
```

**El eje central del módulo es la UNIDAD.** Es lo único que existe siempre: ocupada o vacía,
con lease o sin él. Todo cuelga de ahí.

### 9.2 Esquemas

```js
Property {
  id, name, address, city, state, zip, county,
  type: 'single-family' | 'duplex' | 'fourplex' | 'apartment',
  yearBuilt, unitCount, ownerIds[], managementFeePct,
  photoSeed, status: 'active' | 'inactive'
}

Unit {
  id, propertyId, label,            // "A", "101", "Main"
  beds, baths, sqft, marketRent,    // centavos
  status: 'occupied' | 'vacant-ready' | 'vacant-rehab' | 'notice',
  currentLeaseId | null, amenities[], lastRenovated
}

Lease {
  id, unitId, residentIds[],
  startDate, endDate, rentAmount, dueDay,
  depositHeld, petDeposit, petRent,
  status: 'active' | 'pending' | 'expired' | 'terminated' | 'notice-given',
  renewalOffered, moveInDate, moveOutDate | null,
  signatureStatus: 'unsigned' | 'sent' | 'partially-signed' | 'executed',
  signatures: [{ residentId, signedAt, method }]   // firma nativa, decisión 3
}

Resident {
  id, firstName, lastName, email, phone,
  type: 'primary' | 'cosigner' | 'occupant' | 'guarantor',
  moveInDate, portalActive, emergencyContact,
  vehicles[], pets[], assistanceAnimal: bool        // clave para la lección 8
}

LedgerEntry {
  id, leaseId, date, type: 'charge' | 'payment' | 'credit' | 'refund',
  category: 'rent' | 'late-fee' | 'deposit' | 'utility' | 'pet-rent' | 'nsf' | 'other',
  amount, memo, balanceAfter, postedBy, reversedBy | null
}

Owner {
  id, name, type: 'individual' | 'entity', email, phone, address,
  taxId, propertyIds[], distributionMethod, reserveAmount
}

WorkOrder {
  id, unitId, propertyId, reportedBy, reportedDate,
  category: 'plumbing' | 'hvac' | 'electrical' | 'appliance' | 'general' | 'landscaping',
  priority: 'emergency' | 'high' | 'normal' | 'low',
  status: 'new' | 'assigned' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled',
  description, vendorId | null, scheduledDate, completedDate,
  estimate, invoiceAmount, billTo: 'owner' | 'resident', entryNotice: bool
}

Vendor { id, name, trade, phone, email, insuranceExpires, w9OnFile, rating, coiOnFile }

Application {
  id, unitId, applicantName, email, phone, submittedDate,
  status: 'new' | 'screening' | 'approved' | 'conditional' | 'denied' | 'withdrawn',
  monthlyIncome, employmentVerified,
  screening: { creditScore, criminalFlags, evictionFlags, reportDate, agency },
  decision, decisionDate, adverseActionSent: bool,   // clave para la lección 7
  requestedAccommodation: bool                        // clave para la lección 8
}

GuestCard { id, unitId, name, email, phone, source, inquiryDate,
            status: 'new' | 'contacted' | 'toured' | 'applied' | 'lost', notes }

BankAccount {
  id, name, type: 'operating' | 'trust' | 'security-deposit',   // la frontera fiduciaria
  last4, balance, lastReconciled
}

Transaction {
  id, accountId, date, type: 'receipt' | 'disbursement' | 'transfer' | 'fee',
  amount, payee, propertyId | null, leaseId | null,
  glAccount, reference, cleared: bool, reconciledDate | null
}

OwnerStatement { id, ownerId, periodStart, periodEnd, income, expenses,
                 managementFee, netDistribution, status: 'draft' | 'sent' | 'paid' }
```

### 9.3 La capa de acceso

Mismo patrón de tres capas que Docusign, ya probado:

```js
afBase<Entity>(id)   // catálogo AFC_*
afGet<Entity>(id)    // catálogo + overrides de afDemo + creadas por el visitante
afAll<Entity>()      // concatena las tres fuentes, sin las purgadas
```

**El currículum gana siempre en colisión de id.** Cuando 3/3 introduzca entidades de lección,
ninguna del catálogo podrá sombrearlas.

### 9.4 Cero huérfanos — regla R2

**Todo id citado por cualquier entidad debe resolver.** Un `vendorId` en una orden de trabajo
que no abre a un proveedor, o un `unitId` en un lease que no existe, es el defecto que este
proyecto persigue desde el primer prompt — y el que Qualia todavía arrastra con ~24 números de
orden pintados en gris.

Escribe en 1/3 una función de auditoría, `afAuditIntegrity()`, que recorra todas las
colecciones y devuelva la lista de referencias rotas. **2/3 la usará como criterio de
aceptación.** Con el seed mínimo debe devolver cero.

---

## 10. Reglas transversales

- **Cero red.** Ni `fetch`, ni XHR, ni WebSocket, ni fuentes remotas, ni CDN.
- **Cero dependencias.** Vanilla JS. Sin React, Tailwind, Chart.js, PDF.js, JSZip.
- **Cero `<form>` con submit.** Nada debe navegar fuera de la página.
- **Cero estilos inline.** El módulo nace limpio; que se quede así. Docusign tardó cuatro
  prompts en bajar de 248 a 82.
- Sin `!important`.
- **Importes en centavos, enteros.** Formateo sólo en la capa de presentación.
- Interfaz en inglés. Comentarios en inglés, explicando el **porqué**, no el qué.
- Cada control es de tipo A, B o C. Ninguno queda mudo.

---

## 11. Plan de pruebas

Servir con el `static-site` que ya existe en `.claude/launch.json`:

```bash
py -m http.server 5799
```

**Separación** (lo primero que se rompe si algo va mal)
1. Modo Sandbox: recorrer las 11 secciones, abrir el seed, editarlo → `afStore.checklist`
   sigue vacío. Compruébalo en la consola, no de memoria.
2. Conmutar a modo Lección → `afMark('test')` sí escribe.
3. F5 → el sandbox desaparece, `afStore` sigue intacto.
4. "← Test Drive" → **el progreso NO se borra**.
5. "Reset sandbox" → cuenta a fábrica, progreso intacto.
6. "Reset training progress" → progreso limpio, sandbox intacto.
7. `grep -n localStorage AppFolio/*.js` → **exactamente tres líneas**.
8. `grep -rn "sessionStorage\|indexedDB\|document.cookie" AppFolio/` → vacío.

**Shell**
9. Las 11 secciones navegan y ninguna dice "view not found".
10. Cada vista vacía muestra su estado vacío con su control.
11. `?demo=1`: sin conmutador, sin sección Lessons, sin nada de training.
12. De 1280px a 1920px sin scroll horizontal. Hamburguesa por debajo de 1024px.
13. Cada control tiene manejador; los tipo C pasan todos por `afDemoAction`.

**Datos**
14. `afAuditIntegrity()` devuelve cero referencias rotas.
15. Dos cargas seguidas producen el mismo seed byte por byte.
16. `grep -n "Math.random()" AppFolio/*.js` → vacío.
17. `grep -n "new Date()" AppFolio/*.js` → vacío.

**Motor**
18. `SimEngine.init()` corre sin errores con `AF_LESSONS` vacío.
19. La vista Lessons muestra su estado vacío en vez de reventar.
20. El tour guiado abre y se cierra.

**Técnico**
21. Consola limpia — cero errores y cero warnings — en las 11 secciones y en los tres modos.
22. Network: **cero peticiones** después de la carga inicial.
23. `index.html` sólo cambió en los dos bloques del Test Drive.

---

## 12. Criterios de aceptación

### Arquitectura
- [ ] `afStore` contiene **sólo** las 10 claves de progreso de §4.1
- [ ] `afDemo` es un objeto nuevo en cada carga y nunca se lee de almacenamiento
- [ ] `grep -n localStorage AppFolio/*.js` → exactamente tres líneas
- [ ] `afMark()` sale sin escribir cuando `afState.mode !== 'lesson'`, con **un solo** guard
- [ ] Los dos botones de reset existen y cada uno dice qué **no** borra
- [ ] Ningún cálculo de nota lee `afDemo`

### Shell
- [ ] Las 11 secciones navegan; ninguna dice "view not found"
- [ ] El conmutador es visible, funciona, y desaparece en `?demo=1`
- [ ] Los tokens de marca están todos en `:root`; ni un color literal fuera
- [ ] Cero estilos inline
- [ ] AppFolio aparece en `index.html` en los dos bloques

### Datos
- [ ] Los 13 esquemas de §9.2 están definidos y documentados
- [ ] Las tres funciones de acceso existen para cada entidad
- [ ] `afAuditIntegrity()` existe y devuelve cero con el seed
- [ ] Importes en centavos, enteros, en todas las entidades
- [ ] Cero `Math.random()`, cero `new Date()`

### Higiene
- [ ] Los 23 puntos del plan de pruebas pasan
- [ ] `git diff assets/` → vacío
- [ ] `git diff Docusign/` → vacío
- [ ] `git diff Quialia/` → vacío
- [ ] Consola limpia en los tres modos

---

## 13. Qué entregar

Un solo commit, con un mensaje que diga que es el contrato del módulo y que el mundo llega en
2/3. Y **un informe corto** con:

1. Los tokens de marca que derivaste y de qué captura salió cada uno
2. Cualquier esquema de §9.2 al que le hayas añadido o quitado un campo, y por qué
3. La cuenta de controles tipo C que dejaste — es la línea base contra la que 2/3 va a medir
4. Cualquier punto donde este documento te haya obligado a elegir sin decirte cómo

**Sí pregunta si:** `Images-resources/` está vacía, un cambio te obliga a tocar `assets/`,
`Docusign/` o `Quialia/`, necesitas una clave nueva en `afStore`, necesitas una dependencia, o
un esquema de §9.2 no aguanta un caso real del producto. En ese caso **para y repórtalo antes
de tocar nada**.
