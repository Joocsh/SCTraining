# PROMPT MAESTRO — AppFolio: reconectar el curso con el producto

> Pásale este documento completo a un agente de código, o dile:
> **"sigue `AppFolio/PROMPT-appfolio.md`"**.
>
> Este documento **reemplaza y anula** a `PROMPT-appfolio-1-contrato.md`,
> `-1b-reparaciones.md`, `-2-mundo.md`, `-3-curriculum.md` y `-4-chasis.md`, borrados el
> 2026-08-26. No los busques.
>
> Todo número de aquí fue **medido ejecutando el simulador el 2026-08-26**. El §9 trae los
> scripts para volver a medirlo.

---

## 0. Alcance

Trabajas **exclusivamente** en `AppFolio/`. No toques `Quialia/`. No toques `Docusign/`.
No toques `assets/`.

Sitio estático, vanilla JS, sin build. Se sirve con `py -m http.server 5799` desde la raíz y se
abre en `http://localhost:5799/AppFolio/testdrive-appfolio.html`.
Con `?selftest=1` corre el banco de pruebas en pantalla.

---

## 1. El titular

**El producto está bien. El curso no llega a él.**

De los 47 pasos guiados que componen las 13 lecciones, **42 no encuentran su objetivo en
pantalla**. Las 13 lecciones están afectadas. No es un defecto de contenido: el contenido existe
y es bueno. Es que el enrutador nunca aprendió a abrir las pantallas donde vive.

Dos arreglos pequeños, **ya probados en vivo durante esta auditoría**, suben ese número de
**5 pasos resueltos a 29**. El resto necesita anclajes en el marcado y dos ids caducados.

---

## 2. Reglas duras

### 2.1 Lo que no se toca

`appfolio-data.js` completo (lecciones, escenarios, bancos, examen), `AF_LS_KEY`, `afStore`,
`afSave()`, `afLoad()`, `assets/js/sim-engine.js`.

**Excepción única y explícita:** el **D4** de este documento corrige dos ids de solicitud
caducados dentro de `appfolio-data.js` — `APP-0001` (2 ocurrencias) y `APP-0004` (11). Es una
sustitución de cadenas, nada más.

### 2.2 Invariantes que deben seguir siendo ciertos

1. **Dos almacenes.** `afStore` → `localStorage['af_va_training_v1']`, sólo las 10 claves
   académicas (`checklist, scenarios, reviews, reconciles, composes, triages, exam, lessonsDone,
   shuffleSalt, tourSeen`). `afDemo` → **sólo memoria**, capa de diff (`overrides / created /
   purged`) sobre el catálogo inmutable. Verificado: mutar el sandbox no toca `localStorage`.
2. **Reset de fábrica al refrescar.**
3. **La contabilidad fiduciaria cuadra.** `afAuditMoney()` devuelve `[]`. La cuenta trust iguala
   la suma de subsaldos de propietarios ($215.800,00). Operating, trust y depósitos siguen
   separados.
4. **Salir del Test Drive no borra el expediente académico.** La franja superior de este módulo
   deliberadamente **no** llama a un reset, a diferencia de los otros dos. No se lo añadas.
5. **Sin botón `+ New` global.** Las acciones de creación viven en el rail derecho, contextuales
   a la página, como en el producto real.

### 2.3 Lo que ya está bien — no lo reescribas

| Cosa | Estado medido |
|---|---|
| Errores de consola | **0** en 43 pantallas recorridas + la corrida completa del selftest |
| Funciones llamadas y no definidas | **1** (`afMoney`) de 215 identificadores — ver **D2** |
| Selftest `?selftest=1` | **38 pass / 1 fail** a 1440×900. El único fallo real es **D5**. (Con la pestaña sin componer, `innerWidth` vale 0 y aparece un segundo fallo falso — ver **D10**.) |
| Portafolio | 12 propiedades · 85 unidades · 74 contratos · 74 residentes · 18 propietarios · 14 proveedores · 40 órdenes de trabajo · 15 guest cards · 10 solicitudes · 12 tareas |
| Asientos de libro mayor | **1.725**, con 73 de 74 residentes con historial propio |
| Mezcla de cartera | 6 unifamiliares · 3 dúplex · 1 fourplex · 1 de 24 unidades · 1 de 45. Realista. |
| Flujos con modal | **17 modales**, 11 guardados, 8 acciones de negocio |
| Chasis | Rail izquierdo oscuro, subnav, rail derecho. Fiel a `video-layout-nav/`. |
| Ciclo de vida completo | Generar contrato → firmar → cobrar depósito → move-in → move-out, con contabilidad cuadrada en cada paso. Verificado por el selftest. |

