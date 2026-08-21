# PROMPT MAESTRO 2/3 — AppFolio: el mundo

> Pásale este documento completo a un agente de código, o dile:
> **"sigue `AppFolio/PROMPT-appfolio-2-mundo.md`"**.
>
> Segundo de tres. El 1/3 y su addendum 1b construyeron el **contrato** y están
> cerrados y verificados. Éste construye el **mundo**: el portafolio completo y las
> once secciones con lógica real.
>
> Al terminar, AppFolio deja de ser un esqueleto y pasa a ser una administradora
> que se puede operar. Sigue sin tener una sola lección — eso es el 3/3.

---

## 0. De dónde partes

El contrato está construido, reparado y **verificado en el navegador**, no de palabra.
Commit `ec1c75c`. Esto ya funciona y no lo vuelves a auditar:

| | Estado |
|---|---|
| Dos almacenes, con `afStore` en 10 claves y `afDemo` en memoria | ✅ |
| `grep localStorage AppFolio/*.js` → 3 líneas reales | ✅ |
| `afMark()` y `afRecordAnswer()` — **los dos únicos escritores de nota**, cada uno con un guard | ✅ |
| `afShowsTraining()` — un predicado, dos listas | ✅ |
| `?demo=1` sin una palabra del curso en 11 secciones y 6 páginas de Settings | ✅ |
| 19 vistas, 0 excepciones, 0 `"view not found"`, 0 controles muertos | ✅ |
| `afAuditIntegrity()` → 0 huérfanos | ✅ |
| Determinismo: dos cargas → mismo hash de catálogo | ✅ |
| `#afSubnav` hermano de topbar y body, oculto, altura 0 | ✅ |
| `SimEngine.viewDoc()` probado de punta a punta | ✅ |
| Tokens de marca derivados de las cinco capturas reales | ✅ |

**Herramientas que ya tienes y debes usar, no reinventar:**

- `afToday()`, `afDaysFromToday(iso)`, `afAddDays(iso, n)`, `afFmtDate(iso)`, `afFmtMoney(cents)`
- **`afHashString(s)` y `afMulberry32(seed)`** — el generador sembrado. Son la razón de que
  este prompt sea viable; ver §4.
- `afBase<X>(id)` / `afGet<X>(id)` / `afAll<X>()` para las 14 colecciones
- `afAuditIntegrity()` y `AF_REFERENCES`
- `afConfirm({title, body, safe, danger, confirmLabel, onConfirm})` para todo tipo B
- `afEmptyState({icon, title, body, actionLabel, action})`
- `simToast(msg, {tone})`, `SimEngine.viewDoc(path, title)`

---

## 0.1 Dos defectos abiertos — arréglalos primero

**D1 · Un `!important`.** `appfolio.css:318` tiene
`.af-subnav[hidden] { display: none !important; }`. El §10 del 1/3 lo prohíbe sin
excepción. Entró como parche porque `.af-subnav` declara `display: flex`, que gana al
`display: none` del atributo `hidden`. La solución sin martillo:

```css
.af-subnav { display: none; }
.af-subnav:not([hidden]) { display: flex; }
```

Empieza por aquí. Son dos líneas y deja el archivo limpio antes de que crezca.

**D2 · La métrica de tipo C estaba mal definida.** El 1b decía "23 de 51 controles",
contados recorriendo el DOM. Es irreproducible: `Settings` solo pinta una sub-página a la
vez, así que el número cambia según dónde estabas. **La métrica correcta es el código:**

```bash
grep -n "afDemoAction(" AppFolio/*.js | grep -v "^AppFolio/appfolio-app.js:[0-9]*:function" | wc -l
```

**Hoy da 22.** Ése es el número de partida y el que tienes que bajar. Úsalo, no cuentes
botones a mano.

---

## 1. Qué se construye y qué NO

### Sí

- El catálogo completo: 12 propiedades → 85 unidades → 72 leases → ~78 residentes →
  18 propietarios → 14 proveedores → ~40 órdenes → ~25 guest cards y solicitudes →
  3 cuentas bancarias → 12 meses de contabilidad
- La **capa de anclajes**: las entidades nombradas que el 3/3 va a usar (§6). Es la parte
  de este documento con más consecuencias
