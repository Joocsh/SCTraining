# PROMPT — DocuSign: cerrar coherencia y fidelidad tras la auditoría

> Pásale este documento completo a un agente de código, o dile:
> "sigue `Docusign/PROMPT-docusign-coherencia.md`".

---

## 0. Rol y objetivo

Eres un ingeniero frontend trabajando en el simulador de entrenamiento de DocuSign dentro del repo
`SCTraining`, carpeta `Docusign/`. El módulo ya pasó una auditoría de cuatro rondas que arregló el
visor de documentos, los datos de los sobres y la fidelidad de los archivos en `documents/`.

Tu trabajo son cuatro bloques, en este orden de prioridad:

- **A — Un solo formato.** El certificado y los correos existen hoy en dos versiones distintas: la
  auténtica en `documents/`, y una inventada dentro de la app. Un alumno ve las dos en la misma
  lección. Este bloque es el más urgente y el más acotado.
- **B — Las superficies que nadie auditó.** La experiencia del firmante, la marca de anulado, y el
  contenido legal de los 88 documentos generados.
- **C — Limpieza.** Tres archivos huérfanos.
- **D — Pruebas que sí detecten.** La suite actual usa un DOM simulado y no detectó ninguno de los
  hallazgos de la auditoría.

Sin backend, sin red, sin API. Todo es estático y determinista.

---

## 1. Reglas duras — lo que NO se toca

**1.1 Las 10 lecciones y el examen están calificados y validados.** No cambies `DS_LESSONS`,
`DS_SCENARIOS`, `DS_TRIAGE_ITEMS`, `DS_COMPOSE_ITEMS`, `DS_EXAM_*` ni los `checklistId`. Si una
tarea te obliga a tocar un enunciado, es porque cambiaste el documento que ese enunciado describe:
arregla el documento, no la pregunta. Si de verdad no hay salida, **detente y pregunta**.

**1.2 Los identificadores de sobre no cambian.** `ENV-2026-9041` y sus hermanos son la referencia
que usan las lecciones, las notificaciones, el buzón y los targets del walkthrough
(`tr[data-env-id="ENV-2026-9041"]`). El GUID de DocuSign vive **al lado**, nunca en su lugar.

**1.3 `DS_S_MAX_OFFSET = -3`.** Ningún sobre de fondo puede tener fecha posterior a
`DS_TODAY - 3`, o empuja `ENV-2026-9041` fuera de la primera página de la lista y el walkthrough de
la Lección 5 resalta espacio vacío.

**1.4 Determinismo absoluto.** Ni un `Math.random()`. Todo sale de `dsHashString` +
`dsMulberry32` sembrados con un id estable. Un identificador que se reescribe en cada repintado no
es un identificador.

**1.5 Cero red.** Los documentos se cargan por `src` de iframe o por `srcdoc`. No introduzcas
`fetch`, XHR ni recursos remotos. La única excepción ya existente son las imágenes locales de
`Images-resources/`.

---

## 2. Estado actual — lo que ya está resuelto

Necesitas esto para no volver a romperlo.

### 2.1 El visor ya no cruza documentos

`simViewDoc` en `assets/js/sim-engine.js` **borra `srcdoc` antes de tocar `src`**. Sin eso, un
iframe que alguna vez recibió `srcdoc` ignora para siempre cualquier `src` posterior, y todo
documento abierto después mostraba el anterior. Si tocas esa función, conserva el
`removeAttribute('srcdoc')`.

### 2.2 Un solo modelo de navegación

Los documentos —reales y generados— emiten **todas** sus páginas de una vez, cada una como
`.paper[data-page="N"]`. `dsWireDocNav()` inyecta una barra única: el contador sigue al scroll y
Prev/Next hacen scroll, no recargan.

Dos trampas que ya costaron caro y no debes reintroducir:

- **No uses `requestAnimationFrame`** para sincronizar el contador. No corre cuando el frame no
  compone (pestaña de fondo, panel oculto) y el contador se congela.
