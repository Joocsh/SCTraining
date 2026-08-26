# PROMPT MAESTRO 7 — DocuSign: el chasis real de 2026

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-chrome-2026.md`".
>
> Séptimo de la serie. Los cinco primeros construyeron el módulo, el sexto cerró
> los defectos de entrega. **Éste corrige la fidelidad visual** contra medidas
> tomadas del producto real, no de una captura.
>
> **`PROMPT-docusign-entrega.md` manda sobre éste hasta el 27 de agosto de 2026.**
> Si algo aquí choca con D1–D6, primero D1–D6.

---

## 0. De dónde salen estos datos

Sesión autenticada en `apps.docusign.com`, **25 de agosto de 2026**. No es una captura
leída a ojo: los valores marcados **medido** vienen de `getComputedStyle()` sobre los
elementos vivos. Los marcados **observado** vienen de la pantalla y no se midieron —
si necesitas exactitud en ésos, mídelos antes de tocar nada.

Vistas recorridas: Home, Agreements (Inbox, filtros, sidebar completo), Templates,
y el flujo de envío completo hasta el diálogo de descarte.

### 0.1 Lo que ya está bien y no hay que tocar

Antes de la lista de correcciones, el crédito que corresponde:

| Verificación | Resultado |
|---|---|
| Taxonomía del sidebar de Agreements | **Coincide 1:1** con el producto real |
| `--ds-inkwell: #130032` | **Es exactamente** la tinta del producto |
| `--ds24-sidebar: #f6f5f6` | Real `#F7F6F7` — 1 punto de diferencia, **no lo toques** |
| Topnav blanco + sidebar izquierdo | **Estructura correcta** |
| Chip de filtro con caret, "Clear All" | **Patrón correcto** |

Los once ítems del sidebar del módulo — Inbox, Sent, Completed, Action Required,
Drafts, Deleted, Waiting for Others, Expiring Soon, Authentication Failed, Bulk Send,
PowerForms — **son los once del producto real, en concepto y en nombre.** Eso está
bien resuelto y no se replantea.

### 0.2 Lo que NO se copia · **regla dura**

La cuenta usada es de prueba. **Nada de lo siguiente entra al módulo**, aunque
aparezca en cualquier captura futura:

`14 Days Left` · `Buy Now` · `View Plans` · banner de invitaciones ·
barra `Get started — 1/5 actions completed` · tarjetas *Ready to upgrade* /
*Need help getting started* · coachmark *Try the new navigation* y su toggle ·
widgets *Leave Feedback* y *Translate* · empty states de onboarding
(*Send your first document*, *Resending the same envelopes?*).

Todo eso es andamiaje comercial de un trial. El módulo enseña el producto.

---

## 1. Qué no se toca

Se hereda íntegra la tabla de `PROMPT-docusign-entrega.md` §1, y además:

| Símbolo | Por qué |
|---|---|
| `.ds-new-btn` | La Lección 2 apunta a esa clase. **Cambia su color, nunca su nombre.** |
| `data-view="settings"` en el topnav | Es la ruta. Cambia **la etiqueta visible**, no el atributo. |
| Los 17 `dsMark()` y los 13 selectores de walkthrough | Congelados |
| `docusign-data.js` | Currículum calificado. Congelado. |

**Ninguna corrección de las secciones 2 y 3 necesita tocar nada de esa tabla.**
Si crees que sí, para y repórtalo.

---

## 2. Los tokens · **ejecutable ya, riesgo bajo**

Todo esto vive en el bloque `:root` de `docusign.css` (líneas 20–64). Son cambios de
valor, no de estructura: ~400 declaraciones aguas abajo se rebrandean solas.

### F1 — La paleta primaria es la equivocada · **MÁXIMA VISIBILIDAD**

`--ds24-blue: #285ed8` **no existe en el producto.** El comentario del archivo dice
que el azul sampleado es la acción primaria "y no Cobalt". Medido en vivo, no es
ninguno de los dos: **son dos niveles de violeta.**

| Superficie | Medido | Ejemplos reales |
|---|---|---|
| Botón de chrome | `rgb(38, 5, 89)` = **`#260559`** | Start Now, Apply, Create Template |
| CTA del flujo de envío | `rgb(76, 0, 251)` = **`#4C00FB`** | Next: Add Fields, Upload |
| Botón secundario | `rgba(19, 0, 50, 0.05)` sobre blanco | Cancel |

`#260559` es esencialmente el `--ds-deep-violet: #26065D` que **ya está en el archivo**
y sólo se usa para el logo. `#4C00FB` es Cobalt más redondeo. Es decir: la paleta buena
ya estaba escrita, apuntada al sitio equivocado.