**No refactorices el modelo de datos. No reconstruyas el chasis. No toques la contabilidad.**

---

## 3. Lo que NO es un defecto

Para que nadie "arregle" lo que está bien:

- **`editable: 0` en las páginas de lista.** AppFolio hace la captura en modales, no en línea.
  Los 17 modales son el patrón correcto. **No conviertas las tablas en formularios.**
- **Las vistas de detalle rinden ~60 caracteres sin argumento.** Es el empty state, correcto.
- **Las propiedades unifamiliares tienen páginas cortas.** Tienen una unidad. Correcto.

---

## 4. Los defectos, medidos

### D1 — `afGoto` no sabe abrir ninguna pantalla del currículum · **24 pasos**

`appfolio-app.js:1016`. `afGoto(view, extraId)` guarda el argumento para siete vistas de detalle
(`property-detail`, `unit-detail`, `resident-detail`, `owner-detail`, `work-order`,
`application`, `lease-detail`) más `lesson`. **No tiene ningún caso para `scenario`, `review`,
`compose`, `reconcile` ni `triage`.**

Los cinco renderizadores leen un estado que **nadie asigna nunca**:

| Renderizador | Línea | Lee | ¿Se asigna en algún sitio del repo? |
|---|---|---|---|
| `afScenarioDetailHTML` | 3826 | `afState.scenarioId` | **No** |
| `afReviewDetailHTML` | 3891 | `afState.reviewId` | **No** |
| `afReconcileDetailHTML` | 4027 | `afState.reconcileId` | **No** |
| `afComposeDetailHTML` | 4091 | `afState.composeId` | **No** |
| `afTriageDetailHTML` | 4173 | `afState.triageId` | **No** |

Ni siquiera están declaradas en `afState`. Resultado: **toda la capa evaluada del curso
—14 escenarios, 5 auditorías, 3 redacciones, 1 conciliación, 1 triaje— rinde siempre un empty
state.** Probado: `afGoto('scenario','af_s3_1')` → *"Scenario not found"*, y `af_s3_1` **sí existe**
en `AF_SCENARIOS`. Es enrutado puro, no faltan datos.

Ambos caminos del motor pasan por aquí: la ruta del walkthrough (`sim-engine.js:309`, que sólo
llama `walk.setup()`) y la del botón "Go" (`afLessonStepNavigate` → el mismo `afGoto`).

**El arreglo, verificado en vivo:**

```js
if (view === 'scenario')  { afState.scenarioId  = extraId; }
if (view === 'review')    { afState.reviewId    = extraId; }
if (view === 'compose')   { afState.composeId   = extraId; }
if (view === 'reconcile') { afState.reconcileId = extraId; }
if (view === 'triage')    { afState.triageId    = extraId; }
if (view === 'accounting' && extraId) { afState.accountingTab = extraId; }
```

Declara además las cinco claves en `afState` con valor `null`.

### D2 — `afMoney` no existe · 9 llamadas

Un escaneo estático de los 215 identificadores `af*`/`sim*` invocados en `appfolio-app.js`
encuentra **exactamente uno sin definir**: `afMoney`, llamado **9 veces** en las líneas 3911,
3912, 3952, 3980, 3981, 4036, 4056, 4342 y 4343 — dentro de los renderizadores de **review**,
**reconcile** y **exam**.

El formateador real es **`afFmtMoney`** (línea 187).

Estaba oculto porque D1 hacía que esas vistas nunca se ejecutaran. Al arreglar D1 aparece de
inmediato: `ReferenceError: afMoney is not defined en appfolio-app.js:3910`. **Arregla D2 en el
mismo commit que D1 o romperás el examen.**

### D3 — 11 selectores de walkthrough no existen en ningún marcado · **~14 pasos**

Estos objetivos aparecen en `appfolio-data.js` y **cero veces** en todo el código de renderizado:

