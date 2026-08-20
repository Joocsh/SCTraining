# PROMPT MAESTRO — DocuSign: el mundo ficticio (datos + acciones)

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-world.md`".
>
> Este documento es el **complemento** de `Docusign/PROMPT-docusign-fidelity.md`.
> Aquel resolvió cómo se *ve* el producto. Éste resuelve qué *contiene* y qué *hace*.
> Si algo choca entre los dos, manda éste.

---

## 0. Rol y objetivo

Eres un ingeniero frontend trabajando **exclusivamente** en el módulo DocuSign del repo
`SCTraining` (`Docusign/`). No toques `Quialia/`. No toques `assets/`.

El módulo ya tiene el aspecto correcto: rebrand 2024, sidebar por grupos, botón Start azul,
Agreements en columnas, Settings con rail, Reports, PowerForms, Bulk Send, Deleted, Shared
Access. Lo que le falta es **mundo**: la cuenta está vacía.

Hoy la cuenta entera son **5 sobres, 3 plantillas, 5 usuarios y 3 carpetas con contador en
cero**. Media docena de destinos del sidebar llevan a listas vacías. Reports calcula KPIs
sobre 5 filas. Ése es el detalle que delata la simulación mucho más rápido que cualquier
píxel mal puesto: nadie tiene una cuenta de DocuSign con cinco sobres en agosto de 2026.

Tu trabajo son dos cosas:

- **A — Poblar el mundo.** Un catálogo de datos ficticios coherente, en un archivo nuevo,
  con volumen realista para una coordinadora de transacciones inmobiliarias.
- **B — Cerrar el bucle de interacción.** Que cada control clickeable haga algo: o muta el
  estado en memoria y se ve el efecto, o responde con una frase honesta. Cero botones muertos.

Sin backend, sin red, sin API, sin librerías. Lo que el visitante cree o edite vive **en
memoria** y desaparece con F5. El progreso de las lecciones, no.

---

## 1. Qué NO se toca

Requisito duro del cliente, sin cambios respecto al prompt anterior.

| Archivo / símbolo | Por qué |
|---|---|
| `Docusign/docusign-data.js` | Currículum calificado: lecciones, escenarios, triage, verify, compose, banco del examen |
| `assets/js/sim-engine.js`, `assets/css/sim-engine.css` | Motor compartido |
| `Docusign/docusign-tour.js` | Tour guiado |
| `dsMark()`, `dsStore`, `DS_LS_KEY` | Motor de progreso |
| Vistas de entrenamiento: `dsLessonsHTML`, `dsLessonDetailHTML`, `dsScenarioDetailHTML`, `dsTriageHTML`, `dsVerifyHTML`, `dsComposeHTML`, `dsExamHTML` | Ya funcionan |

**Nota sobre `docusign-data.js`:** el prompt de fidelidad exigía 13 selectores literales en
los walkthroughs, pero **9 de esos 13 no existían** en el archivo — las lecciones apuntaban a
cosas frágiles como `.ds-action-bar button.primary`. Ese re-cableado ya se hizo y es la
**única** razón legítima por la que el archivo tiene diff. A partir de ahora vuelve a estar
congelado: si crees necesitar otro cambio ahí, **pregunta antes**.

### 1.1 Los contratos que siguen vivos

Los **17 identificadores de calificación** (`ds_c1_1`…`ds_c5_4`, `ds_env_open`) y los
**13 selectores de walkthrough** (`#sb-sent`, `.ds-new-btn`,
`tr[data-env-id="ENV-2026-9041"]`, `#chkSeq`, `#dsAttachPurchaseAgreement`,
`#dsBtnNextRecipients`, `#dsBtnNextFields`, `#dsBtnAddField`, `#dsBtnAuditFields`,
`#dsBtnSendFinal`, `#dsBtnSendReminder`, `#dsBtnCorrectEnv`, `#dsBtnVoidEnv`) siguen siendo
API congelada. Este documento añade datos y acciones **alrededor** de ellos, nunca encima.

Las claves del mapa `views` en `dsRenderRoot()` tampoco se renombran.

---

## 2. El archivo nuevo: `Docusign/docusign-shell-data.js`

El problema de raíz es que el prompt anterior congeló `docusign-data.js` pero nunca dijo
dónde poner los datos de producto. El agente hizo lo único posible: incrustar literales
dentro de las funciones de vista — `dsBulkBatches()`, `dsPowerForms()`,
`dsSharedAccessHTML()`, `DS_SETTINGS_PAGES.users`. Eso no escala y mezcla datos con markup.

