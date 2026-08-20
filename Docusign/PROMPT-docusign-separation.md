# PROMPT MAESTRO — DocuSign: separar el curso del producto

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-separation.md`".
>
> Complementa a `PROMPT-docusign-fidelity.md` (cómo se ve) y a
> `PROMPT-docusign-world.md` (qué contiene). Éste resuelve **cuándo el producto es
> producto y cuándo es curso**. Si algo choca entre los tres, manda éste.

---

## 0. El principio

Trabajas **exclusivamente** en `Docusign/`. No toques `Quialia/`. No toques `assets/`.

Hay dos cosas distintas viviendo en la misma aplicación:

- **El producto** — DocuSign. Sobres, plantillas, reportes, ajustes. Alguien lo abre,
  navega y explora.
- **El curso** — 10 lecciones y un examen. Usan el producto como campo de práctica.

Hoy están entrelazados: navegar por el producto **califica** lecciones, la pantalla de
inicio del producto muestra tarjetas de lección y barras de progreso, y una lección abierta
sigue viva aunque el usuario se haya ido a otra parte hace diez clics.

**La regla que debe quedar cierta al terminar:**

> Si no estás cursando una lección, el módulo se comporta como DocuSign y **nada** de lo
> que hagas toca el progreso del curso. Si estás cursando una lección, lo sabes en todo
> momento y puedes salirte en un clic.

Esto no es cosmético. Un visitante que explora hoy deja lecciones marcadas como completadas
sin haberlas hecho, y el siguiente que abra el simulador se encuentra un curso a medio
calificar que nadie cursó.

---

## 1. Qué NO se toca

| Archivo / símbolo | Por qué |
|---|---|
| `Docusign/docusign-data.js` | Currículum calificado. **Congelado.** |
| `assets/js/sim-engine.js`, `assets/css/sim-engine.css` | Motor compartido con otro módulo |
| `Docusign/docusign-tour.js` | Tour guiado |
| `Quialia/` completo | Otro módulo |

Todo el arreglo cabe en `docusign-app.js`, `docusign.css` y `testdrive-docusign.html`.
Si crees necesitar tocar el motor o el currículum, **detente y pregunta**: casi siempre
significa que el arreglo se puede hacer del lado del host.

**Contratos vivos que no se mueven:** los 17 identificadores de calificación
(`ds_c1_1`…`ds_c5_4`, `ds_env_open`) siguen disparándose desde los mismos gestos y desde los
mismos controles. Los 13 selectores de walkthrough siguen existiendo. Este arreglo **no
mueve ni un solo `dsMark()` de sitio** — le pone una compuerta delante. Esa distinción es
toda la seguridad del cambio.

---

## 2. Diagnóstico — los seis puntos de mezcla

Verificados en el código actual. Arréglalos todos.

### M1 — Navegar califica (el peor)

`dsGotoNow()` ([docusign-app.js:829-832](docusign-app.js)):

```js
if (view === 'envelopes')       { dsState.page = 1; dsMark('ds_c5_1'); }
if (view === 'envelope-detail') { dsState.activeEnvId = extraId; dsMark('ds_env_open'); }
if (view === 'new-envelope')    dsMark('ds_c1_1');
if (view === 'templates')       dsMark('ds_c4_1');
```

`dsGotoNow` es la función de navegación de **todo** el módulo. Ponerle `dsMark()` significa
que cualquier llegada a esas cuatro vistas califica, venga de donde venga:

- del clic del usuario,
- de `dsLessonStepNavigate()` — el hook que usa el motor para llevarte a la vista de un paso,
- de los `setup()` de las propias lecciones (`setup: () => dsGoto('envelopes')`,
  `setup: () => { dsResetWizard(); dsGoto('new-envelope'); }`, …).

Es decir: **abrir una lección auto-completa hasta cuatro ítems que el trainee nunca ejecutó.**

Es exactamente el bug que el propio código dice haber arreglado. El comentario sobre `dsMark`
avisa: *"Every call site must be an event handler, NEVER a render function — that was the v2
bug where 7 items auto-completed on navigation."* Lo sacaron de la función de render y lo
metieron en la de navegación, que es peor, porque de ahí tira el motor de lecciones.

**Arreglo: borra las cuatro llamadas.** No hacen falta — ver M2.

### M2 — Marcas duplicadas

`dsOpenSent()`, `dsOpenNewEnvelope()` y `dsOpenEnvelope()`
([docusign-app.js:774-787](docusign-app.js)) ya llaman a `dsMark()` explícitamente después de
`dsGoto()`. Con M1 arreglado quedan como única vía, que es lo correcto: **son handlers de
evento, disparados por un gesto real del usuario.**

Verifica que Templates tenga su equivalente. Si `ds_c4_1` hoy solo se marca desde
`dsGotoNow`, crea un `dsOpenTemplates()` y cablea ahí el nav superior y el sidebar.

### M3 — El modo demo también califica

`dsMark()` escribe en `localStorage` sin mirar si estamos en `?demo=1`. El enlace que se le
entrega a un stakeholder oculta las lecciones pero sigue marcándolas por debajo.

### M4 — Una lección abierta nunca se cierra

`dsState.lessonId` se asigna al abrir una lección y **no se limpia nunca**. No existe ningún
control de "salir de la lección". El trainee abre la Lección 3, se aburre, se va a Reports, y
sigue técnicamente dentro de una lección durante el resto de la sesión.

### M5 — La pantalla de inicio del producto es media pantalla de curso

`dsDashboardHTML()` ([docusign-app.js:1067-1097](docusign-app.js)) monta un bloque
`ds-train-block` con las 10 tarjetas de lección, las barras de checklist, el marcador de
escenarios y el botón de examen. Ya se oculta en `?demo=1`, pero en modo normal la primera
pantalla del producto es mitad DocuSign y mitad plataforma de cursos.

### M6 — No hay señal de en qué modo estás

Nada en pantalla dice "estás dentro de la Lección 4". El único indicio es la pestaña Lessons
encendida, y sólo mientras estás en una vista de curso: en cuanto un paso de lección te lleva
al wizard, la barra superior enciende **Agreements** y el trainee pierde el hilo.

Éste es el que produce el síntoma que se ve raro: das clic en un botón del producto durante
una lección y el walkthrough hace algo, pero nada te había dicho que seguías en una lección.

---

## 3. El modelo: tres modos, uno solo activo

```
Modo producto   (por defecto)   DocuSign puro. Cero calificación. Cero chrome de curso
                                dentro de las vistas de producto.
