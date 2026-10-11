// Gráficos dibujados como SVG: evolución del OTIF, dispersión con recta ajustada y plano de la planta.

import { fmt, esc } from './formato.js';

// Evolución mensual del OTIF contra la meta. `meses` viene de calcularOtif().
export function graficoLineas(meses, meta) {
  if (!meses.length) return '';
  const ancho = 640;
  const alto = 230;
  const margen = 36;
  const minimo = Math.min(80, ...meses.map(m => m.otif)) - 1;
  const maximo = 100;
  const X = i => margen + (i * (ancho - margen - 10)) / Math.max(meses.length - 1, 1);
  const Y = v => alto - 24 - ((v - minimo) / (maximo - minimo)) * (alto - 40);

  let svg = `<svg viewBox="0 0 ${ancho} ${alto}">`;
  for (let v = Math.ceil(minimo / 5) * 5; v <= 100; v += 5) {
    svg += `<line x1="${margen}" x2="${ancho}" y1="${Y(v)}" y2="${Y(v)}" stroke="#eef1f6"/><text x="${margen - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="#667085">${v}</text>`;
  }
  svg += `<line x1="${margen}" x2="${ancho}" y1="${Y(meta)}" y2="${Y(meta)}" stroke="#16a34a" stroke-dasharray="6 4"/><text x="${margen + 4}" y="${Y(meta) - 4}" font-size="11" fill="#16a34a">Meta ${meta} %</text>`;
  // La línea azul solo une los meses completos; el mes parcial se dibuja aparte, como círculo vacío.
  const puntosLinea = meses
    .filter(m => !m.parcial)
    .map(m => X(meses.indexOf(m)) + ',' + Y(m.otif))
    .join(' ');
  svg += `<polyline fill="none" stroke="#2563eb" stroke-width="2" points="${puntosLinea}"/>`;
  meses.forEach((m, i) => {
    const relleno = m.parcial ? '#fff' : m.otif >= meta ? '#16a34a' : '#dc2626';
    svg += `<circle cx="${X(i)}" cy="${Y(m.otif)}" r="4.5" fill="${relleno}" stroke="${m.parcial ? '#94a3b8' : 'none'}"><title>${esc(m.mes)}: ${fmt(m.otif, 1)} %</title></circle><text x="${X(i)}" y="${alto - 6}" text-anchor="middle" font-size="10" fill="#475569">${esc(m.mes)}</text>`;
  });
  return svg + '</svg>';
}

// Un punto por mes (incidencias contra OTIF) y la recta de mínimos cuadrados.
export function graficoDispersion(puntos, regresion, meta) {
  const ancho = 520;
  const alto = 300;
  const margen = 44;
  const incidencias = puntos.map(m => m.incidencias);
  const x0 = Math.min(...incidencias, 20) - 5;
  const x1 = Math.max(...incidencias, 80) + 5;
  const y0 = Math.min(...puntos.map(m => m.otif), 84) - 1;
  const y1 = 99;
  const X = v => margen + ((v - x0) / (x1 - x0)) * (ancho - margen - 10);
  const Y = v => alto - 36 - ((v - y0) / (y1 - y0)) * (alto - 50);
  const { intercepto, pendiente } = regresion;

  let svg = `<svg viewBox="0 0 ${ancho} ${alto}"><line x1="${margen}" x2="${ancho}" y1="${Y(meta)}" y2="${Y(meta)}" stroke="#16a34a" stroke-dasharray="6 4"/><line x1="${X(x0)}" y1="${Y(intercepto + pendiente * x0)}" x2="${X(x1)}" y2="${Y(intercepto + pendiente * x1)}" stroke="#dc2626" stroke-width="2"/>`;
  puntos.forEach(m => {
    svg += `<circle cx="${X(m.incidencias)}" cy="${Y(m.otif)}" r="5" fill="#2563eb"/><text x="${X(m.incidencias) + 6}" y="${Y(m.otif) - 6}" font-size="10">${esc(m.mes)}</text>`;
  });
  svg += `<text x="${ancho / 2}" y="${alto - 6}" text-anchor="middle" font-size="12" font-weight="700">Incidencias de almacén en el mes</text></svg>`;
  return svg;
}