**Crea `Docusign/docusign-shell-data.js`** y cárgalo entre los dos existentes:

```html
<script src="docusign-data.js"></script>       <!-- currículum, congelado -->
<script src="docusign-shell-data.js"></script> <!-- mundo ficticio, nuevo -->
<script src="docusign-app.js"></script>
```

Reglas del archivo:

- Prefijo **`DS_S`** en todo símbolo exportado (`DS_S_ENVELOPES`, `DS_S_USERS`…), para que
  nunca se confunda con `DS_` del currículum.
- **Solo catálogo de solo lectura.** Constantes. Nada mutable.
  Lo que el visitante modifica sigue viviendo en `dsDemo` como override — si mezclas ambos,
  F5 deja de limpiar lo que debe limpiar.
- Cabecera de archivo explicando qué es, por qué está separado, y la regla de coherencia
  de §3. Comentarios en inglés, como el resto del repo.
- Mueve aquí los literales que hoy están en `docusign-app.js` (`dsBulkBatches`,
  `dsPowerForms`, las filas de Shared Access, las de Settings→Users/Groups/Brands/Apps).
  El archivo de app se queda con lógica y markup, no con datos.

---

## 3. Las cuatro reglas de coherencia

La ilusión no muere por falta de datos. Muere por **datos que se contradicen**. Si Reports
dice "184 enviados" y Agreements lista 5 filas, se acabó. Estas cuatro reglas no son
opcionales.

**R1 — Derivar, nunca teclear.** Si un número se puede calcular desde los sobres, se calcula.
Nada de KPIs literales. La serie mensual de las gráficas de Reports sale de las fechas reales
de los sobres. Los contadores del sidebar salen de los mismos filtros que pinta la lista. El
conteo de miembros de un grupo sale de `DS_S_USERS`.

**R2 — Referencias cruzadas reales.** Todo nombre que aparece en dos pantallas es la misma
persona. Los remitentes de los sobres existen en Settings→Users. Los de Shared Access
también. Las notificaciones citan ids de sobre que existen. Las plantillas que nombra Bulk
Send existen en el catálogo de plantillas. Ningún dato huérfano.

**R3 — Determinismo absoluto.** Ni un solo `Math.random()`. La cuenta debe ser **idéntica en
cada carga**: si no, los screenshots cambian, las lecciones se vuelven inestables y el
historial de un sobre se reescribe cada vez que se repinta la pantalla. Si necesitas
variación, usa el hash del id (`dsHashString` + `dsMulberry32` ya existen en el repo).

> Hay un `Math.random()` activo hoy en `dsAddAuditLog()` generando la IP. Elimínalo.

**R4 — Todo ancla en `DS_TODAY` (`'2026-08-12'`).** Nada de fechas literales sueltas: en tres
meses la cuenta entera se vería abandonada. Expresa las fechas como offsets desde `DS_TODAY`
y resuélvelas en carga. Distribución: densa en los últimos 30 días, más rala hacia atrás,
cubriendo 14 meses para que el filtro "Last 12 months" signifique algo.

---

## 4. Catálogo de datos

Volúmenes objetivo. Son mínimos, no máximos.

### 4.1 `DS_S_ENVELOPES` — ~75 sobres de fondo

El dataset más importante. Misma forma que `DS_ENVELOPES` (`id`, `subject`, `type`, `sender`,
`status`, `createdDate`, `closingDate`, `documents[]`, `recipients[]`, `fields[]`), pero
**ligeros**: 1–2 documentos, 1–3 destinatarios, `fields` opcional.

**Enfoque híbrido, no teclees 75 a mano.** Escribe ~15 completos y expresivos — los que un
visitante probablemente abrirá — y genera los ~60 restantes con un **generador determinista
con semilla fija**, compuesto de pools de nombres, direcciones de Austin/Round Rock/Cedar
Park y tipos de documento. Un sobre generado nunca debe verse plantilla: varía asunto,
número de páginas, roles y tiempos de firma.

Distribución por estado, calculada para que **ningún destino del sidebar quede vacío**:

