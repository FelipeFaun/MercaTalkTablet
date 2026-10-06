// Navegación dentro de la tienda: grafo de pasillos de circulación, ruta más
// corta entre dos puntos, orden de visita de varias paradas e indicaciones
// paso a paso. Sin dependencias de Three.js ni de Angular: coordenadas del
// plano (x, z) en las mismas unidades que el modelo 3D.

export interface NavPoint {
  x: number;
  z: number;
}

/** Escala del modelo: 1 unidad del plano ≈ 0,5 m de tienda real. */
export const METERS_PER_UNIT = 0.5;
/** Paso tranquilo con carro, en m/s. */
const WALK_SPEED_MPS = 0.9;
/** Tiempo para buscar y tomar los productos en cada parada. */
const SECONDS_PER_STOP = 40;

/** Kiosco "Tú estás aquí" y frente de la línea de cajas. */
export const KIOSK_POINT: NavPoint = { x: -32, z: 36 };
export const CHECKOUT_POINT: NavPoint = { x: 10, z: 24 };

/**
 * Dónde se detiene la persona para tomar productos de cada pasillo: un punto
 * en el pasillo de circulación junto a la góndola (nunca dentro de ella).
 */
export const AISLE_ACCESS: Record<number, NavPoint> = {
  1: { x: 22, z: -29 },
  2: { x: -22, z: -2 },
  3: { x: -5, z: -2 },
  4: { x: 11, z: -2 },
  5: { x: -29, z: 2 },
  6: { x: -16, z: -29 },
  7: { x: 29, z: -3 },
  8: { x: 29, z: 18 },
  9: { x: 29, z: -24 },
};

// Pasillos de circulación libres de góndolas (ver modelo 3D)
const H_CORRIDORS = [
  { z: 24, x0: -32, x1: 26 },   // frente, paralelo a las cajas
  { z: -26, x0: -26, x1: 26 },  // fondo, frente a refrigerados
];
const V_CORRIDORS = [
  { x: -26, z0: -26, z1: 24 },
  { x: -8, z0: -26, z1: 24 },
  { x: 8, z0: -26, z1: 24 },
  { x: 26, z0: -26, z1: 24 },
];

type NodeKey = string;
const keyOf = (p: NavPoint): NodeKey => `${p.x},${p.z}`;

interface Graph {
  nodes: Map<NodeKey, NavPoint>;
  edges: Map<NodeKey, { to: NodeKey; w: number }[]>;
  /** Punto de interés → nodo del grafo donde se engancha. */
  attach: Map<NodeKey, NavPoint>;
}

let graphCache: Graph | null = null;

function pointsOfInterest(): NavPoint[] {
  return [KIOSK_POINT, CHECKOUT_POINT, ...Object.values(AISLE_ACCESS)];
}

function nearestCorridorPoint(p: NavPoint): NavPoint {
  let best: NavPoint = p;
  let bestD = Infinity;
  for (const c of H_CORRIDORS) {
    const q = { x: clamp(p.x, c.x0, c.x1), z: c.z };
    const d = dist(p, q);
    if (d < bestD) { bestD = d; best = q; }
  }
  for (const c of V_CORRIDORS) {
    const q = { x: c.x, z: clamp(p.z, c.z0, c.z1) };
    const d = dist(p, q);
    if (d < bestD) { bestD = d; best = q; }
  }
  return best;
}

function buildGraph(): Graph {
  const nodes = new Map<NodeKey, NavPoint>();
  const edges = new Map<NodeKey, { to: NodeKey; w: number }[]>();
  const attach = new Map<NodeKey, NavPoint>();

  const addNode = (p: NavPoint) => {
    const k = keyOf(p);
    if (!nodes.has(k)) {
      nodes.set(k, p);
      edges.set(k, []);
    }
    return k;
  };
  const link = (a: NavPoint, b: NavPoint) => {
    const ka = addNode(a);
    const kb = addNode(b);
    if (ka === kb) return;
    const w = dist(a, b);
    edges.get(ka)!.push({ to: kb, w });
    edges.get(kb)!.push({ to: ka, w });
  };

  // Puntos sobre cada corredor: extremos, cruces y enganches
  const onH = H_CORRIDORS.map(() => [] as NavPoint[]);
  const onV = V_CORRIDORS.map(() => [] as NavPoint[]);

  H_CORRIDORS.forEach((h, i) => {
    onH[i].push({ x: h.x0, z: h.z }, { x: h.x1, z: h.z });
    V_CORRIDORS.forEach((v, j) => {
      if (v.x >= h.x0 && v.x <= h.x1 && h.z >= v.z0 && h.z <= v.z1) {
        const cross = { x: v.x, z: h.z };
        onH[i].push(cross);
        onV[j].push(cross);
      }
    });
  });
  V_CORRIDORS.forEach((v, j) => onV[j].push({ x: v.x, z: v.z0 }, { x: v.x, z: v.z1 }));

  for (const poi of pointsOfInterest()) {
    const a = nearestCorridorPoint(poi);
    attach.set(keyOf(poi), a);
    H_CORRIDORS.forEach((h, i) => { if (a.z === h.z && a.x >= h.x0 && a.x <= h.x1) onH[i].push(a); });
    V_CORRIDORS.forEach((v, j) => { if (a.x === v.x && a.z >= v.z0 && a.z <= v.z1) onV[j].push(a); });
    link(poi, a);
  }

  const chain = (pts: NavPoint[], axis: 'x' | 'z') => {
    const sorted = uniquePoints(pts).sort((p, q) => p[axis] - q[axis]);
    for (let i = 1; i < sorted.length; i++) link(sorted[i - 1], sorted[i]);
  };
  onH.forEach(pts => chain(pts, 'x'));
  onV.forEach(pts => chain(pts, 'z'));

  return { nodes, edges, attach };
}

