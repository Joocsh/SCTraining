# PROMPT MAESTRO — DocuSign: cerrar la brecha del puesto

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-capability.md`".
>
> Quinto de la serie. Los anteriores resolvieron cómo se ve
> (`PROMPT-docusign-fidelity.md`), qué contiene (`PROMPT-docusign-world.md`),
> cuándo es curso y cuándo producto (`PROMPT-docusign-separation.md`) y qué se
> puede hacer (`PROMPT-docusign-interaction.md`).
> **Éste resuelve para qué sirve.** Si algo choca entre los cinco, manda éste.

---

## 0. Objetivo

Trabajas **exclusivamente** en `Docusign/`. No toques `Quialia/`. No toques `assets/`.

El módulo ya se ve como DocuSign, ya contiene una cuenta creíble y ya se usa como DocuSign.
Los cuatro prompts anteriores están cerrados y verificados. Estado medido hoy:

| Métrica | Valor |
|---|---|
| Sobres en la cuenta | 86 (5 de currículum + 81 de catálogo) |
| Plantillas | 17 · Usuarios 14 · Remitentes 6 |
| Estilos inline en `docusign-app.js` | 82 (eran 248) |
| Controles tipo C (toast honesto) | 34 llamadas |
| `Math.random()` ejecutable | 0 — sólo aparece en comentarios |
| Escrituras a `localStorage` | 3, todas de `dsStore` |
| `fetch` / `XMLHttpRequest` | 0 |
| Lecciones | 10 · Identificadores de checklist 17 · Selectores de walkthrough 13 |

Eso está bien hecho y no se toca.

Lo que falta es que **sirva para conseguir el trabajo**. Hoy el módulo entrena a un VA junior
—enviar, seguir, corregir, anular, certificar— y ese ciclo está completo. Pero:

- El sobre **no tiene ni una sola opción de seguridad**: cero Access Code, cero autenticación
  por SMS, cero ID Verification aplicable, cero mensaje privado, cero recordatorios por sobre.
  La lección 9 enseña a proteger datos NPI y el producto no ofrece con qué protegerlos.
- **No se puede crear ni editar una plantilla.** Es la segunda tarea más frecuente del puesto
  y es un toast.
- **No se puede crear un Bulk Send** ni un PowerForm. Son catálogos de sólo lectura.
- **No hay correo.** Un VA vive en la bandeja de entrada. Los tres correos de la lección 6 son
  archivos HTML estáticos que se abren desde la lección, y un sobre que el alumno acaba de
  enviar no produce ninguna notificación que pueda leer.
- El firmante **no puede rechazar** ni posponer. La lección 8 pide redactar el aviso de un
  rechazo que el producto no sabe producir.

Al terminar, un alumno debe poder demostrar en una entrevista que ha hecho el trabajo completo
—no la mitad fácil.

---

## 1. Las reglas heredadas que NO cambian

**Decisiones del cliente, ya tomadas, no las vuelvas a plantear.**

1. **F5 borra.** Todo lo que el visitante cree o edite vive en `dsDemo`, en memoria. Recargar
   devuelve la cuenta a fábrica. Aplica a **todo lo que construyas en este documento**: una
   plantilla creada, un Access Code puesto, un correo leído, un bulk send lanzado — todo muere
   con F5.
2. **Ninguna escritura nueva a `localStorage`.** `grep -n localStorage Docusign/*.js` debe
   seguir devolviendo exactamente las tres líneas de `dsStore` (más el comentario de la 24).
   Nada de `sessionStorage`, IndexedDB, cookies ni `window.name`.
3. El progreso de lecciones (`dsStore` → `ds_va_training_v3`) es lo único que sobrevive.
4. **Cero red.** Ni `fetch`, ni XHR, ni WebSocket, ni fuentes remotas, ni CDN.
5. **Cero dependencias.** Vanilla JS. Sin React, Tailwind, Chart.js, PDF.js, JSZip.
6. **Cero `Math.random()` ejecutable.** La cuenta debe ser idéntica en cada carga.
7. Interfaz en inglés. Comentarios en inglés, explicando el **porqué**.
8. Estilos en `docusign.css`, no inline. Sin `!important`.

---

## 2. Qué no se toca

| Archivo / símbolo | Por qué |
|---|---|
| `Docusign/docusign-data.js` | Currículum calificado. **Congelado.** La Fase F explica la única vía legítima para ampliarlo. |
| `assets/js/sim-engine.js`, `assets/css/sim-engine.css` | Motor compartido. Se **usa**, no se edita. |
| `Docusign/docusign-tour.js` | Tour guiado |
| `Quialia/` completo | Otro módulo |
| Los 17 identificadores de `dsMark()` | Siguen colgando de los mismos controles |
| Los 13 selectores de walkthrough | Siguen existiendo **y visibles** en su momento del flujo |
| `DS_S_*` en `docusign-shell-data.js` | Catálogo inmutable. Se **lee**; los cambios van a `dsDemo`. |

### 2.1 Atención especial — el paso 2 del wizard

La Fase A añade opciones dentro de `dsWizardStep2HTML()`, que es donde viven **`#chkSeq`** y
**`#dsBtnNextFields`**, dos de los 13 selectores, y donde se dispara `dsMark('ds_c2_1')`.

Antes de tocarlo, anota qué gesto dispara cada identificador. Después verifica que:

- `#chkSeq` sigue siendo **visible sin desplegar nada**. Si metes las opciones avanzadas en un
  acordeón cerrado por defecto, `#chkSeq` no puede quedar dentro de él.
- `#dsBtnNextFields` sigue alcanzable sin scroll en 1280px con dos destinatarios.
- Ninguna validación nueva bloquea `#dsBtnNextFields` en el flujo por defecto. Un Access Code
  vacío es el estado normal, no un problema que reportar.
- `dsRecipientProblems()` sigue devolviendo `{ blocking, warnings, count }` con la misma forma.
  Añade claves, no cambies el contrato.

**Trampa conocida:** `dsSendEnvelopeFinal()` inyecta a John Smith y Sarah Johnson si no hay
destinatarios válidos. Ese fallback existe para que la lección 2 nunca se atasque. Los objetos
que inyecta **no traen** los campos nuevos que definas — asegúrate de que todo lo que leas de
un destinatario tolere que la clave no exista.

---

## 3. El principio heredado: ningún control sin respuesta

- **A — Real.** Muta `dsDemo`, la UI cambia al instante, F5 lo borra.
- **B — Real con confirmación.** Modal → efecto real. Para lo destructivo.
- **C — Toast honesto.** `dsDemoAction('…')`, una sola frase, una sola vía.
- **D — Botón muerto. Prohibido.**

Este documento mueve de C a A los controles **de producto**: crear plantilla, editar plantilla,
crear bulk send, crear PowerForm, ver respuestas de PowerForm, ejecutar un reporte guardado.

**Lo que se queda en C y está bien así:** los ~20 controles de Settings (facturación, invitar
usuarios, crear grupos, perfiles de permisos, marcas, plantillas de correo, conectar apps,
claves de API, Connect, exportar el log de auditoría) y `Bulk download`, que necesitaría
generar un ZIP y eso exige una dependencia. Un toast honesto es mejor que una mentira.

---

## Fase A — Advanced Options: la brecha crítica

**Cero cobertura hoy.** Buscar "access code", "private message" o "advanced options" en
`docusign-app.js` devuelve 0 en las tres. Es lo que separa a un VA que envía papeles de uno al
que le confían un cierre.

### A.1 Seguridad por destinatario

En el paso 2, cada fila de destinatario gana un control **"Advanced ▾"** que despliega un panel
por debajo de esa fila (nunca un modal: el alumno tiene que ver a quién se lo está aplicando).

| Opción | Comportamiento |
|---|---|
| **Access Code** | Texto libre, mínimo 6 caracteres. Si está puesto, el firmante lo pide antes del consentimiento (Fase E.3). El detalle de sobre muestra un candado junto a ese destinatario. |
| **SMS Authentication** | Campo de teléfono con formato US. Excluyente con Access Code — DocuSign permite un método por destinatario. |
| **ID Verification** | Interruptor. Sólo disponible si la página de Settings `idv` lo tiene habilitado; si no, el interruptor explica por qué está gris. Ese cruce entre Settings y el envío es exactamente el razonamiento que hay que enseñar. |
| **Private message** | Textarea, máximo 1.000 caracteres. Aparece en el resumen del paso 4 marcado como privado y sólo se muestra a ese destinatario en el firmante. |

Reglas:

- Todo va en el objeto del destinatario dentro de `dsState.wizardData.recipients`, y viaja al
  sobre en `dsSendEnvelopeFinal()`. Nada nuevo en `localStorage`.
- Un CC (`Receives a Copy`) no puede llevar Access Code ni SMS: DocuSign no autentica a quien
  sólo recibe copia. Ofrécelo desactivado con la razón escrita, no lo escondas.
- Un Access Code de menos de 6 caracteres es un **warning**, no un bloqueo, y se comporta como
  el aviso de dominio sospechoso `gmial.com` que ya existe: avisa sin impedir avanzar.

### A.2 Recordatorios y expiración, por sobre

En el paso 4 (Review & Send), un bloque plegable **"Reminders and Expiration"**:

- Recordatorio: activar/desactivar · primer aviso a los N días · repetir cada N días
- Expiración: expira a los N días del envío · advertir N días antes
- Valores por defecto **leídos de la página `reminders` de Settings**, no escritos a mano. Si el
  alumno los cambia aquí, cambia sólo este sobre.
- El sobre resultante guarda lo elegido y el detalle lo muestra: *"Expires 2026-09-11 · Reminder
  every 3 days"*. Un sobre `expired` del catálogo que no traiga estos datos muestra un guion, no
  un `undefined`.

### A.3 Los tipos de destinatario que faltan

`ACTIONS` en `dsWizardStep2HTML()` ofrece 5 de los tipos reales. Añade:

- **Allow to Edit** (Editor) — puede modificar el sobre antes de que llegue a los firmantes.
- **Witness** — firma como testigo del firmante que se le asigne; requiere elegir a quién
  atestigua. El rol `Witness` ya existe en `DS_RECIPIENT_ROLES`, pero no hay acción que lo use.

`Needs to View` ya cubre Certified Delivery — no inventes un tipo nuevo para eso; si acaso,
etiquétalo mejor en la ayuda del control.

`dsRecipientSigns()` debe seguir devolviendo `true` sólo para quien de verdad rellena campos.
Un Editor no firma; un Witness sí. `dsAuditFields()` tiene que seguir detectando el error de
asignar un campo de firma a un CC — comprueba que la ampliación no lo rompe.

### A.4 Dónde se ve el resultado

- **Paso 4:** el resumen lista, por destinatario, el método de autenticación y si lleva mensaje
  privado.
- **Detalle de sobre:** el timeline de destinatarios muestra el método junto a cada nombre.
- **Certificado de completado:** `dsOpenCertificateModal()` debe registrar el método de
  autenticación usado. Es literalmente para lo que sirve un certificado.
- **Audit trail:** un intento fallido de Access Code genera una entrada. Ahí es donde nace de
  verdad el estado `authfail`, que hoy existe en los datos sin que nada lo pueda producir.

---

## Fase B — Plantillas de verdad

`dsDemo.templates` ya existe como array vacío y `dsAllTemplates()` ya lo concatena. La plomería
está puesta; sólo hay dos toasts donde debería haber producto.

### B.1 Crear una plantilla

Desde el botón de Templates (`docusign-app.js:3356`) y desde `Save as Template` en el detalle de
sobre, que hoy ya funciona pero guarda sin dejar editar nada.

Un asistente corto, reutilizando el wizard de envío donde se pueda:

1. Nombre, categoría (de las que ya usa el catálogo), descripción
2. Documentos — mismo componente del paso 1, con `FileReader` en memoria
3. **Roles**, no personas: `Buyer`, `Seller`, `Agent (CC)`. Cada rol lleva su acción y su orden.
   Un rol puede traer un destinatario fijo (el broker siempre es el mismo) o quedar en blanco
   para rellenar al usar la plantilla.
4. Campos — mismo canvas del paso 3, asignando a **roles** en vez de a personas

### B.2 Editar y borrar

- Editar (`docusign-app.js:3429`) abre el mismo asistente con los datos puestos.
- Sólo se editan las plantillas creadas en la sesión. Las 17 del catálogo son inmutables:
  ofrece **"Duplicate and edit"**, que es lo que hace el producto real cuando no tienes permiso.
- Borrar es tipo B, y sólo para plantillas de `dsDemo`.

### B.3 Usar una plantilla con roles

`dsUseTemplate()` hoy precarga el wizard. Con roles debe hacerlo bien: una pantalla intermedia
que pide **quién es cada rol** (nombre y email, con el mismo `datalist` de contactos y las
mismas validaciones de email), y al confirmar, los campos ya colocados se reasignan solos a las
personas elegidas.

Eso —campos que aterrizan solos en la persona correcta— es el argumento entero de por qué
existen las plantillas. Si el alumno no lo ve, no ha aprendido plantillas.

---

## Fase C — La bandeja de correo

**El añadido de mayor rendimiento del documento, y el que cierra el bucle.**

Hoy el alumno envía un sobre y no pasa nada. En el trabajo real, envía un sobre y entonces
empieza el trabajo: llegan rebotes, preguntas, avisos de firma, y phishing camuflado entre todo
lo demás.

### C.1 La vista

Una vista nueva `mailbox`, en el sidebar bajo su propio grupo. **No es una vista de DocuSign** —
es el correo del VA — así que se separa visualmente igual que el bloque de Training, y se oculta
en `?demo=1` por la misma razón: un stakeholder que abre el enlace debe ver sólo DocuSign.

Lista de dos paneles: correos a la izquierda, cuerpo a la derecha. Leído/no leído, remitente,
asunto, fecha, y un contador de no leídos en el sidebar.

### C.2 De dónde salen los correos

Tres fuentes, en este orden:

1. **Los tres archivos que ya existen** — `email-phishing-1.html`, `email-phishing-2.html`,
   `email-notification-real.html`. Se muestran en el panel, no en un modal aparte.
2. **Catálogo de fondo**, generado determinísticamente desde los 86 sobres: avisos de firma
   completada, recordatorios, un rebote, una declinación. Mismo criterio que
   `dsSBuildNotifications()`, del que puedes reutilizar la lógica.
3. **Correos vivos**: cuando el alumno envía un sobre, llega su notificación. Cuando anula uno,
   llega el aviso de anulación. Cuando un firmante simulado firma, llega la confirmación.

### C.3 Qué se puede hacer con un correo

| Acción | Tipo |
|---|---|
| Abrir / marcar leído / marcar no leído | A |
| **"Review Document"** → abre la experiencia de firmante del sobre citado | A |
| **"Report as phishing"** → el correo se marca y se retira de la bandeja | A |
| Ver la cabecera técnica: remitente real, dominio, destino de cada enlace | A |
| Borrar | B |

El botón de un correo de phishing **nunca navega a ningún sitio**: al pulsarlo, el simulador
intercepta y explica adónde habría ido. Eso es la lección, y hoy sólo se puede leer, no vivir.

### C.4 Lo que no puedes romper

La lección 6 llama a `SimEngine.viewDoc('documents/email-phishing-1.html', …)` desde su `setup`.
Esa vía tiene que seguir funcionando **exactamente igual**. La bandeja es una segunda puerta al
mismo contenido, no un reemplazo. Si el `setup` de una lección deja de encontrar su documento,
has roto currículum congelado.

---

## Fase D — Bulk Send y PowerForms operativos

### D.1 Crear un Bulk Send

Reemplaza el toast de `docusign-app.js:1746` con un asistente de tres pasos:

1. **Elegir plantilla** — de `dsAllTemplates()`, así que las creadas en la Fase B también valen
2. **Cargar destinatarios** — pegar CSV en un textarea **o** subir un `.csv` con `FileReader`.
   Cabeceras esperadas: `Name,Email,Role`. Descarga de plantilla CSV incluida.
3. **Previsualizar** — tabla con una fila por destinatario y las mismas validaciones de email
   que el paso 2 del wizard: sintaxis, dominios typo, duplicados. Las filas malas se marcan y se
   pueden excluir. El botón de enviar dice cuántos van y cuántos se quedan fuera.

Al enviar, crea el batch en `dsDemo` y aparece en la lista de Bulk Send con estado `waiting`.
Abrirlo muestra la lista real de destinatarios cargados, no una generada.

### D.2 PowerForms

- **Crear** (`docusign-app.js:1792`): elegir plantilla, nombre, slug, activar. Genera el enlace
  público y ofrece copiarlo con `dsCopyLink()`, que ya existe.
- **Ver respuestas** (`docusign-app.js:1785`): tabla de respuestas generada determinísticamente
  desde `responses` y `lastResponse`, que ya están en el catálogo. Cada fila abre el sobre
  resultante.
- Activar/desactivar un PowerForm es tipo A.

### D.3 Reportes

- **Ejecutar un reporte guardado** (`docusign-app.js:5249`) pasa a tipo A: filtra los 86 sobres
  según el tipo del reporte y pinta el resultado con los componentes que ya existen
  (`dsBarChartSVG`, `dsDonutSVG`, `dsRankBars`).
- Crear, programar y exportar reportes **se quedan en C**. Necesitan backend y correo saliente.

---

## Fase E — El firmante completo

### E.1 Rechazar la firma

Hoy el firmante sólo puede terminar. Añade **"Other Actions ▾"** en la barra superior, como el
producto real, con:

- **Decline to Sign** (tipo B) — pide motivo obligatorio, y al confirmar el sobre pasa a
  `declined` con ese motivo, visible desde `dsViewDeclineReason()`, que ya existe y hoy sólo
  puede leer motivos escritos a mano en los datos.
- **Finish Later** — sale del firmante, el sobre sigue `waiting`, y el audit trail registra la
  visita sin firma.
- **View History** — el audit trail del sobre, desde la óptica del firmante.

Esto es lo que hace practicable la lección 8: el alumno provoca el rechazo, lo ve caer en su
bandeja y entonces redacta el aviso al cliente.

### E.2 Firmar de verdad

`dsOpenAdoptModal()` ofrece estilos tipográficos. Faltan las otras dos pestañas reales:

- **Draw** — `<canvas>` con puntero y táctil, botón de limpiar. El trazo vive en memoria.
- **Upload** — imagen leída con `FileReader`, nunca sube a ningún sitio.

La firma elegida se aplica a todos los anclajes de ese firmante, como en el producto real.

### E.3 La puerta del Access Code

Si el destinatario activo trae Access Code (Fase A.1), antes del consentimiento aparece la
pantalla de código:

- Código correcto → continúa al consentimiento
- **Tres intentos fallidos → el destinatario pasa a `authfail`**, se registra en el audit trail
  y el firmante se cierra con el mensaje del producto real

Ese es el único camino por el que el estado `authfail` deja de ser decorado y pasa a ser algo
que el alumno puede provocar, diagnosticar y arreglar con `dsActionCorrect()`.

---

## Fase F — Currículum: aditivo y sólo con autorización

**`docusign-data.js` está congelado y sigue congelado.** No lo edites. Si esta fase se aprueba,
el currículum nuevo va en un archivo nuevo, `docusign-data-ext.js`, cargado **después** de
`docusign-data.js` en `testdrive-docusign.html`, que sólo **añade**:

```js
DS_LESSONS.push(...);   // lecciones 11+
DS_EXAM_BANK.push(...); // ítems nuevos
```

Ni una reasignación, ni un `splice`, ni una edición de un objeto existente.
`git diff Docusign/docusign-data.js` debe seguir vacío al terminar.

### F.1 Un hallazgo que hay que reportar antes de tocar nada

El blueprint del examen pide 14 ítems: 6 judgment, 4 triage, 3 verify, 1 compose.
El banco tiene 16: **6** judgment, **5** triage, **3** verify, **2** compose.

Es decir, **9 de los 14 ítems son idénticos en cada intento** —los 6 de judgment y los 3 de
verify agotan su categoría— y `dsOptionOrder()` es determinista, así que ni el orden cambia. Un
alumno que repite el examen ve casi el mismo examen.

Para que la aleatorización signifique algo, cada categoría necesita al menos el doble de su
cuota: 12 judgment, 8 triage, 6 verify, 2 compose. **Repórtalo y espera** antes de escribir
ítems: es una decisión de producto, no una corrección técnica.

### F.2 Lecciones candidatas

Sólo si las Fases A–E están cerradas, y una por una:

| # | Lección | Depende de |
|---|---|---|
| 11 | Autenticación y datos sensibles en la práctica: aplicar Access Code a un sobre con NPI, provocar `authfail`, corregir | A, E.3 |
| 12 | Construir una plantilla con roles y usarla dos veces | B |
| 13 | La bandeja de la mañana: 8 correos, tres de ellos hostiles, con sobres reales detrás | C |

Cada una necesita sus propios identificadores de checklist y sus propios selectores. **No
reutilices** los 17 y los 13 existentes: son la superficie calificada del currículum congelado.

---

## 4. Reglas transversales

- Cada acción nueva es de tipo A, B o C. Ninguna queda muda.
- Ningún texto promete un gesto que la UI no hace.
- Ningún texto de entrenamiento en una vista de producto (regla de
  `PROMPT-docusign-separation.md`). La bandeja de correo se oculta en `?demo=1`.
- Toda vista que toques sale con sus estilos en `docusign.css`. El contador de inline styles
  **baja**, nunca sube.
- De 1280px a 1920px sin scroll horizontal en el body.
- Consola limpia: cero errores y cero warnings.

---

## 5. Plan de pruebas

**Fase 0, antes de escribir una línea:** corre las 10 lecciones y el examen de principio a fin y
anota qué ítems del checklist quedan marcados al terminar cada lección. Esa tabla es tu criterio
de no-regresión. Guárdala en el commit de la Fase 0.

Después de **cada** fase, corre la batería completa:

**Producto** (sesión limpia, sin abrir ninguna lección)
1. Wizard completo con Access Code en un destinatario, SMS en otro y mensaje privado en un
   tercero → el paso 4 los resume → el sobre enviado los muestra en el detalle
2. Firmar ese sobre: la puerta del código aparece · código correcto entra · **tres fallos dejan
   el destinatario en `authfail`** y el audit trail lo registra
3. Corregir ese sobre con `dsActionCorrect()` y volver a firmarlo con éxito
4. Rechazar un sobre desde el firmante con motivo → cae en `declined` → el motivo se lee desde
   el detalle → llega el correo del rechazo a la bandeja
5. Crear una plantilla con tres roles y campos → usarla → los campos aterrizan en las personas
   correctas → enviarla
6. Duplicar una plantilla del catálogo, editarla, comprobar que la original no cambió
7. Bulk Send: plantilla + CSV con una fila de email inválido y una duplicada → ambas marcadas →
   excluirlas → enviar → el batch aparece con sus destinatarios reales
8. Crear un PowerForm, copiar el enlace, abrir sus respuestas
9. Bandeja: leer los tres correos de la lección 6 desde la bandeja · reportar los dos de
   phishing · comprobar que el enlace hostil **no navega** y explica adónde iba
10. Firmar el sobre citado por un correo, desde el propio correo
11. Ejecutar un reporte guardado y ver resultados reales
12. Clicar **cada** control de todas las pantallas: ninguno queda sin respuesta

**F5 y estado**
13. Después de todo lo anterior, F5 → cuenta de fábrica: 86 sobres, 17 plantillas, 3 carpetas,
    sin la plantilla creada, sin el batch, sin correos leídos, Settings sin tocar
14. Completar una lección → F5 → el progreso sigue ahí
15. `grep -n localStorage Docusign/*.js` → sólo las líneas de `dsStore`

**No-regresión del curso**
16. Las 10 lecciones completas, con sus walkthroughs encontrando cada objetivo
17. Los ítems marcados al terminar cada lección son **exactamente** los de la tabla de Fase 0
18. `#chkSeq` y `#dsBtnNextFields` visibles sin desplegar nada y sin scroll a 1280px
19. La lección 6 sigue abriendo sus tres documentos por `SimEngine.viewDoc`
20. `dsAuditFields()` sigue detectando un campo de firma asignado a un CC
21. El examen abre, califica y reporta igual · El tour guiado funciona igual

**Técnico**
22. Consola limpia en todas las pantallas y en los tres modos (producto, lección, `?demo=1`)
23. Pestaña Network: **cero peticiones** después de la carga inicial
24. `?demo=1` no muestra la bandeja de correo ni nada de Training

---

## 6. Criterios de aceptación

### Capacidad
- [ ] Un destinatario puede llevar Access Code, SMS auth o ID Verification, y mensaje privado
- [ ] Un sobre puede llevar sus propios recordatorios y expiración, con defaults leídos de Settings
- [ ] Existen los tipos de destinatario Allow to Edit y Witness
- [ ] El certificado de completado registra el método de autenticación
- [ ] `authfail` se puede **provocar** desde el firmante, no sólo leer en los datos
- [ ] Se puede crear, editar, duplicar y borrar una plantilla, con roles
- [ ] Usar una plantilla con roles reasigna los campos a las personas elegidas
- [ ] Se puede crear un Bulk Send desde CSV con validación por fila
- [ ] Se puede crear un PowerForm y ver sus respuestas
- [ ] Existe una bandeja de correo con los sobres del alumno detrás de los correos
- [ ] El firmante puede rechazar con motivo y posponer
- [ ] El firmante puede dibujar o subir su firma

### Limpieza
- [ ] `grep -c 'style="' Docusign/docusign-app.js` ≤ 82
- [ ] Las vistas nuevas: 0 estilos inline
- [ ] Los controles que quedan en tipo C son sólo los de Settings y `Bulk download`
- [ ] Ningún texto de entrenamiento en una vista de producto

### No-regresión
- [ ] Los 24 puntos del plan de pruebas pasan
- [ ] `git diff Docusign/docusign-data.js` → vacío
- [ ] `git diff assets/` → vacío
- [ ] `git diff Quialia/` → vacío
- [ ] Los 17 identificadores se disparan desde el mismo gesto
- [ ] Los 13 selectores existen y son visibles en su momento del flujo
- [ ] `Math.random()` sigue sin aparecer fuera de comentarios

---

## 7. Fases y orden

| Fase | Contenido | Riesgo | Toca código calificado |
|---|---|---|---|
| 0 | Línea base: 10 lecciones + examen, con la tabla de ítems | — | No |
| A | Advanced Options por destinatario y por sobre | **Alto** | Sí — paso 2 del wizard |
| B | Plantillas: crear, editar, roles | Medio | No |
| C | Bandeja de correo | Medio | Roza la lección 6 |
| D | Bulk Send, PowerForms, reportes guardados | Bajo | No |
| E | Firmante: rechazar, posponer, dibujar, puerta del código | Medio | Sí — E.3 depende de A |
| F | Currículum aditivo — **requiere autorización explícita** | Alto | Aditivo, nunca edición |

Una fase por commit. La batería de §5 completa entre fases.

**Orden obligado:** A antes que E (la puerta del código depende de las opciones del envío).
B antes que D (el bulk send elige entre plantillas, incluidas las creadas). F al final, y sólo
después de reportar el hallazgo de §F.1 y recibir respuesta.

**Si sólo hay presupuesto para tres fases: A, B y C, en ese orden.** Son las tres que cambian lo
que el alumno puede demostrar en una entrevista.

---

## 8. Decisiones ya tomadas — no las vuelvas a preguntar

1. **F5 borra todo lo del visitante.** Memoria pura. Ninguna escritura nueva a `localStorage`.
2. El progreso de lecciones sigue en `localStorage`, intocable.
3. `docusign-data.js` no se edita **nunca**. El currículum nuevo se añade desde un archivo aparte.
4. Ningún `dsMark()` cambia de sitio. Ningún selector de walkthrough se renombra.
5. Los ~20 toasts de Settings y `Bulk download` se quedan en tipo C. Lo que necesita backend, se
   queda en toast.
6. Los sobres y las 17 plantillas del catálogo son inmutables; editarlos es "Duplicate and edit".
7. La bandeja de correo no es DocuSign: se separa visualmente y se oculta en `?demo=1`.
8. Vanilla JS, sin dependencias, sin red, interfaz y comentarios en inglés.
9. Una fase por commit, con la batería de pruebas entre cada una.

**Sí pregunta si:** un cambio te obliga a mover un `dsMark()`, a renombrar uno de los 13
selectores, a tocar `docusign-data.js` o `assets/`, a añadir una dependencia, o si al correr la
línea base encuentras que una lección ya dependía de algo que este documento manda cambiar.
En ese caso **para y repórtalo antes de tocar nada**.