| Estado | Cantidad | Qué pantalla llena |
|---|---|---|
| `completed` | 38 | Completed, Reports |
| `waiting` | 14 | Waiting for Others, Expiring Soon |
| `draft` | 8 | **Drafts (hoy vacío)** |
| `voided` | 4 | — |
| `expired` | 5 | Action Required |
| `declined` | 3 | Action Required |
| `authfail` | 3 | **Authentication Failed (hoy vacío)** |
| `deleted` | 6 | **Deleted (hoy pide prestados los voided)** |

`dsStatusLabel()` y `dsStatusIcon()` no cubren `authfail`. Añádelos: etiqueta
"Authentication Failed", icono de escudo/candado en rojo.

**Remitentes: 6, no 1.** Hoy todos los sobres son de "Alex Rivera (VA)", lo que deja el pill
"Sender ▾" sin sentido. Reparte entre Alex Rivera (VA), Dana Whitfield, Priya Raman, Marcus
Lee, Jordan Ellis y Sofia Marchetti. Ojo: el quick view `sent` filtra por `/alex|va/i`, así
que los ajenos caen en Inbox y no en Sent — eso es correcto y debe quedarse así.

**Tipos:** Real Estate Purchase, Listing Agreement, Lease Agreement, Amendment, Addendum,
Seller Disclosure, Commission Agreement, HR / Onboarding, Legal, Vendor Agreement.

### 4.2 La trampa del orden — léela antes de generar nada

El walkthrough de la Lección 5 apunta a `tr[data-env-id="ENV-2026-9041"]`. Ese sobre es del
`2026-08-10` y `ENV-2026-8812` del `08-11`: hoy son los dos más recientes y encabezan la
lista. **Si metes 75 sobres con fechas posteriores, el objetivo se hunde y la lección se
rompe.**

Dos condiciones obligatorias:

1. **Todo sobre de fondo lleva `createdDate` ≤ `2026-08-09`.** Sin excepción.
2. Si añades paginación (deberías, ver §4.3), `dsGoto('envelopes')` **resetea a página 1**, y
   el tamaño de página garantiza que los 5 sobres del currículum caen en la primera.

Verifica esto explícitamente al terminar: abre Agreements sin filtros y confirma que
`ENV-2026-9041` es visible sin paginar.

### 4.3 Paginación

Con 80 sobres, el producto real muestra un footer `1–20 of 84` con controles de página y un
selector de filas. Añádelo: suma fidelidad y evita una tabla de 80 filas. Página de 20.
Estado en `dsState`, no en `dsDemo`. Cualquier cambio de filtro, búsqueda, carpeta o quick
view resetea a página 1.

### 4.4 `DS_S_CONTACTS` — ~30 entradas de libreta

`name`, `email`, `company`, `role`, `lastUsed`. Alimenta el autocompletado de destinatarios
del wizard (§6) y da realismo a Shared Access. Debe incluir a todos los destinatarios que
aparecen en sobres.

### 4.5 Settings

| Dataset | Vol. | Contenido |
|---|---|---|
| `DS_S_USERS` | 14 | `name`, `email`, `permissionProfile`, `status` (Active/Pending/Closed), `lastSignIn`, `group`, `envelopesSent`. **Debe contener los 6 remitentes de §4.1.** |
| `DS_S_GROUPS` | 6 | Transaction Coordinators, Listing Agents, Escrow, Compliance, Executive, Contractors. Conteo de miembros **derivado** de `DS_S_USERS`. |
| `DS_S_PERMISSION_PROFILES` | 6 | Account Administrator, DS Admin, Sender, Signing Group Manager, Viewer, Read Only. Con flags de capacidad para pintar la matriz. |
| `DS_S_SIGNING_GROUPS` | 4 | Nombre + miembros. |
| `DS_S_BRANDS` | 3 | Nombre, color primario, logo (SVG inline), default sí/no, idiomas. |
| `DS_S_EMAIL_TEMPLATES` | 6 | Invitation, Reminder, Completed, Declined, Voided, Expiring. Con asunto y cuerpo previsualizable. |
| `DS_S_CONNECTED_APPS` | 10 | Salesforce, Google Drive, Dropbox, Box, SharePoint, Zapier, Slack, Qualia, Stripe, HubSpot. Estado conectado/no, fecha, scope. |
| `DS_S_API_KEYS` | 3 | Enmascaradas (`••••••••4f2a`), con nombre, creada, último uso. **Nunca una clave de aspecto real y completo.** |
| `DS_S_CONNECT` | 4 | Suscripciones webhook: URL, eventos, estado, últimos fallos. |
| `DS_S_PLAN` | 1 | Business Pro, 5 seats de 14 usados, ciclo, próxima factura, historial de 6 facturas. |
| `DS_S_REGIONAL` | 1 | Zona horaria, formato de fecha, idioma, moneda. |
| `DS_S_SECURITY_EVENTS` | 20 | Para Settings→Audit Logs: inicios de sesión, cambios de permisos, exportaciones. Actores de `DS_S_USERS`. |

