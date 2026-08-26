# PROMPT MAESTRO — DocuSign: cerrar el bucle de interacción

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-interaction.md`".
>
> Cuarto de la serie. Los anteriores resolvieron cómo se ve
> (`PROMPT-docusign-fidelity.md`), qué contiene (`PROMPT-docusign-world.md`) y
> cuándo es curso y cuándo producto (`PROMPT-docusign-separation.md`).
> **Éste resuelve qué se puede hacer.** Si algo choca entre los cuatro, manda éste.

---

## 0. Objetivo

Trabajas **exclusivamente** en `Docusign/`. No toques `Quialia/`. No toques `assets/`.

El módulo ya se ve como DocuSign y ya contiene una cuenta creíble: 86 sobres, 6 remitentes,
17 plantillas, 14 usuarios, Reports calculado desde los datos reales, y todo determinista.
Eso está bien hecho y no se toca.

Lo que falta es que **se use** como DocuSign. Hoy hay 35 controles que responden
*"not available in this demo environment"*, no se puede abrir ni un solo documento, cinco de
los ocho estados de sobre son callejones sin salida, y el firmante siempre firma el mismo
contrato de 123 Main Street sin importar cuál de los 86 sobres abras.

Al terminar, un visitante debe poder recorrer el producto haciendo cosas de verdad, y salir
con la impresión de haber usado DocuSign — no de haber visto una maqueta de DocuSign.

---

## 1. La regla que NO cambia: F5 borra

**Decisión del cliente, ya tomada, no la vuelvas a plantear.**

Todo lo que el visitante cree o edite vive en `dsDemo`, en memoria. Recargar la página lo
borra por completo y devuelve la cuenta a su estado de fábrica. El progreso de las lecciones
(`dsStore` → `localStorage['ds_va_training_v3']`) es lo único que sobrevive.

Esto aplica **también a todo lo que construyas en este documento**. Un documento marcado como
leído, un borrador retomado, un sobre duplicado, un archivo "subido": todo muere con F5.

- **Ninguna escritura nueva a `localStorage`.** Ni una. `grep -n localStorage Docusign/*.js`
  debe seguir devolviendo exactamente las cuatro líneas de `dsStore`.
- Nada de `sessionStorage`: también sobrevive al F5 y por eso no sirve.
- Nada de IndexedDB, cookies ni `window.name`.

> Hay un comentario obsoleto sobre `dsLoad()` que dice *"a reload restores the trainee's
> actions rather than silently discarding them"*. Ya no es cierto: los overrides viven en
> `dsDemo`. Corrige el comentario, no el comportamiento.

---

## 2. Qué no se toca

| Archivo / símbolo | Por qué |
|---|---|
| `Docusign/docusign-data.js` | Currículum calificado. **Congelado.** |
| `assets/js/sim-engine.js`, `assets/css/sim-engine.css` | Motor compartido. Se **usa**, no se edita. |
| `Docusign/docusign-tour.js` | Tour guiado |
| `Quialia/` completo | Otro módulo |
| `dsMark()` y sus 17 identificadores | Siguen colgando de los mismos controles |
| Los 13 selectores de walkthrough | Siguen existiendo y visibles en su momento del flujo |

**Atención especial:** la Fase B toca el wizard, el detalle de sobre y el firmante — las tres
vistas que concentran 12 de los 17 identificadores y 9 de los 13 selectores. Antes de editar
cualquier función que contenga `dsMark(` o un id `#dsBtn...`, anota qué control lo dispara.
Después, verifica que el mismo gesto lo sigue disparando.

---

## 3. El principio: ningún control sin respuesta

Se mantiene la taxonomía de tres tipos:

- **A — Real.** Muta `dsDemo`, la UI cambia al instante, F5 lo borra.
- **B — Real con confirmación.** Modal → efecto real. Para lo destructivo.
- **C — Toast honesto.** `dsDemoAction('…')`, una sola frase, una sola vía.
- **D — Botón muerto. Prohibido.**

Este documento mueve cosas de C a A. Lo que se queda en C es lo que genuinamente necesitaría
un backend: facturación, invitar usuarios, conectar integraciones, programar reportes,
regenerar claves de API. Eso está bien como está — un toast honesto es mejor que una mentira.

---

## Fase A — El visor de documentos

**El hueco más grande y el más barato de cerrar.** En DocuSign el gesto central es clicar el
documento y verlo. Hoy los documentos son etiquetas de texto que no hacen nada.

La plomería ya existe y **no hay que escribirla**: `SimEngine.viewDoc(file, title)` abre un
modal con un `<iframe>`, y `simCloseDoc()` lo cierra. Hoy sólo se llama desde las vistas de
lección. El producto nunca lo usa.

### A.1 De dónde sale el contenido

`Docusign/documents/` tiene dos contratos reales en HTML —
`purchase-agreement-123main.html` y `contractor-agreement.html`— más certificados y correos.
Dos no alcanzan para 86 sobres, y **no escribas 86 archivos**.

Construye un **renderizador de documento** que genere la página a partir del propio sobre:
encabezado con el tipo de documento, partes tomadas de `env.recipients`, la propiedad o
empresa que ya está en `env.subject`, fechas de `createdDate` / `closingDate`, cuerpo de
cláusulas plausible según `env.type`, y bloques de firma por destinatario que reflejen su
estado real (firmado con la fecha, o pendiente).

- Reutiliza `Docusign/documents/doc.css` para que se vea como los dos documentos existentes.
- Si el sobre es uno de los cinco del currículum y ya tiene su HTML, **usa el archivo real**.
  El resto se genera.
- Determinista: el mismo sobre produce el mismo documento siempre.
- Paginado si el documento declara varias páginas: encabezado "Page 2 of 6" y navegación.

### A.2 Dónde se abre

- **Detalle de sobre:** cada chip de documento se vuelve clickeable. Ése es el sitio principal.
- **Lista de Agreements:** entrada "View documents" en el menú de tres puntos.
- **Detalle de plantilla:** los documentos de la plantilla.
- **Experiencia del firmante:** ver Fase B.3.

---

## Fase B — Rescatar las tres vistas rezagadas

Los prompts anteriores clasificaron estas tres como "toca lo mínimo" porque concentran la
calificación. Fue correcto entonces; el efecto secundario es que hoy son las peores. Conté
`style="` inline por vista:

| Vista | Inline styles |
|---|---|
| Home, Agreements, Settings, Templates | 0 |
| Reports | 1 |
| Detalle de sobre | 14 |
| Experiencia del firmante | 23 |
| Wizard paso 3 | **50** |

87 de los 248 del módulo, en tres vistas. Sácalos todos a `docusign.css`.

### B.1 Detalle de sobre

- Fuera los 14 inline.
- **Quita el bloque `VA Tip`** ([docusign-app.js:2578](docusign-app.js)): *"If a recipient
  hasn't acted in 24–48 hours…"* es contenido de curso dentro de una vista de producto, y se
  pinta siempre, esté o no el visitante en una lección. Contradice
  `PROMPT-docusign-separation.md`. El mismo criterio para cualquier otro texto de
  entrenamiento que encuentres en vistas de producto.
- Documentos clickeables (Fase A).
- **Enlace a History desde el detalle.** Hoy el historial sólo se alcanza desde el menú de la
  lista, que es donde nadie lo busca.
- **Acciones por destinatario:** reenviar sólo a esa persona, ver su estado en detalle. En un
  sobre con tres firmantes, poder empujar a uno solo es media razón de existir del producto.
- Los 81 sobres de fondo no traen `fields`, así que el detalle no dice nada sobre qué se
  firmó. Deriva un resumen — "3 signature fields, 2 date fields, assigned to 2 recipients" —
  a partir de los destinatarios y el tipo, o genera los campos en el catálogo. Cualquiera de
  las dos, pero que el detalle no quede mudo.

### B.2 Wizard paso 3

- Fuera los 50 inline.
- El texto dice *"Drag or click standard DocuSign fields onto the document"* y **el drag no
  existe**: cero `draggable`, cero `dragstart` en todo el módulo. Hasta que exista (Fase D),
  **corrige el texto**. Prometer un gesto que no responde es peor que no ofrecerlo.
- `#dsBtnAddField`, `#dsBtnAuditFields` y toda la lógica de `dsAuditFields()` no se tocan.

### B.3 Experiencia del firmante — la que más se nota

**El documento está hardcodeado.** Da igual cuál de los 86 sobres firmes: siempre sale
"REAL ESTATE PURCHASE AGREEMENT — 123 Main Street, Austin TX", con John Smith y Sarah
Johnson. Es el flujo estrella del producto y rompe la coherencia justo ahí.

- El firmante debe mostrar **el documento del sobre que se está firmando**, con el
  renderizador de la Fase A: partes reales, propiedad real, fechas reales.
- Los bloques de firma salen de `env.recipients`: quien ya firmó aparece firmado con su
  fecha; el destinatario activo tiene el ancla "SIGN HERE"; los demás, pendientes.
- Sobres con varios documentos: navegación entre ellos, como el producto real.
- **Queda amarillo de la marca vieja.** Tres `#ffc400` literales en `docusign.css`: el banner
  de consentimiento (línea ~1594), el marcador START (~1630) y su flecha (~1651). Migrar a
  `--ds24-blue`. El criterio de aceptación del primer prompt decía "ni un solo amarillo
  visible" y esta pantalla se lo saltó.
- Fuera los 23 inline.
- No reestructures el flujo consent → sign → finish, ni renombres ids.

---

## Fase C — Los cinco estados muertos

El detalle de sobre sólo ofrece acciones para `waiting` y `completed`. Para `draft`,
`voided`, `expired`, `declined` y `authfail` sale un texto gris: *"No actions available for
this envelope status."* Son 5 de 8 estados y 29 de los 86 sobres.

| Estado | Acciones que debe ofrecer |
|---|---|
| `draft` | **Continue editing** (tipo A, ver C.1) · Delete (B) · Move to folder (A) |
| `voided` | View history (A) · Duplicate as new envelope (A) · Move (A) · Delete (B) |
| `expired` | **Resend as new envelope** (A) · Duplicate (A) · View history (A) · Delete (B) |
| `declined` | View decline reason (A) · Duplicate (A) · View history (A) · Delete (B) |
| `authfail` | **Correct recipient** (A, reutiliza `dsActionCorrect`) · Resend (A) · History (A) |

### C.1 Los borradores — el peor callejón

Hay 8 borradores. Clicar uno abre un detalle de **solo lectura**. Un borrador sólo sirve para
una cosa: retomarlo.

Clicar un borrador debe **cargar sus datos en `dsState.wizardData` y abrir el wizard** en el
paso 1, con sus documentos, destinatarios y asunto ya puestos. `dsResetWizard()` define la
forma exacta que hay que llenar. Al enviarlo, el borrador desaparece de Drafts y aparece como
`waiting` en Sent.

**Cuidado:** el wizard es territorio calificado. Cargar un borrador **no** debe disparar
ningún `dsMark()` por sí solo — abrir el wizard desde un borrador es navegación, no un logro.
Reutiliza el flag `dsSuppressMarks` si hace falta.

### C.2 Acciones nuevas en el menú de fila

Hoy el menú de tres puntos tiene: Send Reminder, Correct, Void, Simulate Signer, Move to
Folder, History, Download, Certificate. Faltan y deben añadirse:

- **Delete** (tipo B) — manda a Deleted, de donde ya se puede restaurar. La plomería de
  `dsRestoreEnvelope` y `dsConfirmPurge` ya existe.
- **Duplicate** (tipo A) — crea un sobre nuevo en `draft` con los mismos documentos y
  destinatarios, y lo abre en el wizard.
- **Save as Template** (tipo A) — añade una plantilla a `dsDemo` que aparece en Templates
  hasta el próximo F5.
- **View documents** (Fase A).

---

## Fase D — Drag & drop y carga de archivos (última, y opcional)

Sólo si las fases A–C están cerradas y verificadas. Es la más cara y la que menos convence
por peso: un click-to-place bien hecho ya funciona.

- **Colocar campos arrastrando** en el paso 3: arrastrar desde la paleta al documento, y
  reposicionar un campo ya puesto. Coordenadas en `dsDemo`, en memoria.
- **Adjuntar archivos de verdad** en el paso 1: `<input type="file">` + zona de drop, leyendo
  con `FileReader` **en memoria**. Nunca se sube a ningún lado — no hay red y no debe haberla.
  Un PDF real se muestra por nombre, tamaño y páginas declaradas; no hace falta renderizarlo.
- Si implementas D, actualiza el texto del paso 3 que corregiste en B.2.

---

## 4. Reglas transversales

- **Cero red.** Ni `fetch`, ni `XHR`, ni `WebSocket`, ni fuentes remotas, ni CDN.
- **Cero dependencias.** Vanilla JS. Sin React, Tailwind, Chart.js, PDF.js.
- **Cero `<form>` con submit.** Nada debe navegar fuera de la página.
- **Cero `Math.random()`.** La cuenta debe seguir siendo idéntica en cada carga.
- Toda vista que toques sale con sus estilos en `docusign.css`, no inline. Sin `!important`.
- Comentarios en inglés, explicando el porqué. Interfaz en inglés.
- Cada acción nueva es de tipo A, B o C. Ninguna queda muda.

---

## 5. Plan de pruebas — hazlo antes, durante y después

Esto no es el final del trabajo, es el andamio. **Fase 0, antes de escribir una línea:**
corre las 10 lecciones y el examen de principio a fin y anota qué ítems del checklist quedan
marcados al terminar cada lección. Esa tabla es tu criterio de no-regresión.

Después de **cada** fase, corre esta batería completa:

**Recorrido de producto** (sesión limpia, sin abrir ninguna lección)
1. Home → Agreements → abrir un sobre `completed` → abrir su documento → cerrar → History →
   Certificate → volver
2. Recorrer los 11 destinos del sidebar: Inbox, Sent, Completed, Action Required, Drafts,
   Deleted, Bulk Send, Waiting for Others, Expiring Soon, Authentication Failed, PowerForms
3. Abrir un sobre de **cada uno de los 8 estados** y comprobar que ninguno dice
   "No actions available"
4. Retomar un borrador, enviarlo, verificar que sale de Drafts y entra en Sent
5. Wizard completo desde cero: adjuntar, destinatarios con un email inválido (debe bloquear)
   y uno con dominio sospechoso `gmial.com` (debe advertir **sin** bloquear), campos,
   auditoría, enviar
6. Firmar ese sobre recién creado y comprobar que **el documento del firmante es el suyo**,
   no el de 123 Main Street
7. Buscar, filtrar por fecha, por remitente, búsqueda avanzada, limpiar, paginar
8. Crear carpeta, mover en lote, exportar CSV
9. Duplicar un sobre, guardarlo como plantilla, verlo en Templates
10. Eliminar un sobre, restaurarlo desde Deleted, eliminarlo permanentemente
11. Clicar **cada** control de las 20 pantallas: ninguno queda sin respuesta

**F5 y estado**
12. Después de todo lo anterior, F5 → la cuenta vuelve a fábrica: 86 sobres, 3 carpetas, sin
    el sobre creado, sin la plantilla guardada, con Settings sin tocar
13. Completar una lección → F5 → el progreso sigue ahí
14. `grep -n localStorage Docusign/*.js` → sólo las cuatro líneas de `dsStore`

**No-regresión del curso**
15. Las 10 lecciones completas, con sus walkthroughs encontrando cada objetivo
16. Los ítems marcados al terminar cada lección son **exactamente** los de la tabla de Fase 0
17. El examen abre, califica y reporta igual
18. El tour guiado funciona igual

**Técnico**
19. Consola limpia — cero errores y cero warnings — en las 20 pantallas y en los tres modos
    (producto, lección, `?demo=1`)
20. De 1280px a 1920px sin scroll horizontal en el body
21. Pestaña Network: **cero peticiones** después de la carga inicial

---

## 6. Criterios de aceptación

### Funcionalidad
- [ ] Se puede abrir un documento desde el detalle de sobre, la lista, plantillas y el firmante
- [ ] El documento que ve el firmante corresponde al sobre que está firmando
- [ ] Ningún estado de sobre muestra "No actions available for this envelope status"
- [ ] Clicar un borrador abre el wizard con sus datos cargados
- [ ] Delete, Duplicate, Save as Template y View documents existen en el menú de fila
- [ ] Se puede reenviar a un destinatario individual desde el detalle
- [ ] El detalle de sobre dice algo sobre los campos, en los 86 sobres

### Limpieza
- [ ] `grep -c 'style="' Docusign/docusign-app.js` baja de 248 a menos de 30
- [ ] Wizard paso 3, firmante y detalle de sobre: 0 estilos inline
- [ ] `grep -n "ffc400" Docusign/docusign.css` → sin resultados en las reglas del firmante
- [ ] El bloque `VA Tip` ya no está en el detalle de sobre
- [ ] Ningún texto de entrenamiento en ninguna vista de producto
- [ ] Ningún texto promete un gesto que la UI no hace

### No-regresión
- [ ] Los 21 puntos del plan de pruebas pasan
- [ ] `git diff Docusign/docusign-data.js` → vacío
- [ ] `git diff assets/` → vacío
- [ ] `git diff Quialia/` → vacío
- [ ] Los 17 identificadores se disparan desde el mismo gesto
- [ ] Los 13 selectores existen y son visibles en su momento del flujo

---

## 7. Fases y orden

| Fase | Contenido | Riesgo | Toca código calificado |
|---|---|---|---|
| 0 | Línea base: 10 lecciones + examen, con la tabla de ítems | — | No |
| A | Visor de documentos + renderizador | Bajo | No |
| B | Rescate de las tres vistas rezagadas | **Alto** | Sí |
| C | Los cinco estados muertos + borradores | Medio | Sí, el wizard |
| D | Drag & drop y carga de archivos — **opcional** | Medio | Sí |

Una fase por commit. La batería de §5 completa entre fases. **No empieces B sin que A esté
verificada**, porque B depende del renderizador.

---

## 8. Decisiones ya tomadas — no las vuelvas a preguntar

1. **F5 borra todo lo del visitante.** Memoria pura. Ninguna escritura nueva a `localStorage`.
2. El progreso de lecciones sigue en `localStorage`, intocable.
3. Los documentos se **generan** desde el sobre; sólo los cinco del currículum usan archivo real.
4. Ningún `dsMark()` cambia de sitio. Cargar un borrador no califica.
5. Los 35 toasts de tipo C que quedan están bien: lo que necesita backend, se queda en toast.
6. Fase D es opcional y va al final.
7. Vanilla JS, sin dependencias, sin red, interfaz y comentarios en inglés.
8. Una fase por commit, con la batería de pruebas entre cada una.

**Sí pregunta si:** un cambio te obliga a mover un `dsMark()`, a renombrar uno de los 13
selectores, a tocar `docusign-data.js` o `assets/`, o si al correr la línea base encuentras
que una lección ya dependía de algo que este documento manda cambiar. En ese caso **para y
repórtalo antes de tocar nada**.