```css
/* --- 2026, medido en producto --- */
--ds26-chrome:    #260559;   /* Start Now, Apply, Create Template */
--ds26-chrome-h:  #1b0340;
--ds26-cta:       #4C00FB;   /* Next: Add Fields, Upload */
--ds26-cta-h:     #3d00c9;

/* --- legacy, re-apuntado --- */
--ds24-blue:      var(--ds26-chrome);
--ds24-blue-h:    var(--ds26-chrome-h);
```

**Criterio:** ningún píxel de `#285ed8` renderiza en ninguna de las 13 vistas.
El botón `.ds-new-btn` sale violeta oscuro. El CTA del paso final del envío sale
Cobalt. Son colores distintos **a propósito** — no los unifiques.

### F2 — La jerarquía de texto es por alfa, no por hex

El producto **no tiene tres grises.** Tiene una tinta y una escalera de opacidad:

| Rol | Medido | Actual en el módulo |
|---|---|---|
| Texto primario, títulos | `rgba(19, 0, 50, .9)` | `--ds24-ink: #1a1a1a` / `--ds24-text: #333333` |
| Texto secundario, pestaña inactiva | `rgba(19, 0, 50, .7)` | `--ds24-muted: #6b6b6b` |
| Bordes de control | `rgba(19, 0, 50, .5)` | `--ds24-line: #e0e0e0` |
| Relleno sutil (botón secundario) | `rgba(19, 0, 50, .05)` | — |

```css
--ds26-ink-90: rgba(19, 0, 50, .9);
--ds26-ink-70: rgba(19, 0, 50, .7);
--ds26-ink-50: rgba(19, 0, 50, .5);
--ds26-ink-05: rgba(19, 0, 50, .05);

--ds24-ink:   var(--ds26-ink-90);
--ds24-text:  var(--ds26-ink-90);
--ds24-muted: var(--ds26-ink-70);
--ds24-line:  var(--ds26-ink-50);
```

Es la diferencia entre un gris neutro y un gris que tira a violeta. A pantalla completa
se nota; en una captura JPEG, no. Por eso el módulo no lo tenía.

**Ojo con el contraste:** `--ds24-line` pasa de `#e0e0e0` a algo mucho más oscuro.
Eso es correcto para **bordes de control** (chips, inputs), pero si en el archivo hay
separadores de tabla o hairlines usando `--ds-line`, van a saltar. Revisa esos call
sites uno por uno y déjalos en un `--ds26-hairline: rgba(19,0,50,.15)` nuevo si el
resultado queda pesado. **Esto es lo único de la sección 2 que exige mirar el render.**

### F3 — Cuatro métricas mal

| Token | Actual | Medido | Línea |
|---|---|---|---|
| `--ds24-radius` | `6px` | **`4px`** | 33 |
| `--ds-topbar-h` | `60px` | **`64px`** | 63 |
| `--ds-sidebar-w` | `248px` | **`280px`** | 62 |
| Alto de fila del sidebar | — | **`48px`** | — |

`248px` es el ancho del **botón** Start Now, no de la barra: el botón mide 248 con
16px de inset a cada lado, y la barra mide 280. La medida se tomó del elemento
equivocado en su momento. El alto del botón es **40px**.

### F4 — La tipografía

Familia real, medida: `"DS Indigo", DSIndigo, Helvetica, Arial, sans-serif`.
El módulo usa un stack de sistema (`docusign.css:96`) que en Windows cae en Segoe UI —
una letra visiblemente distinta.

**No embebemos DS Indigo** (es propietaria de Docusign). Declaramos el mismo stack que
declara el producto: quien la tenga la ve, y el resto cae en Helvetica/Arial, que es
mucho más cercano a DS Indigo que Segoe UI.

```css
--ds26-font: "DS Indigo", DSIndigo, Helvetica, Arial, sans-serif;
```

Escala medida, para reemplazar los valores sueltos que haya:

| Elemento | Tamaño | Peso | Interlineado | Extra |
|---|---|---|---|---|
| Título de página (`Inbox`) | 32px | 400 | 40px | `letter-spacing: -.32px` |
| Ítem del topnav | 16px | 600 | 24px | `padding: 1px 24px`, alto 64 |
| Fila del sidebar | 16px | 400 | 24px | alto 48 |
| Botón | 14px | 500 | 19.6px | `padding: 4px 8px`, alto 32, radius 4 |
| Chip de filtro | 14px | 400 | 19.6px | alto 32, `padding: 0 8px 0 12px` |
| Input de búsqueda | 16px | 400 | 24px | sin borde propio |

