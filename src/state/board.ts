import type { Board, Tile } from './types';

// Board width/height in tiles. Using constants makes it easy to adjust board
// size and keeps "magic numbers" centralized.
export const BOARD_W = 12;
export const BOARD_H = 12;

/**
 * Create a BOARD_W x BOARD_H board with a special 'nexus' tile at (4,4).
 * Note: the comment in the old code said 9x9 but constants set 12x12; the
 * constants control the actual size. Each tile carries properties used by
 * the game rules (occupiedBy, hazard, blocking flags).
 */
export function makeBoard(): Board {
  const tiles: Tile[][] = [];
  for (let y = 0; y < BOARD_H; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < BOARD_W; x++) {
      row.push({
        x, y,
        // Place the nexus at fixed coords (4,4). We use a ternary to set the
        // tile type: if x===4 && y===4 then 'nexus' else 'floor'. This is a
        // compact way to make a single special tile while filling the grid.
        type: (x === 4 && y === 4) ? 'nexus' : 'floor',
        occupiedBy: null,
        hazard: null,
        blocksLOS: false,
        blocksMovement: false,
      });
    }
    tiles.push(row);
  }
  return { w: BOARD_W, h: BOARD_H, tiles };
}

// ---- Tile helpers ----
/**
 * Return true when (x,y) lies inside the board rectangle [0..w-1]x[0..h-1].
 * The equation `x >= 0 && y >= 0 && x < b.w && y < b.h` checks both lower
 * and upper bounds and is the standard inclusive lower / exclusive upper
 * bound check for array indexing.
 */
export function inBounds(b: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < b.w && y < b.h;
}

/**
 * Safely fetch a tile; returns undefined if out-of-bounds so callers don't
 * need to check indices themselves.
 */
export function getTile(b: Board, x: number, y: number): Tile | undefined {
  if (!inBounds(b, x, y)) return undefined;
  return b.tiles[y][x];
}

/**
 * True if a tile is occupied by any actor. `!!t?.occupiedBy` coerces the
 * possibly-undefined tile into a boolean: if `t` is undefined the result is
 * false; otherwise it becomes true when occupiedBy is non-null.
 */
export function isOccupied(b: Board, x: number, y: number): boolean {
  const t = getTile(b, x, y);
  return !!t?.occupiedBy;
}

/**
 * Walkability checks ensure a tile exists, doesn't block movement and isn't
 * currently occupied. The guard `if (!t) return false` handles out-of-bounds
 * gracefully.
 */
export function isWalkable(b: Board, x: number, y: number): boolean {
  const t = getTile(b, x, y);
  if (!t) return false;
  if (t.blocksMovement) return false;
  if (t.occupiedBy) return false;
  return true;
}

/**
 * Return the four orthogonal neighbor coordinates and the delta from the
 * source. We include both the absolute x/y and the dx/dy because callers
 * sometimes need the step vector for movement or facing.
 */
export function neighbors4(x: number, y: number) {
  return [
    { x, y: y - 1, dx: 0, dy: -1 },
    { x: x + 1, y, dx: 1, dy: 0 },
    { x, y: y + 1, dx: 0, dy: 1 },
    { x: x - 1, y, dx: -1, dy: 0 },
  ];
}

/**
 * Manhattan distance between two cells: |dx| + |dy|. This measures the number
 * of orthogonal steps required to move between the cells (no diagonals).
 */
export function manhattan(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Orthogonal line-of-sight. Only returns true for cells that are exactly in
 * the same row or column (no diagonal lines). The algorithm steps from the
 * `from` cell toward `to` one tile at a time and returns false if any
 * intermediate tile blocks LOS. The use of Math.sign produces a stepping
 * delta of -1, 0, or 1 for each axis.
 */
export function losOrthogonal(b: Board, from: { x: number; y: number }, to: { x: number; y: number }) {
  // If both x and y differ, the target is diagonal — not orthogonal LOS.
  if (from.x !== to.x && from.y !== to.y) return false;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  // start stepping one tile away from the source
  let x = from.x + dx, y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    const t = getTile(b, x, y);
    // If we hit the edge (no tile) or a tile that blocks LOS, there's no LOS.
    if (!t || t.blocksLOS) return false;
    x += dx; y += dy;
  }
  return true;
}

/**
 * Returns an array of cells (not including the start) along `dir` up to
 * `maxSteps`, stopping early if we go out of bounds. This is useful for
 * generating movement lines or attack rays.
 */
export function lineFromDir(b: Board, start: { x: number; y: number }, dir: { dx: -1 | 0 | 1; dy: -1 | 0 | 1 }, maxSteps: number) {
  const out: { x: number; y: number }[] = [];
  let x = start.x, y = start.y;
  for (let i = 0; i < maxSteps; i++) {
    x += dir.dx; y += dir.dy;
    if (!inBounds(b, x, y)) break;
    out.push({ x, y });
  }
  return out;
}

/**
 * Convenience: coordinate of the nexus in the default layout.
 */
export function centerNexus() { return { x: 4, y: 4 }; }
