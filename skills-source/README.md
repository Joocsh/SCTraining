# skills-source/

Código fuente editable de los descargables que entregan las guías del AI Lab.

Cada guía en `guides/` ofrece un archivo para descargar desde `assets/downloads/`. Esta
carpeta tiene ese mismo contenido descomprimido, para poder editarlo.

| Carpeta                   | Descargable que produce                                     | Guía que lo entrega                          |
| ------------------------- | ----------------------------------------------------------- | -------------------------------------------- |
| `bulk-chatgpt-ads/`       | `assets/downloads/chatgpt-ads-bulk-builder.zip`             | `guides/chatgpt-ads-agent.html`              |
| `heygen-knowledge/`       | `assets/downloads/heygen-hook-helper-knowledge-files.zip`   | `guides/heygen-hook-writer.html`             |
| `hyperlocal-market/`      | `assets/downloads/hyperlocal-market-report-campaigns.zip`   | `guides/hyperlocal-market-emails.html`       |
| `marketing-psychology/`   | `assets/downloads/marketing-psychology.skill.zip`           | `guides/persuasion-skill-claude.html`        |
| `room-to-reel/`           | `assets/downloads/room-to-reel-workflow-improved.json`      | `guides/room-to-reel-video.html`             |

`peek_heygen/` y `peek_mp/` son el contenido ya extraído de los archivos `.skill`, para
poder leerlos sin descomprimir nada.

## Importante

**No hay proceso automático de empaquetado.** Si editas algo aquí, tienes que volver a
comprimirlo manualmente en `assets/downloads/` o los usuarios seguirán bajando la versión
vieja. Es el error más fácil de cometer en este repo.
