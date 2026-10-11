// Recalcula todo el modelo a partir de los datos leídos del Sheet y de los ajustes.
// Aquí se juntan los cálculos de cada módulo; las pantallas solo leen el resultado (`modelo`).

import { datos, ajustes, modelo } from './nucleo/estado.js';
import { planta } from './nucleo/planta.js';
import { construirCatalogo } from './nucleo/catalogo.js';
import { calcularInventario } from './modulos/inventario/calculo.js';
import { calcularOtif } from './modulos/diagnostico/calculo.js';
import { calcularUbicaciones } from './modulos/ubicaciones/calculo.js';
import { calcularEscenarios } from './modulos/escenarios/calculo.js';

export function recalcular() {
  const hay = {
    inventario: datos.inventario.length > 0,
    pedidos: datos.pedidos.length > 0,
    otif: datos.otif.length > 0,
    causas: datos.causas.length > 0
  };

  const catalogo = construirCatalogo(datos, ajustes);
  const inventario = calcularInventario(catalogo, ajustes);
  const otif = calcularOtif(datos, ajustes);
  const ubicaciones = calcularUbicaciones(catalogo, ajustes, planta);
  // Escenarios necesita inventario, pedidos y OTIF a la vez
  const escenarios =
    hay.inventario && hay.pedidos && hay.otif
      ? calcularEscenarios({ catalogo, otif, ubicaciones }, ajustes, planta)
      : null;

  Object.assign(modelo, { hay, catalogo, inventario, otif, ubicaciones, escenarios });
}