| Selector | Lección | Ocurrencias en el render |
|---|---|---|
| `button[data-prop="PROP-11"]` | L1 | 0 |
| `button[data-unit="UNIT-11-102"]` | L1 | 0 |
| `.af-pill-warn` | L1 | 0 |
| `.af-tbl-ledger` | L2 | 0 |
| `button[data-subtab="delinquency"]` | L3 | 0 |
| `button[data-post-pay="LEASE-0002"]` | L3 | 0 |
| `#afBtnSubmitPayment` | L3 | 0 |
| `.af-tbl-delinq tr[data-dq="DQ-04"]` | L4 | 0 |
| `button[data-gc-advance="GC-0001"]` | L5 | 0 |
| `button[data-gc-showing="GC-0001"]` | L5 | 0 |
| `.af-app-card` | L5, L9 | 0 |
| `button[data-action="complete-inspection"]` | L9 | 0 |
| `button[data-action="generate-deposit-itemization"]` | L11 | 0 |

Los valores de `data-action` que **sí** existen son: `collect-deposit`, `enter-invoice`,
`generate-lease`, `move-in`, `move-out`, `renew-lease`, `sign-lease`. Los dos de la tabla no
están entre ellos.

El currículum se escribió contra anclajes que el chasis nunca creó o que renombró después.
**Añade los atributos y clases al marcado; no reescribas las lecciones.** Un `data-*` en un botón
que ya existe es un cambio de una línea.

### D4 — Tres ids de solicitud caducados · **5 pasos**

| Referencia en `appfolio-data.js` | Existe |
|---|---|
| `APP-0001` (L5 paso 4) | **No** |
| `APP-0004` (L9 pasos 1–4) | **No** |

Las solicitudes reales son: `APP-FCRA-01`, `APP-FCRA-02`, `APP-ADA-01`, `APP-2026-004` … `-010`.

**Es peor que un walkthrough roto:** los `effect:` de la lección 9 llaman
`afGetApplication('APP-0004')`, que devuelve `null`, así que `a && a.leaseGenerated` es siempre
falso. **La lección 9 entera —generar contrato, cobrar depósito, inspección de entrada— no se
puede aprobar nunca.**

Elige la solicitud aprobada correcta del catálogo y sustituye las 13 ocurrencias. Es la única
edición autorizada en `appfolio-data.js`.

### D5 — `data-section="residents"` se renombró a `people` · 1 paso

El chasis renombró la sección a **People** (`appfolio-app.js:1127`), fiel al producto
(`video-layout-nav/12-properties-people-menu.png`). El paso 1 de la lección 2 sigue apuntando a
`a[data-section="residents"]`. Lo detecta el propio selftest.

Corrige el selector del paso. **No renombres la sección**: `People` es lo correcto.

### D6 — Reporting está stubbeado al 94%

De 47 controles en la sección Reporting, **44 llaman `afDemoAction`**, que hace exactamente esto:

```js
function afDemoAction(label) {
  simToast(label + ' is not available in this demo environment.');
}
```

Sólo **3 informes** computan de verdad: *Delinquency*, *Security Deposit Funds Detail*,
*Rent Roll*. Los 44 muertos incluyen *Balance Sheet*, *Income Statement*, *Cash Flow*,
*General Ledger*, *Trial Balance*, *Trust Account Detail*, *Rent Roll (Itemized)*, *Tenant
Ledger*, *Aged Receivable Detail*…

Con 1.725 asientos y una contabilidad que cuadra, **los datos para computarlos ya están**.
Reporting es una de las ocho secciones del rail; hoy es escaparate.

### D7 — Bancos de evaluación desbalanceados

| Banco | Ítems |
|---|---|
| `AF_SCENARIOS` | 14 |
| `AF_VERIFY_ITEMS` | 5 |
| `AF_COMPOSE_ITEMS` | 3 |
| `AF_RECONCILE_ITEMS` | **1** |
| `AF_TRIAGE_ITEMS` | **1** |
| `AF_EXAM_BANK` | 48 |

Conciliación y triaje tienen **un solo ítem cada uno**: no hay variación posible entre intentos,
y `shuffleSalt` no tiene nada que barajar.

### D8 — Monotonía en mantenimiento

40 órdenes de trabajo, **9 títulos distintos** y 8 categorías. Es mucho mejor que el resto del
mundo del módulo, pero un VA que abre diez órdenes ve el mismo texto tres veces.

### D9 — Una paleta rotulada "AUTHENTIC" que no lo es

`appfolio.css:20`:

```css
/* --- AUTHENTIC APPFOLIO BRAND PALETTE (Derived from Images-resources/) --- */
--af-brand: #0f2a4a;   /* AppFolio Deep Navy Header */
```

