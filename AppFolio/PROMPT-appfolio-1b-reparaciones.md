# PROMPT 1b — AppFolio: reparaciones del contrato

> Pásale este documento completo a un agente de código, o dile:
> **"sigue `AppFolio/PROMPT-appfolio-1b-reparaciones.md`"**.
>
> Addendum del 1/3. El contrato ya se construyó y **corre**. Esto cierra los cinco
> defectos que encontró la auditoría y —más importante— tapa un **hueco estructural**
> que hoy no da síntoma pero que reventaría en el 3/3.
>
> No añade ni una entidad ni una lección. Sigue siendo el contrato.

---

## 0. Por qué existe este documento

El 1/3 se corrió y pasó **18 de 23** pruebas. Eso está bien: el corazón del diseño
—los dos almacenes, el conmutador, el determinismo, cero huérfanos— funciona y está
verificado en el navegador, no de memoria.

Lo que falló no fue el diseño. Fue el **borde**: el enganche con la plataforma, la
frontera de `?demo=1`, y una promesa del §5.2 que hoy se cumple **por accidente**.

Ese último punto es la razón real de este documento. Todo lo demás es lista de tareas.

---

## 1. Estado verificado — no lo vuelvas a auditar

Esto ya se comprobó en el navegador contra `http://localhost:5799`. Dalo por bueno
y no gastes turnos re-verificándolo, salvo como regresión al final.

| Comprobado | Resultado |
|---|---|
| `afStore` = exactamente las 10 claves del §4.1 | ✅ |
| `afDemo` = objeto nuevo por carga, 12 claves, nunca leído de storage | ✅ |
| `grep localStorage AppFolio/*.js` | ✅ 3 líneas reales (`afLoad`/`afSave`/`afResetProgress`) |
| `sessionStorage` / `indexedDB` / `document.cookie` / `window.name` | ✅ cero |
| `afMark()` en sandbox → no escribe; en lección → escribe | ✅ verificado en consola |
| Reset sandbox ↮ Reset progreso, con copy `safe:` en ambos | ✅ |
| Las 19 vistas de `AF_VIEWS` navegan, cero `"view not found"`, cero excepciones | ✅ |
| `afAuditIntegrity()` | ✅ **0** referencias rotas (incluye reciprocidad unit↔lease) |
| Determinismo: dos cargas → hash idéntico del catálogo completo | ✅ |
| `Math.random()` / `new Date()` ejecutables | ✅ cero |
| Importes: cero números no-enteros en 8 colecciones de dinero | ✅ |
| Controles: **51 total, 51 con manejador, 0 muertos, 24 tipo C** | ✅ |
| `SimEngine.init()` con `AF_LESSONS = []` + las 8 callbacks | ✅ |
| Tour abre / avanza / cierra, marca `tourSeen` | ✅ |
| Responsive 900 / 1280 / 1440 / 1920 — cero scroll horizontal en las 19 vistas | ✅ |
| Consola limpia · red: cero peticiones externas | ✅ |
| `assets/` sin tocar | ✅ |
| `.td-strip-back` **sin** el `onclick` que borra el progreso | ✅ bug heredado evitado |

**La línea base de tipo C es 24 de 51.** El 2/3 medirá su avance contra ese número.

Los tokens de marca se derivaron de referencia real (las cinco capturas en
`Images-resources/`) y el `:root` documenta el origen de cada color. El bloqueo del
§8.1 se resolvió correctamente. **No los re-derives.**

---

## 2. Lo que ya está hecho — NO lo rehagas

**El alta en `index.html` ya se aplicó.** Los dos bloques del §3.5 están puestos,
con clase de color propia `af` y `Images-resources/appfolio-icon.svg` como logo:

- `.td-mini-row` en `.td-launch-apps` (después de la fila de DocuSign)
- `.td-tile.af` en `.td-tiles` dentro de `#tdOverlay`, apuntando a `AppFolio/testdrive-appfolio.html`
- Cuatro reglas CSS nuevas (`.td-mini.af`, `.td-mini.af img`, `.td-tile.af …`)