- Las 11 secciones con lógica de negocio real: ledgers que calculan, morosidad que
  escalona, screening que decide, conciliación que cuadra
- `afAuditMoney()` — el hermano contable de `afAuditIntegrity()` (§7)
- La quema de tipo C: de **22** a **≤ 8** (§9)
- Los seis documentos de `documents/` que las vistas abren

### No

- **Ninguna lección.** `AF_LESSONS` sigue siendo `[]`. `appfolio-data.js` no se toca
  salvo para añadir constantes de catálogo que el producto necesite, nunca currículum.
- Ningún graduador nuevo. `afRecordAnswer()` ya existe y el 3/3 lo llama; tú no.
- Ningún cambio en `assets/`, `index.html`, `Docusign/` ni `Quialia/`.
- Ninguna clave nueva en `afStore`. Si crees que necesitas una, **para y pregunta**.

**Criterio de terminado:** un VA puede sentarse delante y trabajar un lunes entero
—cobrar rentas, escalar morosos, mover una solicitud por el embudo, despachar una orden,
conciliar el banco y sacar un estado del propietario— sin encontrarse un botón que no
haga nada, un número que no cuadre ni un id que no abra.

---

## 2. Decisiones cerradas — no las vuelvas a preguntar

1. **Residencial puro.** Sin comercial y sin HOA. El §3.3 del análisis mencionaba un local
   comercial; la decisión posterior fue residencial puro y **manda la decisión**.
2. **Contabilidad completa, incluida la fiduciaria.** Tres cuentas y la frontera entre
   ellas es materia de examen, no decorado.
3. **Texas.** Frisco, Plano, McKinney, Allen y Austin. Importa: el plazo de depósito de
   Texas son **30 días**, y el 3/3 lo va a examinar.
4. **El lease se firma dentro de AppFolio**, con firma electrónica simulada propia.
5. El producto vive en memoria. F5 borra. `afStore` es sólo progreso académico.
6. Vanilla JS, sin red, sin build. Interfaz y comentarios en inglés.

---

## 3. La decisión de arquitectura: fixture vs. generado

Es la sección que decide si este módulo sirve para dar clase o sólo para enseñarlo.

### El problema

72 leases × 12 meses × 2–3 asientos ≈ **2.000 asientos de ledger**. Escribirlos a mano es
inviable y además inútil: nadie los va a leer uno por uno. Generarlos es lo obvio.

Pero si **todo** se genera, el 3/3 se queda sin dónde agarrarse. Una lección no puede
decir *"abre el residente que pidió el animal de asistencia"* si ese residente es el
resultado de una semilla y mañana cambia de nombre al tocar el generador. El currículum
necesita **anclajes con nombre e id estables**.

### La regla

El catálogo tiene **dos capas**, y cada entidad pertenece a una sola:

| Capa | Qué contiene | Cómo se escribe | Puede cambiar |
|---|---|---|---|
| **FIXTURE** | Todo lo que una lección va a citar, más las 12 propiedades y los 18 propietarios | A mano, literal, con id fijo | **No.** Congelado desde que se escribe |
| **BULK** | El relleno que hace creíbles los reportes: la mayoría de leases, residentes, ledgers, órdenes | Generado con `afMulberry32(afHashString(id))` | Sí, mientras la semilla sea la misma |

Marca cada entidad fixture con un comentario `/* ANCHOR: … */` encima y con el prefijo de
id que le corresponda (§6). Y escribe la regla en la cabecera de
`appfolio-catalog-data.js`, no sólo aquí:

```js
/* Two layers, and mixing them is the defect this file exists to prevent.
   ANCHOR entities are hand-written, id-stable and cited by the curriculum: changing
   one silently breaks a lesson in another file. Everything else is generated from a
   seed derived from its own id, so it can be regenerated at will and nothing outside
   this file depends on its exact values. */
```

### Consecuencia operativa

Si el 3/3 necesita un caso que no está en §6, **se añade como fixture nuevo**, nunca se
"encuentra" uno generado que sirva de casualidad.

---

## 4. El generador determinista

Reglas duras, todas verificables con `grep`:

1. **Cero `Math.random()`.** La semilla de cada entidad sale de su propio id:
   `const rnd = afMulberry32(afHashString(unit.id));`
