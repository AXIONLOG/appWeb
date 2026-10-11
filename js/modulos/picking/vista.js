// Picking · Rutas: elegir un pedido, ver su recorrido en la planta y descargar la hoja de picking.

import { modelo, ajustes, ui } from '../../nucleo/estado.js';
import { planta } from '../../nucleo/planta.js';
import { fmt, mmss, esc } from '../../nucleo/formato.js';
import { kpi, tabla, encabezado, etiqueta, etiquetaZona, estadoVacio } from '../../nucleo/html.js';
import { dibujarPlano } from '../../nucleo/graficos.js';
import { descargarCsv } from '../../nucleo/csv.js';
import { alClick, alCambiar } from '../../nucleo/dom.js';
import { pantallaVacia } from '../../nucleo/requisitos.js';
import { METODOS, calcularRuta } from './calculo.js';

const TITULO = 'Picking · Rutas';
const SUBTITULO =
  'Elija un pedido y el sistema calcula el recorrido respetando la cadena de frío: muelle → seco → frío → congelado → muelle.';
const PEDIDOS_EN_LISTA = 400;

// Pedido elegido, método y ubicaciones con los que se calcula la ruta
function seleccion() {
  const { catalogo, ubicaciones } = modelo;
  const pedidos = catalogo.pedidos.slice(0, PEDIDOS_EN_LISTA);
  const elegido = ui.picking.pedido || (pedidos[0] && pedidos[0].id);
  return {
    pedidos,
    pedido: pedidos.find(p => p.id == elegido) || pedidos[0],
    metodo: ui.picking.metodo || 'zonas',
    ubicaciones: ui.picking.plan ? ubicaciones.propuesta : ubicaciones.actual
  };
}

const contextoDeRutas = () => ({ porSku: modelo.catalogo.porSku, planta, ajustes });

function render() {
  const vacio = pantallaVacia(TITULO, SUBTITULO, ['inventario', 'pedidos']);
  if (vacio) return vacio;

  const { pedidos, pedido, metodo, ubicaciones } = seleccion();
  if (!pedido) return encabezado(TITULO, SUBTITULO) + estadoVacio('No hay pedidos', 'Revise la pestaña Pedidos de su Sheet.');

  const contexto = contextoDeRutas();
  const ruta = calcularRuta(pedido, metodo, ubicaciones, contexto);
  const comparacion = Object.keys(METODOS).map(m => [m, calcularRuta(pedido, m, ubicaciones, contexto)]);
  const distanciaLista = comparacion[0][1].distancia;
  const distanciaMinima = Math.min(...comparacion.map(([, r]) => r.distancia));
  const dentroDelLimite = ruta.exposicionFrio / 60 <= ajustes.frioMax;
  const conPlan = ui.picking.plan;

  return (
    encabezado(TITULO, SUBTITULO) +
    `<div class="grid g2"><div><div class="card"><h2>1 · Elija el pedido</h2><select id="pedido" style="width:100%">${pedidos.map(p => `<option value="${esc(p.id)}" ${p.id == pedido.id ? 'selected' : ''}>${esc(p.id)} · ${esc(p.tienda)} · ${p.lineas.length} líneas</option>`).join('')}</select><p class="mu">Se muestran los ${PEDIDOS_EN_LISTA} más recientes.</p></div>
<div class="card"><h2>2 · Método y ubicaciones</h2><select id="metodo" style="width:100%">${Object.entries(METODOS).map(([clave, nombre]) => `<option value="${clave}" ${clave == metodo ? 'selected' : ''}>${nombre}</option>`).join('')}</select><div class="tabs" style="margin-top:8px"><button class="${conPlan ? '' : 'on'}" data-plan="0">Ubicaciones actuales</button><button class="${conPlan ? 'on' : ''}" data-plan="1">Con plan aplicado</button></div></div>
<div class="grid">${kpi('Distancia total', fmt(ruta.distancia) + ' m', 'ida y vuelta al muelle')}${kpi('Tiempo de armado', mmss(ruta.tiempo), ajustes.vel + ' m/s + ' + ajustes.tpl + ' s por línea')}${kpi('Exposición al frío', mmss(ruta.exposicionFrio), `Límite ${ajustes.frioMax} min · ${dentroDelLimite ? 'dentro' : 'EXCEDIDO'}`, dentroDelLimite ? 'ok' : 'er')}${kpi('Paradas y líneas', ruta.paradas.length + ' / ' + ruta.nLineas, 'racks a visitar / líneas')}</div></div>
<div class="card"><h2>Recorrido en la planta</h2>${dibujarPlano(planta, { recorrido: ruta.recorrido, paradas: ruta.paradas })}</div></div>
<div class="card"><h2>Comparar métodos para este pedido</h2>${tabla(
      ['Método', 'Distancia (m)', 'Tiempo', 'vs. lista', 'Mejor'],
      comparacion.map(([m, r]) => [
        METODOS[m],
        fmt(r.distancia),
        mmss(r.tiempo),
        m == 'lista' ? '—' : fmt((r.distancia / distanciaLista - 1) * 100, 1) + ' %',
        r.distancia == distanciaMinima ? etiqueta('t-g', '★ Mejor') : ''
      ])
    )}</div>
<div class="card"><div class="row"><h2 style="flex:1">Hoja de picking</h2><button class="btn p" id="exportar">⬇ Exportar CSV</button><button class="btn" id="imprimir">Guardar PDF</button></div>${tabla(
      ['Paso', 'Rack', 'Zona', 'SKU', 'Producto', 'Cantidad'],
      ruta.hoja.map(h => [h[0], '<b>' + esc(h[1]) + '</b>', etiquetaZona(h[2]), esc(h[3]), esc(h[4]), esc(h[5])])
    )}</div>`
  );
}

function enlazar({ refrescar }) {
  alCambiar('#pedido', valor => {
    ui.picking.pedido = valor;
    refrescar();
  });
  alCambiar('#metodo', valor => {
    ui.picking.metodo = valor;
    refrescar();
  });
  alClick('[data-plan]', boton => {
    ui.picking.plan = +boton.dataset.plan;
    refrescar();
  });

  alClick('#exportar', () => {
    const { pedido, metodo, ubicaciones } = seleccion();
    const ruta = calcularRuta(pedido, metodo, ubicaciones, contextoDeRutas());
    descargarCsv('hoja_picking_' + pedido.id, [
      ['Paso', 'Rack', 'Zona', 'SKU', 'Producto', 'Cantidad'],
      ...ruta.hoja
    ]);
  });
  alClick('#imprimir', () => window.print());
}

export default {
  id: 'pick',
  titulo: 'Picking',
  icono: '⇢',
  color: '#06b6d4',
  seccion: 'MÓDULOS',
  render,
  enlazar
};
