// Formatos y conversiones de números, fechas y texto usados en toda la app.

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// 1234.5 → "1,234.5"
export const fmt = (numero, decimales = 0) =>
  Number(numero).toLocaleString('es-PE', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: decimales
  });

// 0.923 → "92.3 %"
export const pc = (fraccion, decimales = 1) => fmt(fraccion * 100, decimales) + ' %';

export const sol = numero => 'S/ ' + fmt(numero);

export const sum = (lista, valor = x => x) => lista.reduce((total, x) => total + valor(x), 0);

// 305 segundos → "5 min 05 s"
export const mmss = segundos =>
  Math.floor(segundos / 60) + ' min ' + String(Math.round(segundos % 60)).padStart(2, '0') + ' s';

// "Stock_Sistema" → "stocksistema" (para reconocer columnas sin importar tildes ni símbolos)
export const normalizar = texto =>
  String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Evita que el texto de una celda se interprete como HTML.
export const esc = texto =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Convierte lo que viene de una celda en número. Acepta lo que muestra Google Sheets:
//   "148.50", "148,50", "1,254", "1.254,50", "S/ 1,254.50"
export function num(valor) {
  let texto = String(valor ?? '').replace(/[^\d.,-]/g, '');
  if (!texto) return 0;
  const coma = texto.lastIndexOf(',');
  const punto = texto.lastIndexOf('.');
  if (coma >= 0 && punto >= 0) {
    // Cuando hay ambos, el que aparece último es el decimal.
    texto =
      coma > punto ? texto.replace(/\./g, '').replace(',', '.') : texto.replace(/,/g, '');
  } else if (coma >= 0) {
    // "1,254" o "12,345,678" son miles; "148,50" o "0,125" son decimales.
    texto = /^-?[1-9]\d{0,2}(,\d{3})+$/.test(texto)
      ? texto.replace(/,/g, '')
      : texto.replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(texto)) {
    // "1.254.321" son miles con punto.
    texto = texto.replace(/\./g, '');
  }
  const resultado = parseFloat(texto);
  return isNaN(resultado) ? 0 : resultado;
}

// "2026-09-28" o "28/09/2026" (día primero) → milisegundos. NaN si no se entiende.
export function aMarcaDeTiempo(texto) {
  const t = String(texto ?? '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(t);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  return NaN;
}

// "2025-01", "01/2025" o "01/01/2025" → "Ene-25". Si no se entiende, devuelve el texto tal cual.
export function etiquetaMes(texto) {
  const t = String(texto ?? '').trim();
  let mes, anio;
  let m = /^(\d{4})-(\d{1,2})/.exec(t);
  if (m) {
    anio = m[1];
    mes = +m[2];
  } else if ((m = /^(\d{1,2})[/.-](\d{4})$/.exec(t))) {
    mes = +m[1];
    anio = m[2];
  } else if ((m = /^\d{1,2}[/.-](\d{1,2})[/.-](\d{4})/.exec(t))) {
    mes = +m[1];
    anio = m[2];
  }
  return mes >= 1 && mes <= 12 ? MESES[mes - 1] + '-' + String(anio).slice(2) : t;
}