- **No uses `scrollIntoView({behavior:'smooth'})`** en los botones. Es animación, tampoco corre en
  ese estado, y el botón queda muerto sin avisar. Ajusta `scrollTop` directamente.

### 2.3 Los campos se anclan al documento

Los campos del currículo **no llevan `x`/`y`**. `dsFieldAnchor()` los ancla midiendo el elemento
real del documento: `.sigrow > .sig > (.line + label)` para firmas y fechas, `.ibox > .slot` para
iniciales. Un campo con `x`/`y` propios (los que coloca el alumno en el wizard) conserva su posición.

**Estos selectores son contrato.** Si reescribes un documento de `documents/`, mantenlos.

### 2.4 Dos capas que cooperan

`dsPaintViewerFields()` pinta las etiquetas y **devuelve el conjunto de elementos que ocupó**.
`dsStampLibraryDocSignatures(d, env, consumed)` rellena sólo lo que quedó libre. El orden es
pintar y después estampar. Ningún destinatario `Receives a Copy` recibe firma jamás.

### 2.5 El sello de sobre

Cada página lleva `<div class="ds-envstamp"><span>Docusign Envelope ID: GUID</span></div>`.
`dsEnvelopeGuid(envId)` deriva un GUID v4 determinista, salvo para los sobres cuyos archivos ya
traen el GUID escrito, que están fijados en `DS_ENVELOPE_GUIDS`.

### 2.6 Los 91 sobres

5 del currículo + 81 de fondo + 5 del buzón. Todos con campos reales (`dsSBuildFields`). Inbox y
Sent ya no se solapan (`dsSentByMe`). Cero referencias huérfanas a sobres inexistentes.

---

## 3. Tarea A — Un solo formato de certificado y de correo

### A1. El modal de Certificate of Completion

**Problema.** `dsOpenCertificateModal()` en `docusign-app.js` dibuja un layout inventado titulado
`SUMMARY & AUDIT CERTIFICATE`. Los archivos `documents/certificate-*.html` ya usan el formato real.
La **Lección 7 abre los dos**: el modal para `ENV-2026-7734` en el paso 2, el archivo para
`ENV-2026-9041` en el paso 3. El alumno ve dos documentos distintos que dicen ser lo mismo.

**Qué hacer.** Rehacer el modal con la anatomía real, la misma que ya está en los archivos. Toma
`documents/certificate-9002-auth.html` como referencia; las clases `.cert-*` ya existen en
`documents/doc.css` y puedes portarlas a `docusign.css`.

Secciones, **todas presentes aunque estén vacías** — una sección vacía informa: dice que no hubo
notario, que nadie fue CC:

```
Envelope Id + Status · Subject + Customer Reference · Source Envelope
Record Tracking
Signer Events            (Signature | Timestamp)
In Person Signer Events
Editor / Agent / Intermediary / Certified Delivery Events
Carbon Copy Events
Witness Events · Notary Events
Envelope Summary Events  (Envelope Sent / Certified Delivered / Signing Complete / Completed)
Payment Events
Electronic Record and Signature Disclosure
```

Reglas de contenido:

- El estado se **deriva**, nunca se escribe fijo. Ya existe esa lógica en el modal actual
  (`sealed`, `certStatus`, `dsCertPendingLabel`): consérvala y móntala en el layout nuevo.
- Firma sólo para quien firmó de verdad. Los CC van a **Carbon Copy Events** con estado `COPIED`,
  nunca a Signer Events.
- Cada firmante lleva `Signature Adoption: Pre-selected Style`, `Using IP Address` (de
  `dsSOfficeIp`) y su bloque `Electronic Record and Signature Disclosure` con fecha e ID.
- Si el destinatario tiene `accessCode`, `smsAuth` o `idv`, añade el bloque `Authentication Details`
  con el mismo formato del archivo de referencia.
