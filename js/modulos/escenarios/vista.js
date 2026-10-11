// Escenarios: situación actual (As-Is) frente a la propuesta (To-Be) y simulador «¿qué pasa si…?».

import { modelo, ajustes, ui } from '../../nucleo/estado.js';
import { fmt, pc, sol, sum, mmss } from '../../nucleo/formato.js';
import { kpi, tabla, barras, encabezado, etiqueta } from '../../nucleo/html.js';
import { alClick, alCambiar } from '../../nucleo/dom.js';
import { pantallaVacia } from '../../nucleo/requisitos.js';
import { NIVELES_SERVICIO } from '../../nucleo/ajustes.js';
import { simularReposicion } from './calculo.js';

const TITULO = 'Escenarios';
const SUBTITULO =
  'Compare la situación actual con la propuesta y pruebe «qué pasa si» cambia la demanda o el tiempo de entrega.';

// Variación porcentual de y respecto a x
const variacion = (x, y) => (x ? (y / x - 1) * 100 : 0);
const etiquetaVariacion = (x, y) =>
  `<span class="tag ${y < x ? 't-g' : 't-b'}">${fmt(variacion(x, y), 1)} %</span>`;

function comparacion({ escenarios, otif, inventario, ubicaciones, catalogo }) {
  const { actual: a, propuesta: b, incidencias, incidenciasEvitadas, otifProyectado } = escenarios;
  const pedidosSimulados = Math.min(100, catalogo.pedidos.length);

  return `<div class="card"><h2>Situación actual (As-Is) frente a la propuesta (To-Be)</h2>${tabla(
    ['Indicador', 'Actual', 'Propuesta', 'Variación', 'Origen', 'Módulo'],
    [
      ['Distancia media por pedido', fmt(a.distancia) + ' m', fmt(b.distancia) + ' m', etiquetaVariacion(a.distancia, b.distancia), 'Simulado', '1 + 2'],
      ['Tiempo de armado por pedido', mmss(a.tiempo), mmss(b.tiempo), etiquetaVariacion(a.tiempo, b.tiempo), 'Simulado', '1 + 2'],
      ['Exposición media al frío', mmss(a.exposicionFrio), mmss(b.exposicionFrio), etiquetaVariacion(a.exposicionFrio || 1, b.exposicionFrio), 'Simulado', '2'],
      ['Pedidos que exceden ' + ajustes.frioMax + ' min en frío', pc(a.excedenFrio), pc(b.excedenFrio), '', 'Simulado', '2'],
      ['SKUs con riesgo térmico', ubicaciones.riesgoTermico, 0, '', 'Simulado', '1'],
      ['ERI por SKU', pc(inventario.eri), ajustes.eri + ' %', '', 'Objetivo (Ajustes)', '3'],
      ['OTIF (promedio mensual)', fmt(otif.promedio, 1) + ' %', fmt(otifProyectado, 1) + ' %', '+' + fmt(otifProyectado - otif.promedio, 1) + ' pp', 'Proyección', '1 + 2 + 3'],
      ['Incidencias de almacén por mes', fmt(incidencias), fmt(incidencias - incidenciasEvitadas), etiquetaVariacion(incidencias || 1, incidencias - incidenciasEvitadas), 'Proyección', '1 + 2 + 3'],
      ['Horas de picking ahorradas por mes', '—', fmt(escenarios.horasAhorradasPorMes, 0) + ' h', '', 'Simulado × volumen', '1 + 2'],
      ['Ahorro mensual en mano de obra', '—', sol(escenarios.horasAhorradasPorMes * ajustes.costoH), '', '× costo hora (Ajustes)', '1 + 2']
    ]
  )}<p class="mu">Simulación con ${pedidosSimulados} pedidos reales de sus datos.</p></div>`;
}

function aporteDeCadaModulo({ escenarios }) {
  const { actual: a, propuesta: b } = escenarios;
  return `<div class="card"><h2>¿Qué aporta cada módulo? (distancia media por pedido)</h2>${barras([
    ['Situación actual', a.distancia, '#94a3b8', fmt(a.distancia) + ' m'],
    ['Solo ruteo óptimo', a.distancia, '#0284c7', fmt(a.distancia) + ' m (ruteo ya incluido en As-Is)'],
    ['Solo reubicación (lista impresa)', escenarios.distanciaListaPropuesta, '#d97706', fmt(escenarios.distanciaListaPropuesta) + ' m'],
    ['Reubicación + ruteo', b.distancia, '#16a34a', fmt(b.distancia) + ' m (' + fmt(variacion(a.distancia, b.distancia), 1) + ' %)']
  ])}<p class="mu">Referencia: lista impresa con ubicaciones actuales = ${fmt(escenarios.distanciaListaActual)} m; vecino más cercano = ${fmt(escenarios.distanciaVecinoActual)} m.</p></div>`;
}

