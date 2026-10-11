// Estado compartido de la app. Son objetos únicos: se modifican por dentro, nunca se reemplazan.

import { AJUSTES_POR_DEFECTO } from './ajustes.js';

// Tablas leídas del Google Sheet (una lista de filas por pestaña).
export const datos = { inventario: [], pedidos: [], otif: [], causas: [] };

// Parámetros del modelo (pantalla Ajustes).
export const ajustes = { ...AJUSTES_POR_DEFECTO };

// Estado de la conexión con el Sheet.
//   estado: 'sin_enlace' | 'leyendo' | 'ok' (4 pestañas) | 'parcial' (faltan pestañas) | 'error'
export const conexion = {
  enlace: '',
  estado: 'sin_enlace',
  mensaje: '',
  pestanas: [], // resultado de la última lectura, una por pestaña
  ultimaLectura: null
};

// Resultados de los cálculos. Lo rellena recalcular() (js/modelo.js); las pantallas solo lo leen.
export const modelo = {
  hay: { inventario: false, pedidos: false, otif: false, causas: false }
};

// Lo que el usuario eligió en cada pantalla (pestaña activa, filtros, pedido elegido…).
export const ui = {
  ubicaciones: { pestana: 1, filtro: '', ocupacion: 0 },
  picking: { pedido: '', metodo: 'zonas', plan: 0 },
  inventario: { pestana: 1 },
  escenarios: { demanda: 0, leadTime: 0, servicio: 0 }
};