- Horas en formato de 12 h con AM/PM, en `(UTC-06:00) Central Time`. **No** 24 h ni UTC: los
  enunciados del examen ya se alinearon a este formato.

### A2. Los correos del buzón

**Problema.** Los 7 correos de `dsInitMailbox()` usan `ds-wiz-summary-card`. Cero
`Alternate Signing Method`. La Lección 6 abre `documents/email-phishing-1.html` con la anatomía
real; el buzón muestra otra cosa.

**Qué hacer.** Portar el esqueleto `.dse-*` de `documents/doc.css` a `docusign.css` y reconstruir
los 7 cuerpos con la anatomía real de una notificación DocuSign:

```
logo · "<Remitente> sent you a document to review and sign." · botón REVIEW DOCUMENT ·
nombre y correo del remitente · su mensaje · Powered by Docusign ·
Do Not Share This Email · ALTERNATE SIGNING METHOD + código de seguridad ·
About Docusign · Questions about the Document? · Stop receiving this email · dirección postal
```

El bloque **Alternate Signing Method** es el que más importa: es la razón por la que un VA nunca
necesita hacer clic en un enlace. Un señuelo que lo omite, o que trae un código que no lleva a
ningún sobre, lo caza un coordinador que sabe que ese bloque debería estar.

Mantén los tells que ya distinguen a cada uno:

| Correo | Alternate Signing Method | `X-DocuSign-EnvelopeId` |
|---|---|---|
| Legítimos (`em-1`, `em-2`, `em-5`, `em-6`, `em-7`) | presente, código derivado del sobre | GUID real de `dsEnvelopeGuid()` |
| `em-3` (phishing) | **ausente** — no hay sobre detrás | ausente |
| `em-4` (phishing de transferencia) | ausente o código inválido | ausente |

No toques `envId`, `isPhish`, `spf`, `dkim`, `returnPath` ni `phishClues`: el panel de cabeceras
técnicas y los ítems de triage los leen.

---

## 4. Tarea B — Las superficies sin auditar

### B1. La experiencia del firmante — datos incrustados

**Problema, medido.** En `dsSignerExperienceHTML()` (la rama `/purchase|123 main/`), estos valores
están escritos a mano:

```
Property Address   123 Main Street, Austin, TX 78701
Parcel ID          0214-0402-0004
Approx. Living Area 2,140 sq. ft.
Purchase Price     $485,000.00
Earnest Money      $5,000.00
Financing deadline August 24, 2026
```

**19 de los 91 sobres caen en esa rama, y 18 de ellos no son ENV-2026-9041.** Entre ellos
`ENV-2026-9001 — Purchase Agreement — 4820 Cedar Ridge Dr` y
`ENV-2026-4948 — Purchase Agreement — 3206 Round Rock Ave`. Firmas cualquiera de los 18 y el
documento dice 123 Main Street. Es exactamente la clase de cruce que arregló el análisis 1, en la
única vista que ninguna ronda revisó.

**Qué hacer.** Derivar cada dato del sobre. El asunto ya trae la dirección
(`"Purchase Agreement — 4820 Cedar Ridge Dr, Austin"`): parséala. Precio, arras, superficie y
parcela deben salir de un generador determinista sembrado en `env.id`, igual que
`dsSBuildEnvelopes` genera el resto de la cuenta. Si el dato no existe, no lo inventes en el
markup: omite la fila.

Revisa además las otras ramas de esa función (contractor, disclosure, lease) buscando el mismo
patrón, y la vista completa contra el firmante real de DocuSign: barra superior amarilla con
`CONTINUE`, navegación de campos con `NEXT`, panel `Other Actions`, adopción de firma con pestañas
`SELECT STYLE` / `DRAW` / `UPLOAD`, y el diálogo de consentimiento al abrir.

### B2. Marca de anulado

DocuSign estampa los documentos de un sobre anulado. Hoy sólo hay el texto `[ VOIDED ]` en la línea
de firma. Hay **5 sobres anulados y 6 expirados** sin marca visible en la página.

