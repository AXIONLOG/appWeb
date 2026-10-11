// Ubicaciones (slotting): propone en qué rack debe ir cada producto.
//   - Cada producto se mantiene en su cámara (seco, frío o congelado).
//   - Dentro de la cámara, los de menor COI (volumen ÷ frecuencia de pedido) van más cerca del muelle.

import { sum } from '../../nucleo/formato.js';
import { ZONAS } from '../../nucleo/planta.js';

const PESO_PRIORIDAD = { Crítica: 0, Alta: 1, Media: 2 };

export function calcularUbicaciones(catalogo, ajustes, planta) {
  const { skus } = catalogo;
  const racks = planta.racks;
  const alMuelle = rack => planta.distancia('DOCK', rack);

  // Capacidad de cada rack: el volumen total del stock repartido entre los racks, con 55 % de llenado
  const volumenTotal = sum(skus, s => s.volumen * s.stockSistema);
  const capacidad = {};
  racks.forEach(r => (capacidad[r.id] = volumenTotal / racks.length / 0.55));

  // Qué tan lleno queda cada rack con una asignación { sku: rack }
  const ocupacion = asignacion => {
    const ocupado = {};
    racks.forEach(r => (ocupado[r.id] = 0));
    skus.forEach(s => {
      if (ocupado[asignacion[s.sku]] != null) ocupado[asignacion[s.sku]] += s.volumen * s.stockSistema;
    });
    for (const rack in ocupado) ocupado[rack] /= capacidad[rack];
    return ocupado;
  };

  // --- Rack ideal de cada SKU
  const usado = {};
  racks.forEach(r => (usado[r.id] = 0));
  const ideal = {};
  ZONAS.forEach(zona => {
    const racksDeLaZona = racks
      .filter(r => r.zona === zona)
      .sort((a, b) => alMuelle(a.id) - alMuelle(b.id));
    if (!racksDeLaZona.length) return;
    skus
      .filter(s => s.zona === zona)
      .sort((a, b) => a.volumen / (a.frecuencia || 0.1) - b.volumen / (b.frecuencia || 0.1))
      .forEach(s => {
        const volumen = s.volumen * s.stockSistema;
        const rack =
          racksDeLaZona.find(r => usado[r.id] + volumen <= capacidad[r.id]) ||
          racksDeLaZona.reduce((menos, r) => (usado[r.id] < usado[menos.id] ? r : menos));
        usado[rack.id] += volumen;
        ideal[s.sku] = rack.id;
      });
  });

  // --- Traslados: solo si el SKU está en la cámara equivocada o la mejora supera el mínimo
  const actual = {};
  skus.forEach(s => (actual[s.sku] = s.rack));
  const propuesta = {};
  const traslados = [];
  let ahorro = 0;
  skus.forEach(s => {
    const nodoActual = planta.nodos[s.rack];
    const fueraDeCamara = nodoActual ? nodoActual.zona !== s.zona : false;
    const rackIdeal = ideal[s.sku];
    if (!rackIdeal) return;
    const mejora = alMuelle(s.rack) - alMuelle(rackIdeal);
    propuesta[s.sku] = s.rack;
    if (rackIdeal !== s.rack && (fueraDeCamara || mejora >= ajustes.minMej)) {
      propuesta[s.sku] = rackIdeal;
      const ahorroSemanal = (s.frecuencia / ajustes.vent) * 7 * 2 * Math.max(mejora, 0);
      ahorro += ahorroSemanal;
      traslados.push({
        ...s,
        rackPropuesto: rackIdeal,
        mejora,
        riesgoTermico: fueraDeCamara,
        ahorroSemanal,
        prioridad: fueraDeCamara ? 'Crítica' : s.abc === 'A' ? 'Alta' : 'Media'
      });
    }
  });
  traslados.sort(
    (a, b) =>
      PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] ||
      b.ahorroSemanal - a.ahorroSemanal
  );

  const ocupacionActual = ocupacion(actual);
  const ocupacionPropuesta = ocupacion(propuesta);
  const saturados = ocupado => Object.values(ocupado).filter(x => x > 1).length;

  return {
    traslados,
    ahorro, // metros de recorrido por semana si se aplican todos los traslados
    riesgoTermico: traslados.filter(t => t.riesgoTermico).length,
    sinUbicacion: skus.filter(s => !planta.nodos[s.rack]).length,
    actual, // { sku: rack } hoy
    propuesta, // { sku: rack } con el plan aplicado
    ocupacionActual,
    ocupacionPropuesta,
    saturadosActual: saturados(ocupacionActual),
    saturadosPropuesta: saturados(ocupacionPropuesta)
  };
}
