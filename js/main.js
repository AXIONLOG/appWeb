// Punto de entrada: arma el menú, muestra la pantalla elegida y lee el Sheet guardado al abrir.

import { ajustes, conexion } from './nucleo/estado.js';
import { $, $$ } from './nucleo/dom.js';
import { leerPreferencias, guardarPreferencias, limpiarVersionAnterior } from './nucleo/almacenamiento.js';
import { recalcular } from './modelo.js';
import { sincronizar } from './sincronizacion.js';

import panel from './modulos/panel/vista.js';
import datos from './modulos/datos/vista.js';
import diagnostico from './modulos/diagnostico/vista.js';
import ubicaciones from './modulos/ubicaciones/vista.js';
import picking from './modulos/picking/vista.js';
import inventario from './modulos/inventario/vista.js';
import escenarios from './modulos/escenarios/vista.js';
import ajustesPantalla from './modulos/ajustes/vista.js';

// Orden del menú. La sección se muestra como título cuando cambia.
const PANTALLAS = [panel, datos, diagnostico, ubicaciones, picking, inventario, escenarios, ajustesPantalla];
const POR_ID = Object.fromEntries(PANTALLAS.map(p => [p.id, p]));

let actual = 'panel';

function dibujarMenu() {
  let seccion = null;
  $('#nav').innerHTML = PANTALLAS.map(p => {
    const titulo = p.seccion && p.seccion !== seccion ? `<h6>${(seccion = p.seccion)}</h6>` : '';
    return `${titulo}<a data-go="${p.id}" title="${p.titulo}"><i style="background:${p.color}">${p.icono}</i><span>${p.titulo}</span></a>`;
  }).join('');
}

// Contexto que reciben las pantallas para pedir cosas a la app sin conocerla por dentro
const contexto = {
  ir,
  refrescar,
  sincronizar: enlace => sincronizar(enlace, refrescar),
  guardarAjustes() {
    guardarPreferencias({ enlace: conexion.enlace, ajustes });
    recalcular();
    refrescar();
  }
};

function dibujar() {
  const pantalla = POR_ID[actual];
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.go === actual));
  $('#view').innerHTML = pantalla.render();
  if (pantalla.enlazar) pantalla.enlazar(contexto);
  // Botones «Ir a …» que puede haber en cualquier pantalla
  $$('[data-go]', $('#view')).forEach(b => (b.onclick = () => ir(b.dataset.go, b.dataset)));
}

function ir(id, opciones = {}) {
  actual = id;
  if (POR_ID[id].alEntrar) POR_ID[id].alEntrar(opciones);
  dibujar();
  scrollTo(0, 0);
}

// Redibuja la pantalla actual sin perder la posición
function refrescar() {
  const y = scrollY;
  dibujar();
  scrollTo(0, y);
}

function activarMenuCompacto() {
  $('#hide').onclick = () => {
    const compacto = $('#side').classList.toggle('mini');
    $('#hi').textContent = compacto ? '»' : '«';
  };
  $$('#nav a').forEach(a => (a.onclick = () => ir(a.dataset.go)));
}

function iniciar() {
  limpiarVersionAnterior();
  const guardado = leerPreferencias();
  Object.assign(ajustes, guardado.ajustes || {});
  conexion.enlace = guardado.enlace || '';

  dibujarMenu();
  activarMenuCompacto();
  recalcular();
  ir('panel');

  // Se vuelve a leer el mismo Sheet cada vez que se abre la app
  if (conexion.enlace) contexto.sincronizar(conexion.enlace);
}

iniciar();
