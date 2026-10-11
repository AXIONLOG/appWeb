// Lectura del Google Sheet. Es la única vía por la que entran datos a la app.
//
// El Sheet debe estar compartido como «Cualquier persona con el enlace» y tener
// 4 pestañas con estos nombres exactos: Inventario, Pedidos, OTIF y Causas.

import { leerTabla } from './csv.js';

// Cada pestaña: cómo se llama, en qué tabla de la app queda y qué columnas son obligatorias
// (nombre normalizado, nombre tal como se escribe en el Sheet).
export const PESTANAS = [
  {
    nombre: 'Inventario',
    tabla: 'inventario',
    obligatorias: [
      ['sku', 'SKU'],
      ['stocksistema', 'Stock_Sistema']
    ]
  },
  {
    nombre: 'Pedidos',
    tabla: 'pedidos',
    obligatorias: [
      ['pedidoid', 'Pedido_ID'],
      ['fecha', 'Fecha'],
      ['sku', 'SKU'],
      ['cantidad', 'Cantidad']
    ]
  },
  {
    nombre: 'OTIF',
    tabla: 'otif',
    obligatorias: [
      ['mes', 'Mes'],
      ['pedidosotif', 'Pedidos_OTIF'],
      ['pedidostotal', 'Pedidos_Total']
    ]
  },
  {
    nombre: 'Causas',
    tabla: 'causas',
    obligatorias: [
      ['causa', 'Causa'],
      ['etapa', 'Etapa'],
      ['frecuencia', 'Frecuencia']
    ]
  }
];

// Saca el identificador del Sheet de un enlace como https://docs.google.com/spreadsheets/d/ID/edit
export function idDeHoja(enlace) {
  const m = /\/spreadsheets\/d\/([\w-]+)/.exec(enlace || '');
  return m ? m[1] : null;
}

const urlCsv = (id, pestana) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(pestana)}`;

// Revisa que el texto recibido sea la pestaña esperada. Devuelve { filas } o { error }.
export function interpretarPestana(definicion, texto) {
  const contenido = (texto || '').trim();
  if (!contenido || contenido[0] === '<') {
    return { error: 'no se pudo leer (¿el Sheet no está compartido o no existe la pestaña?)' };
  }
  const { cabecera, filas } = leerTabla(contenido);
  const faltan = definicion.obligatorias
    .filter(([clave]) => !cabecera.includes(clave))
    .map(([, etiqueta]) => etiqueta);
  if (faltan.length) {
    return { error: `faltan columnas: ${faltan.join(', ')} (revise el nombre de la pestaña)` };
  }
  if (!filas.length) return { error: 'no tiene filas' };
  return { filas };
}

// Lee las 4 pestañas del Sheet. Nunca falla por una pestaña: devuelve el resultado de cada una.
// `descargar` es fetch; se puede cambiar para hacer pruebas.
export async function leerHoja(enlace, descargar = fetch) {
  const id = idDeHoja(enlace);
  if (!id) {
    throw new Error('El enlace no parece de Google Sheets (debe contener /spreadsheets/d/…).');
  }

  const pestanas = await Promise.all(
    PESTANAS.map(async definicion => {
      try {
        const respuesta = await descargar(urlCsv(id, definicion.nombre));
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        const resultado = interpretarPestana(definicion, await respuesta.text());
        return { definicion, ...resultado };
      } catch (e) {
        return { definicion, error: 'no se pudo conectar con Google (' + e.message + ')' };
      }
    })
  );

  const tablas = { inventario: [], pedidos: [], otif: [], causas: [] };
  pestanas.forEach(p => {
    if (p.filas) tablas[p.definicion.tabla] = p.filas;
  });

  return {
    tablas,
    pestanas: pestanas.map(p => ({
      nombre: p.definicion.nombre,
      ok: !p.error,
      filas: p.filas ? p.filas.length : 0,
      error: p.error || ''
    }))
  };
}
