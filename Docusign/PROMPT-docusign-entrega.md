# PROMPT MAESTRO 6 — DocuSign: la lista de entrega

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-entrega.md`".
>
> Sexto de la serie. Los cinco anteriores construyeron el módulo. **Éste no construye nada
> nuevo**: cierra los seis defectos que quedaron y verifica que lo entregado funciona.
> Si algo choca entre los seis, manda éste.

---

## 0. Objetivo

Trabajas **exclusivamente** en `Docusign/`. No toques `Quialia/`. No toques `AppFolio/`.
No toques `assets/`.

**Fecha de entrega: jueves 27 de agosto de 2026.** Este documento existe para que el módulo
llegue a esa fecha sin un solo defecto visible.

### 0.1 La conclusión de la auditoría

**El módulo está sustancialmente terminado.** Auditado en ejecución el 24 de agosto, no leído:

| Verificación | Resultado |
|---|---|
| Errores de consola en toda la auditoría | **0** |
| Vistas que renderizan | **13 de 13** |
| Controles totales · de los cuales sólo toast | 854 · **25 (2.9%)** |
| Sobres · plantillas | 86 · 17 |
| F5 devuelve la cuenta a fábrica | **Sí** — verificado 87→86 y sobre de prueba eliminado |
| Envío completo de sobre, 4 pasos | **Funciona** — produce un sobre real y firmable |
| Escrituras a `localStorage` | 3, todas de `dsStore` ✅ |
| `Math.random()` ejecutable | 0 — sólo comentarios ✅ |
| `fetch` / XHR / WebSocket | 0 ✅ |
| `git diff docusign-data.js` | vacío ✅ |
| Referencias rotas entre lecciones y datos | **0 de 32 pasos** |
| Selectores de walkthrough visibles en su momento | **13 de 13** |
| Examen | 14 ítems del blueprint, banco de 25, temporizador y entrega funcionan |

Las cinco fases del prompt de capacidad están implementadas y verificadas una por una:
Advanced Options por destinatario, constructor de plantillas, bandeja de correo, Bulk Send
y PowerForms, y el firmante completo (rechazar, posponer, dibujar firma).

**Lo que falta son seis cosas, y ninguna es estructural.**

---

## 1. Qué no se toca

| Archivo / símbolo | Por qué |
|---|---|
| `Docusign/docusign-data.js` | Currículum calificado. **Congelado.** |
| `assets/js/sim-engine.js`, `assets/css/sim-engine.css` | Motor compartido con Qualia y AppFolio |
| `Docusign/docusign-tour.js` | Tour guiado |
| Los 17 identificadores de `dsMark()` | Cuelgan de los mismos gestos |
| Los 13 selectores de walkthrough | Verificados visibles. **No renombres ninguno.** |
| `DS_S_*` en `docusign-shell-data.js` | Catálogo inmutable |

**Ninguna de las seis correcciones de este documento necesita tocar nada de esa tabla.**
Si crees que sí, para y repórtalo.

---

## 2. Los seis defectos, en orden de visibilidad

### D1 — 19 de 32 pasos de lección muestran un identificador interno · **BLOQUEANTE**

Es lo primero que ve un alumno al abrir una lección, y dice esto:

```
NOT YET   Do: ds_c5_1
NOT YET   Do: ds_env_open
NOT YET   Decide: ds_scen_4
```

**Causa exacta.** `dsLessonStepLabel()` ([docusign-app.js:5554](docusign-app.js)):

```js
return (typeLabel[step.type] || step.type) + ': ' +
       (step.label || step.checklistId || step.scenarioId || …);