Añade una marca de agua diagonal repetida por página —`VOID` para anulados, `EXPIRED` para
expirados— en el renderer generado y, vía `documents/doc.css`, en los tres documentos reales. Debe
ser legible pero no tapar el texto: gris claro, rotada, `pointer-events: none`, y **nunca** sobre un
sobre sano.

### B3. Los 88 documentos generados leen igual

`dsGetDocPageContent()` cae en el mismo bloque genérico
(`"Additional Covenants & Operational Provisions"`) para casi todo. Abres tres sobres distintos y
lees el mismo contrato.

Escribe cuerpos distintos por `env.type` — hay 10 tipos en `DS_S_TYPES` — con las cláusulas que
correspondan a cada uno: un arrendamiento habla de depósito y plazo, una adenda de financiación
habla de aprobación del prestamista, un acuerdo de comisión habla del reparto. Las cifras salen del
PRNG sembrado en `env.id`, nunca literales.

---

## 5. Tarea C — Limpieza

Borra estos tres archivos. Son versiones viejas y tienen **cero referencias** en todo el repo:

```
Docusign/documents/purchase-agreement-123main.html
Docusign/documents/signing-instructions.html
Docusign/documents/contractor-agreement.html
```

Verifica antes de borrar y deja constancia en el commit:

```bash
grep -rn "purchase-agreement-123main\|signing-instructions\|documents/contractor-agreement" --include=*.js --include=*.html .
```

Si algo aparece, **no borres**: reporta el hallazgo.

---

## 6. Tarea D — Pruebas que sí detecten

`scratch/test-docusign-full-suite.js` usa un DOM simulado. No puede ver iframes, layout ni
posiciones, y por eso no detectó ninguno de los hallazgos de la auditoría. Reemplázalo por una
sonda que corra **dentro del navegador**, contra la app real.

### 6.1 El detalle que hace que la sonda funcione

Una pestaña oculta estrangula `setTimeout` a un disparo por minuto. Una sonda basada en esperas
fijas se cuelga y parece un fallo del producto. **Sincronízate con el evento `load` del iframe**, no
con temporizadores:

```js
const frame  = document.getElementById('simDocFrame');
const onLoad = () => new Promise(res => {
  const h = () => { frame.removeEventListener('load', h); res(); };
  frame.addEventListener('load', h);
});
/* 30 microtareas: el manejador onload de la app corre en el mismo despacho del evento,
   así que la continuación de este await ya lo ve terminado. Con menos, un documento de
   biblioteca que recarga por src se comprueba antes de estar decorado y da un falso
   negativo. */
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };

const p = onLoad();
dsViewEnvelopeDoc(envId, docIndex, 1);
await p;
await settle();
```

### 6.2 Qué comprueba

Recorre los 91 sobres y todos sus documentos, y por cada uno verifica:

| Comprobación | Cómo |
|---|---|
| No se cruzan | Los `ENV-\d{4}-\d+` del texto pertenecen al sobre abierto |
| Páginas completas | `[data-page]` en el DOM == `documents[i].pages` |
| Sello por página | `.ds-envstamp` == número de páginas |
| GUID correcto | El sello contiene `dsEnvelopeGuid(env.id)` |
| Barra presente | `#dsDocNav` si hay >1 página o >1 documento |
| Campos con marca | Cada campo tiene `.dsview-field` o slot estampado **en su página** |
| Los CC no firman | Ningún nombre de CC en `.sig .line` |

---

## 7. Criterios de aceptación

No des una tarea por terminada sin la cifra. Todas deben salir **cero** sobre los 91 sobres:

```
documentos recorridos ......... 120
documentos cruzados ..............0
páginas en DOM ≠ declaradas ......0
páginas sin sello ................0
sellos con GUID equivocado .......0
campos sin marca .................0
barras de navegación faltantes ...0
destinatarios CC firmando ........0
referencias a sobres inexistentes 0
```

