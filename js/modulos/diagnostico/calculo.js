// Diagnóstico OTIF: evolución mensual, relación entre incidencias y OTIF, y causas (Pareto).

import { num, sum, etiquetaMes, normalizar } from '../../nucleo/formato.js';

export function calcularOtif(datos, ajustes) {
  // --- Un registro por mes
  const meses = datos.otif.map(fila => {
    const total = num(fila.pedidostotal);
    const cumplidos = num(fila.pedidosotif);
    return {
      mes: etiquetaMes(fila.mes),
      otif: total ? (cumplidos / total) * 100 : 0,
      total, // pedidos del mes
      cumplidos, // pedidos a tiempo y completos
      cajasEntregadas: num(fila.cajasentregadas),
      cajasPedidas: num(fila.cajaspedidas),
      incidencias: fila.incidencias === undefined || fila.incidencias === '' ? null : num(fila.incidencias),
      parcial: total < 100 // un mes con muy pocos pedidos no entra en promedios ni en la regresión
    };
  });
  const completos = meses.filter(m => !m.parcial);

  const promedio = completos.length ? sum(completos, m => m.otif) / completos.length : 0;
  const bajoMeta = completos.filter(m => m.otif < ajustes.meta).length;

  // --- Regresión lineal: OTIF = intercepto + pendiente × incidencias del mes
  const puntos = completos.filter(m => m.incidencias != null);
  let pendiente = -0.17;
  let intercepto = 100;
  let r2 = 0;
  let incidenciasPromedio = 0;
  if (puntos.length > 2) {
    const n = puntos.length;
    const mediaIncidencias = sum(puntos, m => m.incidencias) / n;
    const mediaOtif = sum(puntos, m => m.otif) / n;
    const sxy = sum(puntos, m => (m.incidencias - mediaIncidencias) * (m.otif - mediaOtif));
    const sxx = sum(puntos, m => (m.incidencias - mediaIncidencias) ** 2);
    const syy = sum(puntos, m => (m.otif - mediaOtif) ** 2);
    pendiente = sxy / sxx;
    intercepto = mediaOtif - pendiente * mediaIncidencias;
    r2 = (sxy * sxy) / (sxx * syy || 1);
    incidenciasPromedio = mediaIncidencias;
  }

  // --- Causas de las incidencias
  const lista = datos.causas;
  const totalCausas = sum(lista, c => num(c.frecuencia)) || 1;
  const porEtapa = {};
  lista.forEach(c => (porEtapa[c.etapa] = (porEtapa[c.etapa] || 0) + num(c.frecuencia)));
  let acumulado = 0;
  const acumulados = lista.map(c => (acumulado += num(c.frecuencia)) / totalCausas);

  return {
    meses,
    completos,
    promedio,
    bajoMeta,
    puntos,
    regresion: { pendiente, intercepto, r2, incidenciasPromedio },
    inFull: sum(completos, m => m.cajasEntregadas) / (sum(completos, m => m.cajasPedidas) || 1),
    pedidosFuera: sum(completos, m => m.total - m.cumplidos),
    pedidosTotales: sum(completos, m => m.total),
    causas: { lista, total: totalCausas, porEtapa, acumulados }
  };
}

// Qué parte de las incidencias corresponde a una causa (busca por parte del nombre).
// participacionDeCausa(causas, 'ubicacion') → 0.311 si «Ubicaciones erróneas» pesa 31.1 %
export function participacionDeCausa(causas, fragmento) {
  const causa = causas.lista.find(c => normalizar(c.causa).includes(fragmento));
  return causa ? num(causa.frecuencia) / causas.total : 0;
}

// Causas que atacan los módulos de la app (se pintan en verde en el Pareto).
export const esCausaQueAtacaUnModulo = nombre =>
  /ubicacion|diferencia|faltadeprod/.test(normalizar(nombre));