```

Sólo usa `step.label`, y **ningún paso de `DS_LESSONS` tiene esa clave** (las claves reales son
`type`, `checklistId`, `view`, `walk`). Así que siempre cae al identificador crudo.

**El texto bueno ya existe, en dos sitios.** `DS_CHECKLISTS` tiene `title` y `hint` para los 17
identificadores — por ejemplo `ds_c1_2` → *"Upload Document"* / *"Attach a practice PDF document
to the envelope"*. Y 26 de los 32 pasos tienen `walk.text` redactado.

**El patrón correcto ya está escrito en el módulo hermano.** `qzLessonStepLabel()`
([../Quialia/qualia-app.js:1148](../Quialia/qualia-app.js)) resuelve el id contra
`QZ_CHECKLISTS`, `QZ_SCENARIOS`, etc. **Cópialo, no lo inventes.**

Orden de resolución: `DS_CHECKLISTS[*].items[].title` → el título del escenario / triage /
verify / compose → `walk.text` → y sólo entonces el id.

Los otros tipos resuelven contra `DS_SCENARIOS` (5), `DS_TRIAGE_ITEMS` (7),
`DS_VERIFY_ITEMS` (3) y `DS_COMPOSE_ITEMS` (1).

**Criterio:** ningún paso de ninguna de las 10 lecciones muestra una cadena que empiece por
`ds_`, `tri-`, `ver-`, `cmp-` o `l0`.

---

### D2 — La bandeja de correo no se oculta en `?demo=1` · **BLOQUEANTE el jueves**

La decisión 7 del prompt de capacidad dice que la bandeja *"no es DocuSign: se separa
visualmente y se oculta en `?demo=1`"*. No se oculta.

Medido en `?demo=1`:

| Entrada | Destino | Estado |
|---|---|---|
| `Lessons` (topnav y sidebar) | `lessons` | ✅ oculta |
| `Final Exam` | `complete-transaction` | ✅ oculta |
| **`Mailbox` (topnav)** | `mailbox` | ❌ **visible** |
| **`VA Mailbox` (sidebar)** | `mailbox` | ❌ **visible** |

Importa precisamente porque el jueves se enseña el producto: un panel titulado *"VA Mailbox &
Email Simulator — Simulates… phishing detection"* aparece en medio de lo que debería parecer
DocuSign. Es el escenario exacto que esa decisión protegía.

**Corrección:** las dos entradas se ocultan bajo `?demo=1`, con el mismo mecanismo que ya
oculta `Lessons` y `Final Exam`. Y la vista `mailbox` redirige a `dashboard` si alguien llega
por URL con `demo=1` activo.

---

### D3 — La bandeja aparece dos veces en la navegación

`Mailbox` en la topnav y `VA Mailbox` en el sidebar apuntan ambas a `dsGoto('mailbox')`, con dos
etiquetas distintas y el mismo contador. DocuSign real no tiene esa entrada en ningún sitio,
así que duplicarla es doblemente raro.

**Corrección:** una sola entrada. Se queda la del sidebar (`VA Mailbox`), que es la que está
visualmente separada como manda la decisión 7. Se quita la de la topnav.

---

### D4 — Tres controles de Reports y uno de Shared Access siguen en toast

El criterio del prompt de capacidad es explícito: *"Los controles que quedan en tipo C son sólo
los de Settings y `Bulk download`"*. Hoy quedan cuatro fuera de esa lista:

| Vista | Control |
|---|---|
| Reports | `Schedule` |
| Reports | `Export` |
| Reports | `New Report` |
| Shared Access | `Request Access` |

Los 21 de Settings están bien y se quedan.

**Corrección, en este orden de prioridad:**
- `New Report` → tipo A. La Fase D.3 del prompt de capacidad ya lo pedía ("ejecutar un reporte
  guardado"). Un modal que elige métrica, rango y agrupación, y pinta el resultado con los
  datos que Reports ya calcula.
- `Request Access` → tipo A. Añade una fila en estado `Pending` a la tabla de accesos.
- `Export` → tipo A barato: genera el CSV en memoria y lo ofrece como descarga.
- `Schedule` → **se queda en toast.** Necesita un backend y está bien que lo diga.

Si el presupuesto de tiempo aprieta antes del jueves, **D4 es lo primero que se recorta.**

---

### D5 — Tres identificadores de checklist declarados y nunca usados

`ds_c3_3`, `ds_c4_1` y `ds_c4_2` existen en `DS_CHECKLISTS` y ninguna lección los referencia.
De los 17 declarados, sólo 14 se usan.

**No los borres** — `docusign-data.js` está congelado y no vale la pena romper esa regla por
esto. Sólo verifica que no aparezcan en ninguna interfaz y **anótalo en el informe**: o falta
una lección que los use, o son residuo de un recorte. Es una decisión de currículum, no de
código, y necesita autorización.

---

### D6 — 131 estilos inline contra un presupuesto de 82

`grep -c 'style="' docusign-app.js` → **131**. El criterio del prompt de capacidad decía ≤ 82.
Las fases nuevas entraron con estilo inline en vez de clases en `docusign.css`.

Invisible para el usuario, así que **no bloquea la entrega**. Pero baja lo que toques al pasar
por D1–D4, y no añadas ni uno nuevo.

---

## 3. Lo que NO hay que arreglar

Para que nadie gaste tiempo del jueves en esto:

- **`#dsAttachPurchaseAgreement` con tamaño 0 fuera de lección — no es un defecto.** El panel
  `.ds-samples` sólo lleva la clase `on` cuando `dsShowSampleDocs()` devuelve `true`, y esa
  función devuelve `SimEngine.walkActive()`. Verificado: durante el walkthrough real de la
  lección 2 el panel abre y el botón mide 210×35. Es la separación curso/producto funcionando.
