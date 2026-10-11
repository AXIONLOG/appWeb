// Escenarios: compara la situación actual (As-Is) con la propuesta (To-Be) y simula «¿qué pasa si…?».
// Usa los cálculos de los otros módulos: rutas (Picking), reposición (Inventario) y causas (Diagnóstico).

import { sum } from '../../nucleo/formato.js';
import { NIVELES_SERVICIO } from '../../nucleo/ajustes.js';
import { calcularRuta } from '../picking/calculo.js';
import { participacionDeCausa } from '../diagnostico/calculo.js';

const PEDIDOS_SIMULADOS = 100; // se simulan los 100 pedidos más recientes

// As-Is contra To-Be con los pedidos reales, y proyección del OTIF.
export function calcularEscenarios({ catalogo, otif, ubicaciones }, ajustes, planta) {
  const pedidos = catalogo.pedidos.slice(0, PEDIDOS_SIMULADOS);
  const contexto = { porSku: catalogo.porSku, planta, ajustes };
  const rutas = (metodo, asignacion) =>
    pedidos.map(p => calcularRuta(p, metodo, asignacion, contexto));
  const promedio = (lista, valor) => sum(lista, valor) / (lista.length || 1);

  // Promedios con el método óptimo por zonas, con las ubicaciones actuales y con el plan aplicado
  const evaluar = asignacion => {
    const lista = rutas('zonas', asignacion);
    return {
      distancia: promedio(lista, r => r.distancia),
      tiempo: promedio(lista, r => r.tiempo),
      exposicionFrio: promedio(lista, r => r.exposicionFrio),
      excedenFrio: lista.filter(r => r.exposicionFrio / 60 > ajustes.frioMax).length / (lista.length || 1)
    };
  };
  const actual = evaluar(ubicaciones.actual);
  const propuesta = evaluar(ubicaciones.propuesta);

  // Referencias para la gráfica «¿qué aporta cada módulo?»
  const distanciaListaActual = promedio(rutas('lista', ubicaciones.actual), r => r.distancia);
  const distanciaListaPropuesta = promedio(rutas('lista', ubicaciones.propuesta), r => r.distancia);
  const distanciaVecinoActual = promedio(rutas('vecino', ubicaciones.actual), r => r.distancia);

  // Proyección del OTIF: cuántas incidencias se evitan según cuánto reduce cada módulo (Ajustes)
  const { causas, regresion } = otif;
  const incidencias = regresion.incidenciasPromedio;
  const incidenciasEvitadas =
    (incidencias *
      (participacionDeCausa(causas, 'ubicacion') * ajustes.rUb +
        participacionDeCausa(causas, 'diferencia') * ajustes.rEri +
        participacionDeCausa(causas, 'faltadeprod') * ajustes.rRop)) /
    100;
  const otifProyectado = otif.promedio + -regresion.pendiente * incidenciasEvitadas;

  return {
    actual,
    propuesta,
    distanciaListaActual,
    distanciaListaPropuesta,
    distanciaVecinoActual,
    incidencias,
    incidenciasEvitadas,
    otifProyectado,
    horasAhorradasPorMes:
      ((actual.tiempo - propuesta.tiempo) * catalogo.nPedidos) / (ajustes.vent / 30) / 3600
  };
}

// Simulador: vuelve a calcular la reposición con otra demanda, otro retraso del lead time
// y otro nivel de servicio, y estima cómo cambia el OTIF.
export function simularReposicion({ inventario, otif }, ajustes, escenario, proyeccion) {
  const { demanda, leadTime, servicio } = escenario; // demanda en %, leadTime en días
  const filas = inventario.reposicion(NIVELES_SERVICIO[servicio] || 1.645, demanda / 100, leadTime);
  const enRiesgo = filas.filter(s => s.estado === 'PEDIR').length;

  // Si hay más SKUs en riesgo, aumentan las incidencias por «falta de productos»
  const incidenciasFaltaDeProductos =
    proyeccion.incidencias * participacionDeCausa(otif.causas, 'faltadeprod');
  const otifEstimado =
    proyeccion.otifProyectado +
    -otif.regresion.pendiente *
      (incidenciasFaltaDeProductos * (1 - ajustes.rRop / 100)) *
      (enRiesgo / (inventario.pedir.length || 1) - 1);

  return {
    filas,
    enRiesgo,
    stockSeguridadTotal: sum(filas, s => s.stockSeguridad),
    inversionInmediata: sum(
      filas.filter(s => s.estado === 'PEDIR'),
      s => s.inversion
    ),
    otifEstimado
  };
}
