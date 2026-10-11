// Catálogo: une inventario y pedidos para saber, de cada SKU, cuánto se pide y qué tan seguido.
// Lo usan casi todos los módulos.

import { num, sum, aMarcaDeTiempo, normalizar } from './formato.js';

const ZONAS_CONOCIDAS = {
  seco: 'SECO',
  frio: 'FRIO',
  camarafria: 'FRIO',
  congelado: 'CONGELADO'
};

// "Frío", "frio" o "FRIO" → "FRIO"
const normalizarZona = zona => ZONAS_CONOCIDAS[normalizar(zona ?? '')] || String(zona ?? '').toUpperCase();

export function construirCatalogo(datos, ajustes) {
  const { inventario, pedidos } = datos;
  const leadTimePorZona = { SECO: ajustes.ltS, FRIO: ajustes.ltF, CONGELADO: ajustes.ltC };

  // --- Demanda y frecuencia dentro de la ventana de cálculo (los últimos N días de pedidos)
  const marcas = pedidos.map(p => aMarcaDeTiempo(p.fecha));
  let ultimaFecha = -Infinity;
  marcas.forEach(m => {
    if (m > ultimaFecha) ultimaFecha = m;
  });
  if (ultimaFecha === -Infinity) ultimaFecha = Date.now();
  const desde = ultimaFecha - ajustes.vent * 864e5;

  const demanda = {}; // unidades pedidas por SKU
  const frecuencia = {}; // líneas de pedido por SKU
  pedidos.forEach((p, i) => {
    if (marcas[i] >= desde) {
      demanda[p.sku] = (demanda[p.sku] || 0) + num(p.cantidad);
      frecuencia[p.sku] = (frecuencia[p.sku] || 0) + 1;
    }
  });

  // --- Pedidos: se agrupan las líneas de cada pedido y se ordenan del más reciente al más antiguo
  const agrupados = new Map();
  pedidos.forEach((p, i) => {
    if (!agrupados.has(p.pedidoid)) {
      agrupados.set(p.pedidoid, {
        id: p.pedidoid,
        cliente: p.cliente,
        tienda: p.tienda,
        fecha: p.fecha,
        marca: marcas[i],
        lineas: []
      });
    }
    agrupados.get(p.pedidoid).lineas.push(p);
  });
  const listaPedidos = [...agrupados.values()].sort((a, b) => (b.marca || 0) - (a.marca || 0));

  // --- SKUs
  const skus = inventario.map(s => {
    const sku = {
      sku: s.sku,
      descripcion: s.descripcion,
      cliente: s.cliente,
      um: s.um,
      costo: num(s.costounitario),
      stockSistema: num(s.stocksistema),
      // null = ese SKU no tiene conteo físico (no entra al cálculo del ERI)
      stockFisico: s.stockfisico === undefined || s.stockfisico === '' ? null : num(s.stockfisico),
      rack: s.rack,
      zona: normalizarZona(s.zona),
      volumen: num(s.volumenm3) || 0.005,
      demandaDiaria: (demanda[s.sku] || 0) / ajustes.vent,
      frecuencia: frecuencia[s.sku] || 0
    };
    sku.leadTime = leadTimePorZona[sku.zona] || 3;
    return sku;
  });

  // --- Clasificación ABC: A suma el 80 % de los pedidos, B hasta el 95 %, C el resto
  const totalFrecuencia = sum(skus, s => s.frecuencia) || 1;
  let acumulado = 0;
  [...skus]
    .sort((a, b) => b.frecuencia - a.frecuencia)
    .forEach(s => {
      const anterior = acumulado / totalFrecuencia;
      acumulado += s.frecuencia;
      s.abc = anterior < 0.8 ? 'A' : anterior < 0.95 ? 'B' : 'C';
    });

  return {
    skus,
    porSku: Object.fromEntries(skus.map(s => [s.sku, s])),
    pedidos: listaPedidos,
    nPedidos: listaPedidos.length,
    nLineas: pedidos.length
  };
}