function proyeccionOtif({ escenarios, otif }) {
  const { otifProyectado, incidencias, incidenciasEvitadas } = escenarios;
  return `<div class="card"><h2>Proyección del OTIF</h2><div class="grid">${kpi('OTIF actual', fmt(otif.promedio, 1) + ' %', 'Meta ' + ajustes.meta + ' %', 'wa')}${kpi('OTIF proyectado con el artefacto', fmt(otifProyectado, 1) + ' %', '+' + fmt(otifProyectado - otif.promedio, 1) + ' puntos', 'wa')}${kpi('Incidencias por mes', fmt(incidencias) + ' → ' + fmt(incidencias - incidenciasEvitadas), 'según la efectividad supuesta')}</div><p class="mu">OTIF proyectado = OTIF actual + pendiente (${fmt(otif.regresion.pendiente, 3)} pp por incidencia) × cambio de incidencias. La reducción por módulo es un supuesto (Ajustes).</p></div>`;
}

function simulador({ escenarios, otif, inventario }) {
  const demanda = ui.escenarios.demanda || 0;
  const leadTime = ui.escenarios.leadTime || 0;
  const servicio = ui.escenarios.servicio || ajustes.z;
  const sim = simularReposicion({ inventario, otif }, ajustes, { demanda, leadTime, servicio }, escenarios);
  const hoy = inventario.pedir.length;

  return `<div class="card"><h2>Simulador «¿Qué pasa si…?»</h2><div class="grid"><label>Variación de la demanda: <b>${demanda > 0 ? '+' : ''}${demanda} %</b><br><input type="range" id="demanda" min="-30" max="50" value="${demanda}" style="width:100%"></label><label>Retraso en el lead time: <b>+${leadTime} d</b><br><input type="range" id="leadtime" min="0" max="10" value="${leadTime}" style="width:100%"></label><label>Nivel de servicio<br><select id="servicio">${Object.keys(NIVELES_SERVICIO).map(z => `<option ${z == servicio ? 'selected' : ''}>${z}</option>`).join('')}</select></label></div><div class="grid">${kpi('SKUs en riesgo de quiebre', sim.enRiesgo, `Hoy: ${hoy} (${sim.enRiesgo - hoy >= 0 ? '+' : ''}${sim.enRiesgo - hoy})`, sim.enRiesgo > hoy ? 'er' : 'ok')}${kpi('Stock de seguridad total', fmt(sim.stockSeguridadTotal) + ' u.', 'Hoy: ' + fmt(sum(inventario.filas, s => s.stockSeguridad)) + ' u.')}${kpi('Inversión inmediata en reposición', sol(sim.inversionInmediata), 'para los SKUs bajo su punto de reorden')}${kpi('OTIF proyectado', fmt(sim.otifEstimado, 1) + ' %', sim.otifEstimado < ajustes.meta ? 'Bajo la meta de ' + ajustes.meta + ' %' : 'Cumple la meta', 'wa')}</div></div>`;
}

function render() {
  const vacio = pantallaVacia(TITULO, SUBTITULO, ['inventario', 'pedidos', 'otif']);
  if (vacio) return vacio;

  const datos = modelo; // catalogo, inventario, otif, ubicaciones, escenarios
  return (
    encabezado(TITULO, SUBTITULO, `<button class="btn" id="recalcular">↻ Recalcular simulación</button>`) +
    comparacion(datos) +
    aporteDeCadaModulo(datos) +
    proyeccionOtif(datos) +
    simulador(datos)
  );
}

function enlazar({ refrescar }) {
  alClick('#recalcular', refrescar);
  alCambiar('#demanda', valor => {
    ui.escenarios.demanda = +valor;
    refrescar();
  });
  alCambiar('#leadtime', valor => {
    ui.escenarios.leadTime = +valor;
    refrescar();
  });
  alCambiar('#servicio', valor => {
    ui.escenarios.servicio = +valor;
    refrescar();
  });
}

export default {
  id: 'esc',
  titulo: 'Escenarios',
  icono: '⚙',
  color: '#ec4899',
  seccion: 'SIMULACIÓN',
  render,
  enlazar
};