Muestreado sobre la única imagen auténtica de esa carpeta
(`video-layout-nav/01-dashboard-top.png`): el rail mide **`#2c292d`**, el activo **`#457dc8`**.
Ese azul marino no está ahí. Estaba en los `.jpg` generados por IA que se borraron el
2026-08-26 (`Images-resources/RESOURCES.md §1`).

El chasis usa el bloque honesto —`--af-v-sidebar: #2a272b`, que coincide con la medición— así
que **el rail está bien**. Lo que hay que arreglar es la etiqueta: quítale "AUTHENTIC" al bloque
`--af-brand` y márcalo como sin verificar, o rederívalo. Un comentario que miente sobre su
procedencia es peor que no tener comentario.

### D10 — Dos defectos del propio selftest

1. Mide el desbordamiento horizontal contra `innerWidth` sin comprobar que sea un número
   utilizable. Cuando la pestaña no está compuesta (headless, pestaña de fondo, pane oculto)
   `innerWidth` vale **0** y el test reporta *"691px of overflow"* donde no hay ninguno. A
   1440×900 el desbordamiento real es **0** y el selftest pasa a 38/1. Que aborte ese check con
   una nota si `innerWidth < 320`, en vez de dar un fallo falso.
2. `afAuditIntegrity()` valida que cada paso **tenga** un bloque `walk`, pero no que su `target`
   resuelva ni que su `viewArg` exista. Por eso reporta *"no broken references []"* con 42 pasos
   rotos y 5 ids muertos. **Amplíalo** — es la red que debió atrapar D1, D3, D4 y D5.

---

## 5. El trabajo, en orden

### Fase 1 — Reconectar el curso *(medio día, 42 → ~29 pasos vivos)*

1. D2: `afMoney` → `afFmtMoney` en las 9 llamadas (o define un alias).
2. D1: los seis casos en `afGoto` + declarar las cinco claves en `afState`.
3. D4: sustituir `APP-0001` (2 ocurrencias) y `APP-0004` (11).
4. D5: corregir el selector `residents` → `people`.

**No pases de aquí sin que el script del §9.2 dé `resolvedAfter: 29` o más.** Verificado durante
la auditoría: con 1 y 2 solos ya sube de 5 a 29.

### Fase 2 — Los anclajes que faltan *(D3, → 47/47)*

Añade al marcado los 11 selectores de la tabla de D3. Reglas:

- Un anclaje es un `data-*` o una clase en un elemento **que ya existe**. Si tienes que crear un
  botón nuevo para satisfacer una lección, para y dilo: significa que la lección describe algo
  que el producto no hace.
- `.af-tbl-ledger`, `.af-tbl-delinq`, `.af-app-card`, `.af-pill-warn` son clases en tablas y
  tarjetas que ya se rinden. Ponlas.
- `#afBtnSubmitPayment` va en el botón de envío del modal `afModalPostPayment`.
- `data-post-pay`, `data-gc-advance`, `data-gc-showing`, `data-dq`, `data-prop`, `data-unit` van
  en los botones de fila correspondientes.
- `data-action="complete-inspection"` y `="generate-deposit-itemization"`: comprueba primero que
  el flujo exista. Si no, es trabajo de la Fase 4.

### Fase 3 — Blindar el auditor *(D10)*

Amplía `afAuditIntegrity()` para que, por cada paso de lección, verifique:

- que `walk.target` resuelva tras ejecutar `walk.setup()`;
- que `viewArg` corresponda a un registro existente, según el tipo de `view`;
- que `view` sea una vista que `afGoto` sepa enrutar **con argumento**.

Cuélgalo del selftest. Un paso roto debe salir en rojo, no descubrirse una auditoría después.
Arregla también la medición de desbordamiento.

### Fase 4 — Reporting de verdad *(D6)*

Sube de 3 informes vivos a **≥ 15**, empezando por los que la contabilidad ya sostiene:
*Rent Roll (Itemized)*, *Tenant Ledger*, *Aged Receivable Detail*, *Trust Account Detail*,
*Trust Account Balance*, *Income Statement*, *Cash Flow*, *Balance Sheet*, *General Ledger*,
*Trial Balance*, *Property Directory*, *Tenant Directory*.

Los que sigan sin computarse **no se pintan como enlaces vivos**: van deshabilitados con un
`title` que diga por qué. Un control que promete y no cumple enseña un hábito falso.

### Fase 5 — Profundidad *(D7, D8)*