### 4.6 Producto

| Dataset | Vol. | Notas |
|---|---|---|
| `DS_S_TEMPLATES` | 14 extra | Se **fusionan** con los 3 de `DS_TEMPLATES` vía un `dsAllTemplates()`. Los tres originales conservan sus ids: `ds_c4_2` depende de ellos. Categorías: HR & Onboarding, Legal, Real Estate, Finance, Vendor Management, Compliance. Cada uno con `documentsCount`, roles, `lastUsed`, `usageCount`. |
| `DS_S_BULK_BATCHES` | 12 | Mueve las 5 actuales aquí y amplía. Añade desglose por destinatario para un panel de detalle. Siguen apuntando a ids reales de plantilla. |
| `DS_S_POWERFORMS` | 8 | Mueve las 5 actuales. Añade `created`, `owner`, `lastResponse`. |
| `DS_S_SHARED_ACCESS` | 4 + 3 | Quién comparte contigo / con quién compartes. Personas de `DS_S_USERS`. |
| `DS_S_REPORT_CATALOG` | 12 | `name`, `type`, `createdBy` (de `DS_S_USERS`), `lastRun`, `schedule`, `shared`. |
| `DS_S_NOTIFICATIONS` | 14 | Reemplaza las 3 de `DS_DEMO_DEFAULTS`. Cada una **cita un id de sobre existente**. Mezcla de leídas y no leídas. |
| `DS_S_FOLDER_MAP` | ~30 | Asigna sobres de fondo a las 3 carpetas. `dsDefaultDemo()` siembra `dsDemo.folderMap` desde aquí — hoy arranca vacío y **los tres contadores de carpeta muestran 0**. |

### 4.7 Historial de sobre — el detalle de mayor impacto

La pestaña History y el Certificate of Completion son donde DocuSign se ve como DocuSign.
Hoy `dsAddAuditLog()` siembra **los mismos dos eventos, fechados 2026-08-11, para todos los
sobres**: abre el NDA completado el 08-02 y su historial dice que se creó el 08-11.

No lo conviertas en un dataset. Conviértelo en un **derivador**: `dsBuildAuditTrail(env)`
construye la traza desde el propio sobre.

```
Envelope Created      createdDate 09:00–11:00, actor = sender
Envelope Sent         +2 min
  por cada destinatario, en su orden de firma:
    Delivered         +minutos
    Viewed            +horas
    Signed | Declined | Authentication Failed   según su status
Envelope Completed    solo si todos firmaron; sella el certificado
```

- IP: determinista desde el hash del id del sobre, en un rango de oficina coherente.
- Zona horaria: una sola, coherente con `DS_S_REGIONAL`.
- Los eventos que el visitante genera (recordatorio, corrección, anulación, firma) se
  **anexan** a esa traza derivada, como ya ocurre.
- De paso: los modales de History y Certificate están construidos con `style="..."` inline.
  Sácalos a `docusign.css`.

### 4.8 Reports — todo derivado

Ni una cifra tecleada:

- **Volumen mensual** (barras SVG): agrupa el conjunto fusionado por mes de `createdDate`,
  12 meses hasta `DS_TODAY`.
- **Distribución por estado** (dona): conteo real por estado.
- **Tasa de finalización**: `completed / (total − drafts)`.
- **Tiempo medio de firma**: media de `closingDate − createdDate` en los completados.
- **Top senders**: agrupado por remitente.

Si al implementar una gráfica te ves escribiendo un número a mano, es que el dato no está
saliendo de los sobres. Vuelve atrás.

---

## 5. Catálogo de acciones

**Regla única:** todo control clickeable pertenece a A, B o C. Ninguno queda sin respuesta.

- **A — Real.** Muta `dsDemo`, la UI cambia al instante, F5 lo borra.
- **B — Real con confirmación.** Modal → efecto real. Para lo destructivo o irreversible.
- **C — Toast honesto.** `dsDemoAction('…')` →
  *"… is not available in this demo environment."*
