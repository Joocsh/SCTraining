# SkillCloud Academy: Training Site

Sitio de entrenamiento para asociados nuevos de SkillCloud. Cada asociado practica el
trabajo real de su puesto (transaction coordination, listings, leasing, lead management,
operaciones, contabilidad) sobre casos reales anonimizados, y un supervisor califica lo
que entrega.

Es un sitio **100% estático**: HTML, CSS y JavaScript sin build step, sin framework y sin
backend. Todo el estado (usuarios, sesión, progreso, entregas) vive en `localStorage` del
navegador.

---

## Cómo correrlo

No hay `npm install`. Solo necesitas servirlo por HTTP (abrir los archivos con `file://`
rompe algunas rutas):

```bash
py -m http.server 5799
```

Luego abre http://localhost:5799. Ese mismo comando está configurado en
[.claude/launch.json](.claude/launch.json) bajo el nombre `static-site`.

### Cuentas de prueba

Se crean solas la primera vez que cargas el sitio (ver `seed()` en
[assets/js/app-core.js](assets/js/app-core.js)):

| Email        | Contraseña | Rol           | Puesto asignado         |
| ------------ | ---------- | ------------- | ----------------------- |
| `maria@demo` | `demo123`  | Asociado      | Transaction Coordinator |
| `jose@demo`  | `demo123`  | Asociado      | Listing Coordinator     |
| `admin@demo` | `admin123` | Supervisor    | (todos)                 |

Para empezar de cero: borra el `localStorage` del sitio desde las DevTools del navegador.

---

## Estructura de carpetas

```
.
├── index.html, ai.html, ...       Páginas del sitio (ver mapa abajo)
├── roles/                         Una página por puesto + su simulador
├── guides/                        Guías del AI Lab, una por herramienta
├── Quialia/                       Test drive de Qualia, módulo autocontenido
├── Docusign/                      Test drive de DocuSign, módulo autocontenido
├── assets/
│   ├── css/                       Hojas de estilo compartidas
│   ├── js/                        Motores compartidos (auth, progreso, simulador)
│   ├── img/                       Imágenes que el sitio usa en vivo
│   ├── docs/                      PDFs de los casos reales, por estado
│   ├── downloads/                 Descargables que entregan las guías
│   └── brand/                     Entrega original del diseñador (no la usa el sitio)
├── skills-source/                 Código fuente de los descargables de assets/downloads
└── archive/                       Versiones viejas, no enlazadas desde el sitio
```

**Las páginas viven en la raíz a propósito.** GitHub Pages necesita `index.html` ahí, y
todas las páginas se enlazan entre sí con rutas relativas planas (`ai.html`,
`roles/lead-manager.html`). Moverlas a una subcarpeta obligaría a reescribir unos 200
enlaces. Si agregas una página nueva, va en la raíz.

---

## Mapa de páginas

### Raíz

| Archivo                     | Qué es                                                        |
| --------------------------- | ------------------------------------------------------------- |
| `index.html`                | Landing. Secciones `#roles`, `#how-it-works`, `#test-drive`    |
| `login.html`                | Login simulado                                                 |
| `account.html`              | Panel del asociado: su progreso y su puesto                    |
| `admin.html`                | Panel del supervisor: califica las entregas                    |
| `ai.html`                   | Introducción a IA                                              |
| `ai-lab.html`               | Índice del AI Lab, enlaza a todo `guides/`                     |
| `simulator.html`            | Simulador de casos reales, general                             |
| `mls.html`                  | Práctica de captura en MLS                                     |
| `study-guide.html`          | Guía de estudio. Tiene ancla por puesto (`#tc`, `#lm`, ...)     |
| `testdrive-followupboss.html` | Clon de práctica de FollowUpBoss                             |
| `testdrive-zierra.html`     | Clon de práctica de Sierra                                     |

### Test drives en carpeta propia

Dos test drives son módulos autocontenidos, con su propio CSS y JS, en vez de un solo
archivo en la raíz:

| Carpeta     | Entrada                      | Qué practica                                          |
| ----------- | ---------------------------- | ----------------------------------------------------- |
| `Quialia/`  | `testdrive-qualia.html`      | Intake de clientes, lista de Clients y Admin           |
| `Docusign/` | `testdrive-docusign.html`    | Sobres, orden de firma, colocación de campos, plantillas |

Ambos cargan `assets/css/styles.css` y `assets/js/app-core.js` del sitio, y encima su
propio `qualia.css` / `docusign.css`.

Nota sobre el nombre: la carpeta se llama `Quialia/` pero la herramienta es **Qualia**. El
nombre visible en la interfaz ya es el correcto; lo que quedó mal escrito es la carpeta.
Renombrarla implica tocar `index.html` y las rutas internas del módulo. Reemplazó al
antiguo `testdrive-kualia.html`, que también estaba mal escrito y ya no existe.

