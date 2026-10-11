// Piezas de HTML que se repiten en varias pantallas.

import { esc } from './formato.js';

export const etiqueta = (clase, texto) => `<span class="tag ${clase}">${texto}</span>`;

export const etiquetaZona = zona => etiqueta('t-' + esc(zona), esc(zona));

// Tarjeta con un indicador. color: '', 'er' (rojo), 'wa' (naranja) o 'ok' (verde).
export const kpi = (titulo, valor, detalle, color = '') =>
  `<div class="card k ${color}"><span>${titulo}</span><b>${valor}</b><span>${detalle || ''}</span></div>`;

export const tabla = (cabeceras, filas) =>
  `<div class="tw"><table><tr>${cabeceras.map(c => `<th>${c}</th>`).join('')}</tr>${filas
    .map(f => `<tr>${f.map(c => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</table></div>`;

// Barras horizontales. Cada fila: [nombre, valor, color, texto a la derecha].
export function barras(filas, colorPorDefecto) {
  const maximo = Math.max(...filas.map(f => f[1]), 1);
  return filas
    .map(
      f =>
        `<div class="bar"><span>${f[0]}</span><div><i style="width:${(f[1] / maximo) * 100}%;background:${f[2] || colorPorDefecto}"></i></div><b>${f[3]}</b></div>`
    )
    .join('');
}

// Título de la pantalla con su subtítulo y, opcionalmente, botones a la derecha.
export const encabezado = (titulo, subtitulo, acciones = '') =>
  `<div class="top"><div><h1>${titulo}</h1><p class="sub">${subtitulo}</p></div><div class="row">${acciones}</div></div>`;

// Mensaje que se muestra cuando todavía no hay datos para la pantalla.
export const estadoVacio = (titulo, texto, boton = true) =>
  `<div class="card vacio"><h2>${titulo}</h2><p class="mu">${texto}</p>${
    boton ? '<button class="btn p" data-go="datos">Ir a Datos →</button>' : ''
  }</div>`;
