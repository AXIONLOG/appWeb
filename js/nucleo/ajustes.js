// Definición de los ajustes del modelo: valores por defecto y cómo se muestran en pantalla.

// Valor "z" que corresponde a cada nivel de servicio (para el stock de seguridad).
export const NIVELES_SERVICIO = { 90: 1.28, 95: 1.645, 97: 1.88, 99: 2.33 };

export const AJUSTES_POR_DEFECTO = {
  meta: 97, // meta contractual del OTIF (%)
  z: 95, // nivel de servicio para el stock de seguridad (%)
  vel: 1.2, // velocidad de desplazamiento (m/s)
  tpl: 15, // tiempo por línea de picking (s)
  frioMax: 12, // límite de exposición al frío (min)
  costoH: 10, // costo hora de operario (S/)
  minMej: 10, // mejora mínima para proponer un traslado (m)
  ciclo: 14, // ciclo de reposición (días de demanda a cubrir)
  ltS: 4, // lead time zona Seco (días)
  ltF: 2, // lead time zona Frío (días)
  ltC: 3, // lead time zona Congelado (días)
  vent: 90, // ventana para calcular la demanda (días)
  cv: 0.3, // variabilidad de la demanda
  eri: 98, // meta de exactitud de inventario (%)
  rUb: 50, // reducción de incidencias por ubicaciones erróneas con el módulo 1 (%)
  rEri: 50, // reducción de diferencias en conteos con el módulo 3 (%)
  rRop: 50 // reducción de falta de productos con el módulo 3 (%)
};

// Grupos que se muestran en la pantalla Ajustes: [título, [[clave, etiqueta, tipo?], ...]]
export const GRUPOS_AJUSTES = [
  [
    'Servicio',
    [
      ['meta', 'Meta contractual OTIF (%)'],
      ['z', 'Nivel de servicio stock de seguridad (%)', 'seleccion']
    ]
  ],
  [
    'Picking',
    [
      ['vel', 'Velocidad de desplazamiento (m/s)'],
      ['tpl', 'Tiempo por línea de picking (s)'],
      ['frioMax', 'Límite de exposición al frío (min)'],
      ['costoH', 'Costo hora de operario (S/)'],
      ['minMej', 'Mejora mínima para proponer un traslado (m)']
    ]
  ],
  [
    'Inventario',
    [
      ['ciclo', 'Ciclo de reposición (días de demanda a cubrir)'],
      ['ltS', 'Lead time zona Seco (días)'],
      ['ltF', 'Lead time zona Frío (días)'],
      ['ltC', 'Lead time zona Congelado (días)'],
      ['vent', 'Ventana para calcular la demanda (días)'],
      ['cv', 'Variabilidad de demanda (CV)'],
      ['eri', 'Meta de exactitud ERI (%)']
    ]
  ],
  [
    'Reducción de incidencias por módulo (supuesto, %)',
    [
      ['rUb', 'Ubicaciones erróneas con el módulo 1'],
      ['rEri', 'Diferencias en conteos con el módulo 3'],
      ['rRop', 'Falta de productos con el módulo 3']
    ]
  ]
];