Diff total: **10 inserciones, 0 borrados**. Verificado: el overlay lista los cinco
test drives, el tile navega, AppFolio arranca en `dashboard`, consola limpia.

Tu única obligación con `index.html` es **no volver a tocarlo**. Si `git diff index.html`
muestra algo distinto de esas 10 líneas al terminar, lo rompiste.

---

## 3. Las reparaciones

Ordenadas por riesgo real, no por esfuerzo. La R1 es la que importa.

---

### R1 — CRÍTICA · El gate único todavía no existe

**Síntoma:** ninguno. Hoy todo pasa. Ese es exactamente el problema.

**Causa raíz.** El §5.2 promete que *"todo lo que califica se canaliza por `afMark()`,
así que un solo guard es toda la regla"*. Verifícalo tú mismo:

```bash
grep -n "afStore.scenarios\|afStore.reviews\|afStore.composes\|afStore.triages\|afStore.reconciles" AppFolio/*.js
```

Los cinco buckets aparecen **solo en lecturas** (`afLessonStepStatus`) y en **borrados**
(`afResetLesson`). **No existe ni un escritor.** `afMark()` es el único gate porque es
el único tipo de paso que se puede completar hoy: `do`.

La promesa del §5.2 no se cumple por diseño. Se cumple porque los otros cinco
calificadores todavía no se han escrito.

**Por qué importa.** En el 3/3 alguien va a escribir `afAnswerScenario()`,
`afSubmitCompose()`, `afSubmitTriage()`… cinco funciones, cinco oportunidades de
olvidar `if (afState.mode !== 'lesson') return;`. Es literalmente el mecanismo por el
que Qualia acabó con separación ~0%: no fue una decisión, fue una acumulación.

La ventaja de arreglarlo ahora es que **no hay nada que migrar**. Cuesta una función.
En el 3/3 costará auditar cinco.

**La reparación.** Un único registrador para las cinco respuestas calificadas, con el
mismo guard y la misma forma que `afMark()`:

```js
/* The five graded buckets have exactly one writer, for the same reason checklist
   has exactly one: a reviewer must be able to confirm the course/product boundary
   by reading one function, not by auditing five call sites. Writing to
   afStore.scenarios (or reviews, reconciles, composes, triages) directly is a
   defect, not a shortcut. */
const AF_ANSWER_BUCKETS = ['scenarios', 'reviews', 'reconciles', 'composes', 'triages'];

function afRecordAnswer(bucket, id, payload) {
  if (afState.mode !== 'lesson') return false;
  if (AF_ANSWER_BUCKETS.indexOf(bucket) === -1) return false;
  if (!id) return false;
  afStore[bucket][id] = payload;
  afSave();
  afNotifyAnswerRecorded(bucket, id);
  return true;
}
```

Requisitos:

1. Devuelve `boolean` — la vista necesita saber si se registró, para no pintar un
   feedback de "correcto" que no se guardó.
2. `afNotifyAnswerRecorded()` es el hermano de `afNotifyStepDone()`: avisa al
   walkthrough de SimEngine cuando el paso corriente es el que se acaba de contestar.
   Impleméntalo con la misma forma (`SimEngine.walkActive()` → `SimEngine.stepCompleted()`).
3. **`afNoteLessonComplete()` recibe el mismo guard.** Hoy no lo tiene
   (`appfolio-app.js`, hoy en `:1142`). Es defensa en profundidad: lo llama el motor,
   pero el motor no debería ser la única cosa que impide escribir progreso desde el sandbox.
4. Documenta la regla **en el archivo**, encima de `AF_ANSWER_BUCKETS`, no solo aquí.
   El 3/3 lo leerá ahí.

**Cómo se verifica** (§5, pruebas P1–P4).

---

### R2 — ALTA · `?demo=1` filtra el curso en Settings

**Síntoma.** Con `?demo=1` la navegación sí oculta *Lessons* y el conmutador sí
desaparece — pero **Settings sigue mostrando el grupo `TRAINING` → "Sandbox and
progress"**, con el botón *Reset training progress* dentro. Un stakeholder que abre el
enlace ve el andamiaje del curso.

Reproducible:

```js
// en http://localhost:5799/AppFolio/testdrive-appfolio.html?demo=1
afGoto('settings');
document.getElementById('afRoot').innerText.match(/training/i);   // → coincide
```

**Causa raíz — y no es "falta un `if`".** Hay **dos mecanismos paralelos** para decir
"esto es del curso":

| Lista | Marca | ¿Filtra? |
|---|---|---|
| `AF_SECTIONS` (`appfolio-app.js`) | `training: true` — un **flag** | ✅ `s.training && afDemoMode()`, hoy en `:629` |
| `AF_SETTINGS_PAGES` (`appfolio-shell.js` `:210`) | `group: 'Training'` — una **cadena de UI** | ❌ ninguno |

Un flag booleano y una etiqueta de interfaz no son la misma cosa. La segunda lista se
escribió después y nadie notó que había un contrato que cumplir, porque el contrato
vivía dentro de una expresión suelta en otro archivo. Parchear con un `if` deja el
tercer caso listo para repetirse.

**La reparación — una sola fuente de verdad:**

1. Extrae el predicado a una función con nombre, junto a `afDemoMode()`:

   ```js
   /* One predicate for every list that mixes course scaffolding with product.
      AF_SECTIONS and AF_SETTINGS_PAGES both answer to this; a third list must too. */
   function afShowsTraining() { return !afDemoMode(); }
   ```

2. `AF_SECTIONS` pasa a usarlo. No dejes la comparación inline.

3. Añade **`training: true`** al grupo de `AF_SETTINGS_PAGES` — el mismo flag, no otra
   convención — y filtra el rail con `afShowsTraining()` antes de pintarlo.

4. **Segundo orden, no lo saltes.** Si `afState.settingsPage` apunta a una página que
   acabas de ocultar, `afSettingsHTML()` cae al `else` y pinta *"Not available in this
   demo"*. Redirige a `'profile'` en su lugar. `afState` no se persiste, así que hoy
   solo pasa haciendo clic — mañana no necesariamente.

5. **Tercer orden.** El lede de la página lo dice en voz alta:
   `afPageHead('Settings', 'Account, operations and the training sandbox.')`. En modo
   demo esa frase también sobra. Condiciónala.

**Regla general que sale de aquí, y que va escrita en el archivo:** cualquier colección
que mezcle andamiaje del curso con producto lleva `training: true` en el elemento y se
filtra con `afShowsTraining()`. Sin excepciones, sin cadenas de UI haciendo de flag.

---

### R3 — MEDIA · La detección de paso rancio del §5.4 no se implementó

**Síntoma.** `afRenderLessonBanner()` (hoy en `appfolio-app.js:648`) pinta etiqueta +
título + *Exit lesson*. Nada más.

**Qué pedía el §5.4.** Con el producto en memoria y el progreso en disco, tras un F5 a
mitad de lección el paso **sigue marcado** pero su **efecto visible se revirtió**. Es el
coste conocido del modelo, y la instrucción era explícita: *"el banner debe poder
detectar esa situación —paso marcado, efecto ausente— y ofrecer rehacer la acción. No lo
resuelvas persistiendo el sandbox."*

**El problema de fondo.** Detectar "efecto ausente" exige saber **qué efecto** dejaba
cada paso, y eso es dato de currículum — llega en el 3/3. Por eso se saltó. Correcto en
la conclusión, incorrecto en la acción: lo que se salta no es el dato, es el **mecanismo**.

**La reparación — mecanismo ahora, dato en el 3/3:**

1. Contrato de paso: un paso `do` puede declarar `effect: function () { return bool; }`
   — *"¿está presente todavía mi consecuencia visible?"*. Opcional; un paso sin `effect`
   nunca se considera rancio.

2. Función pura, testeable sin lecciones reales:

   ```js
   /* A step is stale when the transcript says it is done but the sandbox — which
      lives in memory — no longer shows what it did. That divergence is the price of
      keeping the product out of localStorage, so it gets surfaced and offered a redo
      instead of being hidden or "fixed" by persisting the sandbox. */
   function afStaleSteps(lessonId) { /* → [step] */ }
   ```

