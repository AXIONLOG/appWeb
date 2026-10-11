# AXIONLOG web: documentación del proyecto 

---

## 1. Qué es y por qué existe

Una **app web (HTML + CSS + JavaScript, sin servidor ni frameworks)** que apoya el **cumplimiento de pedidos en un almacén con cadena de frío**, medido con el **OTIF** (On Time In Full): un pedido cuenta como cumplido solo si llegó a tiempo y completo.

- Ejemplo: piden 10 vasos y se entregan 9 → falla el *In Full*. Se entregan los 10 pero tarde → falla el *On Time*.
- Tiene **3 módulos**, uno por cada problema principal que afecta el OTIF (tabla abajo).
- Se publica en **GitHub Pages**. **La única forma de ingreso de información es un Google Sheet** (un solo enlace). No hay carga manual de Excel/CSV ni datos de ejemplo.
- Quien lo construye no tiene experiencia previa en programación y usa IA para hacerlo.
- Existe un **prototipo de escritorio (.exe) llamado AXIONLOG** ("WMS Cadena de Frío", planta 0801). La app web debe **verse y funcionar lo más parecido posible**. Solo se tienen capturas y plantillas de datos, no su código ni fórmulas.

| Módulo | Problema que ataca | Técnicas |
|---|---|---|
| 1. Ubicaciones (Slotting) | Ubicaciones erróneas de productos | Slotting, análisis ABC, COI |
| 2. Picking · Rutas | Recorridos largos del picker | Ruteo por grafo, vecino más cercano, óptimo por zonas |
| 3. Inventario y compras | Diferencias de conteo y falta de productos | ERI, conteo cíclico, punto de reorden, stock de seguridad |

---

## 2. Arquitectura (monolito modular)

Una sola app, un solo despliegue, pero el código está **separado por pantalla/módulo** y por **responsabilidad**. Reglas:

1. `nucleo/` es lo compartido (formato, lectura del Sheet, estado, piezas de HTML, gráficos). **No conoce a ningún módulo.**
2. Cada módulo de `modulos/` tiene `calculo.js` (**cálculos puros**: reciben datos, devuelven resultados, no tocan la pantalla) y `vista.js` (**HTML y eventos**: lee `modelo` y dibuja).
3. Los módulos no se importan entre sí, salvo `escenarios` (usa cálculos de `picking`, `diagnostico`, `inventario` por ser una pantalla de síntesis) y `datos` (usa el PDF de `diagnostico`).
4. `modelo.js` junta los cálculos (`recalcular()`); las vistas solo leen `modelo`.
5. Las vistas reciben un `contexto` desde `main.js` (`ir`, `refrescar`, `sincronizar`, `guardarAjustes`) en vez de conocer la app por dentro.

```
axionlog/
├── index.html
├── styles.css
└── js/
    ├── main.js              arranque: menú, navegación, menú compacto, lectura del Sheet guardado
    ├── modelo.js            recalcular(): junta los cálculos de todos los módulos
    ├── sincronizacion.js    sincronizar(): valida el enlace, lee el Sheet, guarda el enlace
    ├── nucleo/
    │   ├── estado.js        objetos compartidos: datos, ajustes, conexion, modelo, ui
    │   ├── ajustes.js       valores por defecto y cómo se muestran
    │   ├── hojas.js         lectura del Google Sheet (pestañas y columnas obligatorias)
    │   ├── almacenamiento.js  localStorage (solo enlace + ajustes)
    │   ├── catalogo.js      SKUs y pedidos listos para calcular
    │   ├── planta.js        plano de la planta como grafo + Dijkstra
    │   ├── formato.js, csv.js, dom.js, html.js, graficos.js, requisitos.js
    └── modulos/
        ├── panel/vista.js
        ├── datos/vista.js              campo del enlace, estado de lectura, Layout, OTIF + PDF
        ├── diagnostico/ calculo.js, vista.js, pdf.js
        ├── ubicaciones/ calculo.js, vista.js
        ├── picking/     calculo.js, vista.js
        ├── inventario/  calculo.js, vista.js
        ├── escenarios/  calculo.js, vista.js
        └── ajustes/vista.js
```

**Para agregar o cambiar algo:** un cálculo → `calculo.js` del módulo; cómo se ve → `vista.js`; algo compartido → `nucleo/`. Una pantalla nueva = carpeta nueva con `vista.js` + una línea en `PANTALLAS` de `main.js`.

**Publicar:** subir la carpeta **descomprimida** (con `js/`) a la raíz del repo y activar Pages (Settings → Pages → `main` / root).
**Probar en local:** necesita servidor, porque usa módulos de JavaScript: extensión **Live Server** de VS Code (Go Live). Doble clic en `index.html` y F5 de "Start Debugging" **no funcionan** (la app avisa en pantalla).

