// Picking: calcula el recorrido del picker para armar un pedido.
// Siempre respeta la cadena de frío: muelle → seco → frío → congelado → muelle.

import { ZONAS } from '../../nucleo/planta.js';

export const METODOS = {
  lista: 'Lista impresa (orden por código de SKU)',
  vecino: 'Vecino más cercano (sobre el grafo)',
  zonas: 'Óptimo por zonas (cadena de frío)'
};

// Todas las formas de ordenar una lista.
function permutaciones(lista) {
  if (lista.length < 2) return [lista];
  return lista.flatMap((x, i) =>
    permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map(p => [x, ...p])
  );
}

// Calcula la ruta de un pedido.
//   metodo:       'lista' | 'vecino' | 'zonas'
//   ubicaciones:  { sku: rack } que se usa (las actuales o las del plan aplicado)
//   contexto:     { porSku, planta, ajustes }
export function calcularRuta(pedido, metodo, ubicaciones, { porSku, planta, ajustes }) {
  const { nodos, distancia } = planta;
  const largo = secuencia => {
    let metros = 0;
    for (let i = 1; i < secuencia.length; i++) metros += distancia(secuencia[i - 1], secuencia[i]);
    return metros;
  };

  const lineas = pedido.lineas.filter(
    l => porSku[l.sku] && ubicaciones[l.sku] && nodos[ubicaciones[l.sku]]
  );
  const racks = [...new Set(lineas.map(l => ubicaciones[l.sku]))];

  let paradas;
  if (metodo === 'lista') {
    // Se visita en el orden de la lista impresa (por código de SKU)
    paradas = [];
    [...lineas]
      .sort((a, b) => a.sku.localeCompare(b.sku))
      .forEach(l => {
        if (!paradas.includes(ubicaciones[l.sku])) paradas.push(ubicaciones[l.sku]);
      });
  } else if (metodo === 'vecino') {
    // Siempre se va al rack pendiente más cercano
    paradas = [];
    let actual = 'DOCK';
    const pendientes = [...racks];
    while (pendientes.length) {
      pendientes.sort((a, b) => distancia(actual, a) - distancia(actual, b));
      actual = pendientes.shift();
      paradas.push(actual);
    }
  } else {
    // Zona por zona, en el orden de la cadena de frío; dentro de cada zona se prueban todos los
    // órdenes posibles (hasta 7 racks) y se elige el más corto
    paradas = [];
    let actual = 'DOCK';
    ZONAS.forEach(zona => {
      const grupo = racks.filter(r => nodos[r].zona === zona);
      if (!grupo.length) return;
      const ordenes =
        grupo.length <= 7
          ? permutaciones(grupo)
          : [grupo.sort((a, b) => distancia(actual, a) - distancia(actual, b))];
      let mejor = null;
      let mejorLargo = 1e9;
      ordenes.forEach(orden => {
        const metros = largo([actual, ...orden]);
        if (metros < mejorLargo) {
          mejorLargo = metros;
          mejor = orden;
        }
      });
      paradas.push(...mejor);
      actual = mejor[mejor.length - 1];
    });
  }

  const recorrido = ['DOCK', ...paradas, 'DOCK'];
  const metros = largo(recorrido);
  const tiempo = metros / ajustes.vel + lineas.length * ajustes.tpl;

  // Exposición al frío: tiempo desde que entra a la primera cámara fría hasta que sale de la última
  const posicionesFrias = paradas
    .map((rack, i) => (nodos[rack].zona !== 'SECO' ? i : -1))
    .filter(i => i >= 0);
  let exposicionFrio = 0;
  if (posicionesFrias.length) {
    const desde = posicionesFrias[0] + 1;
    const hasta = posicionesFrias[posicionesFrias.length - 1] + 1;
    exposicionFrio =
      largo(recorrido.slice(desde, hasta + 1)) / ajustes.vel +
      lineas.filter(l => nodos[ubicaciones[l.sku]].zona !== 'SECO').length * ajustes.tpl;
  }

  // Hoja de picking: [paso, rack, zona, sku, producto, cantidad]
  const hoja = [];
  paradas.forEach((rack, i) =>
    lineas
      .filter(l => ubicaciones[l.sku] === rack)
      .forEach(l =>
        hoja.push([i + 1, rack, nodos[rack].zona, l.sku, porSku[l.sku].descripcion, l.cantidad])
      )
  );

  return { paradas, recorrido, distancia: metros, tiempo, exposicionFrio, hoja, nLineas: lineas.length };
}
