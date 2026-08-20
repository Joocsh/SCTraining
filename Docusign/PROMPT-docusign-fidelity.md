# PROMPT MAESTRO — DocuSign a fidelidad visual total (rebrand 2024)

> Pásale este documento completo a un agente de código, o dile: "sigue `Docusign/PROMPT-docusign-fidelity.md`".

---

## 0. Rol y objetivo

Eres un ingeniero frontend trabajando en el simulador de entrenamiento de DocuSign dentro del repo
`SCTraining`. Tu tarea es llevar el módulo a **fidelidad visual con el Docusign real, generación
rebrand 2024**, para que cualquier persona pueda abrirlo, navegar y sentir que está dentro del
producto de verdad.

A diferencia del módulo de Qualia, aquí **no partes de cero**: ya existen 14 vistas implementadas,
incluyendo el wizard de envío de 4 pasos y la experiencia del firmante. Tu trabajo son tres cosas
distintas:

- **A — Elevar fidelidad** de lo que ya existe (Agreements, Reports, Settings tienen "sabor
  entrenador", no Docusign real)
- **B — Construir lo que falta** (PowerForms, Deleted, Bulk Send, Shared Access, el árbol real de
  Settings)
- **C — Cambiar el modelo de estado** (ver §5)

Sin backend, sin red, sin API. Lo que el visitante cree o edite se guarda **en memoria** y
desaparece al recargar. El progreso de las lecciones, no.

---

## 1. Regla número uno — NO TOCAR LAS LECCIONES

Requisito duro del cliente. Las 10 lecciones y el examen están terminados, calificados y validados.

**Prohibido modificar:**

| Archivo / símbolo | Por qué |
|---|---|
| `Docusign/docusign-data.js` completo | Lecciones, escenarios, triage, verify, compose y banco del examen |
| `DS_LESSONS`, `DS_SCENARIOS`, `DS_TRIAGE_ITEMS`, `DS_VERIFY_ITEMS`, `DS_COMPOSE_ITEMS`, `DS_EXAM_*`, `DS_CHECKLISTS` | Currículum y calificación |
| `dsMark()`, `dsStore`, `DS_LS_KEY` | Motor de progreso |
| `assets/js/sim-engine.js` (`SimEngine.*`) | Motor de walkthrough compartido con el módulo Qualia |
| `Docusign/docusign-tour.js` | Tour guiado |
| Vistas de entrenamiento: `dsLessonsHTML`, `dsLessonDetailHTML`, `dsScenarioDetailHTML`, `dsTriageHTML`, `dsVerifyHTML`, `dsComposeHTML`, `dsExamHTML` | Ya funcionan |

**A diferencia de Qualia, aquí SÍ vas a editar las vistas de producto** — es inevitable, porque son
las que hay que embellecer. Lo que no puedes romper son los contratos de §2.

---

## 2. Inventario de contratos congelados

Esta sección no existe en el prompt de Qualia y es la más importante de este. La interfaz que vas a
rediseñar **es la misma que califica las lecciones**. Trata lo siguiente como una API congelada.

### 2.1 Los 17 identificadores de calificación

Cada uno se dispara desde un punto concreto de la UI de producto. Si mueves, renombras o eliminas
el control que lo dispara **sin re-cablear la llamada**, rompes una lección.

```
ds_c1_1  ds_c1_2  ds_c1_3  ds_c1_4
ds_c2_1  ds_c2_2  ds_c2_3
ds_c3_1  ds_c3_2  ds_c3_3
ds_c4_1  ds_c4_2
ds_c5_1  ds_c5_2  ds_c5_3  ds_c5_4
ds_env_open
```

Dónde viven hoy (31 call sites en `docusign-app.js`):

| Disparador | Marca |
|---|---|
| Navegar a Agreements | `ds_c5_1` |
| Abrir un sobre | `ds_env_open` |
| Navegar al wizard | `ds_c1_1` |
| Navegar a Templates | `ds_c4_1` |
| Wizard: adjuntar documento | `ds_c1_2` |
| Wizard: cambiar acción de destinatario | `ds_c2_1` |
| Wizard: activar orden secuencial / paralelo | `ds_c2_2` / `ds_c2_3` |
| Wizard: avanzar a paso 2 / 3 | `ds_c1_3` / `ds_c2_1` |
| Wizard: colocar campo, auditar campos | `ds_c3_1`, `ds_c3_2`, `ds_c3_3` |
| Wizard: enviar | `ds_c1_3`, `ds_c1_4` |
| Detalle: enviar recordatorio | `ds_c5_2` |
| Detalle: corregir sobre | `ds_c5_3` |
| Detalle: anular sobre | `ds_c5_4` |
| Templates: usar plantilla | `ds_c4_2` |

**Regla:** antes de editar cualquier función que contenga `dsMark(`, anota qué control lo dispara.
Después de editarla, verifica que el mismo gesto del usuario sigue disparándolo.

### 2.2 Los 13 selectores DOM de los walkthroughs

`DS_LESSONS` apunta sus pasos guiados a estos selectores literales. **Deben seguir existiendo, con
el mismo id/estructura, y ser visibles y clickeables en el mismo momento del flujo.**

```
#sb-sent
.ds-new-btn
tr[data-env-id="ENV-2026-9041"]
#chkSeq
#dsAttachPurchaseAgreement
#dsBtnNextRecipients
#dsBtnNextFields
#dsBtnAddField
#dsBtnAuditFields
#dsBtnSendFinal
#dsBtnSendReminder
#dsBtnCorrectEnv
#dsBtnVoidEnv
```

Notas críticas:

- **`tr[data-env-id="..."]`** obliga a que la lista de Agreements siga siendo una `<table>` con
  filas `<tr data-env-id>`. Ver §6.3 — no es un problema, la lista de 2024 es de columnas.
- **`.ds-new-btn`** es el botón amarillo "NEW". En el rebrand se convierte en el botón azul
  "Start". **Cambia el texto y el estilo, conserva la clase `ds-new-btn`.**
- **`#sb-sent`** es el item "Sent" del sidebar. Conserva el id aunque reordenes el sidebar.

### 2.3 Otros contratos

- Las claves del mapa `views` en `dsRenderRoot()` (`docusign-app.js:304`): `dashboard`,
  `envelopes`, `envelope-detail`, `new-envelope`, `templates`, `reports`, `settings`,
  `signer-experience`, `lessons`, `scenarios`, `scenario-detail`, `triage`, `verify`, `compose`,
  `lesson`, `exam`, `complete-transaction`. **No renombres ninguna.** En particular `envelopes`
  sigue llamándose así aunque la etiqueta visible pase a "Agreements".
- `DS_LS_KEY = 'ds_va_training_v3'` y la forma de `dsStore`.

### 2.4 Prueba de regresión obligatoria

Antes de empezar y al terminar **cada fase**: correr las 10 lecciones de principio a fin y el
examen. Si un walkthrough no encuentra su objetivo o un paso no se marca, la fase no está lista.

---

## 3. Contexto del repo

Sitio 100% estático, vanilla JS, sin build, sin frameworks, sin librerías externas.

```
Docusign/
  testdrive-docusign.html   182 líneas   — shell: topbar, sidebar, #dsRoot
  docusign-app.js         3.018 líneas   — estado, navegación y todas las vistas
  docusign-data.js          794 líneas   — datos + currículum   <- NO TOCAR
  docusign.css            1.672 líneas   — tokens y estilos
  docusign-tour.js          140 líneas   — tour guiado           <- NO TOCAR
  Images-resources/                      — ver §4
  documents/                             — HTML de documentos y correos del entrenamiento
assets/js/sim-engine.js                  — walkthrough, toasts, modal  <- NO TOCAR
assets/js/app-core.js                    — SCApp (auth simulado)
```

Datos disponibles (solo lectura): `DS_ENVELOPES` (5 sobres completos con documentos,
destinatarios y campos), `DS_TEMPLATES` (3), `DS_TODAY = '2026-08-12'`.

---

## 4. El objetivo visual: Docusign rebrand 2024

### 4.1 Referencia principal

**`Docusign/Images-resources/Screenshot-2024-05-16-at-9.08.45-AM.webp`** es la única captura del
rebrand y manda sobre cualquier cosa que diga este documento. Ábrela y estúdiala antes de escribir
CSS. Muestra la vista *Agreements → Completed* y el sidebar.

`Blog_SharedAccess_fig1.png` es la generación **clásica** (anterior). **Ya no es la referencia de
estilo** — el amarillo, "Manage" y el logo "DocuSign eSignature" quedan fuera. Sigue siendo útil
solo como referencia de **arquitectura de información**: qué items existen en el sidebar, la línea
"Filtered by", el botón FILTERS y el footer legal.

> **Limitación conocida, decláralo en tu entrega:** solo tenemos UNA captura parcial del rebrand.
> Home, Templates, Reports, Settings, el wizard y la experiencia del firmante **no tienen
> referencia 2024**. Constrúyelas extendiendo con criterio el lenguaje visual de esa captura y deja
> anotado cuáles son inferidas. Si llegan capturas nuevas, esas mandan.

### 4.2 Qué cambia respecto a lo que hay hoy

| Elemento | Hoy (clásico) | Objetivo (2024) |
|---|---|---|
| Logo | "DocuSign eSignature" | wordmark **"docusign"** en minúscula + marca de lazo a color |
| Botón primario del sidebar | **NEW** amarillo `#ffc400` | **Start ▾** azul, ancho completo |
| Segunda pestaña | "Manage" | **"Agreements"** |
| "Forms" en el nav superior | — | **No existe**; PowerForms vive en el sidebar |
| Sidebar | lista plana | grupos **colapsables** con icono + "Show More" |
| Acento | amarillo | **azul** |
| Esquinas | 4px | 6–8px, más suaves |
| Títulos de página | 20px | **~34px, bold** |

### 4.3 Tokens

Los tokens actuales viven en `docusign.css:9`. **No borres los existentes** (los usa el resto del
CSS); **agrega** el set del rebrand y migra las superficies principales a él.

```css
/* Rebrand 2024 — MUESTREA los valores exactos del .webp con un color picker.
   Los de abajo son aproximaciones a partir de la captura; corrígelos al implementar. */
--ds24-blue:      #2b57d9;   /* botón Start, links, foco */
--ds24-blue-h:    #1f45b8;
--ds24-ink:       #1a1a1a;   /* títulos */
--ds24-text:      #333333;
--ds24-muted:     #6b6b6b;   /* subtítulos "From: ...", labels de columna */
--ds24-line:      #e0e0e0;
--ds24-bg:        #ffffff;
--ds24-sidebar:   #f7f7f7;
--ds24-sel:       #ececec;   /* item de sidebar seleccionado */
--ds24-green:     #1a8a4a;   /* estado Completed */
--ds24-pill:      #1c2b3a;   /* pill de filtro activo, fondo oscuro */
--ds24-radius:    6px;
```

Tipografía: Docusign usa una sans propietaria. Usa la pila del sistema
(`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) — **no cargues Google Fonts**.

### 4.4 Deuda visual a eliminar (alto impacto, riesgo cero)

- **106 caracteres emoji** en `docusign-app.js` (📩 ✏️ 📁 ⚠️ 📥 ⚙️ 🔄 📤 ✕ ▾…). Docusign no usa
  emoji en su UI y además se renderizan distinto en cada sistema operativo: es lo que más rápido
  delata que no es el producto real. **Reemplázalos todos por SVG inline de trazo**, 16px,
  `stroke-width:1.6`, `currentColor`. Define un objeto `DS_ICONS` al estilo de `QZ_ICONS` en el
  módulo de Qualia.
- **367 atributos `style="` inline**. No los migres todos de golpe, pero **cada vista que toques
  sale con sus estilos en `docusign.css`**, no inline. Es lo que hará que la siguiente iteración
  visual sea barata.

---

## 5. Modelo de estado dual — el nuevo requisito

Hoy todo vive en `localStorage` bajo `ds_va_training_v3` (`docusign-app.js:9` y `:96`, 24 puntos de
escritura). Eso hace que **F5 conserve todo**, lo cual es correcto para las lecciones e incorrecto
para la demo.

Requisito del cliente: **lo que el visitante toque se guarda localmente, y F5 lo borra todo.**

Precisión técnica — `sessionStorage` **también sobrevive al F5**, así que no sirve. Lo único que
cumple es **estado en memoria**.

### La solución: partir el estado en dos

```js
/* Lesson progress. Survives reload, exactly as before. Do not add demo state here. */
dsStore   -> localStorage['ds_va_training_v3']
             checklist, scenarios, reviews, triages, composes,
             exam, lessonsDone, tourSeen, shuffleSalt

/* Everything a visitor creates or edits while exploring. Plain in-memory object:
   a reload drops it, which is exactly what the demo wants. */
let dsDemo = dsDefaultDemo();   // NUNCA se serializa a localStorage
             overrides, drafts, folders, folderMap, auditLogs,
             user, notifications, settings, activeFolder,
             searchQuery, dateFilter
```

**Trabajo concreto:**

1. Mover de `DS_STORE_DEFAULTS` a `dsDemo`: `overrides`, `drafts`, `folders`, `folderMap`,
   `auditLogs`, `user`, `notifications`, `activeFolder`, `searchQuery`, `dateFilter`.
2. Revisar los **24 call sites de `dsSave()`** uno por uno: los que escriben progreso se quedan;
   los que escriben estado de demo pasan a mutar `dsDemo` y **pierden el `dsSave()`**.
3. `dsLoad()` carga `dsStore` de localStorage y siempre reinicia `dsDemo` a su default.
4. `dsResetProgress()` sigue limpiando la clave de localStorage.
5. Añadir un `dsResetDemo()` para el botón "Reset Sandbox".

**Bug que esto arregla de paso:** hoy la pantalla de Settings escribe en localStorage mientras el
usuario teclea —
`oninput="dsStore.user.name = this.value; dsSave();"` (`docusign-app.js:2818`, `:2822`, `:2826`) —
así que un visitante que juegue con Settings **deja el simulador alterado para el siguiente que lo
abra**. Con el split, se corrige solo.

**Verificación:** editar el nombre en Settings, crear un sobre, mover algo a una carpeta, pulsar
F5 → todo eso desaparece; el progreso de lecciones sigue ahí.

---

## 6. Especificación por pantalla

### 6.1 Topbar

`Home` · `Agreements` · `Templates` · `Reports` · `Settings` — activo en **negrita con subrayado
negro grueso** bajo el item, como en la captura. `Lessons` se mantiene como item de entrenamiento,
visualmente distinto, y **se oculta en modo demo** (§7).

- Izquierda: grid de apps de 9 puntos + wordmark **"docusign"** minúscula con la marca de lazo.
  Elimina el `<span class="ds-product-name">eSignature</span>` — el rebrand no lo muestra.
- Derecha: `?` de ayuda, campana de notificaciones con punto rojo, avatar circular gris.
- Fondo blanco, borde inferior de 1px.
- **`data-view="envelopes"` no cambia** aunque la etiqueta diga "Agreements".

### 6.2 Sidebar

Fondo `--ds24-sidebar`, ancho ~248px.

1. Botón **`Start ▾`** azul, ancho completo. **Conserva `class="ds-new-btn"`** (contrato §2.2).
2. Botón **`Shared Access ▾`** con borde, fondo blanco, debajo del anterior. Al pulsarlo, toast.
3. Grupo colapsable **ENVELOPES** (caret + icono de sobre), en small caps gris:
   - `Inbox` · `Sent` (**conserva `id="sb-sent"`**) · `Completed` · `Action Required`
   - Link **`Show More`** que despliega: `Drafts` · `Deleted` · `Bulk Send` ·
     `Waiting for Others` · `Expiring Soon` · `Authentication Failed`
   - El item activo con fondo `--ds24-sel` e icono relleno
4. **`PowerForms`** con icono de rayo, fuera del grupo.
5. Grupo **FOLDERS** con las carpetas de `dsDemo.folders` y su conteo.
6. Al final, separados y marcados como entrenamiento: `Lessons` · `Final Exam`. Ocultos en modo demo.

### 6.3 Agreements (la lista) — la pantalla clave

**Decisión ya tomada: se conserva la `<table>` con `tr[data-env-id]`.** No es un compromiso — la
lista de 2024 es de columnas con encabezados `NAME` y `STATUS`, así que una tabla es la estructura
correcta. Ganas fidelidad sin tocar el contrato de los walkthroughs.

De arriba abajo, replicando la captura:

1. **Título de página grande**: el nombre de la vista activa (`Completed`, `Inbox`, `Sent`…),
   ~34px, bold, `--ds24-ink`. Nada de subtítulo con descripción de curso.
2. **Fila de filtros**, todos como pills redondeadas:
   - Input de búsqueda con lupa, placeholder `Search Quick Views` — **funcional**
   - Pill **`Last 6 months ▾`** en estado activo: fondo oscuro `--ds24-pill`, texto blanco
   - Pill **`Sender ▾`** con borde, fondo blanco
   - Pill **`Advanced search ▾`** con borde
   - Link **`Clear`** a la derecha — funcional, limpia búsqueda y filtros
3. **Encabezados de columna**: `NAME` y `STATUS`, 11px, gris `--ds24-muted`, letter-spacing amplio.
   Sin fondo, solo un borde inferior fino.
4. **Filas** (`<tr class="link" data-env-id="...">`):
   - Checkbox a la izquierda
   - **Asunto en negrita**, ~15px, `--ds24-ink`
   - Debajo, `From: <remitente>` en 13px `--ds24-muted`
   - Columna STATUS a la derecha: **icono circular + etiqueta** —
     verde con check para `Completed`, ámbar de reloj para `Waiting`, gris para `Draft`,
     rojo para `Voided`, con borde para `Expired`
   - Altura de fila generosa (~72px) con separador fino. **La lista de 2024 respira mucho más que
     la clásica** — no la compactes.
5. Elimina de la fila: los chips de destinatarios, la columna de ID en `<code>`, el botón
   "Actions ▾" con emoji. Las acciones por fila pasan a un menú de tres puntos al hacer hover.

**Cuidado:** `dsOpenEnvelope()` debe seguir disparándose al hacer clic en la fila, y `ds_c5_1` /
`ds_env_open` deben seguir marcándose.

### 6.4 Home

Sin referencia 2024. Construye: saludo con el nombre del usuario, fila de tarjetas de acción
rápida (`Start now`, `Sign a document`, `Use a template`), un bloque "Action Required" con los
sobres que esperan al usuario, y actividad reciente. Las tarjetas de lección **solo en modo
entrenamiento**, nunca en modo demo.

### 6.5 Templates

Grilla de tarjetas con nombre, categoría, descripción, número de documentos y destinatarios
configurados, más `Use`, `Edit` y menú de tres puntos. Barra superior con búsqueda, filtro por
categoría y botón `New Template` (toast). Conserva el marcado de `ds_c4_1` y `ds_c4_2`.

### 6.6 Reports — reconstrucción completa

Lo que hay ahora son 4 stat cards y tres barras hechas con `<div>`, bajo un título inventado
("eSignature Analytics & Reports"). El Reports real es una **biblioteca de reportes**:

- Título de página grande: `Reports`
- Pestañas: `Overview` · `My Reports` · `Shared with Me` · `Templates`
- Fila de KPI con las cifras reales derivadas de `DS_ENVELOPES`: sobres enviados, completados,
  tasa de finalización, tiempo medio de firma
- **Dos gráficas en SVG inline escrito a mano**, sin librerías: barras de volumen por mes y dona de
  distribución por estado
- **Tabla de reportes guardados**: `Report Name` | `Type` | `Created By` | `Last Run` | `Schedule`,
  con menú de acciones por fila
- Botones `New Report`, `Export`, `Schedule` → toast

### 6.7 Settings — el árbol real

Lo que hay es un panel con 4 inputs. El Settings real es un **rail de navegación con decenas de
páginas**. Decisión ya tomada: **rail completo visible, 8–10 páginas construidas, el resto con un
estado vacío elegante.**

Rail agrupado:

- **ACCOUNT** — Account Profile · Plan and Billing · Regional Settings · Audit Logs
- **USERS AND GROUPS** — Users · Groups · Permission Profiles · Signing Groups
- **SIGNING SETTINGS** — Sending Settings · Signing Settings · Reminders and Expiration ·
  Envelope Custom Fields · Document Custom Fields
- **BRANDING** — Brands · Email Templates
- **INTEGRATIONS** — Connected Apps · API and Keys · Connect (webhooks)
- **SECURITY** — Security Settings · Identity Verification · Trust Center

**Construye estas 9:** Account Profile · Users · Groups · Permission Profiles ·
Sending Settings · Reminders and Expiration · Brands · Connected Apps · Security Settings.

Cada una con la estructura real de Docusign: título, texto de ayuda, secciones separadas por
divisores, y **todos los controles `disabled`**.

Las demás muestran un estado vacío con el nombre de la página, un icono tenue y la leyenda
*"This settings page is not available in the demo environment."* — centrado y cuidado, no un error.

**Elimina** el bloque "Training Sandbox Management" de la página principal de Settings. Mueve
`Reset Sandbox` y `Export JSON` al menú del avatar, marcados como herramientas de entrenamiento.

### 6.8 Pantallas nuevas

- **Deleted** — lista de sobres eliminados con banner *"Items are permanently deleted after 24
  months"* y acciones `Restore` (toast) y `Delete Permanently` (toast).
- **Bulk Send** — lista de envíos masivos: `Batch Name` | `Template` | `Recipients` | `Sent` |
  `Status` | `Completion`, con botón `New Bulk Send` (toast).
- **PowerForms** — tarjetas de formularios públicos con nombre, plantilla de origen, URL,
  número de respuestas y estado, más `Copy Link` (toast) y `View Responses` (toast).
- **Shared Access** — quién comparte su bandeja contigo y con quién compartes la tuya, con el
  banner azul de la captura clásica: *"You're managing envelopes on behalf of …"*.
- **Footer legal** — reponerlo en `testdrive-docusign.html`, hoy omitido a propósito
  ([línea 153](Docusign/testdrive-docusign.html:153)):
  `English (US) ▾ · Contact Us · Terms of Use · Privacy · Intellectual Property · Trust ·
  Copyright © 2026 Docusign, Inc. All rights reserved`

### 6.9 Wizard y experiencia del firmante

**Toca lo mínimo.** Concentran 12 de los 17 identificadores de calificación y 9 de los 13
selectores. Limítate a: re-brandear colores (amarillo → azul), sustituir emoji por SVG, y ajustar
tipografía y espaciado. **No reestructures el flujo de 4 pasos ni renombres un solo id.**

---

## 7. Interacción, "sin backend" y modo demo

Helper único para todo lo que no se implementa:

```js
/* Every action the demo does not implement answers here. */
function dsDemoAction(label) {
  simToast(`${label} is not available in this demo environment.`);
}
```

**Sí funciona** (contra `dsDemo`, en memoria): buscar y filtrar, cambiar de vista y de carpeta,
abrir el detalle de un sobre, crear y enviar un sobre en el wizard, firmar en la experiencia del
firmante, mover a carpeta, anular, corregir, reenviar, editar Settings, marcar notificaciones.
Todo eso **se pierde en F5, y así debe ser**.

**No funciona** → `dsDemoAction()`: exportar, imprimir, descargar, programar, facturación,
invitar usuarios, conectar integraciones, y las páginas de Settings no construidas.

Reglas duras: ningún `fetch`/XHR; ninguna escritura nueva a `localStorage` fuera de `dsStore`;
ningún `<form>` con submit; ningún control sin respuesta al clic.

**Modo demo (`?demo=1`)**: oculta `Lessons` del topbar y del sidebar, oculta `Final Exam`, oculta
las tarjetas de lección de Home, y conserva la leyenda de "practice copy" de la franja superior.
Es el link que se entrega a un stakeholder.

---

## 8. Fases

**Verifica la regresión de §2.4 al terminar cada una. No empieces la siguiente sin eso.**

| Fase | Contenido | Toca código calificado |
|---|---|---|
| **0** | Inventario de contratos verificado en vivo + correr las 10 lecciones y el examen como línea base | No |
| **1** | Split de estado `dsStore`/`dsDemo` (§5) | Sí, indirecto |
| **2** | `DS_ICONS` y sustitución de los 106 emoji + footer legal | No |
| **3** | Rebrand del chrome: topbar 2024, sidebar con grupos, Start azul, tokens `--ds24-*` | Roza `.ds-new-btn` y `#sb-sent` |
| **4** | **Agreements**: título grande, pills de filtro, columnas NAME/STATUS, filas nuevas | **Sí** |
| **5** | **Settings**: rail completo + 9 páginas + estado vacío | No |
| **6** | **Reports**: biblioteca real + gráficas SVG | No |
| **7** | Home, Templates, Deleted, Bulk Send, PowerForms, Shared Access | No |
| **8** | Re-brandeo ligero del wizard y del firmante + modo demo | **Sí, con cuidado máximo** |

La fase 0 no es burocracia: es lo que permite que las fases 1, 4 y 8 no rompan el entrenamiento.

---

## 9. Criterios de aceptación

**No-regresión — lo más importante**
- [ ] Las 10 lecciones se completan de principio a fin, con sus walkthroughs encontrando cada objetivo
- [ ] El examen abre, califica y reporta igual que antes
- [ ] El tour guiado funciona igual que antes
- [ ] `git diff Docusign/docusign-data.js` → **vacío**
- [ ] `git diff assets/` → **vacío**
- [ ] Los 17 identificadores siguen disparándose desde su gesto equivalente
- [ ] Los 13 selectores siguen existiendo y siendo visibles en su momento del flujo

**Persistencia**
- [ ] Crear un sobre, editar Settings, mover a carpeta → F5 → **todo desapareció**
- [ ] Completar una lección → F5 → **el progreso sigue ahí**
- [ ] `grep -n localStorage Docusign/docusign-app.js` → solo las líneas de `dsStore`
- [ ] Escribir en Settings ya no deja rastro para el siguiente visitante

**Visual**
- [ ] Lado a lado contra `Screenshot-2024-05-16-at-9.08.45-AM.webp`, Agreements se lee como el mismo producto
- [ ] **Cero emoji** en la UI: `grep -P "[\x{1F300}-\x{1FAFF}]" Docusign/docusign-app.js` sin resultados
- [ ] Ni un solo "NEW" amarillo ni la palabra "Manage" visible
- [ ] Sin errores ni warnings de consola en ninguna vista
- [ ] De 1280px a 1920px sin scroll horizontal en el body
- [ ] Ninguna librería externa; ninguna petición de red; ninguna fuente remota

**Código**
- [ ] Cada vista tocada sale con sus estilos en `docusign.css`, no inline
- [ ] Comentarios en inglés, explicando el *porqué* — igual que el resto del repo
- [ ] Sin `!important`

---

## 10. Decisiones ya tomadas — no las vuelvas a preguntar

- **Generación: rebrand 2024.** No la clásica amarilla.
- **La lista de Agreements sigue siendo una `<table>` con `tr[data-env-id]`.** No es un compromiso:
  la lista de 2024 es de columnas y la tabla es la estructura correcta.
- **Settings: rail completo, 9 páginas construidas, el resto con estado vacío.**
- **Estado dual**: lecciones en `localStorage`, todo lo del visitante en memoria pura.
- Vanilla JS. **No** agregues React, Tailwind, Chart.js, Google Fonts ni ninguna dependencia.
- Textos de la interfaz **en inglés**; comentarios de código, también en inglés.
- Las lecciones **no se tocan, ni se borran, ni se reorganizan**.

**Sí pregunta si:** un cambio visual te obliga a mover o renombrar uno de los 13 selectores o a
reubicar un `dsMark()`, o si algo de este documento choca con lo que encuentras en el código.