- **D — Botón muerto. Prohibido.** Cero tolerancia. Un clic sin respuesta es lo que más
  rápido rompe la ilusión.

### 5.1 Tipo A — deben funcionar de verdad

Ya funcionan, no los rompas: búsqueda, filtros de fecha, quick views, carpetas, crear
carpeta, mover a carpeta, selección múltiple, movimiento en lote, abrir sobre, wizard
completo de 4 pasos, enviar sobre, recordatorio, corregir, anular, experiencia del firmante,
modales de History y Certificate, edición de Settings, `?demo=1`.

**Añade a este grupo** (hoy son toast y no deberían serlo):

| Control | Comportamiento esperado |
|---|---|
| **Deleted → Restore** | Devuelve el sobre a su estado previo y a su carpeta; toast de confirmación; desaparece de Deleted. |
| **Deleted → Delete Permanently** | Confirmación (tipo B) → desaparece de la lista para siempre en esta sesión. |
| **PowerForms → Copy Link** | `navigator.clipboard.writeText()` + toast *"Link copied to clipboard"*. Es local, no hay red. |
| **Templates → Edit** | Abre un panel de detalle de solo lectura: documentos, roles, campos preconfigurados. Mejor que un toast y cuesta poco. |
| **Sender ▾** | Ya existe `dsSetSenderFilter`, pero con un solo remitente no hacía nada. Con 6, poblar el menú desde los remitentes reales. |
| **Advanced search ▾** | Panel real con asunto, remitente, destinatario, rango de fechas y estado, que **filtra de verdad**. Hoy es toast. |
| **Notificaciones** | Marcar leída, marcar todas, y clic que navega al sobre citado. |
| **Row menu → Move to folder** | Ya funciona; extiéndelo al menú de tres puntos de todas las listas nuevas. |
| **Bulk Send → fila** | Abre panel con el desglose por destinatario del batch. |

### 5.2 Tipo B — con confirmación

Void (razón obligatoria), Delete Permanently, Remove user access en Shared Access, Disconnect
en Connected Apps. Modal con consecuencia explícita, botón destructivo en rojo, cancelar
siempre disponible.

### 5.3 Tipo C — toast honesto

Todo lo que implicaría un backend real: facturación y pagos, invitar usuarios, crear/editar
grupos y permission profiles, conectar integraciones, regenerar API keys, programar reportes,
exportar a PDF, imprimir, crear plantilla, crear PowerForm, crear bulk send, editar marca,
cambiar la firma adoptada, y cualquier página de Settings no construida.

Una sola frase, una sola vía: `dsDemoAction()`. Nunca inventes una variante.

### 5.4 Decidir explícitamente: exportar CSV

`dsExportEnvelopesCSV()` existe y genera un blob local. El prompt anterior clasificaba
"exportar" como tipo C. **Recomendación: déjalo como tipo A** — es local, no toca red,
impresiona y demuestra que la lista es datos de verdad. Si el cliente prefiere lo contrario,
degrádalo a `dsDemoAction()`, pero no lo dejes a medias.

---

## 6. Data entry — las reglas del wizard

El wizard de envío es la superficie de captura principal y donde el simulador enseña. Debe
comportarse como el producto real, incluida la parte antipática.

**Paso 1 — Documentos y asunto**
- Asunto obligatorio; máximo 100 caracteres con contador visible (límite real de DocuSign).
- Mensaje opcional, máximo 10 000 caracteres.
- Subir archivo: no hay backend. Ofrece adjuntar desde una lista de documentos de ejemplo
  del expediente. **`#dsAttachPurchaseAgreement` no se toca.**
- Quitar documento: confirmación si es el único.

**Paso 2 — Destinatarios**
- **Validación de email con error inline que bloquea "Next".** Esto no es cosmético: la
  lección de rebotes gira alrededor de `gmial.com`. El wizard debe advertir de dominios
  sospechosos (`gmial`, `hotmial`, `yaho`) **sin bloquear** — el trainee tiene que poder
  cometer el error para aprenderlo. Bloquea solo lo sintácticamente inválido.
- Detección de destinatario duplicado (mismo email dos veces).
- Nombre obligatorio si hay email.
- Autocompletado desde `DS_S_CONTACTS` al teclear.
- Acciones por destinatario: Needs to Sign, Needs to View, Receives a Copy, Needs to Sign in
  Person, Specify Recipients.
