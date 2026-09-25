# Cómo trabajamos en equipo

Guía corta para que dos o más personas editen el sitio sin pisarse. El mapa completo del
proyecto está en [README.md](README.md).

---

## 1. Flujo de Git

Trabajamos directo sobre `main`, con commits pequeños y frecuentes.

```bash
git pull --rebase origin main      # SIEMPRE antes de empezar y antes de subir
# ... editas ...
git add <archivos que tocaste>     # nunca "git add ." a ciegas
git commit -m "Área: qué cambió"
git pull --rebase origin main
git push origin main
```

- **Un commit, un tema.** "VA: catálogo con progreso" es mejor que "updates".
- **Formato del mensaje:** `Área: qué cambió`. Áreas comunes: `Home`, `VA`, `Intro`,
  `Account`, `Admin`, `TC`, `Listing`, `Marketing`, `Course player`, `AppFolio`,
  `Docusign`, `Qualia`, `Docs`.
- **Si hay conflicto** en un archivo que no es tuyo, no lo resuelvas a ciegas: avisa a
  quien lo esté trabajando (ver la tabla de abajo).
- Para cambios grandes o que tocan archivos compartidos, abre una rama
  (`git switch -c nombre/tema`) y un Pull Request.

## 2. Quién trabaja qué

Para evitar conflictos, cada área tiene una persona de referencia. Si necesitas tocar un
archivo de otra área, avisa primero.

| Área | Archivos | Referencia |
| ---- | -------- | ---------- |
| Simulaciones TC y Listing | `roles/transaction-coordinator.html`, `roles/listing-coordinator.html`, `assets/css/role-shell.css`, `tc-case.css`, `workflow.css`, `assets/js/role-shell.js`, `workflow.js`, `tc-ca-new-case.js`, `tc-va-case.js` | Gerald |
| Cursos y experiencia del alumno | `index.html`, `assets/css/home.css`, `assets/js/home.js`, `paths.html`, `assets/css/paths.css`, `ai.html`, `va/`, `account.html`, `admin.html`, `marketing-training.html`, `assets/css/course.css`, `assets/js/course.js`, `course-kit.css`, `course-kit.js`, `courses.js`, `learn-dash.js` | Naesa |
| Test drives | `AppFolio/`, `Docusign/`, `Quialia/`, `testdrive-*.html` | Quien lo esté construyendo |
| Pantalla de inicio de las simulaciones | `assets/css/role-hub.css`, `assets/js/role-hub.js` (cada `roles/*.html` solo la incluye) | Naesa |
| Base compartida | `assets/css/styles.css`, `assets/js/app-core.js`, `site.js` | Todos, **avisando antes** |

La base compartida la carga todo el sitio: un cambio ahí afecta todas las páginas.

## 3. Convenciones

**Texto de la interfaz**
- El sitio está en inglés; la documentación interna en español.
- Nada de guiones "-" como separador en textos visibles. Usa punto, coma o dos puntos.
- Minimalista: pocas palabras, un mensaje por bloque.

**Diseño**
- Sin etiquetas decorativas en mayúsculas encima de los títulos, ni en píldora ni en
  texto suelto ("START HERE", "MY LEARNING", "STEP 1"). El título dice de qué se trata.
  Sí se quedan las etiquetas que informan algo real: estados, números de pregunta,
  nombres de módulo en el índice.
- Colores desde las variables de `:root` en `styles.css` (navy `#0a2647`, cyan `#17c3d4`).
  Nunca hex sueltos nuevos.
- La misma tipografía del Home en todas las páginas.
- En el Home, las secciones alternan navy y claro. Nunca dos secciones navy seguidas.
- Guiar antes que mostrar: un usuario nuevo ve una sola acción principal a la vez. Nada
  de pantallas con todo el contenido del sitio de golpe.
- Las fotos no se mueven ni se escalan (se pierde nitidez); solo aparecen con un fundido.

**Código**
- HTML, CSS y JS sin build step. Indentación de 2 espacios (ver `.editorconfig`).
- Cada página carga `assets/js/app-core.js` primero y llama `SCApp.requireAuth()` si
  necesita sesión.
- CSS de un componente compartido lleva prefijo propio (`c-` para el reproductor de
  cursos, `ld-` para el dashboard del Home, `gd-` para las guías).
- **Cache busting:** cuando cambias un CSS o JS compartido, sube el `?v=AAAAMMDD` en las
  páginas que lo cargan. Si no, los navegadores siguen usando la versión vieja.

## 4. Vocabulario del sitio

Una sola palabra para cada cosa, en toda la interfaz:

- **Path:** el departamento. Hoy son VA y Marketing, y todos viven juntos en
  `paths.html`, con un filtro por departamento. En el código se llama `track`.
- **Training:** lo que se estudia dentro de un path. Por ejemplo SOP Foundations.
  Nunca le digas "course" en textos visibles.
- **Module** y **lesson:** las partes de un training.
- **Simulation:** la práctica del caso real. No es un training.

## 5. Cómo agregar un training

Todos los trainings usan el mismo reproductor (`assets/css/course.css` + `assets/js/course.js`).

1. Crea la página (por ejemplo `va/mi-training.html`) con `<body class="course">` y un
   `<main class="c-stage" id="stage">`.
2. Cada lección es una `<section class="lesson" data-mod="Módulo" data-title="Título"
   data-goals="Objetivo 1|Objetivo 2">`. El reproductor arma solo el índice, la flecha de
   siguiente, las medallas por módulo y el certificado.
3. Los checkpoints son `.checkpoint` con tareas `.task.gate` de tipo `choice`, `match` o
   `sort`. Copia uno de `va/sop-foundations.html`. **Primero se lee, después se responde:**
   el reproductor mueve el checkpoint a una pantalla propia, así que ponlo siempre al
   final de la lección, como hijo directo de la `<section>`. Lo que va después del
   checkpoint (por ejemplo un bloque de cierre) viaja con él a esa segunda pantalla.
   Si una lección tiene menos de 70 palabras antes del checkpoint, se queda en una sola
   pantalla; eso es lo correcto para un examen final.
   Para bloques extra (ejemplo, idea clave, pasos con captura `ol.how`, escenarios,
   prácticas escritas que se guardan solas `textarea[data-draft]` y preguntas sin
   respuesta correcta `data-type="poll"`), carga también `assets/css/course-kit.css` y
   `assets/js/course-kit.js`. Mira `va/ai-real-estate-ops.html` y `va/asana.html`.
4. Al final: `SCCourse.init({ id: 'mi-training', title: 'Mi training', kick: 'VA training',
   store: 'sc_mi_training__' })`.
5. Regístralo en `assets/js/courses.js` con su departamento: `track: 'va'` o
   `track: 'marketing'`. Con eso aparece solo en `paths.html`, en My Account y en el panel
   del supervisor.
6. ¿Un departamento nuevo? Agrégalo a `TRACKS` en `courses.js`. `paths.html` le crea su
   filtro y su sección, y el Home lo lista en la tarjeta de Paths, sin tocar nada más.

## 6. Carpetas de trabajo

- `scratch/`: scripts de prueba y verificación. No se enlaza desde el sitio. Si un script
  ya no sirve, bórralo en su propio commit.
- `archive/`: versiones viejas, solo referencia. No partas de ahí.
- Archivos temporales personales: fuera del repo, o en una carpeta que esté en
  `.gitignore`.
