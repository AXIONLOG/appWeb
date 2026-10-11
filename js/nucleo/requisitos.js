// Cada pantalla necesita ciertas tablas del Sheet. Si faltan, se muestra un aviso en vez de la pantalla.

import { modelo, conexion } from './estado.js';
import { encabezado, estadoVacio } from './html.js';
import { PESTANAS } from './hojas.js';

const NOMBRE_PESTANA = Object.fromEntries(PESTANAS.map(p => [p.tabla, p.nombre]));

// Devuelve el HTML del aviso si falta alguna tabla, o null si la pantalla puede dibujarse.
export function pantallaVacia(titulo, subtitulo, requeridas) {
  const faltan = requeridas.filter(tabla => !modelo.hay[tabla]);
  if (!faltan.length) return null;

  let aviso;
  switch (conexion.estado) {
    case 'sin_enlace':
      aviso = estadoVacio(
        'Conecte su Google Sheet',
        'Esta pantalla se llena con los datos de su Sheet. Pegue el enlace en la pantalla Datos.'
      );
      break;
    case 'leyendo':
      aviso = estadoVacio('Leyendo el Sheet…', 'Un momento, se están cargando los datos.', false);
      break;
    case 'error':
      aviso = estadoVacio('No se pudo leer el Sheet', conexion.mensaje);
      break;
    default:
      aviso = estadoVacio(
        'Faltan datos en el Sheet',
        'Esta pantalla necesita las pestañas: ' +
          faltan.map(t => NOMBRE_PESTANA[t]).join(', ') +
          '. Revise sus nombres y columnas en la pantalla Datos.'
      );
  }
  return encabezado(titulo, subtitulo) + aviso;
}
