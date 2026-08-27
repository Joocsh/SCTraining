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

## 8. Marca — logo real

Descargado el 2026-08-27 desde los propios servidores de AppFolio. Antes de
esto, `brand/` contenía dos SVG **dibujados a mano** (`appfolio-icon.svg`,
`appfolio-logo.svg`): trazados inventados que imitaban las letras del wordmark.
No los usaba nadie, y el topbar pintaba en su lugar un círculo CSS con la letra
"a" tecleada dentro. Ambas cosas eran invención de marca, justo lo que §1 dice
que no se hace. Los dos SVG falsos están borrados.

| Archivo | Origen | Uso |
|---|---|---|
| `brand/appfolio-mark.png` | `appfolio.com/_nuxt/icons/icon_512x512.png` | El círculo azul con la "a" del topbar |
| `brand/appfolio-wordmark.svg` | `appfolio.com/_nuxt/img/appfolio-wordmark-light.svg` | Wordmark "AppFolio", aún sin usar |

El icono de origen viene a 512 px con transparencia y es **ligeramente
elíptico** (480 × 469 px de diámetro real). Se recortó a su caja y se
redimensionó a 128 px cuadrados, que es lo que corrige la elipse; se muestra a
28 px, así que hay margen de sobra para pantallas 2x.

**Azul de marca real: `#007AC6`**, muestreado del propio icono. El círculo CSS
que había usaba `#0284c7`, que no es el color de AppFolio.

Marca registrada de AppFolio, Inc. Aquí está sólo para que el simulador de
entrenamiento se parezca al producto que el VA va a usar.


## 9. Fotos de listing — procedencia y atribución

Añadidas el 2026-08-27. Diez fotografías de propiedad residencial real,
descargadas de **Wikimedia Commons** y usadas en las tarjetas de
Leasing > Vacancies. Viven en `Images-resources/listing-photos/`.

**Por qué estas y no otras.** El catálogo del módulo es DFW (Plano, Frisco,
McKinney, Carrollton), así que se buscaron fotos de esa misma zona. Siete de las
diez son literalmente de Carrollton, Frisco o Dallas. Se descartaron a propósito
las que salían en la búsqueda pero enseñaban lo contrario de un listing sano:
casas tapiadas, daño por tornado, obra en tierra y edificios abandonados.

**Cómo se mapean.** Por **propiedad**, no por unidad — todas las unidades de
Maplewood Commons enseñan el mismo edificio, que es como funciona un portafolio
real. El set se elige por `property.type` y el índice sale de un hash del
`property.id`, así que es estable entre renders. Ver `AF_LISTING_PHOTOS` en
`appfolio-app.js`.

Una unidad cuyo contador de fotos sale 0 **no** enseña foto: cae al recuadro gris
del producto. Ese contraste es la lección — "0 Photos" es la razón más ordinaria
de que una vacancy no reciba llamadas.

**Procesado.** Recortadas al centro en 3:2 y reescaladas a 480x320 JPEG q80
(~38 KB cada una, ~380 KB en total). El recorte y el reescalado son obras
derivadas, así que las CC BY-SA se quedan CC BY-SA.

### Atribución

| Archivo | Obra original | Autor | Licencia |
|---|---|---|---|
| `sfh-01.jpg` | Carrollton July 2019 32 (1313 Walnut Avenue) | Michael Barera | CC BY-SA 4.0 |
| `sfh-02.jpg` | Carrollton July 2019 33 (1313 Walnut Avenue) | Michael Barera | CC BY-SA 4.0 |
| `duplex-01.jpg` | Andale Green Townhouses lawn | Montgomery County Planning Commission | CC BY-SA 2.0 |
| `duplex-02.jpg` | Delta Place Townhouses, Inman Park GA | John Phelan | CC BY 4.0 |
| `fourplex-01.jpg` | Bella Villa Apartments Dallas (1 of 1) | Renelibrary | CC BY-SA 4.0 |
| `fourplex-02.jpg` | Hamilton Apartments (1 of 1) | Renelibrary | CC BY-SA 4.0 |
| `apartment-01.jpg` | Carrollton July 2019 05 (Union at Carrollton Square Apartment Homes) | Michael Barera | CC BY-SA 4.0 |
| `apartment-02.jpg` | Carrollton July 2019 26 (Olympus on Main) | Michael Barera | CC BY-SA 4.0 |
| `apartment-03.jpg` | Frisco June 2019 01 (Page Street) | Michael Barera | CC BY-SA 4.0 |
| `apartment-04.jpg` | Dallas Uptown 1999 McKinney Lofts | Photo: Andreas Praefcke | CC BY 3.0 |