Modo lección    (explícito)     Se entra abriendo una lección o el examen. El producto es
                                el campo de práctica, la calificación está viva, y un
                                banner permanente dice cuál es y cómo salir.
Modo demo       (?demo=1)       Producto, con el curso invisible e inalcanzable.
                                dsMark() es no-op incondicional.
```

Implementación, **derivando en vez de almacenar** para no inventar un segundo estado que
pueda desincronizarse:

```js
/* True only while the visitor is actually taking a lesson. Derived rather than stored:
   a second source of truth for "am I in a lesson" is a second thing that can go stale.
   The walkthrough answers for itself; dsState.lessonId covers the case where the trainee
   exits the walkthrough but keeps practising inside the lesson they opened. */
function dsTrainingActive() {
  if (dsDemoMode()) return false;
  return SimEngine.walkActive() || dsState.lessonId != null;
}
```

Se **entra** en modo lección al abrir una tarjeta de lección, al iniciar un walkthrough, o al
abrir el examen. Se **sale** con el botón "Exit lesson" del banner (§5), al completar la
lección, o con F5 — `dsState` vive en memoria, así que recargar siempre devuelve al modo
producto. Eso es coherente con el modelo de estado dual que ya existe.

> `dsState.lessonId` hoy no se limpia nunca. El botón de salir del banner es quien lo pone a
> `null`. Sin ese botón, el modo lección sería una trampa sin puerta.

---

## 4. La compuerta única

Todo el arreglo de calificación es **una sola guarda, en un solo sitio**:

```js
function dsMark(id) {
  /* Product mode never grades. The 17 checklist triggers stay wired to exactly the same
     controls they always were — this gate decides whether the gesture counts, not where
     it lives. That is what makes this change safe: no call site moves. */
  if (!dsTrainingActive()) return;

  ...resto igual...
}
```

Por qué así y no de otra forma:

- **No mueve ningún `dsMark()`.** Los 17 identificadores siguen colgando de los mismos
  botones. El contrato con los walkthroughs queda intacto.
- **Un solo punto de decisión.** Nada de repartir `if` por 20 handlers, que es como se
  vuelve a filtrar dentro de tres meses.
- **`?demo=1` cae por el mismo camino**, sin código aparte.

Y un flag de supresión para la navegación programática, por si algún `setup()` de lección
necesita llevarte a una vista sin que eso cuente como haberla visitado:

```js
/* Set while the engine is repositioning the app for a lesson step. Navigation performed
   BY the course is not an achievement OF the trainee. */