---

## 3. Pantallas (menú lateral que se comprime a solo iconos con el botón «/»)

Al comprimir el menú, el contenido ocupa todo el espacio liberado.

1. **Panel:** 5 KPIs, tendencia del OTIF, desglose, 4 tareas por urgencia y estado de los datos.
2. **Datos:** campo único para el **enlace del Google Sheet**, botón Conectar/Actualizar, estado de lectura por pestaña (filas leídas o motivo del error) y pasos de ayuda. Dos cajas: **Layout de la planta** y **OTIF mensual** (con botón **Descargar Diagnóstico OTIF (PDF)**).
3. **Diagnóstico OTIF:** KPIs, evolución, dispersión incidencias vs OTIF (R²), Pareto de causas, detalle mensual.
4. **Ubicaciones (Slotting):** traslados con prioridad y búsqueda; plano de racks con ocupación.
5. **Picking · Rutas:** pedido, método, ubicaciones actuales/con plan, recorrido, comparación de métodos, hoja de picking (CSV).
6. **Inventario y compras:** ERI y 3 pestañas (plan de compras, diferencias, conteo cíclico).
7. **Escenarios:** As-Is vs To-Be, aporte de cada módulo, proyección del OTIF, simulador «¿qué pasa si…?».
8. **Ajustes:** parámetros del modelo; guardar recalcula todo.

Si falta información, cada pantalla muestra un aviso (sin enlace / leyendo / error / faltan pestañas) en vez de números vacíos.

---

## 4. Datos de entrada: solo Google Sheet

- Compartido como **«Cualquier persona con el enlace»**.
- **Un solo enlace**; se leen 4 pestañas por su **nombre exacto**: `Inventario`, `Pedidos`, `OTIF`, `Causas`.
- Se consulta `https://docs.google.com/spreadsheets/d/<id>/gviz/tq?tqx=out:csv&sheet=<nombre>`.
- **El enlace se recuerda** (localStorage, clave `axionlog`) y **se vuelve a leer el mismo Sheet cada vez que se abre la app**. Los datos no se guardan en el navegador; solo el enlace y los ajustes.
- Las columnas se comparan sin tildes, mayúsculas ni símbolos. Si falta una obligatoria, la pestaña se marca con error y se explica cuál.

| Pestaña | Obligatorias | Opcionales |
|---|---|---|
| Inventario | SKU, Stock_Sistema | Descripcion, Cliente, UM, Costo_Unitario, Stock_Fisico, Rack, Zona, Volumen_m3 |
| Pedidos | Pedido_ID, Fecha, SKU, Cantidad | Cliente, Tienda (una fila por producto de cada pedido) |
| OTIF | Mes (AAAA-MM), Pedidos_OTIF, Pedidos_Total | Cajas_Entregadas, Cajas_Pedidas, Incidencias |
| Causas | Causa, Etapa, Frecuencia | |

Reglas: `Zona` = `SECO`, `FRIO` o `CONGELADO`. Los `Rack` deben existir en el layout. Los `SKU` idénticos en Inventario y Pedidos. Un mes con menos de 100 pedidos es parcial y no entra en promedios ni regresión.

---

## 5. Layout de la planta

**Pendiente de definir cómo se ingresará.** Hoy se usa un plano **referencial fijo** (`plantaReferencial()` en `nucleo/planta.js`): 3 cámaras, 14 racks, muelle `DOCK` en (5,30). Los ids siguen `S-P1-M01` = zona, pasillo, módulo. No se confirmó que las coordenadas sean metros; se asume que sí. La caja «Layout de la planta» de Datos solo informa; no carga nada.

---

## 6. Cómo calcula cada cosa

- **Demanda por SKU** = cantidad pedida en los últimos `vent` días ÷ `vent`. **ABC** por líneas de pedido: A ≤ 80 %, B ≤ 95 % acumulado.
- **Reposición:** SS = z × CV × demanda × √lead time; punto de reorden = demanda × lead time + SS; «PEDIR HOY» si stock ≤ punto; «PRONTO» si ≤ 1.3 × punto; cantidad = demanda × (lead time + ciclo) + SS − stock.
- **ERI por SKU** = SKUs con sistema = físico ÷ SKUs; **ERI valorizado** = 1 − Σ|dif × costo| ÷ Σ(stock × costo).
- **Slotting:** capacidad por rack = volumen total ÷ racks ÷ 0.55; por zona se ordena por COI (volumen ÷ frecuencia) y se asignan los racks más cercanos al muelle. Traslado si está en zona equivocada (Crítica) o si la mejora ≥ `minMej` m.
- **Rutas:** Dijkstra sobre el grafo. Métodos: lista impresa, vecino más cercano, óptimo por zonas (permutaciones ≤ 7 racks por zona). Tiempo = distancia ÷ velocidad + líneas × tiempo por línea.
- **OTIF y regresión:** OTIF = Pedidos_OTIF ÷ Pedidos_Total; regresión OTIF vs incidencias (R² ≈ 70 %, pendiente ≈ −0.173 con datos del cliente).
- **Proyección:** incidencias evitadas = incidencias/mes × Σ(participación de causa × % de reducción supuesto); OTIF proyectado = actual + (−pendiente) × evitadas.
- **PDF del Diagnóstico:** `diagnostico/pdf.js` arma la pantalla en un área oculta y abre el cuadro de impresión del navegador; se elige «Guardar como PDF».