3. El banner llama a `afStaleSteps(afState.lessonId)`. Si devuelve algo, añade una fila
   con el conteo y un botón **"Redo this step"** que navega al paso (`afLessonStepNavigate`).
   Si devuelve vacío, el banner queda exactamente como está hoy.

4. Con `AF_LESSONS = []`, `afStaleSteps()` devuelve `[]` y el banner no cambia. El módulo
   sigue enviándose vacío.

5. Escribe el porqué en el archivo, en dos frases. Quien lea esto en el 3/3 tiene que
   entender por qué existe un `effect()` opcional antes de escribir el primero.

---

### R4 — MEDIA · `.af-subnav`: abre el hueco ahora

**Síntoma.** El §8.2 dibuja la banda `.af-subnav` entre topbar y body. No existe: ni en
el DOM, ni en el CSS, ni una función que la pinte.

**Por qué no basta con diferirlo.** Hoy no hay contenido que meterle y la decisión de
saltarla fue razonable. Pero el §8.2 lleva escrita, en el mismo párrafo, la lección que
la contradice: *"Aprende del error documentado en Qualia: un banner metido en un
contenedor `display:flex` se convirtió en una columna de 305px al lado de la app."*

Meter una banda estructural entre una topbar de altura fija (`--af-topbar-h: 58px`) y un
`main` con scroll propio es **exactamente** esa clase de retrofit. Cuesta 15 líneas hoy
y una tarde de depuración de layout en el 2/3, cuando Properties, Leasing y Accounting
ya tengan pestañas y alguien las quiera colgar de ahí.

**La reparación:**

1. `<div class="af-subnav" id="afSubnav" hidden></div>` en el HTML, **hermano** de
   `.af-topbar` y de `.af-body` — nunca hijo de ninguno. Mismo razonamiento que el
   banner de lección.
2. `afRenderSubnav()`, llamada desde `afRenderChrome()`. Devuelve `''` para todas las
   secciones de hoy → el elemento queda `hidden` y no ocupa una sola línea de caja.
3. CSS de la banda: altura, línea inferior, alineación de pestañas. Que exista y esté
   probado con el elemento visible aunque no se use.
4. Verifica que con la banda **visible** las 19 vistas siguen sin scroll horizontal de
   1280 a 1920 y que `.af-body` sigue teniendo su propio scroll.

---

### R5 — BAJA · `documents/doc.css` y un documento de humo

**Síntoma.** `AppFolio/documents/` está vacía. El §3.1 pedía `doc.css`.

**Contexto que no puedes inventar.** Es una convención establecida y hay dos
implementaciones que copiar: `Docusign/documents/doc.css` (32 líneas) y
`Quialia/documents/doc.css` (28). Definen el lienzo tipo papel del modal:
`.paper`, `.letterhead`, `h2.sec`, `.row/.f`, `table.line-items`, `.sigrow/.sig`,
`.banner` (el aviso de documento ficticio) y `.foot`. Léelas antes de escribir la tuya.

El modal se abre con **`SimEngine.viewDoc(path, title)`** (`assets/js/sim-engine.js:758`).
AppFolio tiene hoy **cero** llamadas a esa API — nunca se ha probado que la tubería
funcione desde este módulo.

**La reparación:**

1. `AppFolio/documents/doc.css`, en la misma línea que las otras dos pero con la paleta
   de AppFolio. Añade las clases que el 2/3 va a necesitar y las otras dos no tienen:
   `.ledger` (cargo / pago / saldo, con `tabular-nums`), `.stmt` (estado del propietario)
   y `.notice` (avisos legales — 3 días, entrada, acción adversa).
2. **Un** documento de humo, `documents/sample-notice.html`, contra ese CSS. No siete.
   Solo el que demuestra que la tubería está conectada.
3. Un tipo C existente de Settings pasa a tipo A y llama a `SimEngine.viewDoc()`.
   Eso baja la cuenta de C de 24 a 23 — **anótalo en el informe**, es la primera
   conversión del módulo.
4. Fecha del documento contra `AF_TODAY`, nunca contra el reloj.

---