2. **Cero `new Date()`** sin argumentos. Todas las fechas son `afcDay(offset)` contra
   `AF_TODAY = '2026-08-12'`.
3. El generador corre **una vez, al cargar el archivo**, y congela su resultado en los
   `AFC_*`. No genera al vuelo dentro de una vista: dos renders de la misma pantalla
   tienen que dar el mismo píxel.
4. **Determinismo comprobable:** dos cargas seguidas producen el mismo hash del catálogo
   completo. Es la prueba T15 y sigue vigente.
5. Nombres, calles y teléfonos salen de listas literales indexadas por el PRNG, no de
   concatenaciones tipo `'Resident ' + i`. Un reporte con 72 "Resident 41" no se puede
   enseñar.
6. Teléfonos en `555-01xx` y correos en `@example.com`. Es dato ficticio y tiene que
   parecerlo a quien mire de cerca.

---

## 5. El portafolio

### 5.1 Propiedades y unidades — 12 y 85

| # | Propiedad | Tipo | Unidades | Ciudad |
|---|---|---|---|---|
| 1–6 | Seis casas | `single-family` | 1 c/u = **6** | Frisco, Plano, McKinney, Allen |
| 7–9 | Tres dúplex | `duplex` | 2 c/u = **6** | Plano, McKinney |
| 10 | Un cuádruplex | `fourplex` | **4** | Frisco |
| 11 | Maplewood Commons | `apartment` | **24** | Plano |
| 12 | Frisco Station Flats | `apartment` | **45** | Frisco |
| | | | **85** | |

Ocupación 85%: **72 leases activos, 13 unidades vacantes**. Las 13 se reparten entre
`vacant-ready` (8), `vacant-rehab` (3) y `notice` (2) — el embudo de leasing necesita las
tres, y `notice` es lo que hace que exista una renovación que ofrecer.

Rentas de mercado coherentes con el tipo y la ciudad: casa unifamiliar en Frisco
~$2.400–2.900, dúplex ~$1.650–1.950, apartamento 1 dormitorio ~$1.250, 2 dormitorios
~$1.550. **Todo en centavos, enteros.**

### 5.2 Propietarios — 18

12 propiedades y 18 propietarios significa que **4 propiedades están en copropiedad**.
Eso no es adorno: obliga a que `ownerIds` sea de verdad una lista y a que el estado del
propietario reparta por porcentaje, que es donde el puesto real se equivoca.

Mezcla `individual` y `entity` (LLC). Los dos edificios grandes son de LLC.

### 5.3 Morosidad — 9, escalonados

La escalera de cobranza sólo se puede enseñar si el reporte tiene peldaños:

| Antigüedad | Casos | Para qué |
|---|---|---|
| 1–15 días | 3 | Recordatorio y cargo por mora |
| 16–30 días | 3 | Aviso formal |
| 31–60 días | 2 | Aviso de 3 días |
| 60+ días | 1 | Escalada / desalojo |

Los nueve son **ANCHOR** (§6). Su antigüedad se mide contra `AF_TODAY` y tiene que seguir
siendo la misma dos cargas después.

### 5.4 El resto

| Entidad | Cantidad | Notas |
|---|---|---|
| Residentes | ~78 | 72 titulares + cotitulares, ocupantes y un par de avales |
| Proveedores | 14 | Plomería, HVAC, eléctrico, electrodomésticos, jardinería, limpieza, cerrajería. **Dos con seguro vencido** — es una decisión que enseñar |
| Órdenes de trabajo | ~40 | Repartidas en los seis estados. Al menos 2 `emergency` abiertas y 3 en unidad ocupada que exigen aviso de entrada |
| Guest cards | ~15 | En las cinco etapas |
| Solicitudes | ~10 | En los seis estados, incluidos los tres anclajes de §6 |
| Cuentas bancarias | 3 | `operating`, `trust`, `security-deposit` |
| Transacciones | 12 meses | Cuadradas contra los saldos (§7) |
| Estados del propietario | 18 × 3 meses | `draft` / `sent` / `paid` |
| Tareas | ~12 | La cola del VA |

---

## 6. Los anclajes del currículum

**Esta sección es un contrato con el 3/3.** Cada anclaje se escribe a mano, lleva id fijo
y un comentario `/* ANCHOR */`. El 3/3 los cita por id; cambiar uno rompe una lección en
otro archivo sin que nada avise.

