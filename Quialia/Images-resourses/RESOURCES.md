# Recursos visuales de Qualia — procedencia y vigencia

Verificado el **2026-08-26**. Antes de pedir "capturas más nuevas", lee la sección 3.

---

## 1. `real-screenshots/` — capturas reales del producto

| Archivo | Qué muestra | Época | Valor |
|---|---|---|---|
| `core-charges-section-b.png` | Qualia Core, expediente abierto, **Charges → Did Not Shop For (B)**. 3456×1944. Topbar oscuro, tab strip de 9 expedientes, rail izquierdo completo, grid de cargos, panel de Payments, sidebar derecho (Chat / Tasks / Help / Notes). | Orden fechada 2021 | **El activo más valioso del repo.** Es la única captura real, legible y a resolución completa de Core que existe aquí. Todos los tokens de color y la densidad tipográfica de `qualia.css` se muestrearon de aquí. **No borrar.** |
| `core-basic-info-LEGACY-2016.png` | Formulario **Basic Info** completo con nombres de campo reales: Close/Funding/Disbursement Date, Purchase Price, Loan Amount, Purpose, Representing, Order #, Settlement Statement, Source of Business, 1099 Eligible, Settlement Team (Settlement Agency / Order Opener / Paralegal / Attorney / Assistants / Marketers), Place of Closing. | Orden 2016-1-124 | Chrome viejo (topbar claro, sólo 5 secciones de nav). **Pero los nombres y el agrupamiento de campos siguen vigentes** — es la referencia canónica de qué campos lleva Basic Info. |
| `core-loan-LEGACY-2016.png` | Pantalla **Loan** con sus campos. | 2016 | Misma advertencia: chrome viejo, campos vigentes. |

## 2. `wireframes/` — esqueletos oficiales de qualia.com

Descargados de `https://www.qualia.com/images/title-escrow-product/screenshots/`.

| Archivo | Origen | Qué aporta |
|---|---|---|
| `core-order-dashboard.webp` | `tae-screenshot1.webp` | Chrome **actual**: botón verde **Order Dashboard** en la cabecera del rail, tab strip tipo navegador, franja de sub-pestañas con *Overview* activa, sidebar derecho. |
| `core-order-tasks.webp` | `tae-screenshot2.webp` | Pantalla **Tasks** con los 5 grupos reales: *Order Opening, Title, Pre-Closing, Payoff Tasks, Post-Closing*. Botones **Modify / Add Task / Add Task Group**. Barras de progreso y estrella de favorito por grupo. |
| `core-order-documents.webp` | `tae-screenshot4.webp` | Pantalla **Documents**. |
| `core-order-accounting.webp` | `tae-screenshot5.webp` | **Accounting → Ledger** con *ACCOUNT BALANCES*, la tabla, el panel *Payment Details / Breakdown* y el badge **Ready to Disburse**. |

Qualia desenfoca todo el texto de estas imágenes a propósito. Sirven para **layout y nomenclatura de secciones**, no para datos.

## 3. Por qué no hay capturas reales más nuevas

Se buscó el 2026-08-26. Resultado:

- `knowledge.qualia.com` (Zendesk, 700+ artículos) → **redirige a `login.qualia.io`**. Login obligatorio.
- `help.qualia.com` (Qualia University, Skilljar) → **login obligatorio**.
- `api.qualia.com/graphql` → responde `{"errors":[{"code":"UNAUTHORIZED"}]}`. Introspección cerrada.
- `docs.qualia.com`, `developer.qualia.com`, `support.qualia.com` → **no existen** (NXDOMAIN).
- `qualia.com/title-and-escrow/` → sólo los wireframes de §2 más ilustraciones de marketing.
- Capterra / G2 / SoftwareAdvice / GetApp → bloquean scraping (403).

**Hallazgo importante:** los 4 `.webp` de `wireframes/` son **byte por byte idénticos** (mismo MD5) a los que qualia.com sirve hoy. No estaban desactualizados: son los assets vigentes. Volver a descargarlos produce exactamente los mismos archivos.

```
7711c194cd015b834f9ce63a1f7e6cb3  core-order-dashboard.webp  = tae-screenshot1.webp (live)
d30a31635e1b27eb5b515718789b6498  core-order-tasks.webp      = tae-screenshot2.webp (live)
97504c8386d229dc6c8b3df720eac13c  core-order-documents.webp  = tae-screenshot4.webp (live)
b62ca63059da9c6318ca23dbc4955019  core-order-accounting.webp = tae-screenshot5.webp (live)
```

**Conclusión:** la referencia visual de este repo ya está al día hasta donde la web pública permite. Para ir más lejos hace falta una cuenta de Qualia — capturas propias desde una sesión real, o un export del Knowledge Base.

## 4. Borrado en esta limpieza

| Archivo | Razón |
|---|---|
| `connect.png` | Qualia **Connect** (portal de comprador/agente). Otro producto, otro layout. Un VA de title/escrow trabaja en **Core**. Fuera de alcance. |
| `core-reference/connect-portal-OUT-OF-SCOPE.webp` | Igual. Ya venía marcado como fuera de alcance en el nombre. |
| `OIP.webp`, `OIP (1).webp` | Miniaturas de búsqueda de imágenes, 2–5 KB, sin uso ni procedencia. |

## 5. `brand/`

`qualia-mark.svg`, `qualia-mark-light.svg`, `qualia-icon.svg` son los que **usa el código** (`qualia-app.js:781`, `testdrive-qualia.html:46`). `qualia-wordmark-2026.png` y `qualia-icon-core-2026.png` se bajaron hoy de qualia.com como referencia de marca vigente.