El título de página es **peso 400 a 32px con tracking negativo**. El módulo casi seguro
lo tiene en bold — eso es lo que más delata a una réplica.

---

## 3. Estructura · **riesgo medio, mirar el render**

### F5 — El quinto ítem del topnav se llama **Admin**, no Settings

`testdrive-docusign.html:57`. Cambia **sólo el texto visible**. `data-view="settings"`,
la ruta y el handler se quedan como están — hay walkthroughs colgando de ahí.

```html
<a class="ds-topnav-item" data-view="settings" onclick="dsGoto('settings')">Admin</a>
```

Dos cosas más del topnav, **observadas, no medidas**:

- El producto **no tiene rejilla de 3×3 puntos** al estilo Google. Es el logo de
  Docusign y el wordmark, nada más. El módulo dibuja una `.ds-logo-grid` que hay que
  quitar. *(Verifica contra el logo en `Images-resources/` antes de borrar nada.)*
- La pestaña activa lleva **subrayado**, no pastilla ni fondo. Activa = tinta `.9` +
  subrayado; inactiva = tinta `.7`, sin nada. El grosor del subrayado no se midió.
- A la derecha: icono de tareas (checklist), ayuda `?`, y avatar circular con
  iniciales sobre lila claro.

### F6 — "Shared Access" está en el sitio equivocado

En el módulo es un botón outlined debajo de Start, dentro del sidebar. En el producto
es un **dropdown arriba a la derecha del área de contenido**, alineado con el título
de la página:

```
┌─ Inbox ─────────────────────────────── [ Shared Access ⌄ ] ─┐
```

El sidebar real tiene **un solo botón**: Start Now. Mover `.ds-shared-btn` a la
cabecera del contenido es un cambio de un contenedor. Si algún walkthrough lo señala
en su posición actual, **para y repórtalo antes de moverlo.**

### F7 — Los filtros abren un popover con Apply, no un menú

Orden real de la barra, izquierda a derecha:

```
[🔍 Search Inbox and Folders]  [Date: Last 6 Months ✕] │ [Status ⌄] [Sender ⌄] [Advanced search ⌄]  [Clear All]
```

`Date` es un **chip ya aplicado con ✕ para quitarlo** — distinto de los tres dropdowns.

Al abrir `Status` **no cae un menú que aplica al clic.** Sale un popover con título
*"Status"*, subtítulo *"Envelopes Status Filter"*, cuatro **radios** y dos botones:

| Radio | Botones |
|---|---|
| Completed | `Cancel` — fondo `rgba(19,0,50,.05)` |
| Declined | `Apply` — fondo `#260559`, texto blanco |
| In progress | |
| Voided | |

Cuatro estados, **radio y no checkbox** (uno a la vez), y **no pasa nada hasta Apply**.
Si el módulo aplica el filtro al clic, ésa es la corrección.

Nota: son cuatro estados de filtro para once vistas de sidebar. No es contradicción —
las vistas son destinos, el filtro es un corte por estado. No los mezcles.

### F8 — Templates

```
[ Create Template ]              ← violeta oscuro, mismo botón que Start Now
ENVELOPE TEMPLATES
  · My Templates                 ← activo
  · Shared with Me
  · Favorites
  Show More
─────────────
Workflow Templates      [NEW]    ← badge oscuro, pill
Template Gallery        [NEW]
```

Pie de la lista: selector **`25 / Page ⌄`** a la izquierda, **`Page 1`** con flechas
`‹ ›` a la derecha. Arriba a la derecha, un icono de densidad de vista.

### F9 — El patrón `Show More` / `Show Less`

El sidebar real **no muestra los once ítems.** Muestra cuatro — Inbox, Sent, Completed,
Action Required — y esconde el resto tras `Show More`, que al expandir se convierte en
`Show Less` y revela: Drafts, Deleted, Waiting for Others, Expiring Soon,
Authentication Failed, Bulk Send. Después va el grupo `FOLDERS` y, al final y separado,
`PowerForms` con candado.

**Ese orden importa y no es el alfabético ni el del código.** Reprodúcelo literal.

**Cuidado:** si un walkthrough señala un ítem que queda colapsado por defecto, el
selector deja de ser visible y rompe el criterio de "13 de 13" de la entrega. Antes de
implementar F9, **cruza la lista de los 13 selectores contra los seis ítems que se
esconden.** Si hay intersección, F9 se pospone o el walkthrough expande primero.

### F10 — Footer

Una línea, a la izquierda, tipografía pequeña:

`English (US) ⌄ · Contact Us · Terms of Use · Privacy · Intellectual Property · Trust · Copyright © 2026 Docusign, Inc. All rights reserved`