| Id | Qué es | Lección que lo va a usar |
|---|---|---|
| `GC-FH-01` | Guest card que pregunta *"¿es buen sitio para niños?"* y menciona que espera un bebé | **L6** Fair Housing por escrito — estatus familiar |
| `GC-FH-02` | Anuncio de vacante con texto redactado que ya contiene una violación (*"perfecto para una pareja joven"*) | **L6** — corregir, no sólo detectar |
| `APP-FCRA-01` | Solicitud con `screening.creditScore` bajo, `agency` nombrada, `status: 'denied'`, **`adverseActionSent: false`** | **L7** FCRA y acción adversa |
| `APP-FCRA-02` | Solicitud con marca de desalojo previo → aprobación condicionada con depósito mayor | **L7** — condicional, no negativa |
| `APP-ADA-01` | Solicitud con `requestedAccommodation: true`, animal de asistencia con verificación, en propiedad `no pets` | **L8** — no se cobra depósito ni renta de mascota |
| `RES-PET-01` | Residente con mascota **real** y `petRent` legítimo en el lease | **L8** — el contraste que hace la lección |
| `DQ-01` … `DQ-09` | Los nueve morosos escalonados de §5.3 | **L4** morosidad y escalera |
| `LEASE-MO-01` | Lease con `moveOutDate` a **22 días** de `AF_TODAY`, depósito retenido y daños documentados | **L11** — el reloj de 30 días de Texas ya corriendo |
| `WO-ENTRY-01` | Orden en unidad ocupada, `entryNotice: false`, proveedor asignado y visita programada | **L10** — aviso de entrada obligatorio |
| `WO-INS-01` | Orden asignada a un proveedor con `insuranceExpires` ya pasado | **L10** — no se despacha sin COI vigente |
| `OWN-TRUST-01` | Propietario cuyo draw solicitado **excede** su saldo disponible sin tocar depósitos | **L12** — la frontera fiduciaria |
| `STMT-01` | Estado del propietario en `draft` con una partida mal clasificada | **L12** — verificar antes de enviar |
| `LEASE-REN-01` | Lease que vence en 47 días, sin renovación ofrecida | **L1 / L13** — renovación y aumento |

**Reglas de los anclajes:**

1. Id literal, exactamente como está en la tabla.
2. Comentario `/* ANCHOR: <id> — <para qué existe> — DO NOT CHANGE */` encima.
3. Todos **abren**: `afGet<X>(id)` devuelve la entidad y hay una vista que la muestra.
4. Ninguno depende del generador. Si uno necesita ledger, ese ledger también es fixture.
5. Al terminar, lista los 14 en el informe con su id real y la vista donde se abren.

---

## 7. Las invariantes de dinero

La contabilidad completa fue tu decisión y ésta es la factura. Un simulador contable que
no cuadra es peor que no tenerlo: enseña a no mirar.

Escribe **`afAuditMoney()`**, hermano de `afAuditIntegrity()`, que devuelve la lista de
descuadres. Con el catálogo terminado debe devolver **cero**.

| # | Invariante |
|---|---|
| M1 | Para cada lease: `balanceAfter` del último asiento = Σcargos − Σ(pagos + créditos) |
| M2 | Cada asiento: su `balanceAfter` = `balanceAfter` del anterior ± su `amount`. La columna es una cadena, no valores sueltos |
| M3 | Rent roll = Σ `rentAmount` de los leases activos |
| M4 | Σ `depositHeld` de leases activos = saldo de la cuenta `security-deposit` |
| M5 | Saldo de cada cuenta = apertura + Σ transacciones de esa cuenta |
| M6 | **Ninguna transacción mueve dinero entre `trust`/`security-deposit` y `operating` sin su pareja.** Es la frontera fiduciaria y es la única invariante cuyo incumplimiento es un delito, no un error |
| M7 | Estado del propietario: `netDistribution` = `income` − `expenses` − `managementFee` |
| M8 | `managementFee` = `income` × `managementFeePct` de la propiedad, redondeado a centavo entero, con la regla de redondeo declarada en un comentario |
| M9 | El reporte de morosidad y la suma de saldos deudores del ledger dan lo mismo |
| M10 | Ningún importe es un no-entero, en ninguna colección |

