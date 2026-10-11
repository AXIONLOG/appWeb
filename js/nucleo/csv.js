// Lectura de texto CSV (lo que devuelve Google Sheets) y descarga de archivos CSV.

import { normalizar } from './formato.js';

// Convierte texto CSV en una lista de filas (cada fila es una lista de celdas).
// Detecta si el separador es coma o punto y coma, y respeta las comillas.
export function parseCsv(texto) {
  texto = texto.replace(/^﻿/, '');
  const primeraLinea = texto.split('\n')[0];
  const separador =
    (primeraLinea.match(/;/g) || []).length > (primeraLinea.match(/,/g) || []).length ? ';' : ',';

  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else entreComillas = false;
      } else celda += c;
    } else if (c === '"') entreComillas = true;
    else if (c === separador) {
      fila.push(celda);
      celda = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else celda += c;
  }
  if (celda || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter(f => f.some(c => c.trim()));
}

// Convierte texto CSV en { cabecera, filas }.
// Los nombres de columna se normalizan: "Stock_Sistema" → "stocksistema".
export function leerTabla(texto) {
  const filas = parseCsv(texto);
  if (!filas.length) return { cabecera: [], filas: [] };
  const cabecera = filas[0].map(normalizar);
  return {
    cabecera,
    filas: filas
      .slice(1)
      .map(f => Object.fromEntries(cabecera.map((nombre, i) => [nombre, (f[i] || '').trim()])))
  };
}

// Descarga una tabla (lista de filas) como archivo CSV.
export function descargarCsv(nombre, filas) {
  const texto =
    '﻿' +
    filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([texto], { type: 'text/csv' }));
  enlace.download = nombre + '.csv';
  enlace.click();
}