function graph(): Graph {
  return graphCache ??= buildGraph();
}

/** Camino más corto (Dijkstra) entre dos puntos de interés, como polilínea. */
export function shortestPath(from: NavPoint, to: NavPoint): NavPoint[] {
  const g = graph();
  const start = keyOf(from);
  const goal = keyOf(to);
  if (!g.nodes.has(start) || !g.nodes.has(goal)) return [from, to];

  const distTo = new Map<NodeKey, number>([[start, 0]]);
  const prev = new Map<NodeKey, NodeKey>();
  const open = new Set<NodeKey>([start]);

  while (open.size > 0) {
    let current: NodeKey | null = null;
    let best = Infinity;
    for (const k of open) {
      const d = distTo.get(k) ?? Infinity;
      if (d < best) { best = d; current = k; }
    }
    if (current === null || current === goal) break;
    open.delete(current);
    for (const { to: next, w } of g.edges.get(current) ?? []) {
      const alt = best + w;
      if (alt < (distTo.get(next) ?? Infinity)) {
        distTo.set(next, alt);
        prev.set(next, current);
        open.add(next);
      }
    }
  }

  const path: NavPoint[] = [];
  let k: NodeKey | undefined = goal;
  while (k) {
    path.unshift(g.nodes.get(k)!);
    k = k === start ? undefined : prev.get(k);
  }
  return simplify(path);
}

