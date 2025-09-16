// Size of a single grid tile in pixels. This is the base unit used across
// rendering and positioning code. Choosing a constant makes it easy to scale
// the whole board by changing a single value.
export const TILE = 50;

// Padding applied to the whole board from the top-left of the canvas. This
// shifts the grid inward so UI elements can be placed around it without
// overlapping the tiles.
export const PADDING = 16;

/**
 * Convert tile coordinates (tx, ty) -> pixel coordinates (center of tile).
 *
 * Equations:
 *   x = PADDING + tx * TILE + TILE/2
 *   y = PADDING + ty * TILE + TILE/2
 *
 * Why this formula?
 * - tx * TILE converts a grid column index into pixels relative to the
 *   top-left of the grid area.
 * - PADDING shifts the entire grid away from the canvas corner.
 * - TILE/2 moves from the top-left corner of the tile to its center, which is
 *   often the desired anchor point for sprites and tokens.
 *
 * Returning the center coordinates makes it straightforward to place sprites
 * and do tweens between tile centers.
 */
export function tileToPixel(tx: number, ty: number, originX?: number, originY?: number) {
  const ox = originX ?? PADDING;
  const oy = originY ?? PADDING;
  const x = ox + tx * TILE + TILE / 2;
  const y = oy + ty * TILE + TILE / 2;
  return { x, y };
}