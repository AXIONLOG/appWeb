// Descarga del Diagnóstico OTIF en PDF.
// Se arma la pantalla completa en un área oculta y se abre el cuadro de impresión del navegador:
// ahí se elige «Guardar como PDF». No necesita librerías externas.

import { modelo, ajustes } from '../../nucleo/estado.js';
import diagnostico from './vista.js';

export function descargarDiagnosticoPdf() {
  if (!modelo.hay.otif) return;

  const area = document.getElementById('area-impresion');
  const hoy = new Date();
  area.innerHTML =
    diagnostico.render() +
    `<p class="mu pie-pdf">Copia generada el ${hoy.toLocaleDateString('es-PE')} · AXIONLOG · Meta OTIF ${ajustes.meta} %</p>`;

  // El nombre sugerido del PDF sale del título de la página
  const tituloOriginal = document.title;
  document.title = 'Diagnostico_OTIF_' + hoy.toISOString().slice(0, 10);
  document.body.classList.add('imprimiendo');

  const terminar = () => {
    document.body.classList.remove('imprimiendo');
    area.innerHTML = '';
    document.title = tituloOriginal;
    window.removeEventListener('afterprint', terminar);
  };
  window.addEventListener('afterprint', terminar);
  window.print();
}
