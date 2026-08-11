# assets/docs/

PDFs de los casos reales que el asociado abre durante el simulador. Los datos sensibles
(nombres de compradores, precios) ya vienen cambiados para entrenamiento.

Están organizados por mercado, porque los formularios de transacción cambian por estado y
el simulador carga el paquete que corresponde al caso.

| Carpeta  | Mercado    | Contenido típico                                              |
| -------- | ---------- | ------------------------------------------------------------- |
| `tc-ca/` | California | Purchase agreement, contraofertas, TDS y SPQ, termita, NHD, settlement |
| `tc-ny/` | Nueva York | Contrato, aprobaciones de abogado, cláusula de escalación, depósito |
| `tc-tx/` | Texas      | Contrato ejecutado, adenda de HOA, aviso MUD, disclosure del vendedor |
| `tc-va/` | Virginia   | Contrato ratificado, PICRA y contraofertas, inspección, humedad, WDII |
| `sop/`   | Interno    | SOPs que sirvieron de base a los simuladores                   |

`SPQ_California_139SEdinburghAve.pdf` está suelto en la raíz de esta carpeta porque lo usa
el caso de Listing Coordinator de California, no el paquete de transacción.

Las páginas de puesto referencian estos archivos con rutas tipo
`../assets/docs/tc-va/residential-property-data-input.pdf`. Si renombras un PDF, busca esa
ruta en `roles/` antes.
