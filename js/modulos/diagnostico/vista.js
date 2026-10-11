// Diagnóstico OTIF: ¿qué tan bien cumplimos y por qué falla?

import { modelo, ajustes } from '../../nucleo/estado.js';
import { fmt, pc, num, esc } from '../../nucleo/formato.js';
import { kpi, tabla, barras, encabezado, etiqueta } from '../../nucleo/html.js';
import { graficoLineas, graficoDispersion } from '../../nucleo/graficos.js';
import { pantallaVacia } from '../../nucleo/requisitos.js';
import { esCausaQueAtacaUnModulo } from './calculo.js';

const TITULO = 'Diagnóstico OTIF';
const SUBTITULO =
  '¿Qué tan bien cumplimos y por qué falla? Evolución, efecto de las incidencias y causas que más pesan.';

function render() {
  const vacio = pantallaVacia(TITULO, SUBTITULO, ['otif']);
  if (vacio) return vacio;

  const { otif } = modelo;
  const { regresion, causas } = otif;
  const { pendiente, intercepto, r2, incidenciasPromedio } = regresion;
  // Incidencias por mes con las que la recta cruzaría la meta
  const incidenciasParaLaMeta = pendiente ? (ajustes.meta - intercepto) / pendiente : 0;

  const pareto = barras(
    causas.lista.map((c, i) => [
      esc(c.causa),
      num(c.frecuencia),
      esCausaQueAtacaUnModulo(c.causa) ? '#16a34a' : '#94a3b8',
      `${fmt(num(c.frecuencia))} · ${pc(num(c.frecuencia) / causas.total)} (acum. ${pc(causas.acumulados[i], 0)})`
    ])
  );
  const etapas = Object.entries(causas.porEtapa)
    .map(([etapa, frecuencia]) => etiqueta('t-b', esc(etapa) + ' ' + pc(frecuencia / causas.total)))
    .join(' ');

  const detalleMensual = tabla(
    ['Mes', 'Estado', 'Pedidos OTIF', 'Pedidos totales', 'OTIF', 'Cajas entregadas', 'Incidencias'],
    otif.meses.map(m => [
      esc(m.mes),
      m.parcial
        ? etiqueta('t-b', 'Parcial')
        : m.otif < ajustes.meta
          ? etiqueta('t-r', 'Bajo meta')
          : etiqueta('t-g', 'Cumple'),
      fmt(m.cumplidos),
      fmt(m.total),
      '<b>' + fmt(m.otif, 1) + ' %</b>',
      fmt(m.cajasEntregadas),
      m.incidencias ?? '—'
    ])
  );

  return (
    encabezado(TITULO, SUBTITULO) +
    `<div class="grid">${kpi('OTIF promedio', fmt(otif.promedio, 1) + ' %', `${fmt(otif.promedio - ajustes.meta, 1)} pp frente a la meta`, 'er')}${kpi('Meses bajo la meta', otif.bajoMeta + ' de ' + otif.completos.length, '', 'er')}${kpi('Incidencias en picking', fmt(((causas.porEtapa['Picking'] || 0) / causas.total) * 100, 1) + ' %', 'Etapa donde más se puede mejorar')}${kpi('Relación incidencias ↔ OTIF', 'R² = ' + fmt(r2 * 100, 0) + ' %', `Pendiente ${fmt(pendiente, 3)} pp por incidencia`)}${kpi('In Full (Fill Rate)', fmt(otif.inFull * 100, 2) + ' %', 'Cajas entregadas ÷ pedidas', 'ok')}</div>
<div class="card"><h2>Evolución mensual del OTIF</h2>${graficoLineas(otif.meses, ajustes.meta)}</div>
<div class="grid g2"><div class="card"><h2>¿Las incidencias explican el OTIF?</h2>${graficoDispersion(otif.puntos, regresion, ajustes.meta)}<p class="mu">Recta: OTIF = ${fmt(intercepto, 2)} ${fmt(pendiente, 4)} × incidencias. Para alcanzar ${ajustes.meta} % harían falta unas <b>${fmt(incidenciasParaLaMeta)}</b> incidencias/mes (hoy ${fmt(incidenciasPromedio)}).</p></div>
<div class="card"><h2>Causas de las incidencias (Pareto)</h2>${pareto}<p class="mu">Verde: causas que atacan los módulos. Por etapa: ${etapas}</p></div></div>
<div class="card"><h2>Detalle mensual</h2>${detalleMensual}</div>`
  );
}

export default {
  id: 'diag',
  titulo: 'Diagnóstico OTIF',
  icono: '∿',
  color: '#a855f7',
  seccion: 'ANÁLISIS',
  render
};