### R6 — BAJA · Siete colores literales fuera de `:root`

**Síntoma.** El §8.1 dice *"ni un color literal fuera de ese bloque"*. Hay siete:

```bash
awk '/^:root/{r=1} r&&/^}/{r=0;next} !r' AppFolio/appfolio.css AppFolio/appfolio-shell.css | grep -n "rgba\?("
```

Son scrims de modal, el anillo del tour y sombras: `rgba(16,16,20,.45)`, `rgba(0,0,0,.3)`,
`rgba(16,16,20,.5)`, `rgba(0,0,0,.28)`, `rgba(16,16,20,.4)`, `rgba(255,255,255,.16)` y el
punto de la franja.

**Por qué sí se arregla.** No es purismo: la mitad son el **mismo** scrim con tres alfas
distintas escritas a mano. Eso es una decisión de diseño duplicada seis veces, y es lo
que hace que un tema oscuro o un ajuste de contraste sea un buscar-y-reemplazar en vez
de un cambio de una línea.

**La reparación.** Cinco tokens en `:root` —`--af-scrim`, `--af-scrim-strong`,
`--af-shadow-md`, `--af-shadow-lg`, `--af-hover-tint`— y todos los usos apuntando a
ellos. Comprueba visualmente que modal, tour y franja siguen igual.

---

### R7 — HIGIENE · El commit y el informe del §13

`AppFolio/` sigue **untracked**. El §13 pedía un commit y un informe corto.

**El commit** incluye la carpeta completa, las 10 líneas de `index.html` y estos dos
prompts. Mensaje: que es el contrato del módulo, que las reparaciones del 1b van
dentro, y que el mundo llega en el 2/3.

**El informe** (§13, más lo de aquí):

- Los tokens derivados y de qué captura salió cada uno.
- Cualquier campo añadido o quitado de los 13 esquemas del §9.2, y por qué.
- **La cuenta de tipo C tras la R5** — es la línea base del 2/3.
- Dónde te obligó a elegir sin decirte cómo.
- **La forma final de `afRecordAnswer()`**, porque el 3/3 escribe contra ella.

---

## 4. Lo que NO se toca

- `assets/` — el motor está generalizado; AppFolio es el tercer consumidor y no lo justifica.
- `Docusign/` y `Quialia/` — tienen sus propios prompts corriendo.
- `index.html` más allá de las 10 líneas ya puestas.
- El catálogo semilla. Sigue siendo 1 propiedad. El mundo es el 2/3.
- `AF_LESSONS` sigue siendo `[]`. El currículum es el 3/3.
- Los tokens de marca, ya derivados de referencia real.

**Pregunta antes de seguir si:** necesitas una clave nueva en `afStore`; una reparación
te obliga a tocar `assets/`, `Docusign/` o `Quialia/`; o crees que una de las siete es
mala idea. Discrepar con argumento es mejor que ejecutar mal.

---

## 5. Batería de pruebas

Servidor: `py -m http.server 5799` desde la raíz. Requiere sesión —
`SCApp.login('maria@demo','demo123')` en la consola si te rebota a login.

**Nuevas**

- **P1 · El gate único.** En sandbox: `afRecordAnswer('scenarios','probe',{correct:true})`
  → devuelve `false`, `afStore.scenarios` vacío, `localStorage` sin cambios. En lección:
  → `true` y persiste. Repetir para los cinco buckets.
- **P2 · Un solo escritor.** `grep -n "afStore.scenarios\[\|afStore.reviews\[\|afStore.reconciles\[\|afStore.composes\[\|afStore.triages\[" AppFolio/*.js`
  → cada bucket aparece **una vez** escribiéndose, y esa vez está dentro de `afRecordAnswer`.
- **P3 · Bucket inválido.** `afRecordAnswer('checklist','x',1)` en modo lección → `false`,
  `afStore.checklist` intacto. El registrador no es una puerta trasera al resto del almacén.
- **P4 · `afNoteLessonComplete` guardada.** En sandbox no escribe `lessonsDone`.
- **P5 · Demo limpio.** Con `?demo=1`, recorrer las **11** secciones y las **7** páginas de
  Settings: `document.body.innerText` no contiene `training`, `lesson`, `course` ni
  `progress` en ninguna. Sin `?demo=1`, todo eso vuelve.
