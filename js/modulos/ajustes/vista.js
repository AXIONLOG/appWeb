// Ajustes: parámetros y supuestos del modelo. Se guardan en este navegador.

import { ajustes } from '../../nucleo/estado.js';
import { AJUSTES_POR_DEFECTO, GRUPOS_AJUSTES, NIVELES_SERVICIO } from '../../nucleo/ajustes.js';
import { encabezado } from '../../nucleo/html.js';
import { $$, alClick } from '../../nucleo/dom.js';

const TITULO = 'Ajustes';
const SUBTITULO = 'Parámetros y supuestos del modelo. Cambiar un valor recalcula todo el sistema.';

function campo([clave, etiqueta, tipo]) {
  const control =
    tipo === 'seleccion'
      ? `<select data-ajuste="${clave}">${Object.keys(NIVELES_SERVICIO)
          .map(z => `<option ${ajustes[clave] == z ? 'selected' : ''}>${z}</option>`)
          .join('')}</select>`
      : `<input type="number" step="any" data-ajuste="${clave}" value="${ajustes[clave]}">`;
  return `<div class="fld"><span>${etiqueta}</span>${control}</div>`;
}

function render() {
  return (
    encabezado(
      TITULO,
      SUBTITULO,
      `<button class="btn p" id="guardar">✓ Guardar cambios</button><button class="btn" id="restablecer">↺ Restablecer valores</button>`
    ) +
    `<div class="grid g2">${GRUPOS_AJUSTES.map(
      ([titulo, campos]) => `<div class="card"><h2>${titulo}</h2>${campos.map(campo).join('')}</div>`
    ).join('')}</div><div class="card"><h2>Acerca de</h2><p>AXIONLOG web · versión 2.0. Los datos se leen de su Google Sheet cada vez que se abre la app. En este navegador solo se guardan el enlace del Sheet y estos ajustes.</p></div>`
  );
}

function enlazar({ guardarAjustes }) {
  alClick('#guardar', () => {
    $$('[data-ajuste]').forEach(c => (ajustes[c.dataset.ajuste] = +c.value));
    guardarAjustes();
  });
  alClick('#restablecer', () => {
    Object.assign(ajustes, AJUSTES_POR_DEFECTO);
    guardarAjustes();
  });
}

export default {
  id: 'aju',
  titulo: 'Ajustes',
  icono: '⚒',
  color: '#64748b',
  seccion: 'SIMULACIÓN',
  render,
  enlazar
};