---

## 4. El flujo de envío · **NO EJECUTAR ANTES DE LA ENTREGA**

Esto es un hallazgo, no una tarea. Léelo y no lo implementes todavía.

**El envío ya no son cuatro pasos.** El módulo implementa
*Add Documents → Add Recipients & Order → …* con stepper. El producto de 2026 tiene
**una sola pantalla** y luego los campos:

```
[✕]  Set Up Envelope                              [?] [ Next: Add Fields ]
     ┌ Add documents ──────────────────────────────────────────────┐
     │   Drag a document here or  [ Upload ]                        │
     │                                    Add More Documents        │
     ├ Add a recipient ────────────────────────────────────────────┤
     │ ▌ Name *            Email *                                  │  ▌ = barra de
     │   ☐ I also need to sign the document   Add multiple recip.   │      color del
     ├ Add message ────────────────────────────────────────────────┤      destinatario
     │   Subject *  [Complete with Docusign:]              0/100    │
     │   Message    [Enter Message]                        0/10000  │
     │   Frequency of reminders  ⌄  ⓘ                               │
     └──────────────────────────────────────────────────────────────┘
```

Detalles que sí sirven aunque no se rehaga el flujo:

- La cabecera es **propia**, reemplaza al topnav: `✕` (tooltip *"Save and Close"*),
  título, `?`, y el CTA a la derecha.
- La tarjeta del destinatario tiene una **barra de color vertical a la izquierda** —
  es el color asignado a ese destinatario, el mismo que luego tiñe sus campos.
- `Subject` es **obligatorio**, con placeholder literal `Complete with Docusign:` y
  contador `0/100`. `Message` cuenta `0/10000`.
- Al pulsar `✕` sale un diálogo: **"Do you want to save the envelope?"** /
  *"Your draft envelope will be deleted if you don't save it."* con `Discard` y
  `Save & Close`.

**Por qué no se toca ahora.** Los 32 pasos de las 10 lecciones, los 17 `dsMark()` y los
13 walkthroughs están escritos contra el stepper de cuatro pasos. Rehacer el flujo
invalida currículum calificado, que está congelado, a dos días de la entrega. **No.**

Lo barato y sin riesgo, **para después del 27**: adoptar los textos literales
(`Set Up Envelope`, `Add documents`, `Add a recipient`, `Add message`,
`Next: Add Fields`, el placeholder del Subject), los contadores de caracteres, la barra
de color del destinatario y el diálogo de descarte — **manteniendo el andamiaje de
cuatro pasos**. Eso sube la fidelidad percibida sin tocar un solo selector.

La reescritura a pantalla única es una decisión de producto con revisión de currículum
detrás. Va en el prompt 8, no en éste.

---

## 5. Orden de ejecución

| Fase | Qué | Cuándo | Riesgo |
|---|---|---|---|
| **A** | F1, F2, F3, F4 — sólo tokens en `:root` | Antes del 27, después de D1–D6 | Bajo. Un render de las 13 vistas basta. |
| **B** | F5, F6, F7, F10 | Antes del 27 si A quedó limpio | Medio. F6 puede tocar un walkthrough. |
| **C** | F8, F9 | Después del 27 | F9 puede romper el "13 de 13". |
| **D** | Sección 4 completa | Prompt 8 | Alto. Currículum. |

**Si el reloj aprieta, haz sólo la fase A.** Es donde está el 80% de la ganancia
visual y es la única que no puede romper una lección.

---

## 6. Criterios de aceptación

1. `grep -c '285ed8' docusign.css` devuelve **0**.
2. Ningún gris neutro (`#1a1a1a`, `#333333`, `#6b6b6b`) sobrevive como token de texto.
3. `--ds24-radius: 4px`, `--ds-topbar-h: 64px`, `--ds-sidebar-w: 280px`.
4. El stack tipográfico empieza por `"DS Indigo"`.
5. El título de página renderiza a 32px **peso 400** con tracking negativo.
6. El topnav dice **Admin**; `data-view="settings"` intacto.
7. `Shared Access` está en la cabecera del contenido, no en el sidebar.
8. El popover de `Status` tiene cuatro radios y no aplica hasta `Apply`.
9. **Errores de consola: 0.** **Vistas que renderizan: 13 de 13.**
   **Selectores de walkthrough visibles: 13 de 13.** **`git diff docusign-data.js`: vacío.**
10. Nada de la lista negra de §0.2 aparece en ninguna vista.

Los cuatro contadores del punto 9 son los mismos de la auditoría de entrega.
**Si alguno baja, la fase se revierte entera** — la fidelidad no vale una lección rota.