- **P6 · Redirección de Settings.** Ir a *Sandbox and progress*, recargar con `?demo=1`,
  entrar a Settings → cae en *Your profile*, no en un estado vacío.
- **P7 · Paso rancio.** Inyecta en consola una lección con un paso `do` cuyo `effect()`
  devuelva `false`, marca el paso, pinta el banner → aparece el conteo y el botón *Redo*.
  Con `effect()` a `true`, el banner queda idéntico al de hoy.
- **P8 · Rancio inerte.** Con `AF_LESSONS = []`, `afStaleSteps(null)` → `[]` y el banner
  no cambia. Cero errores.
- **P9 · Subnav.** Con `#afSubnav` forzado visible: las 19 vistas de 1280 a 1920 sin
  scroll horizontal, `.af-body` conserva su scroll propio, la topbar no se mueve.
- **P10 · Documento.** El nuevo tipo A abre el modal, el documento hereda `doc.css`,
  cierra limpio, y su fecha coincide con `AF_TODAY`.
- **P11 · Colores.** El `awk` del R6 → vacío.
- **P12 · `index.html`.** `git diff --stat index.html` → **10 inserciones, 0 borrados**.

**Regresión — las 23 del §11 del 1/3 vuelven a pasar.** En particular:

- `grep -n localStorage AppFolio/*.js` → sigue en 3 líneas reales.
- `afAuditIntegrity()` → 0.
- Dos cargas → mismo hash de catálogo.
- Cero `Math.random()` / `new Date()` ejecutables.
- **Cero controles muertos.** Tras la R5 deben ser 51 con manejador y **23** tipo C.
- Consola limpia en los tres modos.

---

## 6. Criterios de aceptación

**Separación**

- [ ] `afRecordAnswer()` existe, con un solo `return` de guard, y es el **único** escritor de los cinco buckets
- [ ] `afNoteLessonComplete()` tiene el mismo guard
- [ ] `afShowsTraining()` existe y **las dos** listas lo usan
- [ ] `AF_SETTINGS_PAGES` marca su grupo con `training: true`, no con una cadena
- [ ] Con `?demo=1` no aparece ni una palabra del curso en ninguna sección ni página de Settings
- [ ] Ningún cálculo de nota lee `afDemo`

**Shell**

- [ ] `#afSubnav` existe como hermano de topbar y body, oculto y sin ocupar caja
- [ ] El banner de lección ofrece rehacer un paso rancio y queda inerte con el currículum vacío
- [ ] Cero colores literales fuera de `:root`
- [ ] Cero estilos inline · sin `!important`
- [ ] `git diff --stat index.html` = 10 inserciones, 0 borrados

**Datos y motor**

- [ ] `AF_LESSONS` sigue vacío · el catálogo sigue siendo el semilla de 1 propiedad
- [ ] `afAuditIntegrity()` → 0
- [ ] `documents/doc.css` existe y un documento lo usa a través de `SimEngine.viewDoc()`

**Higiene**

- [ ] Las 12 pruebas nuevas y las 23 de regresión pasan
- [ ] `git diff assets/` vacío · `git diff Docusign/` vacío · `git diff Quialia/` vacío
- [ ] Consola limpia en sandbox, lección y `?demo=1`
- [ ] Commit único + informe del §13

---

## 7. Qué queda después

Con esto el contrato está cerrado y **verificado**, no solo escrito. El 2/3 recibe:

- Un gate de calificación con un solo escritor por almacén, listo para cinco tipos de paso
- Una frontera `?demo=1` con un predicado, no con expresiones sueltas
- El hueco estructural del subnav ya abierto
- Una tubería de documentos probada de punta a punta
- Una línea base honesta: **23 tipo C de 51 controles**

El 2/3 construye el mundo: 12 propiedades → ~85 unidades → 72 leases → 18 propietarios,
12 meses de contabilidad, y las 11 secciones con lógica real. Ese documento medirá su
propio avance bajando esos 23 tipo C.
