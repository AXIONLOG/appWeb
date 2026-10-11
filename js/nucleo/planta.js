// Plano de la planta como un grafo: racks, cruces y el muelle unidos por pasillos.
// De aquí salen las distancias que usan Ubicaciones, Picking y Escenarios.

export const ZONAS = ['SECO', 'FRIO', 'CONGELADO'];

// Plano referencial: 3 cámaras (seco, frío, congelado) y 14 racks.
// Cómo se ingresará el plano real todavía está por definir.
export function plantaReferencial() {
  const nodos = [
    { id: 'DOCK', x: 5, y: 30, tipo: 'muelle', zona: 'DOCK' },
    { id: 'W-SUR', x: 5, y: 7, tipo: 'cruce', zona: 'SECO' }
  ];
  const aristas = [['DOCK', 'W-SUR']];
  const pasillosPorZona = { SECO: [12, 20], FRIO: [37, 45], CONGELADO: [59, 65, 71] };

  let cruceNorteAnterior = 'DOCK';
  let cruceSurAnterior = 'W-SUR';
  for (const zona in pasillosPorZona) {
    pasillosPorZona[zona].forEach((x, i) => {
      const pasillo = zona[0] + '-P' + (i + 1);
      const norte = 'X-' + pasillo + '-N';
      const sur = 'X-' + pasillo + '-S';
      const rackNorte = pasillo + '-M01';
      const rackSur = pasillo + '-M02';
      nodos.push(
        { id: norte, x, y: 27, tipo: 'cruce', zona },
        { id: rackNorte, x, y: 22, tipo: 'rack', zona, pasillo: i + 1 },
        { id: sur, x, y: 7, tipo: 'cruce', zona },
        { id: rackSur, x, y: 12, tipo: 'rack', zona, pasillo: i + 1 }
      );
      aristas.push(
        [rackNorte, norte],
        [rackSur, sur],
        [rackNorte, rackSur],
        [cruceNorteAnterior, norte],
        [cruceSurAnterior, sur]
      );
      cruceNorteAnterior = norte;
      cruceSurAnterior = sur;
    });
  }

  return {
    nombre: 'Planta 0801 (referencial)',
    zonas: {
      SECO: { x0: 2, y0: 3, x1: 28, y1: 35, temp: '15–25 °C' },
      FRIO: { x0: 30, y0: 3, x1: 52, y1: 35, temp: '0–4 °C' },
      CONGELADO: { x0: 54, y0: 3, x1: 78, y1: 35, temp: '−18 °C' }
    },
    nodos,
    aristas
  };
}

// Calcula, a partir de un plano, la distancia más corta entre cualquier par de nodos (Dijkstra).
export function construirPlanta(layout) {
  const nodos = Object.fromEntries(layout.nodos.map(n => [n.id, n]));

  const vecinos = {};
  layout.nodos.forEach(n => (vecinos[n.id] = []));
  layout.aristas.forEach(([a, b]) => {
    if (!nodos[a] || !nodos[b]) return;
    const largo = Math.hypot(nodos[a].x - nodos[b].x, nodos[a].y - nodos[b].y);
    vecinos[a].push([b, largo]);
    vecinos[b].push([a, largo]);
  });

  const distancias = {}; // distancias[origen][destino] = metros
  const previos = {}; // previos[origen][destino] = nodo anterior en el camino más corto
  layout.nodos.forEach(origen => {
    const d = { [origen.id]: 0 };
    const p = {};
    const visitados = new Set();
    for (;;) {
      let u = null;
      for (const k in d) if (!visitados.has(k) && (u === null || d[k] < d[u])) u = k;
      if (u === null) break;
      visitados.add(u);
      vecinos[u].forEach(([x, largo]) => {
        if (d[u] + largo < (d[x] ?? 1e9)) {
          d[x] = d[u] + largo;
          p[x] = u;
        }
      });
    }
    distancias[origen.id] = d;
    previos[origen.id] = p;
  });

  return {
    layout,
    nodos,
    racks: layout.nodos.filter(n => n.tipo === 'rack'),
    // Metros entre dos nodos (0 si no hay camino).
    distancia: (a, b) => distancias[a]?.[b] ?? 0,
    // Lista de nodos que se recorren para ir de a hasta b.
    camino(a, b) {
      const ruta = [b];
      while (ruta[0] !== a && previos[a][ruta[0]]) ruta.unshift(previos[a][ruta[0]]);
      return ruta;
    }
  };
}

// Plano en uso. Es un único objeto compartido: cargarPlanta lo reemplaza por dentro.
export const planta = construirPlanta(plantaReferencial());

export function cargarPlanta(layout) {
  Object.assign(planta, construirPlanta(layout));
}