- `AF_RECONCILE_ITEMS` y `AF_TRIAGE_ITEMS`: de 1 a **≥ 4** cada uno.
- Títulos distintos de orden de trabajo: de 9 a **≥ 25** sobre las 40 órdenes.

### Fase 6 — Honestidad de procedencia *(D9)*

Corrige el rótulo de `--af-brand`. Si quieres una paleta actual de verdad, la referencia está en
`Images-resources/product-2025/01-performance-insights-hero.png`: AppFolio hoy usa un rail
**estrecho de iconos**, no el rail ancho con etiquetas de 2019. Eso es un cambio de chasis: no lo
hagas sin decidirlo explícitamente.

---

## 6. Reglas de estilo

- **Ningún toast que mienta.** `afDemoAction` es aceptable sólo donde la acción está fuera de
  alcance de verdad (búsqueda global, Help & Training, Customer Service). No para 44 informes.
- **Ninguna lección se reescribe para acomodar al producto**, salvo los dos ids de D4. Si una
  lección pide algo que el producto no hace, el producto está incompleto.
- **Toda escritura del sandbox pasa por `afDemo`**, nunca por `localStorage`.
- **Cero estilos inline nuevos.**
- El repo usa **CRLF**. Si editas con `sed -i` u otra herramienta POSIX, restaura los finales de
  línea o el diff saldrá con el archivo entero cambiado.
- Cualquier imagen nueva en `Images-resources/` necesita URL de origen verificable y una fila en
  `RESOURCES.md`. Lee su §1 antes de añadir nada.

---

## 7. Referencias visuales

`Images-resources/RESOURCES.md` documenta cada archivo. Resumen:

| Carpeta | Qué es | Para qué |
|---|---|---|
| `video-layout-nav/` | 32 capturas **reales** de `demobaumgardner.appfolio.com`, ~2018–2019 | Arquitectura de navegación, columnas de tabla, dónde viven las acciones. **No para color ni tipografía.** |
| `product-2025/` | 6 assets oficiales de appfolio.com, 2025 | Lenguaje visual actual y nomenclatura vigente (*Realm-X*, *Flows*, *Leasing CRM*, *Smart Maintenance*). Texto de relleno difuminado a propósito. |
| `brand/` | Los SVG que usa el código | — |

⚠️ **Se borraron cinco `.jpg` que eran mockups generados por IA**, no AppFolio. Ninguna estaba
referenciada. El detalle y las señales que los delataron están en `RESOURCES.md §1` — léelo antes
de traer una imagen nueva.

---

## 8. Criterios de aceptación

| # | Criterio | Hoy | Meta |
|---|---|---|---|
| 1 | Pasos de walkthrough que encuentran su objetivo | **5 / 47** | **47 / 47** |
| 2 | Lecciones sin ningún paso roto | **0 / 13** | **13 / 13** |
| 3 | Funciones llamadas y no definidas | 1 (`afMoney`) | **0** |
| 4 | Vistas del currículum alcanzables con argumento | 0 / 5 | **5 / 5** |
| 5 | `viewArg` que apuntan a registros inexistentes | 5 | **0** |
| 6 | Selectores de walkthrough ausentes del marcado | 11 | **0** |
| 7 | Lección 9 aprobable de principio a fin | **No** | **Sí** |
| 8 | Informes que computan | 3 / 47 | **≥ 15**, resto deshabilitado con motivo |
| 9 | `AF_RECONCILE_ITEMS` / `AF_TRIAGE_ITEMS` | 1 / 1 | **≥ 4 / ≥ 4** |
| 10 | Títulos distintos de orden de trabajo | 9 | **≥ 25** |
| 11 | `afAuditIntegrity()` valida targets y viewArgs | No | **Sí** |
| 12 | Selftest a 1440×900 | 38 pass / 1 fail | **todo verde** |
| 13 | Errores de consola en el recorrido completo | 0 | **0** |
| 14 | `afAuditMoney()` | `[]` | **`[]`** |
| 15 | Trust = suma de subsaldos de propietarios | ✅ | **✅** |
| 16 | `localStorage` sólo con las 10 claves académicas | ✅ | **✅** |

---

## 9. Cómo medir

### 9.1 El selftest

```
http://localhost:5799/AppFolio/testdrive-appfolio.html?selftest=1
```

Muta el sandbox a propósito; recargar lo deja como estaba.

### 9.2 Pasos de walkthrough que encuentran su objetivo