- Orden de firma: `#chkSeq` no se toca. Con orden activo, permitir reordenar y asignar
  números repetidos (firma paralela dentro de un paso), como el producto real.

**Paso 3 — Campos**
- Paleta completa: Signature, Initial, Date Signed, Name, Email, Company, Title, Text,
  Checkbox, Dropdown, Radio, Note, Attachment.
- Cada campo: asignado a un destinatario (con su color), obligatorio sí/no, etiqueta editable.
- **La auditoría de campos debe detectar de verdad**: campos sin asignar, destinatarios que
  firman sin ningún campo, campos obligatorios fuera de página.
  `#dsBtnAddField` y `#dsBtnAuditFields` no se tocan.

**Paso 4 — Revisión**
- Resumen completo: documentos, destinatarios en orden, conteo de campos por persona,
  recordatorios y expiración.
- `#dsBtnSendFinal` no se toca.
- Al enviar: el sobre se añade a `dsDemo.overrides`, aparece **arriba** en Agreements, genera
  su traza de auditoría, dispara una notificación, y es abrible.

**Transversal**
- Aviso de cambios sin guardar al abandonar el wizard con datos.
- **Corregir sobre:** solo editables el email y el nombre de destinatarios pendientes — los
  que ya firmaron quedan bloqueados, igual que en el producto real.
- **Anular sobre:** razón obligatoria, mínimo 10 caracteres. DocuSign la exige.
- **Settings:** los inputs enlazan en vivo a `dsDemo` (ya lo hacen). "Save Changes" debe
  confirmar con un toast de guardado, no con el toast de "no disponible" — el dato sí se
  guardó, en memoria.

---

## 7. Bugs de coherencia a corregir de paso

Encontrados en el código actual. Todos alimentan directamente la sensación de "esto es una
maqueta".

1. `dsAddAuditLog()` siembra los mismos dos eventos del `2026-08-11` para **todos** los
   sobres. → §4.7.
2. `Math.random()` en la IP del audit log: el historial cambia en cada repintado. → R3.
3. Quick views `draft`, `authfail` y `deleted` no encajan con ningún sobre: tres pantallas
   permanentemente vacías. → §4.1.
4. El quick view `expired` se titula **"Expiring Soon"** pero encaja `expired || waiting`.
   Semánticamente mal: "Expiring Soon" son los `waiting` cuyo `closingDate` cae dentro de los
   7 días siguientes a `DS_TODAY`. Los ya vencidos son otra cosa.
5. `dsDemo.folderMap` arranca vacío → las 3 carpetas muestran 0. → §4.6.
6. El pill "Sender ▾" es inútil con un solo remitente. → §4.1.
7. Los modales de History y Certificate están hechos con `style="..."` inline. → §4.7.
8. `dsStatusLabel()` no tiene entrada para `authfail`.

---

## 8. Fases

Corre la regresión de §9 al terminar cada una. No empieces la siguiente sin eso.

| Fase | Contenido | Riesgo |
|---|---|---|
| 0 | Línea base: correr las 10 lecciones y el examen antes de tocar nada | — |
| 1 | Crear `docusign-shell-data.js`; **mover** ahí los literales que hoy viven en `docusign-app.js`, sin añadir datos nuevos. Verificar que nada cambió en pantalla. | Bajo |
| 2 | `DS_S_ENVELOPES` + fusión en `dsAllEnvelopes()` + paginación. **Verificar la trampa de §4.2 antes de seguir.** | **Alto** |
| 3 | Corregir los quick views, `folderMap`, remitentes, `authfail` (§7 puntos 3–8) | Medio |
| 4 | `dsBuildAuditTrail()` + limpieza de los dos modales | Bajo |
| 5 | Datasets de Settings + páginas que los consumen | Bajo |
| 6 | Reports 100 % derivado | Bajo |
| 7 | Plantillas, Bulk Send, PowerForms, Shared Access, notificaciones | Bajo |
| 8 | Acciones tipo A de §5.1 | Medio |
| 9 | Reglas de data entry del wizard (§6) | **Alto** |

Las fases 2 y 9 son las que pueden romper el entrenamiento. Hazlas despacio y con la
regresión delante.

---

## 9. Criterios de aceptación