const COLORES_ZONA = {
  SECO: ['#fef3c7', '#f59e0b'],
  FRIO: ['#e0f2fe', '#38bdf8'],
  CONGELADO: ['#e0e7ff', '#818cf8']
};
const RGB_ZONA = { SECO: '245,158,11', FRIO: '56,189,248', CONGELADO: '99,102,241' };

// Plano de la planta. Opciones:
//   ocupacion: { rack: fracción } → pinta cada rack según qué tan lleno está
//   recorrido: lista de nodos     → dibuja la ruta de picking
//   paradas:   lista de racks     → numera las paradas de la ruta
export function dibujarPlano(planta, { ocupacion, recorrido, paradas } = {}) {
  const { layout, nodos } = planta;
  const Y = y => 38 - y; // el plano crece hacia arriba; el SVG hacia abajo

  let svg =
    '<svg viewBox="0 0 82 40" style="background:#fff;border:1px solid #e2e6ee;border-radius:10px">';

  for (const zona in layout.zonas) {
    const q = layout.zonas[zona];
    svg += `<rect x="${q.x0}" y="${Y(q.y1)}" width="${q.x1 - q.x0}" height="${q.y1 - q.y0}" rx="1.2" fill="${COLORES_ZONA[zona][0]}" stroke="${COLORES_ZONA[zona][1]}" stroke-width=".25"/><text x="${q.x0 + 1}" y="${Y(q.y1) + 2}" font-size="1.5" font-weight="700" fill="#475569">${zona} · ${q.temp}</text>`;
  }

  layout.aristas.forEach(([a, b]) => {
    if (nodos[a] && nodos[b]) {
      svg += `<line x1="${nodos[a].x}" y1="${Y(nodos[a].y)}" x2="${nodos[b].x}" y2="${Y(nodos[b].y)}" stroke="#cbd5e1" stroke-width="1.4" stroke-linecap="round"/>`;
    }
  });

  layout.nodos.forEach(n => {
    if (n.tipo === 'muelle') {
      svg += `<rect x="${n.x - 2.5}" y="${Y(n.y) - 2}" width="5" height="4" rx=".5" fill="#16a34a"/><text x="${n.x}" y="${Y(n.y) + 0.5}" font-size="1.1" fill="#fff" text-anchor="middle" font-weight="700">MUELLE</text>`;
    }
    if (n.tipo === 'rack') {
      const llenado = ocupacion ? ocupacion[n.id] : null;
      const saturado = llenado > 1;
      const relleno =
        llenado == null
          ? '#fff'
          : `rgba(${RGB_ZONA[n.zona]},${Math.min(0.15 + llenado * 0.6, 0.95)})`;
      svg += `<rect x="${n.x - 2.2}" y="${Y(n.y) - 1.6}" width="4.4" height="3.2" rx=".4" fill="${relleno}" stroke="${saturado ? '#dc2626' : COLORES_ZONA[n.zona][1]}" stroke-width="${saturado ? 0.35 : 0.2}"/><text x="${n.x}" y="${Y(n.y) - 0.1}" font-size=".95" text-anchor="middle">${esc(n.id)}</text>${
        llenado != null
          ? `<text x="${n.x}" y="${Y(n.y) + 1}" font-size=".95" text-anchor="middle" font-weight="700">${Math.round(llenado * 100)} %</text>`
          : ''
      }`;
    }
  });

  if (recorrido) {
    const puntos = [];
    for (let i = 1; i < recorrido.length; i++) {
      planta.camino(recorrido[i - 1], recorrido[i]).forEach(n => {
        puntos.push(`${nodos[n].x},${Y(nodos[n].y)}`);
      });
    }
    svg += `<polyline points="${puntos.join(' ')}" fill="none" stroke="#2563eb" stroke-width=".45" stroke-dasharray=".9 .5"/>`;
    paradas.forEach((rack, i) => {
      svg += `<circle cx="${nodos[rack].x - 2.2}" cy="${Y(nodos[rack].y) - 1.6}" r="1" fill="#f97316"/><text x="${nodos[rack].x - 2.2}" y="${Y(nodos[rack].y) - 1.25}" font-size="1.1" fill="#fff" text-anchor="middle" font-weight="700">${i + 1}</text>`;
    });
  }
  return svg + '</svg>';
}