Ajustes por defecto: meta OTIF 97 %, servicio 95 %, 1.2 m/s, 15 s por línea, frío máx. 12 min, S/ 10 por hora, mejora mínima 10 m, ciclo 14 d, lead times 4/2/3 d, ventana 90 d, CV 0.30, meta ERI 98 %, reducción 50 % por módulo.

---

## 7. Cambios de la versión 2.0 respecto a la 1.0

- Reestructurada en módulos (antes todo en un `app.js`).
- Eliminados: datos y código de ejemplo, banner de ejemplo, carga de archivos, arrastrar y soltar, pegar contenido, exportar/borrar copia JSON.
- Datos: solo Google Sheet, con enlace recordado y lectura automática al abrir.
- Datos: ahora solo Layout y OTIF mensual (el resto de información sigue llegando del mismo Sheet, pero no se muestra ahí; se irá definiendo pantalla por pantalla).
- Menú comprimido: el contenido se ajusta (se quitó el ancho máximo de 1200 px).
- Nuevo: PDF del Diagnóstico OTIF.
- Corregido: en el Pareto, la barra «Falta de productos» no se marcaba en verde por un error de comparación de texto.
- Se verificó que Ubicaciones, Picking, Inventario y Escenarios dan **resultados idénticos** a la versión 1.0 con los mismos datos.

### Comportamientos heredados que conviene revisar (se dejaron como estaban)
- Panel: «Ver lista de conteo» abre la pestaña 2 (Diferencias), no la 3 (Conteo cíclico).
- Inventario: «Exportar pestaña actual» siempre exporta el plan de compras.
- Conteo cíclico: no se ordena por valor de la diferencia.
- Escenarios: la barra «Solo ruteo óptimo» siempre es igual a la situación actual (el ruteo ya está incluido en el As-Is).

---

## 8. Qué falta

- **Probar la lectura del Sheet real** publicado en GitHub Pages / Live Server (no se pudo probar con Google; solo con respuestas simuladas). Ver que los números y fechas del Sheet se lean bien.
- Definir cómo se ingresará el **layout** de la planta.
- Ir **pantalla por pantalla** decidiendo qué se muestra de cada tabla del Sheet.
- Métodos de ruteo S-shape, Largest Gap, Combined, A\*; recorrido animado; filtros en traslados; «Marcar como trasladados»; lead time por SKU.
- Las **fórmulas exactas del .exe** se desconocen: reposición, traslados y rutas usan métodos estándar.
- El PDF depende del cuadro de impresión del navegador (no genera el archivo solo).

---

## 9. Cómo seguir trabajando con Claude (para quien continúe)

### Qué subir al chat nuevo
1. El último zip de la app (`axionlog-web-v2.zip`). 2. Este documento. 3. Capturas del prototipo .exe, si se tienen. 4. El Sheet o CSV de prueba.

### Prompt sugerido
> Te adjunto el código actual de una app web (HTML, CSS y JS modular, en carpetas) y su documentación. Es un sistema de apoyo al cumplimiento de pedidos (OTIF). Respeta la arquitectura descrita (nucleo/ y modulos/, cada módulo con calculo.js y vista.js) y no mezcles lógica de cálculo con HTML. Cada vez que cambies algo, entrégame un **.zip** con la carpeta completa, listo para GitHub Pages. Antes de entregar, revisa la sintaxis con `node --check` en cada archivo y prueba en un navegador. Explícame los cambios en lenguaje simple: no tengo experiencia en programación. Primero lee la documentación y dime qué entendiste. Lo primero que quiero es: [cambio].

### Recomendaciones
- Una mejora a la vez, y probarla antes de pedir la siguiente. Recargar con **Ctrl+F5**.
- Guardar cada versión (`axionlog-web-v2.zip`, `v3`…) por si hay que volver atrás.
- Cuando algo se vea distinto al prototipo, indicar la pantalla y adjuntar captura.
- La cuenta debe tener activada **Code execution and file creation** (Configuración → Capacidades).
- Una conversación compartida solo se puede leer: quien continúe abre su propio chat y sube los archivos.