Pega esto en la consola sobre el simulador ya cargado:

```js
(() => {
  const rows = [];
  AF_LESSONS.forEach(L => (L.steps || []).forEach((s, i) => {
    if (!s.walk || !s.walk.target) return;
    try { if (s.walk.setup) s.walk.setup(); } catch (e) {}
    rows.push({ lesson: L.number, step: i + 1, target: s.walk.target,
                found: !!document.querySelector(s.walk.target) });
  }));
  const missing = rows.filter(r => !r.found);
  const bySelector = {}; missing.forEach(m => bySelector[m.target] = (bySelector[m.target] || 0) + 1);
  const byLesson = {};   missing.forEach(m => byLesson['L' + m.lesson] = (byLesson['L' + m.lesson] || 0) + 1);
  return { total: rows.length, resolved: rows.length - missing.length,
           missing: missing.length, bySelector, byLesson };
})()
```

Hoy: `{ total: 47, resolved: 5, missing: 42 }`.

### 9.3 Referencias muertas en el currículum

```js
(() => {
  const has = {
    scenario:  id => AF_SCENARIOS.some(x => x.id === id),
    review:    id => AF_VERIFY_ITEMS.some(x => x.id === id),
    compose:   id => AF_COMPOSE_ITEMS.some(x => x.id === id),
    reconcile: id => AF_RECONCILE_ITEMS.some(x => x.id === id),
    triage:    id => AF_TRIAGE_ITEMS.some(x => x.id === id),
    application: id => !!afGetApplication(id),
    'resident-detail': id => !!afGetResident(id),
    'property-detail': id => !!afGetProperty(id),
    'unit-detail': id => !!afGetUnit(id),
    'work-order': id => !!afGetWorkOrder(id),
    'lease-detail': id => !!afGetLease(id)
  };
  const dead = [];
  AF_LESSONS.forEach(L => (L.steps || []).forEach((s, i) => {
    if (!s.view || !s.viewArg || !has[s.view]) return;
    let ok = false; try { ok = has[s.view](s.viewArg); } catch (e) {}
    if (!ok) dead.push({ lesson: L.id, step: i + 1, view: s.view, arg: s.viewArg });
  }));
  return dead;
})()
```

Hoy: 5 entradas (`APP-0001` ×1, `APP-0004` ×4). Debe dar `[]`.

### 9.4 Funciones llamadas y no definidas

```js
fetch('/AppFolio/appfolio-app.js').then(r => r.text()).then(src => {
  const called = new Set();
  src.replace(/(^|[^.\w])((?:af|sim)[A-Za-z0-9_]+)\s*\(/g, (m, p, n) => (called.add(n), m));
  console.log([...called].filter(n => typeof window[n] !== 'function'));
});
```

Hoy: `["afMoney"]`. Debe dar `[]`.

### 9.5 Recorrido completo sin errores

```js
(() => {
  const errs = []; window.addEventListener('error', e => errs.push(e.message));
  let n = 0;
  const go = (v, a) => { try { afGoto(v, a); n++; } catch (e) { errs.push(v + '/' + a + ': ' + e); } };
  ['dashboard','properties','residents','owners','leasing','maintenance','accounting',
   'communications','reporting','tasks','settings','lessons'].forEach(v => go(v));
  afAllProperties().slice(0, 4).forEach(p => go('property-detail', p.id));
  afAllResidents().slice(0, 4).forEach(x => go('resident-detail', x.id));
  afAllWorkOrders().slice(0, 4).forEach(x => go('work-order', x.id));
  afAllApplications().slice(0, 4).forEach(x => go('application', x.id));
  return { pantallas: n, errores: errs, dinero: afAuditMoney(), integridad: afAuditIntegrity() };
})()
```

Hoy: 28 pantallas, 0 errores, `dinero: []`, `integridad: []`.

### 9.6 Reporting vivo vs stub

```js
(() => {
  afGoto('reporting');
  const links = [...document.querySelectorAll('#afRoot [onclick]')];
  const stub = links.filter(b => /afDemoAction/.test(b.getAttribute('onclick') || ''));
  return { vivos: links.length - stub.length, stub: stub.length };
})()
```

Hoy: `{ vivos: 3, stub: 44 }`.

---

## 10. Si algo choca

Este documento manda sobre cualquier comentario del código que lo contradiga. Si crees que
necesitas romper una de las reglas duras del §2, **detente y pregunta**.
