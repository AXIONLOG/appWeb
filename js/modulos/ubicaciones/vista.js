// Ubicaciones (slotting): plan de traslados y plano de la planta con la ocupación de los racks.

import { modelo, ui } from '../../nucleo/estado.js';
import { planta } from '../../nucleo/planta.js';
import { fmt, esc } from '../../nucleo/formato.js';
import { kpi, tabla, encabezado, etiqueta, etiquetaZona } from '../../nucleo/html.js';
import { dibujarPlano } from '../../nucleo/graficos.js';
import { descargarCsv } from '../../nucleo/csv.js';
import { $, alClick } from '../../nucleo/dom.js';
import { pantallaVacia } from '../../nucleo/requisitos.js';

const TITULO = 'Ubicaciones (Slotting)';
const SUBTITULO =
  'Ubique cerca del muelle lo que más se pide y mantenga cada producto en su cámara.';

const CLASE_PRIORIDAD = { Crítica: 't-r', Alta: 't-a', Media: 't-b' };

function planDeTraslados(traslados, total, filtro) {
  const filas = traslados.filter(
    t => !filtro || (t.sku + t.descripcion).toLowerCase().includes(filtro.toLowerCase())
  );
  return `<div class="card"><div class="row"><input id="filtro" placeholder="Buscar por SKU o producto…" value="${esc(filtro)}"></div><p class="mu">Mostrando ${filas.length} de ${total} SKUs</p>${tabla(
    ['Prioridad', 'SKU', 'Producto', 'Cliente', 'Zona', 'ABC', 'Rack actual', 'Rack propuesto', 'Mejora (m)'],
    filas.map(t => [
      etiqueta(CLASE_PRIORIDAD[t.prioridad], t.prioridad),
      esc(t.sku),
      esc(t.descripcion),
      esc(t.cliente),
      etiquetaZona(t.zona),
      t.abc,
      '<b>' + esc(t.rack) + '</b>',
      '<b>' + esc(t.rackPropuesto) + '</b>',
      fmt(t.mejora)
    ])
  )}</div>`;
}

function planoDeRacks(ubicaciones, conPlanAplicado) {
  return `<div class="card"><div class="row"><h2 style="flex:1">Ocupación de racks</h2><button class="btn ${conPlanAplicado ? '' : 'p'}" data-ocupacion="0">Situación actual</button><button class="btn ${conPlanAplicado ? 'p' : ''}" data-ocupacion="1">Con el plan aplicado</button></div>${dibujarPlano(planta, {
    ocupacion: conPlanAplicado ? ubicaciones.ocupacionPropuesta : ubicaciones.ocupacionActual
  })}</div>`;
}

function render() {
  const vacio = pantallaVacia(TITULO, SUBTITULO, ['inventario']);
  if (vacio) return vacio;

  const { catalogo, ubicaciones } = modelo;
  const { pestana, filtro, ocupacion } = ui.ubicaciones;
  const total = catalogo.skus.length;

  return (
    encabezado(TITULO, SUBTITULO, `<button class="btn" id="exportar">⬇ Exportar plan</button>`) +
    `<div class="grid">${kpi('Traslados sugeridos', ubicaciones.traslados.length, `de ${total} SKUs (${fmt((ubicaciones.traslados.length / (total || 1)) * 100, 0)} %)`, 'wa')}${kpi('Riesgo térmico', ubicaciones.riesgoTermico, 'productos fuera de su cámara', 'er')}${kpi('Ahorro estimado', fmt(ubicaciones.ahorro) + ' m/sem', 'metros de recorrido si se aplican todos')}${kpi('Racks sobre su capacidad', ubicaciones.saturadosActual, 'Con el plan: ' + ubicaciones.saturadosPropuesta, 'wa')}${kpi('SKUs sin ubicación', ubicaciones.sinUbicacion, '', 'ok')}</div>
<div class="tabs"><button class="${pestana == 1 ? 'on' : ''}" data-pestana="1">Plan de traslados</button><button class="${pestana == 2 ? 'on' : ''}" data-pestana="2">Plano de la planta</button></div>` +
    (pestana == 1 ? planDeTraslados(ubicaciones.traslados, total, filtro) : planoDeRacks(ubicaciones, ocupacion))
  );
}

function enlazar({ refrescar }) {
  alClick('[data-pestana]', boton => {
    ui.ubicaciones.pestana = +boton.dataset.pestana;
    refrescar();
  });
  alClick('[data-ocupacion]', boton => {
    ui.ubicaciones.ocupacion = +boton.dataset.ocupacion;
    refrescar();
  });

  // El filtro se aplica mientras se escribe; se devuelve el cursor a su sitio al redibujar
  const campo = $('#filtro');
  if (campo) {
    campo.oninput = () => {
      ui.ubicaciones.filtro = campo.value;
      const posicion = campo.selectionStart;
      refrescar();
      const nuevo = $('#filtro');
      nuevo.focus();
      nuevo.setSelectionRange(posicion, posicion);
    };
  }

  alClick('#exportar', () =>
    descargarCsv('plan_traslados', [
      ['Prioridad', 'SKU', 'Producto', 'Rack actual', 'Rack propuesto', 'Mejora m'],
      ...modelo.ubicaciones.traslados.map(t => [
        t.prioridad,
        t.sku,
        t.descripcion,
        t.rack,
        t.rackPropuesto,
        Math.round(t.mejora)
      ])
    ])
  );
}

export default {
  id: 'ubic',
  titulo: 'Ubicaciones',
  icono: '▦',
  color: '#f59e0b',
  seccion: 'MÓDULOS',
  render,
  enlazar
};