### `roles/`

Una página por puesto. Cada una carga su propio contenido y se lo pasa al motor
compartido de simulación.

| Archivo                        | Puesto                  | Clave interna  |
| ------------------------------ | ----------------------- | -------------- |
| `transaction-coordinator.html` | Transaction Coordinator | `tc`           |
| `listing-coordinator.html`     | Listing Coordinator     | `listing`      |
| `leasing-coordinator.html`     | Leasing Coordinator     | `lc`           |
| `lead-manager.html`            | Lead Manager            | `lm`           |
| `operations-manager.html`      | Operations Manager      | `ops`          |
| `cfo-bookkeeper.html`          | CFO y Bookkeeper        | `cfo`          |
| `admin-social.html`            | Admin y Social Media    | `admin_social` |

`lead-manager-sim.js` es el simulador propio del Lead Manager, construido a partir del
SOP en [assets/docs/sop/lead-manager-workflow.docx](assets/docs/sop/lead-manager-workflow.docx).
Los demás puestos usan el motor compartido.

Esas claves internas (`tc`, `lm`, ...) no son decorativas: son el prefijo de las llaves de
`localStorage` y aparecen en `ROLE_LABELS`, `ROLE_PAGES` y `LEGACY_MODES` dentro de
`app-core.js`. Si cambias una, cambia en los tres lugares.

### `guides/`

Guías del AI Lab. Todas comparten `assets/css/guide.css` y `assets/js/guide.js`, y todas
llevan `class="gd-page"` en el `<body>` (sin esa clase, `guide.js` no hace nada).

`blog-post-with-claude.html`, `caption-signoff-generator.html`, `chatgpt-ads-agent.html`,
`chatgpt-ads-targeting-playbook.html`, `crm-health-call-list.html`,
`heygen-hook-writer.html`, `hyperlocal-market-emails.html`, `persuasion-skill-claude.html`,
`review-interview-bot.html`, `room-to-reel-video.html`.

Nota: `blog-post-with-claude.html` existe pero todavía no está enlazada desde
`ai-lab.html`.

---

## Cómo funciona por dentro

### `assets/js/app-core.js`

El núcleo. Expone todo en `window.SCApp`. Cubre cuatro cosas:

1. **Auth simulada.** `login()`, `logout()`, `currentUser()`, `requireAuth()`. La sesión es
   una llave de `localStorage`, no hay servidor.
   Las rutas a `login.html`, `account.html` y `admin.html` se resuelven contra la raíz del
   sitio, que se calcula a partir del `src` del propio `app-core.js` (ver `ROOT` y
   `rootUrl()`). Por eso una página funciona a cualquier profundidad sin registrarse en
   ningún lado.
2. **Motor de progreso.** El progreso se guarda por usuario, por puesto y por modo
   (`sim`, `mls`, `prompt`, `quiz`, `email`). `getOverallPercent()` y
   `getRoleBreakdown()` alimentan `account.html` y `admin.html`.
3. **Entregas y calificación.** El asociado escribe un email dentro del caso,
   `submitEmailStep()` lo guarda, el supervisor lo califica en `admin.html` con
   `gradeSubmission()`, y esa nota entra al progreso del mismo puesto.
4. **Navegación.** `wireNav()` arma el chip de usuario y los botones de logout en toda
   página que cargue este archivo.

El archivo está escrito para que un backend real pueda reemplazar las funciones de
almacenamiento sin tocar ninguna página.

### Llaves de `localStorage`

| Llave                    | Contenido                                   |
| ------------------------ | ------------------------------------------- |
| `scc_users`              | Los usuarios sembrados                       |
| `scc_session`            | Sesión activa                                |
| `scc_progress__<userId>` | Progreso unificado del usuario               |
| `scc_last_page__<userId>`| Última página visitada, para retomar         |
| `scc_submissions`        | Emails entregados y sus calificaciones       |
| `scc_seeded_v2`          | Bandera para no volver a sembrar             |
| `sc_<role>_<mode>`       | Trackers viejos por puesto, ver abajo        |

Las llaves `sc_<role>_<mode>` son del sistema anterior. `syncLegacyProgress()` las importa
al motor nuevo. No las borres sin revisar esa función.

### Otros archivos de `assets/js/`

| Archivo       | Qué hace                                                                 |
| ------------- | ------------------------------------------------------------------------ |
| `workflow.js` | Motor compartido del Case Simulator. La página define el contenido, este archivo pone la mecánica |
| `sim-data.js` | Los datos de los casos: deals reales por estado, con nombres y precios cambiados |
| `guide.js`    | Comportamiento compartido de las guías. Es progressive enhancement puro   |
| `site.js`     | Menú de navegación y marcado del enlace activo                           |