**M2 es la que más se incumple.** Si generas asientos y calculas el saldo al pintarlos,
el ledger *parece* cuadrar mientras el dato no lo hace. Genera la cadena, no el resumen.

**Cuando el visitante registra un pago** (tipo A, va a `afDemo.ledgerEntries`), las diez
invariantes tienen que seguir cumpliéndose. `afAuditMoney()` corre sobre `afAll*()`, es
decir sobre catálogo + `afDemo`, no sólo sobre el catálogo.

---

## 8. Las once secciones

Para cada una: qué muestra, qué calcula y qué se puede **hacer** de verdad.

**Dashboard.** KPIs contra datos reales —ocupación, cobrado del mes, morosos, órdenes
abiertas, vacantes— y tres colas de trabajo que enlazan a la vista que las resuelve.
Cada número es un enlace; un KPI que no lleva a su lista es decoración.

**Properties.** Lista → detalle → unidades → detalle de unidad. En el detalle de unidad:
lease actual, historial, órdenes, y —si está vacante— su ficha de marketing. Editar
propiedad y unidad es **tipo A**.

**Residents.** Lista con saldo y antigüedad → detalle con **el ledger** (la pantalla más
importante del módulo), lease, contactos, documentos y órdenes. El ledger muestra fecha,
concepto, cargo, pago y saldo corriente, con `tabular-nums`.

**Owners.** Lista → detalle con propiedades, participación, estados de cuenta y draws.
Un draw que viole M6 se **rechaza con el motivo**, no se desactiva el botón: el VA tiene
que ver por qué no se puede.

**Leasing.** Vacantes · marketing · guest cards · solicitudes · screening · decisión ·
move-in. El embudo se mueve de verdad: una guest card pasa a `toured`, luego a `applied`,
y una solicitud recorre `new → screening → approved | conditional | denied`. La decisión
escribe en `afDemo.applications`.
**Al negar por screening, la interfaz tiene que ofrecer el aviso de acción adversa y
dejar constancia de si se envió.** Que se pueda no enviarlo es justamente lo que hace
enseñable la lección 7 — no lo fuerces.

**Maintenance.** Solicitudes → órdenes → proveedores → inspecciones. Cambiar estado,
asignar proveedor, programar y facturar son tipo A. Asignar a un proveedor con seguro
vencido **advierte y deja continuar**. Programar entrada en unidad ocupada sin
`entryNotice` **advierte y deja continuar**. La simulación enseña la consecuencia, no
impide el error.

**Accounting.** Recibos · facturas · cheques · draws · conciliación · GL · las tres
cuentas. Registrar un pago y aplicar un cargo por mora son tipo A y escriben ledger.
La conciliación marca asientos como `cleared` y muestra la diferencia hasta que cuadra.

**Communications.** Envíos masivos, avisos, plantillas y bandeja del portal. Enviar es
tipo A y va a `afDemo.messages`. Las plantillas incluyen las que el 3/3 va a evaluar:
recordatorio de renta, aviso de 3 días, notice to vacate, acción adversa, aviso de
entrada, oferta de renovación.

**Reporting.** Rent roll · morosidad · estados del propietario · P&L · vacantes · embudo.
**Cada cifra se cuenta del portafolio en vivo**, ninguna está escrita a mano. Un reporte
con números literales es el defecto que este documento existe para evitar.

**Tasks.** La cola del VA, con vencimientos contra `AF_TODAY`. Completar y crear son A.

**Settings.** Ya está construido. Sólo añade lo que el mundo requiera —política de
cargos por mora, comisiones, plantillas— sin tocar el grupo Training ni los dos resets.

---

## 9. La quema de tipo C

Partes de **22**. El objetivo es **≤ 8**, y no vale llegar ahí borrando botones.

**Tienen que pasar a tipo A o B** — son el trabajo del puesto:

registrar un pago · aplicar cargo por mora · reversar un asiento (B) · crear y editar
propiedad y unidad · mover una guest card de etapa · decidir una solicitud (B en negativa)
· enviar acción adversa · crear orden de trabajo · cambiar su estado · asignar proveedor ·
programar visita · registrar factura · enviar comunicación (B en envío masivo) ·
crear y completar tarea · marcar asiento conciliado · generar y enviar estado del
propietario (B) · registrar un draw (B) · búsqueda global

