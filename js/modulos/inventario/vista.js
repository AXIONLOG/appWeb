// Inventario y compras: plan de compras, diferencias de inventario y conteo cíclico semanal.

import { modelo, ajustes, ui } from '../../nucleo/estado.js';
import { fmt, pc, sol, esc } from '../../nucleo/formato.js';
import { kpi, tabla, encabezado, etiqueta, etiquetaZona } from '../../nucleo/html.js';
import { descargarCsv } from '../../nucleo/csv.js';
import { alClick } from '../../nucleo/dom.js';
import { pantallaVacia } from '../../nucleo/requisitos.js';

const TITULO = 'Inventario y compras';
const SUBTITULO = 'Qué reponer, cuánto pedir y qué contar esta semana.';

function planDeCompras(inventario) {
  const filas = inventario.filas
    .filter(s => s.estado != 'OK')
    .sort(
      (a, b) =>
        (a.estado == 'PEDIR' ? 0 : 1) - (b.estado == 'PEDIR' ? 0 : 1) || a.cobertura - b.cobertura
    );
  return tabla(
    ['Decisión', 'Cuándo pedir', 'SKU', 'Producto', 'Zona', 'Un.', 'Stock', 'Cobertura (días)', 'Stock seguridad', 'Punto reorden', 'Cantidad a pedir', 'Inversión'],
    filas.map(s => [
      etiqueta(s.estado == 'PEDIR' ? 't-r' : 't-a', s.estado == 'PEDIR' ? 'PEDIR HOY' : 'PRONTO'),
      s.estado == 'PEDIR' ? 'Hoy' : 'Esta semana',
      esc(s.sku),
      esc(s.descripcion),
      etiquetaZona(s.zona),
      esc(s.um),
      fmt(s.stockSistema),
      fmt(s.cobertura, 1),
      fmt(s.stockSeguridad),
      fmt(s.puntoReorden),
      fmt(s.cantidadPedir),
      sol(s.inversion)
    ])
  );
}

function diferenciasDeInventario(inventario) {
  const mayorValorPrimero = [...inventario.diferencias].sort(
    (a, b) =>
      Math.abs(b.stockFisico - b.stockSistema) * b.costo -
      Math.abs(a.stockFisico - a.stockSistema) * a.costo
  );
  return tabla(
    ['SKU', 'Producto', 'Zona', 'Sistema', 'Físico', 'Diferencia', 'Valor dif.', 'Rack'],
    mayorValorPrimero.map(s => {
      const diferencia = s.stockFisico - s.stockSistema;
      return [
        esc(s.sku),
        esc(s.descripcion),
        etiquetaZona(s.zona),
        fmt(s.stockSistema),
        fmt(s.stockFisico),
        `<b class="${s.stockFisico < s.stockSistema ? 'wn' : 'ok2'}">${diferencia > 0 ? '+' : ''}${diferencia}</b>`,
        sol(diferencia * s.costo),
        esc(s.rack)
      ];
    })
  );
}

function conteoCiclico(inventario) {
  return (
    `<p class="mu">Se cuentan primero los SKUs con diferencia y mayor valor, luego los de alta rotación (clase A).</p>` +
    tabla(
      ['Orden', 'SKU', 'Producto', 'Rack', 'Motivo', 'ABC'],
      inventario.conteoSemanal.map((s, i) => [i + 1, esc(s.sku), esc(s.descripcion), esc(s.rack), s.motivo, s.abc])
    )
  );
}

function render() {
  const vacio = pantallaVacia(TITULO, SUBTITULO, ['inventario']);
  if (vacio) return vacio;

  const { inventario, catalogo } = modelo;
  const pestana = ui.inventario.pestana;
  const contenido = [planDeCompras, diferenciasDeInventario, conteoCiclico][pestana - 1](inventario);

  return (
    encabezado(TITULO, SUBTITULO, `<button class="btn p" id="exportar">⬇ Exportar pestaña actual</button>`) +
    `<div class="grid">${kpi('ERI por SKU', pc(inventario.eri), `Meta ${ajustes.eri} % · ${inventario.contados - inventario.diferencias.length} de ${inventario.contados} sin diferencia`, inventario.eri * 100 < ajustes.eri ? 'er' : 'ok')}${kpi('ERI valorizado', pc(inventario.eriValorizado), 'Diferencia absoluta ' + sol(inventario.valorDiferenciaAbsoluta))}${kpi('Faltantes / sobrantes', inventario.faltantes + ' / ' + inventario.sobrantes, 'Neto ' + sol(inventario.diferenciaNeta), 'wa')}${kpi('SKUs a reponer hoy', inventario.pedir.length, inventario.pronto + ' más pronto', 'er')}${kpi('Inversión inmediata', sol(inventario.pedir.reduce((t, s) => t + s.inversion, 0)), 'para cubrir lo urgente')}</div><div class="tabs"><button class="${pestana == 1 ? 'on' : ''}" data-pestana="1">Plan de compras</button><button class="${pestana == 2 ? 'on' : ''}" data-pestana="2">Diferencias de inventario (${inventario.diferencias.length})</button><button class="${pestana == 3 ? 'on' : ''}" data-pestana="3">Conteo cíclico semanal</button></div><div class="card">${contenido}</div>`
  );
}

function enlazar({ refrescar }) {
  alClick('[data-pestana]', boton => {
    ui.inventario.pestana = +boton.dataset.pestana;
    refrescar();
  });
  alClick('#exportar', () =>
    descargarCsv('inventario_compras', [
      ['SKU', 'Producto', 'Decisión', 'Stock', 'Punto reorden', 'Cantidad a pedir', 'Inversión'],
      ...modelo.inventario.filas
        .filter(s => s.estado != 'OK')
        .map(s => [
          s.sku,
          s.descripcion,
          s.estado,
          s.stockSistema,
          Math.round(s.puntoReorden),
          s.cantidadPedir,
          Math.round(s.inversion)
        ])
    ])
  );
}

// Permite que otras pantallas (el Panel) abran una pestaña concreta: data-pestana="2"
function alEntrar({ pestana }) {
  if (pestana) ui.inventario.pestana = +pestana;
}

export default {
  id: 'inv',
  titulo: 'Inventario y compras',
  icono: '▣',
  color: '#22c55e',
  seccion: 'MÓDULOS',
  render,
  enlazar,
  alEntrar
};
