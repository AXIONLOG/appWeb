// Panel: resumen de la operación y tareas ordenadas por urgencia.

import { modelo, ajustes, datos } from '../../nucleo/estado.js';
import { fmt, pc, sol, sum } from '../../nucleo/formato.js';
import { kpi, barras, encabezado, etiqueta } from '../../nucleo/html.js';
import { graficoLineas } from '../../nucleo/graficos.js';
import { pantallaVacia } from '../../nucleo/requisitos.js';

const TITULO = 'Panel de control';
const SUBTITULO = 'Resumen de la operación y lo que conviene hacer hoy.';

// Etiqueta verde si la tabla tiene datos, naranja si no.
const estadoDeTabla = (nombre, cantidad, unidad) =>
  cantidad
    ? etiqueta('t-g', `${nombre}: ${fmt(cantidad)} ${unidad}`)
    : etiqueta('t-a', `${nombre}: sin datos`);

function render() {
  const vacio = pantallaVacia(TITULO, SUBTITULO, ['inventario', 'pedidos', 'otif']);
  if (vacio) return vacio;

  const { catalogo, inventario, otif, ubicaciones } = modelo;
  const aReponer = inventario.pedir.length;
  const sinMes = { mes: '-', otif: 0 };
  const peorMes = otif.completos.length
    ? otif.completos.reduce((peor, m) => (m.otif < peor.otif ? m : peor))
    : sinMes;
  const mejorMes = otif.completos.length
    ? otif.completos.reduce((mejor, m) => (m.otif > mejor.otif ? m : mejor))
    : sinMes;

  return (
    encabezado(TITULO, SUBTITULO) +
    `<div class="grid">${kpi('OTIF promedio (meses completos)', fmt(otif.promedio, 1) + ' %', `Meta ${ajustes.meta} % · ${fmt(otif.promedio - ajustes.meta, 1)} pp`, otif.promedio < ajustes.meta ? 'er' : 'ok')}${kpi('Exactitud de inventario (ERI)', pc(inventario.eri), `${inventario.contados - inventario.diferencias.length} de ${inventario.contados} SKUs sin diferencia`, inventario.eri * 100 < ajustes.eri ? 'er' : 'ok')}${kpi('SKUs a reponer hoy', aReponer, 'Inversión ' + sol(sum(inventario.pedir, s => s.inversion)), 'er')}${kpi('Traslados sugeridos', ubicaciones.traslados.length, ubicaciones.riesgoTermico + ' críticos por riesgo térmico', 'wa')}${kpi('Valor del inventario', sol(inventario.valorInventario), catalogo.skus.length + ' SKUs activos')}</div>
<div class="grid g2"><div class="card"><h2>Tendencia histórica del OTIF</h2>${graficoLineas(otif.meses, ajustes.meta)}</div><div class="card"><h2>Desglose del OTIF</h2><p class="mu">OTIF = pedidos entregados a tiempo (On Time) y completos (In Full) a la vez.</p>${barras(
      [
        ['In Full (cajas)', otif.inFull * 100, '#2563eb', fmt(otif.inFull * 100, 2) + ' %'],
        ['OTIF', otif.promedio, otif.promedio < ajustes.meta ? '#dc2626' : '#16a34a', fmt(otif.promedio, 1) + ' %']
      ],
      '#2563eb'
    )}<p>${fmt(otif.pedidosFuera)} de ${fmt(otif.pedidosTotales)} pedidos quedaron fuera del OTIF.</p><p class="mu">Mejor mes: <b>${mejorMes.mes} · ${fmt(mejorMes.otif, 1)} %</b><br>Peor mes: <b>${peorMes.mes} · ${fmt(peorMes.otif, 1)} %</b><br>Meses bajo la meta: <b>${otif.bajoMeta} de ${otif.completos.length}</b></p></div></div>
<h2>Tareas ordenadas por urgencia</h2><div class="grid g2"><div class="card task"><big style="color:var(--er)">${aReponer}</big><div><b>Generar pedidos de reposición</b><p class="mu">SKUs en o bajo su punto de reorden. Otros ${inventario.pronto} lo estarán pronto.</p><button class="btn r" data-go="inv">Ver plan de compras →</button></div></div><div class="card task"><big style="color:var(--er)">${ubicaciones.riesgoTermico}</big><div><b>Trasladar productos mal ubicados</b><p class="mu">Productos fuera de su cámara: trasladarlos primero.</p><button class="btn r" data-go="ubic">Ver traslados →</button></div></div><div class="card task a"><big style="color:var(--wa)">${Math.min(40, inventario.diferencias.length)}</big><div><b>Conteo cíclico de la semana</b><p class="mu">Hay ${inventario.diferencias.length} SKUs con diferencia entre sistema y físico: se cuentan primero.</p><button class="btn o" data-go="inv" data-pestana="2">Ver lista de conteo →</button></div></div><div class="card task b"><big style="color:var(--ac)">→</big><div><b>Armar un pedido con la mejor ruta</b><p class="mu">Elija un pedido, vea el recorrido y descargue la hoja de picking.</p><button class="btn p" data-go="pick">Ir a Picking →</button></div></div></div>
<div class="card"><h2>Estado de los datos</h2>${estadoDeTabla('Inventario', datos.inventario.length, 'SKUs')} ${estadoDeTabla('Pedidos', datos.pedidos.length, 'líneas')} ${estadoDeTabla('OTIF', datos.otif.length, 'meses')} ${estadoDeTabla('Causas', datos.causas.length, 'causas')} <button class="btn" data-go="datos">Gestionar datos</button><p class="mu">Demanda calculada con ${fmt(catalogo.nPedidos)} pedidos de los últimos ${ajustes.vent} días.</p></div>`
  );
}

export default { id: 'panel', titulo: 'Panel', icono: '⌂', color: '#3b82f6', render };