export function pathLength(path: NavPoint[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += dist(path[i - 1], path[i]);
  return total;
}

/**
 * Orden de visita más corto: sale del kiosco, pasa por todos los pasillos y
 * termina en cajas. Programación dinámica (Held-Karp): con 9 pasillos como
 * máximo son 512 subconjuntos y el resultado es el óptimo exacto.
 */
export function orderStops(aisleIds: number[]): number[] {
  const ids = [...new Set(aisleIds)].filter(id => AISLE_ACCESS[id]);
  const n = ids.length;
  if (n <= 1) return ids;

  const pts = ids.map(id => AISLE_ACCESS[id]);
  const legLen = (a: NavPoint, b: NavPoint) => pathLength(shortestPath(a, b));
  const fromKiosk = pts.map(p => legLen(KIOSK_POINT, p));
  const toCheckout = pts.map(p => legLen(p, CHECKOUT_POINT));
  const between = pts.map(a => pts.map(b => legLen(a, b)));

  // cost[mask][j]: recorrido mínimo que visita `mask` y termina en j
  const full = 1 << n;
  const cost = Array.from({ length: full }, () => new Array<number>(n).fill(Infinity));
  const parent = Array.from({ length: full }, () => new Array<number>(n).fill(-1));
  for (let j = 0; j < n; j++) cost[1 << j][j] = fromKiosk[j];

  for (let mask = 1; mask < full; mask++) {
    for (let j = 0; j < n; j++) {
      const c = cost[mask][j];
      if (!(mask & (1 << j)) || c === Infinity) continue;
      for (let k = 0; k < n; k++) {
        if (mask & (1 << k)) continue;
        const next = mask | (1 << k);
        const alt = c + between[j][k];
        if (alt < cost[next][k]) {
          cost[next][k] = alt;
          parent[next][k] = j;
        }
      }
    }
  }

  let last = 0;
  let best = Infinity;
  for (let j = 0; j < n; j++) {
    const total = cost[full - 1][j] + toCheckout[j];
    if (total < best) { best = total; last = j; }
  }

  const order: number[] = [];
  let mask = full - 1;
  while (last !== -1) {
    order.unshift(ids[last]);
    const prev = parent[mask][last];
    mask &= ~(1 << last);
    last = prev;
  }
  return order;
}

// ---------------------------------------------------------------------------
// Indicaciones paso a paso
// ---------------------------------------------------------------------------

export type StepKind = 'start' | 'left' | 'right' | 'arrive' | 'checkout';

export interface NavStep {
  kind: StepKind;
  text: string;
  meters: number;
  /** Dónde ocurre la indicación (para enfocar la cámara). */
  point: NavPoint;
  /** Parada a la que pertenece (null = tramo final a cajas). */
  aisleId: number | null;
}

export interface NavLeg {
  aisleId: number | null;
  path: NavPoint[];
}

/** Tramos menores a esto (≈1,5 m) son el último paso hacia la góndola: no se narran como giro. */
const STUB_UNITS = 4;

/**
 * Convierte los tramos de una ruta en instrucciones. `aisleCenter` y
 * `aisleTitle` vienen de la página para nombrar el destino de cada tramo.
 */
export function buildSteps(
  legs: NavLeg[],
  aisleCenter: (id: number) => NavPoint,
  aisleTitle: (id: number) => string
): NavStep[] {
  const steps: NavStep[] = [];

  legs.forEach((legData, legIndex) => {
    const pts = legData.path;
    if (pts.length < 2) return;

    // Segmentos con dirección; el último tramo corto se trata como llegada
    const segs: { a: NavPoint; b: NavPoint; len: number }[] = [];
    for (let i = 1; i < pts.length; i++) {
      segs.push({ a: pts[i - 1], b: pts[i], len: dist(pts[i - 1], pts[i]) });
    }
    while (segs.length > 1 && segs[segs.length - 1].len < STUB_UNITS) segs.pop();
    while (segs.length > 1 && segs[0].len < STUB_UNITS) segs.shift();

    const origin = legIndex === 0
      ? 'Desde el kiosco'
      : legs[legIndex - 1].aisleId !== null
        ? `Desde ${aisleTitle(legs[legIndex - 1].aisleId!)}`
        : 'Desde aquí';

    segs.forEach((seg, i) => {
      const m = toMeters(seg.len);
      if (i === 0) {
        steps.push({
          kind: 'start',
          text: `${origin}, avanza ${m} m`,
          meters: m,
          point: seg.a,
          aisleId: legData.aisleId,
        });
        return;
      }
      const side = turnSide(segs[i - 1], seg);
      steps.push({
        kind: side,
        text: `Gira a la ${side === 'left' ? 'izquierda' : 'derecha'} y avanza ${m} m`,
        meters: m,
        point: seg.a,
        aisleId: legData.aisleId,
      });
    });

    const lastSeg = segs[segs.length - 1];
    if (legData.aisleId === null) {
      steps.push({
        kind: 'checkout',
        text: 'Llegas a la línea de cajas',
        meters: 0,
        point: lastSeg.b,
        aisleId: null,
      });
    } else {
      const center = aisleCenter(legData.aisleId);
      const side = sideOf(lastSeg, center);
      steps.push({
        kind: 'arrive',
        text: `Llegas a ${aisleTitle(legData.aisleId)}, a tu ${side === 'left' ? 'izquierda' : 'derecha'}`,
        meters: 0,
        point: pts[pts.length - 1],
        aisleId: legData.aisleId,
      });
    }
  });

  return steps;
}

/** Distancia y tiempo estimado a pie para una ruta. */
export function estimateTrip(totalUnits: number, stops: number): { meters: number; minutes: number } {
  const meters = toMeters(totalUnits);
  const seconds = meters / WALK_SPEED_MPS + stops * SECONDS_PER_STOP;
  return { meters, minutes: Math.max(1, Math.round(seconds / 60)) };
}

// ---------------------------------------------------------------------------
// Utilidades geométricas
// ---------------------------------------------------------------------------

function toMeters(units: number): number {
  return Math.max(1, Math.round(units * METERS_PER_UNIT));
}

function dist(a: NavPoint, b: NavPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function uniquePoints(pts: NavPoint[]): NavPoint[] {
  const seen = new Map<NodeKey, NavPoint>();
  pts.forEach(p => seen.set(keyOf(p), p));
  return [...seen.values()];
}

/** Quita puntos repetidos y puntos intermedios en línea recta. */
export function simplify(path: NavPoint[]): NavPoint[] {
  const out: NavPoint[] = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.z === p.z) continue;
    out.push(p);
  }
  for (let i = out.length - 2; i > 0; i--) {
    const a = out[i - 1], b = out[i], c = out[i + 1];
    const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) out.splice(i, 1);
  }
  return out;
}

// Vista cenital con x a la derecha y z hacia el frente de la tienda: un
// producto cruz positivo es un giro a la derecha.
function cross2(ax: number, az: number, bx: number, bz: number): number {
  return ax * bz - az * bx;
}

function turnSide(prev: { a: NavPoint; b: NavPoint }, next: { a: NavPoint; b: NavPoint }): 'left' | 'right' {
  const c = cross2(prev.b.x - prev.a.x, prev.b.z - prev.a.z, next.b.x - next.a.x, next.b.z - next.a.z);
  return c > 0 ? 'right' : 'left';
}

function sideOf(seg: { a: NavPoint; b: NavPoint }, target: NavPoint): 'left' | 'right' {
  const c = cross2(seg.b.x - seg.a.x, seg.b.z - seg.a.z, target.x - seg.b.x, target.z - seg.b.z);
  return c > 0 ? 'right' : 'left';
}
