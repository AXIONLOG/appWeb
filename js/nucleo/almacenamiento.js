// Lo único que la app guarda en el navegador: el enlace del Sheet y los ajustes.
// Los datos NO se guardan: se vuelven a leer del Sheet cada vez que se abre la app.

const CLAVE = 'axionlog';
const CLAVE_VERSION_ANTERIOR = 'axl'; // la versión anterior guardaba aquí los datos de ejemplo

export function leerPreferencias() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || {};
  } catch (e) {
    return {};
  }
}

export function guardarPreferencias({ enlace, ajustes }) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ enlace, ajustes }));
  } catch (e) {
    // Sin almacenamiento (modo privado, por ejemplo): la app sigue funcionando sin recordar.
  }
}

export function limpiarVersionAnterior() {
  try {
    localStorage.removeItem(CLAVE_VERSION_ANTERIOR);
  } catch (e) {
    // nada que limpiar
  }
}