Páginas de origen:

- `sfh-01.jpg` — https://commons.wikimedia.org/wiki/File:Carrollton_July_2019_32_(1313_Walnut_Avenue).jpg
- `sfh-02.jpg` — https://commons.wikimedia.org/wiki/File:Carrollton_July_2019_33_(1313_Walnut_Avenue).jpg
- `duplex-01.jpg` — https://commons.wikimedia.org/wiki/File:Andale_Green_Townhouses_lawn.jpg
- `duplex-02.jpg` — https://commons.wikimedia.org/wiki/File:Delta_Place_Townhouses,_Inman_Park_GA.jpg
- `fourplex-01.jpg` — https://commons.wikimedia.org/wiki/File:Bella_Villa_Apartments_Dallas_(1_of_1).jpg
- `fourplex-02.jpg` — https://commons.wikimedia.org/wiki/File:Hamilton_Apartments_(1_of_1).jpg
- `apartment-01.jpg` — https://commons.wikimedia.org/wiki/File:Carrollton_July_2019_05_(Union_at_Carrollton_Square_Apartment_Homes).jpg
- `apartment-02.jpg` — https://commons.wikimedia.org/wiki/File:Carrollton_July_2019_26_(Olympus_on_Main).jpg
- `apartment-03.jpg` — https://commons.wikimedia.org/wiki/File:Frisco_June_2019_01_(Page_Street).jpg
- `apartment-04.jpg` — https://commons.wikimedia.org/wiki/File:Dallas_Uptown_1999_McKinney_Lofts.jpg

Textos completos de licencia: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/),
[CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).

**Ninguna de estas propiedades tiene relación con las direcciones ficticias del
catálogo.** Son fotos de relleno para que la práctica se parezca al producto, no
las unidades que el módulo dice estar enseñando.


## 10. Rieles transcritos — referencia, no producto

Las capturas de 2026 muestran rieles con muchos más enlaces de los que este
módulo puede honrar: el producto real tiene ~130 informes y un centro de ayuda
entero detrás de "Help Topics". Transcribirlos como botones metió 41 controles
que solo sabían decir "no disponible en este demo".

Eso contradice el §2 de este mismo documento — *"un riel sin acciones para esa
pantalla se queda vacío, no se rellena de paja"* — así que se quitaron del
código. Quedan aquí como referencia para quien construya esas pantallas.

| Pantalla | Grupo | Enlaces que muestra el producto real |
|---|---|---|
| Vacancies | Tasks | Create Vacancies List · New Rental Application · New Guest Card · Lease Templates |
| Vacancies | Reports | Unit Vacancy Detail · Rental Applications · Guest Card Interests · Owner Leasing · Premium Listing Billing Detail |
| Vacancies | Help Topics | Post & Unpost Vacancies · Marketing Campaigns · Premium Listing · Zillow Listing Spotlight |
| Guest Cards | Tasks | New Guest Card · Bulk Guest Cards · Set Showing Availability · Manage Self-Guided Showing Lockboxes · Showings With CodeBox |
| Guest Cards | Reports | Guest Card Interests · Guest Card Inquiries · Prospect Source Tracking · Owner Leasing · Premium Listing Billing Detail · Leasing Agent Performance · Leasing Funnel |
| Rental Applications | Tasks | New Rental Application · Email Rental Application · Customize Application · Rental Application Settings · Bulk Update Application Fees · Screening Criteria Templates |
| Rental Applications | Reports | Rental Applications · Tenant Directory · Unit Vacancy Detail · Prospect Source Tracking · Owner Leasing · Leasing Agent Performance · Leasing Funnel Performance |
| Leases | Tasks | Lease Templates · PDF Form Templates |
| Leases | Help Topics | PDF Form Templates |
| Renewals | Tasks | Lease Templates · PDF Form Templates |
| Renewals | Reports | Lease Expiration Detail By Month · Renewal Summary |
| Renewals | Help Topics | Send Lease Renewal Offers · Send Renewal Letters · PDF Form Templates |
| Work Orders | Tasks | New Recurring Work Order · New Purchase Order |
| Work Orders | Reports | Work Order · Work Order Labor Summary · Work Order Billable Detail |
| Work Orders | Help Topics | Vendor Portal Overview · Work Orders Page Overview · Online Portal Maintenance Requests |
| Calendar | Tasks | Add Personal Calendar (NEW) · Set Showing Availability |
| Metrics (Box Score), Signals | — | riel vacío en el producto |

Lo que quedó en `AF_RAIL` es solo lo que navega a una pantalla que existe.
