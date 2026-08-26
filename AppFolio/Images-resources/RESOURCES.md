# Recursos visuales de AppFolio — procedencia y vigencia

Verificado el **2026-08-26**.

---

## 1. ⚠️ Lo que se borró, y por qué importa

Esta carpeta contenía cinco archivos que se presentaban como capturas del producto:

```
dashboard.jpg        564 KB
leasing-funnel.jpg   659 KB
maintenance.jpg      672 KB
properties.jpg       473 KB
resident-ledger.jpg  475 KB
```

**Los cinco eran mockups generados por IA, no AppFolio.** Se borraron. Las evidencias:

| Señal | Detalle |
|---|---|
| Texto corrupto | `dashboard.jpg`: *"Corafrarter and allowing"*, *"Lease fusvings in School"*, *"Show more taskss"*, *"Show more activitis"*, *"Fltow inss"*, *"85 Um Units"*, *"Depar Lacant"*. `maintenance.jpg`: *"Filterr by:"*, *"Leaking Puritcions Sink P-Trap"*, URL `appfolio.com/workteenance/maintenance`. |
| Navegación incoherente | Cada imagen inventa una barra distinta: `properties.jpg` → *Dashboard/Properties/Tenants/Owners/Accounting/Maintenance/Reports*; `resident-ledger.jpg` → *Home/Reporting/Leasing/Association/Maintenance/Settings*; `maintenance.jpg` → añade *Communication*. **AppFolio real no tiene barra horizontal: tiene un rail oscuro a la izquierda.** Ver `video-layout-nav/01-dashboard-top.png`. |
| Datos imposibles | `dashboard.jpg`: *Total Units 85*, y luego filas de unidades individuales con 85, 73, 72, 86 y 84 unidades cada una. `maintenance.jpg`: la orden `WO-2026-0318` aparece tres veces y `WO-0319` dos, con importes distintos. |
| Datos del propio simulador | Plano / Frisco / McKinney TX, *Marcus Vance #204*, *Legacy Oak Apts*, fechas 2025–2026. Son los datos ficticios de este módulo. Las imágenes se generaron **a partir del simulador**, no al revés. |

Ninguna estaba referenciada por el código. **La lección: una imagen que se ve pulida no es una fuente.** Cualquier cosa que entre a esta carpeta necesita una URL de origen verificable, y va en la tabla de §2 o §3.

### Contaminación de paleta — pendiente de revisar

`appfolio.css:20` declara:

```css
/* --- AUTHENTIC APPFOLIO BRAND PALETTE (Derived from Images-resources/) --- */
--af-brand: #0f2a4a;   /* AppFolio Deep Navy Header */
```

Ese azul marino **no aparece en ninguna imagen auténtica de esta carpeta**. Muestreado sobre
`video-layout-nav/01-dashboard-top.png`, el rail real mide **`#2c292d`** (casi negro cálido) y
el elemento activo **`#457dc8`**. El único sitio donde existía un cabezal azul marino era en los
`.jpg` generados por IA.

El chasis usa el bloque honesto (`--af-v-sidebar: #2a272b`, que sí coincide con la medición), así
que el rail está bien. Pero el bloque rotulado *"AUTHENTIC"* no puede llamarse así. Ver §4 del
prompt maestro.

---

## 2. `video-layout-nav/` — 32 capturas reales del producto

Extraídas de un tutorial en video de AppFolio sobre la cuenta demo
`demobaumgardner.appfolio.com`, 1920×1080. Índice completo en el `README.md` de esa carpeta.

**Son auténticas y son la mejor referencia de arquitectura que existe aquí.** Pero los datos en
pantalla llevan fechas de **12/27/2016 a 01/01/2019**: el video es de ~2018–2019.

- ✅ Sirven para: qué secciones existen, cómo se anidan, qué columnas tiene cada tabla, dónde
  viven las acciones de creación (el rail derecho, no un botón `+ New` global).
- ❌ No sirven para: color, tipografía, radios, sombras. AppFolio rediseñó desde entonces.

## 3. `product-2025/` — material oficial actual

Descargado el 2026-08-26 de `cdn.brandfolder.io` vía `appfolio.com`.

| Archivo | Origen | Qué aporta |
|---|---|---|
| `01-performance-insights-hero.png` | `/performance-platform` | **El lenguaje visual actual**: rail oscuro estrecho de iconos (ya no el rail ancho con etiquetas de 2019), tarjetas blancas, esquinas redondeadas, azul/verde-azulado. Pantalla *Performance Insights*. |
| `02-leasing-crm-customization.png` | Q1 2025 update | *Leasing CRM Customization*: Inquiry Assignment, Round Robin, Call to Action Settings, Prospects/Showings. |
| `03-smart-maintenance-preferred-vendors.png` | Q1 2025 update | *Smart Maintenance › Preferred Vendors*, grupos de mantenimiento, Actions Log. |
| `04-realm-x-flows-bill-approval.png` | Q1 2025 update | *Realm-X Flows*: lienzo de automatización con Trigger / Condition / Assign Task / Automation. |
| `05-online-rental-application.png` | Innovations | La nueva *Online Rental Application* móvil: Personal Information / Income / Household / Questionnaire con badges Complete / In Progress. |
| `06-purchase-order-approval.png` | Innovations | Aprobación de órdenes de compra. |

**Advertencia:** igual que Qualia, AppFolio publica ilustraciones estilizadas con el texto de
relleno difuminado. Los **nombres de función y los controles son reales**; los datos no. Sirven
para lenguaje visual y nomenclatura, no para copiar tablas.

### Cambio de marca relevante

AppFolio ahora llama a su producto **Performance Platform**, no *AppFolio Property Manager*.
Funciones actuales que el módulo no menciona: **Realm-X** (la capa de IA), **Flows**
(automatizaciones), **Leasing CRM**, **Smart Maintenance**, **Leasing Signals**.

## 4. Por qué no hay capturas reales *actuales*

- No existe una cuenta demo pública equivalente a `demobaumgardner.appfolio.com` accesible sin
  login.
- Capterra, G2, SoftwareAdvice y GetApp devuelven **403** a cualquier scraping.
- El sitio de AppFolio publica sólo el material estilizado de §3.

Para ir más lejos hacen falta capturas propias desde una sesión real de AppFolio.

## 5. `brand/`

`appfolio-logo.svg` es el que **usa el código** (`testdrive-appfolio.html:49`).
`appfolio-icon.svg` está disponible y hoy no se referencia.
