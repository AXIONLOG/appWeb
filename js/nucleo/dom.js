// Atajos para buscar elementos y conectar eventos.

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

// Al hacer clic en cada elemento que coincide con el selector, ejecuta la función.
export function alClick(selector, funcion) {
  $$(selector).forEach(elemento => (elemento.onclick = () => funcion(elemento)));
}

// Cuando cambia el valor del elemento, ejecuta la función con el nuevo valor.
export function alCambiar(selector, funcion) {
  const elemento = $(selector);
  if (elemento) elemento.onchange = () => funcion(elemento.value);
}