let dsSuppressMarks = false;
```

`dsLessonStepNavigate()` lo levanta antes de navegar y lo baja después; `dsMark()` sale
temprano si está levantado. Con M1 arreglado esto es cinturón sobre tirantes, pero es barato
y cierra la puerta para siempre.

---

## 5. El banner de lección

La pieza que hace legible la separación. Mientras `dsTrainingActive()` sea cierto, una franja
fija encima del contenido, en **todas** las vistas, incluidas las de producto:

```
[icono]  Lesson 4 of 10 — Correcting and Voiding    Step 2 of 7    [Back to lesson]  [Exit lesson]
```

- Visualmente **distinta del producto**: es chrome del curso, no de DocuSign. Franja
  delgada, color de acento del entrenamiento, nunca el azul de DocuSign.
- `Back to lesson` vuelve a la vista de la lección. `Exit lesson` limpia
  `dsState.lessonId`, cierra el walkthrough si hay uno, y devuelve a modo producto con un
  toast: *"Lesson exited. Your progress is saved."*
- Nunca aparece en modo demo ni en modo producto.
- No debe empujar el layout ni tapar el botón `Start` del sidebar: reserva su alto en el
  contenedor, no la superpongas.

Con esto, el síntoma de "di clic en Start y pasó algo raro" desaparece: el banner ya te había
dicho que estabas dentro de una lección, y tienes la salida a la vista.

---

## 6. Limpiar las vistas de producto

**Home.** Saca el bloque `ds-train-block` completo de `dsDashboardHTML()`: las tarjetas de
lección, las barras de checklist y el marcador de escenarios se van a la vista `lessons`, que
es su sitio. En su lugar, en modo producto, deja **una sola franja delgada al final de la
página**: una línea de texto y un botón *"Open training"*. Nada de tarjetas, nada de barras
de progreso. En modo demo no aparece; en modo lección tampoco, porque ahí sobra.

**Barra superior y sidebar.** Un único punto de entrada al curso, visualmente separado del
resto: agrupado bajo un encabezado `TRAINING`, al final del sidebar, con separador. Se sigue
ocultando entero en `?demo=1`.

**`dsSyncNav`.** Hoy la pestaña Lessons se enciende para las vistas de curso, pero cuando un
paso de lección te lleva al wizard se enciende Agreements. Eso es correcto — el wizard **es**
producto — y debe quedarse así. La señal de "estoy en una lección" es el banner de §5, no la
barra de navegación. No intentes resolverlo dos veces.

**Vistas de producto.** Ninguna debe leer `dsStore.checklist`, `dsStore.scenarios`,
`dsStore.lessonsDone` ni `SimEngine.lessonState()`. Búscalo y sácalo. Un `grep` de esos
símbolos en las funciones `dsDashboardHTML`, `dsEnvelopesHTML`, `dsEnvelopeDetailHTML`,
`dsTemplatesHTML`, `dsReportsHTML`, `dsSettingsHTML` y las del wizard debe salir vacío.

---

## 7. La decisión que hay que tomar — léela antes de codificar

Con la compuerta puesta, **la práctica libre deja de calificar**. Hoy un trainee puede
explorar el producto por su cuenta e ir llenando los checklists sin abrir ninguna lección;
después del cambio, esos mismos gestos no cuentan.

Eso es exactamente lo que pide el principio de §0, y es la opción recomendada: los checklists
pasan a ser **progreso de lección**, no un logro suelto.

Si el cliente prefiere conservar la práctica libre, la forma correcta **no** es quitar la
compuerta, sino añadir un tercer camino explícito: un interruptor *"Practice mode"* dentro de
la sección de entrenamiento, que enciende `dsTrainingActive()` a voluntad y muestra el mismo
banner con otro texto. Sigue siendo un modo consciente, sigue siendo visible, y sigue
desapareciendo con F5.

**No implementes las dos.** Empieza por la recomendada y pregunta si hay duda.

---

## 8. Fases

| Fase | Contenido | Riesgo |
|---|---|---|
| 0 | **Línea base.** Corre las 10 lecciones y el examen antes de tocar nada. Anota qué ítems quedan marcados al terminar cada lección — es tu tabla de comparación. | — |
| 1 | Borrar los cuatro `dsMark()` de `dsGotoNow` (M1). Crear `dsOpenTemplates()` si hace falta (M2). Correr la regresión. | **Alto** |
| 2 | `dsTrainingActive()` + la compuerta en `dsMark()` + `dsSuppressMarks`. Correr la regresión. | **Alto** |
| 3 | Banner de lección + botón "Exit lesson" que limpia `dsState.lessonId`. | Medio |
| 4 | Limpiar Home y el resto de vistas de producto (M5, M6). | Bajo |
| 5 | Reagrupar la entrada al curso en el sidebar y la barra superior. | Bajo |

Las fases 1 y 2 son las que pueden romper el entrenamiento. Hazlas de una en una, con la
regresión completa entre ambas. **No las juntes en un solo commit.**

---

## 9. Matriz de regresión — el criterio real de "listo"

### El curso sigue funcionando
- [ ] Las 10 lecciones se completan de principio a fin
- [ ] En cada lección, los ítems que quedan marcados al terminar son **exactamente** los de
      la tabla de la Fase 0 — ni uno más, ni uno menos
- [ ] Los walkthroughs encuentran sus 13 objetivos y los pasos avanzan al gesto correcto
- [ ] El examen abre, califica y reporta igual que antes
- [ ] El tour guiado funciona igual que antes
- [ ] Reiniciar una lección no re-bloquea las siguientes

### La separación es real
- [ ] Sesión limpia, sin abrir ninguna lección: recorrer **todo** el producto — Home,
      Agreements, abrir un sobre, wizard completo hasta enviar, Templates, Reports, Settings,
      PowerForms, Bulk Send, Deleted, Shared Access — y comprobar que
      `Object.keys(dsStore.checklist).length === 0`
- [ ] Abrir una lección y **no ejecutar ningún paso**: ningún ítem se marca solo
- [ ] Abrir la Lección 2, salir con "Exit lesson", clicar Start: no se marca `ds_c1_1`
- [ ] `?demo=1`: recorrer todo el producto → `localStorage` no cambia ni un byte
- [ ] `?demo=1`: no hay banner, ni entrada al curso, ni tarjetas de lección en Home
- [ ] Home en modo producto no muestra ninguna tarjeta de lección ni barra de checklist

### El modo siempre es evidente
- [ ] Dentro de una lección, el banner es visible en **todas** las vistas, incluido el wizard
      y el detalle de sobre
- [ ] "Exit lesson" devuelve a modo producto y el banner desaparece
- [ ] El banner nunca tapa el botón `Start` ni el primer elemento del contenido
- [ ] F5 durante una lección → vuelve a modo producto, con el progreso intacto

### Código
- [ ] `grep -n "dsMark(" Docusign/docusign-app.js` → ninguna llamada dentro de una función
      de navegación o de render; todas en handlers de evento
- [ ] Ninguna vista de producto referencia `dsStore.checklist`, `dsStore.scenarios`,
      `dsStore.lessonsDone` ni `SimEngine.lessonState`
- [ ] `git diff Docusign/docusign-data.js` → vacío
- [ ] `git diff assets/` → vacío
- [ ] `git diff Quialia/` → vacío
- [ ] Sin errores ni warnings de consola en ninguna vista, en los tres modos
- [ ] Estilos del banner en `docusign.css`, no inline. Sin `!important`
- [ ] Comentarios en inglés, explicando el porqué

---

## 10. Decisiones ya tomadas — no las vuelvas a preguntar

1. El arreglo vive entero en `Docusign/`. Ni motor ni currículum se tocan.
2. **Ningún `dsMark()` cambia de sitio.** Se le pone una compuerta delante.
3. `dsTrainingActive()` se **deriva**, no se almacena.
4. Modo lección se entra explícitamente y se sale con un botón visible.
5. F5 siempre devuelve a modo producto; el progreso del curso sobrevive.
6. Home queda como Home: nada de tarjetas de lección ni checklists.
7. Un solo punto de entrada al curso, agrupado y visualmente separado.
8. La práctica libre deja de calificar (§7). Si el cliente la quiere de vuelta, es un
   "Practice mode" explícito, no quitar la compuerta.
9. Fases 1 y 2 en commits separados, con regresión completa entre ambas.
10. Vanilla JS. Sin dependencias. Interfaz en inglés, comentarios en inglés.

**Sí pregunta si:** el arreglo te obliga a mover un `dsMark()`, a tocar uno de los 13
selectores, a editar `docusign-data.js` o `assets/`, o si al correr la línea base encuentras
que una lección ya dependía de una marca disparada por navegación — en ese caso, **para y
repórtalo antes de cambiar nada**.