Específicos por bloque:

- **A1** — Abre el modal en `ENV-2026-9041` (waiting), `7734` (completed), `6620` (voided),
  `9005` (declined), `5510` (expired), `9014` (authfail) y `9002` (completed con Access Code + IDV).
  Las 13 secciones presentes en los 7. El estado nunca dice `COMPLETED & SEALED` salvo en 7734 y
  9002. Ningún CC en Signer Events.
- **A2** — Los 7 correos con la anatomía completa. `em-3` y `em-4` **sin** Alternate Signing Method.
  Los 5 legítimos con código derivado del sobre y `X-DocuSign-EnvelopeId` igual a
  `dsEnvelopeGuid(envId)`.
- **B1** — Ninguno de los 18 sobres que hoy caen en la rama purchase muestra `123 Main Street`,
  `0214-0402-0004` ni `$485,000.00` salvo `ENV-2026-9041`, que es su dueño legítimo.
- **B2** — Los 5 anulados y los 6 expirados llevan marca en **todas** sus páginas. Los 80 restantes,
  en ninguna.
- **B3** — Dos sobres de tipos distintos no comparten el bloque de cláusulas. Comprobación rápida:
  recoge el texto de la página 1 de un sobre por cada uno de los 10 tipos y verifica que los 10
  difieren.
- **C** — El `grep` de §5 no devuelve nada y los tres archivos ya no existen.
- **D** — La sonda corre entera y devuelve el cuadro de §7 en ceros.

Además, después de cada bloque:

```bash
node --check Docusign/docusign-app.js
node --check Docusign/docusign-data.js
node --check Docusign/docusign-data-ext.js
node --check Docusign/docusign-shell-data.js
node --check assets/js/sim-engine.js
```

---

## 8. Cómo verificar sin pelearte con el entorno

**8.1 La caché.** El servidor de `.claude/launch.json` (puerto 5799) cachea los JS con fuerza y
verás código viejo sin darte cuenta. Levanta uno que mande `no-cache`:

```bash
python -c "import http.server,os; os.chdir('.'); H=type('H',(http.server.SimpleHTTPRequestHandler,),{'protocol_version':'HTTP/1.1','end_headers':lambda s:(s.send_header('Cache-Control','no-store'),http.server.SimpleHTTPRequestHandler.end_headers(s))}); http.server.ThreadingHTTPServer(('127.0.0.1',5812),H).serve_forever()"
```

Usa `ThreadingHTTPServer`: el de un solo hilo corta conexiones al cargar varios scripts a la vez.
Confirma siempre que tienes el código nuevo antes de sacar conclusiones:

```js
/removeAttribute\('srcdoc'\)/.test(SimEngine.viewDoc.toString())   // debe dar true
```

**8.2 El login.** La app exige sesión. Antes de navegar:

```js
localStorage.setItem('scc_session', JSON.stringify({ userId: 'maria' }));
```

**8.3 Un fallo de la sonda no es un fallo del producto.** Si un sobre suelto falla mientras 90
pasan, repítelo tres veces aislado antes de tocar código. En la auditoría, `ENV-2026-8812` dio
"sin marcas" por una carrera de la sonda con los documentos que recargan por `src`; tres corridas
seguidas dieron 5/5.

---

## 9. Orden de trabajo sugerido

1. **A1** y **A2** — cierran una contradicción que el alumno ve hoy, y son acotadas.
2. **D** — con la sonda en pie, los bloques siguientes se verifican solos.
3. **B1** — el defecto de mayor alcance que queda: 18 sobres mostrando la dirección equivocada.
4. **B2**, **B3** — fidelidad incremental.
5. **C** — un commit aparte, trivial de revertir.

Confirma cada bloque con su cifra antes de pasar al siguiente. Si un criterio de aceptación no da
cero y no entiendes por qué, **detente y reporta** en vez de ajustar la prueba hasta que pase.
