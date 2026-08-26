# Recursos visuales de AppFolio — procedencia y hallazgos

Verificado el 2026-08-26.

## 1. Origen

26 capturas reales de **AppFolio Property Manager**, tomadas de una cuenta en
producción (`firstchoicepropertymgmt.appfolio.com`, "1ST Choice Property
Management VA") y aportadas por el usuario el 2026-08-26.

Son la **única referencia real y actual** que tiene este módulo. Todo lo que
había antes eran fotogramas de un vídeo de 2018-19, de los que se muestreó la
paleta `--af-v-*` que el propio código marca como no verificada. Estas capturas
la contradicen en dos puntos importantes (§3).

Pantallas cubiertas:

| Sección | Pantallas |
|---|---|
| Dashboard | 1 |
| Calendar | 1 (vista Week) |
| Leasing | Vacancies, Guest Cards, Rental Applications, Leases, Renewals, Signals |
| Maintenance | Work Orders, Recurring, Inspections, Unit Turns, Projects, Purchase Orders, Inventory, Fixed Assets |
| Reporting | Reports (índice completo, 6 capturas solapadas), Metrics → Pricing Metrics |

Sin cubrir: Properties, People, Accounting, Communication, What's New, y el
detalle de cualquier ficha individual. **No inventes esas pantallas a partir de
estas**: usa lo que estas capturas establecen sobre el chasis, y para el resto
mantén lo que ya hay hasta tener referencia.

## 2. Lo que las capturas establecen sobre el chasis

### Topbar
- Fondo **azul marino casi negro**, no azul.
- Izquierda: logo circular azul de AppFolio + texto "Property Manager".
- Centro: campo de búsqueda ancho, placeholder **"Search AppFolio"**, con un
  icono de filtro **dentro del campo, a la derecha**.
- Derecha, tres menús con caret: **"Add Functionality ▾"**, **"Help & Training ▾"**,
  y el menú de cuenta con el nombre de la empresa (**"First Choice ▾"**).
- **No hay botón "+ New"** — esto confirma lo que ya decía el contrato.
- **No existe "Customer Service"** en la topbar. El módulo lo tenía; es un error.

### Sidebar
- **Fondo claro** (blanco / gris muy claro), texto oscuro. El ítem activo lleva
  fondo azul pálido y texto azul. El módulo lo construyó **oscuro**, que es el
  error visual más visible.
- Diez entradas, en este orden exacto: Dashboard · Calendar · Leasing ·
  Properties · People · Accounting · Maintenance · Reporting · Communication ·
  What's New.
- "What's New" lleva un **badge naranja con un número** (33 en la captura).
- Las secciones con hijos muestran un caret ▾ y se despliegan en el propio
  sidebar; el hijo activo va en negrita.
- Al pie: el **nombre de la empresa** y un control **"⇤ Minimize"**.

### Riel derecho
- Título literal **"Tasks"**, con una **X** para cerrarlo.
- Contenido agrupado bajo encabezados con icono, y los grupos **cambian por
  pantalla**: Tasks, Reports, Help Topics, Calendar, Property, People,
  Statements, Letters.
- Los enlaces son azules, sin fondo de botón.
- En Signals el riel aparece **vacío** — un riel sin acciones para esa pantalla
  se queda vacío, no se rellena de paja.

### Franja vertical de iconos (extremo derecho)
Tres iconos apilados con etiqueta: **Assistant**, **Tasks** (activo, estrella),
**Support**. El módulo no la tiene.

### Footer
`Privacy | Help & Training | Make a Suggestion »` — el módulo tiene los dos
últimos pero le falta **Privacy**.

## 3. Contradicciones con la paleta `--af-v-*` de 2018

| Token | Valor en el módulo | Lo que muestran las capturas |
|---|---|---|
| `--af-v-topbar` | `#2b6cc6` (azul medio) | azul marino casi negro |
| sidebar | oscuro | claro, casi blanco |

La paleta vieja se muestreó de un vídeo comprimido de hace siete años. Estas
capturas mandan sobre ella.

## 4. Modismos de UI que se repiten en casi todas las pantallas

Son el vocabulario del producto, y el módulo apenas usa ninguno:

- **"Click here to search"** — panel de búsqueda plegado, con un puntero
  triangular hacia abajo y borde azul. Aparece en Vacancies, Guest Cards,
  Inspections, Inventory, Fixed Assets, Pricing Metrics.
- **Paneles de filtro desplegados** con su botón azul "Search" (Renewals,
  Recurring Work Orders, Purchase Orders).
- **Flechas ⇅ de ordenación en cada cabecera de columna** ordenable.
- **Estrella ☆ de favorito** junto a cada informe.
- **"Bulk Actions ▾  |  N Selected"** sobre las tablas con checkbox.
- **"Saved Filters [Select...]"**, **"Show Advanced Filters | Reset Filters"**.
- **"Displaying: 0-0 of 0"** al pie de las tablas.
- **Estado vacío redactado**, no una tabla en blanco: "There are currently no
  lease documents.", "No recurring work orders found.", "No projects found.
  *Create a project.*"
- **Badges de estado en mayúsculas** sobre las filas de work orders:
  `NEW RESIDENT` (verde), `ASSIGNED` (azul), `WAITING` (naranja).
- **Fechas vencidas en rojo** con el desfase entre paréntesis:
  "Target Turnaround Date: 7/19/2026 (1 month ago)".
- **Franja de KPIs por encima de la tabla** en Work Orders:
  "7 Unassigned Resident Requested · 1 Unassigned Internal · -- Add a Dashboard
  Metric · 0 Ready to Bill".
- **Banners de producto** (BETA de Realm-X en Unit Turns; página entera de
  marketing en Signals con "Request a Demo"). El producto real vende dentro de
  sí mismo.

## 5. Sub-pestañas reales, por sección

Las tiras de nivel 2 son horizontales y **desbordan con scroll** cuando no caben
(visible en Maintenance).

- **Leasing**: Vacancies · Guest Cards · Rental Applications · Leases ·
  Renewals · Metrics · Signals
- **Maintenance**: Work Orders · Recurring Work Orders · Inspections ·
  Unit Turns · Projects · Purchase Orders · Inventory · Fixed Assets ·
  Maintenance Performer
- **Reporting**: Reports · Scheduled Reports · Metrics · Surveys
  - y dentro de Metrics: Pricing Metrics · Business Metrics ·
    Tenant Insurance Coverage · Data Diagnostic

## 6. El índice de informes

Seis capturas solapadas cubren el índice **completo**: cabecera con botón
**"Report Builder"**, buscador *"Search reports by name, description, or column"*,
y **diez grupos plegables**, cada informe con ☆ y ▾.

Accounting (24) · Diagnostic (12) · Leasing (22) · Maintenance (12) ·
Owner (6) · Property And Unit (22) · Tax (4) · Tenant (13) · Transaction (15) ·
Saved Reports.

**≈130 informes.** El módulo tenía 47. Los nombres exactos están transcritos en
`AF_REPORT_INDEX` dentro de `appfolio-app.js`.

"Saved Reports" es un grupo aparte, con filtros propios (Tags, Created By,
Created Date Range) y entradas creadas por el usuario, del tipo
"FINANCIAL REVIEW - Security Deposits".

## 7. Datos de la cuenta de origen

Útiles como calibración de escala, **no para copiar**: la cuenta es real y sus
inquilinos son personas reales. El catálogo ficticio del módulo se queda como
está.

- Ocupación 85.0 %, 15 unidades vacías.
- Demanda a 7 días: 115 guest cards, 8 solicitudes, 6.96 % de conversión.
- Direcciones en Virginia (Newport News, Hampton, Suffolk, Williamsburg) — el
  módulo usa Texas, y **eso no cambia**: el currículum está escrito sobre
  derecho de Texas.