- **`Deleted` y `Bulk Send` ocultos en el sidebar — no es un defecto.** Viven dentro del grupo
  que despliega `dsToggleSidebarMore()` ("Show More"), igual que en DocuSign real.
- **La bandeja tiene lenguaje de entrenamiento — es deliberado.** La decisión 7 manda separarla
  visualmente. Lo que hay que arreglar es que se oculte en `?demo=1` (D2), no su texto.
- **El banco del examen tiene 25 ítems para un blueprint de 14** y todas las categorías cubren
  su cuota. No hace falta ampliarlo.

---

## 4. El plan de verificación de la entrega

Se corre **entero** antes de dar el módulo por entregado. Cada punto se marca ejecutándolo,
no leyéndolo.

**Las 10 lecciones**

1. Cada lección abre y muestra **sus pasos en lenguaje humano** — ningún `ds_`, `tri-`, `ver-`, `cmp-`
2. La lección 1 se completa entera con el walkthrough, paso por paso
3. La lección 2 llega al paso de adjuntar y el panel de documentos de muestra abre
4. Las lecciones 3 a 10 se completan enteras
5. Al completar una lección se desbloquea la siguiente
6. `Restart this lesson` limpia esa lección y sólo esa

**El examen**

7. Entrega 14 ítems: 6 judgment, 4 triage, 3 verify, 1 compose
8. El temporizador de 45 minutos corre y se muestra
9. Se puede responder, navegar entre preguntas y entregar
10. La nota se calcula sobre 75 puntos y el 75% aprueba

**El producto**

11. Las 13 vistas renderizan sin error de consola
12. El envío de un sobre, los 4 pasos, produce un sobre que aparece en Agreements
13. Ese sobre se puede abrir como firmante, firmar, rechazar y posponer
14. Access Code puesto en el envío **bloquea** al firmante hasta introducirlo
15. Se crea, edita, duplica y borra una plantilla
16. Se crea un Bulk Send desde CSV y un PowerForm
17. La bandeja de correo lista los 7 correos y filtra por las 5 categorías
18. Sólo 21 controles responden con toast, todos en Settings, más `Schedule` en Reports

**La separación**

19. **`?demo=1` no muestra `Lessons`, `Final Exam` ni la bandeja de correo**
20. La bandeja aparece **una sola vez** en la navegación
21. F5 borra todo lo creado y devuelve la cuenta a 86 sobres y 17 plantillas
22. F5 **conserva** el progreso de lecciones
23. `grep -n localStorage Docusign/*.js` devuelve exactamente 3 escrituras, todas de `dsStore`
24. `git diff Docusign/docusign-data.js` vacío; `git diff assets/` vacío; `git diff Quialia/` vacío

---

## 5. Orden y presupuesto

| # | Defecto | Esfuerzo | ¿Bloquea el jueves? |
|---|---|---|---|
| D1 | Etiquetas de los pasos | ~10 líneas | **Sí** |
| D2 | Bandeja visible en `?demo=1` | ~5 líneas | **Sí** |
| D3 | Entrada duplicada | ~3 líneas | Sí, es de un minuto |
| D4 | Cuatro controles en toast | Medio | No |
| D5 | Tres ids sin usar | Sólo reportar | No |
| D6 | Estilos inline | Continuo | No |

**D1, D2 y D3 primero, y en ese orden.** Suman menos de veinte líneas y cierran todo lo que se
ve. Con esas tres, el módulo se entrega.

D4 sólo si sobra tiempo, y en el orden de prioridad de §2. D6 se hace de paso, nunca como tarea
propia.

**Un commit por defecto.** El plan de §4 completo antes de dar por cerrada la entrega.

---

## 6. Decisiones ya tomadas — no las vuelvas a preguntar

1. `docusign-data.js` no se edita. Ni para D5.
2. Ningún `dsMark()` cambia de gesto. Ningún selector de walkthrough se renombra.
3. F5 borra lo del visitante; el progreso de lecciones sobrevive.
4. Ninguna escritura nueva a `localStorage`, `sessionStorage`, IndexedDB ni cookies.
5. Cero red, cero dependencias, cero `Math.random()` ejecutable.
6. Los 21 toasts de Settings y `Schedule` en Reports se quedan en tipo C.
7. La bandeja de correo se queda visualmente separada, y se oculta en `?demo=1`.
8. Vanilla JS, interfaz y comentarios en inglés, estilos en `docusign.css`.

**Sí pregunta si:** una corrección te obliga a tocar `docusign-data.js`, `assets/` o los
selectores de walkthrough, o si al correr el plan de §4 encuentras que una lección falla por
algo que este documento no lista. En ese caso **para y repórtalo antes de tocar nada** — quedan
tres días y una regresión cuesta más que un defecto conocido.