**Pueden seguir en C** — son integraciones que no existen en un simulador sin red:

sindicar a portales externos · descargar el extracto bancario del banco · exportar a PDF
o Excel · imprimir · enviar a un proveedor de screening real · sincronizar con el portal
del residente · adjuntar un archivo del disco

Y la regla que no cambia: **cero tipo D**. Cada control responde.

En el informe: el número final del `grep`, y la lista de los que quedaron en C con una
línea de por qué cada uno no podía ser otra cosa.

---

## 10. Fases y puertas

Cada fase termina con su puerta. **No pases de fase con una puerta en rojo** — un
descuadre arrastrado tres fases cuesta diez veces más.

| Fase | Contenido | Puerta |
|---|---|---|
| **0** | D1 y D2 del §0.1 | `grep !important` vacío · el `grep` de tipo C da 22 |
| **A** | Catálogo: propiedades, unidades, propietarios, residentes, leases, **los 14 anclajes** | `afAuditIntegrity()` = 0 · los 14 anclajes resuelven · dos cargas, mismo hash |
| **B** | Ledgers de 12 meses y la escalera de morosidad | `afAuditMoney()` M1–M3, M9, M10 = 0 |
| **C** | Properties, Residents, Owners con lógica real | Cada id de cada tabla abre · sin descuadre |
| **D** | Leasing completo, incluidos screening y acción adversa | Los 5 anclajes de leasing se pueden trabajar de principio a fin |
| **E** | Maintenance, proveedores, inspecciones | Los 2 anclajes de mantenimiento avisan y dejan continuar |
| **F** | Accounting y Reporting | **`afAuditMoney()` = 0 con las diez invariantes** · ningún número literal en Reporting |
| **G** | Communications, Tasks, documentos | Los 6 documentos abren con `viewDoc` |
| **H** | Quema de tipo C y limpieza | `grep` ≤ 8 · 0 controles muertos · consola limpia |

---

## 11. Reglas que siguen vigentes

Del 1/3 y el 1b, sin cambios. Se repiten porque son las que se erosionan al crecer:

- Cero red · cero dependencias · vanilla JS · sin build
- Cero `<form>` con submit · cero estilos inline · **sin `!important`**
- Cero `Math.random()` · cero `new Date()` ejecutables
- `grep -n localStorage AppFolio/*.js` → sigue en **3 líneas reales**
- `afMark()` y `afRecordAnswer()` siguen siendo los **únicos** escritores de nota
- Ninguna clave nueva en `afStore` sin preguntar
- Toda lista que mezcle curso y producto lleva `training: true` y se filtra con
  `afShowsTraining()`
- Importes en centavos, enteros; formateo sólo en presentación
- Interfaz y comentarios en inglés; comentarios que explican el **porqué**
- Cada control es A, B o C. **Ningún D.**
- **Cero huérfanos:** todo id citado abre

---

## 12. Batería de pruebas

Servidor: `py -m http.server 5799` desde la raíz. Si rebota a login:
`SCApp.login('maria@demo','demo123')` en la consola.

**Integridad y determinismo**

1. `afAuditIntegrity()` → `[]`
2. `afAuditMoney()` → `[]`
3. Dos cargas → mismo hash del catálogo completo
4. `grep -n "Math.random()\|new Date()" AppFolio/*.js` → sólo comentarios
5. Ningún importe no-entero en ninguna colección
6. Los 14 anclajes de §6 resuelven por id y abren en una vista

**El mundo**

7. 12 propiedades · **85** unidades · **72** leases activos · **13** vacantes · 18 propietarios
8. Ocupación calculada = 85%
9. Los 9 morosos aparecen en el reporte con la antigüedad correcta contra `AF_TODAY`
10. Cada unidad ocupada tiene lease; cada lease activo tiene unidad; la reciprocidad cuadra
11. Cada ledger cumple M2 asiento a asiento — comprueba tres leases al azar a mano
12. Todo reporte cuenta del portafolio: cambia un dato en `afDemo` y el reporte se mueve

**Interacción**

