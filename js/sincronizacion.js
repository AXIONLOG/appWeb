// Conecta con el Google Sheet: lo lee, guarda el enlace y recalcula.

import { datos, ajustes, conexion } from './nucleo/estado.js';
import { leerHoja, idDeHoja } from './nucleo/hojas.js';
import { guardarPreferencias } from './nucleo/almacenamiento.js';
import { recalcular } from './modelo.js';

const SIN_DATOS = () => ({ inventario: [], pedidos: [], otif: [], causas: [] });

// Lee el Sheet de `enlace`. `avisar` redibuja la pantalla (al empezar y al terminar la lectura).
export async function sincronizar(enlace, avisar) {
  conexion.enlace = (enlace || '').trim();
  conexion.mensaje = '';

  // Un enlace inválido no se guarda ni se lee
  if (!conexion.enlace || !idDeHoja(conexion.enlace)) {
    conexion.estado = 'error';
    conexion.pestanas = [];
    conexion.mensaje = conexion.enlace
      ? 'El enlace no parece de Google Sheets (debe contener /spreadsheets/d/…).'
      : 'Pegue el enlace de su Google Sheet.';
    Object.assign(datos, SIN_DATOS());
    recalcular();
    avisar();
    return;
  }

  conexion.estado = 'leyendo';
  avisar();
  guardarPreferencias({ enlace: conexion.enlace, ajustes });

  try {
    const { tablas, pestanas } = await leerHoja(conexion.enlace);
    Object.assign(datos, tablas);
    conexion.pestanas = pestanas;
    const leidas = pestanas.filter(p => p.ok).length;
    conexion.estado = leidas === pestanas.length ? 'ok' : leidas ? 'parcial' : 'error';
    conexion.mensaje = leidas
      ? ''
      : 'No se pudo leer ninguna pestaña. Revise que el Sheet esté compartido como «Cualquier persona con el enlace» y que haya conexión a internet.';
    conexion.ultimaLectura = new Date();
  } catch (e) {
    Object.assign(datos, SIN_DATOS());
    conexion.pestanas = [];
    conexion.estado = 'error';
    conexion.mensaje = e.message;
  }
  recalcular();
  avisar();
}