Para agregar un puesto nuevo con el motor compartido, la página debe definir
`window.SIM_DATA`, `window.WF_LABELS` y `window.WF_STEPS` **antes** de cargar
`workflow.js`. El contrato completo está documentado en el encabezado de ese archivo.

### `assets/css/`

| Archivo          | Alcance                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `styles.css`     | Base del sitio y paleta de marca en variables CSS                     |
| `role-dash.css`  | Dashboards de puesto                                                  |
| `role-track.css` | Capa extra, solo para leasing, lead manager, operaciones y CFO        |
| `workflow.css`   | Panel del Case Simulator. **Requiere `role-dash.css` cargado antes**   |
| `guide.css`      | Sistema de diseño de las guías                                        |

La paleta canónica está en `:root` dentro de `styles.css` (navy `#0a2647`, cyan `#17c3d4`).
Usa esas variables en vez de escribir colores a mano.

---

## Assets que no son código

### `assets/docs/`

PDFs reales de los casos, organizados por estado. Son los documentos que el asociado abre
durante el simulador.

| Carpeta  | Mercado    |
| -------- | ---------- |
| `tc-ca/` | California |
| `tc-ny/` | Nueva York |
| `tc-tx/` | Texas      |
| `tc-va/` | Virginia   |
| `sop/`   | SOPs internos que sirvieron de base a los simuladores |

### `assets/downloads/` y `skills-source/`

Las guías del AI Lab ofrecen descargables. `assets/downloads/` tiene el `.zip` que el
usuario baja; `skills-source/` tiene ese mismo contenido descomprimido y editable.

| Descargable                                  | Fuente editable                      |
| -------------------------------------------- | ------------------------------------ |
| `chatgpt-ads-bulk-builder.zip`               | `skills-source/bulk-chatgpt-ads/`    |
| `heygen-hook-helper-knowledge-files.zip`     | `skills-source/heygen-knowledge/`    |
| `hyperlocal-market-report-campaigns.zip`     | `skills-source/hyperlocal-market/`   |
| `marketing-psychology.skill.zip`             | `skills-source/marketing-psychology/`|
| `room-to-reel-workflow-improved.json`        | `skills-source/room-to-reel/`        |

**Si editas algo en `skills-source/`, tienes que volver a comprimirlo en
`assets/downloads/`.** No hay proceso automático. Ese es el error fácil de cometer aquí.

### `assets/brand/`

Entrega original del diseñador: logos, fuentes Visby CF, fotos de la web, banners de redes
y plantillas. Conserva la numeración original (`0 - BRAND`, `1 - LOGO`, `2 - WEBSITE`...).

Ninguna página del sitio la referencia. Las imágenes que el sitio sí usa están en
`assets/img/`. Esta carpeta es el archivo maestro para diseño, y es la razón de que el
repo pese unos 440 MB.

### `archive/`

Versiones viejas, incluida la iteración anterior del sitio cuando se llamaba VOOV. **No
está enlazada desde ninguna página en vivo y sus rutas ya están rotas** (apunta a
`assets/styles.css`, que hoy vive en `assets/css/styles.css`). Se conserva como
referencia histórica. No la uses como punto de partida.

---

## Convenciones al agregar una página

1. Va en la raíz si es una página principal, en `roles/` si es un puesto, en `guides/` si
   es una guía del AI Lab, o en su propia carpeta si es un módulo grande con CSS y JS
   propios, como `Quialia/` y `Docusign/`.
2. Enlaces relativos planos desde la raíz (`ai.html`), con `../` desde cualquier
   subcarpeta.
3. Carga `assets/js/app-core.js` antes que cualquier otro script tuyo, y llama a
   `SCApp.requireAuth()` si la página necesita sesión.
4. Colores desde las variables CSS de `styles.css`, nunca hardcodeados.
5. Una guía nueva necesita `class="gd-page"` en el `<body>` y un enlace desde
   `ai-lab.html`.
6. Un puesto nuevo necesita entrada en `ROLE_LABELS`, `ROLE_PAGES` y `LEGACY_MODES` en
   `app-core.js`.

---

## Estado actual

Lo que todavía no existe y conviene saber antes de tocar el proyecto:

- No hay backend. Si dos personas usan el sitio en máquinas distintas, no comparten nada.
- Las contraseñas están en texto plano en el seed. Es intencional para la demo, pero no
  puede pasar a producción así.
- No hay tests ni build step.
- `archive/` tiene rutas rotas, como se explica arriba.
