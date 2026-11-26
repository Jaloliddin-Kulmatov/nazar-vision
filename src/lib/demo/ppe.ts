export type Box = { x: number; y: number; w: number; h: number };

/** Where on a person an item is worn, as a vertical slice of the person's box (0 = top, 1 = feet). */
const REGIONS = { head: [-0.15, 0.3], torso: [0.15, 0.7] } as const;
export type BodyRegion = keyof typeof REGIONS;

/**
 * For each person, is there an item (helmet, vest…) whose centre sits in the right part of their box?
 * Each item is matched to at most one person.
 */
export function matchPpe(persons: Box[], items: Box[], region: BodyRegion): boolean[] {
  const [top, bottom] = REGIONS[region];
  const used = new Set<number>();
  return persons.map((p) => {
    let best = -1;
    let bestDist = Infinity;
    items.forEach((it, i) => {
      if (used.has(i)) return;
      const cx = it.x + it.w / 2;
      const cy = it.y + it.h / 2;
      const inX = cx >= p.x && cx <= p.x + p.w;
      const inY = cy >= p.y + top * p.h && cy <= p.y + bottom * p.h;
      if (!inX || !inY) return;
      const d = Math.abs(cx - (p.x + p.w / 2));
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (best >= 0) used.add(best);
    return best >= 0;
  });
}
