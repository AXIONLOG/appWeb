// Inventario y compras: exactitud del inventario (ERI), punto de reorden y stock de seguridad.

import { sum } from '../../nucleo/formato.js';
import { NIVELES_SERVICIO } from '../../nucleo/ajustes.js';

export function calcularInventario(catalogo, ajustes) {
  const { skus } = catalogo;

  // Reposición de cada SKU. Es una función porque el simulador de Escenarios la vuelve a
  // calcular con otra demanda, otro retraso de lead time u otro nivel de servicio.
  const reposicion = (zServicio, variacionDemanda = 0, retrasoLeadTime = 0) =>
    skus.map(s => {
      const demanda = s.demandaDiaria * (1 + variacionDemanda);
      const leadTime = s.leadTime + retrasoLeadTime;
      const stockSeguridad = zServicio * ajustes.cv * demanda * Math.sqrt(leadTime);
      const puntoReorden = demanda * leadTime + stockSeguridad;
      const necesario = Math.max(
        0,
        demanda * (leadTime + ajustes.ciclo) + stockSeguridad - s.stockSistema
      );
      return {
        ...s,
        stockSeguridad,
        puntoReorden,
        cobertura: demanda ? s.stockSistema / demanda : 999, // días de stock
        cantidadPedir: Math.ceil(necesario),
        inversion: Math.ceil(necesario) * s.costo,
        estado:
          s.stockSistema <= puntoReorden
            ? 'PEDIR'
            : s.stockSistema <= puntoReorden * 1.3
              ? 'PRONTO'
              : 'OK'
      };
    });

  const filas = reposicion(NIVELES_SERVICIO[ajustes.z] || 1.645);

  // --- Exactitud del registro de inventario (ERI): SKUs donde el sistema coincide con el conteo físico
  const tieneDiferencia = s => s.stockFisico !== null && s.stockSistema !== s.stockFisico;
  const contados = skus.filter(s => s.stockFisico !== null).length;
  const diferencias = skus.filter(tieneDiferencia);
  const valorDiferencia = s => Math.abs(s.stockSistema - s.stockFisico) * s.costo;
  const valorInventario = sum(skus, s => s.stockSistema * s.costo);
  const faltantes = diferencias.filter(s => s.stockFisico < s.stockSistema).length;

  // Conteo cíclico: primero los SKUs con diferencia y luego los de alta rotación (A) sin diferencia
  const conteoSemanal = [
    ...diferencias.map(s => ({ ...s, motivo: 'Diferencia sistema/físico' })),
    ...skus
      .filter(s => s.abc === 'A' && !tieneDiferencia(s))
      .map(s => ({ ...s, motivo: 'Alta rotación' }))
  ].slice(0, 40);

  return {
    reposicion,
    filas,
    pedir: filas.filter(s => s.estado === 'PEDIR'),
    pronto: filas.filter(s => s.estado === 'PRONTO').length,
    contados,
    diferencias,
    eri: contados ? 1 - diferencias.length / contados : 0,
    eriValorizado: 1 - sum(diferencias, valorDiferencia) / (valorInventario || 1),
    valorDiferenciaAbsoluta: sum(diferencias, valorDiferencia),
    faltantes,
    sobrantes: diferencias.length - faltantes,
    diferenciaNeta: sum(diferencias, s => (s.stockFisico - s.stockSistema) * s.costo),
    valorInventario,
    conteoSemanal
  };
}
