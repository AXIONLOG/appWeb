// Datos: aquí se conecta el Google Sheet (única vía de entrada de información) y se ve el estado de la lectura.

import { modelo, conexion, ajustes } from '../../nucleo/estado.js';
import { planta } from '../../nucleo/planta.js';
import { PESTANAS } from '../../nucleo/hojas.js';
import { fmt, esc } from '../../nucleo/formato.js';
import { encabezado, etiqueta } from '../../nucleo/html.js';
import { $, alClick } from '../../nucleo/dom.js';
import { descargarDiagnosticoPdf } from '../diagnostico/pdf.js';

const TITULO = 'Datos';
const SUBTITULO = 'Toda la información entra desde su Google Sheet. Pegue el enlace y la app lo recordará.';

const MENSAJE_ESTADO = {
  sin_enlace: ['t-a', 'Sin Sheet conectado'],
  leyendo: ['t-b', 'Leyendo el Sheet…'],
  ok: ['t-g', 'Conectado · 4 de 4 pestañas leídas'],
  parcial: ['t-a', 'Conectado con avisos · faltan pestañas'],
  error: ['t-r', 'No se pudo leer']
};

function estadoDeLectura() {
  const [clase, texto] = MENSAJE_ESTADO[conexion.estado];
  const hora = conexion.ultimaLectura
    ? ` <span class="mu">Última lectura: ${conexion.ultimaLectura.toLocaleString('es-PE')}</span>`
    : '';
  const aviso = conexion.mensaje ? `<p class="er-text">${esc(conexion.mensaje)}</p>` : '';
  const pestanas = conexion.pestanas.length
    ? `<ul class="lectura">${conexion.pestanas
        .map(
          p =>
            `<li>${p.ok ? '✔' : '✘'} <b>${esc(p.nombre)}</b> · ${
              p.ok ? fmt(p.filas) + ' filas' : esc(p.error)
            }</li>`
        )
        .join('')}</ul>`
    : '';
  return `<p>${etiqueta(clase, texto)}${hora}</p>${aviso}${pestanas}`;
}

function tarjetaDeEnlace() {
  const leyendo = conexion.estado === 'leyendo';
  const nombres = PESTANAS.map(p => `<b>${p.nombre}</b>`).join(', ');
  return `<div class="card"><h2>Conexión con Google Sheet</h2>
<label class="campo-enlace"><span>Enlace de su Google Sheet</span><input id="enlace" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(conexion.enlace)}" autocomplete="off"></label>
<div class="row"><button class="btn p" id="conectar" ${leyendo ? 'disabled' : ''}>${conexion.enlace ? '↻ Actualizar datos' : 'Conectar'}</button></div>
${estadoDeLectura()}
<ol class="pasos"><li>En Google Sheets, pulse <b>Compartir</b> y elija «Cualquier persona con el enlace» (lector).</li><li>El Sheet debe tener las pestañas ${nombres}, escritas así.</li><li>Copie el enlace del navegador, péguelo arriba y pulse el botón.</li></ol>
<p class="mu">El enlace queda guardado en este navegador: al abrir la app se vuelve a leer el mismo Sheet.</p></div>`;
}

function tarjetaDeLayout() {
  return `<div class="card"><h2>Layout de la planta</h2><p class="mu">Red de racks y pasillos de la planta.</p><p class="ok2">${planta.racks.length} racks · ${esc(planta.layout.nombre)}</p></div>`;
}

function tarjetaDeOtif() {
  const hay = modelo.hay.otif;
  const meses = hay ? modelo.otif.meses.length : 0;
  return `<div class="card"><h2>OTIF mensual</h2><p class="mu">Pedidos entregados a tiempo y completos, mes a mes (pestaña OTIF del Sheet).</p><p class="${hay ? 'ok2' : 'mu'}">${hay ? meses + ' meses' : 'Sin datos'}</p><button class="btn p" id="pdf" ${hay ? '' : 'disabled'}>⬇ Descargar Diagnóstico OTIF (PDF)</button></div>`;
}

function render() {
  return (
    encabezado(TITULO, SUBTITULO) +
    tarjetaDeEnlace() +
    `<div class="grid g2">${tarjetaDeLayout()}${tarjetaDeOtif()}</div>`
  );
}

function enlazar({ sincronizar }) {
  const conectar = () => sincronizar($('#enlace').value);
  alClick('#conectar', conectar);
  alClick('#pdf', descargarDiagnosticoPdf);
  const campo = $('#enlace');
  campo.onkeydown = e => {
    if (e.key === 'Enter') conectar();
  };
}

export default {
  id: 'datos',
  titulo: 'Datos',
  icono: '▤',
  color: '#14b8a6',
  seccion: 'DATOS',
  render,
  enlazar
};