### No-regresión — lo más importante
- [ ] Las 10 lecciones se completan de principio a fin, con sus walkthroughs encontrando cada objetivo
- [ ] El examen abre, califica y reporta igual que antes
- [ ] El tour guiado funciona igual que antes
- [ ] `git diff Docusign/docusign-data.js` → sin cambios nuevos más allá del re-cableado de selectores ya hecho
- [ ] `git diff assets/` → sin cambios nuevos
- [ ] `git diff Quialia/` → sin cambios
- [ ] Los 17 identificadores siguen disparándose desde su gesto equivalente
- [ ] Los 13 selectores siguen existiendo y visibles en su momento del flujo
- [ ] **Agreements sin filtros: `ENV-2026-9041` visible en la primera página, sin paginar**

### Datos
- [ ] `grep -c "Math.random" Docusign/docusign-app.js` → `0`
- [ ] Recargar 5 veces: la cuenta es idéntica (mismos sobres, mismo orden, mismas IPs en el historial)
- [ ] Ningún destino del sidebar muestra lista vacía: Inbox, Sent, Completed, Action Required, Drafts, Deleted, Bulk Send, Waiting for Others, Expiring Soon, Authentication Failed, PowerForms
- [ ] Las 3 carpetas muestran contadores distintos de cero
- [ ] El pill Sender lista 6 remitentes y filtra
- [ ] Abrir el NDA completado el 2026-08-02: su historial empieza el 2026-08-01/02, no el 08-11
- [ ] Ningún KPI ni punto de gráfica de Reports está escrito a mano
- [ ] Ningún nombre, id de sobre o plantilla aparece en una pantalla sin existir en el catálogo
- [ ] Ninguna fecha posterior a `DS_TODAY`; ninguna anterior a 14 meses

### Interacción
- [ ] Recorrer las 20 pantallas clicando **cada** control: ninguno queda sin respuesta
- [ ] Toda acción no implementada responde con la frase exacta de `dsDemoAction()`, sin variantes
- [ ] Email sintácticamente inválido en el paso 2 del wizard bloquea "Next" con error inline
- [ ] Un dominio sospechoso (`gmial.com`) **advierte pero deja continuar** — la lección lo necesita
- [ ] Anular sin razón no procede
- [ ] Corregir un sobre no deja editar a quien ya firmó

### Persistencia
- [ ] Crear un sobre, editar Settings, mover a carpeta, restaurar de Deleted → F5 → todo desapareció
- [ ] Completar una lección → F5 → el progreso sigue ahí
- [ ] `grep -n localStorage Docusign/*.js` → solo las líneas de `dsStore`

### Código
- [ ] `docusign-shell-data.js` no contiene markup; `docusign-app.js` no contiene catálogos
- [ ] Cada vista tocada sale con sus estilos en `docusign.css`, no inline
- [ ] Sin errores ni warnings de consola en ninguna vista
- [ ] Ninguna librería externa, ninguna petición de red, ninguna fuente remota
- [ ] Comentarios en inglés explicando el porqué; sin `!important`

---

## 10. Decisiones ya tomadas — no las vuelvas a preguntar

1. Los datos de producto van en `Docusign/docusign-shell-data.js`, prefijo `DS_S`, solo lectura.
2. `docusign-data.js` vuelve a estar congelado.
3. ~75 sobres de fondo, híbrido: ~15 a mano, el resto generados con semilla fija.
4. Todos los sobres de fondo con fecha ≤ `2026-08-09`. Innegociable.
5. Paginación de 20, reseteando a página 1 en cada cambio de filtro.
6. El historial de sobre se **deriva**, no se almacena.
7. Reports 100 % derivado.
8. Cero `Math.random()`. La cuenta es idéntica en cada carga.
9. Tres tipos de acción: A real, B con confirmación, C toast. Nunca un botón muerto.
10. Vanilla JS. Sin React, Tailwind, Chart.js, Google Fonts ni dependencia alguna.
11. Textos de interfaz en inglés; comentarios de código, en inglés.
12. Nada de datos personales reales: todos los emails en dominios de ejemplo, todos los
    teléfonos en el rango `555-01xx`, todas las API keys enmascaradas.

**Sí pregunta si:** un cambio te obliga a mover o renombrar uno de los 13 selectores, a
reubicar un `dsMark()`, a tocar `docusign-data.js` o `assets/`, o si algo de este documento
choca con lo que encuentras en el código.