13. Registrar un pago → ledger, saldo, morosidad y rent roll se mueven a la vez
14. Tras registrar un pago, `afAuditMoney()` **sigue** en cero
15. Negar una solicitud ofrece la acción adversa y registra si se envió o no
16. Asignar proveedor con seguro vencido advierte y deja continuar
17. Programar entrada sin aviso advierte y deja continuar
18. Un draw que viole M6 se rechaza **con motivo visible**
19. F5 → todo lo anterior desaparece y el portafolio vuelve a fábrica
20. Los 6 documentos abren con `viewDoc` y cierran limpio

**Separación — regresión, y es la que primero se rompe al crecer**

21. En sandbox: trabajar media hora por las once secciones → `afStore` sigue vacío
22. `afRecordAnswer()` en sandbox → `false` en los cinco buckets
23. `grep -n localStorage AppFolio/*.js` → 3 líneas reales
24. `?demo=1`: ni `training`, ni `lesson`, ni `course`, ni `progress` en ninguna vista
25. `AF_LESSONS` sigue siendo `[]`

**Higiene**

26. `grep afDemoAction` ≤ 8 · cero controles muertos
27. `grep !important` → vacío · cero estilos inline
28. Consola limpia en las 11 secciones y los tres modos
29. Red: cero peticiones tras la carga
30. 1280 → 1920 sin scroll horizontal en el body, en todas las vistas
31. `git diff assets/ index.html Docusign/ Quialia/` → vacío

---

## 13. Criterios de aceptación

**Datos**

- [ ] 12 propiedades, 85 unidades, 72 leases activos, 13 vacantes, 18 propietarios
- [ ] Las dos capas están separadas y marcadas; los 14 anclajes son fixture con id fijo
- [ ] `afAuditIntegrity()` → 0
- [ ] **`afAuditMoney()` → 0**, con las diez invariantes implementadas
- [ ] Dos cargas → mismo hash
- [ ] Cero `Math.random()` / `new Date()` ejecutables · cero importes no-enteros

**Producto**

- [ ] Las 11 secciones con lógica real; ningún número literal en Reporting
- [ ] Todo id de toda tabla abre
- [ ] Registrar pago, decidir solicitud, despachar orden, conciliar y emitir estado
      funcionan de punta a punta
- [ ] Las tres advertencias (seguro, aviso de entrada, draw fiduciario) avisan sin bloquear
- [ ] Los 6 documentos abren con `viewDoc`

**Contrato**

- [ ] `AF_LESSONS` sigue vacío
- [ ] `afMark()` y `afRecordAnswer()` siguen siendo los únicos escritores de nota
- [ ] 3 líneas de `localStorage` · ninguna clave nueva en `afStore`
- [ ] `?demo=1` limpio
- [ ] `grep afDemoAction` ≤ 8 · cero tipo D · sin `!important` · sin estilos inline
- [ ] Las 31 pruebas pasan · consola limpia · `git diff` limpio fuera de `AppFolio/`

---

## 14. Qué entregar

Un commit por fase, cada uno con su puerta verde. Y un informe con:

1. **Los 14 anclajes con su id real y la vista donde se abren.** Es lo primero que va a
   leer el 3/3.
2. La cuenta final del `grep afDemoAction`, y por qué cada superviviente no podía ser
   otra cosa.
3. Los campos que hayas añadido o quitado de los 13 esquemas del §9.2 del 1/3, con el
   motivo.
4. Cómo resolviste el redondeo de M8, y en qué comentario lo dejaste escrito.
5. Cualquier invariante de §7 que hayas tenido que reinterpretar, y cómo.
6. Dónde te obligó este documento a elegir sin decirte cómo.

**Pregunta antes de seguir si:** necesitas una clave nueva en `afStore`; un anclaje de §6
no es representable con los esquemas del 1/3; una invariante de §7 es incompatible con
otra; o algo te obliga a tocar `assets/`, `index.html`, `Docusign/` o `Quialia/`.

---

## 15. Qué recibe el 3/3

- Un portafolio de 85 unidades donde todo cuadra y todo abre
- **Catorce anclajes con nombre**, cada uno colocado exactamente sobre el error caro que
  su lección enseña
- Once secciones operables, con las tres advertencias que hacen que equivocarse tenga
  consecuencia visible
- `afRecordAnswer()` esperando a sus cinco tipos de paso
- `afStaleSteps()` esperando a que los pasos declaren su `effect()`

El 3/3 escribe las 13 lecciones y el examen. No tocará el mundo — sólo lo citará.
